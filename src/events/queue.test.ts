import { describe, it, expect, vi } from "vitest";
import { EventQueue } from "./queue";
import { createEvent } from "./create";

describe("EventQueue", () => 
{
	it("should subscribe a listener, push an event, and dispatch it", () => 
	{
		const queue = new EventQueue();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		queue.subscribe(testEvent, listener);
		queue.push(testEvent, "payload");
		queue.dispatchQueue();

		expect(listener).toHaveBeenCalledWith("payload");
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("should dispatch all events in the queue and then clear it with dispatchAndClear", () => 
	{
		const queue = new EventQueue();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		queue.subscribe(testEvent, listener);
		queue.push(testEvent, "payload");
		queue.dispatchAndClear();

		expect(listener).toHaveBeenCalledTimes(1);
		listener.mockClear();

		// The queue should be empty, so another dispatch does nothing.
		queue.dispatchQueue();
		expect(listener).not.toHaveBeenCalled();
	});

	it("should clear the queue without dispatching events", () => 
	{
		const queue = new EventQueue();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		queue.subscribe(testEvent, listener);
		queue.push(testEvent, "payload");
		queue.clear();
		queue.dispatchQueue();

		expect(listener).not.toHaveBeenCalled();
	});

	it("should unsubscribe a listener using the unsubscribe method", () => 
	{
		const queue = new EventQueue();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		queue.subscribe(testEvent, listener);
		queue.unsubscribe(testEvent, listener);
		queue.push(testEvent, "payload");
		queue.dispatchQueue();

		expect(listener).not.toHaveBeenCalled();
	});

	it("should return a function from subscribe() that unsubscribes the listener", () => 
	{
		const queue = new EventQueue();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		const unsubscribe = queue.subscribe(testEvent, listener);
		unsubscribe();
		queue.push(testEvent, "payload");
		queue.dispatchQueue();

		expect(listener).not.toHaveBeenCalled();
	});

	it("should correctly handle the double buffer (events pushed during dispatch are queued for next frame)", () => 
	{
		const queue = new EventQueue();
		const eventA = createEvent<string>("eventA");
		const eventB = createEvent<string>("eventB");
		const listenerA = vi.fn();
		const listenerB = vi.fn();

		// When listenerA is called, it pushes eventB to the queue.
		listenerA.mockImplementation(() => 
		{
			queue.push(eventB, "payloadB");
		});

		queue.subscribe(eventA, listenerA);
		queue.subscribe(eventB, listenerB);

		queue.push(eventA, "payloadA");
		queue.dispatchQueue(); // Dispatch eventA

		// Listener for A should have been called.
		expect(listenerA).toHaveBeenCalledTimes(1);
		// Listener for B should NOT have been called yet, because it was pushed to the next queue.
		expect(listenerB).not.toHaveBeenCalled();

		// After clearing, the next queue becomes the current queue.
		queue.clear();
		queue.dispatchQueue(); // Dispatch eventB

		// Now listener for B should be called.
		expect(listenerB).toHaveBeenCalledTimes(1);
		expect(listenerB).toHaveBeenCalledWith("payloadB");
	});

	it("should be iterable, yielding all events and payloads in the current queue", () => 
	{
		const queue = new EventQueue();
		const eventA = createEvent<string>("eventA");
		const eventB = createEvent<number>("eventB");

		queue.push(eventA, "one");
		queue.push(eventB, 2);

		const events = [...queue];

		expect(events).toHaveLength(2);
		expect(events[0]).toEqual([eventA, "one"]);
		expect(events[1]).toEqual([eventB, 2]);
	});

	it("should handle errors within listeners gracefully", () => 
	{
		const queue = new EventQueue();
		const testEvent = createEvent<string>("testEvent");
		const faultyListener = vi.fn(() => 
		{
			throw new Error("Listener Error");
		});

		queue.subscribe(testEvent, faultyListener);
		queue.push(testEvent, "payload");

		expect(() => queue.dispatchQueue()).toThrow();
		expect(faultyListener).toHaveBeenCalledOnce();
	});

	it("should have its methods bound to the instance", () => 
	{
		const queue = new EventQueue();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		const { subscribe, unsubscribe, push, dispatchAndClear } = queue;

		subscribe(testEvent, listener);
		push(testEvent, "payload");
		dispatchAndClear();

		expect(listener).toHaveBeenCalledTimes(1);
		listener.mockClear();

		subscribe(testEvent, listener);
		unsubscribe(testEvent, listener);
		push(testEvent, "payload");
		dispatchAndClear();

		expect(listener).not.toHaveBeenCalled();
	});
});
