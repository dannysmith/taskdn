import { defineCollection } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { z } from 'astro:content'

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        date: z.coerce.date().optional(),
        product: z
          .enum([
            'cli',
            'desktop',
            'obsidian',
            'claude-plugin',
            'spec',
            'vault',
          ])
          .optional(),
      }),
    }),
  }),
}
