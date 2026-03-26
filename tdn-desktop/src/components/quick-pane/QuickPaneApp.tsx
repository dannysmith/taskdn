import * as React from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { format } from 'date-fns'

import { commands } from '@/lib/tauri-bindings'
import type { TaskStatus, Area, Project, Task } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { parseShortcut } from '@/lib/shortcuts'
import { applyThemeToDocument } from '@/lib/theme'

import { QuickPaneCard } from './QuickPaneCard'
import { QuickPaneTitle } from './QuickPaneTitle'
import { QuickPaneBody } from './QuickPaneBody'
import { QuickPaneMetadata } from './QuickPaneMetadata'
import { QuickPaneFooter } from './QuickPaneFooter'
import { useQuickPaneKeyboard } from './useQuickPaneKeyboard'

// ─────────────────────────────────────────────────────────────────────────────
// Animation Timing (must match quick-pane.css custom properties)
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_DELAY_MS = 50
const EXIT_ANIMATION_MS = 100

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard Shortcuts
// ─────────────────────────────────────────────────────────────────────────────

const SHORTCUTS = {
  setScheduledToday: parseShortcut('CmdOrCtrl+T'),
  openScheduled: parseShortcut('CmdOrCtrl+D'),
  openDue: parseShortcut('Shift+CmdOrCtrl+D'),
  openDefer: parseShortcut('Ctrl+Shift+CmdOrCtrl+D'),
  openStatus: parseShortcut('CmdOrCtrl+S'),
  processWithAI: parseShortcut('Shift+CmdOrCtrl+A'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Tracks which popover is currently open (only one at a time) */
export type PopoverType =
  | 'status'
  | 'project'
  | 'area'
  | 'scheduled'
  | 'due'
  | 'defer'
  | null

/** Tracks which textarea to restore focus to after popover closes */
type FocusTarget = 'title' | 'body' | null

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets today's date in ISO format (YYYY-MM-DD) using local timezone.
 * Uses date-fns to avoid UTC conversion issues with toISOString().
 */
function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
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
  const [isProcessingAI, setIsProcessingAI] = React.useState(false)
  const [aiAvailable, setAiAvailable] = React.useState(false)
  const [openPopover, setOpenPopover] = React.useState<PopoverType>(null)
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
  // Auto-Ready: promote inbox → ready when task appears "processed"
  // A task with (project or area) AND (scheduled or defer-until) has enough
  // context that it doesn't need to sit in the inbox for manual processing.
  // ─────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    const hasProjectOrArea = projectId !== null || areaId !== null
    const hasScheduleOrDefer = scheduled !== null || deferUntil !== null

    if (hasProjectOrArea && hasScheduleOrDefer) {
      setStatus(prev => (prev === 'inbox' ? 'ready' : prev))
    }
  }, [projectId, areaId, scheduled, deferUntil])

  // ─────────────────────────────────────────────────────────────────────────
  // Dismiss with Animation
  // ─────────────────────────────────────────────────────────────────────────

  const handleDismiss = React.useCallback(async () => {
    // Close any open popover immediately to prevent flash on next open
    setOpenPopover(null)
    setExiting(true)
    // Wait for exit animation
    await new Promise(resolve => setTimeout(resolve, EXIT_ANIMATION_MS))
    await dismissQuickPane()
    // Reset remaining form state after dismiss
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
          logger.warn('Failed to add body to task', {
            error: updateResult.error,
          })
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
  // AI Processing Handler
  // ─────────────────────────────────────────────────────────────────────────

  const handleProcessWithAI = React.useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || isProcessingAI) return

    setIsProcessingAI(true)

    try {
      // Build context with project→area relationships
      const stripWikilink = (s: string) =>
        s.startsWith('[[') && s.endsWith(']]') ? s.slice(2, -2) : s
      const projectContexts = projects.map(p => ({
        id: p.id,
        name: p.title,
        areaName: p.area ? stripWikilink(p.area) : null,
      }))
      const areaPairs = areas.map(a => ({ id: a.id, name: a.title }))

      const result = await commands.processQuickEntryText(
        trimmedTitle,
        projectContexts,
        areaPairs
      )

      if (result.status === 'error') {
        logger.warn('AI processing failed', { error: result.error })
        setIsProcessingAI(false)
        return
      }

      const parsed = result.data

      // Populate form fields from AI result
      setTitle(parsed.title)

      if (parsed.body) {
        setBody(parsed.body)
        setShowBody(true)
      }

      // Map status string to TaskStatus
      const validStatuses: TaskStatus[] = [
        'inbox',
        'icebox',
        'ready',
        'in-progress',
        'blocked',
        'dropped',
        'done',
      ]
      if (validStatuses.includes(parsed.status as TaskStatus)) {
        setStatus(parsed.status as TaskStatus)
      }

      if (parsed.due) setDue(parsed.due)
      if (parsed.scheduled) setScheduled(parsed.scheduled)
      if (parsed.deferUntil) setDeferUntil(parsed.deferUntil)
      if (parsed.projectId) setProjectId(parsed.projectId)
      if (parsed.areaId) setAreaId(parsed.areaId)

      logger.info('AI processing complete')
    } catch (error) {
      logger.error('Unexpected error during AI processing', { error })
    }

    setIsProcessingAI(false)
  }, [title, projects, areas, isProcessingAI])

  // ─────────────────────────────────────────────────────────────────────────
  // Theme Sync
  // ─────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    applyThemeToDocument()

    const unlisten = listen('theme-changed', () => {
      applyThemeToDocument()
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
    const unlisten = currentWindow.onFocusChanged(
      async ({ payload: focused }) => {
        if (focused) {
          // Re-apply theme in case it changed while hidden
          applyThemeToDocument()

          // Reset form on focus (fresh start)
          resetForm()

          // Load areas, projects, and check AI availability
          const [areasResult, projectsResult, aiResult] = await Promise.all([
            commands.listAreas(),
            commands.listProjects(),
            commands.checkAppleIntelligenceAvailable(),
          ])

          if (areasResult.status === 'ok') {
            setAreas(areasResult.data)
          }
          if (projectsResult.status === 'ok') {
            setProjects(projectsResult.data)
          }

          setAiAvailable(aiResult)

          // Focus title input
          setTimeout(() => titleRef.current?.focus(), FOCUS_DELAY_MS)
        } else {
          // Dismiss on blur (unless we're already exiting)
          if (!exiting) {
            await handleDismiss()
          }
        }
      }
    )

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

  useQuickPaneKeyboard({
    onDismiss: handleDismiss,
    onSubmit: handleSubmit,
    onToggleBody: show => {
      setShowBody(show)
      setTimeout(
        () => (show ? bodyRef : titleRef).current?.focus(),
        FOCUS_DELAY_MS
      )
    },
    onSetScheduledToday: () => setScheduled(getTodayISO()),
    onOpenPopover: popover => {
      captureCurrentFocus()
      setOpenPopover(popover)
    },
    onClosePopover: () => setOpenPopover(null),
    onProcessWithAI: aiAvailable ? handleProcessWithAI : undefined,
    captureCurrentFocus,
    openPopover,
    showBody,
    shortcuts: SHORTCUTS,
  })

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
        aiAvailable={aiAvailable}
        aiProcessing={isProcessingAI}
        onProcessWithAI={handleProcessWithAI}
      />

      <QuickPaneBody
        value={body}
        onChange={setBody}
        visible={showBody}
        inputRef={bodyRef}
      />

      <QuickPaneMetadata
        status={{
          value: status,
          onChange: setStatus,
          open: openPopover === 'status',
          onOpenChange: open => setOpenPopover(open ? 'status' : null),
        }}
        scheduled={{
          value: scheduled ?? undefined,
          onChange: d => setScheduled(d ?? null),
          open: openPopover === 'scheduled',
          onOpenChange: open => setOpenPopover(open ? 'scheduled' : null),
        }}
        due={{
          value: due ?? undefined,
          onChange: d => setDue(d ?? null),
          open: openPopover === 'due',
          onOpenChange: open => setOpenPopover(open ? 'due' : null),
        }}
        defer={{
          value: deferUntil ?? undefined,
          onChange: d => setDeferUntil(d ?? null),
          open: openPopover === 'defer',
          onOpenChange: open => setOpenPopover(open ? 'defer' : null),
        }}
      />

      <QuickPaneFooter
        onCancel={handleDismiss}
        onSave={handleSubmit}
        saveDisabled={!canSave}
        project={{
          value: projectId ?? undefined,
          onChange: id => setProjectId(id ?? null),
          options: projects,
          open: openPopover === 'project',
          onOpenChange: open => setOpenPopover(open ? 'project' : null),
        }}
        area={{
          value: areaId ?? undefined,
          onChange: id => setAreaId(id ?? null),
          options: areas,
          open: openPopover === 'area',
          onOpenChange: open => setOpenPopover(open ? 'area' : null),
        }}
      />
    </QuickPaneCard>
  )
}
