// Runs every real project entry through the same checks the build runs (spec
// 0002, Build time enforcement), so CI reports the same problems as
// `npm run build`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ImageFunction } from 'astro/content/config';
import { parseFrontmatter } from 'astro/markdown';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { collectionProblems, PROJECTS_BASE, type EntryFacts } from '../src/content.config';
import { projectSchema } from '../src/lib/project-schema';
import { firstParagraph } from '../src/lib/text';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = new URL(`../${PROJECTS_BASE}/`, import.meta.url);

// The content layer hands `image()` the path string, as this stub does.
const schema = projectSchema((() => z.string()) as unknown as ImageFunction);

const entries = (existsSync(base) ? readdirSync(base, { withFileTypes: true }) : [])
	.filter((item) => item.isDirectory() && existsSync(new URL(`${item.name}/index.md`, base)))
	.map((item) => {
		const filePath = `${PROJECTS_BASE.replace(/^\.\//, '')}/${item.name}/index.md`;
		const { frontmatter, content } = parseFrontmatter(
			readFileSync(new URL(`${item.name}/index.md`, base), 'utf8'),
		);
		return { id: item.name, filePath, frontmatter, body: content.trim() };
	});

describe('real project entries (spec 0002)', () => {
	it('finds the entries on disk', () => {
		expect(entries.length).toBeGreaterThan(0);
	});

	// covers: AC-1, AC-2
	it.each(entries)('$filePath matches the schema', ({ frontmatter }) => {
		const result = schema.safeParse(frontmatter);

		expect(result.success ? [] : result.error.issues).toEqual([]);
	});

	// covers: AC-3, AC-4, AC-5, AC-8, AC-12, AC-13
	it('pass every build time check', async () => {
		const facts: readonly EntryFacts[] = entries.map(({ id, filePath, frontmatter, body }) => ({
			id,
			filePath,
			body,
			draft: frontmatter.draft === true,
			order: Number(frontmatter.order),
			coverField: String(frontmatter.cover ?? ''),
		}));

		expect(await collectionProblems(facts, root)).toEqual([]);
	});

	// covers: AC-14 (feature 6 retired the example once real entries landed,
	// as authoring.md section 1 says; the real entries are now the template)
	it('has retired the example entry', () => {
		expect(entries.map(({ id }) => id)).not.toContain('example-project');
	});

	it('has at least one published, featured entry', () => {
		const featured = entries
			.map(({ frontmatter }) => schema.parse(frontmatter))
			.filter(({ draft, featured }) => featured && !draft);

		expect(featured.length).toBeGreaterThan(0);
	});
});

describe('bio (spec 0004)', () => {
	const bio = readFileSync(new URL('../src/content/bio.md', import.meta.url), 'utf8');
	const first = firstParagraph(bio);

	// covers: AC-8
	it('has a first paragraph', () => {
		expect(first).not.toBe('');
	});

	// covers: AC-8 (the home page shows it as plain text, so Markdown would show as symbols)
	it('keeps its first paragraph free of Markdown formatting', () => {
		expect([...first].filter((char) => '*_`[<#'.includes(char))).toEqual([]);
	});
});
