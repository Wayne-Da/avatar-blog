#!/usr/bin/env node
// Publish a draft: move from drafts/ to posts/, set draft:false, git commit+push, mark entries read.
//
// Usage: node scripts/publish.mjs --draft <path> --avatar <id> [--mark-read <id1,id2,...>]

import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { markEntriesAsRead } from './lib/miniflux.mjs';

const ROOT = resolve(import.meta.dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--draft' && args[i + 1]) {
      result.draft = args[++i];
    } else if (args[i] === '--avatar' && args[i + 1]) {
      result.avatar = args[++i];
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

function setDraftFalse(content) {
  // Replace draft: true with draft: false in frontmatter
  return content.replace(/^(draft:\s*)true\s*$/m, '$1false');
}

function extractTitle(content) {
  const match = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return match ? match[1] : basename(content, '.md');
}

function git(cmd, cwd) {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function main() {
  const args = parseArgs();

  if (!args.draft || !args.avatar) {
    console.error('Usage: node scripts/publish.mjs --draft <path> --avatar <id> [--mark-read <ids>]');
    process.exit(1);
  }

  const config = loadConfig(args.avatar);
  const siteRoot = resolve(ROOT, config.site.local_path || '.');

  // Read draft
  const draftPath = resolve(args.draft);
  const content = readFileSync(draftPath, 'utf-8');
  const title = extractTitle(content);

  // Set draft: false
  const published = setDraftFalse(content);

  // Determine destination path
  const fileName = basename(draftPath);
  const postsDir = resolve(siteRoot, 'src/content/posts');
  const destPath = resolve(postsDir, fileName);

  // Ensure posts directory exists
  mkdirSync(postsDir, { recursive: true });

  // Write to posts/
  writeFileSync(destPath, published, 'utf-8');

  // Remove from drafts/
  try {
    unlinkSync(draftPath);
  } catch {
    // Draft may not exist if already moved
  }

  console.error(`Published: ${fileName}`);
  console.error(`  From: ${draftPath}`);
  console.error(`  To:   ${destPath}`);

  // Git operations (run in the site repo, not the platform repo)
  try {
    git(`add "${destPath}"`, siteRoot);
    // Stage the deletion of the draft (ignore if untracked)
    try { git(`add "${draftPath}"`, siteRoot); } catch { /* untracked file, skip */ }
    git(`commit -m "publish: ${title}"`, siteRoot);
    git('push origin main', siteRoot);
    console.error('Git: committed and pushed.');
  } catch (err) {
    console.error(`Git error: ${err.message}`);
    process.exit(1);
  }

  // Mark entries as read (non-fatal)
  if (args.markRead && args.markRead.length > 0) {
    try {
      await markEntriesAsRead(args.markRead);
      console.error(`Marked ${args.markRead.length} entries as read.`);
    } catch (err) {
      console.error(`Warning: failed to mark entries as read: ${err.message}`);
      // Non-fatal — still exit 0
    }
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
