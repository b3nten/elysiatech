// eslint.config.js
import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";

export default defineConfig([
	{
		files: ["src/**/*.ts", "playground/**/*.ts"],
		rules: {
			"brace-style": ["error", "allman", { "allowSingleLine": true }],
			"indent": ["error", "tab"],
			"no-unused-labels": "off"
		},
		plugins: {
			js
		},
		languageOptions: {
			parser: tsParser,
		},
	},
]);
