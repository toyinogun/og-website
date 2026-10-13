// The read helpers every page uses for projects (spec 0002, Interface
// surface). No page sorts, filters or formats a project on its own. Pages
// decide whether drafts show and pass that in: `import.meta.env.DEV`.
import type { CollectionEntry } from 'astro:content';
import type { ProjectData } from './project-schema';
import { linkKindLabel } from './vocabulary';

export { kindLabel, serviceLabel, stackLabel } from './vocabulary';

/** One project entry: `id` is its folder name, `data` its validated frontmatter. */
export type Project = CollectionEntry<'projects'>;

/** One link from a project's `links` list. */
export type ProjectLink = ProjectData['links'][number];

/** Fixed English short month names, so output never depends on the build machine's locale. */
const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const;

/** The entries a page may show: drafts dropped unless `includeDrafts`. */
export const visibleProjects = (
	entries: readonly Project[],
	opts: { readonly includeDrafts: boolean },
): readonly Project[] => entries.filter((entry) => opts.includeDrafts || !entry.data.draft);

/** A new list sorted by `order`, lowest first. Never mutates its input. */
export const sortProjects = (entries: readonly Project[]): readonly Project[] =>
	[...entries].sort((a, b) => a.data.order - b.data.order);

/**
 * The `featured` entries of `visible`, sorted by `order`. It does not filter
 * drafts itself, so pass the list `visibleProjects` returned.
 */
export const featuredProjects = (visible: readonly Project[]): readonly Project[] =>
	sortProjects(visible.filter((entry) => entry.data.featured));

/** A project's page address, `/projects/<id>`. */
export const projectPath = (id: string): string => `/projects/${id}`;

/** `2024-03` as `Mar 2024`. Input is already schema checked. */
const formatMonth = (month: string): string => {
	const [year, number] = month.split('-');
	return `${MONTHS[Number(number) - 1]} ${year}`;
};

/**
 * When a project ran: `Mar 2024 to Jan 2025`, `Mar 2024 to present` with no
 * end, or `Mar 2024` when it started and ended in the same month.
 */
export const formatTimeframe = (start: string, end?: string): string =>
	end === undefined
		? `${formatMonth(start)} to present`
		: end === start
			? formatMonth(start)
			: `${formatMonth(start)} to ${formatMonth(end)}`;

/** A link's wording: its own `label` when set, else the default name for its kind. */
export const linkLabel = (link: ProjectLink): string => link.label ?? linkKindLabel(link.kind);
