// The `projects` collection (spec 0002). This file is the edge: it reads the
// files, measures the covers and throws to stop the build. The rules
// themselves are pure, in `src/lib/project-schema.ts` and
// `src/lib/project-checks.ts`.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageMetadata } from 'astro/assets/utils';
import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { fromMarkdown } from 'mdast-util-from-markdown';
import {
	checkBody,
	checkCover,
	checkImages,
	checkSlug,
	findDuplicateOrders,
	type Problem,
} from './lib/project-checks';
import { projectSchema } from './lib/project-schema';
import { collectionTestimonialProblems } from './lib/testimonial-checks';
import { testimonialSchema, type TestimonialData } from './lib/testimonial-schema';

/** Where project folders live, relative to the project root. */
export const PROJECTS_BASE = './src/content/projects';

/** Astro's prefix on an `image()` value inside the content store. */
const IMAGE_PLACEHOLDER = '__ASTRO_IMAGE_';

/** What the checks need from one stored entry. */
export interface EntryFacts {
	readonly id: string;
	/** The entry file, relative to the project root, for example `src/content/projects/x/index.md`. */
	readonly filePath: string;
	readonly body: string;
	readonly draft: boolean;
	readonly order: number;
	/** The raw frontmatter `cover` value, for example `./cover.png`. */
	readonly coverField: string;
}

/** Every file under `dir`, as `/` separated paths relative to it. Missing folder: none. */
const listFiles = async (dir: string): Promise<readonly string[]> => {
	const found = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
	return found
		.filter((item) => item.isFile())
		.map((item) => relative(dir, join(item.parentPath, item.name)).split(sep).join('/'));
};

/** The width of an image file in pixels, or `undefined` when it cannot be read. */
const measureWidth = async (path: string): Promise<number | undefined> => {
	try {
		return (await imageMetadata(await readFile(path), path)).width;
	} catch {
		return undefined;
	}
};

/** Runs every check on one entry, reading its folder and cover from disk. */
const entryProblems = async (entry: EntryFacts, root: string): Promise<readonly Problem[]> => {
	const folder = dirname(join(root, entry.filePath));
	const files = await listFiles(folder);
	const topLevel = files.filter((file) => !file.includes('/'));
	const coverFile = entry.coverField.replace(/^\.\//, '');
	const width = topLevel.includes(coverFile)
		? await measureWidth(join(folder, coverFile))
		: undefined;
	const tree = fromMarkdown(entry.body);

	const own = [
		...checkCover({ coverField: entry.coverField, files: topLevel, width }),
		...checkImages(tree, new Set(files)),
		...(entry.draft ? [] : checkBody(tree)),
	].map((problem) => ({ ...problem, ids: [entry.id] }));

	return [...checkSlug(entry.id), ...own];
};

/**
 * Runs every spec 0002 check across all entries and returns one line per
 * problem, `<file paths>: <rule>: <message>`. An empty list means the
 * collection is sound. `root` is the project root on disk.
 */
export const collectionProblems = async (
	entries: readonly EntryFacts[],
	root: string,
): Promise<readonly string[]> => {
	const perEntry = await Promise.all(entries.map((entry) => entryProblems(entry, root)));
	const problems = [...perEntry.flat(), ...findDuplicateOrders(entries)];
	const pathOf = new Map(entries.map(({ id, filePath }) => [id, filePath]));

	return problems.map(
		({ rule, message, ids }) =>
			`${ids.map((id) => pathOf.get(id) ?? id).join(', ')}: ${rule}: ${message}`,
	);
};

/** The facts the checks need, from one entry as the glob loader stored it. */
const factsFromStore = (entry: {
	readonly id: string;
	readonly filePath?: string;
	readonly body?: string;
	readonly data: Record<string, unknown>;
}): EntryFacts => ({
	id: entry.id,
	filePath: entry.filePath ?? entry.id,
	body: entry.body ?? '',
	draft: entry.data.draft === true,
	order: Number(entry.data.order),
	coverField: String(entry.data.cover ?? '').replace(IMAGE_PLACEHOLDER, ''),
});

const projectsGlob = glob({
	pattern: '*/index.md',
	base: PROJECTS_BASE,
	// The id is the folder name exactly as written, checked by `checkSlug`.
	generateId: ({ entry }) => entry.split('/')[0] ?? entry,
});

const projects = defineCollection({
	loader: {
		name: 'projects-loader',
		load: async (context) => {
			await projectsGlob.load(context);
			const lines = await collectionProblems(
				context.store.values().map(factsFromStore),
				fileURLToPath(context.config.root),
			);
			// The single sanctioned throw (spec 0002, Build time enforcement): it
			// sits at the edge and its whole job is to stop the build.
			if (lines.length > 0) {
				throw new Error(
					`Project content breaks the rules in spec 0002 (see docs/specs/0002-content-model/authoring.md):\n${lines.map((line) => `  - ${line}`).join('\n')}`,
				);
			}
		},
	},
	schema: ({ image }) => projectSchema(image),
});

/** Where testimonial files live, relative to the project root (spec 0009). */
export const TESTIMONIALS_BASE = './src/content/testimonials';

/** The ids of the projects that exist: folders under `PROJECTS_BASE` holding an `index.md`. */
const knownProjectIds = async (root: string): Promise<ReadonlySet<string>> => {
	const files = await listFiles(join(root, PROJECTS_BASE));
	return new Set(
		files
			.filter((file) => /^[^/]+\/index\.md$/.test(file))
			.map((file) => file.split('/')[0] ?? file),
	);
};

const testimonialsGlob = glob({
	pattern: '*.yaml',
	base: TESTIMONIALS_BASE,
	// The id is the file name without `.yaml`, exactly as written, checked by `checkSlug`.
	generateId: ({ entry }) => entry.replace(/\.yaml$/, ''),
});

const testimonials = defineCollection({
	loader: {
		name: 'testimonials-loader',
		load: async (context) => {
			const root = fileURLToPath(context.config.root);
			// Schema problems are collected, not thrown by the glob loader, so one
			// error can list every problem. Entries that failed are kept out of
			// the other checks, which expect valid data.
			const schemaProblems: string[] = [];
			const invalid = new Set<string>();
			await testimonialsGlob.load({
				...context,
				parseData: async (props) => {
					try {
						return await context.parseData(props);
					} catch (error) {
						invalid.add(props.id);
						const message = (error instanceof Error ? error.message : String(error))
							.replace(/\s+/g, ' ')
							.trim();
						schemaProblems.push(`${props.filePath ?? props.id}: schema: ${message}`);
						return props.data;
					}
				},
			});

			const entries = context.store.values().filter((entry) => !invalid.has(entry.id));
			const pathOf = new Map(
				context.store.values().map((entry) => [entry.id, entry.filePath ?? entry.id]),
			);
			const checked = collectionTestimonialProblems(
				entries.map((entry) => ({
					id: entry.id,
					data: entry.data as unknown as TestimonialData,
				})),
				await knownProjectIds(root),
			).map(
				({ rule, message, ids }) =>
					`${ids.map((id) => pathOf.get(id) ?? id).join(', ')}: ${rule}: ${message}`,
			);

			const lines = [...schemaProblems, ...checked];
			// The single sanctioned throw for this collection (spec 0009, AC-3).
			if (lines.length > 0) {
				throw new Error(
					`Testimonial content breaks the rules in spec 0009 (see docs/specs/0009-testimonials/authoring.md):\n${lines.map((line) => `  - ${line}`).join('\n')}`,
				);
			}
		},
	},
	schema: testimonialSchema,
});

/** Every content collection on the site. */
export const collections = { projects, testimonials };
