/**
 * Map that accepts a factory function to auto-initialize
 * values upon access to non-initalized keys.
 */
export class AutoMap<K, V> extends Map<K, V>
{
	constructor(protected factory: () => V)
	{
		super();
	}

	/**
	 * Get the associated value from key, creating a new
	 * item from the factory if it does not exist.
	 * @param key
	 */
	override get(key: K): V
	{
		if (!super.has(key))
		{
			this.set(key, this.factory());
		}
		return super.get(key)!;
	}
}
