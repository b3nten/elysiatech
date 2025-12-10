const expectedToBe = (type: string): string => `expected to be ${type}`;

export type WeakAssert = (input: unknown, message?: string) => void;

export type SubType<Input, Output> = Output extends Input ? Output : never;

export type Assert<Input = unknown, Output = Input> = (
	input: Input,
	message?: string,
) => asserts input is SubType<Input, Output>;

export type Check<Input = unknown, Output = Input> = (
	input: Input,
) => input is SubType<Input, Output>;

export function assert(condition: any, message?: string): asserts condition
{
	if (!condition)
	{
		throw new TypeError(message ?? "Assertion failed");
	}
}

export function assertUnreachable(
	_input: never,
	message: string = expectedToBe("unreachable"),
): never
{
	throw new TypeError(message);
}

export function assertNotNull<T>(
	input: null | T,
	message: string = expectedToBe("not null"),
): asserts input is T
{
	assert(input !== null, message);
}

export function assertNotUndefined<T>(
	input: undefined | T,
	message: string = expectedToBe("not undefined"),
): asserts input is T
{
	assert(input !== undefined, message);
}

export function assertNotVoid<T>(
	input: T,
	message: string = expectedToBe("neither null nor undefined"),
): asserts input is Exclude<T, undefined | null | undefined>
{
	assert(input !== null && input !== undefined, message);
}

export function assertExactly<Input, Output>(
	input: Input,
	value: Output,
	message = expectedToBe(`exactly ${value}`),
): asserts input is SubType<Input, Output>
{
	assert((input as unknown) === (value as unknown), message);
}

export function assertBoolean(
	input: unknown,
	message: string = expectedToBe("a boolean"),
): asserts input is boolean
{
	assert(typeof input === "boolean", message);
}

export function assertNumber(
	input: unknown,
	message: string = expectedToBe("a number"),
): asserts input is number
{
	assert(typeof input === "number", message);
}

export function assertString(
	input: unknown,
	message: string = expectedToBe("a string"),
): asserts input is string
{
	assert(typeof input === "string", message);
}

export function assertDate(
	input: unknown,
	message: string = expectedToBe("a Date"),
): asserts input is Date
{
	assert(input instanceof Date, message);
}

export function assertRecord(
	input: unknown,
	message: string = expectedToBe("a record"),
): asserts input is Record<string, unknown>
{
	assert(typeof input === "object", message);
	assert(!Array.isArray(input), message);
	assertNotNull(input, message);
	for (const key of Object.keys(input as Record<string, unknown>))
	{
		assertString(key, message);
	}
}

export function assertRecordWithKeys<K extends string>(
	input: unknown,
	keys: K[],
	message = expectedToBe(`a record with keys ${keys.join(", ")}`),
): asserts input is {
	readonly [Key in K]: unknown;
}
{
	assertRecord(input, message);
	for (const key of keys)
	{
		assertNotUndefined(input[key], message);
	}
}

export function assertArray(
	input: unknown,
	message: string = expectedToBe("an array"),
): asserts input is unknown[]
{
	assert(Array.isArray(input), message);
}

export function assertRecordOfType<T>(
	input: unknown,
	assertT: Assert<unknown, T>,
	message = expectedToBe("a record of given type"),
	itemMessage = expectedToBe("of given type"),
): asserts input is Record<string, T>
{
	assertRecord(input, message);
	for (const item of Object.values(input))
	{
		assertT(item, itemMessage);
	}
}

export function assertArrayOfType<T>(
	input: unknown,
	assertT: Assert<unknown, T>,
	message = expectedToBe("an array of given type"),
	itemMessage = expectedToBe("of given type"),
): asserts input is T[]
{
	assertArray(input, message);
	for (const item of input)
	{
		assertT(item, itemMessage);
	}
}

export function assertOptionOfType<Input, Output>(
	input: Input | undefined,
	assertT: Assert<Input, Output>,
	message = expectedToBe("option of given type"),
): asserts input is SubType<Input, Output | undefined>
{
	if (input === undefined)
	{
		return;
	}
	assertT(input, message);
}

export function assertOneOf<Input, Output>(
	input: Input,
	values: readonly Output[],
	message: string = expectedToBe(`one of ${values.join(", ")}`),
): asserts input is SubType<Input, Output>
{
	assert(values.includes(input as SubType<Input, Output>), message);
}

export function assertOneOfType<T>(
	input: unknown,
	assertT: Assert<unknown, T>[],
	message: string = expectedToBe("one of type"),
	itemMessage?: string,
): asserts input is T
{
	for (const assert of assertT)
	{
		try
		{
			(assert as WeakAssert)(input as T, itemMessage);
			return;
		}
		catch (_)
		{}
	}
	throw new TypeError(message);
}

export function assertInstanceOf<T>(
	input: unknown,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor: new (...args: any[]) => T,
	message = expectedToBe("an instance of given constructor"),
): asserts input is T
{
	assert(input instanceof constructor, message);
}

export function assertPromise(
	input: unknown,
	message = expectedToBe("a promise"),
): asserts input is Promise<unknown>
{
	assertInstanceOf(input, Promise, message);
}

export function check<Input, Output>(
	assertT: Assert<Input, Output>,
): Check<Input, Output>
{
	return (input: Input): input is SubType<Input, Output> =>
	{
		try
		{
			assertT(input);
			return true;
		}
		catch (_)
		{
			return false;
		}
	};
}

export function assertFieldsNotEmpty<T, K extends keyof T>(
	value: T,
	fields: K[],
	message: string | ((badProps: K[]) => string),
): asserts value is T & { [Key in K]-?: NonNullable<T[Key]> }
{
	const emptyProps = fields.filter((prop) => value[prop] == null);
	if (value == null || emptyProps.length > 0)
	{
		const msg = typeof message === "function" ? message(emptyProps) : message;
		throw new TypeError(msg);
	}
}

export function mustExist<T>(
	value: T,
	message: string = expectedToBe("not null"),
): NonNullable<T>
{
	assertNotVoid(value, message);
	return value as NonNullable<T>;
}

export function cast<T>(obj: any): T
{
	return obj as T
}
