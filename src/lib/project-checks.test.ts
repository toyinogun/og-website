import { fromMarkdown } from 'mdast-util-from-markdown';
import { describe, expect, it } from 'vitest';
import {
	checkBody,
	checkCover,
	checkImages,
	checkSlug,
	findDuplicateOrders,
	imagePathError,
} from './project-checks';

const rules = (problems: readonly { rule: string }[]) => problems.map(({ rule }) => rule);
const body = (markdown: string) => rules(checkBody(fromMarkdown(markdown)));

const VALID_BODY = `## Problem

What was wrong.

## Approach

What I did.

## Outcome

What changed.
`;

describe('checkBody (spec 0002, AC-3)', () => {
	// covers: AC-3, AC-5
	it('passes the three sections in order, each with content', () => {
		expect(body(VALID_BODY)).toEqual([]);
	});

	it('passes extra level two sections after Problem and deeper headings inside sections', () => {
		const markdown = `## Problem

Text.

## Architecture

Diagram notes.

## Approach

### A sub heading

More text.

## Outcome

Text.

## What I would do differently

Text.
`;
		expect(body(markdown)).toEqual([]);
	});

	// covers: AC-3, AC-5
	it('fails when the body does not start with ## Problem', () => {
		expect(body(`Intro paragraph.\n\n${VALID_BODY}`)).toEqual(['body-first-section']);
		expect(body(`## Context\n\nText.\n\n${VALID_BODY}`)).toEqual(['body-first-section']);
	});

	// covers: AC-3, AC-5
	it('fails on an empty body', () => {
		expect(body('')).toEqual([
			'body-first-section',
			'body-missing-section',
			'body-missing-section',
			'body-missing-section',
		]);
	});

	it('matches section names exactly, case sensitive', () => {
		expect(body(VALID_BODY.replace('## Problem', '## problem'))).toContain('body-first-section');
	});

	// covers: AC-3, AC-5
	it('fails on a missing section, naming it', () => {
		const problems = checkBody(fromMarkdown(VALID_BODY.replace('## Approach', '### Approach')));

		expect(rules(problems)).toEqual(['body-missing-section']);
		expect(problems[0]?.message).toContain('## Approach');
	});

	// covers: AC-3, AC-5
	it('fails on a repeated section', () => {
		expect(body(`${VALID_BODY}\n## Outcome\n\nAgain.\n`)).toEqual(['body-repeated-section']);
	});

	// covers: AC-3, AC-5
	it('fails on sections out of order', () => {
		const markdown = `## Problem\n\nA.\n\n## Outcome\n\nB.\n\n## Approach\n\nC.\n`;

		expect(body(markdown)).toEqual(['body-section-order']);
	});

	// covers: AC-3, AC-5
	it('fails on a section with no content before the next level two heading', () => {
		const markdown = `## Problem\n\nA.\n\n## Approach\n\n### Only a heading\n\n## Outcome\n\nC.\n`;

		expect(body(markdown)).toEqual(['body-empty-section']);
	});

	// covers: AC-3, AC-5
	it('fails on a section with no content at the end of the body', () => {
		expect(body(VALID_BODY.replace('What changed.', ''))).toEqual(['body-empty-section']);
	});

	// covers: AC-3, AC-5
	it('fails on a level one heading in either Markdown style', () => {
		expect(body(`${VALID_BODY}\n# Big title\n`)).toEqual(['body-level-one-heading']);
		expect(body(`${VALID_BODY}\nBig title\n=========\n`)).toEqual(['body-level-one-heading']);
	});

	// covers: AC-3, AC-5
	it('ignores headings inside quotes, lists and code', () => {
		const markdown = `${VALID_BODY}
> ## Problem
> # Quoted title

- ## Approach

\`\`\`md
# Not a heading
## Outcome
\`\`\`
`;
		expect(body(markdown)).toEqual([]);
	});

	it('does not count a heading inside a quote as the missing section', () => {
		const markdown = VALID_BODY.replace('## Outcome', '> ## Outcome');

		expect(body(markdown)).toEqual(['body-missing-section']);
	});

	it('never throws on odd input', () => {
		expect(() => checkBody(fromMarkdown('<div>\n\n|a|\n|-|\n\n***'))).not.toThrow();
	});
});

const EXISTING = new Set(['cover.png', 'shot.png', 'sub/diagram.webp', 'with space.jpg']);
const images = (markdown: string, existing: ReadonlySet<string> = EXISTING) =>
	rules(checkImages(fromMarkdown(markdown), existing));

describe('checkImages (spec 0002, AC-13)', () => {
	// covers: AC-13, AC-5
	it('passes local images with alt text, inline and reference style, at any depth', () => {
		const markdown = `![A screenshot](./shot.png)

- ![A diagram](./sub/diagram.webp)

![Reference image][ref]

![Spaced](./with%20space.jpg)

[ref]: ./shot.png
`;
		expect(images(markdown)).toEqual([]);
	});

	// covers: AC-13, AC-5
	it('fails on empty alt text, inline and reference style', () => {
		expect(images('![](./shot.png)')).toEqual(['image-alt']);
		expect(images('![   ](./shot.png)')).toEqual(['image-alt']);
		expect(images('![][ref]\n\n[ref]: ./shot.png')).toEqual(['image-alt']);
	});

	// covers: AC-13, AC-5
	it.each([
		['../outside.png'],
		['./sub/../../outside.png'],
		['/shot.png'],
		['https://example.com/shot.png'],
		['http://example.com/shot.png'],
		['shot.png'],
		['~/shot.png'],
		['@assets/shot.png'],
		['./animation.gif'],
	])('fails on the path %s', (url) => {
		expect(images(`![Alt](${url})`)).toEqual(['image-path']);
	});

	// covers: AC-13, AC-5
	it('fails on a reference style image with a bad path', () => {
		expect(images('![Alt][r]\n\n[r]: https://example.com/x.png')).toEqual(['image-path']);
	});

	// covers: AC-13, AC-5
	it('fails on a missing file', () => {
		const problems = checkImages(fromMarkdown('![Alt](./gone.png)'), EXISTING);

		expect(rules(problems)).toEqual(['image-missing']);
		expect(problems[0]?.message).toContain('./gone.png');
	});

	// covers: AC-13, AC-5
	it('fails on raw <img> or <h1> HTML in any letter case', () => {
		expect(images('<IMG src="./shot.png" alt="x">')).toEqual(['raw-html']);
		expect(images('<h1>Title</h1>')).toEqual(['raw-html']);
		expect(images('Text with <img src="./shot.png"> inline.')).toEqual(['raw-html']);
	});

	it('passes other raw HTML', () => {
		expect(images('<details><summary>More</summary>\n\nText.\n\n</details>')).toEqual([]);
		expect(images('<h2>Fine</h2>')).toEqual([]);
	});

	it('reports both a missing alt and a bad path on the same image', () => {
		expect(images('![](../x.png)')).toEqual(['image-alt', 'image-path']);
	});
});

describe('imagePathError', () => {
	it('passes a nested relative path', () => {
		expect(imagePathError('./a/b/c.jpeg')).toBeUndefined();
	});

	it('explains a remote URL', () => {
		expect(imagePathError('https://x.com/a.png')).toMatch(/not a URL/);
	});
});

describe('checkCover (spec 0002, AC-12)', () => {
	const cover = (over: Partial<Parameters<typeof checkCover>[0]>) =>
		rules(
			checkCover({
				coverField: './cover.png',
				files: ['index.md', 'cover.png'],
				width: 1200,
				...over,
			}),
		);

	// covers: AC-12, AC-5
	it.each(['png', 'jpg', 'jpeg', 'webp'])('passes one cover.%s at least 1200 wide', (ext) => {
		expect(cover({ coverField: `./cover.${ext}`, files: [`cover.${ext}`], width: 1200 })).toEqual(
			[],
		);
	});

	// covers: AC-12, AC-5
	it('fails with no cover file', () => {
		expect(cover({ files: ['index.md'] })).toEqual(['cover-missing']);
	});

	// covers: AC-12, AC-5
	it('fails with two cover files', () => {
		expect(cover({ files: ['cover.png', 'cover.jpg'] })).toEqual(['cover-count']);
	});

	// covers: AC-12, AC-5
	it('fails with a cover file of a disallowed type', () => {
		expect(cover({ coverField: './cover.gif', files: ['cover.gif'] })).toEqual(['cover-type']);
	});

	// covers: AC-12, AC-5
	it('fails when the field does not point at the cover file', () => {
		expect(cover({ coverField: './cover.jpg' })).toEqual(['cover-field']);
	});

	// covers: AC-12, AC-5
	it('fails at 1199 pixels wide', () => {
		expect(cover({ width: 1199 })).toEqual(['cover-width']);
	});

	it('fails when the cover could not be measured', () => {
		expect(cover({ width: undefined })).toEqual(['cover-unreadable']);
	});
});

describe('findDuplicateOrders (spec 0002, AC-4)', () => {
	// covers: AC-4, AC-5
	it('passes unique orders', () => {
		expect(
			findDuplicateOrders([
				{ id: 'a', order: 1 },
				{ id: 'b', order: 2 },
			]),
		).toEqual([]);
	});

	it('passes an empty list', () => {
		expect(findDuplicateOrders([])).toEqual([]);
	});

	// covers: AC-4, AC-5
	it('reports one problem per clashing order, naming every id', () => {
		const problems = findDuplicateOrders([
			{ id: 'c', order: 2 },
			{ id: 'a', order: 1 },
			{ id: 'b', order: 2 },
			{ id: 'd', order: 2 },
			{ id: 'e', order: 1 },
		]);

		expect(problems).toEqual([
			{ rule: 'duplicate-order', message: 'order 1 is used by 2 entries', ids: ['a', 'e'] },
			{ rule: 'duplicate-order', message: 'order 2 is used by 3 entries', ids: ['b', 'c', 'd'] },
		]);
	});

	it('does not mutate its input', () => {
		const entries = Object.freeze([
			Object.freeze({ id: 'b', order: 1 }),
			Object.freeze({ id: 'a', order: 1 }),
		]);

		expect(() => findDuplicateOrders(entries)).not.toThrow();
		expect(entries.map(({ id }) => id)).toEqual(['b', 'a']);
	});
});

describe('checkSlug (spec 0002, AC-8)', () => {
	// covers: AC-8, AC-5
	it.each(['example-project', 'a', 'v2', 'my-2024-project'])('passes %s', (id) => {
		expect(checkSlug(id)).toEqual([]);
	});

	// covers: AC-8, AC-5
	it.each(['Example-Project', 'my_project', 'my project', '-lead', 'trail-', 'double--dash', ''])(
		'fails %s, naming it',
		(id) => {
			expect(checkSlug(id)).toEqual([expect.objectContaining({ rule: 'slug', ids: [id] })]);
		},
	);
});
