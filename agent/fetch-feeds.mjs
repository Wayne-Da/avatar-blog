import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fetchFeeds() {
    // Dynamically import rss-parser
    const { default: Parser } = await import('rss-parser');
    const parser = new Parser({
        timeout: 10000,
        headers: {
            'User-Agent': 'AvatarBlog/1.0',
        },
    });

    // Read feeds config
    const feedsConfig = parseYaml(
        readFileSync(join(__dirname, 'feeds.yaml'), 'utf-8'),
    );

    const enabledFeeds = feedsConfig.feeds.filter((f) => f.enabled !== false);
    console.log(`📡 Fetching ${enabledFeeds.length} feed(s)...\n`);

    const results = [];

    for (const feed of enabledFeeds) {
        try {
            console.log(`  ⏳ ${feed.name}...`);
            const parsed = await parser.parseURL(feed.url);

            const items = (parsed.items || []).slice(0, 20).map((item) => ({
                feedName: feed.name,
                category: feed.category || 'uncategorized',
                priority: feed.priority || 'medium',
                title: item.title || '',
                link: item.link || '',
                summary:
                    item.contentSnippet || item.content?.slice(0, 300) || '',
                pubDate: item.pubDate || item.isoDate || '',
            }));

            results.push(...items);
            console.log(`  ✅ ${feed.name}: ${items.length} items`);
        } catch (err) {
            console.error(`  ❌ ${feed.name}: ${err.message}`);
        }
    }

    // Write output
    const dataDir = join(__dirname, 'data');
    mkdirSync(dataDir, { recursive: true });

    const outputPath = join(dataDir, 'raw-feeds.json');
    writeFileSync(
        outputPath,
        JSON.stringify(
            {
                fetchedAt: new Date().toISOString(),
                totalItems: results.length,
                items: results,
            },
            null,
            2,
        ),
    );

    console.log(`\n📦 Saved ${results.length} items to ${outputPath}`);
}

fetchFeeds().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
