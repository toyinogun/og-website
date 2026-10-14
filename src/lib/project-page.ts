// Every fixed word on a project page (feature 9), plus the pure helpers that
// turn one write up's frontmatter into its head title and its at a glance
// panel (spec 0002, Value sourcing). The project's own words come from its
// write up; `project-page.test.ts` holds the fixed ones to their limits.
import type { ProjectData } from './project-schema';
import { formatTimeframe, serviceLabel, stackLabel } from './projects';
import { SITE } from './site';
import type { ServiceKey, StackKey } from './vocabulary';

/** The shape of `PROJECT_PAGE`: the fixed words, top to bottom. */
export interface ProjectPageCopy {
	readonly linksLabel: string;
	readonly glanceHeading: string;
	readonly forTerm: string;
	readonly roleTerm: string;
	readonly teamTerm: string;
	readonly whenTerm: string;
	readonly servicesTerm: string;
	readonly stackTerm: string;
	readonly metricsLabel: string;
	readonly testimonialsHeading: string;
	readonly closingHeading: string;
	readonly closingText: string;
}

/** The fixed project page words: the links label, the at a glance terms and the closing section. */
export const PROJECT_PAGE: ProjectPageCopy = {
	linksLabel: 'Project links',
	glanceHeading: 'At a glance',
	forTerm: 'Who it was for',
	roleTerm: 'Role',
	teamTerm: 'Team',
	whenTerm: 'When',
	servicesTerm: 'Type of work',
	stackTerm: 'Stack',
	metricsLabel: 'Headline numbers',
	testimonialsHeading: 'What people said',
	closingHeading: 'Want something like this built?',
	closingText: 'Tell me about the role or the project, and I will get back to you.',
};

/** A project page's document title: the write up's `title`, then the site name. */
export const projectPageTitle = (title: string): string => `${title}, by ${SITE.name}`;

/** One row of the at a glance panel: a term and one or more values under it. */
export interface GlanceRow {
	readonly key: 'for' | 'role' | 'team' | 'when' | 'services' | 'stack';
	readonly term: string;
	readonly values: readonly string[];
}

/** The frontmatter fields the at a glance panel reads (spec 0002, fields 5 to 12). */
export interface GlanceInput {
	readonly client: ProjectData['client'];
	readonly role: string;
	readonly team?: string;
	readonly start: string;
	readonly end?: string;
	readonly services: readonly ServiceKey[];
	readonly stack: readonly StackKey[];
}

/**
 * The at a glance rows for one write up, in reading order: who it was for
 * (the client name when written, then the description), role, team (only
 * when written), when, type of work, and the full stack in the write up's
 * order. The kind is the page's eyebrow, so it is not repeated here.
 */
export const glanceRows = (data: GlanceInput): readonly GlanceRow[] => [
	{
		key: 'for',
		term: PROJECT_PAGE.forTerm,
		values:
			data.client.name === undefined
				? [data.client.description]
				: [data.client.name, data.client.description],
	},
	{ key: 'role', term: PROJECT_PAGE.roleTerm, values: [data.role] },
	...(data.team === undefined
		? []
		: [{ key: 'team', term: PROJECT_PAGE.teamTerm, values: [data.team] } as const]),
	{ key: 'when', term: PROJECT_PAGE.whenTerm, values: [formatTimeframe(data.start, data.end)] },
	{
		key: 'services',
		term: PROJECT_PAGE.servicesTerm,
		values: [data.services.map(serviceLabel).join(', ')],
	},
	{ key: 'stack', term: PROJECT_PAGE.stackTerm, values: data.stack.map(stackLabel) },
];
