import { defineConfig } from "vite";
import { join } from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],
	resolve: {
		alias: {
			elysiatech: join(process.cwd(), "../src"),
		},
	},
	optimizeDeps: {
		esbuildOptions: {
			target: "es2022",
		},
	},
	build: {
		target: "es2022",
	},
	esbuild: {
		dropLabels: ["ELYSIA_PROD", "ELYSIA_INSTRUMENT"],
		target: "es2022",
	},
});
