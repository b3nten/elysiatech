import type { Component } from "../ecs/mod";

type ViewportConstructorArgs = {
	width: number;
	height: number;
	devicePixelRatio: number;
	canvas: HTMLCanvasElement | OffscreenCanvas;
}

export class Viewport implements Component
{
	/** Viewport width in pixels */
	width: number;

	/** Viewport height in pixels */
	height: number;

	/** Pixel ratio, usually {@link devicePixelRatio} */
	pixelRatio: number;

	/** Canvas to output to, either en Element or an OffscreenCanvas */
	canvas: HTMLCanvasElement | OffscreenCanvas;

	/** Ratio of width / height */
	get ratio() { return this.width / this.height; }

	constructor(args: ViewportConstructorArgs)
	{
		this.width = args.width;
		this.height = args.height;
		this.pixelRatio = args.devicePixelRatio;
		this.canvas = args.canvas;
	}

	/**
	 * Create a fullscreen Viewport component that automatically resizes with the window.
	 * @param canvas
	 */
	static fullScreenCanvas(canvas: HTMLCanvasElement)
	{
		const viewport = new Viewport({
			width: window.innerWidth,
			height: window.innerHeight,
			devicePixelRatio: devicePixelRatio,
			canvas,
		});
		const weakref = new WeakRef(viewport);
		let handler = () =>
		{
			let v = weakref.deref();
			if (v)
			{
				v.width = window.innerWidth;
				v.height = window.innerHeight;
			}
			else
			{
				window.removeEventListener("resize", handler);
			}
		};
		window.addEventListener("resize", handler);
		return viewport;
	}
}
