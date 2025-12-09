import { lerp } from "../math/lerp.ts";
// @ts-expect-error
import supportsColor from "supports-color";

const colors = {
	purple: [
		[247, 81, 172],
		[55, 0, 231],
	],
	sunset: [
		[231, 0, 187],
		[255, 244, 20],
	],
	gray: [
		[150, 150, 150],
		[69, 69, 69],
	],
	orange: [
		[255, 147, 15],
		[255, 249, 91],
	],
	lime: [
		[89, 209, 2],
		[243, 245, 32],
	],
	blue: [
		[31, 126, 161],
		[111, 247, 232],
	],
	red: [
		[244, 7, 82],
		[249, 171, 143],
	],
} as const;

enum LogLevel {
  Debug = 100,
  Info = 200,
  Warn = 300,
  Error = 400,
  Critical = 500,
  Production = 999,
  Silent = 9999,
}

// ██╗    ██╗██████╗ ██╗████████╗███████╗██████╗ ███████╗
// ██║    ██║██╔══██╗██║╚══██╔══╝██╔════╝██╔══██╗██╔════╝
// ██║ █╗ ██║██████╔╝██║   ██║   █████╗  ██████╔╝███████╗
// ██║███╗██║██╔══██╗██║   ██║   ██╔══╝  ██╔══██╗╚════██║
// ╚███╔███╔╝██║  ██║██║   ██║   ███████╗██║  ██║███████║
//  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝

interface Writer {
  message(message: any[]): void;
  debug(message: any[]): void;
  info(message: any[]): void;
  success(message: any[]): void;
  warn(message: any[]): void;
  error(message: any[]): void;
  critical(message: any[]): void;
}

// ██████╗  █████╗ ███████╗██╗ ██████╗
// ██╔══██╗██╔══██╗██╔════╝██║██╔════╝
// ██████╔╝███████║███████╗██║██║
// ██╔══██╗██╔══██║╚════██║██║██║
// ██████╔╝██║  ██║███████║██║╚██████╗
// ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝

class BasicConsoleWriter implements Writer 
{
	constructor(private name: string) 
	{}

	message(message: any[]): void 
	{
		console.log(`${performance.now()} [${this.name}]`, ...message);
	}

	debug(message: any[]): void 
	{
		console.debug(`${performance.now()} [${this.name}] DEBUG`, ...message);
	}

	info(message: any[]): void 
	{
		console.info(`${performance.now()} [${this.name}] INFO`, ...message);
	}

	success(message: any[]): void 
	{
		console.log(`${performance.now()} [${this.name}] SUCCESS`, ...message);
	}

	warn(message: any[]): void 
	{
		console.warn(`${performance.now()} [${this.name}] WARN`, ...message);
	}

	error(message: any[]): void 
	{
		console.error(`${performance.now()} [${this.name}] ERROR`, ...message);
	}

	critical(message: any[]): void 
	{
		console.error(`${performance.now()} [${this.name}] CRITICAL`, ...message);
	}
}

// ███████╗ █████╗ ███╗   ██╗ ██████╗██╗   ██╗
// ██╔════╝██╔══██╗████╗  ██║██╔════╝╚██╗ ██╔╝
// █████╗  ███████║██╔██╗ ██║██║      ╚████╔╝
// ██╔══╝  ██╔══██║██║╚██╗██║██║       ╚██╔╝
// ██║     ██║  ██║██║ ╚████║╚██████╗   ██║
// ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝

// given a start and end color, and a t value between 0 and 1, return the color that is t percent between the start and end color
function interpolateRGB(
	startColor: Readonly<[number, number, number]>,
	endColor: Readonly<[number, number, number]>,
	t: number,
): Readonly<[number, number, number]> 
{
	if (t < 0) 
	{
		return startColor;
	}
	if (t > 1) 
	{
		return endColor;
	}
	return [
		Math.round(lerp(startColor[0], endColor[0], t)),
		Math.round(lerp(startColor[1], endColor[1], t)),
		Math.round(lerp(startColor[2], endColor[2], t)),
	];
}

function isBrowser() 
{
	return (
	//@ts-ignore
		typeof window !== "undefined" && typeof globalThis.Deno === "undefined"
	);
}

function formatAnsi(
	string: string,
	styles: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    foreground?: Readonly<[number, number, number]>;
    background?: Readonly<[number, number, number]>;
  } = {},
): { content: string; styles: never[] } 
{
	let c = "";
	if (styles.bold) c += "1;";
	if (styles.italic) c += "3;";
	if (styles.underline) c += "4;";
	if (styles.foreground) c += `38;2;${styles.foreground.join(";")};`;
	if (styles.background) c += `48;2;${styles.background.join(";")};`;
	while (c.endsWith(";")) c = c.slice(0, -1);
	return {
		content: `\x1b[${c}m${string}\x1b[0m\x1b[0m`,
		styles: [],
	};
}

function formatBrowser(
	string: string,
	options: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    foreground?: Readonly<[number, number, number]>;
    background?: Readonly<[number, number, number]>;
    size?: number;
  } = {},
) 
{
	const styles: string[] = [];
	if (options.bold) styles.push("font-weight: bold;");
	if (options.italic) styles.push("font-style: italic;");
	if (options.underline) styles.push("text-decoration: underline;");
	if (options.foreground)
		styles.push(`color: rgb(${options.foreground.join(", ")});`);
	if (options.background)
		styles.push(`background-color: rgb(${options.background.join(", ")});`);
	if (options.size) styles.push(`font-size: ${options.size}px;`);
	return {
		content: `%c${string}`,
		styles: [styles.join("")],
	};
}

function format(
	string: string,
	options = {},
): {
  content: string;
  styles: string[];
} 
{
	if (isBrowser()) return formatBrowser(string, options);
	return formatAnsi(string, options);
}

function stringGradient(
	str: string,
	gradient: Readonly<
    [Readonly<[number, number, number]>, Readonly<[number, number, number]>]
  >,
	options = {},
): { content: string; styles: string[] } 
{
	const result = {
		content: "",
		styles: [] as string[],
	};
	if (isBrowser()) 
	{
		result.content = `%c${str.split("").join("%c")}`;
		for (let i = 0; i < str.length; i++) 
		{
			const g = interpolateRGB(gradient[0], gradient[1], i / str.length);
			result.styles.push(
				formatBrowser(str[i], { ...options, foreground: g }).styles[0],
			);
		}
		return result;
	}
	for (let i = 0; i < str.length; i++) 
	{
		result.content += formatAnsi(str[i], {
			...options,
			foreground: interpolateRGB(gradient[0], gradient[1], i / str.length),
		}).content;
	}
	return result;
}

function toBoolean(val: any): boolean 
{
	return val ? val !== "false" : false;
}

function env(): any 
{
	// @ts-ignore - Node specific
	return (
		globalThis.process?.env ||
    // @ts-ignore - Deno specific
    import.meta.env ||
    // @ts-ignore - Browser specific
    globalThis.Deno?.env.toObject() ||
    // @ts-ignore - Browser specific
    globalThis.__env__ ||
    globalThis
	);
}

function isColorSupported(): boolean 
{
	return isBrowser() || supportsColor.stdout;
}

class FancyConsoleWriter implements Writer 
{
	formattedName: { content: string; styles: string[] };

	levels: Record<string, { content: string; styles: string[] }>;

	constructor(
    private name: string,
    color: Readonly<
      [Readonly<[number, number, number]>, Readonly<[number, number, number]>]
    >,
	) 
	{
		this.formattedName = stringGradient(`[ ${this.name} ]`, color);
		this.levels = {
			debug: stringGradient("DEBUG", colors.gray, { size: 12 }),
			info: stringGradient("INFO", colors.blue),
			success: stringGradient("SUCCESS", colors.lime),
			warn: stringGradient("WARN", colors.orange),
			error: stringGradient("ERROR", colors.red, { bold: true }),
			critical: format("  CRITICAL  ", {
				background: [255, 0, 0],
				size: 20,
			}),
		};
	}

	message(message: any[]): void 
	{
		console.log(
			`${this.formattedName.content}`,
			...this.formattedName.styles,
			...message,
		);
	}

	debug(message: any[]): void 
	{
		console.debug(
			`${this.formattedName.content} ${this.levels.debug.content}`,
			...this.formattedName.styles,
			...this.levels.debug.styles,
			...message,
		);
	}

	info(message: any[]): void 
	{
		console.info(
			`${this.formattedName.content} ${this.levels.info.content}`,
			...this.formattedName.styles,
			...this.levels.info.styles,
			...message,
		);
	}

	success(message: any[]): void 
	{
		console.log(
			`${this.formattedName.content} ${this.levels.success.content}`,
			...this.formattedName.styles,
			...this.levels.success.styles,
			...message,
		);
	}

	warn(message: any[]): void 
	{
		console.warn(
			`${this.formattedName.content} ${this.levels.warn.content}`,
			...this.formattedName.styles,
			...this.levels.warn.styles,
			...message,
		);
	}

	error(message: any[]): void 
	{
		console.error(
			`${this.formattedName.content} ${this.levels.error.content}`,
			...this.formattedName.styles,
			...this.levels.error.styles,
			...message,
		);
	}

	critical(message: any[]): void 
	{
		console.error(
			`${this.formattedName.content} ${this.levels.critical.content}`,
			...this.formattedName.styles,
			...this.levels.critical.styles,
			...message,
		);
	}
}

// ██╗      ██████╗  ██████╗  ██████╗ ███████╗██████╗
// ██║     ██╔═══██╗██╔════╝ ██╔════╝ ██╔════╝██╔══██╗
// ██║     ██║   ██║██║  ███╗██║  ███╗█████╗  ██████╔╝
// ██║     ██║   ██║██║   ██║██║   ██║██╔══╝  ██╔══██╗
// ███████╗╚██████╔╝╚██████╔╝╚██████╔╝███████╗██║  ██║
// ╚══════╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝

/**
 * A logging utility class that provides different logging levels and message types.
 * Supports debug, info, success, warning, error, and critical message logging.
 * Can be configured with custom writers and logging levels, and includes support
 * for message filtering based on logger name.
 *
 * @class
 * @param {string} name - The identifier for the logger instance
 * @param {LogLevel} level - The minimum logging level to output
 * @param {Writer} writer - The writer implementation for log output
 */
class Logger 
{
	writer: Writer;

	constructor(
    public readonly name: string,
    public level: LogLevel,
    color?: Readonly<
      [Readonly<[number, number, number]>, Readonly<[number, number, number]>]
    >,
	) 
	{
		this.writer = isColorSupported()
			? new FancyConsoleWriter(name ?? "App", color ?? colors.purple)
			: new BasicConsoleWriter(name ?? "App");
	}

	/**
   * Log a message.
   */
	message = (...msg: any[]): void => 
	{
		this.writer.message(msg);
	};

	log = this.message;

	/**
   * Log a message for debugging purposes.
   * @param  {...any} msg
   * @returns void
   */
	debug = (...msg: any[]) => 
	{
		this.level <= LogLevel.Debug && this.writer.debug(msg);
	};

	/**
   * Log a message that provides non critical information for the user.
   * @param  {...any} msg
   * @returns void
   */

	info = (...msg: any[]) => 
	{
		this.level <= LogLevel.Info && this.writer.info(msg);
	};
	/**
   * Log a message that indicates a successful operation to the user.
   * @param  {...any} msg
   * @returns void
   */

	success = (...msg: any[]) => 
	{
		this.level <= LogLevel.Info && this.writer.success(msg);
	};

	/**
   * Log a message that indicates a warning to the user.
   * @param  {...any} msg
   * @returns void
   */
	warn = (...msg: any[]) => 
	{
		this.level <= LogLevel.Warn && this.writer.warn(msg);
	};

	/**
   * Log a message that indicates an error to the user.
   * @param  {...any} msg
   * @returns void
   */
	error = (...msg: any[]) => 
	{
		this.level <= LogLevel.Error && this.writer.error(msg);
	};

	/**
   * Log a message that indicates a critical error to the user.
   * @param  {...any} msg
   * @returns void
   */
	critical = (...msg: any[]) => 
	{
		this.level <= LogLevel.Critical && this.writer.critical(msg);
	};
}

/* @internal */
const logger = new Logger("elysia", LogLevel.Debug, colors.purple);

let warns = new Set<string>();
/* @internal */
function warnOnce(str: string) 
{
	if (!warns.has(str)) 
	{
		warns.add(str);
		logger.warn(str);
	}
}

export { Logger, LogLevel, colors, logger, warnOnce };
