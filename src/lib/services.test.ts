import { describe, expect, it } from 'vitest';
import type { Project } from './projects';
import {
	offerProof,
	PROOF_LIMIT,
	SERVICES_PAGE,
	type ServiceOffer,
	type ServicesCopy,
} from './services';
import { SERVICES, type ServiceKey } from './vocabulary';

/** The length range each plain string must fit, after trimming (spec 0008, AC-2). */
const LIMITS: Readonly<Record<string, readonly [min: number, max: number]>> = {
	title: [1, 60],
	description: [50, 160],
	availability: [1, 80],
	heading: [1, 60],
	lead: [1, 160],
	offersHeading: [1, 40],
	stepsHeading: [1, 40],
	pricingHeading: [1, 40],
	closingHeading: [1, 40],
	proofLabel: [1, 20],
	pricingNote: [1, 160],
	closingText: [1, 120],
};

const within = (value: string, [min, max]: readonly [number, number]) => {
	expect(value.trim().length).toBeGreaterThanOrEqual(min);
	expect(value.trim().length).toBeLessThanOrEqual(max);
};

describe('SERVICES_PAGE', () => {
	// covers: AC-2
	it.each(Object.entries(LIMITS))('keeps %s within its limit', (key, limit) => {
		within(SERVICES_PAGE[key as keyof ServicesCopy] as string, limit);
	});

	// covers: AC-2
	it('keeps every offer, step and pricing model within its limit', () => {
		for (const offer of SERVICES_PAGE.offers) {
			within(offer.name, [1, 50]);
			within(offer.summary, [1, 160]);
		}
		for (const step of SERVICES_PAGE.steps) {
			within(step.title, [1, 40]);
			within(step.text, [1, 140]);
		}
		for (const model of SERVICES_PAGE.pricing) {
			within(model.title, [1, 30]);
			within(model.text, [1, 140]);
		}
	});

	// covers: AC-2
	it('keeps the contact target out of every word, since it can change', () => {
		expect(JSON.stringify(SERVICES_PAGE)).not.toContain('LinkedIn');
	});

	// covers: AC-2, AC-7
	it('shows no figure in the pricing words', () => {
		const pricing = [
			SERVICES_PAGE.pricingHeading,
			...SERVICES_PAGE.pricing.flatMap((model) => [model.title, model.text]),
			SERVICES_PAGE.pricingNote,
		];

		for (const text of pricing) expect(text).not.toMatch(/[0-9€$£]/);
	});

	// covers: AC-3, AC-6, AC-7
	it('has five offers in order, five steps and two pricing models', () => {
		expect(SERVICES_PAGE.offers.map((offer) => offer.id)).toEqual([
			'platforms',
			'delivery',
			'monitoring',
			'security',
			'tools',
		]);
		expect(SERVICES_PAGE.steps).toHaveLength(5);
		expect(SERVICES_PAGE.pricing.map((model) => model.title)).toEqual(['Day rate', 'Fixed price']);
	});

	// covers: AC-3
	it('uses each offer id once', () => {
		const ids = SERVICES_PAGE.offers.map((offer) => offer.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	// covers: AC-3
	it('places every SERVICES key in exactly one offer', () => {
		const used = SERVICES_PAGE.offers.flatMap((offer) => offer.services);

		expect([...used].sort()).toEqual(Object.keys(SERVICES).sort());
	});

	// covers: AC-3
	it('would fail for a vocabulary key no offer covers', () => {
		const grown = [...Object.keys(SERVICES), 'made-up'];
		const used = SERVICES_PAGE.offers.flatMap((offer) => offer.services as readonly string[]);

		expect([...used].sort()).not.toEqual([...grown].sort());
	});
});

const project = (id: string, services: readonly ServiceKey[]): Project =>
	({ id, collection: 'projects', data: { title: id, services } }) as unknown as Project;

const offer: ServiceOffer = {
	id: 'o',
	name: 'Offer',
	summary: 'Summary',
	services: ['ci-cd', 'security'],
};

describe('offerProof', () => {
	// covers: AC-4
	it('keeps the projects sharing a key, in the given order', () => {
		const list = [
			project('a', ['backend']),
			project('b', ['security']),
			project('c', ['ci-cd', 'frontend']),
		];

		expect(offerProof(offer, list).map((p) => p.id)).toEqual(['b', 'c']);
	});

	// covers: AC-4
	it('returns an empty list when nothing matches', () => {
		expect(offerProof(offer, [project('a', ['backend'])])).toEqual([]);
		expect(offerProof(offer, [])).toEqual([]);
	});

	// covers: AC-4
	it('returns at most PROOF_LIMIT projects, the first ones', () => {
		const list = ['a', 'b', 'c', 'd', 'e'].map((id) => project(id, ['security']));

		expect(PROOF_LIMIT).toBe(3);
		expect(offerProof(offer, list).map((p) => p.id)).toEqual(['a', 'b', 'c']);
	});

	// covers: AC-4
	it('leaves its input unchanged', () => {
		const list = Object.freeze([project('b', ['security']), project('a', ['security'])]);

		expect(() => offerProof(offer, list)).not.toThrow();
		expect(list.map((p) => p.id)).toEqual(['b', 'a']);
	});
});
