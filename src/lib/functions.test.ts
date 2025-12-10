import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	make,
	run,
	Ok,
	Err,
	runSafe,
	runCatching,
	runAsync,
	noop,
	runNextTick,
	runNextFrame,
	runAndForget,
	constructorOf,
	forEach,
} from "./functions";

describe("make", () => {
	class TestClass {
		constructor(public value: number, public text: string) {}
	}

	it("should create an instance of a class without arguments", () => {
		class SimpleClass {}
		const instance = make(SimpleClass);
		expect(instance).toBeInstanceOf(SimpleClass);
	});

	it("should create an instance of a class with arguments", () => {
		const instance = make(TestClass, 42, "hello");
		expect(instance).toBeInstanceOf(TestClass);
		expect(instance.value).toBe(42);
		expect(instance.text).toBe("hello");
	});
});

describe("run", () => {
	it("should run the function and return its result", () => {
		const fn = () => 42;
		expect(run(fn)).toBe(42);
	});

	it("should execute side effects", () => {
		let value = 0;
		const fn = () => {
			value = 10;
		};
		run(fn);
		expect(value).toBe(10);
	});
});

describe("Result", () => {
	describe("Ok", () => {
		it("should create a success result", () => {
			const result = Ok(42);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});
	});

	describe("Err", () => {
		it("should create an error result", () => {
			const error = new Error("Something went wrong");
			const result = Err(error);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe(error);
			}
		});
	});
});

describe("runSafe", () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it("should return the result of a successful synchronous function", () => {
		const result = runSafe(() => 42);
		expect(result).toBe(42);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("should return undefined and log the error for a failing synchronous function", () => {
		const error = new Error("Sync Fail");
		const result = runSafe(() => {
			throw error;
		});
		expect(result).toBeUndefined();
		expect(errorSpy).toHaveBeenCalledWith(error);
	});

	it("should return a promise for a successful async function", async () => {
		const promise = Promise.resolve(42);
		const result = runSafe(() => promise);
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toBe(42);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("should log the error for a failing async function", async () => {
		const error = new Error("Async Fail");
		const promise = Promise.reject(error);
		const result = runSafe(() => promise);
		expect(result).toBeInstanceOf(Promise);

		// To ensure the catch block is executed
		await result;

		expect(errorSpy).toHaveBeenCalledWith(error);
	});
});

describe("runCatching", () => {
	it("should return Ok for a successful synchronous function", () => {
		const result = runCatching(() => 42);
		expect(result).toEqual(Ok(42));
	});

	it("should return Err for a failing synchronous function", () => {
		const error = new Error("Sync Fail");
		const result = runCatching(() => {
			throw error;
		});
		expect(result).toEqual(Err(error));
	});

	it("should return a promise resolving to Ok for a successful async function", async () => {
		const result = runCatching(() => Promise.resolve(42));
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toEqual(Ok(42));
	});

	it("should return a promise resolving to Err for a failing async function", async () => {
		const error = new Error("Async Fail");
		const result = runCatching(() => Promise.reject(error));
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toEqual(Err(error));
	});
});

describe("runAsync", () => {
	it("should return a resolved promise for a synchronous value", async () => {
		const result = runAsync(() => 42);
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toBe(42);
	});

	it("should return the original promise for an async function", () => {
		const promise = Promise.resolve(42);
		const result = runAsync(() => promise);
		expect(result).toBe(promise);
	});
});

describe("noop", () => {
	it("should be a function that does nothing and returns undefined", () => {
		expect(noop).toBeInstanceOf(Function);
		expect(noop()).toBeUndefined();
	});
});

describe("runNextTick", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should run the callback on the next tick", () => {
		const callback = vi.fn();
		runNextTick(callback);
		expect(callback).not.toHaveBeenCalled();
		vi.runAllTimers();
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("runNextFrame", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
			cb(0);
			return 0;
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		delete (global as any).requestAnimationFrame;
	});

	it("should run the callback on the next animation frame then next tick", () => {
		const callback = vi.fn();
		runNextFrame(callback);
		expect(callback).not.toHaveBeenCalled();
		vi.runAllTimers();
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("runAndForget", () => {
	it("should call the async function", () => {
		const callback = vi.fn(() => Promise.resolve());
		runAndForget(callback);
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("constructorOf", () => {
	class MyClass {}

	it("should return the constructor of a class instance", () => {
		const instance = new MyClass();
		expect(constructorOf(instance)).toBe(MyClass);
	});

	it("should return the constructor of a plain object", () => {
		const obj = {};
		expect(constructorOf(obj)).toBe(Object);
	});

	it("should return the constructor of a date object", () => {
		const date = new Date();
		expect(constructorOf(date)).toBe(Date);
	});
});

describe("forEach", () => {
	it("should iterate over an array", () => {
		const arr = [1, 2, 3];
		const callback = vi.fn();
		forEach(arr, callback);

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenCalledWith(1, 0);
		expect(callback).toHaveBeenCalledWith(2, 1);
		expect(callback).toHaveBeenCalledWith(3, 2);
	});

	it("should iterate over a Set", () => {
		const set = new Set(["a", "b"]);
		const callback = vi.fn();
		forEach(set, callback);

		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledWith("a", 0);
		expect(callback).toHaveBeenCalledWith("b", 1);
	});

	it("should iterate over a Map's entries", () => {
		const map = new Map<string, number>([
			["x", 10],
			["y", 20],
		]);
		const callback = vi.fn();
		forEach(map, callback);

		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledWith(["x", 10], 0);
		expect(callback).toHaveBeenCalledWith(["y", 20], 1);
	});

	it("should not call the callback for an empty iterable", () => {
		const arr: any[] = [];
		const callback = vi.fn();
		forEach(arr, callback);
		expect(callback).not.toHaveBeenCalled();
	});
});