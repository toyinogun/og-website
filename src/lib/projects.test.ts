import { describe, expect, it } from 'vitest';
import {
	featuredProjects,
	formatTimeframe,
	kindLabel,
	linkLabel,
	projectPath,
	serviceLabel,
	sortProjects,
	stackLabel,
	visibleProjects,
	type Project,
} from './projects';

/** A stand in entry carrying only the fields the helpers read. */
const entry = (id: string, order: number, flags: { draft?: boolean; featured?: boolean } = {}) =>
	({
		id,
		collection: 'projects',
		data: { order, draft: flags.draft ?? false, featured: flags.featured ?? false },
	}) as unknown as Project;

const ids = (list: readonly Project[]) => list.map(({ id }) => id);

const published = entry('published', 20, { featured: true });
const draft = entry('draft', 10, { draft: true, featured: true });
const plain = entry('plain', 30);
const all = [plain, published, draft];

describe('visibleProjects (spec 0002, AC-6)', () => {
	// covers: AC-6
	it('drops drafts when includeDrafts is false', () => {
		expect(ids(visibleProjects(all, { includeDrafts: false }))).toEqual(['plain', 'published']);
	});

	// covers: AC-6
	it('keeps drafts when includeDrafts is true', () => {
		expect(ids(visibleProjects(all, { includeDrafts: true }))).toEqual([
			'plain',
			'published',
			'draft',
		]);
	});

	// covers: AC-10
	it('returns an empty list for no entries or only drafts', () => {
		expect(visibleProjects([], { includeDrafts: false })).toEqual([]);
		expect(visibleProjects([draft], { includeDrafts: false })).toEqual([]);
	});
});

describe('sortProjects (spec 0002, AC-6)', () => {
	// covers: AC-6
	it('orders by order, lowest first', () => {
		expect(ids(sortProjects(all))).toEqual(['draft', 'published', 'plain']);
	});

	it('does not mutate its input', () => {
		const input = Object.freeze([...all]);

		expect(() => sortProjects(input)).not.toThrow();
		expect(ids(input)).toEqual(['plain', 'published', 'draft']);
	});
});

describe('featuredProjects (spec 0002, AC-6)', () => {
	// covers: AC-6
	it('returns the featured entries of the list it is given, in order', () => {
		const second = entry('second', 5, { featured: true });

		expect(ids(featuredProjects([published, plain, second]))).toEqual(['second', 'published']);
	});

	// covers: AC-6
	it('previews a featured draft in dev and never shows one in production', () => {
		expect(ids(featuredProjects(visibleProjects(all, { includeDrafts: true })))).toEqual([
			'draft',
			'published',
		]);
		expect(ids(featuredProjects(visibleProjects(all, { includeDrafts: false })))).toEqual([
			'published',
		]);
	});

	// covers: AC-10
	it('returns an empty list when only drafts exist in production', () => {
		expect(featuredProjects(visibleProjects([draft], { includeDrafts: false }))).toEqual([]);
	});
});

describe('projectPath (spec 0002, AC-8)', () => {
	// covers: AC-8
	it('builds /projects/<id>', () => {
		expect(projectPath('example-project')).toBe('/projects/example-project');
	});
});

describe('formatTimeframe (spec 0002, AC-7)', () => {
	// covers: AC-7
	it('formats a start and an end', () => {
		expect(formatTimeframe('2024-03', '2025-01')).toBe('Mar 2024 to Jan 2025');
	});

	// covers: AC-7
	it('formats an ongoing project', () => {
		expect(formatTimeframe('2024-03')).toBe('Mar 2024 to present');
	});

	// covers: AC-7
	it('collapses a single month', () => {
		expect(formatTimeframe('2024-03', '2024-03')).toBe('Mar 2024');
	});

	it('names every month', () => {
		const months = Array.from({ length: 12 }, (_, i) =>
			formatTimeframe(
				`2024-${String(i + 1).padStart(2, '0')}`,
				`2024-${String(i + 1).padStart(2, '0')}`,
			),
		);

		expect(months.map((m) => m.slice(0, 3))).toEqual([
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
		]);
	});

	// covers: AC-7
	it('does not depend on the machine locale', () => {
		const original = Intl.DateTimeFormat;
		try {
			// A locale aware implementation would pick this up; ours must not.
			Intl.DateTimeFormat = (() => {
				throw new Error('locale used');
			}) as unknown as typeof Intl.DateTimeFormat;

			expect(formatTimeframe('2024-03', '2025-01')).toBe('Mar 2024 to Jan 2025');
		} finally {
			Intl.DateTimeFormat = original;
		}
	});
});

describe('label helpers (spec 0002, AC-9)', () => {
	// covers: AC-9
	it('return the vocabulary display names', () => {
		expect(kindLabel('client')).toBe('Client work');
		expect(stackLabel('astro')).toBe('Astro');
		expect(serviceLabel('frontend')).toBe('Frontend');
	});

	// covers: AC-9
	it("linkLabel uses the link's own label when set", () => {
		expect(linkLabel({ kind: 'code', url: 'https://x.com', label: 'Source' })).toBe('Source');
	});

	// covers: AC-9
	it('linkLabel falls back to the default name for the kind', () => {
		expect(linkLabel({ kind: 'app-store', url: 'https://x.com' })).toBe('App Store');
	});
});
