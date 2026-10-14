// Small pure helpers for plain text taken from Markdown sources (spec 0004).

/** A line break, with any spaces or tabs around it. */
const LINE_BREAK = /[^\S\r\n]*\r?\n[^\S\r\n]*/g;

/** A blank line: a line break, a line holding only whitespace, then another break. */
const BLANK_LINE = /\r?\n[^\S\r\n]*\r?\n/;

/**
 * The first paragraph of a Markdown source as one line of text: the input is
 * trimmed, cut at the first blank line, and each line break inside the first
 * block (with the whitespace around it) becomes one space. Empty or whitespace
 * only input gives `''`. Formatting is not rendered; callers show plain text.
 */
export const firstParagraph = (markdown: string): string =>
	(markdown.trim().split(BLANK_LINE)[0] ?? '').trim().replace(LINE_BREAK, ' ');
