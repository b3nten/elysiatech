import { LitElement, TemplateResult, html, css, svg, PropertyValues } from "lit";
import { property, query, customElement } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js"
import { isFunction } from "../lib/mod";
import { Scheduler } from "./scheduler";

/**
 * Immediate mode Custom Element base class.
 * Values in the render output are compared automatically.
 * Functions are compared by name, arrays are compared element-wise, and objects are compared via strict equality.
 */
export class ElysiaElement extends LitElement
{
	/**
 	 * Called when the component is mounted, before it's elements are rendered into the dom.
   */
	onMount?(): void;
	/**
 	 * Called when the component is mounted, after it's elements are rendered into the dom.
   */
	onMounted?(): void;
	/**
 	 * Called when the component is updated.
	 */
	onUpdate?(): void;
	/**
 	 * Called when the component is unmounted.
	 */
	onUnmount?(): void;

	connectedCallback()
	{
		super.connectedCallback();
		this.onMount?.()
		Scheduler.subscribe(this.#diff.bind(this));
	}

	protected firstUpdated(_changedProperties: PropertyValues): void
	{
		super.firstUpdated(_changedProperties)
		this.onMounted?.()
	}

	protected updated(_changedProperties: PropertyValues): void
	{
		super.updated(_changedProperties)
    this.onUpdate?.()
	}

	disconnectedCallback()
	{
		super.disconnectedCallback()
		this.onUnmount?.()
	}

	#compareRenderOutput(a: unknown[] | TemplateStringsArray, b: unknown[] | TemplateStringsArray): boolean
	{
		// if the lengths are different, we know the values are different and bail early
		if (a.length !== b.length)
		{
			return true;
		}

		for (let i = 0; i < a.length; i++) {
			const prev = a[i], next = b[i];

			// functions are compared by name
			if (isFunction(prev) && isFunction(next))
			{
				if (prev.name !== next.name)
				{
					return true;
				}
				else
				{
					continue;
				}
			}

			// lit template results are compared by their values
			if (isLitTemplateResult(prev) && isLitTemplateResult(next))
			{
				return this.#compareRenderOutput(prev.values, next.values) && this.#compareRenderOutput(prev.strings, next.strings);
			}

			// arrays are deeply compared
			if (Array.isArray(prev) && Array.isArray(next))
			{
				return this.#compareRenderOutput(prev, next);
			}

			// strict equality check
			if (a[i] !== b[i])
			{
				return true;
			}
		}

		return false;
	}

	#diff() {
		const renderResult = this.render();
		if (isLitTemplateResult(renderResult))
		{
			if (this.#compareRenderOutput(renderResult.values, this.#lastRenderValues))
			{
				this.requestUpdate();
				this.#lastRenderValues = renderResult.values;
			}
		}
	}

	#lastRenderValues: unknown[] = [];
}

function isLitTemplateResult(value: unknown): value is TemplateResult {
	return !!value && (typeof value === "object") && ("_$litType$" in value);
}

export {
	property,
	query,
	html,
	html as h,
	css,
	css as c,
	svg,
	ifDefined,
	customElement as component,
};
