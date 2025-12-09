import { logger } from "../lib/mod";
import type { Component } from "./component";
import { entityDoesNotExistError, type EntityID } from "./entity";
import type { World } from "./world";

export class Relationship implements Component
{
	/**
	 * Parent a child entity to a parent entity.
	 * @param world - the {@link World} with the parent and child entities
	 * @param parent - the parent {@link EntityID}
	 * @param child - the child {@link EntityID}
	 * @returns void on success, Error otherwise
	 */
	static Parent(
		world: World,
		parent: EntityID,
		child: EntityID,
	): undefined | Error
	{
		if (!world.entityExists(parent) || !world.entityExists(child))
		{
			logger.error("Cannot parent: entity does not exist");
			return entityDoesNotExistError;
		}
		let parentRelationship = world.getComponent(parent, Relationship);
		if (!parentRelationship)
		{
			parentRelationship = new Relationship();
			world.addComponent(parent, parentRelationship);
		}
		else
		{
			// check for circular relationships
			let currentParent: EntityID | null = parent;
			while (currentParent)
			{
				if (currentParent === child)
				{
					logger.error(
						"Detected a circular relationship while parenting",
					);
					return circularRelationshipError;
				}
				const currentRelationship: Relationship | null = world.getComponent(
					currentParent,
					Relationship,
				);
				currentParent = currentRelationship?._parent ?? null;
			}
		}

		let childRelationship = world.getComponent(child, Relationship);
		if (!childRelationship)
		{
			childRelationship = new Relationship();
			world.addComponent(child, childRelationship);
		}

		let oldParent = childRelationship._parent;
		if (oldParent)
		{
			Relationship.Unparent(world, oldParent, child);
		}

		parentRelationship._children ??= new Set<EntityID>();
		parentRelationship._children.add(child);
		childRelationship._parent = parent;
	}

	/**
	 * Unparent a child entity from a parent entity.
	 * @param world - the {@link World} with the parent and child entities
	 * @param parent - the parent {@link EntityID}
	 * @param child - the child {@link EntityID}
	 * @returns void on success, Error otherwise
	 */
	static Unparent(
		world: World,
		parent: EntityID,
		child: EntityID,
	): undefined | Error
	{
		if (!world.entityExists(parent) || !world.entityExists(child))
		{
			logger.error("Cannot parent: entity does not exist");
			return entityDoesNotExistError;
		}
		let childRelationship = world.getComponent(child, Relationship);
		if (!childRelationship)
		{
			return;
		}
		let parentRelationship = world.getComponent(parent, Relationship);
		if (!parentRelationship)
		{
			return;
		}
		if (childRelationship.parent === parent)
		{
			childRelationship._parent = null;
		}
		parentRelationship._children?.delete(child);
	}

	/** Get the parent {@link EntityID} */
	get parent(): EntityID | null
	{
		return this._parent;
	}

	/** Get a readonly Set with {@link EntityID}s of child entities */
	get children(): ChildSet
	{
		return this._children ?? <ChildSet>EMPTY_SET;
	}

	protected _parent: EntityID | null = null;
	protected _children?: Set<EntityID>;
}

type ChildSet = Omit<Set<EntityID>, "add" | "delete" | "clear">;

const EMPTY_SET: Set<any> = new Set();

export class CircularRelationshipError extends Error
{
	constructor() { super("Circular relationship detected"); }
}

export const circularRelationshipError = new CircularRelationshipError();
