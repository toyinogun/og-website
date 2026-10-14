// The build time checks for testimonial entries (spec 0009, AC-3 and AC-4).
// Every check is pure, returns a list of problems and never throws. The loader
// edge in `src/content.config.ts` feeds them what it read and is the only
// place that throws.
import { checkSlug, findDuplicateOrders, type Problem } from './project-checks';
import type { TestimonialData } from './testimonial-schema';

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const SEPARATORS = /[\s.\-/()[\]]/g;
const PHONE_DIGITS = /\d{7,}/;

/** The fields that must hold no contact details. */
const CHECKED_FIELDS = ['quote', 'name', 'role', 'company'] as const;

type CheckedFields = Pick<TestimonialData, (typeof CHECKED_FIELDS)[number]>;

/**
 * One `contact-details` problem per field of `entry.data` whose text holds an
 * email shaped string or a run of seven or more digits once spaces, dots,
 * dashes, slashes and brackets are removed (a phone number).
 */
export const findContactDetails = (entry: {
	readonly id: string;
	readonly data: CheckedFields;
}): readonly Problem[] =>
	CHECKED_FIELDS.flatMap((field) => {
		const value = entry.data[field];
		const kind = EMAIL.test(value)
			? 'an email address'
			: PHONE_DIGITS.test(value.replace(SEPARATORS, ''))
				? 'a phone number'
				: undefined;
		return kind === undefined
			? []
			: [
					{
						rule: 'contact-details',
						message: `${field} holds ${kind}, remove it (this repository is public)`,
						ids: [entry.id],
					},
				];
	});

/** One `unknown-project` problem per entry whose `project` is set and not in `projectIds`. */
export const checkProjectRefs = (
	entries: readonly { readonly id: string; readonly project?: string }[],
	projectIds: ReadonlySet<string>,
): readonly Problem[] =>
	entries.flatMap(({ id, project }) =>
		project === undefined || projectIds.has(project)
			? []
			: [
					{
						rule: 'unknown-project',
						message: `project "${project}" has no folder src/content/projects/${project}/index.md`,
						ids: [id],
					},
				],
	);

/** What the collection wide check needs from one schema valid entry. */
export interface TestimonialFacts {
	readonly id: string;
	readonly data: CheckedFields & { readonly order: number; readonly project?: string };
}

/**
 * Every spec 0009 rule that spans or inspects entries (AC-3): file name slug,
 * duplicate `order`, unknown `project` and contact details. Pure; the edge
 * adds the schema problems and maps ids to file paths.
 */
export const collectionTestimonialProblems = (
	entries: readonly TestimonialFacts[],
	projectIds: ReadonlySet<string>,
): readonly Problem[] => [
	...entries.flatMap(({ id }) => checkSlug(id)),
	...findDuplicateOrders(entries.map(({ id, data }) => ({ id, order: data.order }))),
	...checkProjectRefs(
		entries.map(({ id, data }) => ({ id, project: data.project })),
		projectIds,
	),
	...entries.flatMap((entry) => findContactDetails(entry)),
];
