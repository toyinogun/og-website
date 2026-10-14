import { describe, expect, it } from 'vitest';
import {
	PROJECT_PAGE,
	glanceRows,
	projectPageTitle,
	type GlanceInput,
	type ProjectPageCopy,
} from './project-page';

/** The length range each fixed word must fit, after trimming. */
const LIMITS: Readonly<Record<keyof ProjectPageCopy, readonly [min: number, max: number]>> = {
	linksLabel: [1, 40],
	glanceHeading: [1, 40],
	forTerm: [1, 24],
	roleTerm: [1, 24],
	teamTerm: [1, 24],
	whenTerm: [1, 24],
	servicesTerm: [1, 24],
	stackTerm: [1, 24],
	metricsLabel: [1, 40],
	testimonialsHeading: [1, 40],
	closingHeading: [1, 40],
	closingText: [1, 120],
};

/** A minimal write up: the fields the panel reads. */
const data = {
	client: { description: 'Teams shipping AI written code' },
	role: 'Sole engineer',
	start: '2024-03',
	services: ['backend', 'ci-cd'],
	stack: ['kubernetes', 'talos', 'terraform', 'hetzner', 'argocd', 'cilium', 'longhorn'],
} as const satisfies GlanceInput;

describe('PROJECT_PAGE', () => {
	it('has a limit for every value, and a value for every limit', () => {
		expect(Object.keys(PROJECT_PAGE).sort()).toEqual(Object.keys(LIMITS).sort());
	});

	it.each(Object.entries(LIMITS))('keeps %s within its limit', (key, [min, max]) => {
		const value = PROJECT_PAGE[key as keyof ProjectPageCopy].trim();

		expect(value.length).toBeGreaterThanOrEqual(min);
		expect(value.length).toBeLessThanOrEqual(max);
	});

	it('keeps the contact target out of the closing text, since it can change', () => {
		expect(PROJECT_PAGE.closingText).not.toMatch(/linkedin/i);
	});
});

describe('projectPageTitle', () => {
	it('puts the site name after the write up title', () => {
		expect(projectPageTitle('Mool, a self hosted screen recorder')).toBe(
			'Mool, a self hosted screen recorder, by Toyin Ogunseinde',
		);
	});
});

describe('glanceRows', () => {
	it('lists who, role, when, type of work and stack, in that order, with no team row when none is written', () => {
		expect(glanceRows(data).map((row) => row.key)).toEqual([
			'for',
			'role',
			'when',
			'services',
			'stack',
		]);
	});

	it('uses the fixed terms', () => {
		expect(glanceRows(data).map((row) => row.term)).toEqual([
			'Who it was for',
			'Role',
			'When',
			'Type of work',
			'Stack',
		]);
	});

	it('shows the description alone, or the client name above it when written', () => {
		expect(glanceRows(data)[0]?.values).toEqual(['Teams shipping AI written code']);
		expect(
			glanceRows({ ...data, client: { name: 'Acme', description: 'A logistics company' } })[0]
				?.values,
		).toEqual(['Acme', 'A logistics company']);
	});

	it('adds the team after the role when written', () => {
		const rows = glanceRows({ ...data, team: 'Four engineers' });

		expect(rows.map((row) => row.key)).toEqual([
			'for',
			'role',
			'team',
			'when',
			'services',
			'stack',
		]);
		expect(rows[2]?.values).toEqual(['Four engineers']);
	});

	it('formats when through formatTimeframe, open ended or closed', () => {
		const when = (extra: object) =>
			glanceRows({ ...data, ...extra }).find((row) => row.key === 'when');

		expect(when({})?.values).toEqual(['Mar 2024 to present']);
		expect(when({ end: '2025-01' })?.values).toEqual(['Mar 2024 to Jan 2025']);
	});

	it('joins the type of work names, and keeps the full stack in write up order', () => {
		const rows = glanceRows(data);

		expect(rows.find((row) => row.key === 'services')?.values).toEqual(['Backend, CI/CD']);
		expect(rows.find((row) => row.key === 'stack')?.values).toEqual([
			'Kubernetes',
			'Talos Linux',
			'Terraform',
			'Hetzner Cloud',
			'Argo CD',
			'Cilium',
			'Longhorn',
		]);
	});

	it('never mutates its input', () => {
		const stack = [...data.stack];
		glanceRows({ ...data, stack });

		expect(stack).toEqual([...data.stack]);
	});
});
