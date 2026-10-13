// The build time checks for project entries (spec 0002, Case study body and
// Build time enforcement). Every check is pure and returns a list of problems,
// never throws. The loader edge in `src/content.config.ts` feeds them what it
// read from disk, attaches the entry id where a check could not know it, and
// is the only place that throws.
import type { Heading, Nodes, Root, RootContent } from 'mdast';

/** One broken rule. `ids` names the entries involved; the edge maps them to file paths. */
export interface Problem {
	readonly rule: string;
	readonly message: string;
	readonly ids: readonly string[];
}

/** The three sections every published case study has, in this order. */
export const SECTIONS = ['Problem', 'Approach', 'Outcome'] as const;

/** The minimum cover width in pixels, so the cover can double as the share card. */
export const MIN_COVER_WIDTH = 1200;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COVER_FILE = /^cover\.(png|jpg|jpeg|webp)$/;
const IMAGE_EXTENSION = /\.(png|jpg|jpeg|webp)$/;
const RAW_HTML_BANNED = /<(img|h1)\b/i;

const problem = (rule: string, message: string, ids: readonly string[] = []): Problem => ({
	rule,
	message,
	ids,
});

/** The plain text of a node and everything inside it. */
const textOf = (node: Nodes): string =>
	'value' in node && typeof node.value === 'string'
		? node.value
		: 'children' in node
			? node.children.map((child) => textOf(child)).join('')
			: '';

const isHeading = (node: RootContent, depth?: number): node is Heading =>
	node.type === 'heading' && (depth === undefined || node.depth === depth);

const sectionName = (node: RootContent): string | undefined =>
	isHeading(node, 2) ? textOf(node).trim() : undefined;

/** Every node in the tree, depth first, the root included. */
const allNodes = (node: Nodes): readonly Nodes[] => [
	node,
	...('children' in node ? node.children.flatMap((child) => allNodes(child)) : []),
];

/**
 * Checks the sections of one published case study body (AC-3). Looks only at
 * the root's direct children, so headings inside lists, quotes and code never
 * count. The problems carry no ids; the edge attaches the entry's.
 */
export const checkBody = (tree: Root): readonly Problem[] => {
	const children = tree.children;
	const first = children[0];

	const firstProblems =
		first !== undefined && sectionName(first) === 'Problem'
			? []
			: [problem('body-first-section', 'the body must start with the heading "## Problem"')];

	const levelOneProblems = children
		.filter((node) => isHeading(node, 1))
		.map((node) =>
			problem(
				'body-level-one-heading',
				`remove the level one heading "${textOf(node).trim()}", the page renders the title`,
			),
		);

	const positions = SECTIONS.map((name) => ({
		name,
		at: children.flatMap((node, index) => (sectionName(node) === name ? [index] : [])),
	}));

	const countProblems = positions.flatMap(({ name, at }) =>
		at.length === 0
			? [problem('body-missing-section', `the section "## ${name}" is missing`)]
			: at.length > 1
				? [problem('body-repeated-section', `the section "## ${name}" appears ${at.length} times`)]
				: [],
	);

	const firstIndexes = positions.map(({ at }) => at[0]);
	const allOnce = positions.every(({ at }) => at.length === 1);
	const inOrder = firstIndexes.every(
		(index, i) => i === 0 || (index ?? 0) > (firstIndexes[i - 1] ?? 0),
	);
	const orderProblems =
		allOnce && !inOrder
			? [
					problem(
						'body-section-order',
						'the sections must appear in the order Problem, Approach, Outcome',
					),
				]
			: [];

	const emptyProblems = positions.flatMap(({ name, at }) =>
		at.flatMap((start) => {
			const rest = children.slice(start + 1);
			const end = rest.findIndex((node) => isHeading(node, 2));
			const content = (end === -1 ? rest : rest.slice(0, end)).filter((node) => !isHeading(node));
			return content.length === 0
				? [problem('body-empty-section', `the section "## ${name}" has no content`)]
				: [];
		}),
	);

	return [
		...firstProblems,
		...levelOneProblems,
		...countProblems,
		...orderProblems,
		...emptyProblems,
	];
};

/**
 * Why an image path breaks the path rule, or `undefined` when it passes. A
 * passing path is relative, starts `./`, stays inside the entry folder and ends
 * in png, jpg, jpeg or webp.
 */
export const imagePathError = (url: string): string | undefined => {
	if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return 'must be a local file, not a URL';
	if (url.startsWith('/')) return 'must be relative, not start with /';
	if (url.startsWith('~') || url.startsWith('@')) return 'must not use an import alias';
	if (!url.startsWith('./')) return 'must start with ./';
	if (url.split('/').includes('..')) return 'must stay inside the entry folder, no ..';
	if (!IMAGE_EXTENSION.test(url)) return 'must end in .png, .jpg, .jpeg or .webp';
	return undefined;
};

/** A passing image path as the folder relative path the edge lists, for example `sub/x.png`. */
const folderPath = (url: string): string => {
	const segments = url.split('/').filter((segment) => segment !== '.' && segment !== '');
	const joined = segments.join('/');
	try {
		return decodeURIComponent(joined);
	} catch {
		return joined;
	}
};

/**
 * Checks every image in one body, drafts included (AC-13): alt text present,
 * path allowed, file present in `existing` (folder relative paths, for example
 * `sub/x.png`), and no raw `<img` or `<h1` HTML. The problems carry no ids.
 */
export const checkImages = (tree: Root, existing: ReadonlySet<string>): readonly Problem[] => {
	const nodes = allNodes(tree);
	const definitions = new Map(
		nodes.flatMap((node) => (node.type === 'definition' ? [[node.identifier, node.url]] : [])),
	);

	const images = nodes.flatMap((node) =>
		node.type === 'image'
			? [{ url: node.url, alt: node.alt }]
			: node.type === 'imageReference'
				? [{ url: definitions.get(node.identifier) ?? '', alt: node.alt }]
				: [],
	);

	const imageProblems = images.flatMap(({ url, alt }) => {
		const altProblems =
			(alt ?? '').trim() === '' ? [problem('image-alt', `the image ${url} needs alt text`)] : [];
		const pathError = imagePathError(url);
		const pathProblems =
			pathError !== undefined
				? [problem('image-path', `the image ${url} ${pathError}`)]
				: existing.has(folderPath(url))
					? []
					: [problem('image-missing', `the image ${url} does not exist`)];
		return [...altProblems, ...pathProblems];
	});

	const htmlProblems = nodes.flatMap((node) =>
		node.type === 'html' && RAW_HTML_BANNED.test(node.value)
			? [problem('raw-html', `raw HTML <img> or <h1> is not allowed: ${node.value.trim()}`)]
			: [],
	);

	return [...imageProblems, ...htmlProblems];
};

/**
 * Checks one entry's cover, drafts included (AC-12). `files` are the file
 * names at the top of the entry folder, `coverField` the raw frontmatter value,
 * and `width` the measured width of that file, `undefined` when it could not
 * be read. The problems carry no ids.
 */
export const checkCover = (cover: {
	readonly coverField: string;
	readonly files: readonly string[];
	readonly width: number | undefined;
}): readonly Problem[] => {
	const covers = cover.files.filter((file) => /^cover\./.test(file));
	const [only] = covers;

	if (only === undefined) {
		return [
			problem(
				'cover-missing',
				'the folder needs one cover file: cover.png, cover.jpg, cover.jpeg or cover.webp',
			),
		];
	}
	if (covers.length > 1) {
		return [
			problem(
				'cover-count',
				`the folder must hold exactly one cover file, found ${covers.join(', ')}`,
			),
		];
	}
	if (!COVER_FILE.test(only)) {
		return [problem('cover-type', `${only} must be a png, jpg, jpeg or webp file`)];
	}
	if (cover.coverField !== `./${only}`) {
		return [problem('cover-field', `cover is ${cover.coverField} but the file is ./${only}`)];
	}
	if (cover.width === undefined) {
		return [problem('cover-unreadable', `${only} could not be read as an image`)];
	}
	return cover.width < MIN_COVER_WIDTH
		? [
				problem(
					'cover-width',
					`${only} is ${cover.width} pixels wide, it must be at least ${MIN_COVER_WIDTH}`,
				),
			]
		: [];
};

/** One problem per `order` value shared by two or more entries, drafts included, naming every id (AC-4). */
export const findDuplicateOrders = (
	entries: readonly { readonly id: string; readonly order: number }[],
): readonly Problem[] => {
	const byOrder = entries.reduce<ReadonlyMap<number, readonly string[]>>(
		(groups, { id, order }) => new Map([...groups, [order, [...(groups.get(order) ?? []), id]]]),
		new Map(),
	);
	return [...byOrder]
		.filter(([, ids]) => ids.length > 1)
		.sort(([a], [b]) => a - b)
		.map(([order, ids]) =>
			problem(
				'duplicate-order',
				`order ${order} is used by ${ids.length} entries`,
				[...ids].sort(),
			),
		);
};

/** A problem when the id (the folder name, as written) is not lowercase kebab case (AC-8). */
export const checkSlug = (id: string): readonly Problem[] =>
	SLUG.test(id)
		? []
		: [
				problem(
					'slug',
					`the folder name "${id}" must be lowercase kebab case, for example my-project`,
					[id],
				),
			];
