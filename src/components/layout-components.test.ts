// Container, Section, Stack and Grid: every default and every variant
// (spec 0003, AC-14; values in design.md, Space and layout).
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import Container from './Container.astro';
import Grid from './Grid.astro';
import Section from './Section.astro';
import Stack from './Stack.astro';

let container: AstroContainer;

beforeEach(async () => {
	container = await AstroContainer.create();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = (component: any, props: Record<string, unknown> = {}) =>
	container.renderToString(component, { props, slots: { default: '<p>child</p>' } });

const classesOf = (html: string) => (html.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/);

describe('Container', () => {
	// covers: AC-14
	it('defaults to a page width div with the page gutter', async () => {
		const html = await render(Container);

		expect(html).toMatch(/^<div /);
		expect(classesOf(html)).toEqual(
			expect.arrayContaining(['mx-auto', 'w-full', 'px-5', 'md:px-8', 'max-w-page']),
		);
		expect(html).toContain('<p>child</p>');
	});

	// covers: AC-14
	it('renders the measure width', async () => {
		const html = await render(Container, { width: 'measure' });

		expect(classesOf(html)).toContain('max-w-measure');
		expect(classesOf(html)).not.toContain('max-w-page');
	});

	// covers: AC-14
	it.each(['article', 'header', 'footer'])('renders as %s', async (as) => {
		const html = await render(Container, { as });

		expect(html).toMatch(new RegExp(`^<${as} `));
	});

	it('passes extra classes through', async () => {
		const html = await render(Container, { class: 'py-16' });

		expect(classesOf(html)).toContain('py-16');
	});
});

describe('Stack', () => {
	// covers: AC-14
	it('defaults to a column div with the md gap', async () => {
		const html = await render(Stack);

		expect(html).toMatch(/^<div /);
		expect(classesOf(html)).toEqual(expect.arrayContaining(['flex', 'flex-col', 'gap-6']));
	});

	// covers: AC-14
	it.each([
		['sm', 'gap-3'],
		['md', 'gap-6'],
		['lg', 'gap-12'],
		['xl', 'gap-20'],
	])('maps gap %s to %s', async (gap, expected) => {
		const html = await render(Stack, { gap });

		expect(classesOf(html)).toContain(expected);
	});

	// covers: AC-14
	it.each(['ul', 'ol'])('renders as %s', async (as) => {
		const html = await render(Stack, { as });

		expect(html).toMatch(new RegExp(`^<${as} `));
	});
});

describe('Grid', () => {
	// covers: AC-14
	it('defaults to two columns from md, the md gap, as a div', async () => {
		const html = await render(Grid);

		expect(html).toMatch(/^<div /);
		expect(classesOf(html)).toEqual(
			expect.arrayContaining(['grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6']),
		);
		expect(html).not.toContain('lg:grid-cols-');
	});

	// covers: AC-14
	it('stays one column when cols is 1', async () => {
		const html = await render(Grid, { cols: 1 });

		expect(classesOf(html)).toContain('grid-cols-1');
		expect(html).not.toMatch(/md:grid-cols|lg:grid-cols/);
	});

	// covers: AC-14
	it('goes 1, then 2 from md, then 3 from lg when cols is 3', async () => {
		const html = await render(Grid, { cols: 3 });

		expect(classesOf(html)).toEqual(
			expect.arrayContaining(['grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3']),
		);
	});

	// covers: AC-14
	it('uses the lg gap', async () => {
		const html = await render(Grid, { gap: 'lg' });

		expect(classesOf(html)).toContain('gap-12');
	});

	// covers: AC-14
	it('renders as a list', async () => {
		const html = await render(Grid, { as: 'ul' });

		expect(html).toMatch(/^<ul /);
	});
});

describe('Section', () => {
	// covers: AC-14
	it('renders a section with the rhythm and no heading by default', async () => {
		const html = await render(Section);

		expect(html).toMatch(/^<section /);
		expect(classesOf(html)).toEqual(expect.arrayContaining(['py-16', 'md:py-24']));
		expect(html).not.toMatch(/<h[23]/);
		expect(html).not.toContain('aria-labelledby');
	});

	// covers: AC-14
	it('labels itself with an h2 heading by default', async () => {
		const html = await render(Section, { heading: 'Selected work', id: 'work' });

		expect(html).toMatch(/<section id="work" aria-labelledby="work-heading"/);
		expect(html).toMatch(/<h2 id="work-heading"[^>]*>Selected work<\/h2>/);
	});

	// covers: AC-14
	it('uses an h3 when headingLevel is 3', async () => {
		const html = await render(Section, { heading: 'Details', id: 'details', headingLevel: 3 });

		expect(html).toMatch(/<h3 id="details-heading"[^>]*>Details<\/h3>/);
	});

	it('keeps a plain id without a heading', async () => {
		const html = await render(Section, { id: 'plain' });

		expect(html).toMatch(/^<section id="plain"/);
		expect(html).not.toContain('aria-labelledby');
	});
});
