// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightThemeFlexoki from 'starlight-theme-flexoki'
import starlightLlmsTxt from 'starlight-llms-txt'

// https://astro.build/config
export default defineConfig({
  site: 'https://taskdn.com',
  integrations: [
    starlight({
      plugins: [starlightThemeFlexoki(), starlightLlmsTxt()],
      title: 'Taskdn',
      description:
        'A plaintext task management system for individuals. Store tasks as markdown files, manipulate them via CLI, desktop app, or AI assistants.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/dannysmith/taskdn',
        },
      ],
      head: [
        // Open Graph
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'meta', attrs: { property: 'og:site_name', content: 'Taskdn' } },
        // Twitter Card
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
      ],
      sidebar: [],
    }),
  ],
})
