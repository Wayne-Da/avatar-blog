# Notification Rules

## Notification Types

| Type | Color | When |
|------|-------|------|
| `published` | Green (0x2ecc71) | Post was auto-published successfully |
| `review-needed` | Yellow (0xf1c40f) | Draft saved, waiting for human review |
| `error` | Red (0xe74c3c) | Pipeline failed (validation error, script failure) |
| `skipped` | Gray (0x95a5a6) | Not enough new items to generate a post |

## Discord Embed Format

```json
{
  "embeds": [{
    "title": "Type Title (e.g. ✅ Post Published)",
    "color": 0x2ecc71,
    "fields": [
      { "name": "Avatar", "value": "tech-observer", "inline": true },
      { "name": "Post", "value": "Article title", "inline": true }
    ],
    "description": "Optional detail message",
    "url": "Optional link to published post",
    "timestamp": "ISO-8601"
  }]
}
```

## Script Usage

```bash
node scripts/discord-notify.mjs --avatar <id> --type <type> --title <title> [--url <url>] [--message <msg>]
```

## Best-Effort Rule

**Notification failure MUST NEVER block the pipeline.** If the Discord webhook fails (missing URL, API error, network issue), the script logs a warning to stderr and exits 0.
