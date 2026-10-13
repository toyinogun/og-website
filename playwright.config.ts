import { defineConfig, devices } from '@playwright/test';

// Drives the real production build: `npm run build` (type check, then the
// static build) and `astro preview` serving `dist/`, the same files Cloudflare
// serves as static assets.
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: 'line',
	use: {
		baseURL: 'http://localhost:4322',
	},
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
		},
		{
			name: 'mobile',
			use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 740 } },
		},
	],
	webServer: {
		// `--ignore-lock` keeps preview in the foreground: Astro otherwise detaches
		// it when it detects an AI agent, and Playwright reads that as a crash.
		command: 'npm run build && npx astro preview --port 4322 --ignore-lock',
		url: 'http://localhost:4322',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
});
