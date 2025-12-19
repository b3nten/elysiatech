import type { Camera, Scene, WebGLRenderer } from "three"
import type { Viewport } from "../three/mod"
import { World } from "../mod"
import { WebGPURenderer } from "three/webgpu";

export interface IRenderPipeline
{
	/** Create a custom webgl renderer, or else use the default */
	createRenderer?(canvas: HTMLCanvasElement, world: World): WebGLRenderer | WebGPURenderer
	/** Configure the WebglRenderer, or else use provided default configuration. */
	configure?(renderer: WebGLRenderer | WebGPURenderer, world: World): void
	render?(
		delta: number,
		scene: Scene,
		camera: Camera,
		renderer: WebGLRenderer | WebGPURenderer,
		viewport: Viewport
	): void
}
