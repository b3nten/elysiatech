import type { ConstructorOf } from "./types.ts";

/**
 * Creates an instance of a class with the given constructor and arguments.
 */
export function make<T, Args extends any[]>(
	ctor: ConstructorOf<T, Args>,
	...args: Args
): T 
{
	return new ctor(...args) as T;
}

/**
 * Runs a function and returns its result.
 * @param fn
 */
export function run<T>(fn: () => T) 
{
	return fn();
}

export type Result<T, E = unknown> =
	| { ok: true; value: T }
	| { ok: false; error: E };

export const Ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Runs a function and catches any errors, logging them to the console.
 * @param fn
 */
export function runSafe<T>(fn: () => T): T | undefined 
{
	try 
	{
		const result = fn();
		if (result instanceof Promise) 
		{
			return result.catch((e) => 
			{
				console.error(e);
			}) as T;
		}
		return result;
	}
	catch (e) 
	{
		console.error(e);
	}
}

/**
 * Runs a function and returns a Result indicating success or failure.
 * @param fn
 */
export function runCatching<T>(
	fn: () => T,
): T extends Promise<infer U> ? Promise<Result<U>> : Result<T> 
{
	try 
	{
		const result = fn();
		if (result instanceof Promise) 
		{
			return result.then(Ok).catch(Err) as any;
		}
		return Ok(result) as any;
	}
	catch (e) 
	{
		return Err(e) as any;
	}
}

/**
 * Runs a function that may return a Promise, and always returns a Promise.
 * @param fn
 */
export function runAsync<T>(fn: () => T | Promise<T>) 
{
	const result = fn();
	if (result instanceof Promise) 
	{
		return result;
	}
	return Promise.resolve(result);
}

/* A no-operation function that does nothing. */
export function noop() 
{}

/* Schedules a callback to run on the next tick of the event loop. */
export function runNextTick(callback: () => void) 
{
	setTimeout(callback, 0);
}

/* Schedules a callback to run on the next animation frame. */
export function runNextFrame(callback: () => void) 
{
	requestAnimationFrame(() => runNextTick(callback));
}

/* Runs an asynchronous function without awaiting its result. */
export function runAndForget<T>(callback: () => Promise<T>) 
{
	callback();
}

/* Gets the constructor of an object. */
export function constructorOf<T extends Object>(ctor: T): ConstructorOf<T> 
{
	return ctor.constructor as ConstructorOf<T>;
}

export function forEach<T>(
	iterable: Iterable<T>,
	callback: (item: T, index: number) => void,
): void 
{
	let index = 0;
	for (const item of iterable) 
	{
		callback(item, index++);
	}
}
