/**
 * A sparse set that stores components of type T.
 * @typeParam T The type of the components to store.
 */
export class SparseSet<T>
{
	/**
	 * The number of entities in the set.
	 */
	get size(): number
	{
		return this.dense.length;
	}

	/**
	 * The first component in the set.
	 */
	get first(): T | undefined
	{
		if (this.size === 0) return undefined;
		return this.components[0];
	}

	/**
	 * Add an entity and its component to the set.
	 */
	add(entity: number, component: T): boolean
	{
		if (this.has(entity)) return false;
		const index = this.dense.length;
		this.dense.push(entity);
		this.sparse[entity] = index;
		this.components[index] = component;
		return true;
	}

	/**
	 * Remove an entity and it's component from the set.
	 */
	remove(entity: number)
	{
		if (!this.has(entity)) return;

		const indexToRemove = this.sparse[entity];
		const lastIndex = this.dense.length - 1;

		// If the entity to remove is not the last element, we swap it with the last element.
		if (indexToRemove !== lastIndex)
		{
			const lastEntity = this.dense[lastIndex];
			this.dense[indexToRemove] = lastEntity;
			this.components[indexToRemove] = this.components[lastIndex];
			this.sparse[lastEntity] = indexToRemove;
		}

		// Remove the last element.
		this.dense.pop();
		this.components.pop();
		delete this.sparse[entity];

		// If the set is empty, we should also clear the sparse array.
		if (this.dense.length === 0)
		{
			this.sparse = [];
		}
	}

	/**
	 * Get the component of an entity.
	 */
	get(entity: number): T | undefined
	{
		if (!this.has(entity)) return undefined;
		return this.components[this.sparse[entity]];
	}

	/**
	 * Check if an entity is in the set.
	 */
	has(entity: number): boolean
	{
		return this.sparse[entity] !== undefined;
	}

	/**
	 * Clear the set.
	 */
	clear()
	{
		this.dense.length = 0;
		this.components.length = 0;
		this.sparse = [];
	}

	/**
	 * Iterate over the set, returning a tuple [entity, component]
	 */
	*[Symbol.iterator](): Iterator<[entity: number, component: T]>
	{
		for (let i = 0; i < this.dense.length; i++)
		{
			yield [this.dense[i], this.components[i]];
		}
	}

	private sparse: number[] = [];
	private dense: number[] = [];
	private components: T[] = [];
}
