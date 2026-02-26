# Quality Gate Rules

## Hard Rules (Enforced by `scripts/validate.mjs`)

These MUST all pass. A draft that fails any hard rule cannot be published.

1. **Schema**: Valid YAML frontmatter matching the Zod schema (title, description, publishDate, tags, sources, draft)
2. **Body Length**: Article body >= 200 characters
3. **Sources**: At least 1 source with title and valid URL
4. **File Naming**: File name matches `YYYY-MM-DD-*.md` pattern
5. **No Markers**: Body must not contain `TODO` or `FIXME`

## Soft Rules (Evaluated by LLM)

These are quality signals. Failing soft rules doesn't block publishing but should be flagged for review.

1. **Voice Consistency**: Does the article match the avatar's tone defined in `soul.md`? Would a reader recognize this as the same author?
2. **Narrative Coherence**: Does the article flow logically? Are transitions smooth between topics?
3. **Opinion Attribution**: Are personal opinions clearly marked as such? Are facts properly attributed to sources?
4. **Source Diversity**: Does the article draw from multiple sources rather than just rewriting a single one?
5. **Tag Quality**: Are tags specific and useful (not too generic like "tech", not too niche)?
6. **Description Quality**: Does the description meaningfully summarize the post in one sentence?
7. **Heading Structure**: For posts > 500 chars, are there section headings to aid readability?
