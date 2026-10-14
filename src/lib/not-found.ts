// Every word on the 404 page (spec 0007). Edit them here; `not-found.test.ts`
// holds each one to its length limit.

/** The shape of `NOT_FOUND`: the head tags, then the words top to bottom. */
export interface NotFoundCopy {
	readonly title: string;
	readonly description: string;
	readonly heading: string;
	readonly text: string;
	readonly buttonLabel: string;
}

/** The 404 page words. */
export const NOT_FOUND: NotFoundCopy = {
	title: 'Page not found',
	description:
		"This page does not exist on Toyin Ogunseinde's site. The home page shows the work, the background and how to get in touch.",
	heading: 'This page does not exist',
	text: 'The link may be old or mistyped. The home page is a good place to start.',
	buttonLabel: 'Go to the home page',
};
