import type { Theme } from '@/lib/theme-context'

/** Default storage key for theme preference. Must match ThemeProvider default. */
export const THEME_STORAGE_KEY = 'ui-theme'

/**
 * Applies the current theme to the document root.
 * Used by standalone windows (quick pane) that don't have ThemeProvider.
 */
export function applyThemeToDocument(): void {
  const theme = localStorage.getItem(THEME_STORAGE_KEY) || 'system'
  const root = document.documentElement

  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    return stored
  }
  return 'system'
}
