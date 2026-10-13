// The strict frontmatter schema for one project entry (spec 0002, Data model
// sketch). Pure: the caller passes in Astro's `image` helper, so the schema can
// be driven in tests with a stub.
import type { ImageFunction } from 'astro/content/config';
import { z } from 'astro/zod';
import { KINDS, LINK_KINDS, SERVICES, STACK, vocabularyKeys } from './vocabulary';

/** A month written `YYYY-MM`, month 01 to 12. */
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The only cover file names an entry may use (AC-12). */
export const COVER_FIELD = /^\.\/cover\.(png|jpg|jpeg|webp)$/;

/** Text that is trimmed first, then must be 1 to `max` characters. */
const text = (max: number) => z.string().trim().min(1).max(max);

/** A list of vocabulary keys: at least one, each known, no repeats. */
const keyList = <K extends string>(keys: readonly [K, ...K[]]) =>
	z
		.array(z.enum(keys))
		.min(1)
		.refine((list) => new Set(list).size === list.length, { message: 'has a repeated key' });

const month = z.string().regex(MONTH, { message: 'must be a month written YYYY-MM' });

const metric = z.strictObject({ value: text(12), label: text(40) });

const link = z.strictObject({
	kind: z.enum(vocabularyKeys(LINK_KINDS)),
	url: z
		.string()
		.trim()
		.regex(/^https:\/\//, { message: 'must start with https://' })
		.pipe(z.url({ protocol: /^https$/ })),
	label: text(40).optional(),
});

/**
 * Builds the `projects` collection schema around Astro's `image` helper.
 * Every object is strict, every text is trimmed before its length check, the
 * enums come from `src/lib/vocabulary.ts`, `end` may not be before `start`, and
 * the cover name is checked as a string before `image()` sees it.
 */
export const projectSchema = (image: ImageFunction) =>
	z
		.strictObject({
			title: text(80),
			summary: text(160),
			outcome: text(120),
			kind: z.enum(vocabularyKeys(KINDS)),
			client: z.strictObject({ name: text(60).optional(), description: text(80) }),
			role: text(80),
			team: text(80).optional(),
			start: month,
			end: month.optional(),
			stack: keyList(vocabularyKeys(STACK)),
			services: keyList(vocabularyKeys(SERVICES)),
			// `image()` is typed as its final object shape, but its input is the
			// path string, which is what this pipe hands it.
			cover: z
				.string()
				.regex(COVER_FIELD, {
					message: 'must be ./cover.png, ./cover.jpg, ./cover.jpeg or ./cover.webp',
				})
				.pipe(image() as unknown as z.ZodType<z.output<ReturnType<ImageFunction>>, string>),
			coverAlt: text(160),
			metrics: z.array(metric).max(3).default([]),
			links: z.array(link).default([]),
			order: z.number().int().min(1),
			featured: z.boolean().default(false),
			draft: z.boolean().default(false),
		})
		.refine(({ start, end }) => end === undefined || end >= start, {
			message: 'end must be the same month as start or later',
			path: ['end'],
		});

/** One project's validated frontmatter, the schema's output type. */
export type ProjectData = z.output<ReturnType<typeof projectSchema>>;
