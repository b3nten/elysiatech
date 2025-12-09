/**
 * Represents a data structure that can be attached to an entity that is indexed by its constructor.
 * Entities can only have one instance of each component.
 * @example
 * class Position2D implements Component {
 *   constructor(public x: number, public y: number) {}
 * }
 */
export type Component = Object;
