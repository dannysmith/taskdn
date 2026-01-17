import { render, screen, waitFor } from '@/test/test-utils'
import { describe, it, expect } from 'vitest'
import App from './App'

// Tauri bindings are mocked globally in src/test/setup.ts

describe('App', () => {
  it('renders main window layout with Today view', async () => {
    render(<App />)

    // Default view is "Today" from navigation store
    // Wait for async initialization to complete
    await waitFor(() => {
      // Should render at least one "Today" heading (view header and/or sidebar)
      const headings = screen.getAllByRole('heading', { name: /today/i })
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders macOS window control buttons', async () => {
    render(<App />)

    // Wait for async effects to settle
    await waitFor(() => {
      // macOS window controls have specific aria-labels
      expect(
        screen.getByRole('button', { name: 'Close window' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Minimize window' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Enter fullscreen' })
      ).toBeInTheDocument()
    })
  })
})
