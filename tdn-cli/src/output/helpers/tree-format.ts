import type { Project, Task } from '@bindings';
import { getProjectStatusEmoji, TASK_STATUS_EMOJI, DIRECT_TASKS_ICON } from './status-emoji.ts';
import { countTasksByStatus, formatTaskCountShorthand } from './stats.ts';
import { toKebabCase } from './markdown-helpers.ts';

/**
 * Tree formatting utilities for context command output.
 * Implements ASCII tree structure per ai-context.md Section 4.
 */

/**
 * Tree connector characters
 */
const TREE_BRANCH = '├──';
const TREE_LAST = '└──';
const TREE_PIPE = '│';

/**
 * Format a project one-liner for the structure tree
 * Format: {status_emoji} {title} [{status}] — {count} tasks ({shorthand})
 */
export function formatProjectOneLiner(project: Project, tasks: Task[]): string {
  const emoji = getProjectStatusEmoji(project.status);
  const status = project.status ? `[${toKebabCase(project.status)}]` : '';
  const taskCount = tasks.length;
  const counts = countTasksByStatus(tasks);
  const shorthand = formatTaskCountShorthand(counts);

  const parts: string[] = [];
  if (emoji) parts.push(emoji);
  parts.push(project.title);
  if (status) parts.push(status);
  parts.push('—');
  parts.push(`${taskCount} task${taskCount !== 1 ? 's' : ''}`);
  if (shorthand) parts.push(shorthand);

  return parts.join(' ');
}

/**
 * Format a task for the structure tree (in-progress tasks only)
 * Format: ▶️ {title}
 */
export function formatInProgressTaskLine(task: Task): string {
  return `${TASK_STATUS_EMOJI['in-progress']} ${task.title}`;
}

/**
 * Format direct tasks summary for the structure tree
 * Format: 📋 Direct: {count} tasks ({shorthand})
 */
export function formatDirectTasksSummary(tasks: Task[]): string {
  const taskCount = tasks.length;
  const counts = countTasksByStatus(tasks);
  const shorthand = formatTaskCountShorthand(counts);

  const parts: string[] = [DIRECT_TASKS_ICON, 'Direct:'];
  parts.push(`${taskCount} task${taskCount !== 1 ? 's' : ''}`);
  if (shorthand) parts.push(shorthand);

  return parts.join(' ');
}

/**
 * Tree node for building the structure tree
 */
export interface TreeNode {
  content: string;
  children: TreeNode[];
}

/**
 * Render a tree node to lines with proper indentation and connectors
 */
export function renderTree(node: TreeNode, prefix: string = '', _isLast: boolean = true): string[] {
  const lines: string[] = [];

  // Skip root node content if empty
  if (node.content) {
    lines.push(prefix + node.content);
  }

  // Render children with tree connectors
  const childPrefix = node.content ? prefix : '';
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    const isChildLast = i === node.children.length - 1;
    const connector = isChildLast ? TREE_LAST : TREE_BRANCH;
    const nextPrefix = isChildLast ? '    ' : `${TREE_PIPE}   `;

    const childLines = renderTreeNode(child, childPrefix, connector, nextPrefix);
    lines.push(...childLines);
  }

  return lines;
}

/**
 * Render a single tree node with connector
 */
function renderTreeNode(
  node: TreeNode,
  parentPrefix: string,
  connector: string,
  childPrefix: string
): string[] {
  const lines: string[] = [];

  // Main node line with connector
  lines.push(`${parentPrefix}${connector} ${node.content}`);

  // Render children with appropriate prefix
  const newParentPrefix = parentPrefix + childPrefix;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    const isChildLast = i === node.children.length - 1;
    const childConnector = isChildLast ? TREE_LAST : TREE_BRANCH;
    const nextChildPrefix = isChildLast ? '    ' : `${TREE_PIPE}   `;

    const childLines = renderTreeNode(child, newParentPrefix, childConnector, nextChildPrefix);
    lines.push(...childLines);
  }

  return lines;
}

/**
 * Build a tree structure for an area's projects and tasks
 */
export function buildAreaTree(
  projects: Project[],
  projectTasks: Map<string, Task[]>,
  directTasks: Task[]
): TreeNode {
  const root: TreeNode = { content: '', children: [] };

  // Add project nodes
  for (const project of projects) {
    const tasks = projectTasks.get(project.path) ?? [];
    const projectNode: TreeNode = {
      content: formatProjectOneLiner(project, tasks),
      children: [],
    };

    // Add in-progress tasks as children
    const inProgressTasks = tasks.filter(
      (t) => t.status.toLowerCase() === 'inprogress' || t.status.toLowerCase() === 'in-progress'
    );
    for (const task of inProgressTasks) {
      projectNode.children.push({
        content: formatInProgressTaskLine(task),
        children: [],
      });
    }

    root.children.push(projectNode);
  }

  // Add direct tasks section if any
  if (directTasks.length > 0) {
    const directNode: TreeNode = {
      content: formatDirectTasksSummary(directTasks),
      children: [],
    };

    // Add in-progress direct tasks
    const inProgressDirect = directTasks.filter(
      (t) => t.status.toLowerCase() === 'inprogress' || t.status.toLowerCase() === 'in-progress'
    );
    for (const task of inProgressDirect) {
      directNode.children.push({
        content: formatInProgressTaskLine(task),
        children: [],
      });
    }

    root.children.push(directNode);
  }

  return root;
}

/**
 * Calculate total task count for an area (direct + via projects)
 */
export function calculateAreaTaskCount(
  projectTasks: Map<string, Task[]>,
  directTasks: Task[]
): { total: number; direct: number; viaProjects: number } {
  let viaProjects = 0;
  for (const tasks of projectTasks.values()) {
    viaProjects += tasks.length;
  }

  return {
    total: directTasks.length + viaProjects,
    direct: directTasks.length,
    viaProjects,
  };
}
