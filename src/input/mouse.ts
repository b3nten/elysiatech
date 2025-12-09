import { createEvent } from "../events/create";

/**
 * Enum for key codes, corresponding to the MouseEvent.button property.
 */
export enum MouseCode {
	/**
	 * key code of mouse left
	 */
	MouseLeft = 0,

	/**
	 * key code of mouse middle
	 */
	MouseMiddle = 1,

	/**
	 * key code of mouse right
	 */
	MouseRight = 2,

	/**
	 * key code of mouse four (back)
	 */
	MouseFour = 3,

	/**
	 * key code of mouse five (forward)
	 */
	MouseFive = 4,
}

export interface MouseButtonEvent
	extends Pick<
		MouseEvent,
		"shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "timeStamp" | "x" | "y"
	> {
	button: MouseCode;
	down: boolean;
	spaceKey: boolean;
}

export interface MouseMoveEvent
	extends Pick<
		MouseEvent,
		"shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "timeStamp" | "x" | "y"
	> {
	spaceKey: boolean;
	deltaX: number;
	deltaY: number;
	movementX: number;
	movementY: number;
}

export const MouseMoveEvent = createEvent<MouseMoveEvent>("MouseUpEvent");
export const MouseDownEvent = createEvent<MouseButtonEvent>("MouseDownEvent");
export const MouseUpEvent = createEvent<MouseButtonEvent>("MouseUpEvent");
