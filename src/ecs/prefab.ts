import type { EntityID } from "./entity";
import type { World } from "./world";

/**
 * Prefabs are a convention for functions that take in a World and return an entity.
 * This makes it easy to bundle components together and store them in an eaisally consumable format.
 */
export type Prefab = (world: World) => EntityID;

/**
 * Helper function to define a {@link Prefab}.
 * @param prefab
 * @returns
 */
export const createPrefab = (prefab: Prefab) => prefab;
