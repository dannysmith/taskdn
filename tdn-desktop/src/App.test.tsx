import { render, screen, waitFor } from '@/test/test-utils'
import { describe, it, expect } from 'vitest'
import App from './App'

// Tauri bindings are mocked globally in src/test/setup.ts

describe('App', () => {
  it('renders main window layout', async () => {
    render(<App />)

    // Wait for async effects to settle, then verify render
    // Default view is "Today" from navigation store
    // Multiple "Today" elements exist (sidebar nav + view header)
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { name: /today/i })
      expect(headings.length).toBeGreaterThan(0)
    })
  })

  it('renders title bar with traffic light buttons', async () => {
    render(<App />)

    // Wait for async effects to settle, then verify render
    await waitFor(() => {
      const titleBarButtons = screen
        .getAllByRole('button')
        .filter(
          button =>
            button.getAttribute('aria-label')?.includes('window') ||
            button.className.includes('window-control')
        )
      // Should have at least the window control buttons
      expect(titleBarButtons.length).toBeGreaterThan(0)
    })
  })
})
