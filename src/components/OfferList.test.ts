// OfferList (spec 0008; design.md, Component values: Services page). The
// fixtures are minimal entries cast to the entry type, since the container API
// cannot load the content collection.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../lib/projects';
import OfferList from './OfferList.astro';

const project = (id: string, title: string): Project =>
	({ id, collection: 'projects', data: { title } }) as unknown as Project;

const offer = (id: string, proof: readonly Project[]) => ({
	id,
	name: `Name of ${id}`,
	summary: `Summary of ${id}.`,
	services: ['backend'] as const,
	proof,
});

describe('OfferList', () => {
	let container: AstroContainer;

	beforeEach(async () => {
		container = await AstroContainer.create();
	});

	const render = (offers: ReturnType<typeof offer>[]) =>
		container.renderToString(OfferList, {
			props: { heading: 'What I offer', proofLabel: 'Seen in', offers },
		});

	// covers: AC-5
	it('renders a labelled offers section with an h2 and one li per offer, in order', async () => {
		const html = await render([offer('a', []), offer('b', [])]);

		expect(html).toMatch(/^<section id="offers" aria-labelledby="offers-heading"/);
		expect(html).toContain('<h2 id="offers-heading" class="mb-6">What I offer</h2>');
		expect(html.indexOf('Name of a')).toBeLessThan(html.indexOf('Name of b'));
		expect(html.match(/<h3 class="text-xl">/g)).toHaveLength(2);
		expect(html.match(/<p class="max-w-measure">/g)).toHaveLength(2);
	});

	// covers: AC-5
	it('shows the Seen in label and name links to the project pages when there is proof', async () => {
		const html = await render([
			offer('a', [project('one', 'First one'), project('two', 'Second')]),
		]);

		expect(html).toContain('<p class="text-sm text-muted">Seen in</p>');
		expect(html).toContain('aria-label="Seen in: Name of a"');
		expect(html).toMatch(/<a href="\/projects\/one"[^>]*>\s*First one\s*<\/a>/);
		expect(html).toMatch(/<a href="\/projects\/two"[^>]*>\s*Second\s*<\/a>/);
		expect(html.indexOf('First one')).toBeLessThan(html.indexOf('Second'));
	});

	// covers: AC-5
	it('shows no label and no inner list for an offer without proof', async () => {
		const html = await render([offer('a', [])]);

		expect(html).not.toContain('Seen in');
		expect(html).not.toContain('aria-label="');
		expect(html).not.toContain('<a ');
		expect(html.match(/<ul[\s>]/g)).toHaveLength(1);
	});
});
