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
      plugins: [
        starlightThemeFlexoki({ accentColor: 'blue' }),
        starlightLlmsTxt(),
      ],
      title: 'Taskdn',
      components: {
        Footer: './src/components/Footer.astro',
      },
      logo: {
        src: './src/assets/icon-1024-trans.png',
        alt: 'Taskdn Logo',
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
          label: 'Start Here',
          items: [
            {
              slug: 'getting-started',
            },
            {
              slug: 'philosophy',
            },
          ],
        },
        {
          label: 'Desktop App',
          badge: {
            text: 'Soon',
            variant: 'note',
          },
          items: [
            {
              slug: 'desktop/overview',
            },
          ],
        },
        {
          label: 'CLI',
          items: [
            {
              slug: 'cli/overview',
            },
            {
              slug: 'cli/read-commands',
            },
            {
              slug: 'cli/write-commands',
            },
            {
              slug: 'cli/working-with-ai',
            },
          ],
        },
        {
          label: 'Obsidian Integration',
          items: [
            {
              slug: 'obsidian/plugin',
            },
            {
              slug: 'obsidian/starter-vault',
            },
          ],
        },
        {
          label: 'Claude Code Plugin',
          items: [
            {
              slug: 'claude-code/overview',
            },
            {
              slug: 'claude-code/skill',
            },
            {
              slug: 'claude-code/slash-commands',
            },
          ],
        },
        {
          label: 'The Specification',
          items: [
            {
              slug: 'specification/overview',
            },
            {
              slug: 'specification/s1-core',
            },
            {
              slug: 'specification/s2-implementation',
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            {
              slug: 'reference/cli/cli-reference',
            },
            {
              slug: 'reference/cli/obsidian-plugin-reference',
            },
            {
              label: 'Desktop App',
              items: [
                {
                  slug: 'reference/desktop-reference/url-scheme',
                },
                {
                  slug: 'reference/desktop-reference/keyboard-shortcuts',
                },
              ],
            },
          ],
        },
      ],
    }),
  ],
})
