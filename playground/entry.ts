import * as Three from "three"
import {
	Engine,
	AssetLoader,
	FreeLookComponent,
	InfiniteGridHelper,
	Transform,
	ActiveCameraComponent,
	GLTFAsset,
	World,
	cast,
	mustExist
} from "elysiatech/mod"

const assets = await new AssetLoader({
	dummy: new GLTFAsset("/Dummy.glb")
})

const canvas = cast<HTMLCanvasElement>(mustExist(document.getElementById("viewport")))

function init(world: World) {
	// env
	world.addSingletonComponents(
		new Three.AmbientLight("white", 2),
		new InfiniteGridHelper(1, 1, undefined, 100)
	)
	// camera
	world.createEntityWith(
		new Transform().setPosition(0, 0, 5),
		new Three.PerspectiveCamera(75, devicePixelRatio, 0.1, 1000),
		new ActiveCameraComponent(),
		new FreeLookComponent(),
	);
	// box
	world.createEntityWith(
		new Transform(),
		assets.dummy.unwrap().clone()
	);
}

new Engine({ canvas, init }).run()
