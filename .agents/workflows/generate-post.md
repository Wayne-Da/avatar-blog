---
description: Daily content generation workflow — fetch, filter, generate, validate, publish
params:
  - avatar_id (required)
---

# Generate Post Workflow

Execute this workflow for a specific avatar to generate a blog post from RSS feeds.

**Usage**: `claude -p "Read and execute .agents/workflows/generate-post.md --avatar tech-observer"`

---

## Step 0: Sync Feeds

Run:
```bash
node scripts/fetch-feeds.mjs --avatar {avatar_id} --sync
```

This ensures Miniflux subscriptions match config.yaml（新增新 feed、停用已移除的 feed、重新啟用回復的 feed）。

---

## Step 1: Fetch Feeds
**Skill**: `.agents/skills/ops/fetch-feeds.md`

Run:
```bash
node scripts/fetch-feeds.mjs --avatar {avatar_id}
```

Capture the JSON output. Check `total` against `pipeline.min_items_to_generate` from `avatars/{avatar_id}/config.yaml`.

- **If insufficient items** → Notify skipped, END:
  ```bash
  node scripts/discord-notify.mjs --avatar {avatar_id} --type skipped --title "Not enough new items"
  ```
- **If sufficient** → pass `entries` to Step 2.

---

## Step 2: Filter Content
**Skill**: `.agents/skills/core/filter-content.md`

Read `avatars/{avatar_id}/soul.md`. Evaluate each entry for relevance, substance, novelty, and synergy with the avatar's interests.

Select 3-5 items. Record:
- Selected entry titles and reasoning
- Connecting theme
- **Miniflux entry IDs** (needed in Step 5)

---

## Step 3: Generate Draft
**Skill**: `.agents/skills/core/generate-draft.md`

Read `avatars/{avatar_id}/soul.md` and `avatars/{avatar_id}/config.yaml`.

Write a blog post synthesizing the selected items. Save to:
```
{site_root}/src/content/drafts/YYYY-MM-DD-{slug}.md
```

Record the **draft file path**.

---

## Step 4: Validate Draft
**Skill**: `.agents/skills/ops/validate-post.md`

Run hard rules:
```bash
node scripts/validate.mjs {draft_path}
```

Then evaluate soft rules from `.agents/rules/quality-gate.md`.

- **FAIL** → Attempt 1 fix, re-validate. If still failing → go to Step 5 (error path).
- **PASS** or **NEEDS_REVIEW** → go to Step 5.

---

## Step 5: Publish and Notify
**Skill**: `.agents/skills/ops/publish-and-notify.md`

Read `avatars/{avatar_id}/config.yaml` for `pipeline.auto_publish`.
Read `.agents/rules/publish-policy.md`.

### If auto_publish=true AND verdict=PASS:
```bash
node scripts/publish.mjs --draft {draft_path} --avatar {avatar_id} --mark-read {entry_ids}
node scripts/discord-notify.mjs --avatar {avatar_id} --type published --title "{post_title}"
```

### If auto_publish=false OR verdict=NEEDS_REVIEW:
```bash
node scripts/fetch-feeds.mjs --mark-read {entry_ids}
node scripts/discord-notify.mjs --avatar {avatar_id} --type review-needed --title "{post_title}" --message "Draft: {draft_path}"
```

### If verdict=FAIL:
```bash
node scripts/fetch-feeds.mjs --mark-read {entry_ids}
node scripts/discord-notify.mjs --avatar {avatar_id} --type error --title "Validation failed" --message "{error_details}"
```

---

## Data Flow Summary

```
Step 0 (sync)     → Miniflux subscriptions match config.yaml
Step 1 (fetch)    → entries JSON, total count
Step 2 (filter)   → selected items, entry IDs, theme
Step 3 (generate) → draft file path
Step 4 (validate) → verdict (PASS / NEEDS_REVIEW / FAIL)
Step 5 (publish)  → published post or review notification
```

## Error Handling

- **Always mark Miniflux entries as read** — even on failure (prevents reprocessing)
- **Always send a Discord notification** — even on failure (visibility)
- **Notification failure is non-fatal** — log warning, continue
