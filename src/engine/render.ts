import type { Camera, Scene, WebGLRenderer } from "three"
import type { Viewport } from "../three/mod"
import { World } from "../mod"

export interface IRenderPipeline
{
	/** Create a custom webgl renderer, or else use the default */
	createRenderer?(world: World): WebGLRenderer
	/** Configure the WebglRenderer, or else use provided default configuration. */
	configure?(renderer: WebGLRenderer, world: World): void
	render?(
		delta: number,
		scene: Scene,
		camera: Camera,
		renderer: WebGLRenderer,
		viewport: Viewport
	): void
}
