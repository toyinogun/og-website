// Reads the token tables in design.md and the token declarations in
// global.css, so the design contract test can compare them (spec 0003, AC-1).
// Pure: text in, data out; every failure is a returned error, never a throw.

/** One token row: its name and its value cells, in column order. */
export type TokenRow = Readonly<{ token: string; values: readonly string[] }>;

/** The result of reading one token table. */
export type TableResult =
	Readonly<{ ok: true; rows: readonly TokenRow[] }> | Readonly<{ ok: false; error: string }>;

const CODE_SPAN = /`([^`]+)`/g;
const TOKEN_NAME = /^--[a-z0-9]+(-[a-z0-9]+)*$/;

const cellsOf = (line: string): readonly string[] =>
	line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim());

const codeSpansOf = (cell: string): readonly string[] =>
	[...cell.matchAll(CODE_SPAN)].map((match) => match[1]);

/**
 * Reads the table between `<!-- token-table:<name>:start -->` and its end
 * marker, by the rules under *Token tables* in design.md: the first cell is
 * the token name in a code span, each of the `valueColumns` cells after it
 * holds exactly one code span, the rest is commentary. Fails on a missing
 * marker, a malformed or duplicate row, or a row count other than the
 * `Rows: N.` line above the table.
 */
export const readTokenTable = (
	markdown: string,
	name: string,
	valueColumns: number,
): TableResult => {
	const startMarker = `<!-- token-table:${name}:start -->`;
	const endMarker = `<!-- token-table:${name}:end -->`;
	const start = markdown.indexOf(startMarker);
	const end = markdown.indexOf(endMarker);
	if (start === -1 || end === -1 || end < start) {
		return { ok: false, error: `${name}: missing start or end marker` };
	}

	const stated = [...markdown.slice(0, start).matchAll(/^Rows: (\d+)\.$/gm)].at(-1);
	if (!stated) return { ok: false, error: `${name}: no "Rows: N." line above the table` };

	const lines = markdown
		.slice(start + startMarker.length, end)
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (lines.length < 2 || !/^\|[\s|:-]+\|$/.test(lines[1])) {
		return { ok: false, error: `${name}: no header and separator row` };
	}

	const parsed = lines.slice(2).map((line): TokenRow | string => {
		if (!line.startsWith('|')) return `not a table row: ${line}`;
		const cells = cellsOf(line);
		if (cells.length < valueColumns + 1) return `too few cells: ${line}`;
		const [nameCell, ...rest] = cells;
		const names = codeSpansOf(nameCell);
		if (names.length !== 1 || nameCell !== `\`${names[0]}\`` || !TOKEN_NAME.test(names[0])) {
			return `malformed token cell: ${line}`;
		}
		const valueCells = rest.slice(0, valueColumns).map(codeSpansOf);
		if (valueCells.some((spans) => spans.length !== 1)) {
			return `a value cell does not hold exactly one code span: ${line}`;
		}
		return { token: names[0], values: valueCells.map((spans) => spans[0]) };
	});

	const problem = parsed.find((row): row is string => typeof row === 'string');
	if (problem) return { ok: false, error: `${name}: ${problem}` };

	const rows = parsed as readonly TokenRow[];
	const duplicate = rows.find((row, i) => rows.findIndex((r) => r.token === row.token) !== i);
	if (duplicate) return { ok: false, error: `${name}: duplicate token ${duplicate.token}` };

	if (rows.length !== Number(stated[1])) {
		return { ok: false, error: `${name}: ${rows.length} rows, but the table states ${stated[1]}` };
	}
	return { ok: true, rows };
};

/**
 * The body of the first block opened by `opener` (for example
 * `@theme static {`), matching braces, or `null` when there is none.
 */
export const blockBody = (css: string, opener: string): string | null => {
	const at = css.indexOf(opener);
	if (at === -1) return null;
	const open = at + opener.length;
	const close = [...css.slice(open)].reduce<{ depth: number; index: number }>(
		(state, char, i) => {
			if (state.index !== -1) return state;
			const depth = state.depth + (char === '{' ? 1 : char === '}' ? -1 : 0);
			return { depth, index: depth === 0 ? i : -1 };
		},
		{ depth: 1, index: -1 },
	).index;
	return close === -1 ? null : css.slice(open, open + close);
};

/**
 * Custom property declarations directly in a CSS block body, as name and
 * value pairs in source order. Wildcard resets such as `--color-*: initial`
 * are skipped.
 */
export const declarationsOf = (body: string): readonly (readonly [string, string])[] =>
	[...body.matchAll(/(?:^|[;{\s])(--[a-z0-9-]+)\s*:\s*([^;{}]+);/g)].map(
		(match) => [match[1], match[2].trim()] as const,
	);
