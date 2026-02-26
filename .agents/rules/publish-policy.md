# Publish Policy

## Auto-Publish Conditions

A draft is auto-published when ALL of the following are true:

1. `config.pipeline.auto_publish` is `true`
2. All hard rules pass (via `scripts/validate.mjs`)
3. All soft rules pass (via LLM evaluation)

## Manual Review Conditions

A draft requires manual review when ANY of the following are true:

1. `config.pipeline.auto_publish` is `false` (the default)
2. LLM has concerns about any soft rule
3. The LLM is uncertain about content accuracy or tone

When manual review is triggered:
- Draft stays in `src/content/drafts/`
- Discord notification sent with type `review-needed`
- Miniflux entries are still marked as read (to avoid re-processing)

## Manual Publish Command

To publish a reviewed draft manually:

```bash
node scripts/publish.mjs --draft <path> --avatar <id>
```
