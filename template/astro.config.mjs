// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

const siteConfig = JSON.parse(readFileSync('./site-config.json', 'utf-8'));

// https://astro.build/config
export default defineConfig({
    site: siteConfig.siteUrl,
    base: siteConfig.basePath,
    output: 'static',
});
