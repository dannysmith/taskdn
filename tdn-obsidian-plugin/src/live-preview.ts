import {
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder, EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNodeRef } from "@lezer/common";
import { TFile, editorInfoField } from "obsidian";
import type TaskdnPlugin from "./main";
import { resolveTaskFile, getTaskDataFromCache } from "./utils/task-utils";
import { createTaskWidget } from "./widgets/task-widget";
import { TaskData } from "./types";

/**
 * CM6 Widget for rendering task links
 */
class TaskLinkWidget extends WidgetType {
  constructor(
    private plugin: TaskdnPlugin,
    private file: TFile,
    private taskData: TaskData
  ) {
    super();
  }

  toDOM(): HTMLElement {
    return createTaskWidget({
      app: this.plugin.app,
      file: this.file,
      taskData: this.taskData,
    });
  }

  eq(other: TaskLinkWidget): boolean {
    return (
      this.file.path === other.file.path &&
      this.taskData.status === other.taskData.status &&
      this.taskData.title === other.taskData.title
    );
  }

  ignoreEvent(event: Event): boolean {
    // Return true to prevent the editor from handling mouse events
    // This stops clicks from moving the cursor and removing the decoration
    if (event.type === "mousedown" || event.type === "mouseup" || event.type === "click") {
      return true;
    }
    return false;
  }
}

/**
 * Build decorations for task wikilinks
 */
function buildDecorations(
  view: EditorView,
  plugin: TaskdnPlugin
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;

  // Get the source path from the editor (for link resolution)
  const editorInfo = view.state.field(editorInfoField, false);
  const file = editorInfo?.file;
  const sourcePath = file?.path ?? "";

  // Find the cursor position to avoid decorating links the cursor is in
  const cursorPos = state.selection.main.head;

  const tree = syntaxTree(state);

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node: SyntaxNodeRef) => {
        // Look for internal links (wikilinks)
        // In Obsidian's CM6 tree, these are typically "hmd-internal-link" or similar
        if (
          node.name.includes("internal-link") ||
          node.name.includes("hmd-internal-link")
        ) {
          // Get the full wikilink including brackets
          const linkStart = findLinkStart(state, node.from);
          const linkEnd = findLinkEnd(state, node.to);

          // Skip if cursor is inside the link
          if (cursorPos >= linkStart && cursorPos <= linkEnd) {
            return;
          }

          // Extract the link text (without brackets and display text)
          const fullText = state.sliceDoc(linkStart, linkEnd);
          const linkMatch = fullText.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
          if (!linkMatch) return;

          const linkText = linkMatch[1];

          // Check if this resolves to a task file
          const taskFile = resolveTaskFile(
            linkText,
            sourcePath,
            plugin.app,
            plugin.settings.tasksDirectory
          );

          if (!taskFile) return;

          // Get task data from cache
          const cache = plugin.app.metadataCache.getFileCache(taskFile);
          const taskData = getTaskDataFromCache(taskFile, cache);

          // Create decoration
          const decoration = Decoration.replace({
            widget: new TaskLinkWidget(plugin, taskFile, taskData),
          });

          builder.add(linkStart, linkEnd, decoration);
        }
      },
    });
  }

  return builder.finish();
}

/**
 * Find the start of a wikilink (the first '[')
 */
function findLinkStart(state: EditorState, pos: number): number {
  const line = state.doc.lineAt(pos);
  const lineText = line.text;
  const lineStart = line.from;
  const relativePos = pos - lineStart;

  // Search backwards for [[
  for (let i = relativePos; i >= 1; i--) {
    if (lineText[i] === "[" && lineText[i - 1] === "[") {
      return lineStart + i - 1;
    }
  }
  return pos;
}

/**
 * Find the end of a wikilink (after the last ']')
 */
function findLinkEnd(state: EditorState, pos: number): number {
  const line = state.doc.lineAt(pos);
  const lineText = line.text;
  const lineStart = line.from;
  const relativePos = pos - lineStart;

  // Search forwards for ]]
  for (let i = relativePos; i < lineText.length - 1; i++) {
    if (lineText[i] === "]" && lineText[i + 1] === "]") {
      return lineStart + i + 2;
    }
  }
  return pos;
}

/**
 * ViewPlugin for Live Preview mode
 */
export function taskLinkViewPlugin(plugin: TaskdnPlugin) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, plugin);
      }

      update(update: ViewUpdate) {
        // Rebuild decorations on document changes, viewport changes, or selection changes
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet
        ) {
          this.decorations = buildDecorations(update.view, plugin);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
