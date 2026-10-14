import { describe, expect, it } from 'vitest';
import { firstParagraph } from './text';

describe('firstParagraph', () => {
	// covers: AC-8
	it('returns a single paragraph unchanged', () => {
		expect(firstParagraph('One paragraph, one line.')).toBe('One paragraph, one line.');
	});

	// covers: AC-8
	it('returns only the first of several paragraphs', () => {
		expect(firstParagraph('First.\n\nSecond.\n\nThird.')).toBe('First.');
	});

	// covers: AC-8
	it('joins the lines of a wrapped paragraph with single spaces', () => {
		expect(firstParagraph('One line\nnext line  \n   last line\n\nSecond.')).toBe(
			'One line next line last line',
		);
	});

	// covers: AC-8
	it('handles Windows line breaks', () => {
		expect(firstParagraph('One line\r\nnext line\r\n\r\nSecond.')).toBe('One line next line');
	});

	// covers: AC-8
	it('treats a line holding only whitespace as a paragraph break', () => {
		expect(firstParagraph('First.\n \t \nSecond.')).toBe('First.');
	});

	// covers: AC-8
	it('skips leading blank lines and surrounding whitespace', () => {
		expect(firstParagraph('\n\n  \n  First.  \n\nSecond.')).toBe('First.');
	});

	// covers: AC-8
	it.each(['', '   ', '\n\n', ' \r\n\t '])('returns an empty string for %j', (input) => {
		expect(firstParagraph(input)).toBe('');
	});

	it('keeps spaces inside a line as they are', () => {
		expect(firstParagraph('Two  spaces stay.')).toBe('Two  spaces stay.');
	});
});
