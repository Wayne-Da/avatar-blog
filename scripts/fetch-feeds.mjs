#!/usr/bin/env node
// Fetch unread RSS entries from Miniflux for a given avatar.
//
// Usage:
//   node scripts/fetch-feeds.mjs --avatar <id>               # Fetch unread entries (JSON to stdout)
//   node scripts/fetch-feeds.mjs --avatar <id> --sync         # Create category + subscribe feeds
//   node scripts/fetch-feeds.mjs --mark-read <id1,id2,...>    # Mark entries as read

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  minifluxApi,
  resolveCategoryId,
  createCategory,
  markEntriesAsRead,
} from './lib/miniflux.mjs';

const ROOT = resolve(import.meta.dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--avatar' && args[i + 1]) {
      result.avatar = args[++i];
    } else if (args[i] === '--sync') {
      result.sync = true;
    } else if (args[i] === '--mark-read' && args[i + 1]) {
      result.markRead = args[++i].split(',').map((s) => s.trim());
    }
  }
  return result;
}

function loadConfig(avatarId) {
  const configPath = resolve(ROOT, 'avatars', avatarId, 'config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  return parseYaml(raw);
}

async function syncFeeds(config) {
  const categoryName = config.feeds.miniflux_category;

  // Resolve or create category
  let categoryId = await resolveCategoryId(categoryName);
  if (!categoryId) {
    console.error(`Creating category "${categoryName}"...`);
    categoryId = await createCategory(categoryName);
    console.error(`Created category "${categoryName}" (id: ${categoryId})`);
  } else {
    console.error(`Category "${categoryName}" already exists (id: ${categoryId})`);
  }

  // Get existing feeds for this category
  const existingFeeds = await minifluxApi('GET', `/v1/categories/${categoryId}/feeds`);
  const existingUrls = new Set((existingFeeds || []).map((f) => f.feed_url));

  // Subscribe new feeds
  for (const source of config.feeds.sources) {
    if (existingUrls.has(source.url)) {
      console.error(`Feed already subscribed: ${source.name} (${source.url})`);
      continue;
    }
    try {
      await minifluxApi('POST', '/v1/feeds', {
        feed_url: source.url,
        category_id: categoryId,
      });
      console.error(`Subscribed: ${source.name} (${source.url})`);
    } catch (err) {
      console.error(`Failed to subscribe ${source.name}: ${err.message}`);
    }
  }

  console.error('Sync complete.');
}

async function fetchUnread(config) {
  const categoryName = config.feeds.miniflux_category;
  const categoryId = await resolveCategoryId(categoryName);

  if (!categoryId) {
    console.error(`Category "${categoryName}" not found. Run --sync first.`);
    process.exit(1);
  }

  const result = await minifluxApi(
    'GET',
    `/v1/categories/${categoryId}/entries?status=unread&order=published_at&direction=desc&limit=50`,
  );

  const entries = (result.entries || []).map((e) => ({
    id: e.id,
    title: e.title,
    url: e.url,
    content: e.content,
    author: e.author,
    published_at: e.published_at,
    feed: e.feed?.title || '',
  }));

  console.log(JSON.stringify({ total: entries.length, entries }, null, 2));
}

async function main() {
  const args = parseArgs();

  // Mode: mark-read (doesn't require avatar)
  if (args.markRead) {
    await markEntriesAsRead(args.markRead);
    console.error(`Marked ${args.markRead.length} entries as read.`);
    return;
  }

  // All other modes require --avatar
  if (!args.avatar) {
    console.error('Usage:');
    console.error('  node scripts/fetch-feeds.mjs --avatar <id>');
    console.error('  node scripts/fetch-feeds.mjs --avatar <id> --sync');
    console.error('  node scripts/fetch-feeds.mjs --mark-read <id1,id2,...>');
    process.exit(1);
  }

  const config = loadConfig(args.avatar);

  if (args.sync) {
    await syncFeeds(config);
  } else {
    await fetchUnread(config);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
