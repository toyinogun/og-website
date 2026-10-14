// Every fixed word on the Services page (feature 13, spec 0008), plus the
// rule that picks each offer's "Seen in" projects. Edit the words here;
// `services.test.ts` holds each one to its length limit. The offers cover the
// `SERVICES` vocabulary between them, so a new work type has to be placed in
// an offer before the tests pass.
import type { Project } from './projects';
import type { ServiceKey } from './vocabulary';

/** One thing you offer: its words and the work types (vocabulary keys) it covers. */
export interface ServiceOffer {
	readonly id: string;
	readonly name: string;
	readonly summary: string;
	readonly services: readonly [ServiceKey, ...ServiceKey[]];
}

/** One step of how an engagement runs. */
export interface EngagementStep {
	readonly title: string;
	readonly text: string;
}

/** One way of pricing the work, described without figures. */
export interface PricingModel {
	readonly title: string;
	readonly text: string;
}

/** The shape of `SERVICES_PAGE`: the head tags, then the words top to bottom. */
export interface ServicesCopy {
	readonly title: string;
	readonly description: string;
	readonly availability: string;
	readonly heading: string;
	readonly lead: string;
	readonly offersHeading: string;
	readonly proofLabel: string;
	readonly offers: readonly ServiceOffer[];
	readonly stepsHeading: string;
	readonly steps: readonly EngagementStep[];
	readonly pricingHeading: string;
	readonly pricing: readonly PricingModel[];
	readonly pricingNote: string;
	readonly closingHeading: string;
	readonly closingText: string;
}

/** The Services page words. The pricing words carry no figures, by decision (spec 0008). */
export const SERVICES_PAGE: ServicesCopy = {
	title: 'Services by Toyin Ogunseinde, DevOps engineer',
	description:
		'Kubernetes platforms, delivery pipelines, monitoring and security work by Toyin Ogunseinde, with how a project runs and how pricing works.',
	availability: 'Remote, for clients in the Netherlands and the EU, a few projects at a time',
	heading: 'Services',
	lead: 'What I can build or fix for your team, how a project with me runs, and how I price it.',
	offersHeading: 'What I offer',
	proofLabel: 'Seen in',
	offers: [
		{
			id: 'platforms',
			name: 'Kubernetes platforms as code',
			summary:
				'Clusters described entirely in Terraform and Git, rebuilt with one command, with nothing changed by hand.',
			services: ['infrastructure', 'platform-engineering'],
		},
		{
			id: 'delivery',
			name: 'Delivery pipelines and GitOps',
			summary:
				'CI checks and deploys that run from Git, so shipping is routine and every change can be traced and rolled back.',
			services: ['ci-cd'],
		},
		{
			id: 'monitoring',
			name: 'Monitoring and alerting',
			summary:
				'Metrics, dashboards and alerts that tell you something is wrong before your users do.',
			services: ['observability'],
		},
		{
			id: 'security',
			name: 'Security reviews and hardening',
			summary:
				'A review of your cluster, pipeline or app, then the fixes: least access, network rules, and secrets kept out of code.',
			services: ['security'],
		},
		{
			id: 'tools',
			name: 'Backend services and internal tools',
			summary: 'The services and tools around your platform, written in Go or TypeScript.',
			services: ['backend', 'api-design', 'frontend'],
		},
	],
	stepsHeading: 'How working with me goes',
	steps: [
		{
			title: 'Send me a message',
			text: 'Tell me what you are running, what hurts, and when you need it fixed.',
		},
		{
			title: 'A free 30 minute call',
			text: 'We talk through the problem, and I tell you honestly whether I am the right person for it.',
		},
		{
			title: 'A written proposal',
			text: 'You get the scope, the price and a timeline in writing before any work starts.',
		},
		{
			title: 'The work',
			text: 'I work in your repositories, with a short written update every week, so nothing is a surprise.',
		},
		{
			title: 'Handover',
			text: 'Documentation and a walkthrough, so your team owns what I built.',
		},
	],
	pricingHeading: 'Pricing',
	pricing: [
		{
			title: 'Day rate',
			text: 'For open ended work and ongoing help, billed for the days I work (time and materials).',
		},
		{
			title: 'Fixed price',
			text: 'For a clearly scoped project, one agreed price, set in the written proposal.',
		},
	],
	pricingNote: 'Every quote comes after the free call, in writing, before any work starts.',
	closingHeading: 'Have a project in mind?',
	closingText: 'Tell me about the project, and I will get back to you.',
};

/** How many "Seen in" projects an offer shows at most. */
export const PROOF_LIMIT = 3;

/**
 * The projects to show under an offer: those whose `services` share at least
 * one key with the offer, in the order given, at most `PROOF_LIMIT`. Pass the
 * list `sortProjects(visibleProjects(...))` returned, so drafts stay out of
 * production. Never mutates its input.
 */
export const offerProof = (offer: ServiceOffer, projects: readonly Project[]): readonly Project[] =>
	projects
		.filter((project) => project.data.services.some((key) => offer.services.includes(key)))
		.slice(0, PROOF_LIMIT);
