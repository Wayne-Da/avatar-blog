#!/usr/bin/env node
// Validate a blog post draft against hard rules and soft rule hints.
//
// Usage: node scripts/validate.mjs <file-path>
// Output: JSON to stdout with { valid, hardRules, softRuleHints }

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { z } from 'zod';

// Zod schema — mirrors src/content.config.ts
const postSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().min(1, 'description is required'),
  publishDate: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
      }),
    )
    .default([]),
  draft: z.boolean().default(false),
});

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: content };
  }

  // Simple YAML parser for frontmatter (handles our known schema)
  const raw = match[1];
  const body = match[2];
  const data = {};
  let currentKey = null;
  let currentArray = null;
  let currentObject = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trimEnd();

    // Top-level key: value
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch && !trimmed.startsWith('  ')) {
      // Save previous array if any
      if (currentKey && currentArray !== null) {
        data[currentKey] = currentArray;
        currentArray = null;
        currentObject = null;
      }

      const key = kvMatch[1];
      let value = kvMatch[2].trim();

      if (value === '' || value === '[]') {
        // Could be start of array or empty value
        currentKey = key;
        if (value === '[]') {
          data[key] = [];
          currentKey = null;
        } else {
          currentArray = [];
        }
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array: ["tag1", "tag2"]
        data[key] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        currentKey = null;
      } else if (value === 'true') {
        data[key] = true;
        currentKey = null;
      } else if (value === 'false') {
        data[key] = false;
        currentKey = null;
      } else {
        data[key] = value.replace(/^["']|["']$/g, '');
        currentKey = null;
      }
      continue;
    }

    // Array item: "  - key: value" or "  - value"
    if (currentKey && currentArray !== null) {
      const arrayItemMatch = trimmed.match(/^\s+-\s+(.+)$/);
      if (arrayItemMatch) {
        const itemVal = arrayItemMatch[1];
        // Check if it's a key-value pair (object start)
        const objKv = itemVal.match(/^(\w+):\s*(.*)$/);
        if (objKv) {
          currentObject = { [objKv[1]]: objKv[2].replace(/^["']|["']$/g, '') };
          currentArray.push(currentObject);
        } else {
          currentObject = null;
          currentArray.push(itemVal.replace(/^["']|["']$/g, ''));
        }
        continue;
      }

      // Object continuation: "    key: value"
      if (currentObject) {
        const contMatch = trimmed.match(/^\s{4,}(\w+):\s*(.*)$/);
        if (contMatch) {
          currentObject[contMatch[1]] = contMatch[2].replace(/^["']|["']$/g, '');
          continue;
        }
      }
    }
  }

  // Flush last array
  if (currentKey && currentArray !== null) {
    data[currentKey] = currentArray;
  }

  return { frontmatter: data, body };
}

function validateHardRules(filePath, frontmatter, body) {
  const errors = [];
  const fileName = basename(filePath);

  // 1. Schema validation
  const schemaResult = postSchema.safeParse(frontmatter);
  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      errors.push(`schema: ${issue.path.join('.')} — ${issue.message}`);
    }
  }

  // 2. Body length >= 200 chars
  const bodyText = body.trim();
  if (bodyText.length < 200) {
    errors.push(`body too short: ${bodyText.length} chars (minimum 200)`);
  }

  // 3. At least 1 source
  const sources = frontmatter?.sources || [];
  if (sources.length === 0) {
    errors.push('at least 1 source is required');
  }

  // 4. File naming convention
  if (!fileName.match(/^\d{4}-\d{2}-\d{2}-.+\.md$/)) {
    errors.push(`file name must match YYYY-MM-DD-*.md pattern (got "${fileName}")`);
  }

  // 5. No TODO/FIXME
  if (/\bTODO\b|\bFIXME\b/i.test(body)) {
    errors.push('body contains TODO or FIXME markers');
  }

  return errors;
}

function checkSoftRules(frontmatter, body) {
  const hints = [];

  const sources = frontmatter?.sources || [];
  const tags = frontmatter?.tags || [];
  const description = frontmatter?.description || '';

  // Source diversity
  if (sources.length < 2) {
    hints.push('Consider citing multiple sources for better diversity');
  }

  // Tag count
  if (tags.length < 2) {
    hints.push('Consider adding more tags (recommend 2-5)');
  } else if (tags.length > 7) {
    hints.push('Too many tags — consider narrowing to 3-5');
  }

  // Description length
  if (description.length < 20) {
    hints.push('Description is very short — aim for a meaningful summary');
  } else if (description.length > 200) {
    hints.push('Description is quite long — keep it concise');
  }

  // Heading structure
  const headings = body.match(/^#{1,3}\s+.+$/gm) || [];
  if (headings.length === 0 && body.trim().length > 500) {
    hints.push('Long post without headings — consider adding section headers');
  }

  return hints;
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/validate.mjs <file-path>');
    process.exit(1);
  }

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Cannot read file: ${err.message}`);
    process.exit(1);
  }

  const { frontmatter, body } = parseFrontmatter(content);

  if (!frontmatter) {
    console.log(
      JSON.stringify(
        {
          valid: false,
          hardRules: ['Missing YAML frontmatter (file must start with ---)'],
          softRuleHints: [],
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const hardErrors = validateHardRules(filePath, frontmatter, body);
  const softHints = checkSoftRules(frontmatter, body);

  const result = {
    valid: hardErrors.length === 0,
    hardRules: hardErrors,
    softRuleHints: softHints,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
