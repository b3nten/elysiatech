import { Asset } from "./asset";

export class ArrayBufferAsset extends Asset<ArrayBuffer> 
{
	constructor(private url: string) 
	{
		super();
	}
	override async loadImpl(): Promise<ArrayBuffer> 
	{
		const r = await fetch(this.url);
		return await r.arrayBuffer();
	}
}
