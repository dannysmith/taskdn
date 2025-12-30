#!/usr/bin/env bun
/**
 * Import Demo Vault to Things 3
 *
 * One-off script that reads the demo-vault (areas, projects, tasks) and imports
 * them into Things 3 via the Things URL scheme. Created for testing the desktop
 * app UI against real-ish data in Things 3.
 *
 * What it does:
 * - Reads all projects from demo-vault/projects/
 * - Reads all tasks from demo-vault/tasks/ (including archive/)
 * - Maps Taskdn statuses to Things statuses (inbox→Inbox, in-progress→Today, etc.)
 * - Nests tasks inside their parent projects where applicable
 * - Opens Things 3 URLs in batches to create everything
 *
 * Usage:
 *   bun scripts/import-demo-vault-to-things.ts [--dry-run] [--batch-size=N]
 *
 * Limitations:
 * - Things 3 URL scheme cannot create Areas - you must create them manually first
 * - Area assignments on projects/tasks are not preserved (drag items after import)
 * - blocked-by relationships between projects are lost
 * - Archived tasks are imported as completed/canceled
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DEMO_VAULT = join(import.meta.dir, "..", "demo-vault");
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith("--batch-size="))?.split("=")[1] ?? "10");
const DRY_RUN = process.argv.includes("--dry-run");

// ============================================================================
// Types
// ============================================================================

interface TaskFrontmatter {
  title: string;
  status: "inbox" | "icebox" | "ready" | "in-progress" | "blocked" | "dropped" | "done";
  "created-at"?: string;
  "updated-at"?: string;
  "completed-at"?: string;
  area?: string;
  projects?: string[];
  due?: string;
  scheduled?: string;
  "defer-until"?: string;
}

interface ProjectFrontmatter {
  title: string;
  "unique-id"?: string;
  area?: string;
  status?: "planning" | "ready" | "blocked" | "in-progress" | "paused" | "done";
  description?: string;
  "start-date"?: string;
  "end-date"?: string;
  "blocked-by"?: string[];
}

interface AreaFrontmatter {
  title: string;
  type?: string;
  status?: string;
  description?: string;
}

interface ThingsTodo {
  type: "to-do";
  attributes: {
    title: string;
    notes?: string;
    when?: string;
    deadline?: string;
    completed?: boolean;
    canceled?: boolean;
  };
}

interface ThingsProject {
  type: "project";
  attributes: {
    title: string;
    notes?: string;
    when?: string;
    completed?: boolean;
    items?: ThingsTodo[];
  };
}

type ThingsItem = ThingsTodo | ThingsProject;

// ============================================================================
// Parsing
// ============================================================================

function parseFrontmatter<T>(content: string): { frontmatter: T; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const [, yamlStr, body] = match;
  const frontmatter: Record<string, unknown> = {};

  // Simple YAML parser (handles our use cases)
  let currentKey: string | null = null;
  let inArray = false;
  let arrayItems: string[] = [];

  for (const line of yamlStr.split("\n")) {
    // Array item
    if (line.match(/^\s+-\s/)) {
      if (currentKey && inArray) {
        const value = line.replace(/^\s+-\s+/, "").trim();
        arrayItems.push(cleanValue(value));
      }
      continue;
    }

    // If we were in an array, save it
    if (inArray && currentKey) {
      frontmatter[currentKey] = arrayItems;
      inArray = false;
      arrayItems = [];
    }

    // Key-value pair
    const kvMatch = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key;

      if (value.trim() === "") {
        // Could be start of array
        inArray = true;
        arrayItems = [];
      } else {
        frontmatter[key] = cleanValue(value);
      }
    }
  }

  // Handle trailing array
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayItems;
  }

  return { frontmatter: frontmatter as T, body: body.trim() };
}

function cleanValue(value: string): string {
  // Remove quotes and wikilink brackets
  return value
    .replace(/^["']|["']$/g, "")
    .replace(/^\[\[|\]\]$/g, "")
    .trim();
}

function extractWikiLinkTitle(ref: string): string {
  // Handle "[[Title]]" or "[[Title|Display]]" format
  const match = ref.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
  return match ? match[1] : ref.replace(/^\[\[|\]\]$/g, "");
}

async function readMarkdownFiles<T>(dir: string): Promise<Array<{ frontmatter: T; body: string; filename: string }>> {
  const results: Array<{ frontmatter: T; body: string; filename: string }> = [];

  try {
    const files = await readdir(dir);

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const content = await readFile(join(dir, file), "utf-8");
      const parsed = parseFrontmatter<T>(content);

      if (parsed) {
        results.push({ ...parsed, filename: file });
      }
    }
  } catch (error) {
    console.error(`Error reading ${dir}:`, error);
  }

  return results;
}

// ============================================================================
// Status Mapping
// ============================================================================

function mapTaskStatus(status: TaskFrontmatter["status"]): Pick<ThingsTodo["attributes"], "when" | "completed" | "canceled"> {
  switch (status) {
    case "inbox":
      return {}; // Goes to Inbox by default
    case "icebox":
      return { when: "someday" };
    case "ready":
      return {}; // No 'when' = Anytime list
    case "in-progress":
      return { when: "today" };
    case "blocked":
      return { when: "someday" };
    case "dropped":
      return { canceled: true };
    case "done":
      return { completed: true };
    default:
      return {};
  }
}

function mapProjectStatus(status?: ProjectFrontmatter["status"]): Pick<ThingsProject["attributes"], "when" | "completed"> {
  switch (status) {
    case "planning":
    case "ready":
      return {}; // No 'when' = Anytime list
    case "blocked":
    case "paused":
      return { when: "someday" };
    case "in-progress":
      return { when: "today" };
    case "done":
      return { completed: true };
    default:
      return {}; // No 'when' = Anytime list
  }
}

// ============================================================================
// Conversion
// ============================================================================

function taskToThings(task: TaskFrontmatter, body: string): ThingsTodo {
  const statusAttrs = mapTaskStatus(task.status);

  const attrs: ThingsTodo["attributes"] = {
    title: task.title,
    ...statusAttrs,
  };

  // Add notes from body (truncate to 10000 chars)
  if (body) {
    attrs.notes = body.slice(0, 10000);
  }

  // Add deadline
  if (task.due) {
    attrs.deadline = task.due;
  }

  // Add scheduled date as 'when' if not already set
  if (task.scheduled && !attrs.when && !attrs.completed && !attrs.canceled) {
    attrs.when = task.scheduled;
  }

  // Note: creation-date and completion-date are not supported by Things URL scheme

  return { type: "to-do", attributes: attrs };
}

function projectToThings(project: ProjectFrontmatter, body: string): ThingsProject {
  const statusAttrs = mapProjectStatus(project.status);

  const attrs: ThingsProject["attributes"] = {
    title: project.title,
    ...statusAttrs,
  };

  // Combine description and body for notes
  const notes = [project.description, body].filter(Boolean).join("\n\n");
  if (notes) {
    attrs.notes = notes.slice(0, 10000);
  }

  return { type: "project", attributes: attrs };
}

// ============================================================================
// URL Generation
// ============================================================================

function buildThingsUrl(items: ThingsItem[]): string {
  const json = JSON.stringify(items);
  const encoded = encodeURIComponent(json);
  return `things:///json?data=${encoded}`;
}

async function openUrl(url: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would open: ${url.slice(0, 100)}...`);
    return;
  }

  // Use macOS open command
  await execAsync(`open "${url}"`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Things 3 Import Script");
  console.log("=".repeat(60));
  console.log();

  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // 1. Read all data
  console.log("📂 Reading demo-vault...\n");

  const areas = await readMarkdownFiles<AreaFrontmatter>(join(DEMO_VAULT, "areas"));
  const projects = await readMarkdownFiles<ProjectFrontmatter>(join(DEMO_VAULT, "projects"));
  const tasks = await readMarkdownFiles<TaskFrontmatter>(join(DEMO_VAULT, "tasks"));
  const archivedTasks = await readMarkdownFiles<TaskFrontmatter>(join(DEMO_VAULT, "tasks", "archive"));

  console.log(`  Areas: ${areas.length}`);
  console.log(`  Projects: ${projects.length}`);
  console.log(`  Tasks: ${tasks.length}`);
  console.log(`  Archived Tasks: ${archivedTasks.length}`);
  console.log();

  // 2. Report areas (Things can't create these via URL)
  console.log("⚠️  AREAS (must be created manually in Things first):");
  console.log("-".repeat(60));
  for (const area of areas) {
    const status = area.frontmatter.status || "active";
    if (status === "active") {
      console.log(`  • ${area.frontmatter.title}`);
    }
  }
  console.log();
  console.log("Note: Area assignments will be skipped. You can drag items to areas after import.\n");

  // 3. Build project lookup (for task→project matching)
  const projectTitleToThings = new Map<string, ThingsProject>();
  const projectItems: ThingsProject[] = [];

  for (const project of projects) {
    const thingsProject = projectToThings(project.frontmatter, project.body);
    thingsProject.attributes.items = []; // Will be populated with tasks
    projectTitleToThings.set(project.frontmatter.title, thingsProject);
    projectItems.push(thingsProject);
  }

  // 4. Process tasks - assign to projects or standalone
  const standaloneTasks: ThingsTodo[] = [];
  const allTasks = [...tasks, ...archivedTasks];

  for (const task of allTasks) {
    const thingsTask = taskToThings(task.frontmatter, task.body);

    // Check if task belongs to a project
    const projectRefs = task.frontmatter.projects;
    if (projectRefs && projectRefs.length > 0) {
      const projectTitle = extractWikiLinkTitle(projectRefs[0]);
      const parentProject = projectTitleToThings.get(projectTitle);

      if (parentProject) {
        parentProject.attributes.items = parentProject.attributes.items || [];
        parentProject.attributes.items.push(thingsTask);
        continue;
      }
    }

    // Standalone task
    standaloneTasks.push(thingsTask);
  }

  // 5. Summary
  console.log("📊 Import Summary:");
  console.log("-".repeat(60));
  console.log(`  Projects to create: ${projectItems.length}`);
  let projectTaskCount = 0;
  for (const p of projectItems) {
    projectTaskCount += p.attributes.items?.length ?? 0;
  }
  console.log(`  Tasks within projects: ${projectTaskCount}`);
  console.log(`  Standalone tasks: ${standaloneTasks.length}`);
  console.log();

  // 6. Generate and open URLs
  if (!DRY_RUN) {
    console.log("🚀 Starting import...\n");
    console.log("Things 3 will open for each batch. Please wait for each to complete.\n");
  }

  // Import projects (with their tasks) in batches
  const projectBatches: ThingsProject[][] = [];
  for (let i = 0; i < projectItems.length; i += BATCH_SIZE) {
    projectBatches.push(projectItems.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < projectBatches.length; i++) {
    const batch = projectBatches[i];
    console.log(`  [${i + 1}/${projectBatches.length}] Importing ${batch.length} projects...`);

    const url = buildThingsUrl(batch);
    await openUrl(url);

    if (!DRY_RUN && i < projectBatches.length - 1) {
      await sleep(2000); // Wait between batches
    }
  }

  // Import standalone tasks in batches
  const taskBatches: ThingsTodo[][] = [];
  for (let i = 0; i < standaloneTasks.length; i += BATCH_SIZE) {
    taskBatches.push(standaloneTasks.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < taskBatches.length; i++) {
    const batch = taskBatches[i];
    console.log(`  [${i + 1}/${taskBatches.length}] Importing ${batch.length} standalone tasks...`);

    const url = buildThingsUrl(batch);
    await openUrl(url);

    if (!DRY_RUN && i < taskBatches.length - 1) {
      await sleep(2000); // Wait between batches
    }
  }

  console.log();
  console.log("✅ Import complete!");
  console.log();
  console.log("Next steps:");
  console.log("  1. Create areas in Things 3 (see list above)");
  console.log("  2. Drag projects/tasks to their areas if desired");
  console.log();
}

main().catch(console.error);
