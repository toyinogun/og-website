// The contact form's words, limits and pure logic (spec 0006). Shared by the
// page, the form's browser script and the Worker in worker/, so one
// validation function and one set of limits serve both sides. Nothing here
// touches the network or storage; that stays at the Worker's edge.
// Edit the words in `CONTACT`; `contact.test.ts` holds each one to its limit.

/** The shape of `CONTACT`: the page head tags, then every word on the page and in the form. */
export interface ContactCopy {
	readonly title: string;
	readonly description: string;
	readonly heading: string;
	readonly lead: string;
	readonly nameLabel: string;
	readonly emailLabel: string;
	readonly topicLegend: string;
	readonly messageLabel: string;
	readonly messageHint: string;
	readonly submitLabel: string;
	readonly sendingLabel: string;
	readonly sent: string;
	readonly errorSummary: string;
	readonly errorPrefix: string;
	readonly privacyNote: string;
	readonly linkedinText: string;
	readonly linkedinLink: string;
	readonly noScript: string;
	/** The counter under the message, with `{n}` for the characters left. */
	readonly charactersLeft: string;
	readonly errors: ContactErrorCopy;
}

/** The shape of `CONTACT.errors`: field errors first, then the outcome messages. */
export interface ContactErrorCopy {
	readonly nameRequired: string;
	readonly nameLong: string;
	readonly nameInvalid: string;
	readonly emailRequired: string;
	readonly emailLong: string;
	readonly emailInvalid: string;
	readonly topicRequired: string;
	readonly messageRequired: string;
	readonly messageShort: string;
	readonly messageLong: string;
	readonly messageInvalid: string;
	readonly fieldFallback: string;
	readonly rateLimited: string;
	readonly verification: string;
	readonly checkPending: string;
	readonly checkFailed: string;
	readonly notSent: string;
	readonly uncertain: string;
}

/** Every word on the contact page and in its form. */
export const CONTACT: ContactCopy = {
	title: 'Contact Toyin Ogunseinde, DevOps engineer',
	description:
		'Send Toyin Ogunseinde a message about a role, a contract or a project. I read every message myself and usually reply within two working days.',
	heading: 'Send me a message',
	lead: 'Tell me about the role or the project. I read every message myself.',
	nameLabel: 'Your name',
	emailLabel: 'Your email',
	topicLegend: 'What is it about?',
	messageLabel: 'Your message',
	messageHint: 'At least 10 characters.',
	submitLabel: 'Send message',
	sendingLabel: 'Sending…',
	sent: 'Thanks, I have your message. I usually reply within two working days.',
	errorSummary: 'Please fix these and send again:',
	errorPrefix: 'Error:',
	privacyNote:
		'What happens to your message: I use your name, email, topic and message only to reply to you. It is emailed to me and also kept on Cloudflare for 30 days as a backup, then deleted automatically; the copy in my inbox stays until I delete it. Cloudflare Turnstile checks you are not a bot and receives your IP address, which the site also uses to limit repeated sends but does not store. Cloudflare keeps short request logs for a few days. To ask about or delete what you sent, reply to my email or message me on LinkedIn.',
	linkedinText: 'Prefer LinkedIn?',
	linkedinLink: 'Message me there.',
	noScript:
		'Sending needs JavaScript, because the form checks you are not a bot. You can message me on LinkedIn instead.',
	charactersLeft: '{n} characters left',
	errors: {
		nameRequired: 'Enter your name.',
		nameLong: 'Keep your name under 100 characters.',
		nameInvalid: 'Remove unusual characters from your name.',
		emailRequired: 'Enter your email address.',
		emailLong: 'Keep your email address under 254 characters.',
		emailInvalid: 'Enter an email address like name@example.com.',
		topicRequired: 'Choose what your message is about.',
		messageRequired: 'Write your message.',
		messageShort: 'Write at least 10 characters.',
		messageLong: 'Keep your message under 5,000 characters.',
		messageInvalid: 'Remove unusual characters from your message.',
		fieldFallback: 'Check this field and try again.',
		rateLimited: 'You have sent a few messages in a row. Please wait a minute, then try again.',
		verification: 'The bot check did not go through. Please try sending again.',
		checkPending: 'Please finish the bot check above the button, then send again.',
		checkFailed:
			'The bot check could not load, so the form cannot send right now. Your text is still here. You can message me on LinkedIn instead.',
		notSent:
			'Sorry, your message did not send. Your text is still here, so you can try again, or message me on LinkedIn.',
		uncertain:
			'I could not confirm your message was sent. Your text is still here. If you send it again I may get it twice, or you can message me on LinkedIn.',
	},
};

/** The counter text under the message, for example `500 characters left`. */
export const charactersLeftText = (left: number): string =>
	CONTACT.charactersLeft.replace('{n}', left.toLocaleString('en-GB'));

/** What a message can be about: the form's radio values. */
export type Topic = 'role' | 'project' | 'other';

/** One topic choice: its radio value and the label shown in the form and the email subject. */
export interface TopicChoice {
	readonly value: Topic;
	readonly label: string;
}

/** The topic choices, in form order. */
export const TOPICS: readonly TopicChoice[] = [
	{ value: 'role', label: 'A role' },
	{ value: 'project', label: 'A project or contract' },
	{ value: 'other', label: 'Something else' },
];

/** Every limit and timeout the form, the validation and the Worker share. */
export const CONTACT_LIMITS = {
	nameMax: 100,
	emailMax: 254,
	messageMin: 10,
	messageMax: 5000,
	counterFrom: 4500,
	bodyMaxBytes: 32768,
	tokenMax: 2048,
	sendTimeoutMs: 15000,
	tokenWaitMs: 10000,
	verifyTimeoutMs: 5000,
	outboxTtlSeconds: 2592000,
} as const;

/** The form fields, in form order. */
export const CONTACT_FIELDS = ['name', 'email', 'topic', 'message'] as const;

/** One of the form fields. */
export type ContactField = (typeof CONTACT_FIELDS)[number];

/** The raw form input, before validation. */
export type ContactFields = Readonly<Record<ContactField, string>>;

/** A message that passed `validateContact`: every text trimmed, the topic known. */
export interface ContactMessage {
	readonly name: string;
	readonly email: string;
	readonly topic: Topic;
	readonly message: string;
}

/** Why a field failed, in the order the checks run. */
export type FieldErrorCode = 'required' | 'too_long' | 'too_short' | 'invalid';

/** The first failure of each bad field. */
export type FieldErrors = Partial<Record<ContactField, FieldErrorCode>>;

/** What `validateContact` returns: the clean message, or the errors. */
export type ValidationResult =
	| { readonly ok: true; readonly value: ContactMessage }
	| { readonly ok: false; readonly errors: FieldErrors };

/** The only bodies the Worker returns from `/api/contact`. */
export type ContactResponse =
	| { readonly ok: true }
	| { readonly ok: false; readonly error: 'invalid'; readonly fields: FieldErrors }
	| {
			readonly ok: false;
			readonly error:
				| 'rate_limited'
				| 'verification'
				| 'delivery'
				| 'unavailable'
				| 'bad_request'
				| 'forbidden'
				| 'not_found'
				| 'method_not_allowed';
	  };

/** A loose email shape check: something, an `@`, something, a dot, something, with no spaces. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isTopic = (value: string): value is Topic => TOPICS.some((topic) => topic.value === value);

const hasCharacter = (text: string, isBad: (code: number) => boolean): boolean =>
	[...text].some((character) => isBad(character.charCodeAt(0)));

/** U+0000 to U+001F and U+007F. */
const isControl = (code: number): boolean => code <= 0x1f || code === 0x7f;

/** A control character other than tab, line feed and carriage return. */
const isMessageControl = (code: number): boolean =>
	isControl(code) && code !== 0x09 && code !== 0x0a && code !== 0x0d;

const checkName = (name: string): FieldErrorCode | undefined => {
	if (name === '') return 'required';
	if (name.length > CONTACT_LIMITS.nameMax) return 'too_long';
	if (hasCharacter(name, isControl)) return 'invalid';
	return undefined;
};

const checkEmail = (email: string): FieldErrorCode | undefined => {
	if (email === '') return 'required';
	if (email.length > CONTACT_LIMITS.emailMax) return 'too_long';
	if (hasCharacter(email, isControl) || !EMAIL_PATTERN.test(email)) return 'invalid';
	return undefined;
};

const checkTopic = (topic: string): FieldErrorCode | undefined => {
	if (topic === '') return 'required';
	if (!isTopic(topic)) return 'invalid';
	return undefined;
};

const checkMessage = (message: string): FieldErrorCode | undefined => {
	if (message === '') return 'required';
	if (message.length > CONTACT_LIMITS.messageMax) return 'too_long';
	if (message.length < CONTACT_LIMITS.messageMin) return 'too_short';
	if (hasCharacter(message, isMessageControl)) return 'invalid';
	return undefined;
};

/**
 * Checks the form input against the spec 0006 *Validation rules*: trims the
 * text, measures it in UTF-16 code units (the unit `maxlength` uses) and
 * stops at each field's first failure. Never throws, never changes its input.
 */
export const validateContact = (fields: ContactFields): ValidationResult => {
	const name = fields.name.trim();
	const email = fields.email.trim();
	const topic = fields.topic.trim();
	const message = fields.message.trim();
	const checks: readonly (readonly [ContactField, FieldErrorCode | undefined])[] = [
		['name', checkName(name)],
		['email', checkEmail(email)],
		['topic', checkTopic(topic)],
		['message', checkMessage(message)],
	];
	const errors: FieldErrors = Object.fromEntries(checks.filter(([, code]) => code !== undefined));

	return Object.keys(errors).length === 0 && isTopic(topic)
		? { ok: true, value: { name, email, topic, message } }
		: { ok: false, errors };
};

const FIELD_ERROR_KEYS: Readonly<
	Record<ContactField, Partial<Record<FieldErrorCode, keyof ContactErrorCopy>>>
> = {
	name: { required: 'nameRequired', too_long: 'nameLong', invalid: 'nameInvalid' },
	email: { required: 'emailRequired', too_long: 'emailLong', invalid: 'emailInvalid' },
	topic: { required: 'topicRequired', invalid: 'topicRequired' },
	message: {
		required: 'messageRequired',
		too_short: 'messageShort',
		too_long: 'messageLong',
		invalid: 'messageInvalid',
	},
};

const isContactField = (field: string): field is ContactField =>
	(CONTACT_FIELDS as readonly string[]).includes(field);

/** The words for one field error; any field and code pair it does not know gets `fieldFallback`. */
export const fieldErrorMessage = (field: string, code: string): string => {
	const keys: Readonly<Record<string, keyof ContactErrorCopy>> = isContactField(field)
		? FIELD_ERROR_KEYS[field]
		: {};
	return Object.hasOwn(keys, code) ? CONTACT.errors[keys[code]] : CONTACT.errors.fieldFallback;
};

/** One field error ready to show: the field it belongs to and its words. */
export interface ShownFieldError {
	readonly field: ContactField;
	readonly message: string;
}

/**
 * The field errors to show, in form order, from a `FieldErrors` object or a
 * 422 response's `fields`. Unknown fields are dropped; a known field with an
 * unknown code gets `fieldFallback`. An empty list means no known field was named.
 */
export const shownFieldErrors = (fields: unknown): readonly ShownFieldError[] => {
	if (!isRecord(fields)) return [];
	return CONTACT_FIELDS.filter((field) => field in fields).map((field) => ({
		field,
		message: fieldErrorMessage(field, String(fields[field])),
	}));
};

/** What the browser shows after a send (spec 0006, *Client outcome table*). */
export type ClientOutcome = 'sent' | 'fix' | 'wait' | 'check' | 'not_sent' | 'uncertain';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The error each "not sent" status must carry, so a status and body that disagree read as uncertain. */
const NOT_SENT_ERRORS: Readonly<Record<number, string>> = {
	400: 'bad_request',
	403: 'forbidden',
	404: 'not_found',
	405: 'method_not_allowed',
	502: 'delivery',
	503: 'unavailable',
};

/**
 * Decides the outcome from the HTTP status and the JSON body together. `status`
 * is `null` for a network error or the abort; `body` is `undefined` when the
 * reply was not JSON. Anything it does not recognise is `uncertain`.
 */
export const clientOutcome = (status: number | null, body: unknown): ClientOutcome => {
	if (status === null || !isRecord(body)) return 'uncertain';
	if (status === 200) return body.ok === true ? 'sent' : 'uncertain';
	if (body.ok !== false) return 'uncertain';
	if (status === 422 && body.error === 'invalid' && isRecord(body.fields)) return 'fix';
	if (status === 429 && body.error === 'rate_limited') return 'wait';
	if (status === 403 && body.error === 'verification') return 'check';
	if (NOT_SENT_ERRORS[status] !== undefined && body.error === NOT_SENT_ERRORS[status])
		return 'not_sent';
	return 'uncertain';
};

/** The label of a topic, as shown in the form and the email subject. */
export const topicLabel = (topic: Topic): string =>
	TOPICS.find((choice) => choice.value === topic)?.label ?? topic;

/** The email subject: `[toyintest.org] <topic label>: <name>`. */
export const emailSubject = (message: ContactMessage): string =>
	`[toyintest.org] ${topicLabel(message.topic)}: ${message.name}`;

/**
 * The email's plain text: the topic, name, email, time received and the
 * outbox key (`not saved` when the copy failed), a blank line, then the
 * message as written.
 */
export const emailBody = (
	message: ContactMessage,
	receivedAt: Date,
	reference: string | null,
): string =>
	[
		`Topic: ${topicLabel(message.topic)}`,
		`Name: ${message.name}`,
		`Email: ${message.email}`,
		`Received: ${receivedAt.toISOString()}`,
		`Reference: ${reference ?? 'not saved'}`,
		'',
		message.message,
	].join('\n');

/** Whether the email for a saved message went out, as kept in the outbox. */
export type EmailStatus = 'pending' | 'sent' | 'failed';

/** The 30 day copy of one message, as stored in the `CONTACT_OUTBOX` KV namespace. */
export interface OutboxRecord {
	readonly receivedAt: string;
	readonly topic: Topic;
	readonly name: string;
	readonly email: string;
	readonly message: string;
	readonly emailStatus: EmailStatus;
}

/** The metadata stored beside each outbox record, read by the weekly check without the value. */
export interface OutboxMetadata {
	readonly receivedAt: string;
	readonly topic: Topic;
	readonly name: string;
	readonly emailStatus: EmailStatus;
}

/** One message of the week, as the weekly check lists it. */
export interface OutboxSummary extends OutboxMetadata {
	readonly key: string;
}

/** The outbox key for a message: `msg:<receivedAt ISO>:<uuid>`, so keys sort by time. */
export const outboxKey = (receivedAt: Date, uuid: string): string =>
	`msg:${receivedAt.toISOString()}:${uuid}`;

/** The outbox metadata for a message, the name cut to 100 characters. */
export const outboxMetadata = (record: OutboxRecord): OutboxMetadata => ({
	receivedAt: record.receivedAt,
	topic: record.topic,
	name: record.name.slice(0, CONTACT_LIMITS.nameMax),
	emailStatus: record.emailStatus,
});

/** The weekly check's view of the Turnstile secret; only `ok` counts as fine. */
export type WeeklyTurnstileState =
	'ok' | 'secret_missing' | 'unreachable' | 'secret_rejected' | 'test_secret' | 'unknown';

/**
 * Reads the weekly probe's siteverify reply (spec 0006, *Weekly check
 * states*, first match wins). The probe sends a token that cannot pass, so a
 * working secret answers `invalid-input-response`. Cloudflare's test secret
 * marks its reply with `metadata.result_with_testing_key`, which reads as
 * `test_secret` (it refuses every real send, AC-10).
 */
export const weeklyTurnstileState = (result: unknown): WeeklyTurnstileState => {
	if (result === 'missing') return 'secret_missing';
	if (result === 'unreachable' || !isRecord(result)) return 'unreachable';
	const codes = result['error-codes'];
	if (!Array.isArray(codes)) return 'unreachable';
	if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret'))
		return 'secret_rejected';
	if (isRecord(result.metadata) && result.metadata.result_with_testing_key === true)
		return 'test_secret';
	if (result.success === false && codes.includes('invalid-input-response')) return 'ok';
	return 'unknown';
};

const TURNSTILE_STATE_WORDS: Readonly<Record<WeeklyTurnstileState, string>> = {
	ok: 'working',
	secret_missing: 'NOT SET: the TURNSTILE_SECRET_KEY secret is missing, so the form cannot send',
	unreachable: 'NOT CHECKED: Cloudflare siteverify did not answer',
	secret_rejected:
		'BROKEN: Cloudflare rejected the TURNSTILE_SECRET_KEY secret, so the form cannot send',
	test_secret:
		"TEST SECRET: TURNSTILE_SECRET_KEY is Cloudflare's test secret, which refuses every real send; set the real secret",
	unknown: 'UNCLEAR: siteverify gave an answer the check does not recognise',
};

/** The weekly check email's subject. */
export const weeklyCheckSubject = (): string => '[toyintest.org] Weekly contact form check';

/**
 * The weekly check email's plain text: when it ran, the Turnstile state in
 * words, each message of the last 7 days, a clear line for any that did not
 * reach the inbox, and what a missing Monday email means.
 */
export const weeklyCheckBody = (
	sentAt: Date,
	turnstile: WeeklyTurnstileState,
	messages: readonly OutboxSummary[] | 'unreadable',
): string => {
	const listed =
		messages === 'unreadable'
			? ['The outbox could not be read, so this week cannot be listed.']
			: messages.length === 0
				? ['No messages in the last 7 days.']
				: messages.map(
						(item) =>
							`- ${item.receivedAt} · ${topicLabel(item.topic)} · ${item.name} · email ${item.emailStatus}`,
					);
	const missed =
		messages === 'unreadable'
			? []
			: messages.filter((item) => item.emailStatus !== 'sent').map((item) => item.key);
	const missedLines =
		missed.length === 0
			? []
			: [
					'',
					`${missed.length} message(s) may not be in your inbox. Read them in the Cloudflare dashboard: Storage and databases, KV, CONTACT_OUTBOX, then the key:`,
					...missed.map((key) => `- ${key}`),
				];

	return [
		`Weekly check of the contact form on toyintest.org, run ${sentAt.toISOString()} (UTC).`,
		'',
		`Email: working (you are reading this).`,
		`Turnstile secret: ${TURNSTILE_STATE_WORDS[turnstile]}`,
		'',
		'Messages in the last 7 days:',
		...listed,
		...missedLines,
		'',
		'If this email does not arrive on a Monday, the form may be broken: Healthchecks.io will also email you. Check the og-website Worker in the Cloudflare dashboard.',
	].join('\n');
};

/** The environment values `turnstileSiteKey` reads. */
export interface SiteKeyEnv {
	readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
	readonly DEV?: boolean;
}

/** Cloudflare's always pass Turnstile test site key, for the dev server only. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * The production Turnstile widget's site key, public by design. The board
 * created the widget on JSM-52.
 */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAFWuC1DcdrkncDB1';

/**
 * The Turnstile site key for this build: `PUBLIC_TURNSTILE_SITE_KEY` when set
 * (`npm run build:local`), else the test key on the dev server, else the
 * production key.
 */
export const turnstileSiteKey = (env: SiteKeyEnv = import.meta.env): string =>
	env.PUBLIC_TURNSTILE_SITE_KEY || (env.DEV ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY);
