// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightThemeFlexoki from 'starlight-theme-flexoki'
import starlightLlmsTxt from 'starlight-llms-txt'

// https://astro.build/config
export default defineConfig({
  site: 'https://tdn.danny.is',
  integrations: [
    starlight({
      plugins: [starlightThemeFlexoki({ accentColor: 'blue' }), starlightLlmsTxt()],
      title: 'Taskdn',
      logo: {
        src: './src/assets/icon-1024-trans.png',
        alt: 'Taskdn',
      },
      favicon: '/icon-crop.png',
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
        // Analytics
        {
          tag: 'script',
          attrs: {
            async: true,
            src: 'https://scripts.simpleanalyticscdn.com/latest.js',
          },
        },
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Overview', slug: 'guides' },
            {
              label: 'Getting Started',
              autogenerate: { directory: 'guides/getting-started' },
            },
            {
              label: 'CLI',
              autogenerate: { directory: 'guides/cli' },
            },
            {
              label: 'Desktop App',
              badge: { text: 'Soon', variant: 'note' },
              autogenerate: { directory: 'guides/desktop' },
            },
            {
              label: 'Claude Code Plugin',
              autogenerate: { directory: 'guides/claude-code' },
            },
            {
              label: 'Obsidian Plugin',
              autogenerate: { directory: 'guides/obsidian' },
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Overview', slug: 'reference' },
            {
              label: 'Specification',
              autogenerate: { directory: 'reference/specification' },
            },
            {
              label: 'CLI',
              autogenerate: { directory: 'reference/cli' },
            },
            {
              label: 'Desktop App',
              badge: { text: 'Soon', variant: 'note' },
              autogenerate: { directory: 'reference/desktop' },
            },
            {
              label: 'Obsidian Plugin',
              slug: 'reference/obsidian',
            },
          ],
        },
        {
          label: 'Developer',
          autogenerate: { directory: 'developer' },
        },
        {
          label: 'Changelog',
          slug: 'changelog',
        },
      ],
    }),
  ],
})
