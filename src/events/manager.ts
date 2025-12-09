import { AutoMap } from "../lib/automap.ts";
import type { EventType } from "./create.ts";

/**
 * Simple typed event bus.
 */
export class EventManager 
{
	register<T extends EventType<any>>(
		type: T,
		listener: (value: T extends EventType<infer U> ? U : never) => void,
	): VoidFunction 
	{
		this.listeners.get(type).add(listener);
		return () => this.unregister(type, listener);
	}

	unregister<T extends EventType<any>>(
		type: T,
		listener: Function,
	): void 
	{
		this.listeners.get(type).delete(listener);
	}

	notify<T extends EventType<undefined>>(event: T): void;
	notify<T extends EventType<any>>(
		event: T,
		data: T extends EventType<infer U> ? U : never,
	): void;
	notify<T extends EventType<any>>(
		event: T,
		data?: T extends EventType<infer U> ? U : never,
	): void 
	{
		let listeners = this.listeners.get(event);
		for (const listener of listeners) 
		{
			listener(data);
		}
	}

	clear = () => this.listeners.clear();

	protected listeners = new AutoMap<EventType<any>, Set<Function>>(
		() => new Set(),
	);

	constructor() 
	{
		this.register = this.register.bind(this);
		this.unregister = this.unregister.bind(this);
		this.notify = this.notify.bind(this);
		this.clear = this.clear.bind(this);
	}
}
