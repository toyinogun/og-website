// Every fixed word on the About page (feature 10), plus where the resume
// download lives. The story itself is `src/content/bio.md`; edit the words
// here, and `about.test.ts` holds each one to its length limit.

/** The shape of `ABOUT`: the page title and description, then the words top to bottom. */
export interface AboutCopy {
	readonly title: string;
	readonly description: string;
	readonly heading: string;
	readonly lead: string;
	readonly resumeLabel: string;
	readonly linksHeading: string;
	readonly closingHeading: string;
	readonly closingText: string;
}

/** The About page words: its head tags, the intro, the resume button and the section headings. */
export const ABOUT: AboutCopy = {
	title: 'About Toyin Ogunseinde, DevOps and infrastructure engineer',
	description:
		'How I went from WordPress support to running Kubernetes in production, with my CV to download and where to find me online.',
	heading: 'About me',
	lead: 'DevOps and infrastructure engineer in the Netherlands. This is the longer story, from the support desk to production clusters.',
	resumeLabel: 'Download my CV (PDF)',
	linksHeading: 'Find me elsewhere',
	closingHeading: 'Want to work together?',
	closingText: 'Tell me about the role or the project, and I will get back to you.',
};

/**
 * The cleaned resume's address on the site: a file in `public/`, with no
 * phone number or street address in it, since the repository is public.
 * The About page shows its download button only while that file exists.
 */
export const RESUME_PATH = '/toyin-ogunseinde-cv.pdf';
