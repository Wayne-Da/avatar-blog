#!/usr/bin/env node
// Send Discord webhook notifications for the avatar blog pipeline.
//
// Usage: node scripts/discord-notify.mjs --avatar <id> --type <type> --title <title> [--url <url>] [--message <msg>]
// Types: published, review-needed, error, skipped

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');

const EMBED_COLORS = {
  published: 0x2ecc71, // green
  'review-needed': 0xf1c40f, // yellow
  error: 0xe74c3c, // red
  skipped: 0x95a5a6, // gray
};

const EMBED_TITLES = {
  published: '✅ Post Published',
  'review-needed': '👀 Review Needed',
  error: '❌ Pipeline Error',
  skipped: '⏭️ Pipeline Skipped',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--avatar' && args[i + 1]) {
      result.avatar = args[++i];
    } else if (args[i] === '--type' && args[i + 1]) {
      result.type = args[++i];
    } else if (args[i] === '--title' && args[i + 1]) {
      result.title = args[++i];
    } else if (args[i] === '--url' && args[i + 1]) {
      result.url = args[++i];
    } else if (args[i] === '--message' && args[i + 1]) {
      result.message = args[++i];
    }
  }
  return result;
}

function loadConfig(avatarId) {
  const configPath = resolve(ROOT, 'avatars', avatarId, 'config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  return parseYaml(raw);
}

async function main() {
  const args = parseArgs();

  if (!args.avatar || !args.type || !args.title) {
    console.error(
      'Usage: node scripts/discord-notify.mjs --avatar <id> --type <published|review-needed|error|skipped> --title <title> [--url <url>] [--message <msg>]',
    );
    process.exit(1);
  }

  if (!EMBED_COLORS[args.type]) {
    console.error(`Unknown type: ${args.type}. Must be: published, review-needed, error, skipped`);
    process.exit(1);
  }

  // Load config to get webhook env var name
  const config = loadConfig(args.avatar);
  const webhookEnvName = config.notification?.discord_webhook_env;

  if (!webhookEnvName) {
    console.error('Warning: no discord_webhook_env configured. Skipping notification.');
    return;
  }

  const webhookUrl = process.env[webhookEnvName];
  if (!webhookUrl) {
    console.error(`Warning: env var ${webhookEnvName} is not set. Skipping notification.`);
    return;
  }

  // Build Discord embed
  const embed = {
    title: EMBED_TITLES[args.type],
    color: EMBED_COLORS[args.type],
    fields: [
      { name: 'Avatar', value: args.avatar, inline: true },
      { name: 'Post', value: args.title, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };

  if (args.url) {
    embed.url = args.url;
  }

  if (args.message) {
    embed.description = args.message;
  }

  // Send webhook
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`Warning: Discord webhook returned ${res.status}: ${text}`);
      return;
    }

    console.error(`Discord notification sent: ${args.type} — ${args.title}`);
  } catch (err) {
    console.error(`Warning: Discord webhook failed: ${err.message}`);
    // Graceful degradation — never breaks pipeline
  }
}

main().catch((err) => {
  console.error(`Warning: ${err.message}`);
  // Graceful exit — notification failure never breaks pipeline
});
