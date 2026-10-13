import { describe, expect, it } from 'vitest';
import { blockBody, declarationsOf, readTokenTable } from './design-tokens';

const table = (rows: readonly string[], stated = rows.length) =>
	[
		`Rows: ${stated}.`,
		'',
		'<!-- token-table:demo:start -->',
		'| Token | Light | Dark | Used for |',
		'|---|---|---|---|',
		...rows,
		'<!-- token-table:demo:end -->',
	].join('\n');

const BG =
	'| `--color-bg` | `oklch(98% 0 0)` | `oklch(17% 0 0)` | the page, with `code` in commentary |';
const FG = '| `--color-text` | `oklch(20% 0 0)` | `oklch(90% 0 0)` | text |';

describe('readTokenTable', () => {
	// covers: AC-1
	it('reads token names and value cells, ignoring commentary', () => {
		const result = readTokenTable(table([BG, FG]), 'demo', 2);

		expect(result).toEqual({
			ok: true,
			rows: [
				{ token: '--color-bg', values: ['oklch(98% 0 0)', 'oklch(17% 0 0)'] },
				{ token: '--color-text', values: ['oklch(20% 0 0)', 'oklch(90% 0 0)'] },
			],
		});
	});

	// covers: AC-1
	it('fails on a duplicate token', () => {
		const result = readTokenTable(table([BG, BG]), 'demo', 2);

		expect(result).toEqual({ ok: false, error: 'demo: duplicate token --color-bg' });
	});

	// covers: AC-1
	it('fails when the row count differs from the stated one', () => {
		const result = readTokenTable(table([BG, FG], 3), 'demo', 2);

		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toContain('2 rows, but the table states 3');
	});

	// covers: AC-1
	it.each([
		['a token cell without a code span', '| --color-bg | `a` | `b` | x |'],
		['a token cell with extra text', '| `--color-bg` (paper) | `a` | `b` | x |'],
		['a token name that is not a custom property', '| `color-bg` | `a` | `b` | x |'],
		['a value cell with no code span', '| `--color-bg` | a | `b` | x |'],
		['a value cell with two code spans', '| `--color-bg` | `a` `c` | `b` | x |'],
		['too few cells', '| `--color-bg` | `a` |'],
		['a line that is not a row', 'some prose inside the table'],
	])('fails on %s', (_, row) => {
		const result = readTokenTable(table([row]), 'demo', 2);

		expect(result.ok).toBe(false);
	});

	it('fails when a marker is missing', () => {
		const result = readTokenTable(
			table([BG]).replace('<!-- token-table:demo:end -->', ''),
			'demo',
			2,
		);

		expect(result).toEqual({ ok: false, error: 'demo: missing start or end marker' });
	});

	it('fails when no row count is stated', () => {
		const result = readTokenTable(table([BG]).replace('Rows: 1.', ''), 'demo', 2);

		expect(result.ok).toBe(false);
	});
});

describe('blockBody', () => {
	it('returns the body of the first matching block, across nested braces', () => {
		const css =
			'a { b: c; }\n@theme static { --x: 1; @media (x) { --y: 2; } --z: 3; }\n:root { --w: 4; }';

		expect(blockBody(css, '@theme static {')).toBe(' --x: 1; @media (x) { --y: 2; } --z: 3; ');
		expect(blockBody(css, ':root {')).toBe(' --w: 4; ');
	});

	it('returns null when the block is missing or unclosed', () => {
		expect(blockBody('a {}', ':root {')).toBeNull();
		expect(blockBody(':root { --a: 1;', ':root {')).toBeNull();
	});
});

describe('declarationsOf', () => {
	it('lists custom property declarations in order and skips wildcard resets', () => {
		const body = `
			--color-*: initial;
			--color-bg: light-dark(oklch(98% 0 0), oklch(17% 0 0));
			--text-sm: 0.9375rem;
			--text-sm--line-height: 1.5;
		`;

		expect(declarationsOf(body)).toEqual([
			['--color-bg', 'light-dark(oklch(98% 0 0), oklch(17% 0 0))'],
			['--text-sm', '0.9375rem'],
			['--text-sm--line-height', '1.5'],
		]);
	});
});
