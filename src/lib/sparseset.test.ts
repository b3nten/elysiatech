import { describe, it, expect } from 'vitest';
import { SparseSet } from './sparseset';

describe('SparseSet', () => {
	it('should be empty initially', () => {
		const set = new SparseSet<string>();
		expect(set.size).toBe(0);
		expect(set.first).toBeUndefined();
	});

	it('should add an entity and component', () => {
		const set = new SparseSet<string>();
		const result = set.add(1, 'a');
		expect(result).toBe(true);
		expect(set.size).toBe(1);
		expect(set.has(1)).toBe(true);
		expect(set.get(1)).toBe('a');
	});

	it('should not add an entity that already exists', () => {
		const set = new SparseSet<string>();
		set.add(1, 'a');
		const result = set.add(1, 'b');
		expect(result).toBe(false);
		expect(set.size).toBe(1);
		expect(set.get(1)).toBe('a'); // Should not have been updated
	});

	it('should get a component for an entity', () => {
		const set = new SparseSet<{ value: number }>();
		const component = { value: 42 };
		set.add(10, component);
		expect(set.get(10)).toBe(component);
	});

	it('should return undefined when getting a non-existent entity', () => {
		const set = new SparseSet<string>();
		expect(set.get(99)).toBeUndefined();
	});

	it('should remove an entity from the set', () => {
		const set = new SparseSet<string>();
		set.add(1, 'a');
		set.add(2, 'b');
		set.remove(1);
		expect(set.has(1)).toBe(false);
		expect(set.get(1)).toBeUndefined();
		expect(set.size).toBe(1);
		expect(set.has(2)).toBe(true);
		expect(set.get(2)).toBe('b');
	});

	it('should correctly handle removing the last element added', () => {
		const set = new SparseSet<string>();
		set.add(1, 'a');
		set.add(2, 'b');
		set.add(3, 'c');
		set.remove(3);
		expect(set.size).toBe(2);
		expect(set.has(1)).toBe(true);
		expect(set.has(2)).toBe(true);
		expect(set.has(3)).toBe(false);
	});

	it('should correctly handle removing the only element', () => {
		const set = new SparseSet<string>();
		set.add(1, 'a');
		set.remove(1);
		expect(set.size).toBe(0);
		expect(set.has(1)).toBe(false);
	});

	it('should do nothing when removing a non-existent entity', () => {
		const set = new SparseSet<string>();
		set.add(1, 'a');
		set.remove(2);
		expect(set.size).toBe(1);
		expect(set.has(1)).toBe(true);
	});

	it('should clear the set', () => {
		const set = new SparseSet<string>();
		set.add(1, 'a');
		set.add(2, 'b');
		set.clear();
		expect(set.size).toBe(0);
		expect(set.has(1)).toBe(false);
		expect(set.has(2)).toBe(false);
		expect(set.get(1)).toBeUndefined();
		expect(Array.from(set).length).toBe(0);
	});

	it('should iterate over all entities and components', () => {
		const set = new SparseSet<string>();
		const items: [number, string][] = [
			[1, 'a'],
			[10, 'b'],
			[100, 'c'],
		];
		for (const [entity, component] of items) {
			set.add(entity, component);
		}

		const iteratedItems = Array.from(set);
		expect(iteratedItems.length).toBe(items.length);
		// The order of iteration is not guaranteed, so we check for presence
		for (const item of items) {
			expect(iteratedItems).toContainEqual(item);
		}
	});

	it('should not iterate over an empty set', () => {
		const set = new SparseSet<string>();
		let count = 0;
		for (const _ of set) {
			count++;
		}
		expect(count).toBe(0);
		expect(Array.from(set)).toEqual([]);
	});

	it('should return the first component', () => {
		const set = new SparseSet<string>();
		expect(set.first).toBeUndefined();
		set.add(1, 'a');
		expect(set.first).toBe('a');
		set.add(2, 'b');
		expect(set.first).toBe('a'); // Should still be the first one added
	});

	it('should maintain data integrity after multiple add/remove operations', () => {
		const set = new SparseSet<number>();
		set.add(10, 100);
		set.add(20, 200);
		set.add(30, 300);
		set.remove(20); // swap-and-pop: 30 moves to 20's old spot
		expect(set.size).toBe(2);
		expect(set.get(10)).toBe(100);
		expect(set.get(30)).toBe(300);
		expect(set.has(20)).toBe(false);

		set.add(40, 400);
		expect(set.size).toBe(3);
		expect(set.get(40)).toBe(400);

		const expected = [
			[10, 100],
			[30, 300],
			[40, 400],
		];
		const actual = Array.from(set);
		expect(actual).toHaveLength(expected.length);
		for (const item of expected) {
			expect(actual).toContainEqual(item);
		}
	});
});