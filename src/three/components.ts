import type { Component } from "../ecs/mod";

/**
 * Convention for flagging an entity with a sibling Camera component as the active camera.
 */
export class ActiveCameraComponent implements Component {}
