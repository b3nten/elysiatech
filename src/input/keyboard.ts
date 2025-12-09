import { createEvent } from "../events/create";

/**
 * Enum for key codes, corresponding to the KeyboardEvent.code property.
 */
export enum KeyCode {
	None = "KEY_NONE",

	A = "KeyA",
	B = "KeyB",
	C = "KeyC",
	D = "KeyD",
	E = "KeyE",
	F = "KeyF",
	G = "KeyG",
	H = "KeyH",
	I = "KeyI",
	J = "KeyJ",
	K = "KeyK",
	L = "KeyL",
	M = "KeyM",
	N = "KeyN",
	O = "KeyO",
	P = "KeyP",
	Q = "KeyQ",
	R = "KeyR",
	S = "KeyS",
	T = "KeyT",
	U = "KeyU",
	V = "KeyV",
	W = "KeyW",
	X = "KeyX",
	Y = "KeyY",
	Z = "KeyZ",

	One = "Digit1",
	Two = "Digit2",
	Three = "Digit3",
	Four = "Digit4",
	Five = "Digit5",
	Six = "Digit6",
	Seven = "Digit7",
	Eight = "Digit8",
	Nine = "Digit9",
	Zero = "Digit0",

	Minus = "Minus",
	Equal = "Equal",
	BracketLeft = "BracketLeft",
	BracketRight = "BracketRight",
	Backslash = "Backslash",
	Semicolon = "Semicolon",
	Quote = "Quote",
	Comma = "Comma",
	Period = "Period",
	Slash = "Slash",
	Backspace = "Backspace",
	Space = "Space",
	ControlLeft = "ControlLeft",
	MetaLeft = "MetaLeft",
	AltLeft = "AltLeft",
	ShiftLeft = "ShiftLeft",
	CapsLock = "CapsLock",
	Tab = "Tab",
	Esc = "Escape",
	Enter = "Enter",
	ControlRight = "ControlRight",
	MetaRight = "MetaRight",
	AltRight = "AltRight",
	ShiftRight = "ShiftRight",
	ContextMenu = "ContextMenu",
	Insert = "Insert",
	Delete = "Delete",
	Home = "Home",
	End = "End",
	PageUp = "PageUp",
	PageDown = "PageDown",
	NumLock = "NumLock",
	Clear = "Clear",

	ArrowUp = "ArrowUp",
	ArrowDown = "ArrowDown",
	ArrowLeft = "ArrowLeft",
	ArrowRight = "ArrowRight",
	PrintScreen = "PrintScreen",
}

export interface KeyboardKeyEvent
	extends Pick<
		KeyboardEvent,
		| "code"
		| "repeat"
		| "shiftKey"
		| "ctrlKey"
		| "altKey"
		| "metaKey"
		| "timeStamp"
	> {
	down: boolean;
	spaceKey: boolean;
}

export interface KeyboardKeyPressedEvent
	extends Pick<
		KeyboardEvent,
		"code" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "timeStamp"
	> {
	spaceKey: boolean;
}

export const KeyDownEvent = createEvent<KeyboardKeyEvent>("KeyDownEvent");
export const KeyUpEvent = createEvent<KeyboardKeyEvent>("KeyUpEvent");
export const KeyPressedEvent =
	createEvent<KeyboardKeyPressedEvent>("KeyPressedEvent");
