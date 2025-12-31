import { App, TFile, CachedMetadata } from "obsidian";
import { TaskData, TaskStatus } from "../types";

/**
 * Check if a status represents a "done" task
 */
export function isDoneStatus(status: TaskStatus): boolean {
  return status === "done";
}

/**
 * Check if a file path is within the tasks directory
 */
export function isTaskPath(filePath: string, tasksDirectory: string): boolean {
  // Normalize paths - handle both with and without leading slash
  const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const normalizedTasksDir = tasksDirectory.startsWith("/")
    ? tasksDirectory.slice(1)
    : tasksDirectory;

  return normalizedPath.startsWith(normalizedTasksDir + "/");
}

/**
 * Resolve a wikilink to a task file
 * Returns null if the link doesn't resolve to a task file
 */
export function resolveTaskFile(
  linkText: string,
  sourcePath: string,
  app: App,
  tasksDirectory: string
): TFile | null {
  // Remove any heading/block references from the link
  const cleanLink = linkText.split("#")[0].split("^")[0];

  const file = app.metadataCache.getFirstLinkpathDest(cleanLink, sourcePath);
  if (file && isTaskPath(file.path, tasksDirectory)) {
    return file;
  }
  return null;
}

/**
 * Extract task data from file cache (fast, no file read)
 */
export function getTaskDataFromCache(
  file: TFile,
  cache: CachedMetadata | null
): TaskData {
  const fm = cache?.frontmatter;

  return {
    title: fm?.title ?? file.basename,
    status: (fm?.status as TaskStatus) ?? "inbox",
    due: fm?.due,
    scheduled: fm?.scheduled,
    deferUntil: fm?.["defer-until"],
    projects: fm?.projects,
    area: fm?.area,
    completedAt: fm?.["completed-at"],
  };
}

/**
 * Toggle task status between done and ready
 * Returns the new status
 */
export async function toggleTaskStatus(
  file: TFile,
  app: App
): Promise<TaskStatus> {
  let newStatus: TaskStatus = "ready";

  await app.fileManager.processFrontMatter(file, (fm) => {
    const wasDone = fm.status === "done";
    newStatus = wasDone ? "ready" : "done";
    fm.status = newStatus;
    fm["updated-at"] = formatDate(new Date());

    if (!wasDone) {
      // Completing the task
      fm["completed-at"] = formatDate(new Date());
    } else {
      // Un-completing - remove completed-at
      delete fm["completed-at"];
    }
  });

  return newStatus;
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a date for display (e.g., "Jan 31")
 */
export function formatDateForDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Check if a line is a checklist item
 */
export function isChecklistLine(line: string): boolean {
  return /^[\s]*[-*]?\s*\[[ xX]\]\s*.+$/.test(line);
}

/**
 * Extract info from a checklist line
 */
export function extractChecklistInfo(line: string): {
  text: string;
  checked: boolean;
  indent: string;
  listMarker: string;
} {
  const match = line.match(/^([\s]*)([-*]|\d+\.)\s*\[([ xX])\]\s*(.+)$/);
  if (!match) {
    return { text: "", checked: false, indent: "", listMarker: "-" };
  }
  return {
    indent: match[1],
    listMarker: match[2],
    checked: match[3].toLowerCase() === "x",
    text: match[4].trim(),
  };
}

/**
 * Sanitize a string for use as a filename
 */
export function sanitizeFilename(text: string): string {
  return text
    .replace(/[\\/:*?"<>|]/g, "-") // Replace invalid chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, 100); // Limit length
}

/**
 * Extract wikilink text from a string (e.g., "[[My Task]]" -> "My Task")
 */
export function extractWikilinkTarget(text: string): string | null {
  const match = text.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
  return match ? match[1] : null;
}
