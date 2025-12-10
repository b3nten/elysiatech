import { describe, it, expect } from "vitest";
import {
	assert,
	assertUnreachable,
	assertNotNull,
	assertNotUndefined,
	assertNotVoid,
	assertExactly,
	assertBoolean,
	assertNumber,
	assertString,
	assertDate,
	assertRecord,
	assertRecordWithKeys,
	assertArray,
	assertRecordOfType,
	assertArrayOfType,
	assertOptionOfType,
	assertOneOf,
	assertOneOfType,
	assertInstanceOf,
	assertPromise,
	check,
	assertFieldsNotEmpty,
	mustExist,
	cast,
} from "./asserts";

describe("assert", () => {
	it("should not throw for truthy conditions", () => {
		expect(() => assert(true, "should not throw")).not.toThrow();
		expect(() => assert({}, "should not throw")).not.toThrow();
		expect(() => assert([], "should not throw")).not.toThrow();
		expect(() => assert(42, "should not throw")).not.toThrow();
		expect(() => assert("hello", "should not throw")).not.toThrow();
	});

	it("should throw for falsy conditions", () => {
		expect(() => assert(false)).toThrow(TypeError);
		expect(() => assert(0)).toThrow(TypeError);
		expect(() => assert("")).toThrow(TypeError);
		expect(() => assert(null)).toThrow(TypeError);
		expect(() => assert(undefined)).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assert(false, "custom message")).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assert(false)).toThrow("Assertion failed");
	});
});

describe("assertUnreachable", () => {
	it("should always throw", () => {
		expect(() => assertUnreachable(undefined as never)).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertUnreachable(undefined as never, "custom message")).toThrow(
			"custom message",
		);
	});

	it("should throw with a default message", () => {
		expect(() => assertUnreachable(undefined as never)).toThrow(
			"expected to be unreachable",
		);
	});
});

describe("assertNotNull", () => {
	it("should not throw for non-null values", () => {
		expect(() => assertNotNull(0)).not.toThrow();
		expect(() => assertNotNull("")).not.toThrow();
		expect(() => assertNotNull(false)).not.toThrow();
		expect(() => assertNotNull(undefined)).not.toThrow();
	});

	it("should throw for null", () => {
		expect(() => assertNotNull(null)).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertNotNull(null, "custom message")).toThrow(
			"custom message",
		);
	});

	it("should throw with a default message", () => {
		expect(() => assertNotNull(null)).toThrow("expected to be not null");
	});
});

describe("assertNotUndefined", () => {
	it("should not throw for non-undefined values", () => {
		expect(() => assertNotUndefined(0)).not.toThrow();
		expect(() => assertNotUndefined("")).not.toThrow();
		expect(() => assertNotUndefined(false)).not.toThrow();
		expect(() => assertNotUndefined(null)).not.toThrow();
	});

	it("should throw for undefined", () => {
		expect(() => assertNotUndefined(undefined)).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertNotUndefined(undefined, "custom message")).toThrow(
			"custom message",
		);
	});

	it("should throw with a default message", () => {
		expect(() => assertNotUndefined(undefined)).toThrow(
			"expected to be not undefined",
		);
	});
});

describe("assertNotVoid", () => {
	it("should not throw for non-null and non-undefined values", () => {
		expect(() => assertNotVoid(0)).not.toThrow();
		expect(() => assertNotVoid("")).not.toThrow();
		expect(() => assertNotVoid(false)).not.toThrow();
	});

	it("should throw for null", () => {
		expect(() => assertNotVoid(null)).toThrow(TypeError);
	});

	it("should throw for undefined", () => {
		expect(() => assertNotVoid(undefined)).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertNotVoid(null, "custom message")).toThrow(
			"custom message",
		);
		expect(() => assertNotVoid(undefined, "custom message")).toThrow(
			"custom message",
		);
	});

	it("should throw with a default message", () => {
		expect(() => assertNotVoid(null)).toThrow(
			"expected to be neither null nor undefined",
		);
		expect(() => assertNotVoid(undefined)).toThrow(
			"expected to be neither null nor undefined",
		);
	});
});

describe("assertExactly", () => {
	const a = {};
	const b = {};
	it("should not throw for equal values", () => {
		expect(() => assertExactly(1, 1)).not.toThrow();
		expect(() => assertExactly("a", "a")).not.toThrow();
		expect(() => assertExactly(a, a)).not.toThrow();
	});

	it("should throw for unequal values", () => {
		expect(() => assertExactly(1, 2)).toThrow(TypeError);
		expect(() => assertExactly("a", "b")).toThrow(TypeError);
		expect(() => assertExactly(a, b)).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertExactly(1, 2, "custom message")).toThrow(
			"custom message",
		);
	});

	it("should throw with a default message", () => {
		expect(() => assertExactly(1, 2)).toThrow("expected to be exactly 2");
	});
});

describe("assertBoolean", () => {
	it("should not throw for booleans", () => {
		expect(() => assertBoolean(true)).not.toThrow();
		expect(() => assertBoolean(false)).not.toThrow();
	});

	it("should throw for non-booleans", () => {
		expect(() => assertBoolean(1)).toThrow(TypeError);
		expect(() => assertBoolean("true")).toThrow(TypeError);
		expect(() => assertBoolean({})).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertBoolean(1, "custom message")).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assertBoolean(1)).toThrow("expected to be a boolean");
	});
});

describe("assertNumber", () => {
	it("should not throw for numbers", () => {
		expect(() => assertNumber(1)).not.toThrow();
		expect(() => assertNumber(0)).not.toThrow();
		expect(() => assertNumber(-1)).not.toThrow();
		expect(() => assertNumber(1.1)).not.toThrow();
	});

	it("should throw for non-numbers", () => {
		expect(() => assertNumber("1")).toThrow(TypeError);
		expect(() => assertNumber(true)).toThrow(TypeError);
		expect(() => assertNumber({})).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertNumber("1", "custom message")).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assertNumber("1")).toThrow("expected to be a number");
	});
});

describe("assertString", () => {
	it("should not throw for strings", () => {
		expect(() => assertString("hello")).not.toThrow();
		expect(() => assertString("")).not.toThrow();
	});

	it("should throw for non-strings", () => {
		expect(() => assertString(1)).toThrow(TypeError);
		expect(() => assertString(true)).toThrow(TypeError);
		expect(() => assertString({})).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertString(1, "custom message")).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assertString(1)).toThrow("expected to be a string");
	});
});

describe("assertDate", () => {
	it("should not throw for Date objects", () => {
		expect(() => assertDate(new Date())).not.toThrow();
	});

	it("should throw for non-Date objects", () => {
		expect(() => assertDate(1)).toThrow(TypeError);
		expect(() => assertDate("2022-01-01")).toThrow(TypeError);
		expect(() => assertDate({})).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertDate(1, "custom message")).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assertDate(1)).toThrow("expected to be a Date");
	});
});

describe("assertRecord", () => {
	it("should not throw for objects", () => {
		expect(() => assertRecord({})).not.toThrow();
		expect(() => assertRecord({ a: 1 })).not.toThrow();
	});

	it("should throw for non-objects", () => {
		expect(() => assertRecord(1)).toThrow(TypeError);
		expect(() => assertRecord("a")).toThrow(TypeError);
		expect(() => assertRecord(true)).toThrow(TypeError);
		expect(() => assertRecord([])).toThrow(TypeError);
	});

	it("should throw for null", () => {
		expect(() => assertRecord(null)).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertRecord(1, "custom message")).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assertRecord(1)).toThrow("expected to be a record");
	});
});

describe("assertRecordWithKeys", () => {
	it("should not throw for records with specified keys", () => {
		expect(() => assertRecordWithKeys({ a: 1, b: 2 }, ["a", "b"])).not.toThrow();
	});

	it("should throw for records missing keys", () => {
		expect(() => assertRecordWithKeys({ a: 1 }, ["a", "b"])).toThrow(
			TypeError,
		);
	});

	it("should throw for non-records", () => {
		expect(() => assertRecordWithKeys(1, ["a", "b"])).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() =>
			assertRecordWithKeys({ a: 1 }, ["a", "b"], "custom message"),
		).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assertRecordWithKeys({ a: 1 }, ["a", "b"])).toThrow(
			"expected to be a record with keys a, b",
		);
	});
});

describe("assertArray", () => {
	it("should not throw for arrays", () => {
		expect(() => assertArray([])).not.toThrow();
		expect(() => assertArray([1, 2, 3])).not.toThrow();
	});

	it("should throw for non-arrays", () => {
		expect(() => assertArray(1)).toThrow(TypeError);
		expect(() => assertArray("a")).toThrow(TypeError);
		expect(() => assertArray({})).toThrow(TypeError);
	});

	it("should throw with a custom message", () => {
		expect(() => assertArray(1, "custom message")).toThrow("custom message");
	});

	it("should throw with a default message", () => {
		expect(() => assertArray(1)).toThrow("expected to be an array");
	});
});

describe("assertRecordOfType", () => {
	it("should not throw for a record of the correct type", () => {
		expect(() =>
			assertRecordOfType({ a: 1, b: 2 }, assertNumber),
		).not.toThrow();
	});

	it("should throw for a record with items of incorrect type", () => {
		expect(() => assertRecordOfType({ a: 1, b: "2" }, assertNumber)).toThrow(
			TypeError,
		);
	});

	it("should throw for a non-record", () => {
		expect(() => assertRecordOfType(1, assertNumber)).toThrow(TypeError);
	});
});

describe("assertArrayOfType", () => {
	it("should not throw for an array of the correct type", () => {
		expect(() => assertArrayOfType([1, 2, 3], assertNumber)).not.toThrow();
	});

	it("should throw for an array with items of incorrect type", () => {
		expect(() => assertArrayOfType([1, "2", 3], assertNumber)).toThrow(
			TypeError,
		);
	});

	it("should throw for a non-array", () => {
		expect(() => assertArrayOfType(1, assertNumber)).toThrow(TypeError);
	});
});

describe("assertOptionOfType", () => {
	it("should not throw for a value of the correct type", () => {
		expect(() => assertOptionOfType(1, assertNumber)).not.toThrow();
	});

	it("should not throw for undefined", () => {
		expect(() => assertOptionOfType(undefined, assertNumber)).not.toThrow();
	});

	it("should throw for a value of an incorrect type", () => {
		expect(() => assertOptionOfType("1", assertNumber)).toThrow(TypeError);
	});
});

describe("assertOneOf", () => {
	it("should not throw if value is one of the allowed values", () => {
		expect(() => assertOneOf(1, [1, 2, 3])).not.toThrow();
	});

	it("should throw if value is not one of the allowed values", () => {
		expect(() => assertOneOf(4, [1, 2, 3])).toThrow(TypeError);
	});

	it("should throw with a default message", () => {
		expect(() => assertOneOf(4, [1, 2, 3])).toThrow(
			"expected to be one of 1, 2, 3",
		);
	});
});

describe("assertOneOfType", () => {
	it("should not throw if value matches one of the asserts", () => {
		expect(() =>
			assertOneOfType(1, [assertString, assertNumber]),
		).not.toThrow();
		expect(() =>
			assertOneOfType("a", [assertString, assertNumber]),
		).not.toThrow();
	});

	it("should throw if value does not match any of the asserts", () => {
		expect(() => assertOneOfType(true, [assertString, assertNumber])).toThrow(
			TypeError,
		);
	});

	it("should throw with a default message", () => {
		expect(() => assertOneOfType(true, [assertString, assertNumber])).toThrow(
			"expected to be one of type",
		);
	});
});

describe("assertInstanceOf", () => {
	class MyClass {}
	it("should not throw for an instance of the given constructor", () => {
		expect(() => assertInstanceOf(new MyClass(), MyClass)).not.toThrow();
	});

	it("should throw for a non-instance", () => {
		expect(() => assertInstanceOf({}, MyClass)).toThrow(TypeError);
	});

	it("should throw with a default message", () => {
		expect(() => assertInstanceOf({}, MyClass)).toThrow(
			"expected to be an instance of given constructor",
		);
	});
});

describe("assertPromise", () => {
	it("should not throw for a Promise", () => {
		expect(() => assertPromise(new Promise(() => {}))).not.toThrow();
	});

	it("should throw for a non-Promise", () => {
		expect(() => assertPromise({})).toThrow(TypeError);
	});

	it("should throw with a default message", () => {
		expect(() => assertPromise({})).toThrow("expected to be a promise");
	});
});

describe("check", () => {
	const isNumber = check(assertNumber);
	it("should return true for a valid value", () => {
		expect(isNumber(1)).toBe(true);
	});

	it("should return false for an invalid value", () => {
		expect(isNumber("1")).toBe(false);
	});
});

describe("assertFieldsNotEmpty", () => {
	it("should not throw if specified fields are not empty", () => {
		expect(() =>
			assertFieldsNotEmpty({ a: 1, b: "2" }, ["a", "b"], "message"),
		).not.toThrow();
	});

	it("should throw if specified fields are null or undefined", () => {
		expect(() =>
			assertFieldsNotEmpty({ a: 1, b: null }, ["a", "b"], "message"),
		).toThrow(TypeError);
		expect(() =>
			assertFieldsNotEmpty({ a: 1, b: undefined }, ["a", "b"], "message"),
		).toThrow(TypeError);
	});

	it("should throw if the value itself is null or undefined", () => {
		expect(() => assertFieldsNotEmpty(null, ["a", "b"], "message")).toThrow(
			TypeError,
		);
		expect(() =>
			assertFieldsNotEmpty(undefined, ["a", "b"], "message"),
		).toThrow(TypeError);
	});

	it("should use a custom message function", () => {
		const message = (badProps: string[]) => `Fields ${badProps.join(", ")} are empty`;
		expect(() =>
			assertFieldsNotEmpty({ a: 1, b: null }, ["a", "b"], message),
		).toThrow("Fields b are empty");
	});
});

describe("mustExist", () => {
	it("should return the value if not null or undefined", () => {
		const obj = {};
		expect(mustExist(obj)).toBe(obj);
		expect(mustExist(0)).toBe(0);
		expect(mustExist("")).toBe("");
	});

	it("should throw if the value is null", () => {
		expect(() => mustExist(null)).toThrow(TypeError);
	});

	it("should throw if the value is undefined", () => {
		// While the type signature says T, it can be called with undefined
		expect(() => mustExist(undefined as any)).toThrow(TypeError);
	});

	it("should throw with a default message", () => {
		expect(() => mustExist(null)).toThrow("expected to be not null");
	});
});

describe("cast", () => {
	it("should return the same object", () => {
		const obj = {};
		expect(cast(obj)).toBe(obj);
	});
});
