import { Plugin, TFile, MarkdownPostProcessorContext } from "obsidian";
import { TaskdnSettings, DEFAULT_SETTINGS } from "./types";
import { TaskdnSettingTab } from "./settings";
import {
  resolveTaskFile,
  getTaskDataFromCache,
  isChecklistLine,
  extractChecklistInfo,
  sanitizeFilename,
  formatDate,
} from "./utils/task-utils";
import { createTaskWidget, updateTaskWidget } from "./widgets/task-widget";
import { taskLinkViewPlugin } from "./live-preview";

export default class TaskdnPlugin extends Plugin {
  settings: TaskdnSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    // Register settings tab
    this.addSettingTab(new TaskdnSettingTab(this.app, this));

    // Register Live Preview extension (CM6)
    this.registerEditorExtension(taskLinkViewPlugin(this));

    // Register Reading Mode post-processor
    this.registerMarkdownPostProcessor(
      (element: HTMLElement, context: MarkdownPostProcessorContext) => {
        this.processTaskLinks(element, context);
      }
    );

    // Register context menu for checklist conversion
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        if (isChecklistLine(line)) {
          menu.addItem((item) => {
            item
              .setTitle("Convert to Taskdn task")
              .setIcon("check-square")
              .onClick(() => this.convertChecklistToTask(editor, cursor.line));
          });
        }
      })
    );

    // Register command for checklist conversion
    this.addCommand({
      id: "convert-checklist-to-task",
      name: "Convert checklist item to Taskdn task",
      editorCheckCallback: (checking, editor) => {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        if (!isChecklistLine(line)) return false;
        if (checking) return true;

        this.convertChecklistToTask(editor, cursor.line);
        return true;
      },
    });

    // Listen for metadata changes to update widgets
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.isTaskFile(file)) {
          this.refreshTaskWidgets(file);
        }
      })
    );
  }

  onunload() {
    // Cleanup handled by Obsidian
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Check if a file is a task file
   */
  isTaskFile(file: TFile): boolean {
    const normalizedPath = file.path.startsWith("/")
      ? file.path.slice(1)
      : file.path;
    const normalizedTasksDir = this.settings.tasksDirectory.startsWith("/")
      ? this.settings.tasksDirectory.slice(1)
      : this.settings.tasksDirectory;

    return normalizedPath.startsWith(normalizedTasksDir + "/");
  }

  /**
   * Process task links in Reading Mode
   */
  private processTaskLinks(
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ) {
    const links = element.querySelectorAll<HTMLAnchorElement>("a.internal-link");

    links.forEach((link) => {
      const linkText = link.getAttribute("data-href");
      if (!linkText) return;

      const file = resolveTaskFile(
        linkText,
        context.sourcePath,
        this.app,
        this.settings.tasksDirectory
      );

      if (!file) return;

      const cache = this.app.metadataCache.getFileCache(file);
      const taskData = getTaskDataFromCache(file, cache);

      const widget = createTaskWidget({
        app: this.app,
        file,
        taskData,
      });

      link.replaceWith(widget);
    });
  }

  /**
   * Convert a checklist line to a Taskdn task
   */
  private async convertChecklistToTask(
    editor: { getLine: (n: number) => string; setLine: (n: number, text: string) => void },
    lineNumber: number
  ) {
    const line = editor.getLine(lineNumber);
    const { text, checked, indent, listMarker } = extractChecklistInfo(line);

    if (!text) return;

    // Generate unique filename
    const filename = await this.generateUniqueFilename(text);
    const filePath = `${this.settings.tasksDirectory}/${filename}`;

    // Determine status
    const status = checked ? "done" : this.settings.defaultStatus;
    const today = formatDate(new Date());

    // Create task content
    let content = `---
title: "${text.replace(/"/g, '\\"')}"
status: ${status}
created-at: ${today}
updated-at: ${today}`;

    if (checked) {
      content += `\ncompleted-at: ${today}`;
    }

    content += "\n---\n";

    // Create the file
    await this.app.vault.create(filePath, content);

    // Replace checklist line with wikilink
    // Use just the filename without extension for the wikilink
    const basename = filename.replace(/\.md$/, "");
    editor.setLine(lineNumber, `${indent}${listMarker} [[${basename}]]`);
  }

  /**
   * Generate a unique filename for a task
   */
  private async generateUniqueFilename(text: string): Promise<string> {
    const base = sanitizeFilename(text);
    let filename = `${base}.md`;
    let counter = 1;
    const dir = this.settings.tasksDirectory;

    while (await this.app.vault.adapter.exists(`${dir}/${filename}`)) {
      filename = `${base}-${counter}.md`;
      counter++;
    }

    return filename;
  }

  /**
   * Refresh all widgets for a specific task file
   * Called when the file's metadata changes
   */
  private refreshTaskWidgets(file: TFile) {
    const cache = this.app.metadataCache.getFileCache(file);
    const taskData = getTaskDataFromCache(file, cache);

    // Find all widgets for this file and update them
    const widgets = document.querySelectorAll<HTMLElement>(
      `.taskdn-widget[data-file-path="${file.path}"]`
    );

    widgets.forEach((widget) => {
      updateTaskWidget(widget, taskData);
    });
  }
}
