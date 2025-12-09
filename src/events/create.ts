
export type EventType<T> = string & { type: T };

export type EventData<T extends EventType<any>> = T["type"];

export const createEvent = <T = undefined>(type: string): EventType<T> =>
	type as EventType<T>;

export const extractEventString = (event: EventType<any>): string => event;

export let createEventPayload = <T extends EventType<any>>(data: T["type"]) =>
	data;
