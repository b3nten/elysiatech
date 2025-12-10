import { css, ElysiaElement, html, ifDefined } from "./element";

export class ElysiaNumberInput extends ElysiaElement
{
	static get properties()
	{
		return {
			get: { type: Function },
			set: { type: Function },
			range: { type: Boolean, reflect: true, default: false },
			min: { type: Number, reflect: true },
			max: { type: Number, reflect: true },
			step: { type: Number, reflect: true },
		}
	}

	static styles = css`
		input {

		}
	`

	declare get: () => number;
	declare set?: (value: number) => void;
	declare range: boolean;
	declare min?: number;
	declare max?: number;
	declare step?: number;

	render()
	{
		return html`
			<input
				class=${this.set ? "writable" : "readonly"}
				type=${this.range ? "range" : "number"}
				.value=${this.get?.()}
				@input=${this.#onInput}
				.min=${ifDefined(this.min)}
				.max=${ifDefined(this.max)}
				.step=${ifDefined(this.step)}
			/>
		`
	}

	#onInput(e)
	{
		console.log(e)
	}
}
