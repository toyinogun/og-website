// Locks in the build and deployment contract from spec 0001. These are the
// facts the zero cost hosting decision rests on, so a change that breaks one
// should fail loudly here rather than show up as a bill.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import astroConfig from '../astro.config.mjs';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const readJsonc = (path: string) =>
	JSON.parse(
		read(path)
			.replace(/^\s*\/\/.*$/gm, '')
			.replace(/,(\s*[}\]])/g, '$1'),
	);

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

describe('search metadata (spec 0007)', () => {
	// covers: AC-9
	it('adds @astrojs/sitemap and keeps its filter for the 404 page', () => {
		expect(Object.keys(pkg.dependencies)).toContain('@astrojs/sitemap');
		expect(
			(astroConfig.integrations ?? []).flat().some((i) => i && i.name === '@astrojs/sitemap'),
		).toBe(true);
	});
});

describe('the contact form Worker (spec 0006)', () => {
	// covers: AC-20 (spec 0006)
	it('runs the Worker script from worker/index.ts', () => {
		expect(wrangler.main).toBe('./worker/index.ts');
	});

	// covers: AC-20 (spec 0006); AC-3, AC-4 (spec 0001)
	it('runs the Worker for /api/* only, so pages, images and fonts stay free asset requests', () => {
		expect(wrangler.assets?.run_worker_first).toEqual(['/api/*']);
		expect(wrangler.assets?.not_found_handling).toBe('404-page');
	});

	// covers: AC-13, AC-20 (spec 0006)
	it('binds the Email Service as EMAIL, unrestricted so the inbox is never published', () => {
		expect(wrangler.send_email).toEqual([{ name: 'EMAIL' }]);
	});

	// covers: AC-9, AC-20 (spec 0006)
	it('limits sends to 3 a minute with CONTACT_LIMITER', () => {
		expect(wrangler.ratelimits).toEqual([
			{ name: 'CONTACT_LIMITER', namespace_id: '1001', simple: { limit: 3, period: 60 } },
		]);
	});

	// covers: AC-12, AC-20 (spec 0006)
	it('binds the outbox KV namespace as CONTACT_OUTBOX', () => {
		expect(wrangler.kv_namespaces).toHaveLength(1);
		expect(wrangler.kv_namespaces[0].binding).toBe('CONTACT_OUTBOX');
		expect(typeof wrangler.kv_namespaces[0].id).toBe('string');
	});

	// covers: AC-21 (spec 0006)
	it('runs the weekly check on Mondays at 08:00 UTC', () => {
		expect(wrangler.triggers).toEqual({ crons: ['0 8 * * 1'] });
	});

	// covers: AC-16, AC-20 (spec 0006)
	it('sets the production hostname and origin as vars', () => {
		expect(wrangler.vars).toEqual({
			TURNSTILE_EXPECTED_HOSTNAME: 'toyintest.org',
			ALLOWED_ORIGINS: 'https://toyintest.org',
		});
	});

	// covers: AC-18 (spec 0006)
	it('turns on Workers observability', () => {
		expect(wrangler.observability).toEqual({ enabled: true });
	});

	// covers: AC-20 (spec 0006)
	it('names the secrets without holding their values', () => {
		expect(wrangler.secrets).toEqual({
			required: ['CONTACT_TO', 'TURNSTILE_SECRET_KEY', 'HEALTHCHECK_URL'],
		});
	});
});

describe('no secret values in the repository (spec 0006)', () => {
	const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
	const ALLOWED_EMAILS = ['form@toyintest.org', 'you@example.com'];
	const workerFiles = readdirSync(new URL('worker/', root))
		.filter(
			(name) =>
				name.endsWith('.ts') && !name.endsWith('.test.ts') && name !== 'worker-configuration.d.ts',
		)
		.map((name) => `worker/${name}`);

	// covers: AC-20 (spec 0006)
	it.each(['wrangler.jsonc', '.dev.vars.example', ...workerFiles])(
		'holds no email address but the sender and the placeholder in %s',
		(path) => {
			const found = read(path).match(EMAIL) ?? [];

			expect(found.filter((address) => !ALLOWED_EMAILS.includes(address))).toEqual([]);
		},
	);

	// covers: AC-20 (spec 0006)
	it('holds only the documented test secret and placeholders in .dev.vars.example', () => {
		const values = Object.fromEntries(
			read('.dev.vars.example')
				.split('\n')
				.filter((line) => line.trim() !== '' && !line.startsWith('#'))
				.map((line) => line.split('=', 2)),
		);

		expect(values).toEqual({
			TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
			TURNSTILE_EXPECTED_HOSTNAME: expect.any(String),
			ALLOWED_ORIGINS: 'http://localhost:8787',
			CONTACT_TO: 'you@example.com',
			HEALTHCHECK_URL: 'https://hc-ping.com/your-check-uuid',
		});
	});

	// covers: AC-20 (spec 0006)
	it('keeps the real .dev.vars out of git', () => {
		expect(read('.gitignore')).toMatch(/^\.dev\.vars\*$/m);
		expect(read('.gitignore')).toMatch(/^!\.dev\.vars\.example$/m);
	});
});
