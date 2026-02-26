#!/usr/bin/env node
// Initialize a new avatar site repo from the template.
//
// Usage: node scripts/init-site.mjs --avatar <id>
//
// Steps:
//   1. Read config.yaml + soul.md for the avatar
//   2. gh repo create + clone
//   3. Copy template/ into the new repo
//   4. Generate site-config.json from config + soul data
//   5. npm install + initial commit + push
//   6. Enable GitHub Pages via gh api

import { readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
const GH = '/opt/homebrew/bin/gh';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--avatar' && args[i + 1]) {
      result.avatar = args[++i];
    }
  }
  return result;
}

function loadConfig(avatarId) {
  const configPath = resolve(ROOT, 'avatars', avatarId, 'config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  return parseYaml(raw);
}

function parseSoulFrontmatter(avatarId) {
  const soulPath = resolve(ROOT, 'avatars', avatarId, 'soul.md');
  const raw = readFileSync(soulPath, 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return parseYaml(match[1]);
}

function run(cmd, cwd) {
  console.error(`  $ ${cmd}`);
  return execSync(cmd, { cwd: cwd || ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function main() {
  const args = parseArgs();

  if (!args.avatar) {
    console.error('Usage: node scripts/init-site.mjs --avatar <id>');
    process.exit(1);
  }

  const avatarId = args.avatar;
  const config = loadConfig(avatarId);
  const soul = parseSoulFrontmatter(avatarId);

  const repo = config.site.repo;
  const localPath = resolve(ROOT, config.site.local_path || `../${avatarId}`);
  const basePath = config.site.base_path || `/${avatarId}`;
  const repoName = basename(repo);
  const owner = repo.split('/')[0];

  console.error(`\nInitializing site for avatar: ${avatarId}`);
  console.error(`  Repo:       ${repo}`);
  console.error(`  Local path: ${localPath}`);
  console.error(`  Base path:  ${basePath}`);

  // Step 1: Create GitHub repo
  if (existsSync(localPath)) {
    console.error(`\n  Local path already exists: ${localPath}`);
    console.error('  Skipping repo creation. Using existing directory.');
  } else {
    console.error('\nStep 1: Creating GitHub repo...');
    try {
      run(`${GH} repo create ${repo} --public --clone --description "AI-driven blog: ${soul.name || avatarId}"`, resolve(localPath, '..'));
    } catch (err) {
      // Repo may already exist on GitHub — try cloning instead
      console.error(`  Repo creation failed (may already exist), trying clone...`);
      run(`git clone https://github.com/${repo}.git "${localPath}"`, ROOT);
    }
  }

  // Step 2: Copy template
  console.error('\nStep 2: Copying template...');
  const templateDir = resolve(ROOT, 'template');
  cpSync(templateDir, localPath, { recursive: true });
  console.error('  Template copied.');

  // Step 3: Generate site-config.json
  console.error('\nStep 3: Generating site-config.json...');
  const siteConfig = {
    avatarId,
    siteUrl: `https://${owner}.github.io`,
    basePath,
    title: soul.name || avatarId,
    tagline: soul.tagline || 'AI-driven blog',
    description: `AI-driven blog powered by ${soul.name || avatarId}`,
    footer: 'Powered by Avatar Blog Agent',
  };
  writeFileSync(resolve(localPath, 'site-config.json'), JSON.stringify(siteConfig, null, 2) + '\n', 'utf-8');
  console.error('  site-config.json written.');

  // Step 4: Update package.json name
  const pkgPath = resolve(localPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.name = repoName;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.error(`  package.json name set to: ${repoName}`);

  // Step 5: npm install
  console.error('\nStep 4: Installing dependencies...');
  run('npm install', localPath);
  console.error('  Dependencies installed.');

  // Step 6: Initial commit + push
  console.error('\nStep 5: Committing and pushing...');
  try {
    run('git add -A', localPath);
    run(`git commit -m "initial commit: site from avatar-blog template"`, localPath);
    run('git push -u origin main', localPath);
    console.error('  Pushed to GitHub.');
  } catch (err) {
    console.error(`  Git push note: ${err.message}`);
  }

  // Step 7: Enable GitHub Pages (must be done before deploy workflow triggers)
  console.error('\nStep 6: Enabling GitHub Pages...');
  try {
    run(`${GH} api repos/${repo}/pages -X POST -f build_type=workflow`);
    console.error('  GitHub Pages enabled (Actions build).');
  } catch (err) {
    // Pages may already be configured
    console.error(`  Pages note: ${err.message}`);
  }

  // Step 8: Re-trigger deploy workflow (first push may fail if Pages wasn't ready)
  console.error('\nStep 7: Triggering deploy workflow...');
  try {
    run(`${GH} workflow run deploy.yml --repo ${repo}`);
    console.error('  Deploy workflow triggered.');
  } catch (err) {
    console.error(`  Deploy trigger note: ${err.message}`);
  }

  console.error(`\nDone! Site will be available at: https://${owner}.github.io${basePath}/`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
