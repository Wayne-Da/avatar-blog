import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
    title: z.string(),
    description: z.string(),
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

const posts = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
    schema: postSchema,
});

const drafts = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/drafts' }),
    schema: postSchema,
});

export const collections = { posts, drafts };
