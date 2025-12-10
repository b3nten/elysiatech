import * as esbuild from "esbuild";
import * as fs from "node:fs";
import { spawn } from "child_process";
import { colors, Logger, LogLevel } from "./src/lib/logging.ts";
import { join } from "node:path";

const logger = new Logger("100x", LogLevel.Debug, colors.sunset);

class Builder {
  constructor(private config: Partial<esbuild.BuildOptions>) {}

  cleanOutputDir(outdir: string) {
    try {
      fs.rmSync(outdir, { recursive: true, force: true });
    } catch {}
  }

  async build(...options: Partial<esbuild.BuildOptions>[]) {
    logger.info(`Building ${options.length} output targets...`);
    return await Promise.all(
      options.map((o) => esbuild.build({ ...this.config, ...o })),
    )
      .then(() => logger.success(`Built all output targets successfully.`))
      .catch((err) => {
        logger.critical(`Build failed: ${err.message}`);
        process.exit(1);
      });
  }

  async buildTypes() {
    return await new Promise((resolve) => {
      const process = spawn("tsc", ["--declaration", "--emitDeclarationOnly"], {
        stdio: "inherit",
      });
      process.on("exit", (code) => {
        if (code === 0) {
          logger.success(`Built types successfully`);
          resolve(void 0);
        } else {
          logger.warn(`Errors occurred during type building`);
          resolve(void 1);
        }
      });
      process.on("error", (err) => {
        logger.error(err.message);
      });
    });
  }
}

const keepStructurePlugin: esbuild.Plugin = {
  name: "resolve-ext",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.importer) {
        // leave external paths as-is
        if (!args.path.startsWith(".")) {
          return {
            path: args.path,
            external: true,
          };
        }
        return {
          path: args.path.replace(".ts", "").replace(".js", "") + ".js",
          external: true,
        };
      } else {

      }
    });
  },
};

const entryPoints = fs.readdirSync("src", { recursive: true, withFileTypes: true })
	.filter(it => it.isFile())
	.filter(it => !it.name.endsWith(".test.ts"))
	.map(it => join(it.parentPath, it.name))

const builder = new Builder({
    entryPoints: entryPoints,
    bundle: true,
    format: "esm",
    target: ["es2022"],
    plugins: [keepStructurePlugin],
});

builder.cleanOutputDir(".build");

await builder.build(
    {
        dropLabels: ["ELYSIA_PROD"],
        outdir: ".build/instrument",
    },
    {
        dropLabels: ["ELYSIA_PROD", "ELYSIA_INSTRUMENT"],
        outdir: ".build/dev",
    },
    {
        dropLabels: ["ELYSIA_DEV", "ELYSIA_INSTRUMENT"],
        outdir: ".build/prod",
    }
);

await builder.buildTypes()
