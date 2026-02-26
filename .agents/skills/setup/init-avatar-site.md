---
name: init-avatar-site
type: setup
level: L3
description: Create a new GitHub repo with Astro site from template, sync Miniflux feeds
refs:
  - avatars/{avatar_id}/config.yaml
  - avatars/{avatar_id}/soul.md
  - template/
scripts:
  - scripts/init-site.mjs
  - scripts/fetch-feeds.mjs
input: Avatar ID (directory must exist under avatars/ with soul.md + config.yaml)
output: Live GitHub Pages site URL, Miniflux feeds synced
---

# Init Avatar Site

## Prerequisites

- `avatars/{avatar_id}/soul.md` exists with frontmatter (name, tagline, etc.)
- `avatars/{avatar_id}/config.yaml` exists with `site.repo`, `site.base_path`, `site.local_path`
- `gh` CLI authenticated (`gh auth status`)
- Miniflux running (`docker compose up -d`)

## Steps

1. Run the init-site script:
```bash
node scripts/init-site.mjs --avatar {avatar_id}
```

This will:
- Create the GitHub repo
- Clone to the configured `local_path`
- Copy `template/` contents
- Generate `site-config.json` from config + soul data
- `npm install` + initial commit + push
- Enable GitHub Pages via GitHub Actions

2. Sync Miniflux feeds for this avatar:
```bash
node scripts/fetch-feeds.mjs --avatar {avatar_id} --sync
```

3. Verify the site builds:
```bash
cd {local_path} && npm run build
```

4. Check GitHub Pages deployment:
```bash
gh api repos/{repo}/pages --jq '.status'
```

Wait for status to be "built". The site will be at `https://{owner}.github.io{base_path}/`.

## Troubleshooting

- If `gh repo create` fails with "already exists", the script will try to clone instead
- If Pages shows `null` status, the first deploy may still be in progress (wait 1-2 min)
- If build fails, check `site-config.json` values match the expected format
