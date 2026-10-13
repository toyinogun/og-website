import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { Content as Sample } from '../dev/sample.md';
import Prose from './Prose.astro';

describe('Prose', () => {
	// covers: AC-15
	it('wraps its content in a prose div', async () => {
		const container = await AstroContainer.create();
		const html = await container.renderToString(Prose, {
			props: { class: 'mt-6' },
			slots: { default: '<p>Body</p>' },
		});

		expect(html).toMatch(/^<div class="prose mt-6"><p>Body<\/p><\/div>$/);
	});

	// covers: AC-15
	it('highlights fenced code with both GitHub themes through light-dark()', async () => {
		const container = await AstroContainer.create();
		const html = await container.renderToString(Sample);

		const pre = html.match(/<pre[^>]*>/)?.[0] ?? '';
		expect(pre).toContain('github-light');
		expect(pre).toContain('github-dark');
		expect(pre).toMatch(/background-color:\s*light-dark\(/);
		expect(html).toMatch(/<span style="color:\s*light-dark\(/);
	});
});
