import type { Serializable } from "../lib/types";
import { Asset } from "./asset";

export class JSONAsset extends Asset<Serializable> 
{
	constructor(private url: string) 
	{
		super();
	}
	override async loadImpl(): Promise<Serializable> 
	{
		const res = await fetch(this.url);
		if (!res.ok) throw new Error(`Failed to load JSON asset: ${this.url}`);
		return res.json();
	}
}
