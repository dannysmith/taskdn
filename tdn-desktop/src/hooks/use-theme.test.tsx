import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useTheme } from './use-theme'
import { ThemeProviderContext } from '@/lib/theme-context'
import type { ThemeProviderState } from '@/lib/theme-context'

describe('useTheme', () => {
  // Note: ThemeProviderContext has a default value, so the hook returns defaults
  // when used outside a provider instead of throwing. The throw check in the hook
  // is defensive code for if the context was created without a default.
  it('returns default values when used outside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme())

    // Should get the default context values
    expect(result.current.theme).toBe('system')
    expect(typeof result.current.setTheme).toBe('function')
  })

  it('returns context value when used within ThemeProvider', () => {
    const mockSetTheme = vi.fn()
    const mockState: ThemeProviderState = {
      theme: 'dark',
      setTheme: mockSetTheme,
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProviderContext.Provider value={mockState}>
        {children}
      </ThemeProviderContext.Provider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('dark')
    expect(result.current.setTheme).toBe(mockSetTheme)
  })

  it('returns system theme when configured', () => {
    const mockState: ThemeProviderState = {
      theme: 'system',
      setTheme: vi.fn(),
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProviderContext.Provider value={mockState}>
        {children}
      </ThemeProviderContext.Provider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('system')
  })

  it('returns light theme when configured', () => {
    const mockState: ThemeProviderState = {
      theme: 'light',
      setTheme: vi.fn(),
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProviderContext.Provider value={mockState}>
        {children}
      </ThemeProviderContext.Provider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('light')
  })

  it('setTheme function is callable', () => {
    const mockSetTheme = vi.fn()
    const mockState: ThemeProviderState = {
      theme: 'light',
      setTheme: mockSetTheme,
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProviderContext.Provider value={mockState}>
        {children}
      </ThemeProviderContext.Provider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    result.current.setTheme('dark')

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })
})
