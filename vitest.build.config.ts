import { defineConfig } from 'vitest/config';

// Tests that read the production build in dist/. Run `npm run build` first,
// then `npm run test:build`; `npm test` stays source only (spec 0003).
export default defineConfig({
	test: {
		include: ['tests/build/**/*.test.ts'],
	},
});
