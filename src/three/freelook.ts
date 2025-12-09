import { Euler, Vector2, Vector3 } from "three";
import { type Component, System } from "../ecs/mod";
import { Input, KeyCode, KeyDownEvent, KeyUpEvent, MouseCode, MouseMoveEvent } from "../input/mod";
import { Transform } from "./transform";
import { isNumber } from "../lib/mod";
import { clamp } from "../math/mod";
import type { EventData } from "../events/mod";

export class FreeLookComponent implements Component
{
	velocity = new Vector3();
	euler = new Euler(0, 0, 0, "YXZ");
}

export class FreeLookControlSystem extends System
{
	static Directions = {
		FORWARD: 1 << 0,
		LEFT: 1 << 1,
		RIGHT: 1 << 2,
		BACK: 1 << 3,
		UP: 1 << 4,
		DOWN: 1 << 5,
		SPRINT: 1 << 6,
	}

	static Actions = {
		Forward: "FORWARD",
		Back: "BACK",
		Left: "LEFT",
		Right: "RIGHT",
		Up: "UP",
		Down: "DOWN",
		Sprint: "SPRINT",
	};

	static Defaults = {
		MoveSpeed: 15,
		Friction: 0.9,
		LookSpeed: 0.5,
		SprintMult: 5,
		Keymap: {
			[KeyCode.W]: FreeLookControlSystem.Actions.Forward,
			[KeyCode.S]: FreeLookControlSystem.Actions.Back,
			[KeyCode.A]: FreeLookControlSystem.Actions.Left,
			[KeyCode.D]: FreeLookControlSystem.Actions.Right,
			[KeyCode.ArrowUp]: FreeLookControlSystem.Actions.Forward,
			[KeyCode.ArrowDown]: FreeLookControlSystem.Actions.Back,
			[KeyCode.ArrowLeft]: FreeLookControlSystem.Actions.Left,
			[KeyCode.ArrowRight]: FreeLookControlSystem.Actions.Right,
			[KeyCode.Space]: FreeLookControlSystem.Actions.Up,
			[KeyCode.ControlLeft]: FreeLookControlSystem.Actions.Down,
			[KeyCode.ControlRight]: FreeLookControlSystem.Actions.Down,
			[KeyCode.ShiftLeft]: FreeLookControlSystem.Actions.Sprint,
			[KeyCode.ShiftRight]: FreeLookControlSystem.Actions.Sprint,
		},
	};

	lookSpeed = FreeLookControlSystem.Defaults.LookSpeed;
	moveSpeed = FreeLookControlSystem.Defaults.MoveSpeed;
	friction = FreeLookControlSystem.Defaults.Friction;
	sprintMultiplier = FreeLookControlSystem.Defaults.SprintMult;

	constructor(
		config: {
			lookSpeed?: number;
			moveSpeed?: number;
			friction?: number;
			sprintMultiplier?: number;
		} = {},
	)
	{
		super();
		this.lookSpeed = config.lookSpeed ?? this.lookSpeed;
		this.moveSpeed = config.moveSpeed ?? this.moveSpeed;
		this.friction = config.friction ?? this.friction;
		this.sprintMultiplier = config.sprintMultiplier ?? this.sprintMultiplier;
	}

	override startup()
	{
		this.whenShutdown(
			Input.on(MouseMoveEvent, this.onMouseMove),
			Input.on(KeyDownEvent, this.onKeyPress),
			Input.on(KeyUpEvent, this.onKeyPress),
		);
	}

	override update(delta: number)
	{
		for (let [, transform, freeLook] of this.world.componentIterator(Transform, FreeLookComponent))
		{
			rotation: if (Input.mouseDown(MouseCode.MouseLeft))
			{
				const movementX = this.mouseDelta.x ?? 0;
				const movementY = this.mouseDelta.y ?? 0;

				if (!isNumber(movementX) && !isNumber(movementY)) break rotation;

				freeLook.euler.y -= movementX * this.lookSpeed * delta;
				freeLook.euler.x -= movementY * this.lookSpeed * delta;
				freeLook.euler.x = clamp(freeLook.euler.x, -60, 60);

				// set transform rotation
				freeLook.euler.z = 0;
				transform.rotation.setFromEuler(freeLook.euler);
			}

			this.mouseDelta.x = 0;
			this.mouseDelta.y = 0;

			// movements
			let actualMoveSpeed = delta * this.moveSpeed;
			const { press } = this.keyState;
			if (press & FreeLookControlSystem.Directions.SPRINT)
			{
				actualMoveSpeed *= this.sprintMultiplier;
			}
			if (press & FreeLookControlSystem.Directions.FORWARD)
			{
				freeLook.velocity.z = -actualMoveSpeed;
			}
			if (press & FreeLookControlSystem.Directions.BACK)
			{
				freeLook.velocity.z = actualMoveSpeed;
			}
			if (press & FreeLookControlSystem.Directions.LEFT)
			{
				freeLook.velocity.x = -actualMoveSpeed;
			}
			if (press & FreeLookControlSystem.Directions.RIGHT)
			{
				freeLook.velocity.x = actualMoveSpeed;
			}
			if (press & FreeLookControlSystem.Directions.UP)
			{
				freeLook.velocity.y = actualMoveSpeed;
			}
			if (press & FreeLookControlSystem.Directions.DOWN)
			{
				freeLook.velocity.y = -actualMoveSpeed;
			}

			freeLook.velocity.multiplyScalar(this.friction);
			let veloLen = freeLook.velocity.length() || 1;
			freeLook.velocity.divideScalar(veloLen);
			freeLook.velocity.multiplyScalar(clamp(veloLen, 0, this.moveSpeed));
			transform.translateX(freeLook.velocity.x);
			transform.translateY(freeLook.velocity.y);
			transform.translateZ(freeLook.velocity.z);

			this.keyState.prevPress = press;
		}
	}

	override shutdown()
	{
		this.keyState.press = 0;
		this.keyState.prevPress = 0;
	}

	onMouseMove = (e: any) =>
	{
		this.mouseDelta.x = e.movementX;
		this.mouseDelta.y = e.movementY;
	};

	protected onKeyPress = (e: EventData<typeof KeyDownEvent> | EventData<typeof KeyUpEvent>) =>
	{
		const { press } = this.keyState;
		let isPressed = e.down;
		let newPress = press;
		switch (
			FreeLookControlSystem.Defaults.Keymap[
				e.code as keyof typeof FreeLookControlSystem.Defaults.Keymap
			]
		)
		{
		case FreeLookControlSystem.Actions.Forward:
			isPressed ? (newPress |= FreeLookControlSystem.Directions.FORWARD) : (newPress &= ~FreeLookControlSystem.Directions.FORWARD);
			break;
		case FreeLookControlSystem.Actions.Back:
			isPressed ? (newPress |= FreeLookControlSystem.Directions.BACK) : (newPress &= ~FreeLookControlSystem.Directions.BACK);
			break;
		case FreeLookControlSystem.Actions.Left:
			isPressed ? (newPress |= FreeLookControlSystem.Directions.LEFT) : (newPress &= ~FreeLookControlSystem.Directions.LEFT);
			break;
		case FreeLookControlSystem.Actions.Right:
			isPressed ? (newPress |= FreeLookControlSystem.Directions.RIGHT) : (newPress &= ~FreeLookControlSystem.Directions.RIGHT);
			break;
		case FreeLookControlSystem.Actions.Up:
			isPressed ? (newPress |= FreeLookControlSystem.Directions.UP) : (newPress &= ~FreeLookControlSystem.Directions.UP);
			break;
		case FreeLookControlSystem.Actions.Down:
			isPressed ? (newPress |= FreeLookControlSystem.Directions.DOWN) : (newPress &= ~FreeLookControlSystem.Directions.DOWN);
			break;
		case FreeLookControlSystem.Actions.Sprint:
			isPressed ? (newPress |= FreeLookControlSystem.Directions.SPRINT) : (newPress &= ~FreeLookControlSystem.Directions.SPRINT);
			break;
		default:
			break;
		}
		this.keyState.press = newPress;
	};

	protected mouseDelta = new Vector2();
	protected keyState = { press: 0, prevPress: 0 };
}
