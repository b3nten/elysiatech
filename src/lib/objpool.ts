interface ObjectPoolOptions<T> {
	/** Initial size of the pool */
	initialSize: number;
	/** Factory function to create new objects */
	createObject: (index: number) => T;
	/** Optional function to reset objects when they are created and freed */
	resetObject?: (object: T) => void;
	/** Optional function to determine how many objects to add when the pool grows */
	growthStrategy?: (currentSize: number) => number;
}

/**
 * A pool of reusable objects to minimize allocations.
 * The pool will automatically grow when needed.
 * @typeParam T The type of objects in the pool.
 * @param options Configuration options for the pool.
 * - initialSize: The initial number of objects in the pool.
 * - createObject: A factory function to create new objects.
 * - resetObject: An optional function to reset objects when they are freed. Also called on initial creation.
 * - growthStrategy: An optional function to determine how many objects to add when the pool grows.
 */
export class ObjectPool<T>
{
	constructor(options: ObjectPoolOptions<T>)
	{
		this.alloc = this.alloc.bind(this);
		this.free = this.free.bind(this);
		this.freeAll = this.freeAll.bind(this);

		if (options.growthStrategy)
		{
			this.growthStrategy = options.growthStrategy;
		}
		this.createObject = options.createObject;
		this.resetObject = options.resetObject;

		for (let index = 0; index < options.initialSize; index++)
		{
			const object = this.createObject(index);
			this.resetObject?.(object);
			this.inactive.push(object);
		}
	}

	/** Allocate an object from the pool */
	alloc()
	{
		let object = this.inactive.pop();
		// No more objects in the pool
		if (!object)
		{
			const currentSize = this.size;
			const growthAmount = this.growthStrategy(currentSize);
			for (let index = 0; index < growthAmount; index++)
			{
				const newObject = this.createObject(currentSize + index);
				this.resetObject?.(newObject);
				this.inactive.push(newObject);
			}
			object = this.inactive.pop()!;
		}
		this.active.add(object);
		return object;
	}

	/** Release an object back into the pool */
	free(object: T)
	{
		if (this.active.has(object))
		{
			this.active.delete(object);
			this.inactive.push(object);
			this.resetObject?.(object);
		}
	}

	/** Release all active objects back into the pool */
	freeAll()
	{
		for (const activeObject of this.active)
		{
			this.inactive.push(activeObject);
			this.resetObject?.(activeObject);
		}
		this.active.clear();
	}

	/** Total number of objects managed by the pool */
	get size()
	{
		return this.inactive.length + this.active.size;
	}

	/** Number of active objects */
	get sizeOfActive()
	{
		return this.active.size;
	}

	/** Number of inactive objects */
	get sizeOfReserve()
	{
		return this.inactive.length;
	}

	protected inactive: T[] = [];
	protected active = new Set<T>();
	protected createObject: (index: number) => T;
	protected resetObject?: (object: T) => void;
	protected growthStrategy: (currentSize: number) => number = (it) => it * 2;
}
