# Adding a testimonial

How you add a quote to the site (spec 0009). The build checks every rule here and stops with a message naming the file if one breaks.

## 1. Get the yes first

Send the person the exact words you want to publish and exactly how their name, role and company will appear (and the profile link, if they want one). Publish only after they say yes to that, in writing or in person. Keep their reply in your inbox; it never goes into this repository.

This repository is public and git keeps every version, so a quote is effectively permanent the moment it is committed. Removing the file later takes it off the site, not out of history.

## 2. Add one file

Create `src/content/testimonials/<their-name>.yaml`, the file name in lowercase with hyphens between words (for example `jane-doe.yaml`):

```yaml
quote: >-
  The exact words they agreed to, as one paragraph of plain text.
name: Jane Doe
role: Engineering lead
company: Example BV
profileUrl: https://www.example.com/in/janedoe
project: hetzner-talos-cluster
order: 10
permission:
  date: '2026-11-02'
  via: email
```

| Field | Required | What to write |
|---|---|---|
| `quote` | yes | their words, 20 to 320 characters, plain text, no quotation marks around it (the site adds the styling) |
| `name` | yes | their full name, up to 60 characters |
| `role` | yes | their role when you worked together, up to 60 |
| `company` | yes | the company, up to 60 |
| `profileUrl` | no | a public profile they chose to share, starting `https://`. Leave the line out if they did not offer one |
| `project` | no | the folder name of the project the quote is about, from `src/content/projects/`. Leave it out for a quote about working with you in general |
| `order` | yes | a whole number; lower shows first. Leave gaps (10, 20, 30) so you can slot one in later. No two quotes may share one |
| `permission.date` | yes | the day they said yes, `YYYY-MM-DD`, in quotes |
| `permission.via` | yes | `email`, `message` or `in-person` |

Never put an email address, phone number or street address in any field. The build refuses email addresses and phone numbers; anything else is on you.

## 3. Where it shows

- The home page shows the three quotes with the lowest `order`, right after Selected work.
- A quote with a `project` also shows on that project's page, after the write up, and on the home page it links to that project.
- The permission record never shows anywhere on the site.

## 4. Taking one down

Delete the file and merge. It leaves the site on the next deploy.
