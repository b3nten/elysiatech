import { describe, it, expect, vi } from "vitest";
import { EventManager } from "./manager";
import { AutoMap } from "../lib/automap";
import { createEvent } from "./create";


describe("EventManager", () => {
	it("should register a listener and notify it with the correct payload", () => {
		const manager = new EventManager();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		manager.register(testEvent, listener);
		manager.notify(testEvent, "Hello, World!");

		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith("Hello, World!");
	});

	it("should correctly handle notifications for events that have no payload", () => {
		const manager = new EventManager();
		const testEvent = createEvent<undefined>("testEventNoPayload");
		const listener = vi.fn();

		manager.register(testEvent, listener);
		manager.notify(testEvent);

		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith(undefined);
	});

	it("should unregister a listener using the unregister method", () => {
		const manager = new EventManager();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		manager.register(testEvent, listener);
		manager.unregister(testEvent, listener);
		manager.notify(testEvent, "This message should not be received.");

		expect(listener).not.toHaveBeenCalled();
	});

	it("should return a function from register() that unregisters the listener when called", () => {
		const manager = new EventManager();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		const unregister = manager.register(testEvent, listener);
		unregister(); // Call the returned unregister function
		manager.notify(testEvent, "This message should also not be received.");

		expect(listener).not.toHaveBeenCalled();
	});

	it("should notify all registered listeners for a single event", () => {
		const manager = new EventManager();
		const testEvent = createEvent<number>("multiListenerEvent");
		const listener1 = vi.fn();
		const listener2 = vi.fn();

		manager.register(testEvent, listener1);
		manager.register(testEvent, listener2);
		manager.notify(testEvent, 42);

		expect(listener1).toHaveBeenCalledOnce();
		expect(listener1).toHaveBeenCalledWith(42);
		expect(listener2).toHaveBeenCalledOnce();
		expect(listener2).toHaveBeenCalledWith(42);
	});

	it("should keep listeners for different events separate", () => {
		const manager = new EventManager();
		const eventA = createEvent<string>("eventA");
		const eventB = createEvent<boolean>("eventB");
		const listenerA = vi.fn();
		const listenerB = vi.fn();

		manager.register(eventA, listenerA);
		manager.register(eventB, listenerB);

		manager.notify(eventA, "Payload for A");
		expect(listenerA).toHaveBeenCalledOnce();
		expect(listenerA).toHaveBeenCalledWith("Payload for A");
		expect(listenerB).not.toHaveBeenCalled();

		manager.notify(eventB, true);
		expect(listenerA).toHaveBeenCalledOnce(); // Should still be 1
		expect(listenerB).toHaveBeenCalledOnce();
		expect(listenerB).toHaveBeenCalledWith(true);
	});

	it("should not throw an error when notifying an event that has no listeners", () => {
		const manager = new EventManager();
		const lonelyEvent = createEvent<string>("lonelyEvent");

		expect(() => manager.notify(lonelyEvent, "payload")).not.toThrow();
	});

	it("should remove all listeners for all events when clear() is called", () => {
		const manager = new EventManager();
		const eventA = createEvent<string>("eventA");
		const eventB = createEvent<number>("eventB");
		const listenerA = vi.fn();
		const listenerB = vi.fn();

		manager.register(eventA, listenerA);
		manager.register(eventB, listenerB);

		manager.clear();

		manager.notify(eventA, "Payload for A");
		manager.notify(eventB, 123);

		expect(listenerA).not.toHaveBeenCalled();
		expect(listenerB).not.toHaveBeenCalled();
	});

	it("should have its methods bound to the instance, allowing them to be destructured and called", () => {
		const manager = new EventManager();
		const testEvent = createEvent<string>("testEvent");
		const listener = vi.fn();

		const { register, unregister, notify, clear } = manager;

		// Test register and notify
		register(testEvent, listener);
		notify(testEvent, "first call");
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith("first call");

		// Test unregister
		unregister(testEvent, listener);
		notify(testEvent, "second call");
		expect(listener).toHaveBeenCalledTimes(1); // Should not be called again

		// Test clear
		register(testEvent, listener);
		clear();
		notify(testEvent, "third call");
		expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
	});
});
