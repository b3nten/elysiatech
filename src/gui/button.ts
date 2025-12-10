import { css, ElysiaElement, html } from "./element";

export class ElysiaButton extends ElysiaElement
{
	static styles = css`
		button {

		}
	`

	render()
	{
		return html`<button><slot></slot></button>`
	}
}
