import type { ImageFunction } from 'astro/content/config';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { projectSchema } from './project-schema';

// Mirrors what Astro's content layer hands the schema: a string transform that
// tags the path as an image placeholder.
const stubImage = (() =>
	z.string().transform((path) => `__ASTRO_IMAGE_${path}`)) as unknown as ImageFunction;

const schema = projectSchema(stubImage);

const valid = {
	title: 'Example project',
	summary: 'A short sentence on what the project is.',
	outcome: 'Cut page load time in half.',
	kind: 'client',
	client: { name: 'Acme', description: 'A small logistics firm' },
	role: 'Lead engineer',
	team: 'Two engineers and a designer',
	start: '2024-03',
	end: '2025-01',
	stack: ['typescript', 'astro'],
	services: ['frontend'],
	cover: './cover.png',
	coverAlt: 'The new dashboard on a laptop',
	metrics: [{ value: '50%', label: 'faster pages' }],
	links: [{ kind: 'live', url: 'https://example.com' }],
	order: 1,
	featured: true,
	draft: false,
};

const parse = (data: unknown) => schema.safeParse(data);

/** The dotted paths of every issue a parse reports. */
const issuePaths = (data: unknown): readonly string[] => {
	const result = parse(data);
	return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

const without = (key: string) =>
	Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));

describe('projectSchema, valid entries (spec 0002)', () => {
	// covers: AC-1
	it('accepts a complete entry and exposes every field', () => {
		const result = parse(valid);

		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ ...valid, cover: '__ASTRO_IMAGE_./cover.png' });
	});

	// covers: AC-1
	it('leaves the optional fields absent and applies the defaults', () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { team, end, metrics, links, featured, draft, ...required } = valid;
		const minimal = { ...required, client: { description: 'A confidential client' } };

		const result = parse(minimal);

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('team');
		expect(result.data).not.toHaveProperty('end');
		expect(result.data?.client).not.toHaveProperty('name');
		expect(result.data).toMatchObject({ metrics: [], links: [], featured: false, draft: false });
	});

	it('trims text before storing it', () => {
		expect(parse({ ...valid, title: '  Padded  ' }).data?.title).toBe('Padded');
	});

	it.each(['./cover.png', './cover.jpg', './cover.jpeg', './cover.webp'])(
		'accepts cover %s',
		(cover) => {
			expect(parse({ ...valid, cover }).success).toBe(true);
		},
	);

	it('accepts an end in the same month as start', () => {
		expect(parse({ ...valid, end: valid.start }).success).toBe(true);
	});

	it('accepts exactly 3 metrics and a link with its own label', () => {
		const metrics = [1, 2, 3].map((n) => ({ value: `${n}`, label: 'things' }));
		const links = [{ kind: 'code', url: 'https://github.com/x', label: 'Source' }];

		expect(parse({ ...valid, metrics, links }).success).toBe(true);
	});
});

describe('projectSchema, rule violations name the field (spec 0002)', () => {
	// covers: AC-2
	it.each([
		'title',
		'summary',
		'outcome',
		'kind',
		'client',
		'role',
		'start',
		'stack',
		'services',
		'cover',
		'coverAlt',
		'order',
	])('rejects a missing %s', (field) => {
		expect(issuePaths(without(field))).toContain(field);
	});

	it('rejects a missing client.description', () => {
		expect(issuePaths({ ...valid, client: { name: 'Acme' } })).toContain('client.description');
	});

	// covers: AC-2
	it.each([
		['title', 80],
		['summary', 160],
		['outcome', 120],
		['role', 80],
		['team', 80],
		['coverAlt', 160],
	])('rejects %s that is only spaces, or over %i characters after trimming', (field, max) => {
		expect(issuePaths({ ...valid, [field]: '   ' })).toContain(field);
		expect(issuePaths({ ...valid, [field]: 'x'.repeat(max + 1) })).toContain(field);
		expect(issuePaths({ ...valid, [field]: ` ${'x'.repeat(max)} ` })).toEqual([]);
	});

	it('applies the length limits inside client, metrics and links', () => {
		expect(issuePaths({ ...valid, client: { name: 'x'.repeat(61), description: 'd' } })).toContain(
			'client.name',
		);
		expect(issuePaths({ ...valid, client: { description: ' ' } })).toContain('client.description');
		expect(issuePaths({ ...valid, metrics: [{ value: 'x'.repeat(13), label: 'l' }] })).toContain(
			'metrics.0.value',
		);
		expect(issuePaths({ ...valid, metrics: [{ value: 'v', label: 'x'.repeat(41) }] })).toContain(
			'metrics.0.label',
		);
		expect(
			issuePaths({ ...valid, links: [{ kind: 'live', url: 'https://a.com', label: ' ' }] }),
		).toContain('links.0.label');
	});

	// covers: AC-2
	it.each([
		['the top level', { ...valid, teem: 'x' }],
		['client', { ...valid, client: { nmae: 'Acme', description: 'd' } }],
		['a metric', { ...valid, metrics: [{ value: '1', label: 'l', unit: '%' }] }],
		['a link', { ...valid, links: [{ kind: 'live', url: 'https://a.com', title: 'x' }] }],
	])('rejects an unknown key at %s', (_, data) => {
		expect(parse(data).success).toBe(false);
	});

	// covers: AC-2
	it.each([
		['kind', { ...valid, kind: 'freelance' }],
		['stack.1', { ...valid, stack: ['typescript', 'cobol'] }],
		['services.0', { ...valid, services: ['plumbing'] }],
		['links.0.kind', { ...valid, links: [{ kind: 'blog', url: 'https://a.com' }] }],
	])('rejects an unknown vocabulary key at %s', (path, data) => {
		expect(issuePaths(data)).toContain(path);
	});

	// covers: AC-2
	it.each([
		'http://example.com',
		'ftp://example.com',
		'example.com',
		'https://',
		'https:example.com',
	])('rejects the link url %s', (url) => {
		expect(issuePaths({ ...valid, links: [{ kind: 'live', url }] })).toContain('links.0.url');
	});

	// covers: AC-2
	it('rejects more than 3 metrics', () => {
		const metrics = [1, 2, 3, 4].map((n) => ({ value: `${n}`, label: 'things' }));

		expect(issuePaths({ ...valid, metrics })).toContain('metrics');
	});

	// covers: AC-2
	it('rejects a repeated stack or type of work key', () => {
		expect(issuePaths({ ...valid, stack: ['astro', 'astro'] })).toContain('stack');
		expect(issuePaths({ ...valid, services: ['frontend', 'frontend'] })).toContain('services');
	});

	it('rejects an empty stack or type of work list', () => {
		expect(issuePaths({ ...valid, stack: [] })).toContain('stack');
		expect(issuePaths({ ...valid, services: [] })).toContain('services');
	});

	// covers: AC-2
	it.each(['2024-3', '2024-13', '2024-00', '03-2024', '2024-03-01', '2024/03'])(
		'rejects the month %s',
		(month) => {
			expect(issuePaths({ ...valid, start: month })).toContain('start');
			expect(issuePaths({ ...valid, end: month })).toContain('end');
		},
	);

	// covers: AC-2
	it('rejects an end before start', () => {
		expect(issuePaths({ ...valid, start: '2024-03', end: '2024-02' })).toEqual(['end']);
	});

	// covers: AC-2
	it.each([0, -1, 1.5, '1'])('rejects the order %s', (order) => {
		expect(issuePaths({ ...valid, order })).toContain('order');
	});

	// covers: AC-12
	it.each([
		'cover.png',
		'./hero.png',
		'./cover.gif',
		'./sub/cover.png',
		'../cover.png',
		'/cover.png',
	])('rejects the cover name %s before image() sees it', (cover) => {
		expect(issuePaths({ ...valid, cover })).toContain('cover');
	});
});
