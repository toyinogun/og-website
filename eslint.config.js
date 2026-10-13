// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Flat config chosen by /audit (AGENTS.md, Tooling). Formatting is Prettier's
// job, so nothing here checks style. `jsx-a11y-recommended` runs the
// eslint-plugin-jsx-a11y rules over the markup in `.astro` files.
export default defineConfig(
	{
		ignores: [
			'dist/',
			'.astro/',
			'.wrangler/',
			'node_modules/',
			'test-results/',
			'playwright-report/',
		],
	},
	js.configs.recommended,
	...tseslint.configs.strict,
	...astro.configs.recommended,
	...astro.configs['jsx-a11y-recommended'],
	{
		languageOptions: {
			globals: { ...globals.node },
		},
	},
);
