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
      customCss: ['./src/styles/docs-demos.css'],
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
          label: '🚀 Start Here',
          items: [
            {
              slug: 'getting-started',
            },
            {
              slug: 'philosophy',
            },
            {
              slug: 'setup',
            },
          ],
        },
        {
          label: '🖥️ Desktop App',
          items: [
            {
              slug: 'desktop/overview',
            },
            {
              slug: 'desktop/task-details-panel',
            },
            {
              slug: 'desktop/views',
            },
            {
              slug: 'desktop/working-with-lists',
            },
            {
              slug: 'desktop/working-with-kanban-and-calendars',
            },
            {
              slug: 'desktop/quick-entry-pane',
            },
            {
              slug: 'desktop/command-palette',
            },
            {
              slug: 'desktop/menus-and-shortcuts',
            },
            {
              slug: 'desktop/preferences',
            },
            {
              slug: 'desktop/url-scheme',
            },
            {
              slug: 'desktop/keyboard-navigation',
            },
          ],
        },
        {
          label: '⌨️ CLI',
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
          label: '💎 Obsidian',
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
          label: '🤖 Claude Code',
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
          label: '📋 Specification',
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
          label: '📚 Reference',
          collapsed: true,
          items: [
            {
              slug: 'reference/cli/cli-reference',
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
        {
          label: '🛠️ Developer',
          collapsed: true,
          items: [
            {
              slug: 'developer/contributing',
            },
            {
              slug: 'developer/roadmap',
            },
          ],
        },
        {
          label: 'Releases',
          link: '/releases/',
        },
      ],
    }),
  ],
})
