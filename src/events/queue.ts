import { AutoMap } from "../lib/mod";
import type { EventType } from "./create";

/** Double buffered event queue that supports read-after-dispatching. */
export class EventQueue
{
	/**
	 * Push an event to the queue.
	 * @param event
	 */
	push<T extends EventType<undefined>>(event: T): void;
	push<T extends EventType<any>>(
		event: T,
		data: T extends EventType<infer U> ? U : never,
	): void;
	push<T extends EventType<any>>(
		event: T,
		data?: T extends EventType<infer U> ? U : never,
	): void
	{
		if (this.hasFlushed)
		{
			this.nextQueue.push(event, data);
			return;
		}
		this.queue.push(event, data);
	}

	/**
	 * Dispatch all events in the queue.
	 * Does *not* clear the queue.
	 */
	dispatchQueue()
	{
		this.hasFlushed = true;
		for (let i = 0; i < this.queue.length; i += 2)
		{
			let event = this.queue[i];
			let payload = this.queue[i + 1];
			let listeners = this.listeners.get(event);
			for (const listener of listeners)
			{
				listener(payload);
			}
		}
	}

	/**
	 * Dispatch all events in the queue and clear it.
	 */
	dispatchAndClear()
	{
		this.dispatchQueue();
		this.clear();
	}

	/**
	 * Clear the queue.
	 */
	clear()
	{
		const temp = this.queue;
		temp.length = 0;
		this.queue = this.nextQueue;
		this.nextQueue = temp;
		this.hasFlushed = false;
	}

	/**
	 * Subscribe to an event.
	 * @param type
	 * @param listener
	 */
	subscribe<T extends EventType<any>>(
		type: T,
		listener: (value: T["type"]) => void,
	): VoidFunction
	{
		this.listeners.get(type).add(listener);
		return () => void this.unsubscribe(type, listener);
	}

	/**
	 * Unsubscribe from an event.
	 * @param type
	 * @param listener
	 */
	unsubscribe<T extends EventType<any>>(
		type: T,
		listener: (value: T["type"]) => void,
	): void
	{
		this.listeners.get(type).delete(listener);
	}

	*[Symbol.iterator](): IterableIterator<[EventType<unknown>, unknown]>
	{
		for (let i = 0; i < this.queue.length; i += 2)
		{
			yield [this.queue[i], this.queue[i + 1]];
		}
	}

	protected readonly listeners = new AutoMap<EventType<any>, Set<(value: any) => void>>(() => new Set());

	protected queue: any[] = [];

	protected nextQueue: any[] = [];

	protected hasFlushed = false;

	constructor()
	{
		this.push = this.push.bind(this);
		this.dispatchQueue = this.dispatchQueue.bind(this);
		this.dispatchAndClear = this.dispatchAndClear.bind(this);
		this.clear = this.clear.bind(this);
		this.subscribe = this.subscribe.bind(this);
		this.unsubscribe = this.unsubscribe.bind(this);
	}
}
