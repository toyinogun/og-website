import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CONTACT } from '../lib/contact';
import StyleGuide from './styleguide.astro';

// The container API cannot render the real collection's covers, so the two
// entries the card examples use are stood in for, with a real cover import.
// The cluster carries more than five stack keys, to show the chip limit.
vi.mock('astro:content', async () => {
	const cover = (await import('../content/projects/shipsafe/cover.png')).default;
	const entry = (
		id: string,
		title: string,
		order: number,
		stack: readonly string[],
		links: readonly unknown[],
	) => ({
		id,
		collection: 'projects',
		data: {
			title,
			outcome: `Outcome of ${id}.`,
			kind: 'personal',
			cover,
			coverAlt: title,
			links,
			stack,
			order,
			draft: false,
		},
	});
	return {
		getCollection: async () => [
			entry(
				'hetzner-talos-cluster',
				'Cluster example',
				10,
				['kubernetes', 'talos', 'terraform', 'hetzner', 'argocd', 'cilium', 'longhorn'],
				[],
			),
			entry(
				'shipsafe',
				'ShipSafe example',
				30,
				['go', 'docker'],
				[{ kind: 'code', url: 'https://github.com/x/y' }],
			),
		],
	};
});

const design = readFileSync(new URL('../../design.md', import.meta.url), 'utf8');
const tokensIn = (table: string) => {
	const start = design.indexOf(`<!-- token-table:${table}:start -->`);
	const end = design.indexOf(`<!-- token-table:${table}:end -->`);
	return [...design.slice(start, end).matchAll(/^\| `(--[a-z0-9-]+)`/gm)].map((m) => m[1]);
};

describe('style guide', () => {
	let html: string;

	/** The markup from the section with id `from` up to the section with id `to`. */
	const between = (from: string, to: string) =>
		html.slice(html.indexOf(`<section id="${from}"`), html.indexOf(`<section id="${to}"`));

	beforeAll(async () => {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org' },
		});
		html = await container.renderToString(StyleGuide, {
			request: new Request('http://localhost:4321/styleguide'),
		});
	});

	// covers: AC-18
	it('renders inside the base layout, so the header toggle switches its theme', () => {
		expect(html).toContain('<title>Style guide</title>');
		expect(html).toContain('data-theme-toggle');
	});

	// covers: AC-18
	it('shows every colour token as a swatch', () => {
		const colours = tokensIn('colour');
		expect(colours).toHaveLength(8);
		for (const token of colours) {
			expect(html).toContain(`<code class="text-sm">${token}</code>`);
			expect(html).toContain(`bg-${token.replace('--color-', '')}`);
		}
	});

	// covers: AC-18
	it('shows every type size', () => {
		const sizes = tokensIn('type');
		expect(sizes).toHaveLength(7);
		for (const token of sizes) {
			expect(html).toContain(`>${token}</code>`);
			expect(html).toContain(token.replace('--', ''));
		}
	});

	// covers: AC-18
	it('shows each Button variant as a button and as a link, and a submit button', () => {
		expect(html).toMatch(/<button type="button"[^>]*bg-accent[^>]*>Primary button/);
		expect(html).toMatch(/<button type="button"[^>]*border-line[^>]*>Secondary button/);
		expect(html).toMatch(/<button type="submit"[^>]*>Submit button/);
		expect(html).toMatch(/<a href="\/"[^>]*bg-accent[^>]*>Primary link/);
		expect(html).toMatch(/<a href="\/"[^>]*border-line[^>]*>Secondary link/);
	});

	// covers: AC-2 (spec 0007)
	it('shows the site card image', () => {
		expect(html).toContain('id="share-card"');
		expect(html).toMatch(/<img [^>]*alt="Toyin Ogunseinde, DevOps and infrastructure engineer/);
	});

	// covers: AC-18
	it('shows every Stack gap and every Grid column count and gap', () => {
		for (const gap of ['gap-3', 'gap-6', 'gap-12', 'gap-20']) expect(html).toContain(gap);
		expect(html).toContain('md:grid-cols-2');
		expect(html).toContain('lg:grid-cols-3');
		expect(html).toMatch(/<ol class="flex flex-col gap-3/);
	});

	// covers: AC-18
	it('shows Sections with an h2, an h3 and no heading, and both Container widths', () => {
		expect(html).toMatch(/<h2 id="colour-heading"/);
		expect(html).toMatch(/<h3 id="section-h3-heading"/);
		expect(html).toContain('max-w-page');
		expect(html).toContain('max-w-measure');
	});

	// covers: AC-18
	it('renders the sample Markdown through Prose, covering every listed element', () => {
		const prose = html.slice(html.indexOf('<div class="prose">'));
		for (const element of ['<h2', '<h3', '<h4', '<h5', '<h6', '<ul', '<ol', '<blockquote']) {
			expect(prose).toContain(element);
		}
		expect(prose).toContain('<code>inline code</code>');
		expect(prose).toMatch(/<pre class="astro-code/);
		expect(prose).toContain('<table');
		expect(prose).toMatch(/<figure>[\s\S]*<figcaption>/);
		expect(prose).toContain('https://toyintest.org/a/very/long/path');
	});

	// covers: AC-18 (spec 0004)
	it('shows PageIntro at both sizes, with and without eyebrow and lead', () => {
		expect(html).toContain('<h1 class="text-display">A display size page heading.</h1>');
		expect(html).toContain('<h1 class="text-3xl">An inner page heading</h1>');
		expect(html).toMatch(/<h1 class="text-3xl">A heading on its own<\/h1>\s*<\/div>/);
		expect(html).toContain('<p class="text-sm text-muted">Open to new roles and contract work</p>');
		expect(html).toContain(
			'<p class="text-lg text-muted">A lead line under an inner page heading.</p>',
		);
	});

	// covers: AC-18 (spec 0004)
	it('shows the call to action', () => {
		expect(html).toContain(`>${'Send me a message'}</a>`);
	});

	// covers: AC-18 (spec 0004)
	it('shows ProjectCard at both heading levels, with and without a link', () => {
		const cards = between('project-card', 'work-list').match(/<article>[\s\S]*?<\/article>/g) ?? [];

		expect(cards).toHaveLength(3);
		expect(cards[0]).toMatch(
			/<h3 class="text-xl">\s*<a href="\/projects\/[^"]+"[^>]*>ShipSafe example<\/a>/,
		);
		expect(cards[0]).toContain('<a href="https://github.com/x/y"');
		expect(cards[0]).not.toContain('aria-label="Stack"');
		expect(cards[1]).toMatch(
			/<h2 class="text-xl">\s*<a href="\/projects\/[^"]+"[^>]*>Cluster example<\/a>/,
		);
		expect(cards[1]).not.toContain('<a href="https:');
		expect(cards[1]).not.toContain('aria-label="Stack"');
	});

	// covers: AC-8 (spec 0005)
	it('shows ProjectCard with showStack on the longest stack, capped at five chips', () => {
		const cards = between('project-card', 'work-list').match(/<article>[\s\S]*?<\/article>/g) ?? [];
		const chips = cards[2]?.match(/<ul aria-label="Stack"[\s\S]*?<\/ul>/)?.[0] ?? '';

		expect(cards[2]).toContain('Cluster example');
		expect(chips.match(/<li[\s>]/g)).toHaveLength(5);
	});

	// covers: AC-8 (spec 0005)
	it('shows WorkList filled, in order, and empty', () => {
		const lists =
			between('work-list', 'links').match(/<section id="projects"[\s\S]*?<\/section>/g) ?? [];

		expect(lists).toHaveLength(2);
		const titles = [
			...(lists[0] ?? '').matchAll(/<h2 class="text-xl">\s*<a [^>]*>([^<]+)<\/a>/g),
		].map((m) => m[1]);
		expect(titles).toEqual(['Cluster example', 'ShipSafe example']);
		expect(lists[1]).toContain('<p class="max-w-measure">Write ups are on their way.</p>');
		expect(lists[1]).not.toContain('<ul');
	});

	// covers: AC-3, AC-23 (spec 0006)
	it('shows ContactForm at rest, a field with its error, and every outcome message', () => {
		const guide = between('contact-form-guide', 'stack');

		expect(guide).toContain('<form id="contact-form"');
		expect(guide).toMatch(/<input id="guide-email"[^>]*aria-invalid="true"/);
		expect(guide).toContain(CONTACT.errors.emailInvalid);
		for (const text of [
			CONTACT.sent,
			CONTACT.errorSummary,
			CONTACT.errors.rateLimited,
			CONTACT.errors.verification,
			CONTACT.errors.checkPending,
			CONTACT.errors.checkFailed,
			CONTACT.errors.notSent,
			CONTACT.errors.uncertain,
		]) {
			expect(guide).toContain(text.replaceAll("'", '&#39;'));
		}
	});
});
