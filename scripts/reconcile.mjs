#!/usr/bin/env node
// Reconcile avatar definitions with deployed state.
//
// Scans avatars/*/ and for each:
//   - Validates soul.md + config.yaml exist and parse correctly
//   - Checks if the GitHub repo already exists (= deployed)
//   - If not deployed, runs init-site.mjs + fetch-feeds.mjs --sync
//
// Usage:
//   node scripts/reconcile.mjs              # Deploy new avatars
//   node scripts/reconcile.mjs --dry-run    # Preview only

import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
const GH = '/opt/homebrew/bin/gh';
const AVATARS_DIR = resolve(ROOT, 'avatars');
const SKIP_DIRS = new Set(['_template']);

// ── Arg parsing ──────────────────────────────────────────────

function parseArgs() {
  return { dryRun: process.argv.includes('--dry-run') };
}

// ── Discovery ────────────────────────────────────────────────

function discoverAvatars() {
  return readdirSync(AVATARS_DIR)
    .filter((name) => {
      if (name.startsWith('.') || SKIP_DIRS.has(name)) return false;
      return statSync(resolve(AVATARS_DIR, name)).isDirectory();
    });
}

// ── Config loading ───────────────────────────────────────────

function loadConfig(id) {
  const configPath = resolve(AVATARS_DIR, id, 'config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  return parseYaml(raw);
}

// ── Repo check ───────────────────────────────────────────────

function isRepoDeployed(repo) {
  try {
    execFileSync(GH, ['repo', 'view', repo, '--json', 'name'], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

// ── Init avatar ──────────────────────────────────────────────

function initAvatar(id) {
  console.log(`\n  Running init-site.mjs for ${id}...`);
  execFileSync('node', [resolve(ROOT, 'scripts/init-site.mjs'), '--avatar', id], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  console.log(`\n  Running fetch-feeds.mjs --sync for ${id}...`);
  execFileSync('node', [resolve(ROOT, 'scripts/fetch-feeds.mjs'), '--avatar', id, '--sync'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

// ── Summary ──────────────────────────────────────────────────

function printSummary(results) {
  const groups = { deployed: [], new: [], invalid: [], failed: [] };
  for (const r of results) {
    groups[r.status].push(r);
  }

  console.log('\n── Reconcile Summary ──────────────────────');
  console.log(`  Total avatars scanned: ${results.length}`);
  if (groups.deployed.length) {
    console.log(`  Already deployed:      ${groups.deployed.length}  (${groups.deployed.map((r) => r.id).join(', ')})`);
  }
  if (groups.new.length) {
    console.log(`  Newly initialized:     ${groups.new.length}  (${groups.new.map((r) => r.id).join(', ')})`);
  }
  if (groups.invalid.length) {
    console.log(`  Invalid (skipped):     ${groups.invalid.length}`);
    for (const r of groups.invalid) {
      console.log(`    - ${r.id}: ${r.reason}`);
    }
  }
  if (groups.failed.length) {
    console.log(`  Failed:                ${groups.failed.length}`);
    for (const r of groups.failed) {
      console.log(`    - ${r.id}: ${r.reason}`);
    }
  }
  console.log('───────────────────────────────────────────\n');
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  const { dryRun } = parseArgs();

  if (dryRun) {
    console.log('[DRY RUN] No changes will be made.\n');
  }

  const avatarIds = discoverAvatars();

  if (avatarIds.length === 0) {
    console.log('No avatar directories found in avatars/.');
    process.exit(0);
  }

  console.log(`Found ${avatarIds.length} avatar(s): ${avatarIds.join(', ')}\n`);

  const results = [];

  for (const id of avatarIds) {
    const soulPath = resolve(AVATARS_DIR, id, 'soul.md');
    const configPath = resolve(AVATARS_DIR, id, 'config.yaml');

    // Validate required files exist
    if (!existsSync(soulPath) || !existsSync(configPath)) {
      const missing = [];
      if (!existsSync(soulPath)) missing.push('soul.md');
      if (!existsSync(configPath)) missing.push('config.yaml');
      console.log(`[INVALID] ${id} — missing ${missing.join(', ')}`);
      results.push({ id, status: 'invalid', reason: `missing ${missing.join(', ')}` });
      continue;
    }

    // Validate config parses and has site.repo
    let config;
    try {
      config = loadConfig(id);
    } catch (err) {
      console.log(`[INVALID] ${id} — config.yaml parse error: ${err.message}`);
      results.push({ id, status: 'invalid', reason: `config.yaml parse error` });
      continue;
    }

    if (!config?.site?.repo) {
      console.log(`[INVALID] ${id} — config.yaml missing site.repo`);
      results.push({ id, status: 'invalid', reason: 'missing site.repo' });
      continue;
    }

    // Check if already deployed
    const repo = config.site.repo;
    if (isRepoDeployed(repo)) {
      console.log(`[DEPLOYED] ${id} — ${repo} already exists`);
      results.push({ id, status: 'deployed' });
      continue;
    }

    // New avatar — init
    console.log(`[NEW] ${id} — ${repo} not found, needs initialization`);

    if (dryRun) {
      console.log(`  Would run: init-site.mjs --avatar ${id}`);
      console.log(`  Would run: fetch-feeds.mjs --avatar ${id} --sync`);
      results.push({ id, status: 'new' });
      continue;
    }

    try {
      initAvatar(id);
      results.push({ id, status: 'new' });
    } catch (err) {
      console.error(`[FAILED] ${id} — ${err.message}`);
      results.push({ id, status: 'failed', reason: err.message });
    }
  }

  printSummary(results);

  const hasFailures = results.some((r) => r.status === 'failed');
  process.exit(hasFailures ? 1 : 0);
}

main();
