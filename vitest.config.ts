import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"tests/",
				"*.config.ts",
				"src/index.ts",
				"src/prompts.ts",
			],
		},
		include: ["tests/**/*.test.ts"],
		testTimeout: 10000,
		hookTimeout: 10000,
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});