import { AutoMap } from './automap';
import { describe, suite, test, assert } from "vitest"

describe('AutoMap', () => {

	test('should create and return a value if key does not exist', () => {
		const map = new AutoMap<string, number>(() => 10);
		assert.strictEqual(map.has('foo'), false);
		const value = map.get('foo');
		assert.strictEqual(value, 10);
		assert.strictEqual(map.has('foo'), true);
	});

	test('should return existing value if key exists', () => {
		let factoryCalls = 0;
		const map = new AutoMap<string, number>(() => {
			factoryCalls++;
			return 10;
		});
		map.get('foo');
		assert.strictEqual(factoryCalls, 1);
		assert.strictEqual(map.get('foo'), 10)
	});

	test('should work with object references', () => {
		const map = new AutoMap<string, { count: number }>(() => ({ count: 0 }));
		const obj1 = map.get('a');
		assert.deepStrictEqual(obj1, { count: 0 });
		obj1.count++;
		const obj2 = map.get('a');
		assert.strictEqual(obj1, obj2);
		assert.strictEqual(obj2.count, 1);
	});

	test('should work with array references', () => {
		const map = new AutoMap<string, string[]>(() => []);
		map.get('list').push('one');
		map.get('list').push('two');
		assert.deepStrictEqual(map.get('list'), ['one', 'two']);
	});

	test('should behave like a normal Map for other methods', () => {
		const map = new AutoMap<string, number>(() => 0);
		map.set('a', 1);
		map.set('b', 2);
		assert.strictEqual(map.size, 2);
		assert.deepStrictEqual(Array.from(map.keys()), ['a', 'b']);
		assert.deepStrictEqual(Array.from(map.values()), [1, 2]);
		assert.strictEqual(map.delete('a'), true);
		assert.strictEqual(map.has('a'), false);
		map.clear();
		assert.strictEqual(map.size, 0);
	});

});
