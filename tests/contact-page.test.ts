// Lives here, not beside the page: Astro turns every .ts file under src/pages/
// into a route, so a test file there would be built as an endpoint.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Contact from '../src/pages/contact.astro';
import { CONTACT, TOPICS } from '../src/lib/contact';
import { LINKEDIN_URL, SITE } from '../src/lib/site';

const escapeHtml = (text: string) =>
	text.replaceAll('&', '&amp;').replaceAll("'", '&#39;').replaceAll('"', '&quot;');

/** The opening tag of the element with this id. */
const tagWithId = (html: string, id: string) =>
	html.match(new RegExp(`<[a-z]+[^>]*\\bid="${id}"[^>]*>`))?.[0] ?? '';

describe('contact page', () => {
	let html: string;
	let main: string;
	let form: string;

	beforeAll(async () => {
		const container = await AstroContainer.create({
			astroConfig: { site: 'https://toyintest.org', trailingSlash: 'never' },
		});
		html = await container.renderToString(Contact, {
			request: new Request('http://localhost:4321/contact'),
		});
		// The test container puts the form's dev script tag inside <main>; the build does not.
		main = html
			.slice(html.indexOf('<main'), html.indexOf('</main>'))
			.replace(/<script[^>]*><\/script>/g, '');
		form = main.slice(main.indexOf('<form'), main.indexOf('</form>'));
	});

	// covers: AC-2
	it('uses the CONTACT title and description in the head, with the canonical address', () => {
		expect(html).toContain(`<title>${escapeHtml(CONTACT.title)}</title>`);
		expect(html).toContain(`<meta name="description" content="${escapeHtml(CONTACT.description)}"`);
		expect(html).toContain('<link rel="canonical" href="https://toyintest.org/contact"');
	});

	// covers: AC-1
	it('sits in the reading column and opens with the intro', () => {
		expect(main).toMatch(
			/^<main[^>]*>\s*<div class="mx-auto w-full px-5 md:px-8 max-w-measure">\s*<div class="pt-12 md:pt-20">/,
		);
	});

	// covers: AC-1, AC-23
	it('has exactly one h1, the CONTACT heading at page size, then the lead, and no other heading', () => {
		expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
		expect(main).toContain(`<h1 class="text-3xl">${escapeHtml(CONTACT.heading)}</h1>`);
		expect(main).toContain(`<p class="text-lg text-muted">${escapeHtml(CONTACT.lead)}</p>`);
		expect(main).not.toMatch(/<h[2-6][\s>]/);
	});

	// covers: AC-1, AC-22, AC-24
	it('shows, in order, the noscript line, the status area, the form, the privacy note and the LinkedIn line', () => {
		const order = [
			main.indexOf('<noscript>'),
			main.indexOf('id="contact-status"'),
			main.indexOf('<form'),
			main.indexOf(escapeHtml(CONTACT.privacyNote)),
			main.indexOf(escapeHtml(CONTACT.linkedinText)),
		];

		expect(order.every((index) => index > 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	// covers: AC-1, AC-24
	it('links LinkedIn from the noscript line and the LinkedIn line', () => {
		const noscript = main.slice(main.indexOf('<noscript>'), main.indexOf('</noscript>'));

		expect(noscript).toContain(escapeHtml(CONTACT.noScript));
		expect(noscript).toContain(`<a href="${LINKEDIN_URL}">${escapeHtml(CONTACT.linkedinLink)}</a>`);
		expect(main).toContain(
			`${escapeHtml(CONTACT.linkedinText)} <a href="${LINKEDIN_URL}">${escapeHtml(CONTACT.linkedinLink)}</a>`,
		);
	});

	// covers: AC-1
	it('has no CallToAction and no primary button besides the submit button', () => {
		expect(main).not.toContain(`href="${SITE.contact.href}"`);
		expect(main.match(/(?<![\w:-])bg-accent(?![\w-])/g)).toHaveLength(1);
		expect(main.match(/<button[\s>]/g)).toHaveLength(1);
	});

	// covers: AC-3
	it('posts to /api/contact without browser validation', () => {
		expect(tagWithId(main, 'contact-form')).toMatch(/action="\/api\/contact"/);
		expect(tagWithId(main, 'contact-form')).toMatch(/method="post"/);
		expect(tagWithId(main, 'contact-form')).toMatch(/\bnovalidate\b/);
	});

	// covers: AC-3
	it('has the name, email, topic radios, message, Turnstile container and submit button, in order', () => {
		const order = [
			form.indexOf('name="name"'),
			form.indexOf('name="email"'),
			form.indexOf('<fieldset'),
			form.indexOf('name="message"'),
			form.indexOf('id="contact-turnstile"'),
			form.indexOf('type="submit"'),
		];

		expect(order.every((index) => index > 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	// covers: AC-3
	it('gives the name and email inputs their attributes', () => {
		const name = tagWithId(form, 'contact-name');
		const email = tagWithId(form, 'contact-email');

		expect(name).toMatch(/type="text"/);
		expect(name).toMatch(/autocomplete="name"/);
		expect(name).toMatch(/\brequired\b/);
		expect(name).toMatch(/maxlength="100"/);
		expect(email).toMatch(/type="email"/);
		expect(email).toMatch(/autocomplete="email"/);
		expect(email).toMatch(/\brequired\b/);
		expect(email).toMatch(/maxlength="254"/);
	});

	// covers: AC-3
	it('offers the three topics as unchecked, required radios in a fieldset with its legend', () => {
		const fieldset = form.slice(form.indexOf('<fieldset'), form.indexOf('</fieldset>'));
		const radios = fieldset.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];

		expect(fieldset).toContain(`${escapeHtml(CONTACT.topicLegend)}</legend>`);
		expect(radios).toHaveLength(3);
		expect(radios.map((radio) => radio.match(/value="([^"]+)"/)?.[1])).toEqual([
			'role',
			'project',
			'other',
		]);
		radios.forEach((radio) => {
			expect(radio).toMatch(/name="topic"/);
			expect(radio).toMatch(/\brequired\b/);
			expect(radio).not.toMatch(/\bchecked\b/);
		});
		TOPICS.forEach((topic) => expect(fieldset).toContain(escapeHtml(topic.label)));
	});

	// covers: AC-3
	it('makes each radio label row its target, at least 2.75rem tall', () => {
		const labels = form.match(/<label for="contact-topic-[a-z]+"[^>]*>/g) ?? [];

		expect(labels).toHaveLength(3);
		labels.forEach((label) => expect(label).toMatch(/\bmin-h-11\b/));
	});

	// covers: AC-3
	it('gives the message its hint, limits and size', () => {
		const message = tagWithId(form, 'contact-message');

		expect(message).toMatch(/^<textarea/);
		expect(message).toMatch(/\brequired\b/);
		expect(message).toMatch(/maxlength="5000"/);
		expect(message).toMatch(/rows="8"/);
		expect(message).toMatch(/aria-describedby="contact-message-hint"/);
		expect(tagWithId(form, 'contact-message-hint')).toBeTruthy();
		expect(form).toContain(escapeHtml(CONTACT.messageHint));
	});

	// covers: AC-3
	it('ties a visible label to every input by for and id', () => {
		const ids = [...form.matchAll(/<(?:input|textarea)[^>]*\bid="([^"]+)"/g)].map(
			(match) => match[1],
		);

		expect(ids).toEqual([
			'contact-name',
			'contact-email',
			'contact-topic-role',
			'contact-topic-project',
			'contact-topic-other',
			'contact-message',
		]);
		ids.forEach((id) => expect(form).toMatch(new RegExp(`<label for="${id}"[^>]*>`)));
		expect(form).toContain(`>${escapeHtml(CONTACT.nameLabel)}</label>`);
		expect(form).toContain(`>${escapeHtml(CONTACT.emailLabel)}</label>`);
		expect(form).toContain(`>${escapeHtml(CONTACT.messageLabel)}</label>`);
	});

	// covers: AC-3
	it('has no hidden trap field', () => {
		expect(form).not.toMatch(/type="hidden"/);
		expect(form.match(/<(input|textarea)[\s>]/g)).toHaveLength(6);
	});

	// covers: AC-3
	it('ends with a submit Button with the submit label', () => {
		expect(form).toMatch(
			new RegExp(`<button type="submit"[^>]*>${escapeHtml(CONTACT.submitLabel)}</button>`),
		);
	});

	// covers: AC-6
	it('has a hidden error line for each field, with the visually hidden prefix', () => {
		['name', 'email', 'topic', 'message'].forEach((field) => {
			const error = tagWithId(form, `contact-${field}-error`);
			expect(error).toMatch(/\bhidden\b/);
		});
		expect(
			form.match(
				new RegExp(`<span class="sr-only">${escapeHtml(CONTACT.errorPrefix)} </span>`, 'g'),
			),
		).toHaveLength(4);
	});

	// covers: AC-8
	it('has an empty, focusable status area above the form', () => {
		expect(main).toMatch(/<div id="contact-status" tabindex="-1" class="[^"]*"><\/div>\s*<form/);
	});

	// covers: AC-11, AC-19
	it('gives the form the Turnstile site key for this build', () => {
		expect(tagWithId(main, 'contact-form')).toMatch(/data-site-key="[^"]+"/);
	});

	// covers: AC-4
	it('marks Contact as the current page in the nav', () => {
		expect(html).toMatch(/<a href="\/contact" aria-current="page"/);
		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
	});
});
