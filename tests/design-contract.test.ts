// The design contract (spec 0003, AC-1 to AC-3): design.md and global.css
// cannot drift apart, components never carry their own colours, and every
// contrast pair in design.md clears its floor in both themes.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/lib/color';
import { blockBody, declarationsOf, readTokenTable, type TokenRow } from '../src/lib/design-tokens';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

const design = read('design.md');
const css = read('src/styles/global.css');

const rowsOf = (name: string, valueColumns: number): readonly TokenRow[] => {
	const result = readTokenTable(design, name, valueColumns);
	if (!result.ok) throw new Error(result.error);
	return result.rows;
};

const theme = new Map(declarationsOf(blockBody(css, '@theme static {') ?? ''));
const rootBlock = new Map(declarationsOf(blockBody(css, ':root {') ?? ''));

const TOKEN_FAMILIES = /^--(color|text|container|radius|duration)-/;

describe('design.md token tables', () => {
	// covers: AC-1
	it.each([
		['colour', 2],
		['type', 2],
		['layout', 1],
	] as const)('reads the %s table cleanly', (name, columns) => {
		expect(readTokenTable(design, name, columns)).toMatchObject({ ok: true });
	});
});

describe('global.css matches design.md (AC-1)', () => {
	const colours = rowsOf('colour', 2);
	const types = rowsOf('type', 2);
	const layout = rowsOf('layout', 1);

	// covers: AC-1
	it.each(colours.map((row) => [row.token, row] as const))(
		'declares %s as one light-dark() value in @theme static',
		(token, { values: [light, dark] }) => {
			expect(theme.get(token)).toBe(`light-dark(${light}, ${dark})`);
		},
	);

	// covers: AC-1
	it.each(types.map((row) => [row.token, row] as const))(
		'declares %s and its line height in @theme static',
		(token, { values: [size, lineHeight] }) => {
			expect(theme.get(token)).toBe(size);
			expect(theme.get(`${token}--line-height`)).toBe(lineHeight);
		},
	);

	// covers: AC-1
	it.each(layout.map((row) => [row.token, row] as const))(
		'declares %s in the right block',
		(token, { values: [value] }) => {
			const block = token.startsWith('--duration-') ? rootBlock : theme;
			expect(block.get(token)).toBe(value);
		},
	);

	// covers: AC-1
	it('declares no token that design.md does not list, and repeats none', () => {
		const expected = [
			...colours.map((row) => row.token),
			...types.flatMap((row) => [row.token, `${row.token}--line-height`]),
			...layout.map((row) => row.token),
		].sort();
		const declared = [...declarationsOf(css)]
			.map(([name]) => name)
			.filter((name) => TOKEN_FAMILIES.test(name))
			.sort();

		expect(declared).toEqual(expected);
	});

	// covers: AC-1
	it('keeps the durations out of @theme', () => {
		expect([...theme.keys()].filter((name) => name.startsWith('--duration-'))).toEqual([]);
	});

	// covers: AC-1
	it('clears the stock colours and sizes before declaring its own', () => {
		const body = blockBody(css, '@theme static {') ?? '';

		expect(body).toMatch(/--color-\*:\s*initial;/);
		expect(body).toMatch(/--text-\*:\s*initial;/);
	});
});

describe('no colour outside the tokens (AC-2)', () => {
	const FOLDERS = ['src/components', 'src/layouts', 'src/pages', 'src/dev'];
	const filesIn = (dir: string): readonly string[] =>
		readdirSync(new URL(dir, root)).flatMap((name) => {
			const path = join(dir, name);
			return statSync(new URL(path, root)).isDirectory() ? filesIn(`${path}/`) : [path];
		});
	const files = FOLDERS.flatMap((folder) => filesIn(`${folder}/`));

	const BANS = [
		['a hex colour', /#[0-9a-fA-F]{3,8}\b/],
		['a colour function', /\b(?:rgba?|hsla?|oklch)\(/],
		['a dark: variant', /(?<![\w-])dark:/],
		['an opacity modifier on a text or border colour', /(?<![\w-])(?:text|border)-[a-z0-9-]+\/\S/],
	] as const;

	it('scans the component, layout, page and style guide files', () => {
		expect(files.length).toBeGreaterThan(10);
	});

	// covers: AC-2
	it.each(BANS)('no file contains %s', (_, pattern) => {
		const offenders = files.filter((file) => pattern.test(read(file)));

		expect(offenders).toEqual([]);
	});

	// covers: AC-2
	it.each([
		['#24569f', 0],
		['color: rgb(0 0 0)', 1],
		['class="dark:bg-bg"', 2],
		['class="md:dark:text-text"', 2],
		['class="text-muted/70"', 3],
		['class="border-line/50"', 3],
	] as const)('catches %s', (sample, ban) => {
		expect(BANS[ban][1].test(sample)).toBe(true);
	});

	it.each(['href="#main"', 'light-dark(', 'data-theme=dark', 'text-muted', 'border-t'])(
		'lets %s through',
		(sample) => {
			expect(BANS.some(([, pattern]) => pattern.test(sample))).toBe(false);
		},
	);
});

describe('contrast floor (AC-3)', () => {
	const colours = new Map(rowsOf('colour', 2).map((row) => [row.token, row.values] as const));
	const floor = design.slice(design.indexOf('**Contrast floor**'));
	const floorLine = floor.slice(0, floor.indexOf('\n'));

	// The pairs listed under *Contrast floor* in design.md.
	const PAIRS = [
		['--color-text', '--color-bg', 4.5],
		['--color-text', '--color-surface', 4.5],
		['--color-muted', '--color-bg', 4.5],
		['--color-muted', '--color-surface', 4.5],
		['--color-accent', '--color-bg', 4.5],
		['--color-accent', '--color-surface', 4.5],
		['--color-on-accent', '--color-accent', 4.5],
		['--color-on-accent', '--color-accent-strong', 4.5],
		['--color-accent', '--color-bg', 3],
	] as const;

	it('lists every pair token in the design.md contrast floor', () => {
		for (const [foreground, background] of PAIRS) {
			expect(floorLine).toContain(`\`${foreground}\``);
			expect(floorLine).toContain(`\`${background}\``);
		}
	});

	// covers: AC-3
	it.each(
		PAIRS.flatMap(([foreground, background, ratio]) =>
			(['light', 'dark'] as const).map(
				(themeName) => [foreground, background, themeName, ratio] as const,
			),
		),
	)('%s on %s in %s reaches %d to 1', (foreground, background, themeName, ratio) => {
		const column = themeName === 'light' ? 0 : 1;
		const value = contrastRatio(
			colours.get(foreground)?.[column] ?? '',
			colours.get(background)?.[column] ?? '',
		);

		expect(Number.isFinite(value)).toBe(true);
		expect(value).toBeGreaterThanOrEqual(ratio);
	});
});
