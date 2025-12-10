import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectPool } from "./objpool";

// A simple object for testing purposes
interface TestObject {
	id: number;
	active: boolean;
}

describe("ObjectPool", () => {
	const createObject = vi.fn((id: number): TestObject => ({ id, active: true }));
	const resetObject = vi.fn((obj: TestObject) => {
		obj.active = false;
	});

	beforeEach(() => {
		createObject.mockClear();
		resetObject.mockClear();
	});

	describe("Initialization", () => {
		it("should create a pool with the correct initial size", () => {
			const pool = new ObjectPool({
				initialSize: 10,
				createObject,
			});
			expect(pool.size).toBe(10);
			expect(pool.sizeOfReserve).toBe(10);
			expect(pool.sizeOfActive).toBe(0);
		});

		it("should call createObject for each initial object", () => {
			new ObjectPool({
				initialSize: 5,
				createObject,
			});
			expect(createObject).toHaveBeenCalledTimes(5);
			expect(createObject).toHaveBeenCalledWith(0);
			expect(createObject).toHaveBeenCalledWith(1);
			expect(createObject).toHaveBeenCalledWith(2);
			expect(createObject).toHaveBeenCalledWith(3);
			expect(createObject).toHaveBeenCalledWith(4);
		});

		it("should call resetObject for each initial object if provided", () => {
			new ObjectPool({
				initialSize: 3,
				createObject,
				resetObject,
			});
			expect(resetObject).toHaveBeenCalledTimes(3);
		});
	});

	describe("Allocation and Freeing", () => {
		it("should allocate an object from the pool", () => {
			const pool = new ObjectPool({ initialSize: 1, createObject });
			const obj = pool.alloc();
			expect(obj).toBeDefined();
			expect(obj.id).toBe(0);
		});

		it("should move an object from inactive to active on alloc", () => {
			const pool = new ObjectPool({ initialSize: 5, createObject });
			expect(pool.sizeOfReserve).toBe(5);
			expect(pool.sizeOfActive).toBe(0);

			pool.alloc();

			expect(pool.sizeOfReserve).toBe(4);
			expect(pool.sizeOfActive).toBe(1);
		});

		it("should free an active object, moving it back to the pool", () => {
			const pool = new ObjectPool({ initialSize: 1, createObject });
			const obj = pool.alloc();

			expect(pool.sizeOfActive).toBe(1);
			expect(pool.sizeOfReserve).toBe(0);

			pool.free(obj);

			expect(pool.sizeOfActive).toBe(0);
			expect(pool.sizeOfReserve).toBe(1);
		});

		it("should call resetObject when freeing an object", () => {
			const pool = new ObjectPool({
				initialSize: 1,
				createObject,
				resetObject,
			});
			const obj = pool.alloc();
			resetObject.mockClear(); // Clear calls from initialization

			pool.free(obj);
			expect(resetObject).toHaveBeenCalledTimes(1);
			expect(resetObject).toHaveBeenCalledWith(obj);
		});

		it("should not free an object that is not active", () => {
			const pool = new ObjectPool({
				initialSize: 2,
				createObject,
				resetObject,
			});
			const obj1 = pool.alloc();
			const inactiveObj = { id: 99, active: true }; // An object not from the pool

			resetObject.mockClear();

			pool.free(inactiveObj);
			expect(pool.sizeOfActive).toBe(1);
			expect(pool.sizeOfReserve).toBe(1);
			expect(resetObject).not.toHaveBeenCalled();
		});

		it("should not allow freeing the same object twice", () => {
			const pool = new ObjectPool({ initialSize: 1, createObject });
			const obj = pool.alloc();
			pool.free(obj);

			const initialReserveSize = pool.sizeOfReserve;
			pool.free(obj); // Try to free again
			expect(pool.sizeOfReserve).toBe(initialReserveSize);
		});
	});

	describe("Automatic Growth", () => {
		it("should grow the pool when it runs out of objects", () => {
			const pool = new ObjectPool({ initialSize: 1, createObject });
			expect(pool.size).toBe(1);

			pool.alloc(); // Pool is now empty
			expect(pool.sizeOfReserve).toBe(0);

			const newObj = pool.alloc();
			expect(newObj).toBeDefined();
			expect(pool.size).toBeGreaterThan(1);
			expect(pool.sizeOfActive).toBe(2);
			expect(pool.sizeOfReserve).toBeGreaterThan(0);
		});

		it("should use a custom growth strategy", () => {
			const growthStrategy = vi.fn((currentSize: number) => {
				return currentSize + 5; // Always add 5 new objects
			});
			const pool = new ObjectPool({
				initialSize: 1,
				createObject,
				growthStrategy,
			});

			pool.alloc(); // Deplete initial object
			pool.alloc(); // Trigger growth

			expect(growthStrategy).toHaveBeenCalled();
			expect(pool.size).toBe(7);
			expect(pool.sizeOfReserve).toBe(5);
		});
	});

	describe("freeAll", () => {
		it("should free all active objects", () => {
			const pool = new ObjectPool({
				initialSize: 5,
				createObject,
				resetObject,
			});
			const o1 = pool.alloc();
			const o2 = pool.alloc();
			const o3 = pool.alloc();

			expect(pool.sizeOfActive).toBe(3);
			expect(pool.sizeOfReserve).toBe(2);
			resetObject.mockClear();

			pool.freeAll();

			expect(pool.sizeOfActive).toBe(0);
			expect(pool.sizeOfReserve).toBe(5);
		});

		it("should do nothing if no objects are active", () => {
			const pool = new ObjectPool({ initialSize: 5, createObject });
			pool.freeAll();
			expect(pool.sizeOfActive).toBe(0);
			expect(pool.sizeOfReserve).toBe(5);
		});
	});
});
