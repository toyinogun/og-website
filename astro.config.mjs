// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Fully pre rendered static output, deliberately with no Cloudflare adapter:
// an adapter would turn free static asset requests into metered Worker
// invocations (spec 0001, "Build and deployment contract").
export default defineConfig({
	site: 'https://toyintest.org',

	// Addresses without a trailing slash, matching the nav hrefs (spec 0003)
	// and the `drop-trailing-slash` asset handling in wrangler.jsonc (spec 0005,
	// AC-10). The build output stays dist/<path>/index.html.
	trailingSlash: 'never',

	// Self hosted from the local npm packages, never fetched over the network:
	// exactly the three faces in design.md (spec 0003, AC-7).
	fonts: [
		{
			name: 'Inter Variable',
			cssVariable: '--font-inter',
			provider: fontProviders.local(),
			fallbacks: ['system-ui', 'sans-serif'],
			display: 'swap',
			options: {
				variants: [
					{
						src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'],
						weight: '100 900',
						style: 'normal',
					},
					{
						src: ['@fontsource-variable/inter/files/inter-latin-wght-italic.woff2'],
						weight: '100 900',
						style: 'italic',
					},
				],
			},
		},
		{
			name: 'Source Serif 4 Variable',
			cssVariable: '--font-source-serif',
			provider: fontProviders.local(),
			fallbacks: ['Georgia', 'serif'],
			display: 'swap',
			options: {
				variants: [
					{
						src: [
							'@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
						],
						weight: '200 900',
						style: 'normal',
					},
				],
			},
		},
	],

	// Code blocks carry both themes through light-dark(), so they switch with
	// the page theme and the toggle (spec 0003, AC-15).
	markdown: {
		shikiConfig: {
			themes: { light: 'github-light', dark: 'github-dark' },
			defaultColor: 'light-dark()',
		},
	},

	integrations: [
		// The style guide at /styleguide, on the dev server only: the page lives
		// outside src/pages/, so the static build never emits it (AC-18).
		{
			name: 'og-website:styleguide',
			hooks: {
				'astro:config:setup': ({ command, injectRoute }) => {
					if (command === 'dev') {
						injectRoute({
							pattern: '/styleguide',
							entrypoint: new URL('./src/dev/styleguide.astro', import.meta.url),
						});
					}
				},
			},
		},
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
