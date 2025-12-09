import { Object3D, Scene } from "three";

export const threeObjectTag = Symbol("ThreeObject");
// @ts-expect-error
Object3D.ecsTags = [threeObjectTag];
// @ts-expect-error
Scene.ecsTags = []
