/**
 * Clamp a value between a minimum and maximum value.
 * @param value
 * @param min
 * @param max
 */
export let clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

/**
 * Remap a value from one range to another.
 * @param value
 * @param fromMin
 * @param fromMax
 * @param toMin
 * @param toMax
 */
 export function remapRange(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number
 {
	const fromRange = fromMax - fromMin;
	const toRange = toMax - toMin;
	const scaledValue = (value - fromMin) / fromRange;
	return clamp(toMin + (scaledValue * toRange), toMin, toMax);
 }
