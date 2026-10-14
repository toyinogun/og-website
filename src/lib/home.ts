// Every word on the home page (spec 0004). Edit them here; `home.test.ts`
// holds each one to its length limit.

/** The shape of `HOME`: the page title and description, then the words top to bottom. */
export interface HomeCopy {
	readonly title: string;
	readonly description: string;
	readonly availability: string;
	readonly heading: string;
	readonly lead: string;
	readonly workHeading: string;
	readonly testimonialsHeading: string;
	readonly testimonialsProjectLabel: string;
	readonly aboutHeading: string;
	readonly aboutLink: string;
	readonly closingHeading: string;
	readonly closingText: string;
}

/** The home page words: its head tags, the intro, the section headings and the closing line. */
export const HOME: HomeCopy = {
	title: 'Toyin Ogunseinde, DevOps and infrastructure engineer',
	description:
		'DevOps and infrastructure engineer in the Netherlands. Kubernetes as code, GitOps delivery and monitoring, for teams hiring and clients contracting.',
	availability: 'Open to new roles and contract work',
	heading: 'I build infrastructure that stays up.',
	lead: 'DevOps and infrastructure engineer in the Netherlands, building Kubernetes platforms, delivery pipelines and monitoring as code for teams and clients.',
	workHeading: 'Selected work',
	testimonialsHeading: 'What people say',
	testimonialsProjectLabel: 'On',
	aboutHeading: 'About',
	aboutLink: 'More about me',
	closingHeading: 'Hiring, or need something built?',
	closingText: 'Tell me about the role or the project, and I will get back to you.',
};
