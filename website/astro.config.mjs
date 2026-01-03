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
      sidebar: [],
    }),
  ],
})
