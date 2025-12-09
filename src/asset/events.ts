import { createEvent } from "../events/mod";
import type { AssetLoader } from "./loader";

export const progressEvent = createEvent<number>(
	"Elysia::AssetLoaderProgressEvent",
);
export const errorEvent = createEvent<Error>("Elysia::AssetLoaderErrorEvent");
export const loadedEvent = createEvent<AssetLoader<any>>(
	"Elysia::AssetLoaderLoadedEvent",
);
