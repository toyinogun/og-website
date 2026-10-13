// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Fully pre rendered static output, deliberately with no Cloudflare adapter:
// an adapter would turn free static asset requests into metered Worker
// invocations (spec 0001, "Build and deployment contract").
export default defineConfig({
	site: 'https://toyintest.org',

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

	vite: {
		plugins: [tailwindcss()],
	},
});
