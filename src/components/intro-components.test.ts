// PageIntro and CallToAction (spec 0004; values in design.md, Component values).
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import { SITE } from '../lib/site';
import CallToAction from './CallToAction.astro';
import PageIntro from './PageIntro.astro';

let container: AstroContainer;

beforeEach(async () => {
	container = await AstroContainer.create();
});

const classesOf = (html: string) => (html.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/);

describe('PageIntro', () => {
	const render = (props: Record<string, unknown>, slot?: string) =>
		container.renderToString(PageIntro, { props, slots: slot ? { default: slot } : {} });

	// covers: AC-1
	it('renders eyebrow, h1, lead and the slot, in that order, in a measure wide Stack', async () => {
		const html = await render(
			{ heading: 'Heading', lead: 'Lead line', eyebrow: 'Eyebrow line', size: 'display' },
			'<a href="/x">Action</a>',
		);

		const positions = [
			html.indexOf('>Eyebrow line</p>'),
			html.indexOf('>Heading</h1>'),
			html.indexOf('>Lead line</p>'),
			html.indexOf('>Action</a>'),
		];
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
		expect(html).toMatch(/<div class="flex flex-col gap-6 max-w-measure"/);
	});

	// covers: AC-1
	it('pads the top, 3rem then 5rem from md, and not the bottom', async () => {
		const html = await render({ heading: 'Heading' });

		expect(html).toMatch(/^<div class="pt-12 md:pt-20">/);
		expect(html).not.toMatch(/\bpb-|\bpy-/);
	});

	// covers: AC-1
	it('styles the eyebrow small and muted, and the lead large and muted', async () => {
		const html = await render({ heading: 'Heading', lead: 'Lead', eyebrow: 'Eyebrow' });

		expect(html).toContain('<p class="text-sm text-muted">Eyebrow</p>');
		expect(html).toContain('<p class="text-lg text-muted">Lead</p>');
	});

	// covers: AC-1, AC-18
	it('uses the display size for display and the 3xl size for page, page by default', async () => {
		expect(await render({ heading: 'H', size: 'display' })).toContain(
			'<h1 class="text-display">H</h1>',
		);
		expect(await render({ heading: 'H', size: 'page' })).toContain('<h1 class="text-3xl">H</h1>');
		expect(await render({ heading: 'H' })).toContain('<h1 class="text-3xl">H</h1>');
	});

	// covers: AC-18
	it('leaves out the eyebrow and lead when they are not given', async () => {
		const html = await render({ heading: 'Heading' });

		expect(html.match(/<p[\s>]/g)).toBeNull();
		expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
	});

	it('escapes markup in its text', async () => {
		const html = await render({ heading: '<b>x</b>', lead: '<i>y</i>' });

		expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
		expect(html).toContain('&lt;i&gt;y&lt;/i&gt;');
	});
});

describe('CallToAction', () => {
	const render = (props: Record<string, unknown> = {}) =>
		container.renderToString(CallToAction, { props });

	// covers: AC-3
	it('renders a primary Button link to SITE.contact, in the same tab', async () => {
		const html = await render();

		expect(html).toMatch(new RegExp(`^<a href="${SITE.contact.href}"`));
		expect(html).toContain(`>${SITE.contact.label}</a>`);
		expect(classesOf(html)).toEqual(expect.arrayContaining(['bg-accent', 'min-h-11']));
		expect(html).not.toContain('target=');
	});

	// covers: AC-3, AC-15
	it('passes layout classes through to the button', async () => {
		const classes = classesOf(await render({ class: 'w-full sm:w-auto sm:self-start' }));

		expect(classes).toEqual(expect.arrayContaining(['w-full', 'sm:w-auto', 'sm:self-start']));
	});
});
