---
name: bind-domain
type: setup
level: L3
description: Bind a custom domain to an avatar's GitHub Pages site
refs:
  - avatars/{avatar_id}/config.yaml
input: Avatar ID and custom domain
output: Custom domain configured and verified
---

# Bind Custom Domain

## Prerequisites

- Avatar site is already deployed on GitHub Pages
- DNS access to the custom domain
- `gh` CLI authenticated

## Steps

1. Read `avatars/{avatar_id}/config.yaml` to get `site.repo`.

2. Add CNAME file to the site repo:
```bash
echo "{domain}" > {local_path}/public/CNAME
cd {local_path} && git add public/CNAME && git commit -m "add CNAME for {domain}" && git push
```

3. Configure custom domain via GitHub API:
```bash
gh api repos/{repo}/pages -X PUT -f cname="{domain}"
```

4. Update `avatars/{avatar_id}/config.yaml`:
```yaml
site:
  domain: "{domain}"
```

5. Update `site-config.json` in the site repo:
```json
{
  "siteUrl": "https://{domain}",
  "basePath": "/"
}
```

6. Update `astro.config.mjs` will automatically pick up the new values from `site-config.json`.

7. Rebuild and push:
```bash
cd {local_path} && npm run build && git add -A && git commit -m "config: custom domain {domain}" && git push
```

## DNS Configuration

The user needs to set up DNS records:

### For apex domain (example.com):
```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
```

### For subdomain (blog.example.com):
```
CNAME blog {owner}.github.io.
```

## Verification

```bash
gh api repos/{repo}/pages --jq '.cname'
# Should return the custom domain

curl -I https://{domain}
# Should return 200
```
