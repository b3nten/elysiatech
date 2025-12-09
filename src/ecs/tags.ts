import { AutoMap } from "../lib/automap";
import { isConstructor } from "../lib/checks";
import { constructorOf } from "../lib/functions";
import { SparseSet } from "../lib/sparseset";
import type { ConstructorOf } from "../lib/types";
import type { Component } from "./component";
import type { EntityID } from "./entity";

/**
 * Tags are used to group components of different types.
 * They can be assigned to the static property `ecsTags` on a component class.
 * Either as a single tag or array of tags.
 */
export type Tag = symbol;

/**
 * Get the tags associated with a component or component constructor.
 * @param component
 * @returns An array of tags.
 */
export function tagsOf(component: Component | ConstructorOf<Component>): Tag | Array<Tag> | undefined
{
	const ctor = isConstructor(component) ? component : constructorOf(component);
	if (!("ecsTags" in ctor))
	{
		return;
	}
	return (ctor as any).ecsTags;
}

export class TagSet
{
	set: AutoMap<ConstructorOf<Component>, SparseSet<Component>> = new AutoMap(
		() => new SparseSet(),
	);

	add = (entity: EntityID, component: Component) =>
		void this.set.get(constructorOf(component)).add(entity, component);

	remove = (entity: EntityID, componentConstructor: ConstructorOf<Component>) =>
		void this.set.get(componentConstructor).remove(entity);

	get = (entity: EntityID, componentConstructor: ConstructorOf<Component>) =>
		this.set.get(componentConstructor).get(entity);

	/**
	 * Iterate through all components
	 */
	*[Symbol.iterator](): Iterator<[entity: EntityID, component: Component]>
	{
		for (let ss of this.set.values())
		{
			for (let value of ss)
			{
				yield value as [entity: EntityID, component: Component];
			}
		}
	}

	/**
	 * Iterate through all components attached to entity
	 */
	// todo: optimize data structures for this usecase
	*componentIterator(entity: EntityID): Iterator<Component>
	{
		let val: Component | undefined;
		for (let ss of this.set.values())
		{
			if ((val = ss.get(entity)))
			{
				yield val;
			}
		}
	}
}
