---
name: publish-and-notify
type: ops
level: L2
description: Publish a validated draft and send Discord notification, or request review
refs:
  - avatars/{avatar_id}/config.yaml
  - .agents/rules/publish-policy.md
  - .agents/rules/notification.md
scripts:
  - scripts/publish.mjs
  - scripts/discord-notify.mjs
input: Draft file path, validation verdict, Miniflux entry IDs
output: Published post URL or review notification
---

# Publish and Notify

## Steps

1. Read the publish policy: `.agents/rules/publish-policy.md`
2. Read the avatar config: `avatars/{avatar_id}/config.yaml`

3. **Branch on `auto_publish` and validation verdict**:

### Path A: Auto-Publish (auto_publish=true AND verdict=PASS)

```bash
node scripts/publish.mjs --draft {draft_path} --avatar {avatar_id} --mark-read {entry_ids}
```

Then notify:
```bash
node scripts/discord-notify.mjs --avatar {avatar_id} --type published --title "{post_title}" --url "{post_url}"
```

### Path B: Review Needed (auto_publish=false OR verdict=NEEDS_REVIEW)

Mark entries as read (to avoid re-processing):
```bash
node scripts/fetch-feeds.mjs --mark-read {entry_ids}
```

Then notify:
```bash
node scripts/discord-notify.mjs --avatar {avatar_id} --type review-needed --title "{post_title}" --message "Draft saved at: {draft_path}"
```

### Path C: Failed (verdict=FAIL)

Mark entries as read:
```bash
node scripts/fetch-feeds.mjs --mark-read {entry_ids}
```

Then notify:
```bash
node scripts/discord-notify.mjs --avatar {avatar_id} --type error --title "Validation failed" --message "{error_details}"
```

## Important

- **Always mark entries as read** regardless of outcome (prevents re-processing)
- **Always send a notification** regardless of outcome
- **Notification failure is non-fatal** — if Discord fails, log warning and continue
