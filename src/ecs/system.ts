import { assert } from "../lib/asserts";
import { isFunction } from "../lib/checks";
import type { World } from "./world";

/**
 * ECS Systems contain the logic for the world. They can create and remove entities,
 * query for entities with a specific type or types of Components, add and remove Components,
 * and run logic on the entities.
 */
export abstract class System
{
	/** The world this system is attached to. */
	readonly world: World = globalThis.ELYSIA_CURRENT_WORLD!;

	get active() { return this.#active; }

	/** Called when the system begins it's lifecycle in the world. */
	startup?(): void;

	/** Called when the world updates. */
	update?(frametime: number): void;

	/** Called when the system is removed from a world, or the world shuts down. */
	shutdown?(): void;

	sendEvent = this.world.sendEvent;

	receiveEvent = this.world.receiveEvent;

	constructor()
	{
		assert(!!this.world, "Constructing systems manually is not allowed.");
	}

	/**
	 * Queue callbacks to run when system starts up.
	 * Unlike whenShutdown, these callbacks are called every time the system is started.
	 * You can return a function to be called when the system is stopped (same as whenShutdown).
	 */
	whenStarted = (...callbacks: Array<(system: System) => VoidFunction | undefined | void>): void =>
	{
		for (let c of callbacks)
		{
			this.#startedCallbacks.add(c);
			if (this.#active)
			{
				const maybeShutdownCallback = c(this);
				if (isFunction(maybeShutdownCallback)) { this.#shutdownCallbacks.add(maybeShutdownCallback); }
			}
		}
	};

	/**
	 * Queue callbacks to run when system shuts down.
	 * Callbacks only run once. If the system is restarted, they will need to be added again.
	 * Prefer binding callbacks in startup() instead of the constructor.
	 */
	whenShutdown = (...callbacks: Array<Function>): void =>
	{
		for (let c of callbacks) { this.#shutdownCallbacks.add(c); }
	};

	#active = false;

	#startedCallbacks: Set<
		(system: System) => VoidFunction | undefined | void
	> = new Set();

	#shutdownCallbacks: Set<Function> = new Set();

	/* @internal */
	__runStartup()
	{
		assert(!this.#active, "System already active")
		this.#active = true;
		{
			this.startup?.();
			for (let c of this.#startedCallbacks)
			{
				const maybeShutdownCallback = c(this);
				if (isFunction(maybeShutdownCallback))
				{
					this.#shutdownCallbacks.add(maybeShutdownCallback);
				}
			}
		}
	}

	/* @internal */
	__runShutdown()
	{
		assert(this.#active, "System already inactive");
		this.#active = false;
		this.#shutdownCallbacks.forEach((callback) =>
		{
			callback()
		});
		this.#shutdownCallbacks.clear();
		this.shutdown?.();
	}

	/* @internal */
	__runUpdate(frametime: number)
	{
		assert(this.#active, "System updated but is inactive.");
		this.update?.(frametime);
	}
}
