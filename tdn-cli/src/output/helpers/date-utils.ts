import type { Task } from '@bindings';

/**
 * Date utilities for context commands.
 *
 * All date comparisons use YYYY-MM-DD string format.
 * Supports TASKDN_MOCK_DATE env var for testing.
 */

/**
 * Get today's date in YYYY-MM-DD format.
 * Supports TASKDN_MOCK_DATE env var for testing.
 */
export function getToday(): string {
  const mockDate = process.env.TASKDN_MOCK_DATE;
  if (mockDate && /^\d{4}-\d{2}-\d{2}$/.test(mockDate)) {
    return mockDate;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object as YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object (at midnight local time)
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 */
export function getTomorrow(today: string): string {
  const date = parseDate(today);
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

/**
 * Get the end of week (Sunday) for the given date in YYYY-MM-DD format.
 * Week starts on Monday (day 1) and ends on Sunday (day 0).
 */
export function getEndOfWeek(today: string): string {
  const date = parseDate(today);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  return formatDate(date);
}

/**
 * Get the start of week (Monday) for the given date in YYYY-MM-DD format.
 * Week starts on Monday (day 1) and ends on Sunday (day 0).
 */
export function getStartOfWeek(today: string): string {
  const date = parseDate(today);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysSinceMonday);
  return formatDate(date);
}

/**
 * Check if a task is overdue (due < today)
 */
export function isOverdue(task: Task, today?: string): boolean {
  if (!task.due) return false;
  const todayStr = today ?? getToday();
  return task.due < todayStr;
}

/**
 * Check if a task is due today (due == today)
 */
export function isDueToday(task: Task, today?: string): boolean {
  if (!task.due) return false;
  const todayStr = today ?? getToday();
  return task.due === todayStr;
}

/**
 * Check if a task is scheduled today (scheduled == today)
 */
export function isScheduledToday(task: Task, today?: string): boolean {
  if (!task.scheduled) return false;
  const todayStr = today ?? getToday();
  return task.scheduled === todayStr;
}

/**
 * Check if a task is newly actionable (defer-until == today)
 */
export function isNewlyActionable(task: Task, today?: string): boolean {
  if (!task.deferUntil) return false;
  const todayStr = today ?? getToday();
  return task.deferUntil === todayStr;
}

/**
 * Check if a task is due within 7 days from today (inclusive)
 */
export function isDueThisWeek(task: Task, today?: string): boolean {
  if (!task.due) return false;
  const todayStr = today ?? getToday();
  const endOfWeek = addDays(todayStr, 7);
  return task.due > todayStr && task.due <= endOfWeek;
}

/**
 * Check if a task is scheduled within 7 days from today (inclusive)
 */
export function isScheduledThisWeek(task: Task, today?: string): boolean {
  if (!task.scheduled) return false;
  const todayStr = today ?? getToday();
  const endOfWeek = addDays(todayStr, 7);
  return task.scheduled > todayStr && task.scheduled <= endOfWeek;
}

/**
 * Check if a task was modified within the last N hours (default 24)
 */
export function wasModifiedRecently(task: Task, hours: number = 24): boolean {
  if (!task.updatedAt) return false;

  // updatedAt is ISO 8601 format (e.g., "2025-01-15T14:30:00Z")
  const updatedAt = new Date(task.updatedAt);
  const cutoff = new Date();

  // Support mocked date for testing
  const mockDate = process.env.TASKDN_MOCK_DATE;
  if (mockDate && /^\d{4}-\d{2}-\d{2}$/.test(mockDate)) {
    cutoff.setTime(parseDate(mockDate).getTime());
    // Set to end of day for mock date
    cutoff.setHours(23, 59, 59, 999);
  }

  cutoff.setTime(cutoff.getTime() - hours * 60 * 60 * 1000);
  return updatedAt >= cutoff;
}

/**
 * Add N days to a date string, return as YYYY-MM-DD
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Format a date for display: "Jan 10", "Tomorrow (Thu Jan 16)", etc.
 */
export function formatRelativeDate(dateStr: string, today?: string): string {
  const todayStr = today ?? getToday();
  const tomorrowStr = getTomorrow(todayStr);

  if (dateStr === todayStr) {
    return 'today';
  }

  if (dateStr === tomorrowStr) {
    const date = parseDate(dateStr);
    const weekday = getWeekday(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `Tomorrow (${weekday.slice(0, 3)} ${month} ${day})`;
  }

  // For other dates, format as "Mon Jan 10" or just "Jan 10"
  const date = parseDate(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

/**
 * Get the weekday name for a date
 */
export function getWeekday(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Get the short weekday name for a date (Mon, Tue, etc.)
 */
export function getShortWeekday(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format a date as "Friday (Jan 17)"
 */
export function formatDayWithDate(dateStr: string): string {
  const date = parseDate(dateStr);
  const weekday = getWeekday(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${weekday} (${month} ${day})`;
}

/**
 * Calculate hours ago from now (or mock date)
 */
export function hoursAgo(isoTimestamp: string): number {
  const then = new Date(isoTimestamp);
  const now = new Date();

  // Support mocked date for testing
  const mockDate = process.env.TASKDN_MOCK_DATE;
  if (mockDate && /^\d{4}-\d{2}-\d{2}$/.test(mockDate)) {
    now.setTime(parseDate(mockDate).getTime());
    now.setHours(23, 59, 59, 999);
  }

  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

// ============================================================================
// Display Formatting
// ============================================================================

/**
 * Format a short date for list views (e.g., "Jan 20")
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a long date for detail views (e.g., "20 January 2025")
 */
export function formatLongDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================================================
// Natural Language Date Parsing
// ============================================================================

/**
 * Weekday names and their indices (Sunday = 0, Monday = 1, ..., Saturday = 6)
 */
const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Parse natural language date input to ISO 8601 date (YYYY-MM-DD).
 *
 * Supports:
 * - "today", "tomorrow"
 * - Weekday names: "monday", "friday", "wed" (next occurrence)
 * - Relative: "+1d", "+3d", "+1w", "+2w"
 * - "next week" (Monday of next week)
 * - ISO format pass-through: "2025-01-15"
 *
 * Returns null if the input cannot be parsed.
 */
export function parseNaturalDate(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  const today = getToday();
  const todayDate = parseDate(today);

  // ISO format pass-through
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // "today"
  if (trimmed === 'today') {
    return today;
  }

  // "tomorrow"
  if (trimmed === 'tomorrow') {
    return getTomorrow(today);
  }

  // "next week" (Monday of next week)
  if (trimmed === 'next week' || trimmed === 'nextweek') {
    // Find next Monday
    const dayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    return addDays(today, daysUntilNextMonday);
  }

  // Weekday names (next occurrence of that day)
  const targetDay = WEEKDAYS[trimmed];
  if (targetDay !== undefined) {
    const currentDay = todayDate.getDay();

    // Calculate days until target day
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      // If today or past, go to next week
      daysUntil += 7;
    }

    return addDays(today, daysUntil);
  }

  // Relative days: +1d, +3d, +10d
  const daysMatch = trimmed.match(/^\+(\d+)d$/);
  if (daysMatch && daysMatch[1]) {
    const days = parseInt(daysMatch[1], 10);
    return addDays(today, days);
  }

  // Relative weeks: +1w, +2w
  const weeksMatch = trimmed.match(/^\+(\d+)w$/);
  if (weeksMatch && weeksMatch[1]) {
    const weeks = parseInt(weeksMatch[1], 10);
    return addDays(today, weeks * 7);
  }

  // Could not parse
  return null;
}
