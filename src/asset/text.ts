import { Asset } from "./asset";

export class TextAsset extends Asset<string> 
{
	constructor(private url: string) 
	{
		super();
	}
	override async loadImpl(): Promise<string> 
	{
		const res = await fetch(this.url);
		if (!res.ok) throw new Error(`Failed to load Text asset: ${this.url}`);
		return res.text();
	}
}
