import {
	Box3,
	CoordinateSystem,
	BufferAttribute,
	BufferGeometry,
	Camera,
	Color,
	ColorManagement,
	DataTexture,
	FloatType,
	Frustum,
	FrustumArray,
	Intersection,
	Material,
	Matrix4,
	Mesh,
	Object3D,
	Raycaster,
	RedIntegerFormat,
	RGBAFormat,
	Scene,
	Sphere,
	UnsignedIntType,
	Vector3,
	WebGLRenderer,
	InterleavedBufferAttribute
} from "three";
import { WebGPURenderer } from "three/webgpu";
import {
	box3ToArray,
	BVH,
	BVHNode,
	HybridBuilder,
	onFrustumIntersectionCallback,
	onIntersectionCallback,
	onIntersectionRayCallback,
	vec3ToArray,
	WebGLCoordinateSystem,
	WebGPUCoordinateSystem
} from 'bvh.js';
import {assert} from "../lib/asserts.ts";
import {isNumber} from "../lib/checks.ts";

interface BatchedMeshGeometryRange {
	vertexStart: number;
	vertexCount: number;
	reservedVertexCount: number;
	indexStart: number;
	indexCount: number;
	reservedIndexCount: number;
	start: number;
	count: number;
	boundingBox: Box3 | null;
	boundingSphere: Sphere | null;
	active: boolean;
}

function ascIdSort(a: number, b: number)
{
	return a - b;
}
/** @internal */
export function sortOpaque(a: MultiDrawRenderItem, b: MultiDrawRenderItem): number 
{
	return a.z - b.z;
}

/** @internal */
export function sortTransparent(a: MultiDrawRenderItem, b: MultiDrawRenderItem): number 
{
	return b.z - a.z;
}

type SortFunction = (list: Array<{ start: number; count: number; z: number }>, camera: Camera) => void

export type MultiDrawRenderItem = { start: number; count: number; z: number; zSort?: number; index?: number };

/**
 * A class that creates and manages a list of render items, used to determine the rendering order based on depth.
 * @internal
 */
export class MultiDrawRenderList
{
	public array: MultiDrawRenderItem[] = [];
	protected pool: MultiDrawRenderItem[] = [];

	public push(instanceId: number, depth: number, start: number, count: number): void
	{
		const pool = this.pool;
		const list = this.array;
		const index = list.length;

		if (index >= pool.length)
		{
			// @ts-ignore
			pool.push({ start: null, count: null, z: null, zSort: null, index: null });
		}

		const item = pool[index];
		item.index = instanceId;
		item.start = start;
		item.count = count;
		item.z = depth;

		list.push(item);
	}

	public reset(): void
	{
		this.array.length = 0;
	}
}

const _matrix = /*@__PURE__*/ new Matrix4();
const _whiteColor = /*@__PURE__*/ new Color(1, 1, 1);
const _frustum = /*@__PURE__*/ new Frustum();
const _frustumArray = /*@__PURE__*/ new FrustumArray();
const _box = /*@__PURE__*/ new Box3();
const _sphere = /*@__PURE__*/ new Sphere();
const _vector = /*@__PURE__*/ new Vector3();
const _forward = /*@__PURE__*/ new Vector3();
const _temp = /*@__PURE__*/ new Vector3();
const _renderList = /*@__PURE__*/ new MultiDrawRenderList();
const _mesh = /*@__PURE__*/ new Mesh();
const _batchIntersects: Intersection[] = [];

// copies data from attribute "src" into "target" starting at "targetOffset"
function copyAttributeData(src, target, targetOffset = 0)
{
	const itemSize = target.itemSize;
	if (src.isInterleavedBufferAttribute || src.array.constructor !== target.array.constructor)
	{
		// use the component getters and setters if the array data cannot
		// be copied directly
		const vertexCount = src.count;
		for (let i = 0; i < vertexCount; i++)
		{
			for (let c = 0; c < itemSize; c++)
			{
				target.setComponent(i + targetOffset, c, src.getComponent(i, c));
			}
		}
	}
	else
	{
		// faster copy approach using typed array set function
		target.array.set(src.array, targetOffset * itemSize);
	}
	target.needsUpdate = true;
}

// safely copies array contents to a potentially smaller array
function copyArrayContents(src, target)
{
	if (src.constructor !== target.constructor)
	{
		// if arrays are of a different type (eg due to index size increasing) then data must be per-element copied
		const len = Math.min(src.length, target.length);
		for (let i = 0; i < len; i++)
		{
			target[i] = src[i];
		}
	}
	else
	{
		// if the arrays use the same data layout we can use a fast block copy
		const len = Math.min(src.length, target.length);
		target.set(new src.constructor(src.buffer, 0, len));
	}
}

export class BatchedLodMesh extends Mesh<BufferGeometry, Material>
{
	/**
	 * This bounding box encloses all instances of the {@link BatchedLodMesh}. Can be calculated with
	 * {@link .computeBoundingBox()}.
	 * @default null
	 */
	boundingBox: Box3 | null;

	/**
	 * This bounding sphere encloses all instances of the {@link BatchedLodMesh}. Can be calculated with
	 * {@link .computeBoundingSphere()}.
	 * @default null
	 */
	boundingSphere: Sphere | null;

	customSort: SortFunction | null;

	/**
	 * If true then the individual objects within the {@link BatchedLodMesh} are frustum culled.
	 * @default true
	 */
	perObjectFrustumCulled: boolean;

	/**
	 * If true then the individual objects within the {@link BatchedLodMesh} are sorted to improve overdraw-related
	 * artifacts. If the material is marked as "transparent" objects are rendered back to front and if not then they are
	 * rendered front to back.
	 * @default true
	 */
	sortObjects: boolean;

	/**
	 * Read-only flag to check if a given object is of type {@link BatchedLodMesh}.
	 */
	readonly isBatchedMesh: true;

	constructor(maxInstanceCount: number, maxVertexCount: number, maxIndexCount = maxVertexCount * 2, material: Material)
	{
		super(new BufferGeometry(), material);

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isBatchedMesh = true;

		/**
		 * When set ot `true`, the individual objects of a batch are frustum culled.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.perObjectFrustumCulled = true;

		/**
		 * When set to `true`, the individual objects of a batch are sorted to improve overdraw-related artifacts.
		 * If the material is marked as "transparent" objects are rendered back to front and if not then they are
		 * rendered front to back.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.sortObjects = true;

		/**
		 * The bounding box of the batched mesh. Can be computed via {@link BatchedLodMesh#computeBoundingBox}.
		 *
		 * @type {?Box3}
		 * @default null
		 */
		this.boundingBox = null;

		/**
		 * The bounding sphere of the batched mesh. Can be computed via {@link BatchedLodMesh#computeBoundingSphere}.
		 *
		 * @type {?Sphere}
		 * @default null
		 */
		this.boundingSphere = null;

		/**
		 * Takes a sort a function that is run before render. The function takes a list of instances to
		 * sort and a camera. The objects in the list include a "z" field to perform a depth-ordered
		 * sort with.
		 *
		 * @type {?Function}
		 * @default null
		 */
		this.customSort = null;

		// stores visible, active, and geometry id per instance and reserved buffer ranges for geometries
		this._instanceInfo = [];
		this._geometryInfo = [];

		// instance, geometry ids that have been set as inactive, and are available to be overwritten
		this._availableInstanceIds = [];
		this._availableGeometryIds = [];

		// used to track where the next point is that geometry should be inserted
		this._nextIndexStart = 0;
		this._nextVertexStart = 0;
		this._geometryCount = 0;

		// flags
		this._visibilityChanged = true;
		this._geometryInitialized = false;

		// cached user options
		this._maxInstanceCount = maxInstanceCount;
		this._maxVertexCount = maxVertexCount;
		this._maxIndexCount = maxIndexCount;

		// buffers for multi draw
		this._multiDrawCounts = new Int32Array(maxInstanceCount);
		this._multiDrawStarts = new Int32Array(maxInstanceCount);
		this._multiDrawCount = 0;
		this._multiDrawInstances = null;

		// Local matrix per geometry by using data texture
		this._matricesTexture = null;
		this._indirectTexture = null;
		this._colorsTexture = null;

		this._initMatricesTexture();
		this._initIndirectTexture();

	}

	_instanceInfo: Array<any>
	_geometryInfo: Array<BatchedMeshGeometryRange>
	_availableInstanceIds: Array<number>
	_availableGeometryIds: Array<number>
	_nextIndexStart: number
	_nextVertexStart: number
	_geometryCount: number
	_visibilityChanged: boolean
	_geometryInitialized: boolean
	_maxInstanceCount: number
	_maxVertexCount: number
	_maxIndexCount: number
	_multiDrawCounts: Int32Array
	_multiDrawStarts: Int32Array
	_multiDrawCount: number
	_multiDrawInstances: any;
	_matricesTexture: DataTexture | null
	_indirectTexture: DataTexture | null
	_colorsTexture: DataTexture | null


	/** The maximum number of individual instances that can be stored in the batch. */
	get maxInstanceCount() { return this._maxInstanceCount; }

	/** The instance count. */
	get instanceCount() { return this._instanceInfo.length - this._availableInstanceIds.length; }

	/** The number of unused vertices. */
	get unusedVertexCount() { return this._maxVertexCount - this._nextVertexStart; }

	/** The number of unused indices. */
	get unusedIndexCount() { return this._maxIndexCount - this._nextIndexStart; }

	_initMatricesTexture()
	{
		// layout (1 matrix = 4 pixels)
		//      RGBA RGBA RGBA RGBA (=> column1, column2, column3, column4)
		//  with  8x8  pixel texture max   16 matrices * 4 pixels =  (8 * 8)
		//       16x16 pixel texture max   64 matrices * 4 pixels = (16 * 16)
		//       32x32 pixel texture max  256 matrices * 4 pixels = (32 * 32)
		//       64x64 pixel texture max 1024 matrices * 4 pixels = (64 * 64)
		let size = Math.sqrt(this._maxInstanceCount * 4); // 4 pixels needed for 1 matrix
		size = Math.ceil(size / 4) * 4;
		size = Math.max(size, 4);

		const matricesArray = new Float32Array(size * size * 4); // 4 floats per RGBA pixel
		const matricesTexture = new DataTexture(matricesArray, size, size, RGBAFormat, FloatType);

		this._matricesTexture = matricesTexture;
	}

	_initIndirectTexture()
	{
		let size = Math.sqrt(this._maxInstanceCount);
		size = Math.ceil(size);
		const indirectArray = new Uint32Array(size * size);
		const indirectTexture = new DataTexture(indirectArray, size, size, RedIntegerFormat, UnsignedIntType);
		this._indirectTexture = indirectTexture;
	}

	_initColorsTexture()
	{
		let size = Math.sqrt(this._maxInstanceCount);
		size = Math.ceil(size);
		// 4 floats per RGBA pixel initialized to white
		const colorsArray = new Float32Array(size * size * 4).fill(1);
		const colorsTexture = new DataTexture(colorsArray, size, size, RGBAFormat, FloatType);
		colorsTexture.colorSpace = ColorManagement.workingColorSpace;
		this._colorsTexture = colorsTexture;
	}

	_initializeGeometry(reference: any)
	{
		const geometry = this.geometry;
		const maxVertexCount = this._maxVertexCount;
		const maxIndexCount = this._maxIndexCount;
		if (this._geometryInitialized === false)
		{
			for (const attributeName in reference.attributes)
			{
				const srcAttribute = reference.getAttribute(attributeName);
				const { array, itemSize, normalized } = srcAttribute;
				const dstArray = new array.constructor(maxVertexCount * itemSize);
				const dstAttribute = new BufferAttribute(dstArray, itemSize, normalized);
				geometry.setAttribute(attributeName, dstAttribute);
			}
			if (reference.getIndex() !== null)
			{
				// Reserve last u16 index for primitive restart.
				const indexArray = maxVertexCount > 65535
					? new Uint32Array(maxIndexCount)
					: new Uint16Array(maxIndexCount);

				geometry.setIndex(new BufferAttribute(indexArray, 1));
			}
			this._geometryInitialized = true;
		}
	}

	// Make sure the geometry is compatible with the existing combined geometry attributes
	_validateGeometry(geometry: BufferGeometry)
	{
		// check to ensure the geometries are using consistent attributes and indices
		const batchGeometry = this.geometry;
		if (Boolean(geometry.getIndex()) !== Boolean(batchGeometry.getIndex()))
		{
			throw new Error('THREE.BatchedMesh: All geometries must consistently have "index".');
		}

		for (const attributeName in batchGeometry.attributes)
		{
			if (!geometry.hasAttribute(attributeName))
			{
				throw new Error(`THREE.BatchedMesh: Added geometry missing "${attributeName}". All geometries must have consistent attributes.`);
			}
			const srcAttribute = geometry.getAttribute(attributeName);
			const dstAttribute = batchGeometry.getAttribute(attributeName);
			if (srcAttribute.itemSize !== dstAttribute.itemSize || srcAttribute.normalized !== dstAttribute.normalized)
			{
				throw new Error('THREE.BatchedMesh: All attributes must have a consistent itemSize and normalized value.');
			}
		}
	}

	/** Validates the instance defined by the given ID. */
	validateInstanceId(instanceId: number)
	{
		const instanceInfo = this._instanceInfo;
		if (instanceId < 0 || instanceId >= instanceInfo.length || instanceInfo[instanceId].active === false)
		{
			throw new Error(`THREE.BatchedMesh: Invalid instanceId ${instanceId}. Instance is either out of range or has been deleted.`);
		}
	}

	/** Validates the geometry defined by the given ID. */
	validateGeometryId(geometryId: number)
	{
		const geometryInfoList = this._geometryInfo;
		if (geometryId < 0 || geometryId >= geometryInfoList.length || geometryInfoList[geometryId].active === false)
		{
			throw new Error(`THREE.BatchedMesh: Invalid geometryId ${geometryId}. Geometry is either out of range or has been deleted.`);
		}
	}

	/**
	 * Takes a sort a function that is run before render. The function takes a list of instances to
	 * sort and a camera. The objects in the list include a "z" field to perform a depth-ordered sort with.
	 */
	setCustomSort(func: SortFunction)
	{
		this.customSort = func;
		return this;
	}

	/**
	 * Computes the bounding box, updating {@link BatchedLodMesh#boundingBox}.
	 * Bounding boxes aren't computed by default. They need to be explicitly computed,
	 * otherwise they are `null`.
	 */
	computeBoundingBox()
	{
		if (this.boundingBox === null)
		{
			this.boundingBox = new Box3();
		}

		const boundingBox = this.boundingBox;
		const instanceInfo = this._instanceInfo;

		boundingBox.makeEmpty();
		for (let i = 0, l = instanceInfo.length; i < l; i++)
		{
			if (instanceInfo[i].active === false) continue;
			const geometryId = instanceInfo[i].geometryIndex;
			this.getMatrixAt(i, _matrix);
			this.getBoundingBoxAt(geometryId, _box)?.applyMatrix4(_matrix);
			boundingBox.union(_box);
		}
	}

	/**
	 * Computes the bounding sphere, updating {@link BatchedLodMesh#boundingSphere}.
	 * Bounding spheres aren't computed by default. They need to be explicitly computed,
	 * otherwise they are `null`.
	 */
	computeBoundingSphere()
	{
		if (this.boundingSphere === null)
		{
			this.boundingSphere = new Sphere();
		}

		const boundingSphere = this.boundingSphere;
		const instanceInfo = this._instanceInfo;

		boundingSphere.makeEmpty();
		for (let i = 0, l = instanceInfo.length; i < l; i++)
		{
			if (instanceInfo[i].active === false) continue;

			const geometryId = instanceInfo[i].geometryIndex;
			this.getMatrixAt(i, _matrix);
			this.getBoundingSphereAt(geometryId, _sphere)?.applyMatrix4(_matrix);
			boundingSphere.union(_sphere);
		}
	}

	/**
	 * Adds a new instance to the batch using the geometry of the given ID and returns
	 * a new id referring to the new instance to be used by other functions.
	 */
	addInstance(geometryId: number)
	{
		const atCapacity = this._instanceInfo.length >= this.maxInstanceCount;

		// ensure we're not over geometry
		if (atCapacity && this._availableInstanceIds.length === 0)
		{
			throw new Error('THREE.BatchedMesh: Maximum item count reached.');
		}

		const instanceInfo = {
			visible: true,
			active: true,
			geometryIndex: geometryId,
		};

		let drawId: number | null = null;

		// Prioritize using previously freed instance ids
		if (this._availableInstanceIds.length > 0)
		{
			this._availableInstanceIds.sort(ascIdSort);
			drawId = this._availableInstanceIds.shift()!;
			this._instanceInfo[drawId] = instanceInfo;
		}
		else
		{
			drawId = this._instanceInfo.length;
			this._instanceInfo.push(instanceInfo);
		}

		const matricesTexture = this._matricesTexture;
		assert(matricesTexture?.image.data, 'THREE.BatchedMesh: Matrices texture not initialized.');
		_matrix.identity().toArray(matricesTexture.image.data, drawId * 16);
		matricesTexture.needsUpdate = true;

		const colorsTexture = this._colorsTexture;
		if (colorsTexture)
		{
			assert(colorsTexture.image.data, 'THREE.BatchedMesh: Colors texture not initialized.');
			_whiteColor.toArray(colorsTexture.image.data, drawId * 4);
			colorsTexture.needsUpdate = true;
		}

		this._visibilityChanged = true;
		return drawId;
	}

	/**
	 * Adds the given geometry to the batch and returns the associated
	 * geometry id referring to it to be used in other functions.
	 *
	 * @param {BufferGeometry} geometry - The geometry to add.
	 * vertex buffer space to reserve for the added geometry. This is necessary if it is planned
	 * to set a new geometry at this index at a later time that is larger than the original geometry.
	 * Defaults to the length of the given geometry vertex buffer.
	 * buffer space to reserve for the added geometry. This is necessary if it is planned to set a
	 * new geometry at this index at a later time that is larger than the original geometry. Defaults to
	 * the length of the given geometry index buffer.
	 */
	addGeometry(geometry: BufferGeometry, reservedVertexCount = - 1, reservedIndexCount = - 1)
	{
		this._initializeGeometry(geometry);
		this._validateGeometry(geometry);

		const geometryInfo = {
			// geometry information
			vertexStart: - 1,
			vertexCount: - 1,
			reservedVertexCount: - 1,

			indexStart: - 1,
			indexCount: - 1,
			reservedIndexCount: - 1,

			// draw range information
			start: - 1,
			count: - 1,

			// state
			boundingBox: null,
			boundingSphere: null,
			active: true,
		};

		const geometryInfoList = this._geometryInfo;
		geometryInfo.vertexStart = this._nextVertexStart;
		geometryInfo.reservedVertexCount = reservedVertexCount === - 1 ? geometry.getAttribute('position').count : reservedVertexCount;

		const index = geometry.getIndex();
		const hasIndex = index !== null;
		if (hasIndex)
		{
			geometryInfo.indexStart = this._nextIndexStart;
			geometryInfo.reservedIndexCount = reservedIndexCount === - 1 ? index.count : reservedIndexCount;
		}

		if (
			geometryInfo.indexStart !== - 1 &&
			geometryInfo.indexStart + geometryInfo.reservedIndexCount > this._maxIndexCount ||
			geometryInfo.vertexStart + geometryInfo.reservedVertexCount > this._maxVertexCount
		)
		{
			throw new Error('THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.');
		}

		// update id
		let geometryId;
		if (this._availableGeometryIds.length > 0)
		{
			this._availableGeometryIds.sort(ascIdSort);
			geometryId = this._availableGeometryIds.shift()!;
			geometryInfoList[geometryId] = geometryInfo;
		}
		else
		{
			geometryId = this._geometryCount;
			this._geometryCount++;
			geometryInfoList.push(geometryInfo);
		}

		// update the geometry
		this.setGeometryAt(geometryId, geometry);

		// increment the next geometry position
		this._nextIndexStart = geometryInfo.indexStart + geometryInfo.reservedIndexCount;
		this._nextVertexStart = geometryInfo.vertexStart + geometryInfo.reservedVertexCount;

		return geometryId;
	}

	/**
	 * Replaces the geometry at the given ID with the provided geometry. Throws an error if there
	 * is not enough space reserved for geometry. Calling this will change all instances that are
	 * rendering that geometry.
	 */
	setGeometryAt(geometryId: number, geometry: BufferGeometry)
	{
		if (geometryId >= this._geometryCount)
		{
			throw new Error('THREE.BatchedMesh: Maximum geometry count reached.');
		}

		this._validateGeometry(geometry);

		const batchGeometry = this.geometry;
		const dstIndex = batchGeometry.getIndex();
		const srcIndex = geometry.getIndex();
		const geometryInfo = this._geometryInfo[geometryId];
		if (
			dstIndex &&
			isNumber(srcIndex?.count) &&
			srcIndex.count > geometryInfo.reservedIndexCount ||
			geometry.attributes.position.count > geometryInfo.reservedVertexCount
		)
		{
			throw new Error('THREE.BatchedMesh: Reserved space not large enough for provided geometry.');
		}

		// copy geometry buffer data over
		const vertexStart = geometryInfo.vertexStart;
		const reservedVertexCount = geometryInfo.reservedVertexCount;
		geometryInfo.vertexCount = geometry.getAttribute('position').count;

		for (const attributeName in batchGeometry.attributes)
		{
			// copy attribute data
			const srcAttribute = geometry.getAttribute(attributeName);
			const dstAttribute = batchGeometry.getAttribute(attributeName);
			copyAttributeData(srcAttribute, dstAttribute, vertexStart);

			// fill the rest in with zeroes
			const itemSize = srcAttribute.itemSize;
			for (let i = srcAttribute.count, l = reservedVertexCount; i < l; i++)
			{
				const index = vertexStart + i;
				for (let c = 0; c < itemSize; c++)
				{
					dstAttribute.setComponent(index, c, 0);
				}
			}

			dstAttribute.needsUpdate = true;
			if (!(dstAttribute instanceof InterleavedBufferAttribute))
			{
				dstAttribute.addUpdateRange(vertexStart * itemSize, reservedVertexCount * itemSize);
			}
		}

		// copy index
		if (dstIndex && srcIndex)
		{
			const indexStart = geometryInfo.indexStart;
			const reservedIndexCount = geometryInfo.reservedIndexCount;
			geometryInfo.indexCount = srcIndex.count;

			// copy index data over
			for (let i = 0; i < srcIndex.count; i++)
			{
				dstIndex.setX(indexStart + i, vertexStart + srcIndex.getX(i));
			}

			// fill the rest in with zeroes
			for (let i = srcIndex.count, l = reservedIndexCount; i < l; i++)
			{
				dstIndex.setX(indexStart + i, vertexStart);
			}

			dstIndex.needsUpdate = true;
			dstIndex.addUpdateRange(indexStart, geometryInfo.reservedIndexCount);
		}

		// update the draw range
		geometryInfo.start = dstIndex ? geometryInfo.indexStart : geometryInfo.vertexStart;
		geometryInfo.count = dstIndex ? geometryInfo.indexCount : geometryInfo.vertexCount;

		// store the bounding boxes
		geometryInfo.boundingBox = null;
		if (geometry.boundingBox !== null)
		{
			geometryInfo.boundingBox = geometry.boundingBox.clone();
		}

		geometryInfo.boundingSphere = null;
		if (geometry.boundingSphere !== null)
		{
			geometryInfo.boundingSphere = geometry.boundingSphere.clone();
		}

		this._visibilityChanged = true;
		return geometryId;
	}

	/**
	 * Deletes the geometry defined by the given ID from this batch. Any instances referencing
	 * this geometry will also be removed as a side effect.
	 */
	deleteGeometry(geometryId: number)
	{
		const geometryInfoList = this._geometryInfo;
		if (geometryId >= geometryInfoList.length || geometryInfoList[geometryId].active === false)
		{
			return this;
		}

		// delete any instances associated with this geometry
		const instanceInfo = this._instanceInfo;
		for (let i = 0, l = instanceInfo.length; i < l; i++)
		{
			if (instanceInfo[i].active && instanceInfo[i].geometryIndex === geometryId)
			{
				this.deleteInstance(i);
			}
		}

		geometryInfoList[geometryId].active = false;
		this._availableGeometryIds.push(geometryId);
		this._visibilityChanged = true;

		return this;
	}

	/** Deletes an existing instance from the batch using the given ID. */
	deleteInstance(instanceId: number)
	{
		this.validateInstanceId(instanceId);
		this._instanceInfo[instanceId].active = false;
		this._availableInstanceIds.push(instanceId);
		this._visibilityChanged = true;
		return this;
	}

	/**
	 * Repacks the sub geometries to remove any unused space remaining from
	 * previously deleted geometry, freeing up space to add new geometry.
	 */
	optimize()
	{
		// track the next indices to copy data to
		let nextVertexStart = 0;
		let nextIndexStart = 0;

		// Iterate over all geometry ranges in order sorted from earliest in the geometry buffer to latest
		// in the geometry buffer. Because draw range objects can be reused there is no guarantee of their order.
		const geometryInfoList = this._geometryInfo;
		const indices = geometryInfoList
			.map((e, i) => i)
			.sort((a, b) =>
			{
				return geometryInfoList[a].vertexStart - geometryInfoList[b].vertexStart;
			});

		const geometry = this.geometry;
		for (let i = 0, l = geometryInfoList.length; i < l; i++)
		{
			// if a geometry range is inactive then don't copy anything
			const index = indices[i];
			const geometryInfo = geometryInfoList[index];
			if (geometryInfo.active === false)
			{
				continue;
			}

			// if a geometry contains an index buffer then shift it, as well
			if (geometry.index !== null)
			{
				if (geometryInfo.indexStart !== nextIndexStart)
				{
					const { indexStart, vertexStart, reservedIndexCount } = geometryInfo;
					const index = geometry.index;
					const array = index.array;

					// shift the index pointers based on how the vertex data will shift
					// adjusting the index must happen first so the original vertex start value is available
					const elementDelta = nextVertexStart - vertexStart;
					for (let j = indexStart; j < indexStart + reservedIndexCount; j++)
					{
						array[j] = array[j] + elementDelta;
					}
					index.array.copyWithin(nextIndexStart, indexStart, indexStart + reservedIndexCount);
					index.addUpdateRange(nextIndexStart, reservedIndexCount);
					geometryInfo.indexStart = nextIndexStart;
				}
				nextIndexStart += geometryInfo.reservedIndexCount;
			}

			// if a geometry needs to be moved then copy attribute data to overwrite unused space
			if (geometryInfo.vertexStart !== nextVertexStart)
			{
				const { vertexStart, reservedVertexCount } = geometryInfo;
				const attributes = geometry.attributes;
				for (const key in attributes)
				{
					const attribute = attributes[key];
					const { array, itemSize } = attribute;
					array.copyWithin(nextVertexStart * itemSize, vertexStart * itemSize, (vertexStart + reservedVertexCount) * itemSize);
					// @ts-expect-error
					attribute.addUpdateRange?.(nextVertexStart * itemSize, reservedVertexCount * itemSize);
				}
				geometryInfo.vertexStart = nextVertexStart;
			}

			nextVertexStart += geometryInfo.reservedVertexCount;
			geometryInfo.start = geometry.index ? geometryInfo.indexStart : geometryInfo.vertexStart;

			// step the next geometry points to the shifted position
			this._nextIndexStart = geometry.index ? geometryInfo.indexStart + geometryInfo.reservedIndexCount : 0;
			this._nextVertexStart = geometryInfo.vertexStart + geometryInfo.reservedVertexCount;
		}

		return this;
	}

	/** Returns the bounding box for the given geometry. */
	getBoundingBoxAt(geometryId: number, target: Box3)
	{
		if (geometryId >= this._geometryCount)
		{
			return null;
		}

		// compute bounding box
		const geometry = this.geometry;
		const geometryInfo = this._geometryInfo[geometryId];
		if (geometryInfo.boundingBox === null)
		{
			const box = new Box3();
			const index = geometry.index;
			const position = geometry.attributes.position;
			for (let i = geometryInfo.start, l = geometryInfo.start + geometryInfo.count; i < l; i++)
			{
				let iv = i;
				if (index)
				{
					iv = index.getX(iv);
				}
				box.expandByPoint(_vector.fromBufferAttribute(position, iv));
			}
			geometryInfo.boundingBox = box;
		}

		target.copy(geometryInfo.boundingBox);
		return target;
	}

	/** Returns the bounding sphere for the given geometry. */
	getBoundingSphereAt(geometryId: number, target: Sphere)
	{
		if (geometryId >= this._geometryCount)
		{
			return null;
		}

		// compute bounding sphere
		const geometry = this.geometry;
		const geometryInfo = this._geometryInfo[geometryId];
		if (geometryInfo.boundingSphere === null)
		{
			const sphere = new Sphere();
			this.getBoundingBoxAt(geometryId, _box);
			_box.getCenter(sphere.center);

			const index = geometry.index;
			const position = geometry.attributes.position;

			let maxRadiusSq = 0;
			for (let i = geometryInfo.start, l = geometryInfo.start + geometryInfo.count; i < l; i++)
			{
				let iv = i;
				if (index)
				{
					iv = index.getX(iv);
				}
				_vector.fromBufferAttribute(position, iv);
				maxRadiusSq = Math.max(maxRadiusSq, sphere.center.distanceToSquared(_vector));
			}

			sphere.radius = Math.sqrt(maxRadiusSq);
			geometryInfo.boundingSphere = sphere;
		}

		target.copy(geometryInfo.boundingSphere);
		return target;
	}

	/**
	 * Sets the given local transformation matrix to the defined instance.
	 * Negatively scaled matrices are not supported.
	 */
	setMatrixAt(instanceId: number, matrix: Matrix4)
	{
		assert(this._matricesTexture, 'THREE.BatchedMesh: Matrices texture not initialized.');
		if (matrix.determinant() < 0)
		{
			throw new Error('THREE.BatchedMesh: Negatively scaled matrices are not supported.');
		}
		this.validateInstanceId(instanceId);
		const matricesTexture = this._matricesTexture;
		const matricesArray = this._matricesTexture.image.data;
		assert(matricesArray, 'THREE.BatchedMesh: Matrices texture data not initialized.');
		matrix.toArray(matricesArray, instanceId * 16);
		matricesTexture.needsUpdate = true;
		return this;
	}

	/**
	 * Returns the local transformation matrix of the defined instance.
	 *
	 * @param {number} instanceId - The ID of an instance to get the matrix of.
	 * @param {Matrix4} matrix - The target object that is used to store the method's result.
	 * @return {Matrix4} The instance's local transformation matrix.
	 */
	getMatrixAt(instanceId: number, matrix: Matrix4)
	{
		this.validateInstanceId(instanceId);
		assert(this._matricesTexture?.image.data, 'THREE.BatchedMesh: Matrices texture not initialized.');
		return matrix.fromArray(this._matricesTexture.image.data, instanceId * 16);
	}

	/** Sets the given color to the defined instance. */
	setColorAt(instanceId: number, color: Color)
	{
		this.validateInstanceId(instanceId);
		if (this._colorsTexture === null)
		{
			this._initColorsTexture();
		}
		assert(this._colorsTexture?.image.data, 'THREE.BatchedMesh: Colors texture not initialized.');
		color.toArray(this._colorsTexture.image.data, instanceId * 4);
		this._colorsTexture.needsUpdate = true;
		return this;
	}

	/** Returns the color of the defined instance. */
	getColorAt(instanceId: number, color: Color)
	{
		this.validateInstanceId(instanceId);
		assert(this._colorsTexture?.image.data, 'THREE.BatchedMesh: Colors texture not initialized.');
		return color.fromArray(this._colorsTexture.image.data, instanceId * 4);
	}

	/** Sets the visibility of the instance. */
	setVisibleAt(instanceId: number, visible: boolean)
	{
		this.validateInstanceId(instanceId);
		if (this._instanceInfo[instanceId].visible === visible)
		{
			return this;
		}
		this._instanceInfo[instanceId].visible = visible;
		this._visibilityChanged = true;
		return this;
	}

	/** Returns the visibility state of the defined instance. */
	getVisibleAt(instanceId: number)
	{
		this.validateInstanceId(instanceId);
		return this._instanceInfo[instanceId].visible;
	}

	/**
	 * Sets the geometry ID of the instance at the given index.
	 * @param  instanceId - The ID of the instance to set the geometry ID of.
	 * @param geometryId - The geometry ID to be use by the instance.
	 */
	setGeometryIdAt(instanceId: number, geometryId: number)
	{
		this.validateInstanceId(instanceId);
		this.validateGeometryId(geometryId);
		this._instanceInfo[instanceId].geometryIndex = geometryId;
		return this;
	}

	/** Returns the geometry ID of the defined instance. */
	getGeometryIdAt(instanceId: number)
	{
		this.validateInstanceId(instanceId);
		return this._instanceInfo[instanceId].geometryIndex;
	}

	/**
	 * Get the range representing the subset of triangles related to the attached geometry,
	 * indicating the starting offset and count, or `null` if invalid.
	 * @param geometryId - The id of the geometry to get the range of.
	 * @param target - The target object that is used to store the method's result.
	 */
	getGeometryRangeAt(geometryId: number, target: Partial<{
		vertexStart: number,
		vertexCount: number,
		reservedVertexCount: number,
		indexStart: number,
		indexCount: number,
		reservedIndexCount: number,
		start: number,
		count: number
	}>)
	{
		this.validateGeometryId(geometryId);
		const geometryInfo = this._geometryInfo[geometryId];
		target.vertexStart = geometryInfo.vertexStart;
		target.vertexCount = geometryInfo.vertexCount;
		target.reservedVertexCount = geometryInfo.reservedVertexCount;
		target.indexStart = geometryInfo.indexStart;
		target.indexCount = geometryInfo.indexCount;
		target.reservedIndexCount = geometryInfo.reservedIndexCount;
		target.start = geometryInfo.start;
		target.count = geometryInfo.count;
		return target;
	}

	/**
	 * Resizes the necessary buffers to support the provided number of instances.
	 * If the provided arguments shrink the number of instances but there are not enough
	 * unused Ids at the end of the list then an error is thrown.
	 * @param maxInstanceCount - The max number of individual instances that can be added and rendered by the batch.
	*/
	setInstanceCount(maxInstanceCount: number)
	{
		// shrink the available instances as much as possible
		const availableInstanceIds = this._availableInstanceIds;
		const instanceInfo = this._instanceInfo;
		availableInstanceIds.sort(ascIdSort);
		while (availableInstanceIds[availableInstanceIds.length - 1] === instanceInfo.length - 1)
		{
			instanceInfo.pop();
			availableInstanceIds.pop();
		}

		// throw an error if it can't be shrunk to the desired size
		if (maxInstanceCount < instanceInfo.length)
		{
			throw new Error(`BatchedMesh: Instance ids outside the range ${maxInstanceCount} are being used. Cannot shrink instance count.`);
		}

		// copy the multi draw counts
		const multiDrawCounts = new Int32Array(maxInstanceCount);
		const multiDrawStarts = new Int32Array(maxInstanceCount);
		copyArrayContents(this._multiDrawCounts, multiDrawCounts);
		copyArrayContents(this._multiDrawStarts, multiDrawStarts);

		this._multiDrawCounts = multiDrawCounts;
		this._multiDrawStarts = multiDrawStarts;
		this._maxInstanceCount = maxInstanceCount;

		// update texture data for instance sampling
		const indirectTexture = this._indirectTexture;
		const matricesTexture = this._matricesTexture;
		const colorsTexture = this._colorsTexture;

		indirectTexture?.dispose();
		this._initIndirectTexture();
		copyArrayContents(indirectTexture!.image.data, this._indirectTexture!.image.data);

		matricesTexture?.dispose();
		this._initMatricesTexture();
		copyArrayContents(matricesTexture!.image.data, this._matricesTexture!.image.data);

		if (colorsTexture)
	  {
			colorsTexture.dispose();
			this._initColorsTexture();
			copyArrayContents(colorsTexture.image.data, this._colorsTexture!.image.data);
		}
	}

	/**
	 * Resizes the available space in the batch's vertex and index buffer attributes to the provided sizes.
	 * If the provided arguments shrink the geometry buffers but there is not enough unused space at the
	 * end of the geometry attributes then an error is thrown.
	 *
	 * @param maxVertexCount - The maximum number of vertices to be used by all unique geometries to resize to.
	 * @param maxIndexCount - The maximum number of indices to be used by all unique geometries to resize to.
	*/
	setGeometrySize(maxVertexCount: number, maxIndexCount: number)
	{
		// Check if we can shrink to the requested vertex attribute size
		const validRanges = [...this._geometryInfo].filter(info => info.active);
		const requiredVertexLength = Math.max(...validRanges.map(range => range.vertexStart + range.reservedVertexCount));
		if (requiredVertexLength > maxVertexCount)
		{
			throw new Error(`BatchedMesh: Geometry vertex values are being used outside the range ${maxIndexCount}. Cannot shrink further.`);
		}

		// Check if we can shrink to the requested index attribute size
		if (this.geometry.index)
		{
			const requiredIndexLength = Math.max(...validRanges.map(range => range.indexStart + range.reservedIndexCount));
			if (requiredIndexLength > maxIndexCount)
			{
				throw new Error(`BatchedMesh: Geometry index values are being used outside the range ${maxIndexCount}. Cannot shrink further.`);
			}
		}

		//

		// dispose of the previous geometry
		const oldGeometry = this.geometry;
		oldGeometry.dispose();

		// recreate the geometry needed based on the previous variant
		this._maxVertexCount = maxVertexCount;
		this._maxIndexCount = maxIndexCount;

		if (this._geometryInitialized)
		{
			this._geometryInitialized = false;
			this.geometry = new BufferGeometry();
			this._initializeGeometry(oldGeometry);
		}

		// copy data from the previous geometry
		const geometry = this.geometry;
		if (oldGeometry.index)
		{
			copyArrayContents(oldGeometry.index.array, geometry.index!.array);
		}

		for (const key in oldGeometry.attributes)
		{
			copyArrayContents(oldGeometry.attributes[key].array, geometry.attributes[key].array);
		}
	}

	raycast(raycaster: Raycaster, intersects: Intersection[])
	{
		const instanceInfo = this._instanceInfo;
		const geometryInfoList = this._geometryInfo;
		const matrixWorld = this.matrixWorld;
		const batchGeometry = this.geometry;

		// iterate over each geometry
		_mesh.material = this.material;
		_mesh.geometry.index = batchGeometry.index;
		_mesh.geometry.attributes = batchGeometry.attributes;
		if (_mesh.geometry.boundingBox === null)
		{
			_mesh.geometry.boundingBox = new Box3();
		}

		if (_mesh.geometry.boundingSphere === null)
		{
			_mesh.geometry.boundingSphere = new Sphere();
		}

		for (let i = 0, l = instanceInfo.length; i < l; i++)
		{
			if (!instanceInfo[i].visible || !instanceInfo[i].active)
			{
				continue;
			}

			const geometryId = instanceInfo[i].geometryIndex;
			const geometryInfo = geometryInfoList[geometryId];
			_mesh.geometry.setDrawRange(geometryInfo.start, geometryInfo.count);

			// get the intersects
			this.getMatrixAt(i, _mesh.matrixWorld).premultiply(matrixWorld);
			this.getBoundingBoxAt(geometryId, _mesh.geometry.boundingBox);
			this.getBoundingSphereAt(geometryId, _mesh.geometry.boundingSphere);
			_mesh.raycast(raycaster, _batchIntersects);

			// add batch id to the intersects
			for (let j = 0, l = _batchIntersects.length; j < l; j++)
			{
				const intersect = _batchIntersects[j];
				intersect.object = this;
				intersect.batchId = i;
				intersects.push(intersect);
			}

			_batchIntersects.length = 0;
		}

		// @ts-expect-error
		_mesh.material = null;
		_mesh.geometry.index = null;
		_mesh.geometry.attributes = {};
		_mesh.geometry.setDrawRange(0, Infinity);
	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose()
	{
		// Assuming the geometry is not shared with other meshes
		this.geometry.dispose();

		this._matricesTexture?.dispose();
		this._matricesTexture = null;

		this._indirectTexture?.dispose();
		this._indirectTexture = null;

		if (this._colorsTexture !== null)
		{
			this._colorsTexture.dispose();
			this._colorsTexture = null;
		}
	}

	onBeforeRender(
		renderer: WebGLRenderer | WebGPURenderer,
		scene: Scene,
		camera: Camera,
		geometry: BufferGeometry,
		material: Material
	)
	{
		// if visibility has not changed and frustum culling and object sorting is not required
		// then skip iterating over all items
		if (!this._visibilityChanged && !this.perObjectFrustumCulled && !this.sortObjects)
		{
			return;
		}

		// the indexed version of the multi draw function requires specifying the start
		// offset in bytes.
		const index = geometry.getIndex();
		const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;

		const instanceInfo = this._instanceInfo;
		const multiDrawStarts = this._multiDrawStarts;
		const multiDrawCounts = this._multiDrawCounts;
		const geometryInfoList = this._geometryInfo;
		const perObjectFrustumCulled = this.perObjectFrustumCulled;
		const indirectTexture = this._indirectTexture;
		const indirectArray = indirectTexture.image.data;

		const frustum = camera.isArrayCamera ? _frustumArray : _frustum;
		// prepare the frustum in the local frame
		if (perObjectFrustumCulled && !camera.isArrayCamera)
		{
			_matrix
				.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
				.multiply(this.matrixWorld);

			_frustum.setFromProjectionMatrix(
				_matrix,
				camera.coordinateSystem,
				camera.reversedDepth
			);
		}

		let multiDrawCount = 0;
		if (this.sortObjects)
		{
			// get the camera position in the local frame
			_matrix.copy(this.matrixWorld).invert();
			_vector.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_matrix);
			_forward.set(0, 0, - 1).transformDirection(camera.matrixWorld).transformDirection(_matrix);

			for (let i = 0, l = instanceInfo.length; i < l; i++)
			{
				if (instanceInfo[i].visible && instanceInfo[i].active)
				{
					const geometryId = instanceInfo[i].geometryIndex;
					// get the bounds in world space
					this.getMatrixAt(i, _matrix);
					this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(_matrix);
					// determine whether the batched geometry is within the frustum
					let culled = false;
					if (perObjectFrustumCulled)
					{
						culled = !frustum.intersectsSphere(_sphere, camera);
					}
					if (!culled)
					{
						// get the distance from camera used for sorting
						const geometryInfo = geometryInfoList[geometryId];
						const z = _temp.subVectors(_sphere.center, _vector).dot(_forward);
						_renderList.push(geometryInfo.start, geometryInfo.count, z, i);
					}
				}
			}

			// Sort the draw ranges and prep for rendering
			const list = _renderList.list;
			const customSort = this.customSort;
			if (customSort === null)
			{
				list.sort(material.transparent ? sortTransparent : sortOpaque);
			}
			else
			{
				customSort.call(this, list, camera);
			}

			for (let i = 0, l = list.length; i < l; i++)
			{
				const item = list[i];
				multiDrawStarts[multiDrawCount] = item.start * bytesPerElement;
				multiDrawCounts[multiDrawCount] = item.count;
				indirectArray[multiDrawCount] = item.index;
				multiDrawCount++;
			}

			_renderList.reset();
		}
		else
		{
			for (let i = 0, l = instanceInfo.length; i < l; i++)
			{
				if (instanceInfo[i].visible && instanceInfo[i].active)
				{
					const geometryId = instanceInfo[i].geometryIndex;
					// determine whether the batched geometry is within the frustum
					let culled = false;
					if (perObjectFrustumCulled)
					{
						// get the bounds in world space
						this.getMatrixAt(i, _matrix);
						this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(_matrix);
						culled = !frustum.intersectsSphere(_sphere, camera);
					}
					if (!culled)
					{
						const geometryInfo = geometryInfoList[geometryId];
						multiDrawStarts[multiDrawCount] = geometryInfo.start * bytesPerElement;
						multiDrawCounts[multiDrawCount] = geometryInfo.count;
						indirectArray[multiDrawCount] = i;
						multiDrawCount++;
					}
				}
			}
		}

		indirectTexture.needsUpdate = true;
		this._multiDrawCount = multiDrawCount;
		this._visibilityChanged = false;
	}

	onBeforeShadow(
		renderer: WebGLRenderer | WebGPURenderer,
		object: Object3D,
		camera: Camera,
		shadowCamera: Camera,
		geometry: BufferGeometry,
		depthMaterial: Material
	)
	{
		this.onBeforeRender(renderer, null, shadowCamera, geometry, depthMaterial);
	}
}

export class BatchedMeshBVH
{
	/**
	 * The target `BatchedMesh` object that the BVH is managing.
	 */
	public target: BatchedLodMesh;
	/**
	 * The BVH instance used to organize bounding volumes.
	 */
	public bvh: BVH<{}, number>;
	/**
	 * A map that stores the BVH nodes for each instance.
	 */
	public nodesMap = new Map<number, BVHNode<{}, number>>();
	/**
	 * Enables accurate frustum culling by checking intersections without applying margin to the bounding box.
	 */
	public accurateCulling: boolean;
	protected _margin: number;
	protected _origin = new Float32Array(3);
	protected _dir = new Float32Array(3);
	protected _cameraPos = new Float32Array(3);
	protected _boxArray = new Float32Array(6);

	/**
	 * @param target The target `BatchedMesh`.
	 * @param margin The margin applied for bounding box calculations (default is 0).
	 * @param accurateCulling Flag to enable accurate frustum culling without considering margin (default is true).
	 */
	constructor(target: BatchedLodMesh, coordinateSystem: CoordinateSystem, margin = 0, accurateCulling = true) 
	{
		this.target = target;
		this.accurateCulling = accurateCulling;
		this._margin = margin;

		this.bvh = new BVH(new HybridBuilder(), coordinateSystem === 2000 ? WebGLCoordinateSystem : WebGPUCoordinateSystem); // TODO fix in BVH.js
	}

	/**
	 * Builds the BVH from the target mesh's instances using a top-down construction method.
	 * This approach is more efficient and accurate compared to incremental methods, which add one instance at a time.
	 */
	public create(): void 
	{
		const count = this.target.instanceCount;
		const instancesArrayCount = this.target._instanceInfo.length; // TODO this may change.. don't like it too much
		const instancesInfo = this.target._instanceInfo;
		const boxes: Float32Array[] = new Array(count); // test if single array and recreation inside node creation is faster due to memory location
		const objects = new Uint32Array(count);
		let index = 0;

		this.clear();

		for (let i = 0; i < instancesArrayCount; i++) 
		{
			if (!instancesInfo[i].active) continue;
			boxes[index] = this.getBox(i, new Float32Array(6));
			objects[index] = i;
			index++;
		}

		this.bvh.createFromArray(objects as unknown as number[], boxes, (node) => 
		{
			this.nodesMap.set(node.object!, node);
		}, this._margin);
	}

	/**
	 * Inserts an instance into the BVH.
	 * @param id The id of the instance to insert.
	 */
	public insert(id: number): void 
	{
		const node = this.bvh.insert(id, this.getBox(id, new Float32Array(6)), this._margin);
		this.nodesMap.set(id, node);
	}

	/**
	 * Inserts a range of instances into the BVH.
	 * @param ids An array of ids to insert.
	 */
	public insertRange(ids: number[]): void 
	{
		const count = ids.length;
		const boxes: Float32Array[] = new Array(count);

		for (let i = 0; i < count; i++) 
		{
			boxes[i] = this.getBox(ids[i], new Float32Array(6));
		}

		this.bvh.insertRange(ids, boxes, this._margin, (node) => 
		{
			this.nodesMap.set(node.object!, node);
		});
	}

	/**
	 * Moves an instance within the BVH.
	 * @param id The id of the instance to move.
	 */
	public move(id: number): void 
	{
		const node = this.nodesMap.get(id);
		if (!node) return;
		this.getBox(id, node.box as Float32Array); // this also updates box
		this.bvh.move(node, this._margin);
	}

	/**
	 * Deletes an instance from the BVH.
	 * @param id The id of the instance to delete.
	 */
	public delete(id: number): void 
	{
		const node = this.nodesMap.get(id);
		if (!node) return;
		this.bvh.delete(node);
		this.nodesMap.delete(id);
	}

	/**
	 * Clears the BVH.
	 */
	public clear(): void 
	{
		this.bvh.clear();
		this.nodesMap.clear();
	}

	/**
	 * Performs frustum culling to determine which instances are visible based on the provided projection matrix.
	 * @param projScreenMatrix The projection screen matrix for frustum culling.
	 * @param onFrustumIntersection Callback function invoked when an instance intersects the frustum.
	 */
	public frustumCulling(projScreenMatrix: Matrix4, onFrustumIntersection: onFrustumIntersectionCallback<{}, number>): void 
	{
		if (this._margin > 0 && this.accurateCulling) 
		{
			this.bvh.frustumCulling(projScreenMatrix.elements, (node, frustum, mask) => 
			{
				if (frustum?.isIntersectedMargin(node.box, mask!, this._margin))
				{
					onFrustumIntersection(node);
				}
			});
		}
		else 
		{
			this.bvh.frustumCulling(projScreenMatrix.elements, onFrustumIntersection);
		}
	}

	/**
	 * Performs raycasting to check if a ray intersects any instances.
	 * @param raycaster The raycaster used for raycasting.
	 * @param onIntersection Callback function invoked when a ray intersects an instance.
	 */
	public raycast(raycaster: Raycaster, onIntersection: onIntersectionRayCallback<number>): void 
	{
		const ray = raycaster.ray;
		const origin = this._origin;
		const dir = this._dir;

		vec3ToArray(ray.origin, origin);
		vec3ToArray(ray.direction, dir);

		// TODO should we add margin check? maybe is not worth it
		this.bvh.rayIntersections(dir, origin, onIntersection, raycaster.near, raycaster.far);
	}

	/**
	 * Checks if a given box intersects with any instance bounding box.
	 * @param target The target bounding box.
	 * @param onIntersection Callback function invoked when an intersection occurs.
	 * @returns `True` if there is an intersection, otherwise `false`.
	 */
	public intersectBox(target: Box3, onIntersection: onIntersectionCallback<number>): boolean 
	{
		const array = this._boxArray;
		box3ToArray(target, array);
		return this.bvh.intersectsBox(array, onIntersection);
	}

	protected getBox(id: number, array: Float32Array): Float32Array 
	{
		const target = this.target;
		const geometryId = target._instanceInfo[id].geometryIndex;
		target.getBoundingBoxAt(geometryId, _box3)?.applyMatrix4(target.getMatrixAt(id, _matrix));
		box3ToArray(_box3, array);
		return array;
	}
}

const _box3 = new Box3();

export type VertexIndexCount = { vertexCount: number; indexCount: number };
export type VertexIndexLODCount = { vertexCount: number; indexCount: number; LODIndexCount: number[] };

export function getBatchedMeshCount(geometries: BufferGeometry[]): VertexIndexCount
{
	let vertexCount = 0;
	let indexCount = 0;
	for (const geometry of geometries)
	{
		vertexCount += geometry.attributes.position.count;
		indexCount += geometry.index?.count ?? 0;
	}
	return { vertexCount, indexCount };
}

export function getBatchedMeshLODCount(geometryLOD: BufferGeometry[][]): VertexIndexLODCount
{
	const LODIndexCount: number[] = [];
	let vertexCount = 0;
	let indexCount = 0;
	for (const geometries of geometryLOD)
	{
		let sum = 0;
		for (const geometry of geometries)
		{
			const count = geometry.index?.count ?? 0;
			indexCount += count;
			sum += count;
			vertexCount += geometry.attributes.position.count;
		}
		LODIndexCount.push(sum);
	}
	return { vertexCount, indexCount, LODIndexCount };
}
