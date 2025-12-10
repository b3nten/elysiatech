import { describe, it, expect } from 'vitest';
import { radixSort } from './radixsort';

describe('radixSort', () => {
	it('should sort a simple array of numbers', () => {
		const arr = [5, 2, 8, 1, 9, 4];
		radixSort(arr);
		expect(arr).toEqual([1, 2, 4, 5, 8, 9]);
	});

	it('should sort an array of numbers in reverse order', () => {
		const arr = [5, 2, 8, 1, 9, 4];
		radixSort(arr, { reversed: true });
		expect(arr).toEqual([9, 8, 5, 4, 2, 1]);
	});

	it('should sort an array of objects with a get function', () => {
		const arr = [{ value: 5 }, { value: 2 }, { value: 8 }];
		radixSort(arr, { get: (el) => el.value });
		expect(arr).toEqual([{ value: 2 }, { value: 5 }, { value: 8 }]);
	});

	it('should handle an empty array', () => {
		const arr: number[] = [];
		radixSort(arr);
		expect(arr).toEqual([]);
	});

	it('should handle an array with a single element', () => {
		const arr = [42];
		radixSort(arr);
		expect(arr).toEqual([42]);
	});

	it('should handle an array with duplicate elements', () => {
		const arr = [5, 2, 8, 1, 9, 4, 2, 5];
		radixSort(arr);
		expect(arr).toEqual([1, 2, 2, 4, 5, 5, 8, 9]);
	});

	it('should sort a large array of random numbers', () => {
		const arr = Array.from({ length: 1000 }, () =>
			Math.floor(Math.random() * 10000)
		);
		const sortedArr = [...arr].sort((a, b) => a - b);
		radixSort(arr);
		expect(arr).toEqual(sortedArr);
	});

	it('should sort an already sorted array', () => {
		const arr = [1, 2, 3, 4, 5, 6];
		radixSort(arr);
		expect(arr).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('should sort a reverse-sorted array', () => {
		const arr = [6, 5, 4, 3, 2, 1];
		radixSort(arr);
		expect(arr).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('should sort a reverse-sorted array in reverse', () => {
		const arr = [1, 2, 3, 4, 5, 6];
		radixSort(arr, { reversed: true });
		expect(arr).toEqual([6, 5, 4, 3, 2, 1]);
	});

	it('should use the provided auxiliary array', () => {
		const arr = [5, 2, 8, 1, 9, 4];
		const aux = new Array(arr.length);
		radixSort(arr, { aux });
		expect(arr).toEqual([1, 2, 4, 5, 8, 9]);
	});

	// The current implementation uses unsigned 32-bit integers, so negative numbers won't be sorted correctly in a numerical sense.
	// This test documents the current behavior.
	it('should handle arrays with negative numbers based on their unsigned 32-bit representation', () => {
		const arr = [-1, -5, 2, 8, 1, -9, 4];
		// Expected order based on `>>> 0`
		// -1 >>> 0 is 4294967295
		// -5 >>> 0 is 4294967291
		// -9 >>> 0 is 4294967287
		// 1 >>> 0 is 1
		// 2 >>> 0 is 2
		// 4 >>> 0 is 4
		// 8 >>> 0 is 8
		// Sorted (asc): [1, 2, 4, 8, -9, -5, -1]
		const expected = [1, 2, 4, 8, -9, -5, -1];
		radixSort(arr);
		expect(arr).toEqual(expected);
	});
});