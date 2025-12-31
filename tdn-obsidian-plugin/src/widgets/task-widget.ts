import { App, TFile } from "obsidian";
import { TaskData } from "../types";
import {
  isDoneStatus,
  formatDateForDisplay,
  toggleTaskStatus,
  extractWikilinkTarget,
} from "../utils/task-utils";

export interface TaskWidgetOptions {
  app: App;
  file: TFile;
  taskData: TaskData;
  onStatusChange?: (newStatus: string) => void;
}

/**
 * Create a task widget DOM element
 * Shared between Live Preview and Reading Mode
 */
export function createTaskWidget(options: TaskWidgetOptions): HTMLElement {
  const { app, file, taskData, onStatusChange } = options;

  const container = document.createElement("span");
  container.className = "taskdn-widget";
  container.dataset.status = taskData.status;
  container.dataset.filePath = file.path;

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "taskdn-checkbox";
  checkbox.checked = isDoneStatus(taskData.status);
  checkbox.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newStatus = await toggleTaskStatus(file, app);

    // Update DOM directly
    checkbox.checked = isDoneStatus(newStatus);
    container.dataset.status = newStatus;

    onStatusChange?.(newStatus);
  });
  container.appendChild(checkbox);

  // Title (clickable to open file)
  const title = document.createElement("span");
  title.className = "taskdn-title";
  title.textContent = taskData.title;
  title.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Use openFile directly since we have the TFile object
    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(file);
  });
  container.appendChild(title);

  // Project/Area indicators
  const meta = document.createElement("span");
  meta.className = "taskdn-meta";

  // Show project if present
  if (taskData.projects && taskData.projects.length > 0) {
    const projectLink = taskData.projects[0];
    const projectName = extractWikilinkTarget(projectLink) || projectLink;
    const projectEl = createMetaLink(app, projectName, "taskdn-project");
    meta.appendChild(projectEl);
  }

  // Show area if present (and no project shown, to avoid clutter)
  if (taskData.area && (!taskData.projects || taskData.projects.length === 0)) {
    const areaName = extractWikilinkTarget(taskData.area) || taskData.area;
    const areaEl = createMetaLink(app, areaName, "taskdn-area");
    meta.appendChild(areaEl);
  }

  // Due date
  if (taskData.due) {
    const dueEl = document.createElement("span");
    dueEl.className = "taskdn-due";
    dueEl.textContent = `📅 ${formatDateForDisplay(taskData.due)}`;
    meta.appendChild(dueEl);
  }

  if (meta.hasChildNodes()) {
    container.appendChild(meta);
  }

  return container;
}

/**
 * Create a clickable metadata link
 */
function createMetaLink(
  app: App,
  linkText: string,
  className: string
): HTMLElement {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = linkText;
  el.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Try to resolve the link to a file first
    const targetFile = app.metadataCache.getFirstLinkpathDest(linkText, "");
    if (targetFile) {
      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(targetFile);
    } else {
      // Fallback to openLinkText for unresolved links
      await app.workspace.openLinkText(linkText, "", false);
    }
  });
  return el;
}

/**
 * Update an existing widget's display based on new task data
 */
export function updateTaskWidget(
  widget: HTMLElement,
  taskData: TaskData
): void {
  widget.dataset.status = taskData.status;

  const checkbox = widget.querySelector<HTMLInputElement>(".taskdn-checkbox");
  if (checkbox) {
    checkbox.checked = isDoneStatus(taskData.status);
  }

  const title = widget.querySelector<HTMLElement>(".taskdn-title");
  if (title) {
    title.textContent = taskData.title;
  }
}
