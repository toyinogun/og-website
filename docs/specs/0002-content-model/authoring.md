# Writing a project entry

_The authoring guide for spec 0002. Follow it when you add a project to the site (feature 6). The build checks every rule here, so if you break one, `npm run build` stops and names the file, the rule and what to fix._

## 1. Start from the example

1. Copy the folder `src/content/projects/example-project/` and rename the copy. The folder name becomes the page address: `my-new-project` is served at `/projects/my-new-project`.
   - Use lowercase letters, digits and single dashes between words (`^[a-z0-9]+(-[a-z0-9]+)*$`). `My_Project` or `my--project` fails the build.
   - Renaming a folder later changes the address and breaks links people already shared. Pick the name once.
2. Replace `cover.png` with your own cover and swap `screenshot.png` for your own images (or delete it).
3. Edit `index.md`: the frontmatter at the top, then the case study body.
4. Keep `draft: true` while you write. Remove it, or set it to `false`, when the write up is ready to publish.

**The first real entry replaces the example.** Delete `example-project/` when your first real project lands. That also frees `order: 1`, since no two entries may share an order.

## 2. Every field, with an example

The frontmatter has 19 fields. Text is trimmed before its length is checked, so text that is only spaces counts as empty. Any key that is not listed here fails the build, even a typo like `teem:` or `client: { nmae: … }`.

| Field | Required | Rule | Example |
|---|---|---|---|
| `title` | yes | 1 to 80 characters | `title: Booking flow rebuild` |
| `summary` | yes | 1 to 160 characters, one sentence on what the project is. Used as the search description and the share card text. | `summary: A rebuild of the booking flow for a clinic chain.` |
| `outcome` | yes | 1 to 120 characters, the one line result | `outcome: Cut booking drop off by a third.` |
| `kind` | yes | one of `client`, `employer`, `personal`, `open-source` | `kind: client` |
| `client.name` | no | 1 to 60 characters. Leave it out for confidential work. | `name: Acme Health` |
| `client.description` | yes, for every kind | 1 to 80 characters, who the work was for | `description: A clinic chain with 40 sites` |
| `role` | yes | 1 to 80 characters | `role: Lead frontend engineer` |
| `team` | no | 1 to 80 characters | `team: Two engineers and a designer` |
| `start` | yes | a month written `YYYY-MM`, in quotes | `start: '2024-03'` |
| `end` | no | a month written `YYYY-MM`, in quotes, the same month as `start` or later. Leave it out for ongoing work. | `end: '2025-01'` |
| `stack` | yes | a list of at least one key from `STACK`, no repeats | `stack: [typescript, astro]` |
| `services` | yes | a list of at least one key from `SERVICES`, no repeats | `services: [frontend]` |
| `cover` | yes | exactly `./cover.png`, `./cover.jpg`, `./cover.jpeg` or `./cover.webp` | `cover: ./cover.jpg` |
| `coverAlt` | yes | 1 to 160 characters, what the cover shows | `coverAlt: The new booking screen on a phone` |
| `metrics` | no, default none | at most 3, each `value` 1 to 12 characters and `label` 1 to 40 | see below |
| `links` | no, default none | each `kind` from `LINK_KINDS`, `url` starting `https://`, optional `label` 1 to 40 characters | see below |
| `order` | yes | a whole number, 1 or more, unique across every entry, drafts included | `order: 20` |
| `featured` | no, default `false` | `true` shows it on the home page | `featured: true` |
| `draft` | no, default `false` | `true` hides it from the production site | `draft: true` |

Metrics and links look like this:

```yaml
client:
  name: Acme Health
  description: A clinic chain with 40 sites
metrics:
  - value: '32%'
    label: fewer abandoned bookings
links:
  - kind: live
    url: https://acme.example
  - kind: code
    url: https://github.com/you/repo
    label: Read the source
```

A link with no `label` shows the default name for its kind: `live` is "Live site", `code` is "Code", `app-store` is "App Store", `video` is "Video", `article` is "Article".

**Tip on `order`:** leave gaps (10, 20, 30) so you can slot a project in later without renumbering the rest. Lowest shows first.

## 3. The case study body

Plain Markdown (no MDX) under three required sections, in this order:

```markdown
## Problem
What was wrong or missing, and for whom.

## Approach
What you did and why, including the choices you rejected.

## Outcome
What changed, with the evidence.
```

Rules for a published entry (a draft skips these, so you can write in any order while it is a draft):

- The body starts with `## Problem`. Nothing comes before it, not even an intro paragraph.
- `## Problem`, `## Approach` and `## Outcome` each appear exactly once, in that order. The names are exact and case sensitive.
- Each of the three has some content (a paragraph, a list, an image) before the next `##` heading. A sub heading on its own does not count.
- You may add your own `##` sections anywhere after `## Problem`, for example `## Architecture` or `## What I would do differently`. `###` and deeper headings are free.
- No level one heading at all, neither `# Title` nor a title underlined with `===`. The page already shows `title`.
- Headings inside quotes, lists or code blocks are ignored, so they never count as sections.

The at a glance panel (kind, who it was for, role, team, dates, stack, type of work) is built from the frontmatter. Do not repeat it in the body.

## 4. Images

**The cover** (checked on drafts too):

- Exactly one file named `cover.png`, `cover.jpg`, `cover.jpeg` or `cover.webp`, at the top of the entry folder, and `cover` points at it.
- At least 1200 pixels wide. It doubles as the share card image, which feature 12 crops to 1200 by 630, so a wide image works best.
- The width is measured from the real file on every build, so swapping in a smaller file is caught even if you did not touch `index.md`.

**Images in the body** (checked on drafts too):

- Write them as `![Alt text](./screenshot.png)`, or in a subfolder `./images/flow.png`. Reference style `![Alt][ref]` with `[ref]: ./x.png` works too.
- The path starts with `./` and stays inside the entry folder: no `..`, no leading `/`, no `http:` or `https:` address, no `~` or `@` alias.
- The file must exist, and end in `.png`, `.jpg`, `.jpeg` or `.webp` (lowercase).
- Alt text is required. Describe what the image shows for someone who cannot see it.
- Raw HTML with `<img` or `<h1` fails the build, in any letter case. Use Markdown images instead.

## 5. When the checks run

The checks run on `astro check` (the pre commit hook and the deploy gate), on `npm run build`, and when `astro dev` starts. They do **not** run again on edits you make while `astro dev` is running. Restart the dev server to recheck; the next commit catches it anyway. `npm test` runs the same checks over every real entry.

## 6. Adding a stack or type of work value

`stack`, `services`, `kind` and link `kind` only accept keys from `src/lib/vocabulary.ts`. To add a technology or a type of work, add one line to `STACK` or `SERVICES`: a lowercase kebab case key and the name to display.

```ts
export const STACK = { typescript: 'TypeScript', astro: 'Astro', postgres: 'PostgreSQL' } as const;
```

Removing a value fails the build for any entry still using it, which tells you exactly what to update. `KINDS` and `LINK_KINDS` are fixed by the spec; changing them is a spec change.

## 7. Privacy and what is public

- **The repository is public** (`toyinogun/og-website` on GitHub). `draft` hides a write up from the site's pages, not from GitHub. Anything you commit, drafts and their git history included, can be read by anyone. Do not commit material you are not ready for anyone to read, and never commit confidential client detail, even as a draft.
- **Drafts are not secret in the build either.** Drafts are kept out of every page and list, but their image files may still be copied into `dist` and served to anyone who guesses the address.
- **Confidential work:** leave out `client.name`, and check that screenshots, alt text and links contain no client names, internal addresses or private data. The schema cannot see inside an image.
