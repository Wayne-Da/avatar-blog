# Avatar Blog Platform — Implementation Plan

> Last updated: 2026-02-25
> Status: Approved, ready for implementation

---

## Vision

A **document-driven, skill-based agent platform** that automatically curates RSS content and publishes AI-generated blog posts. The system is designed for **1→N scaling** — adding a new blog site requires only creating a soul definition and config file.

### Core Principles

1. **Claude Code Agent is the execution engine** — no custom pipeline code needed
2. **Skills are modular, layered, and loaded on demand** — optimizing context window
3. **Deterministic operations use Scripts** — LLM handles reasoning and creativity only
4. **Documents define behavior** — changing a markdown file changes system behavior
5. **Miniflux handles RSS aggregation** — including deduplication and read/unread state

---

## Confirmed Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Architecture | Skill-driven, document-based | Natural fit with Claude Code Agent |
| 2 | LLM Engine | Claude Code (CLI agent) | Already available, reads files + runs CLI natively |
| 3 | RSS Aggregation | Miniflux + PostgreSQL (Docker) | Built-in read/unread tracking, API, dedup, scales to 500+ feeds |
| 4 | Containerization | Docker Compose from Day 1 | Miniflux requires it, avoid migration cost later |
| 5 | State Management | Miniflux read/unread + PostgreSQL | No custom JSON state files needed |
| 6 | Static Site | Astro (existing) + Content Collections | Already built, Zod schema validation |
| 7 | Deployment | GitHub Pages + GitHub Actions | Existing deploy.yml, gh CLI for automation |
| 8 | Notifications | Discord Webhook | User preference |
| 9 | CRON System | User's physical machine (24hr) | Executes `claude` CLI on schedule |
| 10 | Scaling Model | 1 avatar folder = 1 blog site | soul.md + config.yaml per avatar |

---

## Architecture Overview

### Three-Layer Separation

```
Soul     = WHO the agent is       → avatars/{id}/soul.md
Skills   = WHAT the agent can do  → .agents/skills/{level}/
Workflows = HOW skills compose    → .agents/workflows/
```

### Skill Levels (Context Window Optimization)

```
Level 0 — Workflows     (~50 lines, always loaded)
  Orchestration skeleton: which skills, what order, what conditions.

Level 1 — Core Skills   (loaded on demand, LLM-intensive)
  filter-content.md    — Understand articles, match to soul interests
  generate-draft.md    — Write blog post in avatar's voice

Level 2 — Ops Skills    (loaded on demand, Script-intensive, lightweight)
  fetch-feeds.md           — Call Miniflux API via script
  validate-post.md         — Script for hard rules + LLM for soft rules
  publish-and-notify.md    — Git push + Discord + mark-as-read

Level 3 — Setup Skills  (only loaded for playbooks, never in daily workflow)
  init-avatar-site.md     — Create GitHub repo + sync Miniflux feeds
  bind-domain.md          — Bind custom domain to GitHub Pages
```

### Script vs LLM Division

```
Script (deterministic):              LLM (reasoning):
  scripts/fetch-feeds.mjs             filter-content (relevance judgment)
  scripts/validate.mjs                generate-draft (content creation)
  scripts/publish.mjs                 validate-post soft rules (quality)
  scripts/discord-notify.mjs          publish decision (policy judgment)
```

### Skill Anatomy

Each skill file has:
- **frontmatter**: name, type, description, refs, scripts, input, output
- **refs**: data refs (config/soul), rule refs (quality-gate), script refs (*.mjs)
- **steps**: what the agent should do (either run a script or think/create)

---

## Target Directory Structure

```
~/Projects/
├── avatar-blog/                        ← Platform repo (pure control plane)
│   ├── docker-compose.yml              ← Miniflux + PostgreSQL
│   ├── .env.example                    ← Environment variables template
│   ├── .env                            ← (gitignored) Actual secrets
│   │
│   ├── .agents/
│   │   ├── PLAN.md                     ← THIS FILE
│   │   ├── workflows/
│   │   │   ├── generate-post.md        ← Daily content generation workflow
│   │   │   └── init-new-avatar.md      ← New avatar setup workflow
│   │   ├── skills/
│   │   │   ├── core/
│   │   │   │   ├── filter-content.md   ← L1: Content relevance filtering
│   │   │   │   └── generate-draft.md   ← L1: Article generation
│   │   │   ├── ops/
│   │   │   │   ├── fetch-feeds.md      ← L2: Miniflux API fetch
│   │   │   │   ├── validate-post.md    ← L2: Quality validation (hybrid)
│   │   │   │   └── publish-and-notify.md ← L2: Publish + Discord + mark read
│   │   │   └── setup/
│   │   │       ├── init-avatar-site.md ← L3: GitHub repo + Miniflux sync
│   │   │       └── bind-domain.md      ← L3: Custom domain binding
│   │   └── rules/
│   │       ├── quality-gate.md         ← Hard + soft quality rules
│   │       ├── publish-policy.md       ← Auto vs manual publish conditions
│   │       └── notification.md         ← Discord notification rules
│   │
│   ├── avatars/
│   │   ├── tech-observer/
│   │   │   ├── soul.md                 ← Avatar personality
│   │   │   └── config.yaml             ← local_path: "../tech-observer"
│   │   └── _template/
│   │       ├── soul.md.example
│   │       └── config.yaml.example
│   │
│   ├── scripts/
│   │   ├── fetch-feeds.mjs             ← Miniflux API client
│   │   ├── validate.mjs                ← Zod schema + hard rules
│   │   ├── publish.mjs                 ← git add/commit/push in site repo
│   │   ├── discord-notify.mjs          ← Discord webhook sender
│   │   ├── init-site.mjs              ← Automated repo + site creation
│   │   └── lib/miniflux.mjs            ← Miniflux API library
│   │
│   ├── template/                       ← Astro site template (parameterized)
│   │   ├── site-config.json            ← Per-site metadata (template)
│   │   ├── astro.config.mjs            ← Reads from site-config.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .gitignore
│   │   ├── .github/workflows/deploy.yml
│   │   ├── public/
│   │   └── src/
│   │       ├── content.config.ts
│   │       ├── layouts/BaseLayout.astro ← Reads description/footer from site-config
│   │       ├── pages/index.astro        ← Reads title/tagline from site-config
│   │       ├── pages/posts/[...slug].astro
│   │       ├── styles/global.css
│   │       └── content/{posts,drafts}/
│   │
│   └── package.json                    ← Platform deps only (yaml, zod)
│
├── tech-observer/                      ← Independent site repo (sibling)
│   ├── site-config.json
│   ├── astro.config.mjs
│   ├── package.json
│   ├── .github/workflows/deploy.yml
│   └── src/content/posts/*.md
│
└── (future avatar repos as siblings)
```
```

---

## Implementation Phases

### Phase 1: Infrastructure + First Avatar End-to-End

Goal: One avatar (tech-observer) running the full pipeline automatically.

#### Step 1.1 — Docker + Miniflux
- [ ] Create `docker-compose.yml` (Miniflux + PostgreSQL)
- [ ] Create `.env.example` with required variables
- [ ] Start services, verify Miniflux Web UI accessible
- [ ] Create Miniflux user + API key
- [ ] Add initial feeds via Miniflux API/UI (from current feeds.yaml)

#### Step 1.2 — Avatar Config Migration
- [ ] Create `avatars/tech-observer/soul.md` (migrate from soul/avatar.md)
- [ ] Create `avatars/tech-observer/config.yaml` (migrate from agent/feeds.yaml)
- [ ] Create `avatars/_template/` with examples
- [ ] Remove old `soul/` and `agent/feeds.yaml` (after migration)

#### Step 1.3 — Scripts (Deterministic Operations)
- [ ] `scripts/fetch-feeds.mjs` — Miniflux API client (replace rss-parser version)
- [ ] `scripts/validate.mjs` — Zod-based frontmatter + structural validation
- [ ] `scripts/publish.mjs` — Move draft→post, update frontmatter, git commit+push
- [ ] `scripts/discord-notify.mjs` — Discord webhook with embeds

#### Step 1.4 — Skills + Rules
- [ ] `skills/ops/fetch-feeds.md`
- [ ] `skills/core/filter-content.md`
- [ ] `skills/core/generate-draft.md`
- [ ] `skills/ops/validate-post.md`
- [ ] `skills/ops/publish-and-notify.md`
- [ ] `rules/quality-gate.md`
- [ ] `rules/publish-policy.md`
- [ ] `rules/notification.md`

#### Step 1.5 — Workflow
- [ ] Rewrite `workflows/generate-post.md` with skill-based structure
- [ ] End-to-end test: manually trigger Claude Code with the workflow

#### Step 1.6 — CRON Integration
- [ ] Document the claude CLI command for CRON invocation
- [ ] Test scheduled execution on user's machine

### Phase 2: 1→N Scaling (Multi-Repo)

Goal: Each avatar is an independent sibling repo with its own GitHub Pages site. Platform repo is pure control plane.

- [x] Extract Astro site into `template/` (parameterized with site-config.json)
- [x] Migrate tech-observer to independent repo (`Wayne-Da/tech-observer`)
- [x] Clean platform repo (remove src/, public/, astro.config.mjs, tsconfig.json)
- [x] Update `avatars/tech-observer/config.yaml` with new repo/paths
- [x] Fix `scripts/publish.mjs` git cwd to use siteRoot
- [x] `scripts/init-site.mjs` — automated repo + site creation
- [x] `workflows/init-new-avatar.md`
- [x] `skills/setup/init-avatar-site.md`
- [x] `skills/setup/bind-domain.md`
- [x] Remove platform deploy.yml (no longer has a site)
- [ ] Test: create second avatar using the init workflow
- [ ] Verify both avatars run independently via CRON

---

## Workflow: generate-post (Design Spec)

```
Trigger: CRON → claude -p "Execute workflow generate-post --avatar tech-observer"

Agent reads: .agents/workflows/generate-post.md
Agent reads: avatars/tech-observer/config.yaml

Step 1: [ops/fetch-feeds]
  → Run: node scripts/fetch-feeds.mjs --avatar tech-observer
  → Output: JSON with unread items
  → If count < min_items (from config) → update Miniflux read status → END

Step 2: [core/filter-content]
  → Load: avatars/tech-observer/soul.md
  → Agent analyzes items against soul interests
  → Output: 3-5 selected items with reasoning

Step 3: [core/generate-draft]
  → Agent writes blog post in avatar's voice
  → Save to: {avatar's site repo}/src/content/drafts/YYYY-MM-DD-slug.md

Step 4: [ops/validate-post]
  → Run: node scripts/validate.mjs {draft_path} (hard rules)
  → Agent checks soft rules (from rules/quality-gate.md)
  → If fail → Discord notify with errors → END

Step 5: [ops/publish-and-notify]
  → Check rules/publish-policy.md
  → If auto_publish:
      Run: node scripts/publish.mjs {draft_path}
      Run: node scripts/discord-notify.mjs --type published
  → If manual:
      Run: node scripts/discord-notify.mjs --type review-needed
  → Mark Miniflux entries as read
```

---

## Avatar Config Schema

```yaml
# avatars/{avatar_id}/config.yaml

avatar_id: tech-observer

feeds:
  miniflux_category: "tech-observer"    # Miniflux category name
  sources:
    - url: "https://hnrss.org/frontpage"
      name: "Hacker News"
      priority: high
    - url: "https://techcrunch.com/feed/"
      name: "TechCrunch"
      priority: medium

site:
  repo: "Wayne-Da/tech-observer"        # GitHub repo (org/name) — each avatar = own repo
  base_path: "/tech-observer"
  local_path: "../tech-observer"        # Relative to platform repo root
  domain: null                          # Custom domain (optional)

pipeline:
  schedule: "0 8 * * *"                 # CRON expression (for reference)
  min_items_to_generate: 3              # Min new items to trigger generation
  auto_publish: false                   # true = skip human review
  llm_note: "Use Claude Code agent"

notification:
  discord_webhook_env: "DISCORD_WEBHOOK_TECH_OBSERVER"  # env var name
```

---

## Migration Notes

### Files to migrate:
- `soul/avatar.md` → `avatars/tech-observer/soul.md`
- `agent/feeds.yaml` → `avatars/tech-observer/config.yaml`
- `agent/fetch-feeds.mjs` → `scripts/fetch-feeds.mjs` (rewrite for Miniflux API)

### Files to remove (after migration):
- `soul/` directory
- `agent/` directory (replaced by `.agents/` + `scripts/`)

### Files to keep as-is:
- `src/` (existing Astro site continues to work)
- `.github/workflows/deploy.yml` (existing deployment)
- `public/`, `astro.config.mjs`, `tsconfig.json`, `package.json`
