// The read helpers every page uses for testimonials (spec 0009, Interface
// surface). No page sorts, filters or formats a quote on its own.
import type { CollectionEntry } from 'astro:content';
import { projectPath, type Project } from './projects';
import type { TestimonialData } from './testimonial-schema';

/** One testimonial entry: `id` is its file name, `data` its validated fields. */
export type Testimonial = CollectionEntry<'testimonials'>;

/** What `Testimonials` renders for one quote. `permission` is deliberately absent. */
export interface TestimonialView {
	readonly id: string;
	readonly quote: string;
	readonly name: string;
	readonly profileUrl?: string;
	/** `Role, Company`. */
	readonly attribution: string;
	/** The project the quote is about, only when that project's page exists in this build. */
	readonly project?: { readonly title: string; readonly href: string };
}

/** How many quotes the home page shows at most. */
export const HOME_TESTIMONIAL_LIMIT = 3;

/** A new list sorted by `order`, lowest first. Never mutates its input. */
export const sortTestimonials = (entries: readonly Testimonial[]): readonly Testimonial[] =>
	[...entries].sort((a, b) => a.data.order - b.data.order);

/** The first `HOME_TESTIMONIAL_LIMIT` quotes of an already sorted list. */
export const homeTestimonials = (sorted: readonly Testimonial[]): readonly Testimonial[] =>
	sorted.slice(0, HOME_TESTIMONIAL_LIMIT);

/** Every quote in `sorted` that points at `projectId`, in the given order. */
export const testimonialsFor = (
	projectId: string,
	sorted: readonly Testimonial[],
): readonly Testimonial[] => sorted.filter((entry) => entry.data.project === projectId);

/** `Role, Company`. */
export const attributionLine = (data: Pick<TestimonialData, 'role' | 'company'>): string =>
	`${data.role}, ${data.company}`;

/**
 * The render shape of one quote. `projects` is the list the page already
 * filtered with `visibleProjects`; the project link appears only when the
 * quote's `project` matches an entry in it.
 */
export const testimonialView = (
	entry: Testimonial,
	projects: readonly Project[],
): TestimonialView => {
	const { quote, name, profileUrl, project: projectId } = entry.data;
	const match = projectId === undefined ? undefined : projects.find((p) => p.id === projectId);
	return {
		id: entry.id,
		quote,
		name,
		profileUrl,
		attribution: attributionLine(entry.data),
		project:
			match === undefined ? undefined : { title: match.data.title, href: projectPath(match.id) },
	};
};
