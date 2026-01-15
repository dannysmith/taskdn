import * as React from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { commands } from '@/lib/tauri-bindings'
import type { TaskStatus, Area, Project, Task } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { parseShortcut, matchesKeyboardEvent } from '@/lib/shortcuts'

import { QuickPaneCard } from './QuickPaneCard'
import { QuickPaneTitle } from './QuickPaneTitle'
import { QuickPaneBody } from './QuickPaneBody'
import { QuickPaneMetadata } from './QuickPaneMetadata'
import { QuickPaneFooter } from './QuickPaneFooter'

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard Shortcuts
// ─────────────────────────────────────────────────────────────────────────────

const SHORTCUTS = {
  setScheduledToday: parseShortcut('CmdOrCtrl+T'),
  openScheduled: parseShortcut('CmdOrCtrl+D'),
  openDue: parseShortcut('Shift+CmdOrCtrl+D'),
  openDefer: parseShortcut('Ctrl+Shift+CmdOrCtrl+D'),
  openStatus: parseShortcut('CmdOrCtrl+S'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets today's date in ISO format (YYYY-MM-DD).
 */
function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Management
// ─────────────────────────────────────────────────────────────────────────────

function applyTheme() {
  const theme = localStorage.getItem('ui-theme') || 'system'
  const root = document.documentElement

  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dismiss Helper
// ─────────────────────────────────────────────────────────────────────────────

async function dismissQuickPane() {
  const result = await commands.dismissQuickPane()
  if (result.status === 'error') {
    logger.error('Failed to dismiss quick pane', { error: result.error })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QuickPaneApp - Quick task capture interface.
 *
 * Features:
 * - Title input (focused on open)
 * - Optional body textarea (toggle with Cmd+Shift+Enter)
 * - Status, project, area selection
 * - Date buttons for scheduled, due, defer-until
 * - Cmd+Enter to save, Escape to cancel
 */
export default function QuickPaneApp() {
  // ─────────────────────────────────────────────────────────────────────────
  // Form State
  // ─────────────────────────────────────────────────────────────────────────

  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [showBody, setShowBody] = React.useState(false)
  const [status, setStatus] = React.useState<TaskStatus>('inbox')
  const [projectId, setProjectId] = React.useState<string | null>(null)
  const [areaId, setAreaId] = React.useState<string | null>(null)
  const [scheduled, setScheduled] = React.useState<string | null>(null)
  const [due, setDue] = React.useState<string | null>(null)
  const [deferUntil, setDeferUntil] = React.useState<string | null>(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Data State
  // ─────────────────────────────────────────────────────────────────────────

  const [areas, setAreas] = React.useState<Area[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])

  // ─────────────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────────────

  const [exiting, setExiting] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Track which popover is open (only one at a time)
  type PopoverType =
    | 'status'
    | 'project'
    | 'area'
    | 'scheduled'
    | 'due'
    | 'defer'
    | null
  const [openPopover, setOpenPopover] = React.useState<PopoverType>(null)

  // Track which textarea to restore focus to after popover closes
  type FocusTarget = 'title' | 'body' | null
  const [restoreFocusTo, setRestoreFocusTo] = React.useState<FocusTarget>(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────────────────────────────────

  const titleRef = React.useRef<HTMLTextAreaElement>(null)
  const bodyRef = React.useRef<HTMLTextAreaElement>(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Reset Form
  // ─────────────────────────────────────────────────────────────────────────

  const resetForm = React.useCallback(() => {
    setTitle('')
    setBody('')
    setShowBody(false)
    setStatus('inbox')
    setProjectId(null)
    setAreaId(null)
    setScheduled(null)
    setDue(null)
    setDeferUntil(null)
    setOpenPopover(null)
    setRestoreFocusTo(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Dismiss with Animation
  // ─────────────────────────────────────────────────────────────────────────

  const handleDismiss = React.useCallback(async () => {
    setExiting(true)
    // Wait for exit animation
    await new Promise(resolve => setTimeout(resolve, 100))
    await dismissQuickPane()
    // Reset form after dismiss
    resetForm()
    setExiting(false)
  }, [resetForm])

  // ─────────────────────────────────────────────────────────────────────────
  // Submit Handler
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = React.useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || isSubmitting) return

    setIsSubmitting(true)

    try {
      const result = await commands.createTask({
        title: trimmedTitle,
        status,
        projectId,
        areaId,
        scheduled,
        due,
        deferUntil,
      })

      if (result.status === 'error') {
        logger.error('Failed to create task', { error: result.error })
        setIsSubmitting(false)
        return
      }

      // If body was provided, update the task with body content
      if (body.trim()) {
        const updateResult = await commands.updateTask({
          id: result.data.id,
          title: null,
          status: null,
          project: null,
          area: null,
          scheduled: null,
          due: null,
          deferUntil: null,
          body: body.trim(),
        })

        if (updateResult.status === 'error') {
          logger.warn('Failed to add body to task', { error: updateResult.error })
        }
      }

      // Emit event for main window to update cache
      await emit('task-created', result.data as Task)

      logger.info('Task created via quick pane', { taskId: result.data.id })
    } catch (error) {
      logger.error('Unexpected error creating task', { error })
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    await handleDismiss()
  }, [
    title,
    body,
    status,
    projectId,
    areaId,
    scheduled,
    due,
    deferUntil,
    isSubmitting,
    handleDismiss,
  ])

  // ─────────────────────────────────────────────────────────────────────────
  // Theme Sync
  // ─────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    applyTheme()

    const unlisten = listen('theme-changed', () => {
      applyTheme()
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Focus & Data Loading
  // ─────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    const currentWindow = getCurrentWindow()
    const unlisten = currentWindow.onFocusChanged(async ({ payload: focused }) => {
      if (focused) {
        // Re-apply theme in case it changed while hidden
        applyTheme()

        // Reset form on focus (fresh start)
        resetForm()

        // Load areas and projects
        const [areasResult, projectsResult] = await Promise.all([
          commands.listAreas(),
          commands.listProjects(),
        ])

        if (areasResult.status === 'ok') {
          setAreas(areasResult.data)
        }
        if (projectsResult.status === 'ok') {
          setProjects(projectsResult.data)
        }

        // Focus title input
        setTimeout(() => titleRef.current?.focus(), 50)
      } else {
        // Dismiss on blur (unless we're already exiting)
        if (!exiting) {
          await handleDismiss()
        }
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [exiting, handleDismiss, resetForm])

  // ─────────────────────────────────────────────────────────────────────────
  // Focus Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Captures current focus if it's in title or body textarea.
   * Called before opening a popover via keyboard shortcut.
   */
  const captureCurrentFocus = React.useCallback(() => {
    if (document.activeElement === titleRef.current) {
      setRestoreFocusTo('title')
    } else if (document.activeElement === bodyRef.current) {
      setRestoreFocusTo('body')
    }
  }, [])

  // Restore focus when popover closes
  React.useEffect(() => {
    if (openPopover === null && restoreFocusTo) {
      const ref = restoreFocusTo === 'title' ? titleRef : bodyRef
      ref.current?.focus()
      setRestoreFocusTo(null)
    }
  }, [openPopover, restoreFocusTo])

  // ─────────────────────────────────────────────────────────────────────────
  // Global Keyboard Shortcuts
  // ─────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Escape - close popover or dismiss pane
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()

        if (openPopover) {
          // Close the open popover
          setOpenPopover(null)
        } else {
          // No popover open, dismiss the pane
          await handleDismiss()
        }
        return
      }

      // Cmd+T - set scheduled to today
      if (matchesKeyboardEvent(SHORTCUTS.setScheduledToday, e)) {
        e.preventDefault()
        setScheduled(getTodayISO())
        return
      }

      // Cmd+D - open scheduled date picker
      if (matchesKeyboardEvent(SHORTCUTS.openScheduled, e)) {
        e.preventDefault()
        captureCurrentFocus()
        setOpenPopover('scheduled')
        return
      }

      // Cmd+Shift+D - open due date picker
      if (matchesKeyboardEvent(SHORTCUTS.openDue, e)) {
        e.preventDefault()
        captureCurrentFocus()
        setOpenPopover('due')
        return
      }

      // Ctrl+Shift+Cmd+D - open defer date picker
      if (matchesKeyboardEvent(SHORTCUTS.openDefer, e)) {
        e.preventDefault()
        captureCurrentFocus()
        setOpenPopover('defer')
        return
      }

      // Cmd+S - open status picker
      if (matchesKeyboardEvent(SHORTCUTS.openStatus, e)) {
        e.preventDefault()
        captureCurrentFocus()
        setOpenPopover('status')
        return
      }

      // Cmd+Shift+Enter - toggle body
      if (e.key === 'Enter' && e.metaKey && e.shiftKey) {
        e.preventDefault()
        if (!showBody) {
          // Showing body - focus it after render
          setShowBody(true)
          setTimeout(() => bodyRef.current?.focus(), 50)
        } else {
          // Hiding body - focus title
          setShowBody(false)
          setTimeout(() => titleRef.current?.focus(), 50)
        }
        return
      }

      // Cmd+Enter - submit
      if (e.key === 'Enter' && e.metaKey && !e.shiftKey) {
        e.preventDefault()
        await handleSubmit()
        return
      }
    }

    // Capture phase to handle before any popover gets the event
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleDismiss, handleSubmit, openPopover, captureCurrentFocus, showBody])

  // ─────────────────────────────────────────────────────────────────────────
  // Title KeyDown Handler
  // ─────────────────────────────────────────────────────────────────────────

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent Enter from creating newlines in title
    if (e.key === 'Enter' && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      // Move focus to next field or submit if title is filled
      if (showBody) {
        bodyRef.current?.focus()
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const canSave = title.trim().length > 0 && !isSubmitting

  return (
    <QuickPaneCard exiting={exiting}>
      <QuickPaneTitle
        value={title}
        onChange={setTitle}
        onKeyDown={handleTitleKeyDown}
        inputRef={titleRef}
      />

      <QuickPaneBody
        value={body}
        onChange={setBody}
        visible={showBody}
        inputRef={bodyRef}
      />

      <QuickPaneMetadata
        status={status}
        onStatusChange={setStatus}
        scheduled={scheduled}
        onScheduledChange={d => setScheduled(d ?? null)}
        due={due}
        onDueChange={d => setDue(d ?? null)}
        deferUntil={deferUntil}
        onDeferUntilChange={d => setDeferUntil(d ?? null)}
        statusOpen={openPopover === 'status'}
        onStatusOpenChange={open => setOpenPopover(open ? 'status' : null)}
        scheduledOpen={openPopover === 'scheduled'}
        onScheduledOpenChange={open => setOpenPopover(open ? 'scheduled' : null)}
        dueOpen={openPopover === 'due'}
        onDueOpenChange={open => setOpenPopover(open ? 'due' : null)}
        deferOpen={openPopover === 'defer'}
        onDeferOpenChange={open => setOpenPopover(open ? 'defer' : null)}
      />

      <QuickPaneFooter
        onCancel={handleDismiss}
        onSave={handleSubmit}
        saveDisabled={!canSave}
        projectId={projectId}
        onProjectChange={id => setProjectId(id ?? null)}
        areaId={areaId}
        onAreaChange={id => setAreaId(id ?? null)}
        projects={projects}
        areas={areas}
        projectOpen={openPopover === 'project'}
        onProjectOpenChange={open => setOpenPopover(open ? 'project' : null)}
        areaOpen={openPopover === 'area'}
        onAreaOpenChange={open => setOpenPopover(open ? 'area' : null)}
      />
    </QuickPaneCard>
  )
}
