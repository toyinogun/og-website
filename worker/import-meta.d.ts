// `src/lib/contact.ts` reads `import.meta.env` in `turnstileSiteKey`, which
// only the page calls. This tells the Worker's type check what it holds.
interface ImportMeta {
	readonly env: { readonly PUBLIC_TURNSTILE_SITE_KEY?: string; readonly DEV?: boolean };
}
