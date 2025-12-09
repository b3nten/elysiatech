import { Matrix4, Quaternion, Vector3 } from "three";
import type { EntityID } from "../ecs/entity";
import type { World } from "../ecs/world";
import { Relationship } from "../ecs/relationship";
import type { Component } from "../ecs/component";
import { Instrumentor } from "../lib/instrument";

export class Transform implements Component
{
	static xAxis = new Vector3(1, 0, 0);
	static yAxis = new Vector3(0, 1, 0);
	static zAxis = new Vector3(0, 0, 1);

	private static matrixAcc: Array<Transform> = [];
	private static parentWorld = new Matrix4();
	private static vec3 = new Vector3();
	private static quat = new Quaternion();

	/**
	 * Calculate the world transform from local, adjusted for parents.
	 * @param world - the World of the containing Entity
	 * @param transform - the Transform component of the Entity
	 * @param input - Optional Matrix4 input paramater to be set
	 * @returns Matrix4 containing world transform of Entity
	 */
	static calculateWorldMatrix(
		world: World,
		entity: EntityID,
		input?: Matrix4,
	): Matrix4
	{
		Instrumentor.start("Transform::calculateWorldMatrix");
		if (!input)
		{
			input = new Matrix4();
		}

		const baseTransform = world.getComponent(entity, Transform);
		const baseRelationship = world.getComponent(entity, Relationship);

		// return identity if no transform or relationship
		if (!baseTransform && !baseRelationship)
		{
			return input.identity();
		}

		// no parent, local is world
		if (baseTransform && !baseRelationship)
		{
			input.copy(baseTransform.calculateMatrix());
		}

		// base transform exists, start with that
		if (baseTransform)
		{
			input.copy(baseTransform.calculateMatrix());
		}
		else
		{
			// no base transform, start with identity
			input.identity();
		}

		// parent
		Transform.matrixAcc.length = 0;
		if (baseRelationship)
		{
			let currentParent = baseRelationship.parent;
			while (currentParent)
			{
				const parentTransform = world.getComponent(currentParent, Transform);
				if (parentTransform)
				{
					Transform.matrixAcc.push(parentTransform);
				}
				const parentRel = world.getComponent(currentParent, Relationship);
				if (parentRel)
				{
					currentParent = parentRel.parent;
				}
				else
				{
					currentParent = null;
				}
			}
			if (Transform.matrixAcc.length === 0)
			{
				return input;
			}
			if (Transform.matrixAcc.length === 1)
			{
				return input.multiply(Transform.matrixAcc[0].calculateMatrix());
			}
			// @ts-ignore
			Transform.parentWorld.copy(Transform.matrixAcc.at(-1)?.calculateMatrix());
			for (let i = Transform.matrixAcc.length - 2; i >= 0; i--)
			{
				Transform.parentWorld.multiply(
					Transform.matrixAcc[i].calculateMatrix(),
				);
			}
			return input.multiply(Transform.parentWorld);
		}
		Instrumentor.end("Transform::calculateWorldMatrix");
		return input;
	}

	static createWithPosition(x: number, y: number, z: number)
	{
		const t = new Transform();
		t.position.set(x, y, z);
		return t;
	}

	static createWithRotation(x: number, y: number, z: number, w: number)
	{
		const t = new Transform();
		t.rotation.set(x, y, z, w);
		return t;
	}

	static createWithScale(x: number, y: number, z: number)
	{
		const t = new Transform();
		t.scale.set(x, y, z);
		return t;
	}

	/** Position in local space */
	public readonly position = new Vector3();
	/** Rotation in local space */
	public readonly rotation = new Quaternion();
	/** Scale in local space */
	public readonly scale = new Vector3(1, 1, 1);
	/**
	 * The local matrix of this transform.
	 *
	 * This matrix is not automatically updated when pos/rot/scale is changed.
	 * Use {@link calculateMatrix}.
	 */
	public readonly matrix = new Matrix4();

	public readonly worldMatrix = new Matrix4();

	/** Calculate the local matrix of this transform */
	protected calculateMatrix(): Matrix4
	{
		return this.matrix.compose(this.position, this.rotation, this.scale);
	}

	/**
	 * Translate the transform on a given axis.
	 * @param axis The normalied axis to translate on.
	 * @param amount The amount to translate.
	 */
	translateOnAxis(axis: Vector3, amount: number): void
	{
		Transform.vec3.copy(axis);
		Transform.quat.copy(this.rotation);
		Transform.quat.normalize();
		Transform.vec3.applyQuaternion(Transform.quat);
		Transform.vec3.multiplyScalar(amount);
		this.position.add(Transform.vec3);
	}

	translateX(amount: number): void
	{
		this.translateOnAxis(Transform.xAxis, amount);
	}

	translateY(amount: number): void
	{
		this.translateOnAxis(Transform.yAxis, amount);
	}

	translateZ(amount: number): void
	{
		this.translateOnAxis(Transform.zAxis, amount);
	}

	setPosition(x: number, y: number, z: number): this
	{
		this.position.set(x, y, z);
		return this;
	}

	setPositionScalar(s: number): this
	{
		this.position.set(s, s, s);
		return this;
	}

	setRotation(x: number, y: number, z: number, w: number): this
	{
		this.rotation.set(x, y, z, w);
		return this;
	}

	setScale(x: number, y: number, z: number): this
	{
		this.scale.set(x, y, z);
		return this;
	}

	setScaleScalar(s: number): this
	{
		this.scale.set(s, s, s);
		return this;
	}

	clone(): Transform
	{
		const t = new Transform();
		this.copy(t);
		return t;
	}

	copy(source: Transform): Transform
	{
		this.position.copy(source.position);
		this.rotation.copy(source.rotation);
		this.scale.copy(source.scale);
		this.matrix.copy(source.matrix);
		this.worldMatrix.copy(source.worldMatrix);
		return this;
	}
}
