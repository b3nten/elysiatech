import { DataTexture, DataTextureLoader, Mesh, Texture, TextureLoader } from "three";
import { Asset } from "../asset/mod";
import { DRACOLoader, GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";

export class TextureAsset extends Asset<Texture>
{
	static TextureLoader: TextureLoader = new TextureLoader();
	constructor(private url: string)
	{
		super();
	}
	override loadImpl(): Promise<Texture>
	{
		return new Promise<Texture>((resolve, reject) =>
		{
			TextureAsset.TextureLoader.load(this.url, resolve, undefined, reject);
		});
	}
}

type GLTFAssetType = {
  gltf: GLTF;
  clone: () => GLTF["scene"];
};

export class GLTFAsset extends Asset<GLTFAssetType>
{
	static GLTFLoader: GLTFLoader = new GLTFLoader();
	static DracoLoader: DRACOLoader = new DRACOLoader();
	static setDracoDecoderPath(path: string)
	{
		GLTFAsset.DracoLoader.setDecoderPath(path);
		GLTFAsset.GLTFLoader.setDRACOLoader(GLTFAsset.DracoLoader);
	}
	constructor(private url: string)
	{
		super();
	}
	override loadImpl(): Promise<GLTFAssetType>
	{
		return new Promise<GLTFAssetType>((resolve, reject) =>
		{
			GLTFAsset.GLTFLoader.load(
				this.url,
				(gltf) => resolve({ gltf: gltf, clone: () => gltf.scene.clone(true) }),
				undefined,
				reject,
			);
		});
	}
}

export class DataTextureAsset extends Asset<DataTexture>
{
	static Loader: DataTextureLoader = new DataTextureLoader();
	constructor(public url: string)
	{
		super();
	}
	override loadImpl(): Promise<DataTexture>
	{
		return new Promise<DataTexture>((resolve, reject) =>
			DataTextureAsset.Loader.load(this.url, resolve, undefined, reject),
		);
	}
}
