import { Asset } from "./asset";

export class ImageAsset extends Asset<HTMLImageElement> 
{
	constructor(private url: string) 
	{
		super();
	}
	override loadImpl(): Promise<HTMLImageElement> 
	{
		return new Promise<HTMLImageElement>((resolve, reject) => 
		{
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = this.url;
		});
	}
}
