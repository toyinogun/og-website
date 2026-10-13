// The fixed lists a project entry may use (spec 0002, Vocabulary). Each map is
// key to display name: the schema's enums come from the keys, the pages show
// the values, so a key exists in exactly one place. Adding a value is one line;
// removing one fails the build for any entry still using it.

/** Technologies a project used, keyed for the schema, valued for display. */
export const STACK = { typescript: 'TypeScript', astro: 'Astro' } as const;

/** Types of work, the client reader's view of a project. */
export const SERVICES = { frontend: 'Frontend', 'api-design': 'API design' } as const;

/** The kind of engagement, shown as a visible label. */
export const KINDS = {
	client: 'Client work',
	employer: 'Employer work',
	personal: 'Personal project',
	'open-source': 'Open source',
} as const;

/** Link kinds with their default label when a link has none. */
export const LINK_KINDS = {
	live: 'Live site',
	code: 'Code',
	'app-store': 'App Store',
	video: 'Video',
	article: 'Article',
} as const;

/** A key of `STACK`. */
export type StackKey = keyof typeof STACK;
/** A key of `SERVICES`. */
export type ServiceKey = keyof typeof SERVICES;
/** A key of `KINDS`. */
export type KindKey = keyof typeof KINDS;
/** A key of `LINK_KINDS`. */
export type LinkKindKey = keyof typeof LINK_KINDS;

/**
 * The keys of a vocabulary map as a non empty tuple, ready for `z.enum`.
 * Every map above has at least one key, so the tuple is never empty.
 */
export const vocabularyKeys = <K extends string>(
	map: Readonly<Record<K, string>>,
): readonly [K, ...K[]] => Object.keys(map) as [K, ...K[]];

/** The display name of a stack key, for example `TypeScript`. */
export const stackLabel = (key: StackKey): string => STACK[key];

/** The display name of a type of work key, for example `API design`. */
export const serviceLabel = (key: ServiceKey): string => SERVICES[key];

/** The display name of a kind key, for example `Client work`. */
export const kindLabel = (key: KindKey): string => KINDS[key];

/** The default display name of a link kind key, for example `Live site`. */
export const linkKindLabel = (key: LinkKindKey): string => LINK_KINDS[key];
