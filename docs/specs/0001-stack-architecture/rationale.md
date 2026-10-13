# 0001. Astro static site on Cloudflare Workers, decision record

Reasoning, options and evidence. The build spec is [index.md](index.md). Nothing here is needed to build; it exists so a future reader, including you in a year, can see why.

## Context

> ⚠️ Premise note: the stack is not the main risk to your two week target, and the plan currently spends that time as though it were. The scope puts five foundation features before Release 1 begins, four of them carrying their own design pass, and feature 1 alone carries a `Beta` tier cross check and approval. Meanwhile the scope itself names feature 6, the actual words, as the critical path. The failure mode is a fortnight of well designed foundations with no page anyone can read. Once the scaffold and feature 5 are done, the honest recommendation is to go straight at features 6 to 10, and to let feature 3's content model be a thin first pass expressed directly in the content schema, which is cheap to change while no write ups exist yet and expensive only afterwards. You may override this; it is your call, and I am raising it rather than quietly building to it.

This is a greenfield repository. There is no code, no `AGENTS.md`, and no prior spec, so nothing constrains the choice except the constraints you set.

The forces that actually shaped this decision:

- **Running cost at or near zero.** Not a preference but a stated constraint, and the scope makes it a condition of feature 1 being done: the hosting choice has to be *confirmed* free at this traffic level. That rules out any layer with a metered bill and puts the burden on verifying free tier terms rather than assuming them.
- **A domain you already own, on the plain address.** `toyintest.org`, registered at Cloudflare, served at the apex. This turned out to be the most consequential input, because it changes which free hosts can serve the site at all.
- **About two weeks to something presentable.** Favours what is fast to build and already understood over what is theoretically better.
- **You can maintain React with Next.js, and Astro.** Both. Team capability therefore eliminated nothing, which is unusual and is what made the framework question a genuine choice rather than a formality.
- **Content is Markdown in the repository.** No content service, which removes an entire category of provider decisions and recurring cost.
- **The site's job is to win work.** Two readers, a hiring manager and a prospective client. The contact form is the conversion point, and the scope flags it as the one feature that can fail silently. So the foundation must not foreclose a reliable form.
- **Traffic will be low and bursty.** A portfolio gets a handful of visits most days and a spike when a link is shared. Nothing here justifies infrastructure sized for scale.

There is no regulated data in scope at this stage. The contact form will later handle another person's name, email address and message, which the scope already notes and defers to features 11 and the deferred privacy note. That is not this decision's problem, but it is why the hosting choice had to leave a credible server side path open.

## Options considered

### Option 1: Astro, fully pre rendered, on Cloudflare Workers with static assets

Astro builds the whole site to files at build time. Markdown write ups live in typed content collections. Cloudflare Workers serves the built files from the plain domain, with DNS and HTTPS already in the same account.

**Pros**

- Static file requests are free and unlimited, so the cost constraint is satisfied structurally rather than by staying under a quota.
- Astro is built for exactly this: content heavy sites, minimal JavaScript shipped, schema validated Markdown.
- The domain is already on Cloudflare, which Workers requires, so DNS, certificate and host are one thing instead of three.
- A free server side function can be added later for the contact form without changing host or adding a provider.
- Cloudflare's own documentation names Workers as the path for new projects, so this starts on the supported path.

**Cons**

- Astro is the less transferable skill of the two you have, and this repository is partly a hiring artefact.
- Workers requires Cloudflare managed nameservers, so leaving Cloudflare later breaks the custom domain. Real lock in.
- Bindings are unavailable from a purely static Astro build, so the later form handler is a separate Worker route rather than an Astro page, a slightly different mental model.

### Option 2: Next.js, static export, on Cloudflare Workers

The same hosting, with Next.js exported to static files instead of Astro.

**Pros**

- Next.js is the stack with the most hiring signal, and you already know it.
- Identical hosting economics to option 1, since the output is also static files.
- The largest ecosystem of examples and components.

**Cons**

- Static export switches off most of what Next.js exists for, so you carry its weight and its upgrade churn for a brochure site and get little of its value.
- Typed Markdown is a weaker story. Contentlayer, the tool that used to fill this gap, is abandoned, so the content pipeline becomes a choice between a replacement library and hand rolling it. Astro has this built in.
- More client side JavaScript by default for pages that are, in substance, documents.

### Option 3: Next.js on Vercel's Hobby plan

The conventional default: Next.js on the platform built for it, with DNS pointed from Cloudflare.

**Pros**

- The smoothest possible build and preview experience for Next.js, with essentially no configuration.
- Full Next.js features available without an adapter.
- Generous free bandwidth and request allowances.

**Cons**

- The Hobby plan is for personal and non commercial use. This site exists to win paid contract work, which makes that boundary a question you would rather not have hanging over your only professional web presence.
- Splits DNS at Cloudflare from hosting at Vercel, adding a seam and a second dashboard.
- Puts the site on a platform with a commercial interest in your growth, where the free tier terms are the thing most likely to change under you.

### Option 4: Astro on GitHub Pages

The same framework, published by GitHub for free.

**Pros**

- Free, unlimited for static content, and about as simple as hosting gets.
- Deployment from the repository is a solved, well documented path.
- No vendor relationship beyond the one you already have.

**Cons**

- Runs no server side code at all, so the contact form must go through a third party form service. That pre decides feature 11 in a way that is awkward to undo, and adds a dependency outside your control to the site's single conversion point.
- You would still manage DNS at Cloudflare while hosting sits at GitHub, for no gain over option 1.
- No request level control, so redirects and headers are more limited.

## Rationale

The cost constraint did most of the work, but not in the way it first appears. Every option here can be free; what separates them is whether free is *structural* or *conditional*. On Cloudflare, static file requests are not metered at all, so the site cannot generate a bill no matter how a shared link performs. On Vercel's Hobby plan, free is conditional on the use being non commercial, and this site's explicit purpose is winning paid work. For a constraint the scope demands be *confirmed* rather than hoped for, structural beats conditional, and that is what ruled out option 3 despite it being the most comfortable developer experience on offer.

Your domain being at Cloudflare then settled hosting almost by itself. Workers refuses any domain whose nameservers it does not manage, which would have been a blocker on a domain whose authoritative DNS sat elsewhere and is instead a free advantage here: one account holds the DNS, the certificate and the host, and the registration too. The requirement is specifically about authoritative DNS rather than about the registrar, so a domain registered elsewhere but using Cloudflare nameservers would also have been fine. Option 4 would have meant keeping DNS at Cloudflare anyway while giving up server side code entirely, which is the worst of both. Giving up server side code is not abstract: the scope flags the contact form as the one feature that can fail silently and lose you work, so a foundation that forces it onto a third party service is a foundation that weakens the site's single conversion point. To be precise about what this buys, since it is easy to overstate: it keeps a same origin handler **available and free to execute**. It does not establish that delivering the message to your inbox is free or reliable, which is a separate question feature 11 has to answer either way.

Framework was the only genuinely close call, because you know both and team capability therefore eliminated nothing. Astro wins on two specific forces from Context rather than on general merit. First, content is Markdown in the repository, and Astro validates that Markdown against a schema when the site builds, so a write up missing a field fails the build instead of rendering a gap in front of a hiring manager; the equivalent on Next.js now means picking a replacement for the abandoned Contentlayer or hand rolling it, which is work spent on a problem Astro does not have. Second, the two week target rewards shipping documents as documents. I will name the cost plainly, since it is the one place where the right technical answer is not the right career answer: **Next.js carries more hiring signal, and choosing Astro means this repository demonstrates a smaller slice of the market's default stack.** If that matters more to you than the content pipeline, option 2 is a defensible choice and I would not argue hard against it. You have both skills; this spec does not take one away.

TypeScript strict, Tailwind, build time images and npm are all the boring choice in their category, which is the point. Each is cheap now and expensive to retrofit, none requires anything to be running, and none needs an account. Workers Builds is the one place I accepted a less proven component, because the alternative, a GitHub Actions workflow, means creating and storing a Cloudflare API token to achieve the same deploy on push the scope requires. One open beta build service inside the account you already trust is a smaller risk than a long lived credential in a second system, and the fallback is a contained swap if it disappoints.

## Evidence: landscape and free tier scan, 2026-10-13

A single web landscape check ran during the design conversation, because this decision turns on free tier terms that change and on which products are current. Its findings were then re verified against vendor documentation, which materially changed the result: the initial summary leaned on third party blog posts, dated its own version numbers inconsistently, and would have led to Cloudflare Pages, the path Cloudflare has since moved away from.

**Verified against Cloudflare's own documentation**

- "If you are starting a new project, use Workers instead of Pages. Pages continues to work, but new features and optimizations are focused on Workers." Also: "For a purely static site, point `assets.directory` at your build output. No Worker script is needed."
- Static asset requests are free and unlimited on both free and paid plans. The free plan's 100,000 requests a day applies to Worker invocations.
- "Unlike Pages, Workers does not support any domain whose nameservers are not managed by Cloudflare."
- Workers free plan static asset limits: 20,000 files per version, 25 MiB per file. Cloudflare Pages free plan: 500 deploys a month.
- Cloudflare publishes a current Astro framework guide for Workers, last updated 2026-10-12, including the purely static configuration used in this spec.
- Workers Builds was still described as an open beta in Cloudflare's August 2025 changelog, which also confirms the free plan is supported.

**Reported by third party sources only, treated as weaker**

- Vercel's Hobby plan remains restricted to personal and non commercial use.
- Netlify moved its free plan to a credit model in September 2025, worth materially less bandwidth than before.
- Contentlayer is abandoned, with live alternatives being Velite and `next-mdx-remote`.

**Not verified, recorded as open**

- The exact free build minute allowance for Workers Builds.
- Whether GitHub Pages documents plain domain support explicitly.
- The current TypeScript release number, and whether Resend or Formspree require a payment card. Neither bears on this decision; both belong to feature 11.

The raw scan output is kept at `docs/.agent-cache/research/stack-architecture.md`.

## References

**Project sources** (verifiable, in this repo)

- `docs/scope/scope.md`: the zero running cost constraint, the two week target, the owned domain, the Skateboard build approach, and feature 1's `Beta` tier.
- Your answers across the three rounds of the design conversation, which fixed the framework, hosting, language, styling, content authoring, deployment, images and package manager.

**Practices and standards**

- Boring and proven technology over new and exciting, absent a constraint the boring choice cannot meet.
- Pre render anything that does not change per request; serving a file is the cheapest and most reliable thing a web host does.
- Buy no infrastructure against a problem you have not measured. Here that means no database, no cache, no queue, no search engine.
- Pin runtime compatibility explicitly, so a platform change cannot alter behaviour without a deliberate update.
- Prefer a structural guarantee to a conditional allowance when a constraint has to be confirmed rather than hoped for.

**Links** (web verified during the design conversation's landscape check; not fetched again at write time)

- Cloudflare, Workers best practices, start new projects with Workers: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Cloudflare, migrate from Pages to Workers, including the custom domain nameserver requirement: https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/
- Cloudflare, Workers platform limits, free plan and static asset limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare, Pages Functions pricing, static asset requests free and unlimited: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare, Astro on Workers framework guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
- Cloudflare, Workers static assets, get started: https://developers.cloudflare.com/workers/static-assets/get-started/
- Cloudflare, Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/
- Astro, content collections: https://docs.astro.build/en/guides/content-collections/
