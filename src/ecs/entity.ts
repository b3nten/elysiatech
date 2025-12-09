/** Entity IDs are unique integers that identify entities in the world. */
export type EntityID = number & { entity: true };

export class EntityDoesNotExistError extends Error
{
	constructor() {	super("Entity does not exist."); }
}

export const entityDoesNotExistError = new EntityDoesNotExistError();
