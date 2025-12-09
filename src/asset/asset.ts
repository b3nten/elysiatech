//  █████╗ ███████╗███████╗███████╗████████╗
// ██╔══██╗██╔════╝██╔════╝██╔════╝╚══██╔══╝
// ███████║███████╗███████╗█████╗     ██║
// ██╔══██║╚════██║╚════██║██╔══╝     ██║
// ██║  ██║███████║███████║███████╗   ██║
// ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝

export abstract class Asset<T> implements Promise<T> 
{
	state: "idle" | "loading" | "loaded" | "error" = "idle";

	data?: T;

	error?: unknown;

	promise = Promise.withResolvers<T>();

	unwrap = (): T => 
	{
		{
			if (this.state !== "loaded") 
			{
				throw Error(
					`unwrap() called on asset ${this.constructor.name} that is not loaded or has errored.`,
				);
			}
			if (!this.data) 
			{
				throw Error(
					`unwrap() called on asset ${this.constructor.name} that has no data.`,
				);
			}
			return this.data;
		}
		{
			return this.data!;
		}
	};

	load = (): Promise<T> => 
	{
		if (this.state === "loaded" || this.state === "loading") 
		{
			return this.promise.promise;
		}

		this.state = "loading";

		try 
		{
			this.loadImpl()
				.then((x) => 
				{
					if (x instanceof Error) 
					{
						this.error = x;
						this.state = "error";
						this.promise.reject(x);
					}
					else 
					{
						this.data = x;
						this.state = "loaded";
						this.promise.resolve(x);
					}
				})
				.catch((e) => 
				{
					this.error = e;
					this.state = "error";
					this.promise.reject(e);
				});
		}
		catch (e) 
		{
			this.error = e;
			this.state = "error";
			this.promise.reject(e);
		}

		return this.promise.promise;
	};

	abstract loadImpl(): Promise<T | Error>;

	protected destructor?(): void;

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> 
	{
		if (this.state === "idle") this.load();
		return this.promise.promise.then(onfulfilled, onrejected);
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
	): Promise<T | TResult> 
	{
		return this.promise.promise.catch(onrejected);
	}

	finally(onfinally?: (() => void) | null): Promise<T> 
	{
		return this.promise.promise.finally(onfinally);
	}

	get [Symbol.toStringTag]() 
	{
		return "Promise";
	}
}

declare global {
	interface PromiseConstructor {
		withResolvers<T>(): {
			promise: Promise<T>;
			resolve: (value: T | PromiseLike<T>) => void;
			reject: (reason?: unknown) => void;
		};
	}
}

if (typeof Promise.withResolvers === "undefined") 
{
	Promise.withResolvers = <T>() => 
	{
		let resolve: (value: T | PromiseLike<T>) => void;
		let reject: (reason?: unknown) => void;
		const promise = new Promise<T>((res, rej) => 
		{
			resolve = res;
			reject = rej;
		});
		return { promise, resolve: resolve!, reject: reject! };
	};
}
