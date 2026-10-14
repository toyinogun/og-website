/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Runs through Astro's Vite pipeline so `.astro` files compile inside tests.
// The Worker's tests in `worker/` run here too, with fake bindings (spec 0006).
// Browser flows live in `e2e/` and run under Playwright instead. Tests that
// read dist/ live in `tests/build/` and run with `npm run test:build`.
export default getViteConfig({
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'worker/**/*.test.ts'],
		exclude: ['tests/build/**', 'node_modules/**'],
	},
});
