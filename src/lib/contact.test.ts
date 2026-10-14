import { describe, expect, it } from 'vitest';
import {
	charactersLeftText,
	clientOutcome,
	CONTACT,
	CONTACT_LIMITS,
	emailBody,
	emailSubject,
	fieldErrorMessage,
	outboxKey,
	outboxMetadata,
	shownFieldErrors,
	TOPICS,
	TURNSTILE_SITE_KEY,
	TURNSTILE_TEST_SITE_KEY,
	turnstileSiteKey,
	validateContact,
	weeklyCheckBody,
	weeklyCheckSubject,
	weeklyTurnstileState,
	type ContactCopy,
	type ContactErrorCopy,
	type ContactFields,
	type ContactMessage,
	type OutboxSummary,
} from './contact';

const LABEL = 40;
const MESSAGE = 200;

/** The length range each top level value must fit, after trimming (AC-2). */
const LIMITS: Readonly<Record<Exclude<keyof ContactCopy, 'errors'>, readonly [number, number]>> = {
	title: [1, 60],
	description: [50, 160],
	heading: [1, 60],
	lead: [1, 160],
	nameLabel: [1, LABEL],
	emailLabel: [1, LABEL],
	topicLegend: [1, LABEL],
	messageLabel: [1, LABEL],
	messageHint: [1, LABEL],
	submitLabel: [1, LABEL],
	sendingLabel: [1, LABEL],
	sent: [1, MESSAGE],
	errorSummary: [1, MESSAGE],
	errorPrefix: [1, LABEL],
	privacyNote: [1, 600],
	linkedinText: [1, LABEL],
	linkedinLink: [1, LABEL],
	noScript: [1, MESSAGE],
	charactersLeft: [1, LABEL],
};

const VALID: ContactFields = {
	name: 'Ada Lovelace',
	email: 'ada@example.com',
	topic: 'role',
	message: 'Hello, I have a role for you.',
};

const errorsOf = (fields: Partial<ContactFields>) => {
	const result = validateContact({ ...VALID, ...fields });
	return result.ok ? {} : result.errors;
};

describe('CONTACT', () => {
	// covers: AC-2
	it('has a limit for every value, and a value for every limit', () => {
		const keys = Object.keys(CONTACT).filter((key) => key !== 'errors');
		expect(keys.sort()).toEqual(Object.keys(LIMITS).sort());
	});

	// covers: AC-2
	it.each(Object.entries(LIMITS))('keeps %s within its limit', (key, [min, max]) => {
		const value = CONTACT[key as keyof typeof LIMITS].trim();

		expect(value.length).toBeGreaterThanOrEqual(min);
		expect(value.length).toBeLessThanOrEqual(max);
	});

	// covers: AC-2
	it.each(Object.keys(CONTACT.errors))('keeps errors.%s non empty and at most 200', (key) => {
		const value = CONTACT.errors[key as keyof ContactErrorCopy].trim();

		expect(value.length).toBeGreaterThan(0);
		expect(value.length).toBeLessThanOrEqual(MESSAGE);
	});

	// covers: AC-2
	it.each(TOPICS.map((topic) => topic.label))('keeps the topic label %j within 40', (label) => {
		expect(label.trim().length).toBeGreaterThan(0);
		expect(label.trim().length).toBeLessThanOrEqual(LABEL);
	});

	// covers: AC-2
	it('promises a reply within two working days on success', () => {
		expect(CONTACT.sent).toContain('two working days');
	});

	// covers: AC-8
	it.each(['notSent', 'uncertain'] as const)('says in %s that the text is still there', (key) => {
		expect(CONTACT.errors[key]).toMatch(/text is still here/);
	});

	// covers: AC-8
	it('warns in uncertain that sending again may deliver it twice', () => {
		expect(CONTACT.errors.uncertain).toMatch(/twice/);
	});

	// covers: AC-22
	it('names what is collected, the 30 day copy, Turnstile, the IP, the logs and deletion', () => {
		for (const part of [
			'name, email, topic and message',
			'30 days',
			'Turnstile',
			'IP address',
			'logs',
			'delete',
		]) {
			expect(CONTACT.privacyNote).toContain(part);
		}
	});

	// covers: AC-2
	it('keeps the {n} placeholder in the counter text', () => {
		expect(CONTACT.charactersLeft).toContain('{n}');
		expect(charactersLeftText(500)).toBe('500 characters left');
	});
});

describe('TOPICS', () => {
	// covers: AC-3
	it('offers role, project and other, in that order', () => {
		expect(TOPICS.map((topic) => topic.value)).toEqual(['role', 'project', 'other']);
	});
});

describe('validateContact', () => {
	// covers: AC-5
	it('returns the trimmed message for valid input', () => {
		expect(
			validateContact({
				name: '  Ada  ',
				email: ' ada@example.com ',
				topic: 'project',
				message: '\n  Hello there, friend.  \n',
			}),
		).toEqual({
			ok: true,
			value: {
				name: 'Ada',
				email: 'ada@example.com',
				topic: 'project',
				message: 'Hello there, friend.',
			},
		});
	});

	// covers: AC-5
	it('never changes its input', () => {
		const fields = Object.freeze({ ...VALID, name: '  Ada  ' });

		validateContact(fields);

		expect(fields.name).toBe('  Ada  ');
	});

	// covers: AC-5
	it('reports every bad field at once', () => {
		expect(validateContact({ name: '', email: '', topic: '', message: '' })).toEqual({
			ok: false,
			errors: { name: 'required', email: 'required', topic: 'required', message: 'required' },
		});
	});

	describe('name', () => {
		// covers: AC-5
		it.each([
			['', 'required'],
			['   ', 'required'],
			['a'.repeat(101), 'too_long'],
			['Ada\u0000', 'invalid'],
			['Ada\u007F', 'invalid'],
			['Ada\tLovelace', 'invalid'],
		])('rejects %j as %s', (name, code) => {
			expect(errorsOf({ name })).toEqual({ name: code });
		});

		// covers: AC-5
		it.each(['A', 'a'.repeat(100), `  ${'a'.repeat(100)}  `, 'Zoë "Zee" O’Brien, Jr.', '李小龍'])(
			'accepts %j',
			(name) => {
				expect(errorsOf({ name })).toEqual({});
			},
		);

		// covers: AC-5
		it('checks too long before invalid', () => {
			expect(errorsOf({ name: `${'a'.repeat(101)}\u0000` })).toEqual({ name: 'too_long' });
		});
	});

	describe('email', () => {
		// covers: AC-5
		it.each([
			['', 'required'],
			['  ', 'required'],
			[`${'a'.repeat(243)}@example.com`, 'too_long'],
			['ada', 'invalid'],
			['ada@example', 'invalid'],
			['ada @example.com', 'invalid'],
			['ada@@example.com', 'invalid'],
			['ada@exa\u0000mple.com', 'invalid'],
		])('rejects %j as %s', (email, code) => {
			expect(errorsOf({ email })).toEqual({ email: code });
		});

		// covers: AC-5
		it.each([`${'a'.repeat(242)}@example.com`, 'a@b.co', 'zoë@example.nl'])(
			'accepts %j',
			(email) => {
				expect(errorsOf({ email })).toEqual({});
			},
		);
	});

	describe('topic', () => {
		// covers: AC-5
		it.each([
			['', 'required'],
			['job', 'invalid'],
			['Role', 'invalid'],
		])('rejects %j as %s', (topic, code) => {
			expect(errorsOf({ topic })).toEqual({ topic: code });
		});

		// covers: AC-5
		it.each(['role', 'project', 'other'])('accepts %j', (topic) => {
			expect(errorsOf({ topic })).toEqual({});
		});
	});

	describe('message', () => {
		// covers: AC-5
		it.each([
			['', 'required'],
			[' \n\t ', 'required'],
			['a'.repeat(9), 'too_short'],
			[`  ${'a'.repeat(9)}  `, 'too_short'],
			['a'.repeat(5001), 'too_long'],
			['Hello there\u0000', 'invalid'],
			['Hello there\u007F', 'invalid'],
			['Hello\u000Bthere', 'invalid'],
			['Hello\u000Cthere', 'invalid'],
			['Hello there\u001B', 'invalid'],
		])('rejects %j as %s', (message, code) => {
			expect(errorsOf({ message })).toEqual({ message: code });
		});

		// covers: AC-5
		it.each([
			'a'.repeat(10),
			'a'.repeat(5000),
			'Line one\nLine two\r\n\tindented',
			'Grüße aus München 🚀',
		])('accepts %j', (message) => {
			expect(errorsOf({ message })).toEqual({});
		});

		// covers: AC-5
		it('measures in UTF-16 code units, the unit maxlength uses', () => {
			expect(errorsOf({ message: '🚀'.repeat(5) })).toEqual({});
			expect(errorsOf({ message: '🚀'.repeat(2501) })).toEqual({ message: 'too_long' });
		});
	});
});

describe('fieldErrorMessage', () => {
	// covers: AC-6
	it.each([
		['name', 'required', CONTACT.errors.nameRequired],
		['name', 'too_long', CONTACT.errors.nameLong],
		['name', 'invalid', CONTACT.errors.nameInvalid],
		['email', 'required', CONTACT.errors.emailRequired],
		['email', 'too_long', CONTACT.errors.emailLong],
		['email', 'invalid', CONTACT.errors.emailInvalid],
		['topic', 'required', CONTACT.errors.topicRequired],
		['topic', 'invalid', CONTACT.errors.topicRequired],
		['message', 'required', CONTACT.errors.messageRequired],
		['message', 'too_short', CONTACT.errors.messageShort],
		['message', 'too_long', CONTACT.errors.messageLong],
		['message', 'invalid', CONTACT.errors.messageInvalid],
	])('maps %s %s to its words', (field, code, words) => {
		expect(fieldErrorMessage(field, code)).toBe(words);
	});

	// covers: AC-8
	it.each([
		['name', 'too_short'],
		['name', 'weird'],
		['phone', 'required'],
		['constructor', 'required'],
		['name', 'constructor'],
	])('falls back for %s %s', (field, code) => {
		expect(fieldErrorMessage(field, code)).toBe(CONTACT.errors.fieldFallback);
	});
});

describe('shownFieldErrors', () => {
	// covers: AC-6
	it('lists the errors in form order, whatever order they arrive in', () => {
		expect(shownFieldErrors({ message: 'too_short', name: 'required' })).toEqual([
			{ field: 'name', message: CONTACT.errors.nameRequired },
			{ field: 'message', message: CONTACT.errors.messageShort },
		]);
	});

	// covers: AC-8
	it('drops unknown fields and falls back on unknown codes', () => {
		expect(shownFieldErrors({ phone: 'required', email: 'new_code' })).toEqual([
			{ field: 'email', message: CONTACT.errors.fieldFallback },
		]);
	});

	// covers: AC-8
	it.each([null, undefined, 'name', ['name'], {}])('returns nothing for %j', (fields) => {
		expect(shownFieldErrors(fields)).toEqual([]);
	});
});

describe('clientOutcome', () => {
	// covers: AC-8
	it.each([
		[200, { ok: true }, 'sent'],
		[422, { ok: false, error: 'invalid', fields: { name: 'required' } }, 'fix'],
		[422, { ok: false, error: 'invalid', fields: {} }, 'fix'],
		[429, { ok: false, error: 'rate_limited' }, 'wait'],
		[403, { ok: false, error: 'verification' }, 'check'],
		[400, { ok: false, error: 'bad_request' }, 'not_sent'],
		[403, { ok: false, error: 'forbidden' }, 'not_sent'],
		[404, { ok: false, error: 'not_found' }, 'not_sent'],
		[405, { ok: false, error: 'method_not_allowed' }, 'not_sent'],
		[502, { ok: false, error: 'delivery' }, 'not_sent'],
		[503, { ok: false, error: 'unavailable' }, 'not_sent'],
	] as const)('maps %i %j to %s', (status, body, outcome) => {
		expect(clientOutcome(status, body)).toBe(outcome);
	});

	// covers: AC-8
	it.each([
		['a network error or the abort', null, undefined],
		['a 500', 500, { ok: false, error: 'unavailable' }],
		['a body that is not JSON', 200, undefined],
		['200 with ok false', 200, { ok: false, error: 'delivery' }],
		['200 with no ok', 200, {}],
		['an array body', 200, [true]],
		['422 without fields', 422, { ok: false, error: 'invalid' }],
		[
			'422 with fields that are not an object',
			422,
			{ ok: false, error: 'invalid', fields: 'name' },
		],
		['429 with the wrong error', 429, { ok: false, error: 'delivery' }],
		['403 with an unknown error', 403, { ok: false, error: 'nope' }],
		['502 with the wrong error', 502, { ok: false, error: 'unavailable' }],
		['503 with ok true', 503, { ok: true }],
		['a 302', 302, { ok: false, error: 'not_found' }],
	])('treats %s as uncertain', (_label, status, body) => {
		expect(clientOutcome(status, body)).toBe('uncertain');
	});
});

describe('the email', () => {
	const message: ContactMessage = {
		name: 'Zoë "Zee" O’Brien, Jr.',
		email: 'zee@example.com',
		topic: 'project',
		message: 'First line\nSecond line\n\n\tThird, indented',
	};
	const receivedAt = new Date('2026-10-14T09:30:00.000Z');

	// covers: AC-13
	it('puts the topic label and the name in the subject', () => {
		expect(emailSubject(message)).toBe(
			'[toyintest.org] A project or contract: Zoë "Zee" O’Brien, Jr.',
		);
	});

	// covers: AC-13
	it.each(TOPICS)('labels the $value topic in the subject', (topic) => {
		expect(emailSubject({ ...message, topic: topic.value })).toContain(`] ${topic.label}: `);
	});

	// covers: AC-13
	it('lays the body out exactly, with the message as written', () => {
		expect(emailBody(message, receivedAt, 'msg:2026-10-14T09:30:00.000Z:abc')).toBe(
			[
				'Topic: A project or contract',
				'Name: Zoë "Zee" O’Brien, Jr.',
				'Email: zee@example.com',
				'Received: 2026-10-14T09:30:00.000Z',
				'Reference: msg:2026-10-14T09:30:00.000Z:abc',
				'',
				'First line\nSecond line\n\n\tThird, indented',
			].join('\n'),
		);
	});

	// covers: AC-13, AC-14
	it('says "not saved" when there is no outbox copy', () => {
		expect(emailBody(message, receivedAt, null)).toContain('\nReference: not saved\n');
	});
});

describe('the outbox', () => {
	// covers: AC-12
	it('keys each message by time, then a UUID', () => {
		expect(outboxKey(new Date('2026-10-14T09:30:00.000Z'), 'u-1')).toBe(
			'msg:2026-10-14T09:30:00.000Z:u-1',
		);
	});

	// covers: AC-12
	it('keeps the receivedAt, topic, name and status as metadata, the name cut to 100', () => {
		expect(
			outboxMetadata({
				receivedAt: '2026-10-14T09:30:00.000Z',
				topic: 'role',
				name: 'a'.repeat(150),
				email: 'a@example.com',
				message: 'secret words',
				emailStatus: 'pending',
			}),
		).toEqual({
			receivedAt: '2026-10-14T09:30:00.000Z',
			topic: 'role',
			name: 'a'.repeat(100),
			emailStatus: 'pending',
		});
	});

	// covers: AC-12
	it('keeps copies for 30 days', () => {
		expect(CONTACT_LIMITS.outboxTtlSeconds).toBe(30 * 24 * 60 * 60);
	});
});

describe('weeklyTurnstileState', () => {
	// covers: AC-21
	it.each([
		['missing', 'secret_missing'],
		['unreachable', 'unreachable'],
		[undefined, 'unreachable'],
		['not json', 'unreachable'],
		[{ success: false }, 'unreachable'],
		[{ success: false, 'error-codes': ['invalid-input-secret'] }, 'secret_rejected'],
		[
			{ success: false, 'error-codes': ['missing-input-secret', 'invalid-input-response'] },
			'secret_rejected',
		],
		[
			{
				success: false,
				'error-codes': ['invalid-input-secret'],
				metadata: { result_with_testing_key: true },
			},
			'secret_rejected',
		],
		[
			{
				success: true,
				hostname: 'example.com',
				'error-codes': [],
				metadata: { result_with_testing_key: true },
			},
			'test_secret',
		],
		[
			{
				success: false,
				'error-codes': ['invalid-input-response'],
				metadata: { result_with_testing_key: true },
			},
			'test_secret',
		],
		[{ success: true, 'error-codes': [], metadata: { result_with_testing_key: false } }, 'unknown'],
		[
			{ success: true, 'error-codes': [], metadata: { result_with_testing_key: 'true' } },
			'unknown',
		],
		[{ success: false, 'error-codes': ['invalid-input-response'] }, 'ok'],
		[{ success: true, 'error-codes': [] }, 'unknown'],
		[{ success: false, 'error-codes': ['internal-error'] }, 'unknown'],
		[{ success: false, 'error-codes': [] }, 'unknown'],
	])('reads %j as %s', (result, state) => {
		expect(weeklyTurnstileState(result)).toBe(state);
	});
});

describe('the weekly check email', () => {
	const sentAt = new Date('2026-10-19T08:00:00.000Z');
	const summary = (key: string, emailStatus: OutboxSummary['emailStatus']): OutboxSummary => ({
		key,
		receivedAt: '2026-10-15T10:00:00.000Z',
		topic: 'role',
		name: 'Ada',
		emailStatus,
	});

	// covers: AC-21
	it('has a fixed subject', () => {
		expect(weeklyCheckSubject()).toBe('[toyintest.org] Weekly contact form check');
	});

	// covers: AC-21
	it('gives the time, the Turnstile state and what a missing Monday email means', () => {
		const body = weeklyCheckBody(sentAt, 'ok', []);

		expect(body).toContain('2026-10-19T08:00:00.000Z');
		expect(body).toContain('Turnstile secret: working');
		expect(body).toContain('No messages in the last 7 days.');
		expect(body).toMatch(/does not arrive on a Monday/);
	});

	// covers: AC-21
	it.each(['secret_missing', 'unreachable', 'secret_rejected', 'test_secret', 'unknown'] as const)(
		'flags the %s state in capitals, in at most 200 characters',
		(state) => {
			const line = weeklyCheckBody(sentAt, state, [])
				.split('\n')
				.find((text) => text.startsWith('Turnstile secret: '));

			expect(line).toMatch(/^Turnstile secret: [A-Z]{3,}/);
			expect(line?.slice('Turnstile secret: '.length).length).toBeLessThanOrEqual(200);
		},
	);

	// covers: AC-21
	it('tells you to replace the test secret', () => {
		expect(weeklyCheckBody(sentAt, 'test_secret', [])).toContain(
			"Turnstile secret: TEST SECRET: TURNSTILE_SECRET_KEY is Cloudflare's test secret, which refuses every real send; set the real secret",
		);
	});

	// covers: AC-21
	it('lists each message, and points to the dashboard for any not sent', () => {
		const body = weeklyCheckBody(sentAt, 'ok', [
			summary('msg:a', 'sent'),
			summary('msg:b', 'failed'),
			summary('msg:c', 'pending'),
		]);

		expect(body).toContain('- 2026-10-15T10:00:00.000Z · A role · Ada · email sent');
		expect(body).toContain('2 message(s) may not be in your inbox');
		expect(body).toContain('Storage and databases, KV, CONTACT_OUTBOX');
		expect(body).toContain('- msg:b');
		expect(body).toContain('- msg:c');
		expect(body).not.toContain('- msg:a');
	});

	// covers: AC-21
	it('says when the outbox could not be read', () => {
		expect(weeklyCheckBody(sentAt, 'ok', 'unreadable')).toContain('could not be read');
	});
});

describe('turnstileSiteKey', () => {
	// covers: AC-19
	it('uses PUBLIC_TURNSTILE_SITE_KEY when set', () => {
		expect(
			turnstileSiteKey({ PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA', DEV: false }),
		).toBe('1x00000000000000000000AA');
	});

	// covers: AC-19
	it('uses the always pass test key on the dev server', () => {
		expect(turnstileSiteKey({ DEV: true })).toBe(TURNSTILE_TEST_SITE_KEY);
		expect(TURNSTILE_TEST_SITE_KEY).toBe('1x00000000000000000000AA');
	});

	// covers: AC-19
	it('uses the production key in a normal build', () => {
		expect(turnstileSiteKey({ DEV: false })).toBe(TURNSTILE_SITE_KEY);
		expect(turnstileSiteKey({ PUBLIC_TURNSTILE_SITE_KEY: '', DEV: false })).toBe(
			TURNSTILE_SITE_KEY,
		);
	});

	// covers: AC-19
	it('never ships a Cloudflare test key as the production key', () => {
		expect(TURNSTILE_SITE_KEY).not.toMatch(/^[123]x0+/);
	});
});
