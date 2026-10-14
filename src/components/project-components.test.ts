// ProjectCard, SelectedWork (spec 0004) and WorkList (spec 0005); values in
// design.md, Component values. The fixture is a minimal entry with a real cover import, cast to
// the entry type: the container API cannot load the content collection.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import cover from '../content/projects/shipsafe/cover.png';
import type { Project } from '../lib/projects';
import ProjectCard from './ProjectCard.astro';
import SelectedWork from './SelectedWork.astro';
import WorkList from './WorkList.astro';

const project = (id: string, data: Record<string, unknown> = {}): Project =>
	({
		id,
		collection: 'projects',
		data: {
			title: `Title of ${id}`,
			outcome: `Outcome of ${id}.`,
			kind: 'personal',
			cover,
			coverAlt: `Cover of ${id}`,
			links: [],
			metrics: [{ value: '42', label: 'a metric' }],
			stack: ['go'],
			services: ['backend'],
			...data,
		},
	}) as unknown as Project;

const withLinks = project('with-links', {
	links: [
		{ kind: 'code', url: 'https://github.com/example/first' },
		{ kind: 'live', url: 'https://example.org/' },
	],
});

let container: AstroContainer;

beforeEach(async () => {
	container = await AstroContainer.create();
});

describe('ProjectCard', () => {
	const render = (props: Record<string, unknown>) =>
		container.renderToString(ProjectCard, { props });

	// covers: AC-6
	it('renders an article with cover, kind, h3 title and outcome, in that order', async () => {
		const html = await render({ project: project('plain') });

		expect(html).toMatch(/^<article>/);
		const positions = [
			html.indexOf('<img'),
			html.indexOf('>Personal project</p>'),
			html.indexOf('<h3 class="text-xl">Title of plain</h3>'),
			html.indexOf('>Outcome of plain.</p>'),
		];
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	});

	// covers: AC-6, AC-18
	it('uses an h2 when headingLevel is 2, and h3 by default', async () => {
		expect(await render({ project: project('a'), headingLevel: 2 })).toContain(
			'<h2 class="text-xl">Title of a</h2>',
		);
		expect(await render({ project: project('a') })).toMatch(/<h3[\s>]/);
	});

	// covers: AC-6
	it('gives the cover its alt text, sizes, dimensions and the md radius', async () => {
		const html = await render({ project: project('plain') });
		const img = html.match(/<img[^>]*>/)?.[0] ?? '';

		expect(img).toContain('alt="Cover of plain"');
		expect(img).toContain(
			'sizes="(min-width: 64rem) 22rem, (min-width: 48rem) calc(50vw - 3rem), calc(100vw - 2.5rem)"',
		);
		expect(img).toMatch(/\bwidth="\d+"/);
		expect(img).toMatch(/\bheight="\d+"/);
		expect(img).toContain('rounded-md');
		expect(img).toContain('loading="lazy"');
	});

	// covers: AC-6
	it('styles the kind small and muted, and the outcome at the base size', async () => {
		const html = await render({ project: project('plain') });

		expect(html).toContain('<p class="text-sm text-muted">Personal project</p>');
		expect(html).toContain('<p class="text-base">Outcome of plain.</p>');
	});

	// covers: AC-6
	it('links only the first link, named uniquely with a hidden "for <title>"', async () => {
		const html = await render({ project: withLinks });
		const anchors = html.match(/<a [\s\S]*?<\/a>/g) ?? [];

		expect(anchors).toHaveLength(1);
		expect(anchors[0]).toMatch(/^<a href="https:\/\/github\.com\/example\/first"/);
		expect(anchors[0]).toMatch(
			/>\s*Code\s*<span class="sr-only">&nbsp;for Title of with-links<\/span>/,
		);
		expect(html).not.toContain('https://example.org/');
	});

	// covers: AC-6
	it("uses the link's own label when it has one", async () => {
		const html = await render({
			project: project('labelled', {
				links: [{ kind: 'code', url: 'https://github.com/x/y', label: 'Code on GitHub' }],
			}),
		});

		expect(html).toMatch(/>\s*Code on GitHub\s*<span class="sr-only">/);
	});

	// covers: AC-6
	it('shows no link when the project has none', async () => {
		const html = await render({ project: project('plain') });

		expect(html).not.toContain('<a ');
	});

	// covers: AC-6, AC-16
	it('gives the link a target at least 24 pixels tall', async () => {
		const html = await render({ project: withLinks });

		expect(html).toMatch(/<a [^>]*class="[^"]*\bmin-h-6\b/);
	});

	// covers: AC-6
	it('shows no metrics, no tags and never links to a project page', async () => {
		const html = await render({ project: withLinks });

		expect(html).not.toContain('a metric');
		expect(html).not.toMatch(/>\s*(Go|Backend)\s*</);
		expect(html).not.toContain('/projects/');
	});
	// covers: AC-6, AC-7 (spec 0005)
	describe('with showStack', () => {
		const HETZNER_STACK = [
			'kubernetes',
			'talos',
			'terraform',
			'hetzner',
			'argocd',
			'cilium',
			'longhorn',
			'prometheus',
			'grafana',
		];
		/** The chip classes, written once (spec 0005, AC-8). */
		const CHIP = 'rounded-sm border border-line px-2 py-0.5 text-sm text-muted';
		const stackList = (html: string) =>
			html.match(/<ul aria-label="Stack"[\s\S]*?<\/ul>/)?.[0] ?? '';
		const chips = (html: string) =>
			[...stackList(html).matchAll(/<li[^>]*>([^<]+)<\/li>/g)].map((m) => m[1]);

		it('shows the first five stack labels of a nine key stack, in order', async () => {
			const html = await render({
				project: project('hetzner', { stack: HETZNER_STACK }),
				showStack: true,
			});

			expect(chips(html)).toEqual([
				'Kubernetes',
				'Talos Linux',
				'Terraform',
				'Hetzner Cloud',
				'Argo CD',
			]);
		});

		it('shows a short stack whole', async () => {
			const html = await render({
				project: project('shipsafe', { stack: ['go', 'docker'] }),
				showStack: true,
			});

			expect(chips(html)).toEqual(['Go', 'Docker']);
		});

		it('places the list between the outcome and the link, styled as chips', async () => {
			const html = await render({
				project: project('with-links', { ...withLinks.data, stack: ['go', 'docker'] }),
				showStack: true,
			});
			const outcome = html.indexOf('>Outcome of with-links.</p>');
			const list = html.indexOf('<ul aria-label="Stack" class="flex flex-wrap gap-2">');
			const link = html.indexOf('<a ');

			expect(outcome).toBeGreaterThan(-1);
			expect(list).toBeGreaterThan(outcome);
			expect(link).toBeGreaterThan(list);
			expect(stackList(html).match(new RegExp(`<li class="${CHIP}">`, 'g'))).toHaveLength(2);
		});

		it('makes no chip interactive', async () => {
			const list = stackList(
				await render({ project: project('hetzner', { stack: HETZNER_STACK }), showStack: true }),
			);

			expect(list).not.toMatch(/<(a|button)[\s>]/);
			expect(list).not.toMatch(/\b(tabindex|title)=/);
		});

		it('shows no stack list without showStack, or with it false', async () => {
			for (const props of [{}, { showStack: false }]) {
				const html = await render({ project: project('plain'), ...props });

				expect(html).not.toContain('aria-label="Stack"');
			}
		});
	});
});

describe('SelectedWork', () => {
	const render = (props: Record<string, unknown>) =>
		container.renderToString(SelectedWork, { props });

	// covers: AC-4
	it('renders a labelled section with a three column list, one card per project in order', async () => {
		const html = await render({
			projects: [project('first'), withLinks, project('third')],
			heading: 'Selected work',
		});

		expect(html).toMatch(/^<section id="selected-work" aria-labelledby="selected-work-heading"/);
		expect(html).toMatch(/<h2 id="selected-work-heading"[^>]*>Selected work<\/h2>/);
		expect(html).toMatch(/<ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">/);
		expect(html.match(/<li>\s*<article>/g)).toHaveLength(3);
		const titles = [...html.matchAll(/<h3 class="text-xl">([^<]+)<\/h3>/g)].map((m) => m[1]);
		expect(titles).toEqual(['Title of first', 'Title of with-links', 'Title of third']);
	});

	// covers: AC-5
	it('renders nothing for an empty list', async () => {
		const html = await render({ projects: [], heading: 'Selected work' });

		expect(html.trim()).toBe('');
	});
});

describe('WorkList', () => {
	const render = (props: Record<string, unknown>) => container.renderToString(WorkList, { props });

	// covers: AC-3 (spec 0005)
	it('renders the projects section with no heading and a three column list, one h2 card per project in order', async () => {
		const html = await render({
			projects: [project('first'), withLinks, project('third')],
			emptyText: 'Nothing yet.',
		});

		expect(html).toMatch(/^<section id="projects" class="py-16 md:py-24">/);
		expect(html).not.toContain('aria-labelledby');
		expect(html).toMatch(/<ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">/);
		expect(html.match(/<li>\s*<article>/g)).toHaveLength(3);
		const titles = [...html.matchAll(/<h2 class="text-xl">([^<]+)<\/h2>/g)].map((m) => m[1]);
		expect(titles).toEqual(['Title of first', 'Title of with-links', 'Title of third']);
		expect(html).not.toMatch(/<h3[\s>]/);
		expect(html.match(/<ul aria-label="Stack"/g)).toHaveLength(3);
		expect(html).not.toContain('Nothing yet.');
	});

	// covers: AC-3 (spec 0005)
	it('shows featured and not featured projects alike', async () => {
		const html = await render({
			projects: [project('featured', { featured: true }), project('plain', { featured: false })],
			emptyText: 'Nothing yet.',
		});

		expect(html.match(/<li>\s*<article>/g)).toHaveLength(2);
	});

	// covers: AC-4 (spec 0005)
	it('renders the section with only the empty line for an empty list', async () => {
		const html = await render({ projects: [], emptyText: 'Nothing yet.' });

		expect(html).toMatch(/^<section id="projects" class="py-16 md:py-24">/);
		expect(html.match(/<p[\s>]/g)).toHaveLength(1);
		expect(html).toContain('<p class="max-w-measure">Nothing yet.</p>');
		expect(html).not.toMatch(/<(ul|article|a|button|h2)[\s>]/);
	});
});
