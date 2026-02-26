---
name: generate-draft
type: core
level: L1
description: Write a blog post draft in the avatar's voice based on selected RSS items
refs:
  - avatars/{avatar_id}/soul.md
  - avatars/{avatar_id}/config.yaml
input: Selected items with reasoning from filter-content
output: Draft file path and Miniflux entry IDs used
---

# Generate Draft

## Steps

1. Read the avatar's soul: `avatars/{avatar_id}/soul.md`
2. Read the avatar's config: `avatars/{avatar_id}/config.yaml` to determine `site.local_path`

3. Write a blog post that:
   - Synthesizes the selected items into a cohesive narrative (NOT a list of summaries)
   - Adopts the avatar's tone, perspective, and language from `soul.md`
   - Includes the avatar's personal opinions — clearly marked when speculative
   - Uses proper Chinese (zh-TW) with natural English for technical terms
   - Is at least 200 characters in the body (hard rule requirement)

4. Format with proper frontmatter:

```yaml
---
title: "文章標題"
description: "一句話摘要"
publishDate: YYYY-MM-DD
tags: ["tag1", "tag2"]
sources:
  - title: "來源標題"
    url: "https://..."
  - title: "另一來源"
    url: "https://..."
draft: true
---
```

5. Generate a slug from the title (lowercase, hyphens, ASCII-friendly).

6. Save the draft to:
```
{site_root}/src/content/drafts/YYYY-MM-DD-{slug}.md
```

Where `{site_root}` is resolved from `config.site.local_path` (default `.`).

7. Report:
   - File path of the saved draft
   - List of Miniflux entry IDs used (for marking as read later)

## Quality Checklist

Before saving, verify:
- [ ] Frontmatter matches the Zod schema (title, description, publishDate, tags, sources, draft)
- [ ] At least 1 source with title and valid URL
- [ ] Body is >= 200 characters
- [ ] File name matches `YYYY-MM-DD-*.md`
- [ ] No `TODO` or `FIXME` in the body
- [ ] `draft: true` is set (will be changed to false on publish)
