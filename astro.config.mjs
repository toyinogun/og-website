// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Fully pre rendered static output, deliberately with no Cloudflare adapter:
// an adapter would turn free static asset requests into metered Worker
// invocations (spec 0001, "Build and deployment contract").
export default defineConfig({
  site: 'https://toyintest.org',

  vite: {
    plugins: [tailwindcss()],
  },
});