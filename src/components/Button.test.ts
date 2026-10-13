import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import Button from './Button.astro';

let container: AstroContainer;

beforeEach(async () => {
	container = await AstroContainer.create();
});

const render = (props: Record<string, unknown> = {}) =>
	container.renderToString(Button, { props, slots: { default: 'Go' } });

const classesOf = (html: string) => (html.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/);

describe('Button', () => {
	// covers: AC-14
	it('renders a type="button" button by default', async () => {
		const html = await render();

		expect(html).toMatch(/^<button type="button"/);
		expect(html).toContain('>Go</button>');
	});

	// covers: AC-14
	it('renders a submit button when asked', async () => {
		const html = await render({ type: 'submit' });

		expect(html).toMatch(/^<button type="submit"/);
	});

	// covers: AC-14
	it('renders a link when given href, with no type attribute', async () => {
		const html = await render({ href: '/work' });

		expect(html).toMatch(/^<a href="\/work"/);
		expect(html).not.toContain('type=');
		expect(html).not.toContain('<button');
	});

	// covers: AC-14
	it('shares the size, shape and motion of both variants', async () => {
		for (const variant of ['primary', 'secondary']) {
			const classes = classesOf(await render({ variant }));

			expect(classes).toEqual(
				expect.arrayContaining([
					'min-h-11',
					'px-4.5',
					'text-base',
					'font-semibold',
					'rounded-sm',
					'border',
					'duration-(--duration-fast)',
				]),
			);
		}
	});

	// covers: AC-14
	it('defaults to primary: accent fill, on-accent text, accent-strong on hover and press', async () => {
		const classes = classesOf(await render());

		expect(classes).toEqual(
			expect.arrayContaining([
				'bg-accent',
				'text-on-accent',
				'border-accent',
				'hover:bg-accent-strong',
				'hover:border-accent-strong',
				'active:bg-accent-strong',
				'active:border-accent-strong',
			]),
		);
	});

	// covers: AC-14
	it('renders secondary: outlined, accent on hover, accent-strong on press', async () => {
		const classes = classesOf(await render({ variant: 'secondary' }));

		expect(classes).toEqual(
			expect.arrayContaining([
				'bg-transparent',
				'text-text',
				'border-line',
				'hover:border-accent',
				'hover:text-accent',
				'active:border-accent-strong',
				'active:text-accent-strong',
			]),
		);
		expect(classes).not.toContain('bg-accent');
	});

	it('passes extra classes through', async () => {
		const classes = classesOf(await render({ class: 'w-full' }));

		expect(classes).toContain('w-full');
	});
});
