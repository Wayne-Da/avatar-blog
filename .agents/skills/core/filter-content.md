---
name: filter-content
type: core
level: L1
description: Evaluate and select the most relevant RSS entries based on the avatar's interests
refs:
  - avatars/{avatar_id}/soul.md
  - .agents/rules/quality-gate.md
input: JSON array of unread entries from fetch-feeds
output: 3-5 selected items with reasoning and entry IDs
---

# Filter Content

## Steps

1. Read the avatar's soul definition: `avatars/{avatar_id}/soul.md`

2. For each entry, evaluate against these criteria:
   - **Relevance**: How well does it match the avatar's expertise and interests?
   - **Substance**: Does it contain real information or is it hype/clickbait?
   - **Novelty**: Is this genuinely new or a rehash of known information?
   - **Synergy**: Could this be combined with other items for a richer narrative?

3. Select 3-5 items that best fit the avatar's profile. Prefer items that:
   - Can be woven into a cohesive theme
   - Offer opportunities for the avatar's unique perspective
   - Have enough depth for meaningful commentary

4. Output your selection as structured data:

```
Selected items:
1. [entry_id: NNN] "Title" — Reason for selection
2. [entry_id: NNN] "Title" — Reason for selection
3. [entry_id: NNN] "Title" — Reason for selection
...

Theme: Brief description of the connecting thread

Entry IDs: [id1, id2, id3, ...]
```

## Notes

- If fewer than 3 items pass the relevance threshold, select what you have and note the reduced count.
- Preserve the Miniflux entry IDs — they're needed later to mark entries as read.
- Do NOT simply pick the most popular items. Pick what THIS avatar would genuinely find interesting.
