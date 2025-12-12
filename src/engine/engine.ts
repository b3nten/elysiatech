import { Camera, PCFSoftShadowMap, Scene, WebGLRenderer } from "three"
import { FreeLookControlSystem, ThreeObjectSystem, ThreeRenderSystem, Transform, Viewport } from "../three/mod"
import { ActorSystem, World } from "../ecs/mod"
import { Frameloop } from "../lib/mod"
import { clamp } from "../math/mod"
import type { IRenderPipeline } from "./render"

export type EngineArgs = {
	renderPipeline?: IRenderPipeline;
	init(world: World): void,
	canvas?: HTMLCanvasElement
}

export class Engine
{
	renderPipeline?: IRenderPipeline
	init: (world: World) => void;
	canvas: HTMLCanvasElement

	constructor(args: EngineArgs)
	{
		this.init = args.init
		this.renderPipeline = args.renderPipeline
		this.canvas = args.canvas ?? this.createCanvas()
	}

	run = (): Frameloop =>
	{
		const world = new World();
		this.setupCoreComponents(world);
		this.init(world)
		this.setupCoreSystems(world);
		world.startup();
		return new Frameloop(world.update);
	}

	setupCoreSystems = (world: World) =>
	{
		world.addSystem(ActorSystem)
		world.addSystem(FreeLookControlSystem)
		world.addSystem(ThreeObjectSystem);
		this.createRenderer(world);
	}

	setupCoreComponents = (world: World) =>
	{
		const renderer = this.renderPipeline?.createRenderer?.(this.canvas, world)
			?? new WebGLRenderer({
				canvas: this.canvas,
				antialias: true,
				powerPreference: "high-performance",
				precision: "highp"
			})

		if(this.renderPipeline?.configure)
		{
			this.renderPipeline.configure(renderer, world)
		}
		else
		{
			renderer.setPixelRatio(clamp(devicePixelRatio, 1, 2))
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = PCFSoftShadowMap;
		}

		world.addSingletonComponents(
			Viewport.fullScreenCanvas(this.canvas),
			renderer,
			new Scene(),
			new Transform(),
		);
	}

	createCanvas = (): HTMLCanvasElement =>
	{
		const canvas = document.createElement("canvas");
		canvas.style.position = "absolute";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		canvas.style.zIndex = "-1";
		document.body.appendChild(canvas);
		return canvas;
	}

	createRenderer = (world: World) =>
	{
		const self = this;
		world.addSystem(class extends ThreeRenderSystem
		{
			render(delta: number, scene: Scene, camera: Camera, renderer: WebGLRenderer, viewport: Viewport): void
			{
				(self.renderPipeline?.render ?? super.render)(delta, scene, camera, renderer, viewport)
			}
		});
	}
}
