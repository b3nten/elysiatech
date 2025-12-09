export class Instrumentor
{
	static start(name: string)
	{
		ELYSIA_INSTRUMENT: performance.mark(`${name}::start`);
	}

	static end(name: string)
	{
		ELYSIA_INSTRUMENT: 
		{
			performance.mark(`${name}::end`);
			performance.measure(name, `${name}::start`, `${name}::end`);
		}
	}

	constructor(public name: string)
	{
		ELYSIA_INSTRUMENT: Instrumentor.start(name);
	}

	end()
	{
		ELYSIA_INSTRUMENT: Instrumentor.end(this.name);
	}
}
