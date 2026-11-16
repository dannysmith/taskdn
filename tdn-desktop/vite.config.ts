import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import packageJson from './package.json' with { type: 'json' }

const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  // TASKDN_DEV_TITLE comes from `tauri:dev` (scripts/dev-slot.ts)
  envPrefix: ['VITE_', 'TASKDN_DEV_'],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset({ target: '19' })] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600, // Prevent warnings for template's bundled components
    rolldownOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        'quick-pane': path.resolve(import.meta.dirname, 'quick-pane.html'),
      },
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available. `tauri:dev`
  // sets it per dev slot (scripts/dev-slot.ts), so each worktree gets its own
  server: {
    port: Number(process.env.TASKDN_DEV_PORT ?? 1520),
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1521,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
}))
