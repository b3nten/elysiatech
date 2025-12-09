import type { Camera, Scene, WebGLRenderer } from "three"
import type { Viewport } from "../three/mod"

export interface IRenderPipeline
{
	/** Create a custom webgl renderer, or else use the default */
	createRenderer?(): WebGLRenderer
	/** Configure the WebglRenderer, or else use provided default configuration. */
	configure?(renderer: WebGLRenderer): void
	render?(
		delta: number,
		scene: Scene,
		camera: Camera,
		renderer: WebGLRenderer,
		viewport: Viewport
	): void
}
