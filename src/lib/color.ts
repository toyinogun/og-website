// Colour maths for the contrast floor in design.md (spec 0003, AC-3): parse an
// OKLCH token value and compute the WCAG contrast ratio between two of them.

/** An OKLCH colour, `l` as a 0 to 1 fraction and `h` in degrees. */
export type Oklch = Readonly<{ l: number; c: number; h: number }>;

const NUMBER = String.raw`(\d+(?:\.\d+)?|\.\d+)`;
const OKLCH_PATTERN = new RegExp(String.raw`^oklch\(\s*${NUMBER}%\s+${NUMBER}\s+${NUMBER}\s*\)$`);

/**
 * Parses exactly `oklch(<L>% <C> <H>)`, with optional extra whitespace.
 * L is 0 to 100, C at least 0, H 0 to 360. Anything else returns `null`.
 */
export const parseOklch = (value: string): Oklch | null => {
	const match = OKLCH_PATTERN.exec(value.trim());
	if (!match) return null;
	const [l, c, h] = match.slice(1).map(Number);
	return l <= 100 && h <= 360 ? { l: l / 100, c, h } : null;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Relative luminance of an OKLCH colour, on linear sRGB with channels clamped to 0 to 1. */
const luminance = ({ l, c, h }: Oklch): number => {
	const radians = (h * Math.PI) / 180;
	const a = c * Math.cos(radians);
	const b = c * Math.sin(radians);

	const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

	const red = clamp(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3);
	const green = clamp(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3);
	const blue = clamp(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3);

	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/**
 * The WCAG contrast ratio between two OKLCH values, from 1 to 21.
 * Returns `NaN` if either value fails to parse.
 */
export const contrastRatio = (a: string, b: string): number => {
	const first = parseOklch(a);
	const second = parseOklch(b);
	if (!first || !second) return Number.NaN;
	const [lighter, darker] = [luminance(first), luminance(second)].sort((x, y) => y - x);
	return (lighter + 0.05) / (darker + 0.05);
};
