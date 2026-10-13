/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Runs through Astro's Vite pipeline so `.astro` files compile inside tests.
// Browser flows live in `e2e/` and run under Playwright instead.
export default getViteConfig({
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
	},
});
