import type { Falsy, Nullish, Primitive } from "./types.ts";
import type { SubType } from "./asserts.ts";

export function isBoolean(value: unknown): value is boolean
{
	return typeof value === "boolean";
}

export function isNumber(value: unknown): value is number
{
	return typeof value === "number";
}

export function isString(value: unknown): value is string
{
	return typeof value === "string";
}

export function isDate(value: unknown): value is Date
{
	return value instanceof Date;
}

export function isRecord(value: unknown): value is Record<string, unknown>
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[]
{
	return Array.isArray(value);
}

export function isFunction(value: unknown): value is Function
{
	return typeof value === "function";
}

export function isUndefined(value: unknown): value is undefined
{
	return typeof value === "undefined";
}

export function isNull(value: unknown): value is null
{
	return value === null;
}

export function isVoid(value: unknown): value is null | undefined
{
	return value === null || typeof value === "undefined";
}

export function isNullish(value: unknown): value is Nullish
{
	return value == null;
}

export function isFalsy(value: unknown): value is Falsy
{
	return !value;
}

export function isExactly<Input, Output>(
	input: Input,
	value: Output,
): input is SubType<Input, Output>
{
	return (input as unknown) === (value as unknown);
}

export function isConstructor<T>(
	value: unknown,
): value is new (
	...args: any[]
) => T
{
	return typeof value === "function" && value.prototype;
}

export function isPrimitive(val: unknown): val is Primitive
{
	if (val === null || val === undefined)
	{
		return true;
	}
	switch (typeof val)
	{
	case "string":
	case "number":
	case "bigint":
	case "boolean":
	case "symbol": {
		return true;
	}
	default:
		return false;
	}
}
