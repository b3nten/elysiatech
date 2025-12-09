import { Camera, OrthographicCamera, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { System } from "../ecs/system";
import { Instrumentor } from "../lib/instrument";
import { warnOnce } from "../lib/logging";
import { Viewport } from "./viewport";
import type { EntityID } from "../ecs/entity";
import { ActiveCameraComponent } from "./components";

export class ThreeRenderSystem extends System
{
	override update(delta: number)
	{
		Instrumentor.start("ThreeBasicRenderSystem::update");

		Instrumentor.start("ThreeBasicRenderSystem::update::resolveComponents");

		const scene = this.world.getSingletonComponent(Scene);
		if (!scene)
		{
			return warnOnce( "ThreeBasicRenderSystem: Requires a SceneComponent. Skipping update.");
		}

		const renderer = this.world.getSingletonComponent(WebGLRenderer);
		if (!renderer)
		{
			return warnOnce("ThreeBasicRenderSystem: Requires a RendererComponent. Skipping update.");
		}

		const viewport = this.world.getSingletonComponent(Viewport);
		if (!viewport)
		{
			return warnOnce("ThreeBasicRenderSystem: Requires a Viewport component. Skipping update.");
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
				"ThreeBasicRenderSystem: Requires an ActiveCamera singleton attached to an entity with a sibling Camera component. Skipping update.",
			);
		}

		const camera = this.world.getComponent(cameraEntity!, PerspectiveCamera) ?? this.world.getComponent(cameraEntity!, OrthographicCamera);
		if (!camera)
		{
			return warnOnce(
				"ThreeBasicRenderSystem: The entity with the ActiveCameraComponent must also have a Camera component. Skipping update.",
			);
		}

		Instrumentor.end("ThreeBasicRenderSystem::update::resolveComponents");

		Instrumentor.start("ThreeBasicRenderSystem::update::updateCameraMatrix");

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

		Instrumentor.end("ThreeBasicRenderSystem::update::updateCameraMatrix");

		// update renderer dimensions
		Instrumentor.start("ThreeBasicRenderSystem::update::resize");

		if (this.cachedHeight !== viewport.height || this.cachedWidth !== viewport.width)
		{
			this.cachedHeight = viewport.height;
			this.cachedWidth = viewport.width;
			this.resize(viewport);
		}

		Instrumentor.end("ThreeBasicRenderSystem::update::resize");

		Instrumentor.start("ThreeBasicRenderSystem::update::render");

		this.render(delta, scene, camera, renderer, viewport);

		Instrumentor.end("ThreeBasicRenderSystem::update::render");

		Instrumentor.end("ThreeBasicRenderSystem::update");
	}

	/**
	 * Method for rendering the scene with the given camera.
	 * Can be extended for custom rendering logic.
	 * @param delta number
	 * @param scene {@link Scene}
	 * @param camera {@link Camera}
	 * @param viewport {@link Viewport}
	 */
	render(
		delta: number,
		scene: Scene,
		camera: Camera,
		renderer: WebGLRenderer,
		viewport: Viewport,
	)
	{
		Instrumentor.start("ThreeBasicRenderSystem::render");
		renderer.render(scene, camera);
		Instrumentor.end("ThreeBasicRenderSystem::render");
	}

	/**
	 * Method for when the viewport dimensions change.
	 * Can be extended for custom resize logic.
	 * @param viewport {@link Viewport}
	 */
	resize(viewport: Viewport)
	{
		let renderer = this.world.getSingletonComponent(WebGLRenderer);
		if (!renderer) 
		{
			warnOnce("ThreeBasicRenderSystem: No renderer found on SceneDataComponent. Cannot resize.");
		}
		else
		{
			renderer.setSize(viewport.width, viewport.height, false);
			renderer.setPixelRatio(viewport.pixelRatio);
		}
	}

	protected cachedWidth = 0;
	protected cachedHeight = 0;
}
