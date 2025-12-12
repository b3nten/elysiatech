import { describe, it, expect } from "vitest";
import {
	isArray,
	isBoolean,
	isConstructor,
	isDate,
	isExactly,
	isFalsy,
	isFunction,
	isNull,
	isNullish,
	isNumber,
	isPrimitive,
	isRecord,
	isString,
	isUndefined,
	isVoid,
} from "./checks";

describe("isBoolean", () => 
{
	it("should return true for booleans", () => 
	{
		expect(isBoolean(true)).toBe(true);
		expect(isBoolean(false)).toBe(true);
	});

	it("should return false for non-booleans", () => 
	{
		expect(isBoolean(0)).toBe(false);
		expect(isBoolean("true")).toBe(false);
		expect(isBoolean(null)).toBe(false);
		expect(isBoolean(undefined)).toBe(false);
		expect(isBoolean({})).toBe(false);
		expect(isBoolean([])).toBe(false);
	});
});

describe("isNumber", () => 
{
	it("should return true for numbers", () => 
	{
		expect(isNumber(0)).toBe(true);
		expect(isNumber(123)).toBe(true);
		expect(isNumber(-123)).toBe(true);
		expect(isNumber(1.23)).toBe(true);
		expect(isNumber(Infinity)).toBe(true);
		expect(isNumber(NaN)).toBe(true);
	});

	it("should return false for non-numbers", () => 
	{
		expect(isNumber("123")).toBe(false);
		expect(isNumber(null)).toBe(false);
		expect(isNumber(undefined)).toBe(false);
		expect(isNumber({})).toBe(false);
		expect(isNumber([])).toBe(false);
	});
});

describe("isString", () => 
{
	it("should return true for strings", () => 
	{
		expect(isString("")).toBe(true);
		expect(isString("hello")).toBe(true);
	});

	it("should return false for non-strings", () => 
	{
		expect(isString(123)).toBe(false);
		expect(isString(null)).toBe(false);
		expect(isString(undefined)).toBe(false);
		expect(isString({})).toBe(false);
		expect(isString([])).toBe(false);
	});
});

describe("isDate", () => 
{
	it("should return true for Date objects", () => 
	{
		expect(isDate(new Date())).toBe(true);
	});

	it("should return false for non-Date objects", () => 
	{
		expect(isDate(Date.now())).toBe(false); // it's a number
		expect(isDate("2023-01-01")).toBe(false);
		expect(isDate(null)).toBe(false);
		expect(isDate(undefined)).toBe(false);
		expect(isDate({})).toBe(false);
	});
});

describe("isRecord", () => 
{
	it("should return true for objects that are records", () => 
	{
		expect(isRecord({})).toBe(true);
		expect(isRecord({ a: 1 })).toBe(true);
		expect(isRecord(new Date())).toBe(true);
	});

	it("should return false for non-record values", () => 
	{
		expect(isRecord(null)).toBe(false);
		expect(isRecord([])).toBe(false);
		expect(isRecord("string")).toBe(false);
		expect(isRecord(123)).toBe(false);
		expect(isRecord(undefined)).toBe(false);
		expect(isRecord(() => {})).toBe(false);
	});
});

describe("isArray", () => 
{
	it("should return true for arrays", () => 
	{
		expect(isArray([])).toBe(true);
		expect(isArray([1, 2, 3])).toBe(true);
	});

	it("should return false for non-arrays", () => 
	{
		expect(isArray({})).toBe(false);
		expect(isArray("array")).toBe(false);
		expect(isArray(null)).toBe(false);
		expect(isArray(undefined)).toBe(false);
	});
});

describe("isFunction", () => 
{
	it("should return true for functions", () => 
	{
		expect(isFunction(() => {})).toBe(true);
		expect(isFunction(function() {})).toBe(true);
		class MyClass {}
		expect(isFunction(MyClass)).toBe(true);
	});

	it("should return false for non-functions", () => 
	{
		expect(isFunction({})).toBe(false);
		expect(isFunction([])).toBe(false);
		expect(isFunction(null)).toBe(false);
	});
});

describe("isUndefined", () => 
{
	it("should return true for undefined", () => 
	{
		expect(isUndefined(undefined)).toBe(true);
	});

	it("should return false for non-undefined values", () => 
	{
		expect(isUndefined(null)).toBe(false);
		expect(isUndefined(0)).toBe(false);
		expect(isUndefined("")).toBe(false);
	});
});

describe("isNull", () => 
{
	it("should return true for null", () => 
	{
		expect(isNull(null)).toBe(true);
	});

	it("should return false for non-null values", () => 
	{
		expect(isNull(undefined)).toBe(false);
		expect(isNull(0)).toBe(false);
		expect(isNull("")).toBe(false);
	});
});

describe("isVoid", () => 
{
	it("should return true for null and undefined", () => 
	{
		expect(isVoid(null)).toBe(true);
		expect(isVoid(undefined)).toBe(true);
	});

	it("should return false for other values", () => 
	{
		expect(isVoid(0)).toBe(false);
		expect(isVoid("")).toBe(false);
		expect(isVoid(false)).toBe(false);
	});
});

describe("isNullish", () => 
{
	it("should return true for null and undefined", () => 
	{
		expect(isNullish(null)).toBe(true);
		expect(isNullish(undefined)).toBe(true);
	});

	it("should return false for other values", () => 
	{
		expect(isNullish(0)).toBe(false);
		expect(isNullish("")).toBe(false);
		expect(isNullish(false)).toBe(false);
	});
});

describe("isFalsy", () => 
{
	it("should return true for falsy values", () => 
	{
		expect(isFalsy(false)).toBe(true);
		expect(isFalsy(0)).toBe(true);
		expect(isFalsy("")).toBe(true);
		expect(isFalsy(null)).toBe(true);
		expect(isFalsy(undefined)).toBe(true);
		expect(isFalsy(0n)).toBe(true);
	});

	it("should return false for truthy values", () => 
	{
		expect(isFalsy(true)).toBe(false);
		expect(isFalsy(1)).toBe(false);
		expect(isFalsy("hello")).toBe(false);
		expect(isFalsy({})).toBe(false);
		expect(isFalsy([])).toBe(false);
	});
});

describe("isExactly", () => 
{
	const a = {};
	const b = {};
	it("should return true for strictly equal values", () => 
	{
		expect(isExactly(1, 1)).toBe(true);
		expect(isExactly("a", "a")).toBe(true);
		expect(isExactly(a, a)).toBe(true);
	});

	it("should return false for non-strictly equal values", () => 
	{
		expect(isExactly(1, "1" as any)).toBe(false);
		expect(isExactly(a, b)).toBe(false);
		expect(isExactly(0, false as any)).toBe(false);
	});
});

describe("isConstructor", () => 
{
	it("should return true for constructors", () => 
	{
		expect(isConstructor(class {})).toBe(true);
		expect(isConstructor(function() {})).toBe(true); // Functions have prototypes
		expect(isConstructor(Date)).toBe(true);
		expect(isConstructor(Object)).toBe(true);
	});

	it("should return false for non-constructors", () => 
	{
		expect(isConstructor(() => {})).toBe(false); // Arrow functions don't have prototype
		expect(isConstructor({})).toBe(false);
		expect(isConstructor(null)).toBe(false);
		expect(isConstructor(undefined)).toBe(false);
		expect(isConstructor(1)).toBe(false);
	});
});

describe("isPrimitive", () => 
{
	it("should return true for primitive values", () => 
	{
		expect(isPrimitive(null)).toBe(true);
		expect(isPrimitive(undefined)).toBe(true);
		expect(isPrimitive("hello")).toBe(true);
		expect(isPrimitive(123)).toBe(true);
		expect(isPrimitive(123n)).toBe(true);
		expect(isPrimitive(true)).toBe(true);
		expect(isPrimitive(Symbol("id"))).toBe(true);
	});

	it("should return false for non-primitive values", () => 
	{
		expect(isPrimitive({})).toBe(false);
		expect(isPrimitive([])).toBe(false);
		expect(isPrimitive(() => {})).toBe(false);
		expect(isPrimitive(new Date())).toBe(false);
	});
});
