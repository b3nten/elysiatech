import { EventManager } from "../events/manager";
import { AutoMap } from "../lib/automap";
import { isConstructor } from "../lib/checks";
import { constructorOf, make } from "../lib/functions";
import { logger, warnOnce } from "../lib/logging";
import { SparseSet } from "../lib/sparseset";
import type { ConstructorOf, InstanceOf } from "../lib/types";
import type { Component } from "./component";
import { entityDoesNotExistError, type EntityID } from "./entity";
import type { Prefab } from "./prefab";
import { Relationship } from "./relationship";
import type { System } from "./system";
import { TagSet, tagsOf, type Tag } from "./tags";

export class World
{
	/** The number of entities in the world. */
	get entityCount() { return this.#entities.size; }

	/**
	 * Add a system instance to the world.
	 * @param system - the System constructor
	 * @param args - the arguments to pass to the System constructor
	 */
	addSystem = <Args extends any[], T extends System>(system: ConstructorOf<System, Args>, ...args: Args) =>
	{
		const prev = globalThis.ELYSIA_CURRENT_WORLD
		globalThis.ELYSIA_CURRENT_WORLD = this;
		let instance = make(system, ...args);
		globalThis.ELYSIA_CURRENT_WORLD = prev;
		this.#systems.add(instance);
		this.#systemsIndexedByType.set(system, instance);
		if (this.#active) { instance.__runStartup?.(); }
	};

	/**
	 * Get a system instance by its constructor, or null if not found.
	 * @param system - constructor of desired system instance
	 * @returns system or null if not found
	 */
	getSystem = <T extends ConstructorOf<System>>(system: T): InstanceType<T> | null =>
	{
		if (this.#systemsIndexedByType.has(system))
		{
			return this.#systemsIndexedByType.get(system) as InstanceType<T>;
		}
		for (const registeredSystem of this.#systems)
		{
			if (registeredSystem instanceof system)
			{
				return registeredSystem as InstanceType<T>;
			}
		}
		return null;
	};

	/**
	 * Remove a system instance from the world.
	 * @param system - constructor of desired system instance
	 */
	removeSystem = <T extends ConstructorOf<System>>(system: T): InstanceType<T> | null =>
	{
		if (this.#systemsIndexedByType.has(system))
		{
			const instance = this.#systemsIndexedByType.get(system);
			if (instance)
			{
				this.#systems.delete(instance);
				this.#systemsIndexedByType.delete(system);
				instance.shutdown?.();
				return instance as InstanceType<T>;
			}
		}
		return null;
	};

	/**
	 * Startup all systems in the world.
	 */
	startup = () =>
	{
		if (this.#active)
		{
			logger.error("Attempted to startup a world that has already been started. This is a noop.");
			return;
		}
		this.#active = true;
		const prev = globalThis.ELYSIA_CURRENT_WORLD;
		globalThis.ELYSIA_CURRENT_WORLD = this;
		for (const system of this.#systems) { system.__runStartup?.(); }
		globalThis.ELYSIA_CURRENT_WORLD = prev;
	};

	/**
	 * Update all systems in the world.
	 * @param frametime - The time elapsed since the last update.
	 */
	update = (frametime: number) =>
	{
		if (!this.#active)
		{
			logger.error("Attempted to update a world that has not been started. This is a noop.");
			return;
		}
		const prev = globalThis.ELYSIA_CURRENT_WORLD;
		globalThis.ELYSIA_CURRENT_WORLD = this;
		for (const system of this.#systems) { system.__runUpdate?.(frametime); }
		globalThis.ELYSIA_CURRENT_WORLD = prev;
	};

	/**
	 * Shutdown all systems in the world.
	 */
	shutdown = () =>
	{
		if (!this.#active)
		{
			logger.error("Attempted to shutdown a world that has not been started. This is a noop.");
			return;
		}
		this.#active = false;
		const prev = globalThis.ELYSIA_CURRENT_WORLD;
		globalThis.ELYSIA_CURRENT_WORLD = this;
		for (const system of this.#systems) { system.__runShutdown?.(); }
		globalThis.ELYSIA_CURRENT_WORLD = prev;
	};

	/**
	 * Create a new entity in the world.
	 * @returns The ID of the newly created entity.
	 */
	createEntity = (): EntityID =>
	{
		const entity = <EntityID>this.#nextEntityId++;
		this.#entities.add(entity);
		for (const callback of this.#onEntityCreatedCallbacks)
		{
			callback(this, entity);
		}
		return entity;
	};

	/**
	 * Create an entity with components.
	 * @param components Components to be added to the entity.
	 */
	createEntityWith = (...components: Array<Component>) =>
	{
		let entity = this.createEntity();
		for (let c of components) { this.addComponent(entity, c); }
		return entity;
	};

	/**
	 * Remove an entity from the world, recursively removing child entities.
	 * @param entity - The ID of the entity to remove.
	 * @returns void on success, Error otherwise
	 */
	removeEntity = (entity: EntityID): undefined | Error =>
	{
		if (!this.entityExists(entity))
		{
			logger.error(entityDoesNotExistError);
			return entityDoesNotExistError;
		}
		let relationship = this.getComponent(entity, Relationship);
		if (relationship)
		{
			// unparent from parent
			if (relationship.parent)
			{
				this.unparent(relationship.parent, entity);
			}
			// recursively remove child entities
			for (let childEntity of relationship?.children)
			{
				this.removeEntity(childEntity);
			}
		}
		// callbacks
		for (const callback of this.#onEntityRemovedCallbacks)
		{
			callback(this, entity);
		}
		// remove each component
		for (const componentConstructor of this.#componentMap.keys())
		{
			this.removeComponent(entity, componentConstructor);
		}
		this.#entities.delete(entity);
	};

	/** Checks if {@link EntityID} exists in the world */
	entityExists = (entity: EntityID) => this.#entities.has(entity);

	/**
	 * Add a component to an entity.
	 * If a component already exists of the same type, it will be removed.
	 * @param entity - The ID of the entity to add the component to.
	 * @param component - The component to add.
	 * @returns void on success, Error otherwise
	 */
	addComponent = (entity: EntityID, component: Component | ConstructorOf<Component>): undefined | Error =>
	{
		// invalid entity
		if (!this.entityExists(entity))
		{
			logger.error(entityDoesNotExistError);
			return entityDoesNotExistError;
		}

		if (isConstructor(component))
		{
			component = make(component) as Component;
		}

		// remove same component if exists
		if (this.hasComponent(entity, constructorOf(component)))
		{
			this.removeComponent(entity, constructorOf(component));
		}

		// add to component map
		this.#componentMap
			.get(constructorOf(component))
			.add(entity, component);

		// run callbacks for component
		for (const callback of this.#onComponentAddedCallbacks.get(
			constructorOf(component),
		))
		{
			callback(this, entity, component);
		}

		// handle tags
		let tags = tagsOf(component);
		if (tags)
		{
			if (Array.isArray(tags))
			{
				for (const t of tags)
				{
					// add to tagmap
					this.#tagSet.get(t).add(entity, component);
					// call callbacks
					for (const callback of this.#onComponentWithTagAddedCallbacks.get(t))
					{
						callback(this, entity, component);
					}
				}
			}
			else
			{
				// add to tagmap
				this.#tagSet.get(tags).add(entity, component);
				// call callbacks
				for (const callback of this.#onComponentWithTagAddedCallbacks.get(tags))
				{
					callback(this, entity, component);
				}
			}
		}
	};

	/** Add a singleton component to the world. */
	addSingletonComponent = (component: Component | ConstructorOf<Component>): undefined | Error =>
		this.addComponent(0 as EntityID, component);

	addSingletonComponents = (...components: Component[]): undefined | Error =>
		this.addComponents(0 as EntityID, ...components);

	/** Add multiple components to an entity.
	 * If a component already exists of the same type, it will be removed.
	 * @param entity - The ID of the entity to add the components to.
	 * @param components - The components to add.
	 * @returns void on success, Error otherwise
	 */
	addComponents = (entity: EntityID, ...components: Component[]): undefined | Error =>
	{
		for (let component of components)
		{
			let err = this.addComponent(entity, component);
			if (err) return err;
		}
	};

	/**
	 * Add a prefab to the world.
	 * @param prefab {@link Prefab}
	 * @returns
	 */
	addPrefab = (prefab: Prefab) => prefab(this);

	/**
	 * Add multiple prefabs to the world.
	 * @param prefabs
	 */
	addPrefabs = (...prefabs: Prefab[]) =>
	{
		for (let prefab of prefabs)
		{
			prefab(this);
		}
	};

	/**
	 * Get a component on an Entity.
	 * @param entity - The ID of the entity to get the component from.
	 * @param componentConstructor - The component to get.
	 * @returns The component, or null if it doesn't exist.
	 */
	getComponent = <T extends Component>(entity: EntityID, componentConstructor: ConstructorOf<T>): T | null =>
		(<T>this.#componentMap.get(componentConstructor).get(entity) ?? null);

	/** Get a singleton component from the world, if it exists. */
	getSingletonComponent = <T extends Component>(componentConstructor: ConstructorOf<T>): T | null =>
		this.getComponent(0 as EntityID, componentConstructor);

	/**
	 * Get a component instance from the world, if it exists.
	 * Useful for components that should only have one instance in the world.
	 * @param componentConstructor
	 * @returns
	 */
	getOneComponent = <T extends Component>(componentConstructor: ConstructorOf<T>): T | null =>
	{
		{
			let size = this.#componentMap.get(componentConstructor).size;
			if (size > 1)
			{
				warnOnce(`resolveComponent(${componentConstructor.name}) found ${size} instances. Is this component meant to exist multiple times in the world?`);
			}
		}
		return (
			<T>this.#componentMap.get(componentConstructor).first ?? null
		);
	}

	/**
	 * Remove a component from an entity.
	 * @param entity - The ID of the entity to remove the component from.
	 * @param componentConstructor - The component to remove.
	 * @returns void on success, Error otherwise
	 */
	removeComponent = (entity: EntityID, componentConstructor: ConstructorOf<Component>): undefined | Error =>
	{
		// invalid entity
		if (!this.entityExists(entity))
		{
			logger.error(entityDoesNotExistError);
			return entityDoesNotExistError;
		}

		// component not on entity
		// benton: might consider returning an error here
		if (!this.hasComponent(entity, componentConstructor))
		{
			return;
		}

		const removedComponent = this.getComponent(entity, componentConstructor)!;

		// remove from component map
		this.#componentMap.get(componentConstructor).remove(entity);

		// run callbacks
		for (const callback of this.#onComponentRemovedCallbacks.get(
			componentConstructor,
		))
		{
			callback(this, entity, componentConstructor);
		}

		// handle tags
		let tags = tagsOf(componentConstructor);
		if (tags)
		{
			if (Array.isArray(tags))
			{
				for (const t of tags)
				{
					// remove
					this.#tagSet.get(t).remove(entity, componentConstructor);
					// callbacks
					for (const callback of this.#onComponentWithTagRemovedCallbacks.get(t))
					{
						callback(this, entity, componentConstructor);
					}
				}
			}
			else
			{
				// remove
				this.#tagSet.get(tags).remove(entity, componentConstructor);
				// callbacks
				for (const callback of this.#onComponentWithTagRemovedCallbacks.get(tags))
				{
					callback(this, entity, componentConstructor);
				}
			}
		}
	};

	/** Remove a singleton component from the world. */
	removeSingletonComponent = (componentConstructor: ConstructorOf<Component>): undefined | Error =>
		this.removeComponent(0 as EntityID, componentConstructor);

	/**
	 * Check if an entity has a component.
	 * @param entity - The ID of the entity to check.
	 * @param component - The component to check for.
	 * @returns True if the entity has the component, false otherwise.
	 */
	hasComponent = (entity: EntityID, component: ConstructorOf<Component>): boolean =>
		this.#componentMap.get(component).has(entity);

	/**
	 * Creates an iterator that yields entities with the specified components.
	 *
	 * The returned touple is reused between iterations, either destructure or shallow copy it.
	 * @param components - Component constructors
	 * @returns An iterator that yields entities with the specified components.
	 * @example
	 * for (const [entity, position, velocity] of world.componentIter(Position, Velocity)) {
	 *   // ...
	 * }
	 */
	*componentIterator<T extends readonly ConstructorOf<Component>[]>(...components: T): IterableIterator<[entity: EntityID, ...components: MapToInstances<T>]>
	{
		if (components.length === 0) return;
		// find smallest
		let smallest = this.#componentMap.get(components[0]);
		for (let i = 1; i < components.length; i++)
		{
			const set = this.#componentMap.get(components[i]);
			if (set.size === 0) return;
			if (set.size < smallest.size)
			{
				smallest = set;
			}
		}

		// prevent leaking a previous iterator result with extra components
		this.#sharedComponentIterResult.length = smallest.size;

		outer: for (const [entity] of smallest)
		{
			this.#sharedComponentIterResult[0] = entity;
			for (let i = 0; i < components.length; i++)
			{
				this.#sharedComponentIterResult[i + 1] = this.#componentMap
					.get(components[i])
					.get(entity);
				// move on if component is missing
				if (!this.#sharedComponentIterResult[i + 1]) continue outer;
			}
			yield this.#sharedComponentIterResult as any;
		}
	}

	/**
	 * Creates an iterator that yields entities and components with the specified tags.
	 *
	 * The returned touple is reused between iterations, either destructure or shallow copy it.
	 * @param components - Component constructors
	 * @returns An iterator that yields entities with the specified components.
	 * @example
	 * for (const [entity, position, velocity] of world.componentIter(Position, Velocity)) {
	 *   // ...
	 * }
	 */
	tagIterator = (tag: Tag): Iterable<[entity: EntityID, component: Component]> =>
	{
		// casting as iterator returns number for EntityID
		return <Iterable<[entity: EntityID, component: Component]>>(
			this.#tagSet.get(tag)
		);
	}

	/**
	 * Iterate all components of an entity with the provided tag.
	 * @param entity - the entity to iterate over tagged components
	 * @param tag - the tag to iterate over
	 */
	componentTagIterator = (entity: EntityID, tag: Tag) =>
	{
		return <IterableIterator<Component>>(
			this.#tagSet.get(tag).componentIterator(entity)
		);
	};

	/**
	 * Parent a child entity to a parent entity.
	 * @param parent - the parent {@link EntityID}
	 * @param child - the child {@link EntityID}
	 */
	parent = (parent: EntityID, child: EntityID) => Relationship.Parent(this, parent, child);

	/**
	 * Unparent a child entity from a parent entity.
	 * @param parent - the parent {@link EntityID}
	 * @param child - the child {@link EntityID}
	 */
	unparent = (parent: EntityID, child: EntityID) => Relationship.Unparent(this, parent, child);

	/**
	 * Register a callback to run when entities are created.
	 * @param callback - called when an entity is created
	 * @returns a function that removes the callback
	 */
	onEntityCreated = (callback: (world: World, entity: EntityID) => void) =>
	{
		this.#onEntityCreatedCallbacks.add(callback);
		return () =>
		{
			this.#onEntityCreatedCallbacks.delete(callback);
		};
	};

	/**
	 * Register a callback to run when entities are removed.
	 * @param callback - called when an entity is removed
	 * @returns a function that removes the callback
	 */
	onEntityRemoved = (callback: (world: World, entity: EntityID) => void) =>
	{
		this.#onEntityRemovedCallbacks.add(callback);
		return () =>
		{
			this.#onEntityRemovedCallbacks.delete(callback);
		};
	};

	/**
	 * Register a callback to run when components are added to entities.
	 * @returns a function that removes the callback
	 */
	onComponentAdded = <T extends Component>(component: ConstructorOf<T>, callback: (world: World, entity: EntityID, component: T) => void) =>
	{
		this.#onComponentAddedCallbacks.get(component).add(callback);
		return () =>
		{
			this.#onComponentAddedCallbacks.get(component).delete(callback);
		};
	};

	/**
	 * Register a callback to run when components are removed from entities.
	 * @returns a function that removes the callback
	 */
	onComponentRemoved = <T extends Component>(component: ConstructorOf<T>, callback: (world: World, entity: EntityID, component: T) => void) =>
	{
		this.#onComponentRemovedCallbacks.get(component).add(callback);
		return () =>
		{
			this.#onComponentRemovedCallbacks.get(component).delete(callback);
		};
	};

	/**
	 * Register a callback to run when components with a specific tag are added to entities.
	 * @returns a function that removes the callback
	 */
	onComponentWithTagAdded = (tag: Tag, callback: (world: World, entity: EntityID, component: Component) => void) =>
	{
		this.#onComponentWithTagAddedCallbacks.get(tag).add(callback);
		return () =>
		{
			this.#onComponentWithTagAddedCallbacks.get(tag).delete(callback);
		};
	};

	/**
	 * Register a callback to run when components with a specific tag are removed from entities.
	 * @returns a function that removes the callback
	 */
	onComponentWithTagRemoved = (tag: Tag, callback: (world: World, entity: EntityID, component: Component) => void) =>
	{
		this.#onComponentWithTagRemovedCallbacks.get(tag).add(callback);
		return () =>
		{
			this.#onComponentWithTagRemovedCallbacks.get(tag).delete(callback);
		};
	};

	#events = new EventManager();

	sendEvent = this.#events.notify;

	receiveEvent = this.#events.register;

	#active = false;

	#systems: Set<InstanceOf<typeof System>> = new Set();

	#systemsIndexedByType: Map<ConstructorOf<System>, InstanceOf<typeof System>> = new Map();

	#nextEntityId = 0;

	#entities: Set<EntityID> = new Set();

	#componentMap: AutoMap<ConstructorOf<Component>, SparseSet<Component>> = new AutoMap(() => new SparseSet());

	#tagSet: AutoMap<Tag, TagSet> = new AutoMap(() => new TagSet());

	#sharedComponentIterResult: any[] = [];

	#onEntityCreatedCallbacks: Set<(world: World, entity: EntityID) => void> = new Set();

	#onEntityRemovedCallbacks: Set<(world: World, entity: EntityID) => void> = new Set();

	#onComponentAddedCallbacks: AutoMap<
		ConstructorOf<Component>,
		Set<(world: World, entity: EntityID, component: any) => void>
	> = new AutoMap(() => new Set());

	#onComponentRemovedCallbacks: AutoMap<
		ConstructorOf<Component>,
		Set<(world: World, entity: EntityID, component: any) => void>
	> = new AutoMap(() => new Set());

	#onComponentWithTagAddedCallbacks: AutoMap<
		Tag,
		Set<(world: World, entity: EntityID, component: any) => void>
	> = new AutoMap(() => new Set());

	#onComponentWithTagRemovedCallbacks: AutoMap<
		Tag,
		Set<(world: World, entity: EntityID, component: any) => void>
	> = new AutoMap(() => new Set());

	constructor() 
	{
		this.createEntity()
		this.componentIterator = this.componentIterator.bind(this)
	}
}

declare global {
	var ELYSIA_CURRENT_WORLD: World | undefined;
}

type MapToInstances<T extends readonly ConstructorOf<Component>[]> = {
	[K in keyof T]: T[K] extends ConstructorOf<infer U> ? U : never;
};
