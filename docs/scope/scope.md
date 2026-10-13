# Scope: Toyin Ogunseinde personal website

A personal site whose job is to win work. It serves two readers at once, the person deciding whether to hire you and the person deciding whether to contract you, and both want the same thing: real work, clearly explained, with an easy way to start a conversation.

**Build approach:** Skateboard (ship the thinnest usable whole site, then grow it).
**Workflow:** Alpha (after `/develop`, run `/check verify` on the real running site). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· Beta`) to do more or less.

**Constraints you set:** something presentable in about two weeks, running cost at or near zero, and a domain you already own (which one is still to be confirmed, see feature 5).

**How content gets written:** the bio and project write ups get drafted from your resume and your repositories, then you edit them. You keep the final say on every word, and the build never waits on a blank page.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | in-progress |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Content model | Foundation | planned |
| 4 | Design system & UI foundation | Foundation | planned |
| 5 | Live on your domain | Foundation | planned |
| 6 | Bio & project write ups | Release 1 | planned |
| 7 | Home page | Release 1 | planned |
| 8 | Work listing | Release 1 | planned |
| 9 | Project detail page | Release 1 | planned |
| 10 | About page | Release 1 | planned |
| 11 | Contact form | Release 1 | planned |
| 12 | Search metadata & share cards | Release 1 | planned |
| 13 | Services & how you work | Release 2 | planned |
| 14 | Testimonials | Release 2 | planned |
| 15 | Blog | Release 3 | planned |
| 16 | Newsletter signup | Release 3 | planned |

## Foundations

### 1. Stack & architecture · Beta
Decide the framework, language, hosting and content tooling, then scaffold a runnable project. This is the one place tools and providers get chosen, and your zero running cost constraint binds here.
**Done when:** the stack and the hosting choice are recorded in a spec, the scaffold boots locally, the production build passes, and the hosting choice is confirmed to cost nothing at this traffic level.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop scaffold`
- [ ] Confirm the hosting cost is zero: record the account, plan, Workers Builds allowance and exhaustion behaviour from the Cloudflare dashboard, into spec 1's Follow-up
- [ ] Verify it: `/check verify scaffold`
- [ ] Test it: `/test scaffold`

spec [0001](../specs/0001-stack-architecture/index.md) · decided: Astro static on Cloudflare Workers, TypeScript strict, Tailwind, Markdown content collections, Workers Builds · code in the repository root (`astro.config.mjs`, `wrangler.jsonc`, `tsconfig.json`, `src/`)

### 2. Coding standards & tooling
Capture the conventions and tooling choices from the real scaffolded project, then install them. Doing this early means every later page is written to the same rules.
**Done when:** root `AGENTS.md` reflects the real stack and conventions, and lint, format and the type check all run clean.
- [ ] Capture conventions and tooling choices: `/audit`
- [ ] Install the tooling: `/develop tooling`

### 3. Content model · needs a decision
The shape of a project entry and the structure of a case study: what a write up contains, in what order, and which fields the pages can rely on. This is the data model of a content site, and it is the most expensive thing here to get wrong, because changing it later means rewriting every write up and every page that reads one.
**Done when:** the fields of a project entry are fixed and written down, a case study has a defined structure that works for a hiring reader and a client reader, and the model covers images, links, tags and ordering without a later rewrite.
- [ ] Design it (spec): `/architect content model`

### 4. Design system & UI foundation · needs a decision
The visual language, layout primitives and base components, including the light and dark theme you asked for. Theme belongs here rather than in its own feature, because building it into the components costs very little and retrofitting it means rebuilding them.
**Done when:** `design.md` covers type, colour, spacing and the base components, light and dark both work, and the components handle focus and keyboard use.
- [ ] Design it (spec): `/architect design system & UI foundation`

### 5. Live on your domain
Get one real page deployed on the domain you own, with the build running automatically. This is the thin end to end slice that proves the stack, the host and the domain all work together, and doing it now means launch day is not the first time you find out.
**Done when:** a real page is reachable on your domain over HTTPS, a push rebuilds and redeploys it, and the running cost is still zero.
- [ ] Build it: `/develop live on your domain`
- [ ] Verify it: `/check verify live on your domain`

Open detail: tell the Engineer which domain you own when this one starts.

## Release 1: the thinnest usable whole site

The smallest site a real visitor would actually use and you would actually hand out: they land, understand who you are, see proof of your work, and can reach you. Four pages, finished. This is what the two weeks is for.

### 6. Bio & project write ups
The actual words. A bio, and a write up for each project worth showing. This sits first in the release because it is the critical path: everything on the work page and the home page is waiting on this text, and your editing pass has to fit in the two weeks too.
**Done when:** a bio exists in your voice, each featured project has a complete write up matching the content model, you have edited and approved all of it, and the images you already have are in place.
- [ ] Build it: `/develop bio & project write ups`
- [ ] Verify it: `/check verify bio & project write ups`

### 7. Home page · needs a decision
The page that decides whether a visitor keeps reading. It says who you are, what you do, shows a taste of the proof, and points at one clear next step. It also sets the page patterns the rest of the site follows.
**Done when:** a first time visitor can tell within seconds what you do and who for, the strongest work is visible without scrolling far, there is one obvious call to action, the page works on a phone, and it carries its own title, description and share card.
- [ ] Design it (spec): `/architect home page`

### 8. Work listing
The index of your work. This is the page both of your readers go to first to judge you, so it has to make each project easy to scan and easy to open.
**Done when:** every featured project appears with a title, a one line outcome and an image, the order is deliberate rather than accidental, the empty and loading states look intentional, it works on a phone, and it carries its own title, description and share card.
- [ ] Build it: `/develop work listing`
- [ ] Verify it: `/check verify work listing`

### 9. Project detail page
The case study itself, built on the structure decided in the content model. This is where a reader finds out how you think, which is the thing a resume cannot show.
**Done when:** each project renders its full write up with images and links to live work or code, the structure reads well for both a hiring reader and a client reader, it works on a phone, and each page carries its own title, description and share card.
- [ ] Build it: `/develop project detail page`
- [ ] Verify it: `/check verify project detail page`

### 10. About page
The longer version of who you are, plus the resume download. The resume is cheap to add here and uses content you already have, so it does not need its own feature.
**Done when:** the page tells your story in your voice, the resume downloads correctly, your links out are present, it works on a phone, and it carries its own title, description and share card.
- [ ] Build it: `/develop about page`
- [ ] Verify it: `/check verify about page`

### 11. Contact form · needs a decision · Beta
The point of the whole site. A visitor sends you a message without leaving the page. Tagged for extra rigor because it is the one feature that can fail silently: a broken form loses you work and says nothing, and it is also the only place the site handles someone else's personal data.
**Done when:** a submitted message reliably reaches you, the sender sees a clear success or failure, bad input and spam are handled, the form is usable by keyboard, and a delivery failure is visible rather than silent.
- [ ] Design it (spec): `/architect contact form`

### 12. Search metadata & share cards · needs a decision
So your name finds your site, and so a pasted link looks deliberate rather than broken. You will share this link a lot, in applications and in messages, and the preview is often the first thing anyone sees of your work.
**Done when:** every page has a title and description, a sitemap exists, structured data describes you as a person, and pasting any page link into a message shows a correct title, description and image.
- [ ] Design it (spec): `/architect search metadata & share cards`

## Release 2: make the case stronger

The site is already live and usable at this point. These two make it more persuasive, especially for the contracting half of your audience.

### 13. Services & how you work · needs a decision
What you offer and how an engagement actually runs. This needs a real decision from you about rates and engagement models before it can be built, which is why it is flagged.
**Done when:** a prospective client can tell what you offer, roughly what it costs or how pricing works, and what working with you looks like.
- [ ] Design it (spec): `/architect services & how you work`

### 14. Testimonials
Other people vouching for you, which persuades in a way your own words cannot. Worth knowing the build is the easy half here: collecting the quotes is on you and depends on other people replying.
**Done when:** real quotes are displayed with attribution, and the section looks intentional rather than sparse when there are only one or two.
- [ ] Build it: `/develop testimonials`
- [ ] Verify it: `/check verify testimonials`

## Release 3: publishing

Only worth starting when you actually intend to publish. You have no posts written yet, so these would ship empty today, which is why they sit last.

### 15. Blog · needs a decision
A place to publish writing. The decision is the authoring and publishing pipeline, which is a real choice and not just a page.
**Done when:** you can write and publish a post without touching unfamiliar machinery, posts list and read well, and each post carries its own metadata and share card.
- [ ] Design it (spec): `/architect blog`

### 16. Newsletter signup · needs a decision
Collecting email addresses so you can send something later. Flagged because it means storing other people's personal data, which pulls in a provider choice and a consent decision. Only build this if you genuinely intend to send a newsletter, otherwise it is a dead form.
**Done when:** a visitor can subscribe and gets confirmation, addresses are stored somewhere you control, and unsubscribing works.
- [ ] Design it (spec): `/architect newsletter signup`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest. The first four are things you chose not to include; they are listed here with the consequence so the choice stays visible rather than quietly disappearing.
- **Visitor analytics**: without it there is no way to tell whether anyone reaches the contact form, which is the one number that says whether this site is doing its job · needs a decision
- **Privacy note**: the contact form, and later the newsletter, collect names, email addresses and messages, so a short privacy note is the honest minimum once you are storing someone's email · needs a decision
- **Accessibility target**: not committing to one means the base components get built without it, and adding it later means rebuilding them
- **Speed target**: no stated Core Web Vitals number, so speed stays a hope rather than a constraint
- **Error monitoring**: nothing will tell you when the contact form starts failing silently · needs a decision
- **Editing content without code**: a real convenience later, but a significant decision and cost for a site whose content changes a few times a year · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+) |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is**; `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; at `Alpha` the suggested point to call it done is after `/check verify` |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Workflow tier tag** beside a heading (e.g. `· Beta`) sets that one feature's rigor above or below the project default; no tag inherits `Alpha`.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Alpha** = `/check verify` on the real running site.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
