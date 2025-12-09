import { FreeLookComponent, InfiniteGridHelper, Transform, ActiveCameraComponent, ThreeRenderSystem, GLTFAsset } from "elysiatech/three"
import { AmbientLight, BoxGeometry, Color, Mesh, MeshStandardMaterial, PerspectiveCamera } from "three"
import { Engine } from "elysiatech/engine"
import type { World } from "elysiatech/ecs"
import { cast, mustExist } from "elysiatech/lib/asserts"
import { AssetLoader } from "elysiatech/asset"

const assets = await new AssetLoader({
	dummy: new GLTFAsset("/Dummy.glb")
})

const canvas = cast<HTMLCanvasElement>(mustExist(document.getElementById("viewport")))

function init(world: World)
{
	world.addSystem(ThreeRenderSystem)
	// env
	world.addSingletonComponents(
		new AmbientLight("white", 2),
		new InfiniteGridHelper(1, 1, undefined, 100)
	)

	// camera
	world.createEntityWith(
		new Transform().setPosition(0, 0, 5),
		new PerspectiveCamera(75, devicePixelRatio, 0.1, 1000),
		new ActiveCameraComponent(),
		new FreeLookComponent(),
	);

	console.log(assets.dummy.unwrap().clone())

	// box
	world.createEntityWith(
		new Transform(),
		// new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0x00ff00 })),
		assets.dummy.unwrap().clone()
	);
}

new Engine({ canvas, init }).run()
