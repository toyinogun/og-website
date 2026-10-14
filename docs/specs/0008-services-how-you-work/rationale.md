# 0008. Services and how you work: rationale

## Context

Services and how you work is scope feature 13, the first of Release 2 ("make the case stronger"). It is done when a prospective client can tell what you offer, roughly what it costs or how pricing works, and what working with you looks like. The scope flagged it because it needs your own decisions on rates and engagement models, which no amount of code reading can supply.

Facts that shape it:

- The site serves two readers at once. The client half needs offers, process and price; the hiring half reads the same page, so whatever it says about money is also read by employers.
- Projects already carry a `services` list from a fixed vocabulary of eight work types (`SERVICES` in `src/lib/vocabulary.ts`, spec 0002). Today every project carries `security`, and the eight keys spread unevenly: infrastructure and observability on one project each, backend on two.
- Every page is built from the same parts (`PageIntro`, `Section`, `CallToAction`, `BaseLayout`, spec 0004), keeps its words in one constant with a length test, and gets share tags and a sitemap entry for free (spec 0007).
- Pages show projects only through `ProjectCard` (spec 0004), and link to a project only through `projectPath` (feature 9).
- The header holds four links today, on one row from 640 pixels.

Decided by you in this run's question round (2026-10-14): its own `/services` page with a `Services` nav link; offers grouped over the vocabulary with projects as proof; five offers (Kubernetes platforms as code, delivery pipelines and GitOps, monitoring and alerting, security reviews and hardening, backend services and internal tools); a "Seen in" line of project name links; pricing as how it works, with no figures; a day rate and a fixed price; the five engagement steps; remote for Netherlands and EU clients, a few projects at a time; the order offers, steps, pricing; `CallToAction` unchanged; design from `design.md`; no references.

## Options considered

### Option 1: A `/services` page, offers grouped over the vocabulary, derived proof links

A new page with five offers, each naming the `SERVICES` keys it covers; the proof under each offer is computed from the write ups at build time.

**Pros**:
- The offer and its evidence stay in step without hand editing.
- A new vocabulary key cannot slip in unplaced: the test fails until it joins an offer.
- One address to send a client; no other page grows.

**Cons**:
- A fifth nav link, which may push the header to two rows on small tablets.
- The proof line is only as varied as your tagging; today it repeats.

### Option 2: A section on the home page

The offers, steps and pricing as one more home section.

**Pros**:
- No new route, no nav change; every visitor scrolls past it.

**Cons**:
- The home page's job is "who you are, within seconds" (spec 0004); three more blocks blur it, and the hiring reader must scroll past pricing to reach your story.
- No single address to send a client.

### Option 3: One offer per vocabulary key, shown with project cards

Eight offers mapped one to one onto `SERVICES`, each with `ProjectCard`s.

**Pros**:
- Mechanical: no grouping to maintain, and it reuses the card as spec 0004 intends.

**Cons**:
- Eight offers, several of which (frontend, API design) are not what you sell, dilute the pitch.
- The same cards repeat under many offers (security is on every project), making a long page of duplicates.

## Rationale

Option 1 fits the forces best. The two reader problem is the deciding force for placement: a separate page lets the client half get offers, process and price in one place while the home page keeps its seconds long job for both readers. The vocabulary already exists to describe work from the client's point of view, so grouping it into offers costs one typed list and gives the page proof that maintains itself; Option 3 uses the same tie but at a granularity that matches the schema rather than how you sell. Name links instead of cards keep a five offer page short and avoid repeating the same card, at the cost of one stated exception to the "projects only through `ProjectCard`" rule; the exception is narrow (a title and an address, nothing more).

Pricing without figures meets the Done when through "how pricing works", never goes stale, and avoids giving employers a public anchor. The cost is some enquiries from clients who cannot afford you, which the free call filters.

Settled here rather than asked, as small implementation calls:
- **Proof cap of 3**, in work order: enough to show range, short enough to scan; the runner up was showing all matches, which puts four links under security today.
- **Full titles as link text**: the content model has no short name, and adding one changes spec 0002 and every write up; the runner up was the outcome line, which reads as a sentence, not a name.
- **Every vocabulary key in exactly one offer**: stops silent gaps and double listing; the runner up, "at most one", would let a new key go unplaced.
- **No digits or currency signs in pricing words**, enforced by the test, so the no figures decision cannot erode by accident.
- **Reading column (`measure`) width**: the page is mostly text, like About; the runner up was page width with a two column offer grid, which leaves the fifth offer alone on a row.
- **Header fallback** from `sm` to `md` only if five links do not fit at 640 pixels; the runner up, shorter labels, would rename links on every page.
- **No Service structured data**: there is no rich result for it, and spec 0007 keeps JSON-LD on the home page only.
