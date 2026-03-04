---
name: fetch-feeds
type: ops
level: L2
description: Fetch unread RSS entries from Miniflux for the target avatar
refs:
  - avatars/{avatar_id}/config.yaml
scripts:
  - scripts/fetch-feeds.mjs
input: avatar_id
output: JSON with unread entries (or decision to END if insufficient items)
---

# Fetch Feeds

## Steps

1. Run the fetch script:

```bash
node scripts/fetch-feeds.mjs --avatar {avatar_id}
```

2. Parse the JSON output. It contains `{ total, entries }`.

3. Read `avatars/{avatar_id}/config.yaml` and check `pipeline.min_items_to_generate`.

4. **Decision**:
   - If `total >= min_items_to_generate` → continue pipeline, pass entries to next skill
   - If `total < min_items_to_generate` → send a `skipped` notification and END:

```bash
node scripts/discord-notify.mjs --avatar {avatar_id} --type skipped --title "Not enough new items ({total} < {min_items})"
```

## Sync Mode

Bidirectional sync between config.yaml and Miniflux:

```bash
node scripts/fetch-feeds.mjs --avatar {avatar_id} --sync
```

This command:
- **Creates** the Miniflux category if it doesn't exist
- **Subscribes** new feeds found in config.yaml
- **Re-enables** feeds that were previously disabled but are back in config.yaml
- **Disables** (not deletes) feeds removed from config.yaml, preserving historical entries

Sync runs automatically as Step 0 of the generate-post pipeline, ensuring Miniflux is always in sync before fetching entries.
