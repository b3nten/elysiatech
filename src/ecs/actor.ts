import type { Component } from "./component";
import type { EntityID } from "./entity";
import { System } from "./system";
import type { World } from "./world";

/**
 * Components with this tag can contain {@link System} lifecycle methods, which
 * are ticked by the lifecycle system.
 */
export const participatesInLifecycleTag = Symbol("ParticipatesInLifecycle");

export interface IActor
{
	/**
	 * Called when the world starts up or when this component is added to an entity in a running world.
	 */
	startup?(thisEntity: EntityID, world: World): void;

	/**
	 * Called each frame.
	 */
	update?(delta: number, thisEntity: EntityID, world: World): void;

	/**
	 * Called when the component is removed from an entity or when the world is shutting down.
	 */
	shutdown?(thisEntity: EntityID, world: World): void;
}

/**
 * Base class for components that participate in the world lifecycle.
 */
export class ActorComponent implements Component, IActor
{
	static get ecsTags()
	{
		return [participatesInLifecycleTag];
	}

	static create(actor: IActor)
	{
		return new (class extends ActorComponent
		{
			startup(thisEntity: EntityID, world: World)
			{
				actor.startup?.(thisEntity, world);
			}
			update(delta: number, thisEntity: EntityID, world: World)
			{
				actor.update?.(delta, thisEntity, world);
			}
			shutdown(thisEntity: EntityID, world: World)
			{
				actor.shutdown?.(thisEntity, world);
			}
		})();
	}

	/**
	 * Called when the world starts up or when this component is added to an entity in a running world.
	 */
	startup?(thisEntity: EntityID, world: World): void;

	/**
	 * Called each frame.
	 */
	update?(delta: number, thisEntity: EntityID, world: World): void;

	/**
	 * Called when the component is removed from an entity or when the world is shutting down.
	 */
	shutdown?(thisEntity: EntityID, world: World): void;
}

/**
 * System that ticks {@link ActorComponent}s.
 */
export class ActorSystem extends System
{
	startup()
	{
		for (const [entity, actor] of this.world.tagIterator(participatesInLifecycleTag))
		{
			(<ActorComponent>actor).startup?.(entity, this.world);
		}

		this.whenShutdown(
			this.world.onComponentWithTagAdded(participatesInLifecycleTag, (world, entity, actor) =>
			{
				(<ActorComponent>actor).startup?.(entity, world);
			})
		);

		this.whenShutdown(
			this.world.onComponentWithTagRemoved(participatesInLifecycleTag, (world, entity, actor) =>
			{
				(<ActorComponent>actor).shutdown?.(entity, world);
			})
		);
	}

	update(frametime: number): void
	{
		for (const [entity, actor] of this.world.tagIterator(participatesInLifecycleTag))
		{
			(<ActorComponent>actor).update?.(frametime, entity, this.world);
		}
	}

	shutdown()
	{
		for (const [entity, actor] of this.world.tagIterator(participatesInLifecycleTag))
		{
			(<ActorComponent>actor).shutdown?.(entity, this.world);
		}
	}
}
