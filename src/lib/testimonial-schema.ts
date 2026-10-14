// The strict schema for one testimonial file (spec 0009, Data model sketch).
// Pure: no disk, no clock. The cross file rules live in
// `src/lib/testimonial-checks.ts`.
import { z } from 'astro/zod';

/** A date written `YYYY-MM-DD`. */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Text that is trimmed first, then must be 1 to `max` characters. */
const text = (max: number) => z.string().trim().min(1).max(max);

/** True when `value` is a real calendar date written `YYYY-MM-DD`, so `2026-02-30` is not. */
const isCalendarDate = (value: string): boolean => {
	const match = DATE.exec(value);
	if (match === null) return false;
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	);
};

/** How the person said yes. */
export const PERMISSION_VIAS = ['email', 'message', 'in-person'] as const;

const permission = z.strictObject({
	date: z.string().refine(isCalendarDate, { message: 'must be a real date written YYYY-MM-DD' }),
	via: z.enum(PERMISSION_VIAS),
});

/** The schema of one `src/content/testimonials/<id>.yaml` file. Every object is strict. */
export const testimonialSchema = z.strictObject({
	quote: z.string().trim().min(20).max(320),
	name: text(60),
	role: text(60),
	company: text(60),
	profileUrl: z
		.string()
		.trim()
		.regex(/^https:\/\//, { message: 'must start with https://' })
		.pipe(z.url({ protocol: /^https$/ }))
		.optional(),
	project: z.string().trim().min(1).optional(),
	order: z.number().int().min(1),
	permission,
});

/** One testimonial's validated data, the schema's output type. */
export type TestimonialData = z.output<typeof testimonialSchema>;
