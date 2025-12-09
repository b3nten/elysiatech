export const lerp = (a: number, b: number, t: number): number =>
	a + (b - a) * t;

export const slerp = (a: number, b: number, t: number): number =>
	a + ((b - a) * (1 - Math.cos(t * Math.PI))) / 2;

/**
 * Improved lerp for smoothing that prevents overshoot and is frame rate independent.
 * - from https://theorangeduck.com/page/spring-roll-call
 * @param start - The value to start from. Can be a number or Vector.
 * @param end	- The value to end at. Can be a number or Vector.
 * @param delta - Frame delta time.
 * @param halflife - The half-life of decay (smoothing)
 * @returns If smoothing number, returns the smoothed number. If smoothing Vector, returns void.
 */
export function lerpSmooth(
	start: number,
	end: number,
	delta: number,
	halflife: number,
): number 
{
	return lerp(start, end, -Math.expm1(-(Math.LN2 * delta) / (halflife + 1e-5)));
}
