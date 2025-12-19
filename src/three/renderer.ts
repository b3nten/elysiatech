import { Camera, OrthographicCamera, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { System, type EntityID } from "../ecs/mod";
import { Instrumentor, warnOnce } from "../lib/mod";
import { Viewport } from "./viewport";
import { ActiveCameraComponent } from "./components";
import { WebGPURenderer } from "three/webgpu";

export class ThreeRenderSystem extends System
{
	override update(delta: number)
	{
		Instrumentor.start("ThreeRenderSystem::update");

		Instrumentor.start("ThreeRenderSystem::update::resolveComponents");

		const scene = this.world.getSingletonComponent(Scene);
		if (!scene)
		{
			return warnOnce( "ThreeRenderSystem: Requires a SceneComponent. Skipping update.");
		}

		const renderer = this.world.getSingletonComponent(WebGPURenderer) ?? this.world.getSingletonComponent(WebGLRenderer);
		if (!renderer)
		{
			return warnOnce("ThreeRenderSystem: Requires a Renderer. Skipping update.");
		}

		const viewport = this.world.getSingletonComponent(Viewport);
		if (!viewport)
		{
			return warnOnce("ThreeRenderSystem: Requires a Viewport component. Skipping update.");
		}

		let cameraEntity: EntityID | undefined;
		let activeCamera: ActiveCameraComponent | undefined;
		for (let [entity, activeCam] of this.world.componentIterator(ActiveCameraComponent))
		{
			cameraEntity = entity;
			activeCamera = activeCam;
			break;
		}

		if (!activeCamera)
		{
			return warnOnce(
				"ThreeRenderSystem: Requires an ActiveCamera singleton attached to an entity with a sibling Camera component. Skipping update.",
			);
		}

		const camera = this.world.getComponent(cameraEntity!, PerspectiveCamera) ?? this.world.getComponent(cameraEntity!, OrthographicCamera);
		if (!camera)
		{
			return warnOnce(
				"ThreeRenderSystem: The entity with the ActiveCameraComponent must also have a Camera component. Skipping update.",
			);
		}

		Instrumentor.end("ThreeRenderSystem::update::resolveComponents");

		Instrumentor.start("ThreeRenderSystem::update::updateCameraMatrix");

		if (camera instanceof PerspectiveCamera)
		{
			camera.aspect = viewport.ratio;
			camera.updateProjectionMatrix();
		}
		else if (camera instanceof OrthographicCamera)
		{
			camera.left = -1 * viewport.ratio;
			camera.right = viewport.ratio;
			camera.top = 1;
			camera.bottom = -1;
			camera.updateProjectionMatrix();
		}

		Instrumentor.end("ThreeRenderSystem::update::updateCameraMatrix");

		// update renderer dimensions
		if (this.cachedHeight !== viewport.height || this.cachedWidth !== viewport.width)
		{
			this.cachedHeight = viewport.height;
			this.cachedWidth = viewport.width;
			this.resize(viewport);
		}

		this.render(delta, scene, camera, renderer, viewport);

		Instrumentor.end("ThreeRenderSystem::update");
	}

	/**
	 * Method for rendering the scene with the given camera.
	 * Can be extended for custom rendering logic.
	 * @param delta number
	 * @param scene {@link Scene}
	 * @param camera {@link Camera}
	 * @param viewport {@link Viewport}
	 */
	render(delta: number, scene: Scene, camera: Camera, renderer: WebGLRenderer | WebGPURenderer, viewport: Viewport)
	{
		Instrumentor.start("ThreeRenderSystem::render");
		renderer.render(scene, camera);
		Instrumentor.end("ThreeRenderSystem::render");
	}

	/**
	 * Method for when the viewport dimensions change.
	 * Can be extended for custom resize logic.
	 * @param viewport {@link Viewport}
	 */
	resize(viewport: Viewport)
	{
		let renderer = this.world.getSingletonComponent(WebGPURenderer) ?? this.world.getSingletonComponent(WebGLRenderer);
		if (!renderer)
		{
			warnOnce("ThreeRenderSystem: No renderer found in world. Cannot resize.");
		}
		else
		{
			Instrumentor.start("ThreeRenderSystem::resize");

			renderer.setSize(viewport.width, viewport.height, false);
			renderer.setPixelRatio(viewport.pixelRatio);

			Instrumentor.end("ThreeRenderSystem::resize");
		}
	}

	protected cachedWidth = 0;
	protected cachedHeight = 0;
}
