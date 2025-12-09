import { Scene } from "three";
import { System } from "../ecs/system";
import { assert } from "../lib/asserts";
import { threeObjectTag } from "./objtag";
import { Transform } from "./transform";
import { Object3D } from "three/webgpu";
import { Instrumentor } from "../lib/instrument";
import type { World } from "../ecs/world";
import type { EntityID } from "../ecs/entity";
import type { Component } from "../ecs/component";

/**
 * This system syncs the ECS world with a {@link Three.Scene}.
 * Any components tagged with {@link ThreeObjectTag} are synced with the scene,
 * and their transforms are synced with their entity's {@link Transform} component.
 * This should run after other systems modify Three.js components and transforms,
 * and before any render systems.
 *
 * Requires a {@link SceneComponent } to be present in the world on startup.
 */
export class ThreeObjectSystem extends System
{
	get scene()
	{
		let scene = this.world.getSingletonComponent(Scene);
		assert(!!scene, "ThreeObjectSystem requires a ThreeScene singleton");
		return scene;
	}

	override startup()
	{
		this.scene.userData.elysiaEcsWorld = this.world;
		for (const [entity, threeObject] of this.world.tagIterator(threeObjectTag))
		{
			if ((<any>threeObject).transformless || this.world.hasComponent(entity, Transform))
			{
				let o3d: Object3D = threeObject instanceof Object3D ? threeObject : (<any>threeObject).object3d;
				o3d.matrixWorldAutoUpdate = false;
				this.scene.add(o3d);
			}
		}

		this.whenShutdown(
			this.world.onComponentWithTagAdded(threeObjectTag, this.onAddThreeObject),
			this.world.onComponentWithTagRemoved(
				threeObjectTag,
				this.onRemoveThreeObject,
			),
			this.world.onComponentAdded(Transform, this.onTransformAdded),
			this.world.onComponentRemoved(Transform, this.onTransformRemoved),
		);
	}

	override update(delta: number)
	{
		Instrumentor.start("ThreeObjectSystem::update");
		for (let [entity, transformComponent] of this.world.componentIterator(Transform))
		{
			const matrix = Transform.calculateWorldMatrix(this.world, entity);
			for (const o3d of this.world.componentTagIterator(entity, threeObjectTag))
			{
				if (o3d instanceof Object3D)
				{
					o3d.matrixWorld.copy(matrix);
					o3d.matrixWorld.decompose(o3d.position, o3d.quaternion, o3d.scale);
				}
			}
		}
		Instrumentor.end("ThreeObjectSystem::update");
	}

	protected onAddThreeObject = (world: World, entity: EntityID, threeObject: Component) =>
	{
		if (world.hasComponent(entity, Transform))
		{
			this.addToScene(threeObject, entity);
		}
	};

	protected onRemoveThreeObject = (world: World, entity: EntityID, threeObject: Component) =>
	{
		this.removeFromScene(threeObject);
	};

	protected onTransformAdded = (world: World, entity: EntityID) =>
	{
		for (const threeObject of world.componentTagIterator(entity, threeObjectTag))
		{
			this.addToScene(threeObject, entity);
		}
	};

	protected onTransformRemoved = (
		world: World,
		entity: EntityID,
		component: Transform,
	) =>
	{
		for (const threeObject of world.componentTagIterator(entity, threeObjectTag))
		{
			this.removeFromScene(threeObject);
		}
	};

	protected addToScene(threeObject: any, entity: EntityID)
	{
		let o3d: Object3D = threeObject instanceof Object3D ? threeObject : (<any>threeObject).object3d;
		assert(!o3d.userData.owningEntity, "ThreeObject is already added to scene");
		o3d.matrixWorldAutoUpdate = false;
		o3d.userData.owningEntity = entity;
		this.scene.add(o3d);
	}

	protected removeFromScene(threeObject: any)
	{
		let o3d: Object3D = threeObject instanceof Object3D	? threeObject : (<any>threeObject).object3d;
		o3d.userData.owningEntity = null;
		this.scene.remove(o3d);
	}
}
