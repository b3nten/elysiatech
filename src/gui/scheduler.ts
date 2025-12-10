export class Scheduler
{
	static components: Set<() => void> = new Set();

	static subscribe(updateFunction: () => void)
	{
		Scheduler.components.add(updateFunction);
	}

	static unsubscribe(updateFunction: () => void)
	{
		Scheduler.components.delete(updateFunction);
	}

	static update()
	{
		requestAnimationFrame(Scheduler.update);
		for(const component of Scheduler.components)
		{
			component();
		}
	}

	static
	{
		if(typeof document !== "undefined")
		{
			requestAnimationFrame(Scheduler.update);
		}
	}
}
