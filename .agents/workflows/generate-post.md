---
description: Generate a new blog post using the Avatar Agent pipeline
---

# Generate Post Workflow

This workflow triggers the Avatar Agent to fetch RSS feeds, analyze content, and generate a new blog post draft.

// turbo-all

## Steps

1. Fetch the latest RSS feeds:

```bash
node agent/fetch-feeds.mjs
```

2. Read the avatar soul definition:

Read the file `soul/avatar.md` to understand the avatar's personality, expertise, interests, writing style, and content preferences.

3. Read the fetched RSS data:

Read the file `agent/data/raw-feeds.json` to see the latest feed items.

4. Analyze and filter content:

Based on the avatar's soul definition (expertise, interests, content preferences), identify 3-5 feed items that this avatar would find most interesting. Consider:
- Relevance to the avatar's expertise and interests
- Whether the content has substance (not just hype)
- Potential for insightful commentary
- Timeliness and novelty

5. Generate a draft post:

Using the avatar's writing style and tone, write a blog post in Markdown that:
- Synthesizes the selected items into a cohesive narrative
- Reflects the avatar's perspective and personality
- Includes the avatar's personal opinions (clearly marked when speculative)
- Uses proper frontmatter format:

```yaml
---
title: "文章標題"
description: "一句話摘要"
publishDate: YYYY-MM-DD
tags: ["tag1", "tag2"]
sources:
  - title: "來源標題"
    url: "https://..."
draft: true
---
```

Save the draft to `src/content/drafts/YYYY-MM-DD-slug.md`.

6. Ask the user to review the draft.

7. If approved, move the draft from `src/content/drafts/` to `src/content/posts/` and set `draft: false` in the frontmatter.
