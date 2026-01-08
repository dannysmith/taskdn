import * as React from 'react'
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx,
} from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { history } from '@milkdown/kit/plugin/history'
import { listItemBlockComponent } from '@milkdown/components/list-item-block'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { InputRule, inputRules } from '@milkdown/kit/prose/inputrules'

import { cn } from '@/lib/utils'

// Import minimal ProseMirror base styles
import '@milkdown/kit/prose/view/style/prosemirror.css'

/**
 * MilkdownEditor - Rich markdown editor for task notes.
 *
 * Built on Milkdown (which uses ProseMirror under the hood). Supports:
 * - CommonMark and GFM (tables, strikethrough, task lists)
 * - Interactive checkboxes via listItemBlockComponent
 * - Undo/redo via history plugin
 *
 * Custom enhancements:
 * - "[] " at start of line creates a task list item (checkbox)
 * - Pasting URL over selected text creates a markdown link
 * - Cmd/Ctrl+Click on links opens them in new tab
 *
 * Styling is in src/index.css under .milkdown-editor.
 */

// -----------------------------------------------------------------------------
// Custom Editor Enhancements Plugin
// -----------------------------------------------------------------------------

// URL regex for detecting links in pasted content
const URL_REGEX = /^https?:\/\/[^\s]+$/

/**
 * Input rule: Convert "[] " at start of paragraph to a task list item
 * Creates: bullet_list > list_item(checked=false) > paragraph
 */
const checkboxShortcutPlugin = $prose(() => {
  const checkboxInputRule = new InputRule(
    /^\[\]\s$/,
    (state, _match, start, end) => {
      const bulletListType = state.schema.nodes.bullet_list
      const listItemType = state.schema.nodes.list_item
      const paragraphType = state.schema.nodes.paragraph

      if (!bulletListType || !listItemType || !paragraphType) return null

      // Get the position info
      const $start = state.doc.resolve(start)

      // Only apply at start of a paragraph that's not already in a list
      if ($start.parent.type.name !== 'paragraph') return null
      if ($start.depth > 1) {
        const grandparent = $start.node($start.depth - 1)
        if (grandparent.type.name === 'list_item') return null
      }

      // Get content after the "[] " that we're replacing
      const paragraphContent = $start.parent.content.cut(end - $start.start())

      // Create: bullet_list > list_item(checked=false) > paragraph(remaining content)
      const paragraph = paragraphType.create(null, paragraphContent)
      const listItem = listItemType.create({ checked: false }, paragraph)
      const bulletList = bulletListType.create(null, listItem)

      // Replace the entire paragraph with the new list
      const tr = state.tr.replaceWith(
        $start.before(),
        $start.after(),
        bulletList
      )

      return tr
    }
  )

  return inputRules({ rules: [checkboxInputRule] })
})

/**
 * Link enhancements:
 * 1. Paste handler: wrap selected text with pasted URL as markdown link
 * 2. Click handler: Cmd/Ctrl+Click opens links in new tab
 */
const linkEnhancementsPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('link-enhancements'),
    props: {
      handlePaste(view, event) {
        const { state } = view
        const { selection } = state
        const { empty, from, to } = selection

        // Only handle if text is selected
        if (empty) return false

        // Get clipboard text
        const clipboardText = event.clipboardData?.getData('text/plain')?.trim()
        if (!clipboardText) return false

        // Check if clipboard contains a URL
        if (!URL_REGEX.test(clipboardText)) return false

        // Get the link mark type
        const linkMarkType = state.schema.marks.link
        if (!linkMarkType) return false

        // Prevent default paste behavior FIRST
        event.preventDefault()

        // Create and apply the link mark to the selected text
        const linkMark = linkMarkType.create({ href: clipboardText })
        const tr = state.tr
          .removeMark(from, to, linkMarkType)
          .addMark(from, to, linkMark)

        view.dispatch(tr)
        return true
      },

      handleClick(view, pos, event) {
        // Only handle Cmd+Click (Mac) or Ctrl+Click (Windows/Linux)
        if (!event.metaKey && !event.ctrlKey) return false

        const { state } = view
        const $pos = state.doc.resolve(pos)
        const marks = $pos.marks()

        // Find link mark at this position
        const linkMark = marks.find((mark) => mark.type.name === 'link')
        if (!linkMark) return false

        const href = linkMark.attrs.href
        if (!href) return false

        // Open link in new tab
        window.open(href, '_blank', 'noopener,noreferrer')
        return true
      },
    },
  })
})

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface MilkdownEditorProps {
  /** Unique key to reset editor (e.g., task ID) - editor remounts when this changes */
  editorKey: string
  /** Initial markdown content */
  defaultValue: string
  /** Called when content changes */
  onChange: (value: string) => void
  className?: string
}

// -----------------------------------------------------------------------------
// Internal Editor Component
// -----------------------------------------------------------------------------

interface EditorCoreProps {
  defaultValue: string
  onChange: (value: string) => void
}

function EditorCore({ defaultValue, onChange }: EditorCoreProps) {
  // Use ref to store onChange to avoid recreating editor when callback changes
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, defaultValue)

          // Listen for content changes
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            onChangeRef.current(markdown)
          })
        })
        .use(commonmark)
        .use(gfm)
        .use(listItemBlockComponent)
        .use(listener)
        .use(history)
        .use(checkboxShortcutPlugin)
        .use(linkEnhancementsPlugin),
    []
  )

  return <Milkdown />
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

function MilkdownEditor({
  editorKey,
  defaultValue,
  onChange,
  className,
}: MilkdownEditorProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [cmdHeld, setCmdHeld] = React.useState(false)

  // Track Cmd/Ctrl key for link cursor hint
  React.useEffect(() => {
    const down = (e: KeyboardEvent) =>
      (e.metaKey || e.ctrlKey) && setCmdHeld(true)
    const up = () => setCmdHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', up)
    }
  }, [])

  const handleWrapperClick = React.useCallback((e: React.MouseEvent) => {
    // Only handle clicks directly on wrapper, not bubbled from editor
    if (
      e.target === wrapperRef.current ||
      e.target === wrapperRef.current?.firstElementChild
    ) {
      const proseMirror = wrapperRef.current?.querySelector(
        '.ProseMirror'
      ) as HTMLElement
      proseMirror?.focus()
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className={cn('milkdown-editor', cmdHeld && 'cmd-held', className)}
      onClick={handleWrapperClick}
    >
      <MilkdownProvider key={editorKey}>
        <EditorCore defaultValue={defaultValue} onChange={onChange} />
      </MilkdownProvider>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Read-Only Preview Component
// -----------------------------------------------------------------------------

interface MilkdownPreviewProps {
  content: string
  className?: string
}

function PreviewCore({ content }: { content: string }) {
  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, content)
          ctx.set(editorViewOptionsCtx, { editable: () => false })
        })
        .use(commonmark)
        .use(gfm),
    []
  )

  return <Milkdown />
}

export function MilkdownPreview({ content, className }: MilkdownPreviewProps) {
  return (
    <div className={cn('milkdown-preview', className)}>
      <MilkdownProvider key={content}>
        <PreviewCore content={content} />
      </MilkdownProvider>
    </div>
  )
}

export { MilkdownEditor }
