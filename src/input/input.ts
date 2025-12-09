import { EventManager } from "../events/mod";
import { KeyCode, KeyDownEvent, KeyPressedEvent, KeyUpEvent } from "./keyboard.ts";
import { MouseCode, MouseDownEvent, MouseMoveEvent, MouseUpEvent } from "./mouse.ts";

export class Input
{
	static
	{
		if (false)
		{
			// todo: handle case in worker
		}
		else
		{
			// mouse move
			window.addEventListener("mousemove", (event: any) =>
			{
				Input.mouseDeltaX = Input.mouseX - event.clientX;
				Input.mouseDeltaY = Input.mouseY - event.clientY;
				Input.mouseX = event.clientX;
				Input.mouseY = event.clientY;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				event.acceleration = mouseVector;
				event.deltaX = Input.mouseDeltaX;
				event.deltaY = Input.mouseDeltaY;
				Input.eventManager.notify(MouseMoveEvent, event);
			});
			// mouse down
			window.addEventListener("mousedown", (event: any) =>
			{
				Input.mousesDown.add(event.button);
				event.down = true;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.eventManager.notify(MouseDownEvent, event);
			});
			// mouse up
			window.addEventListener("mouseup", (event: any) =>
			{
				Input.mousesDown.delete(event.button);
				event.down = false;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.eventManager.notify(MouseUpEvent, event);
			});
			// key down
			window.addEventListener("keydown", (event: any) =>
			{
				Input.keysDown.add(<KeyCode>event.code);
				event.down = true;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.eventManager.notify(KeyDownEvent, event);
			});
			// key up
			window.addEventListener("keyup", (event: any) =>
			{
				Input.keysDown.delete(<KeyCode>event.code);
				event.down = false;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.eventManager.notify(KeyUpEvent, event);
			});
			// key pressed
			window.addEventListener("keypress", (event: any) =>
			{
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.eventManager.notify(KeyPressedEvent, event);
			});
		}
	}

	/** Mouse position in X (horizontal) direction */
	static mouseX = 0;

	get mouseX()
	{
		return Input.mouseX;
	}

	/** Mouse position in Y (vertical) direction */
	static mouseY = 0;

	get mouseY()
	{
		return Input.mouseY;
	}

	static mouseDeltaX = 0;

	get mouseDeltaX()
	{
		return Input.mouseDeltaX;
	}

	static mouseDeltaY = 0;

	get mouseDeltaY()
	{
		return Input.mouseDeltaY;
	}

	/** Get whether a mouse button is currently pressed */
	static mouseDown(button: MouseCode): boolean
	{
		return Input.mousesDown.has(button);
	}

	mouseDown(button: MouseCode): boolean
	{
		return Input.mouseDown(button);
	}

	/** Get whether a key is currently pressed */
	static keyDown(keyCode: KeyCode): boolean
	{
		return Input.keysDown.has(keyCode);
	}

	keyDown(keyCode: KeyCode): boolean
	{
		return Input.keyDown(keyCode);
	}

	static eventManager = new EventManager();
	static on = this.eventManager.register;
	static off = this.eventManager.unregister;

	protected static keysDown = new Set<KeyCode>();
	protected static mousesDown = new Set<MouseCode>();
	protected onKeyDownCallbacks: Map<KeyCode, Function> = new Map();
}

const mouseVector = { x: 0, y: 0 };
