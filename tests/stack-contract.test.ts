// Locks in the build and deployment contract from spec 0001. These are the
// facts the zero cost hosting decision rests on, so a change that breaks one
// should fail loudly here rather than show up as a bill.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import astroConfig from '../astro.config.mjs';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const readJsonc = (path: string) =>
	JSON.parse(read(path).replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));

const pkg = JSON.parse(read('package.json'));
const wrangler = readJsonc('wrangler.jsonc');

describe('static output, no adapter (spec 0001)', () => {
	// covers: AC-3
	it('configures no server adapter', () => {
		expect(astroConfig.adapter).toBeUndefined();
	});

	// covers: AC-3
	it('keeps the output static', () => {
		expect(astroConfig.output ?? 'static').toBe('static');
	});

	// covers: AC-3
	it('does not depend on @astrojs/cloudflare', () => {
		const all = { ...pkg.dependencies, ...pkg.devDependencies };

		expect(Object.keys(all)).not.toContain('@astrojs/cloudflare');
	});
});

describe('production origin', () => {
	// covers: AC-5
	it('sets the Astro site to https://toyintest.org', () => {
		expect(astroConfig.site).toBe('https://toyintest.org');
	});
});

describe('Wrangler config', () => {
	// covers: AC-4
	it('names the Worker og-website', () => {
		expect(wrangler.name).toBe('og-website');
	});

	// covers: AC-4
	it('serves ./dist as static assets', () => {
		expect(wrangler.assets?.directory).toBe('./dist');
	});

	// covers: AC-3, AC-4
	it('declares no Worker script entry point, so requests stay free asset requests', () => {
		expect(wrangler.main).toBeUndefined();
	});

	// covers: AC-4
	it('pins a compatibility date', () => {
		expect(wrangler.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('build and deploy scripts', () => {
	// covers: AC-2
	it('type checks before building', () => {
		expect(pkg.scripts.build).toMatch(/^astro check && astro build$/);
	});

	// covers: AC-2
	it('builds before deploying', () => {
		expect(pkg.scripts.deploy).toBe('npm run build && wrangler deploy');
	});
});

describe('Node version pin', () => {
	// covers: AC-7
	it('pins an exact Node version in .nvmrc', () => {
		expect(read('.nvmrc').trim()).toMatch(/^\d+\.\d+\.\d+$/);
	});

	// covers: AC-7
	it('pins a Node version that satisfies the engines floor', () => {
		const [major, minor] = read('.nvmrc').trim().split('.').map(Number);
		const [floorMajor, floorMinor] = pkg.engines.node.replace('>=', '').split('.').map(Number);

		expect(major > floorMajor || (major === floorMajor && minor >= floorMinor)).toBe(true);
	});
});
