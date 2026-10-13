## A second level heading

A paragraph of body text with **strong words**, _emphasis_, a [link to the home page](/) and some `inline code`. Body text sets at 18px so a line in the reading column holds about 65 characters.

### A third level heading

- An unordered list item
- Another item, long enough to wrap onto a second line on a phone so the hanging indent shows
- A third item

1. An ordered list item
2. A second step
3. A third step

#### A fourth level heading

> A quote sits behind a hairline, in muted text, with no added quotation marks.

##### A fifth level heading

```ts
// A fenced code block, highlighted by Shiki in both themes.
export const greet = (name: string): string => `Hello, ${name}`;

const people = ['Ada', 'Grace', 'Katherine'] as const;
people.map(greet).forEach((line) => console.log(line));
```

###### A sixth level heading

| Column | Another column | A third, much wider column that pushes the table past the reading width on a phone |
| ------ | -------------- | ----------------------------------------------------------------------------------- |
| One    | Two            | Three                                                                               |
| Four   | Five           | Six                                                                                 |

<figure>
  <img src="/favicon.svg" alt="The TO monogram on its accent square" width="128" height="128" />
  <figcaption>A figure with a caption, written as HTML inside the Markdown.</figcaption>
</figure>

A long URL wraps rather than pushing the page sideways: https://toyintest.org/a/very/long/path/that/keeps/going/and/going/without/any/natural/break/points/at/all

---

A closing paragraph after a horizontal rule.
