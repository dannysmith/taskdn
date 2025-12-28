import { dim, cyan, yellow, green, red, strikethrough, bold, blue } from 'ansis';
import boxen from 'boxen';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { log } from '@clack/prompts';
import { toKebabCase } from '../helpers/index.ts';

// Configure marked-terminal with our color palette
marked.use(
  markedTerminal({
    firstHeading: bold,
    heading: bold,
    strong: bold,
    em: (s: string) => s, // italic not well supported in all terminals
    codespan: cyan,
    code: dim,
    blockquote: dim,
    listitem: (s: string) => s,
    // Disable table borders for cleaner output
    tableOptions: {
      chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: '',
        'left-mid': '',
        mid: '',
        'mid-mid': '',
        right: '',
        'right-mid': '',
        middle: ' ',
      },
    },
  })
);

/**
 * Extract filename from a full path
 */
export function extractFilename(path: string): string {
  return path.split('/').pop() ?? path;
}

/**
 * Create a horizontal separator line
 */
export function formatSeparator(width: number = 60): string {
  return dim('─'.repeat(width));
}

/**
 * Get checkbox symbol for task status
 */
export function formatTaskCheckbox(status: string): string {
  const symbols: Record<string, string> = {
    Done: dim('[✓]'),
    Dropped: dim('[✗]'),
    InProgress: yellow('[▸]'),
    Ready: '[ ]',
    Blocked: red('[!]'),
    Inbox: blue('[?]'),
    Icebox: dim('[❄]'),
  };
  return symbols[status] ?? '[ ]';
}

/**
 * Format task title with appropriate styling based on status.
 * Not bold - the checkbox provides visual distinction.
 */
export function formatTaskTitle(title: string, status: string): string {
  if (status === 'Done' || status === 'Dropped') {
    return dim(strikethrough(title));
  }
  return title;
}

/**
 * Render markdown body with syntax highlighting
 */
export function renderMarkdownBody(body: string): string {
  // marked.parse returns string when async is false (default)
  let rendered = marked.parse(body) as string;

  // Workaround for marked-terminal bug: it renders GFM checkboxes twice
  // (once in listitem, once from the checkbox token). Remove duplicates.
  rendered = rendered.replace(/\[[ X]\] {1,2}\[[ xX]\] /g, (match) => {
    // Keep just the first checkbox (the one from listitem)
    return match.slice(0, 4) + ' ';
  });

  // Remove trailing newlines that marked adds
  return rendered.trimEnd();
}

/**
 * Create a boxed header for entities
 */
export function formatEntityHeader(
  title: string,
  filename: string,
  status?: string,
  checkbox?: string
): string {
  // Build the content line
  const leftPart = checkbox ? `${checkbox} ${bold(title)}` : bold(title);
  const rightPart = status ? formatStatus(status) : '';
  const filenamePart = dim(filename);

  // Calculate spacing for alignment
  // Note: We need to account for ANSI codes not taking up visual space
  const contentParts = [leftPart, filenamePart, rightPart].filter(Boolean);
  const content = contentParts.join('  ');

  return (
    '\n' +
    boxen(content, {
      borderStyle: 'single',
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderColor: 'gray',
    })
  );
}

/**
 * Log warnings using clack's log.warn
 */
export function formatWarnings(warnings: string[]): void {
  for (const warning of warnings) {
    log.warn(warning);
  }
}

/**
 * Format a status with appropriate color (works for tasks, projects, and areas)
 */
export function formatStatus(status: string): string {
  const statusColors: Record<string, (s: string) => string> = {
    // Task statuses
    Inbox: (s) => dim(s),
    Icebox: (s) => dim(s),
    Ready: (s) => green(s),
    InProgress: (s) => blue(s),
    Blocked: (s) => yellow(s),
    Dropped: (s) => dim(s),
    Done: (s) => dim(s),
    // Project-specific statuses
    Planning: (s) => cyan(s),
    Paused: (s) => yellow(s),
    // Area-specific statuses
    Active: (s) => green(s),
    Archived: (s) => dim(s),
  };
  const colorFn = statusColors[status] ?? ((s: string) => s);
  return colorFn(toKebabCase(status));
}
