import { EventManager } from "../events/mod";
import { assert, type ConstructorOf } from "../lib/mod";
import type { Asset } from "./asset";
import { errorEvent, loadedEvent, progressEvent } from "./events";

export class AssetLoader<A extends Record<string, Asset<any>>> implements Promise<A>
{
	state: "idle" | "loading" | "loaded" | "error" = "idle";

	promise = Promise.withResolvers<A>();

	progress = 0;

	protected emitter = new EventManager();

	register = this.emitter.register.bind(this.emitter);

	unregister = this.emitter.unregister.bind(this.emitter);

	constructor(public assets: A) {}

	/**
	 * Initiates the loading process for all assets.
	 */
	async load(): Promise<A>
	{
		if (this.state === "loading" || this.state === "loaded")
		{
			return this.promise.promise;
		}

		// load asset
		this.state = "loading";

		let promises: Promise<unknown>[] = [];
		let settled = 0;

		for (const asset of Object.values(this.assets))
		{
			promises.push(
				asset
					.load()
					.then((a) =>
					{
						this.progress = ++settled / promises.length;
						this.emitter.notify(progressEvent, this.progress);
					})
					.catch((e) =>
					{
						this.state = "error";
						this.emitter.notify(errorEvent, e);
						this.promise.reject(e);
					}),
			);
		}

		try
		{
			await Promise.all(promises);
			this.state = "loaded";
			this.progress = 1;
			this.emitter.notify(loadedEvent, this);
			this.promise.resolve(this.assets);
		}
		catch
		{
			this.state = "error";
			this.emitter.notify(errorEvent, new Error("Failed to load assets"));
			this.promise.reject();
		}
		return this.promise.promise;
	}

	unwrap<T extends keyof A>(type: T): NonNullable<A[T]["data"]>;
	unwrap<T extends ConstructorOf<Asset<any>>>(
		type: T,
		key: string,
	): NonNullable<InstanceType<T>["data"]>;
	unwrap<T>(type: T, key?: string)
	{
		assert(
			this.state === "loaded",
			"Cannot unwrap asset from loader which is not loaded!",
		);
		if (typeof key === "string")
		{
			const maybeAsset = this.assets[key];
			if (!maybeAsset) throw new Error("Asset not found.");
			if (!(maybeAsset instanceof (type as ConstructorOf<Asset<any>>)))
				throw new Error("Asset type mismatch.");
			return maybeAsset.data;
		}
		const maybeAsset = this.assets[type as keyof A];
		if (!maybeAsset) throw new Error("Asset not found.");
		return maybeAsset.data;
	}

	/**
	 * Retrieves an asset instance by its key.
	 * @template T The type of the asset to retrieve.
	 * @param {T | string} a The key of the asset.
	 * @returns {[T] | T | undefined} The asset instance or undefined if not found.
	 */
	get<T extends keyof A>(a: T): A[T];
	get<T extends Asset<any>>(a: string): T | undefined;
	get<T extends Asset<any>>(a: string): T | undefined
	{
		return this.assets[a] as T;
	}

	// biome-ignore lint/suspicious/noThenProperty: <explanation>
	then<TResult1 = A, TResult2 = never>(
		onfulfilled?: ((value: A) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2>
	{
		if (this.state === "idle") this.load();
		return this.promise.promise.then(onfulfilled, onrejected);
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
	): Promise<A | TResult>
	{
		return this.promise.promise.catch(onrejected) as Promise<A | TResult>;
	}

	finally(onfinally?: (() => void) | null): Promise<A>
	{
		return this.promise.promise.finally(onfinally) as Promise<A>;
	}

	get [Symbol.toStringTag]()
	{
		return "Promise";
	}
}
