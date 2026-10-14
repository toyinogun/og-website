// Every word on the work listing (spec 0005). Edit them here; `work.test.ts`
// holds each one to its length limit.

/** The shape of `WORK`: the page title and description, then the words top to bottom. */
export interface WorkCopy {
	readonly title: string;
	readonly description: string;
	readonly heading: string;
	readonly lead: string;
	readonly emptyText: string;
	readonly closingHeading: string;
	readonly closingText: string;
}

/** The work listing words: its head tags, the intro, the empty line and the closing section. */
export const WORK: WorkCopy = {
	title: 'Work by Toyin Ogunseinde, DevOps engineer',
	description:
		'Projects by Toyin Ogunseinde, DevOps and infrastructure engineer: Kubernetes platforms, deploy tooling and CI checks, each with its outcome and its stack.',
	heading: 'Work',
	lead: 'Platforms, pipelines and tools I have built, each with what it achieved and what it runs on.',
	emptyText: 'Write ups are on their way.',
	closingHeading: 'Want something like this built?',
	closingText: 'Tell me about the role or the project, and I will get back to you.',
};
