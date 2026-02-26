---
description: Initialize a new avatar — create personality, config, site repo, and sync feeds
params:
  - avatar_id (required)
  - concept (required) — brief description of the avatar's personality and interests
  - feed_urls (required) — list of RSS feed URLs
  - discord_webhook_env (optional) — env var name for Discord webhook
---

# Init New Avatar Workflow

Create a complete new avatar from concept to deployed site.

**Usage**: `claude -p "Read and execute .agents/workflows/init-new-avatar.md --avatar {id} --concept '{concept}' --feeds '{url1},{url2}'"`

---

## Step 1: Create Avatar Directory

```bash
mkdir -p avatars/{avatar_id}
```

---

## Step 2: Write Soul Definition

Based on the provided concept, write `avatars/{avatar_id}/soul.md` following the pattern from `avatars/_template/soul.md.example`.

The soul.md should include:
- Frontmatter: name, tagline, expertise, interests, tone, perspective, language
- Body: role background, writing style, content preferences

Use the concept to craft a distinct personality. Reference existing avatars (e.g., `avatars/tech-observer/soul.md`) for style.

---

## Step 3: Create Config

Write `avatars/{avatar_id}/config.yaml` based on `avatars/_template/config.yaml.example`:

```yaml
avatar_id: {avatar_id}

feeds:
  miniflux_category: "{avatar_id}"
  sources:
    # Populate from provided feed_urls
    - url: "{feed_url}"
      name: "{feed_name}"
      priority: high

site:
  repo: "Wayne-Da/{avatar_id}"
  base_path: "/{avatar_id}"
  local_path: "../{avatar_id}"
  domain: null

pipeline:
  schedule: "0 8 * * *"
  min_items_to_generate: 3
  auto_publish: false

notification:
  discord_webhook_env: "{discord_webhook_env or DISCORD_WEBHOOK_{AVATAR_ID_UPPER}}"
```

---

## Step 4: Init Site

**Skill**: `.agents/skills/setup/init-avatar-site.md`

```bash
node scripts/init-site.mjs --avatar {avatar_id}
```

This creates the GitHub repo, copies the template, and deploys.

---

## Step 5: Sync Feeds

```bash
node scripts/fetch-feeds.mjs --avatar {avatar_id} --sync
```

This creates the Miniflux category and adds the feeds.

---

## Step 6: Verify

1. Check site is accessible:
```bash
gh api repos/Wayne-Da/{avatar_id}/pages --jq '.status'
```

2. Check feeds are synced:
```bash
node scripts/fetch-feeds.mjs --avatar {avatar_id}
```

3. Verify build works locally:
```bash
cd ../{avatar_id} && npm run build
```

---

## Step 7: Report

Summarize:
- Site URL: `https://wayne-da.github.io/{avatar_id}/`
- Repo: `Wayne-Da/{avatar_id}`
- Feeds synced: {count} feeds in Miniflux category "{avatar_id}"
- Status: Ready for `generate-post` workflow

---

## Data Flow Summary

```
Step 1 (mkdir)    → avatar directory created
Step 2 (soul)     → soul.md with personality definition
Step 3 (config)   → config.yaml with feeds, site, pipeline settings
Step 4 (site)     → GitHub repo + Pages deployed
Step 5 (feeds)    → Miniflux category + feeds synced
Step 6 (verify)   → all systems confirmed working
Step 7 (report)   → summary for user
```
