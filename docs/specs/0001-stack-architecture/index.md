# 0001. Astro static site on Cloudflare Workers

**Date**: 2026-10-13
**Status**: In Progress

## Summary

The site will be built with Astro (a web framework made for content heavy sites) and published as plain static files on Cloudflare Workers, using the domain `toyintest.org` that you already own. Write ups live as Markdown files in this repository with a type checked schema, so a malformed write up fails the build instead of rendering a blank page. Every push to the main branch rebuilds and redeploys itself. Serving the site costs nothing at any traffic volume, because Cloudflare does not charge for static file requests. Be careful about how far that claim stretches: it covers **delivery**, not the whole system. The build service allowance and any later server side code have their own quotas, and those are not yet confirmed, so "zero cost" is established for serving the site and still open for building and deploying it.

## Decision

**Chosen option**: Option 1: Astro static site on Cloudflare Workers with static assets.

Build the site as a fully pre rendered Astro project, write content as Markdown in typed Astro content collections, style it with Tailwind, and deploy the built output to Cloudflare Workers as static assets served from the plain domain `toyintest.org`.

Two properties of this choice are load bearing and were verified against Cloudflare's own documentation rather than assumed:

- A purely static Astro site needs **no Cloudflare adapter and no Worker script**. The deployment configuration is a name, a compatibility date, and a pointer to the build output (basis: Cloudflare Workers best practices, "For a purely static site, point `assets.directory` at your build output. No Worker script is needed.").
- **Static asset requests are free and unlimited.** The Workers free plan limit of 100,000 requests a day applies to Worker script invocations, not to serving files (basis: Cloudflare Workers and Pages pricing, static asset requests). The accurate conclusion is narrower than it first looks: **serving** this site cannot generate a bill. Building and deploying it run through a separate allowance that this spec has not confirmed, and a later server side function carries its own quota. Note also the failure mode those quotas actually produce: exhausting a build allowance stops you shipping updates, it does not start charging you, and the already published files keep serving. Treat a quota failure and a charge as different risks.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript, strict | Catches a mistyped content field or page prop at build time, when it is free to fix. Strict mode costs minutes now and is painful to retrofit later (basis: your answer, round 2). |
| Framework | Astro, fully pre rendered | Purpose built for content sites. Ships almost no JavaScript by default, so speed needs no later effort, and it accepts React components where real interactivity is wanted (basis: your answer, round 2; Astro is framework agnostic per Cloudflare's Astro guide). |
| Content | Astro content collections, Markdown in the repository | Gives the Markdown a schema that is validated when the site builds. Nothing to pay for, nothing to keep running, every edit versioned beside the code (basis: your answer, round 1). |
| Styling | Tailwind CSS | Makes the design system in feature 4 expressible as a small set of tokens, and makes the light and dark theme close to free rather than a retrofit (basis: your answer, round 2). |
| Images | Astro's built in image handling | Resizes, converts to modern formats, and sets intrinsic dimensions at build time. The one option that is both free and automatic (basis: your answer, round 3). |
| Hosting | Cloudflare Workers with static assets | Free and unbounded for static files, and Cloudflare's documented path for new projects (basis: Cloudflare Workers best practices, "If you are starting a new project, use Workers instead of Pages."). |
| Domain and DNS | `toyintest.org`, plain domain, nameservers at Cloudflare | Already yours and already on Cloudflare, which Workers requires: "Workers does not support any domain whose nameservers are not managed by Cloudflare." Automatic HTTPS is included (basis: Cloudflare migrate from Pages guide, custom domains). |
| Deployment | Workers Builds, building on push to `main` | Satisfies the scope's requirement that a push rebuilds and redeploys, with no API token to store anywhere. Supported on the free plan (basis: your answer, round 3). |
| Package manager | npm | Ships with Node, so nothing extra has to exist on any machine or in any build container, and it is the path Cloudflare's own documentation leads with (basis: your answer, round 3). |
| Observability | None at the static stage; enable Workers observability when the first Worker script is added | There is nothing to observe while no server side code runs. Logging becomes meaningful at the contact form, where failure is silent and therefore dangerous. |

**Layers deliberately absent.** There is no database, no authentication, no background job runner, no object storage and no search engine, because nothing in the scope needs one: the content lives in the repository, there are no user accounts, and sixteen pages do not need a search index. Adding any of them would be infrastructure bought against a problem this site does not have.

## Deployment identity

The names and identifiers the build and the deploy both depend on. Recording them here is the point: without them the builder has to invent them, and a Workers Builds target that disagrees with the Wrangler name deploys to the wrong place.

| Thing | Value | How it is known |
|---|---|---|
| Worker name | `og-website` | Chosen to match the repository name. Verified not already taken: the account's existing Workers are `invoice2-email-worker` and `n8n`. |
| Workers Builds target | `og-website` | Must equal the Wrangler `name` above. They are two separate settings and nothing stops them drifting apart. |
| Git repository | `github.com/toyinogun/og-website`, branch `main` | Confirmed from the repository's own `origin` remote. |
| Production origin | `https://toyintest.org` | Your answer: the plain domain, no `www`. |
| Cloudflare account | **Open.** An account is reachable and holds the two Workers named above, but its identifier is not recorded here. | To be read from the dashboard and recorded during this feature. Never record a token or key, only identifiers. |
| Who performs the dashboard steps | You, or an agent acting with Cloudflare access you have granted | Connecting a Git repository to a Cloudflare account and attaching a domain are authorization actions, not build steps. |

**Store no credentials anywhere in this repository or in an issue.** Workers Builds exists partly so that no long lived API token is needed; that advantage is lost the moment one is pasted somewhere.

## Build and deployment contract

The scaffold path is Cloudflare's `create-cloudflare` CLI with the Astro framework flag. `/develop` derives the actual steps, but these values are decided here rather than at build time:

| Setting | Value | Why |
|---|---|---|
| Project root | the repository root | Single project, not a monorepo. |
| Install command | `npm ci` | Reproducible from the lockfile. Requires `package-lock.json` committed, which it must be. |
| Build command | `astro check && astro build` | The load bearing one. Strict TypeScript in a config file proves nothing on its own; this makes the type check an actual gate that fails the deploy. Without it the promised build time guarantee does not exist. |
| Deploy command | `wrangler deploy` | After a successful build. |
| Local dependencies | `wrangler` and the `astro check` checker in the project's own dev dependencies | Not fetched from the network mid build. A build that reaches out for its own tooling fails in a way that is tedious to diagnose. |
| Runtime adapter | **none** while the site is static | Do not install `@astrojs/cloudflare`. Adding it is what turns free static requests into metered invocations. |
| Node version | the current Node LTS, pinned at scaffold time in `.nvmrc` and in the Workers Builds setting | Both places, or local and remote builds diverge. |
| Resolved versions | record what the scaffold actually resolves for Node, Astro, Tailwind and TypeScript | Deliberately not pinned in advance: the landscape check's version numbers proved unreliable, so a real resolved value beats a confident guess. |

The Wrangler configuration for a purely static build, in full:

```jsonc
{
  "name": "og-website",
  "compatibility_date": "<the scaffold date>",
  "assets": { "directory": "./dist" }
}
```

## Domain attachment

- **Attach the apex `toyintest.org` as a Custom Domain** on the `og-website` Worker, through the Cloudflare dashboard for the first attachment. It is a one time authorization action on the account, so it does not belong in a build script.
- **Set Astro's `site` to `https://toyintest.org`** in the production config. Canonical URLs, the sitemap and share cards in feature 12 all read from it, and a wrong or missing value there is the kind of mistake that ships silently.
- **Inspect the zone's existing DNS records before adding anything.** This account is in active use, so assume records already exist and do not blindly replace them.
- **For `www`**: a proxied DNS record for `www` must exist for a request to reach a redirect rule at all. Only then does a redirect rule apply. Make it a permanent redirect to `https://toyintest.org`, preserving path and query, so a shared deep link does not land on the home page.
- **Keep the site fully pre rendered.** On demand rendering is available but buys nothing here and would convert free static requests into metered Worker invocations.
- **Set `compatibility_date` to the scaffold date** and leave it there, as Cloudflare instructs, so a future platform change cannot alter the site without a deliberate update.

## Consequences

**Positive**

- **Serving** the site costs nothing however much traffic it gets, because static asset requests are not metered. Note the boundary, which is narrower than it sounds: this covers delivery of already published files, not building and deploying them, and not any later server side code.
- Nothing is running to break, patch, or get compromised while the site is purely static.
- The content schema makes a malformed write up a failed build rather than a broken page in front of a hiring manager.
- The contact form in feature 11 can **run** on your own domain: Cloudflare documents adding a `main` entry point plus an `ASSETS` binding to serve an API alongside static files, and executing that handler is free within the Workers free allowance. What is **not** established here is free end to end delivery of the message to your inbox. Running code that accepts a form post is not the same as a message reliably reaching you, which is what the scope actually requires. No delivery path, provider, allowance or recipient restriction has been confirmed, and feature 11 owns that decision. One constraint to carry into it: ordinary static requests must stay outside script execution, so adding an API endpoint does not put the whole site behind an invocation quota.
- Your domain already being at Cloudflare removes DNS as a separate moving part.

**Negative and tradeoffs**

- **Workers Builds was last observed labelled open beta**, in Cloudflare's changelog of August 2025. That is the evidence this spec actually has, and a year old label does not establish today's status, so treat it as last observed rather than current. It is load bearing here, since it is how the site deploys. If it proves unreliable the fallback is GitHub Actions running `wrangler deploy`, which is a contained swap, but it would cost you an afternoon and introduce an API token to manage.
- **I could not verify the exact free build minute allowance for Workers Builds**, only that the free plan is supported. A very chatty commit habit could in principle meet a limit I cannot quote.
- **Astro is the less transferable skill.** You know React and Next.js too, and Next.js carries more hiring signal. Choosing Astro means this particular repository demonstrates a smaller slice of the market's default stack.
- **Bindings are not available from a purely static Astro build.** The contact form handler will therefore be a small separate Worker route, not an Astro page, which is a slightly different mental model from the rest of the site.
- **The Cloudflare account is shared with other work.** It already runs two unrelated Workers, `invoice2-email-worker` and `n8n`. The free plan's daily request allowance is counted per account, not per Worker, so a future contact form endpoint competes for the same allowance as those. It does not affect the static site, whose requests are not counted at all, but it does mean feature 11 cannot treat the invocation allowance as if this site were the only thing using it. Confirm the account's current plan and usage before relying on headroom.
- **Workers requires Cloudflare to be the authoritative DNS for the zone.** Pointing `toyintest.org` at another DNS provider later would break the custom domain and force a hosting change. Note the distinction, because they are easy to conflate and only one of them matters: the dependency is on **authoritative DNS**, not on who the domain is registered with. Transferring the registration elsewhere while leaving Cloudflare as the nameservers would not break this. This is a real lock in to Cloudflare DNS, accepted knowingly.
- Tailwind adds a build dependency and busy looking markup.

**Neutral**

- Markdown authoring means editing text files, in an editor or in GitHub's web interface, rather than a friendly admin screen. You chose this knowingly in round 1.
- Cloudflare Pages remains a working product; this decision simply does not start on the path Cloudflare is moving away from.
- No automated test tooling is chosen here; that belongs to feature 2 and to the Engineer's own test step.

## Follow-up

- [ ] **Confirm the cost before feature 1 is called done, not after.** The scope makes confirmed free hosting a condition of *this* feature, so it cannot wait for feature 5. Read from the Cloudflare dashboard and record here: the account identifier, the account's current plan, the Workers Builds allowance and what happens when it is exhausted, and whether any paid service is already active on the account. No deployment is needed to establish any of that. Record identifiers only, never a credential.
- [ ] Confirm the **current** status of Workers Builds while doing the above, including whether it is still open beta. This spec's only evidence is a changelog from August 2025, which does not establish today's position.
- [ ] Decide the test tooling. Deliberately out of scope here; it belongs with feature 2 (coding standards and tooling) and the Engineer's test step.
- [ ] Feature 3 (content model) designs the actual Astro content collection schema. This spec fixes only that content is typed Markdown in the repository, not what fields a project write up has.
- [ ] Feature 4 (design system) owns type, colour, spacing and the light and dark theme. This spec fixes only the styling mechanism.
- [ ] Import the two adopted Agent Skills, both official Cloudflare ones: `cloudflare/skills` **wrangler** (the deployment CLI) and `cloudflare/skills` **workers-best-practices** (the hosting target's conventions). Paperclip manages skills in the company library, so these are imported under Skills, Sources rather than installed into this repository. Once imported, record them in the `## Decision` **Implementation skills** field here and in the `## Agent skills` section of root `AGENTS.md`.
- [ ] Recommend the **Astro documentation MCP server** for configuration in Paperclip. It gives an agent live access to current Astro documentation rather than training data, which matters because Astro moves quickly and content collections have changed shape before. Record it on the `MCP servers:` line of root `AGENTS.md` once connected.
- [ ] Record these as declined in root `AGENTS.md` so no later stage offers them again: `astrolicious/agent-skills` astro, `wshobson/agents` tailwind-design-system, `morinokami/astro-mcp`, and a Tailwind utilities MCP server. Also already connected and therefore never to be offered again: the Cloudflare documentation MCP server.
- [ ] Root `AGENTS.md` does not exist yet. Feature 2's `/audit` should capture the real conventions from the scaffolded project, including the Astro, Tailwind and TypeScript rules this decision implies.

## Rationale

Reasoning, the options weighed, and the evidence behind the cost and hosting claims: see [rationale.md](rationale.md).
