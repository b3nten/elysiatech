import { Clock } from "./clock";

export class Frameloop 
{
	stopped = false;
	paused = false;
	clock = new Clock();

	constructor(updateFunction: (frametime: number, elapsed: number) => void) 
	{
		this.clock.capture();
		this.#frameLoopUpdate = () => 
		{
			if (this.stopped) return;
			if (!this.paused) 
			{
				this.clock.capture();
				updateFunction(this.clock.delta, this.clock.elapsed);
			}
			requestAnimationFrame(this.#frameLoopUpdate);
		};
		requestAnimationFrame(this.#frameLoopUpdate);
	}

	pause = () => 
	{
		this.paused = true;
	};

	resume = () => 
	{
		this.paused = false;
	};

	stop = () => 
	{
		this.stopped = true;
	};

	readonly #frameLoopUpdate: () => void;
}
