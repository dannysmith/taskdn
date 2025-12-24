/**
 * Shared helper utilities for context command formatters.
 *
 * These utilities are used by the AI output formatter (ai.ts) to build
 * structured context output per ai-context.md specification.
 */

// Date utilities
export {
  getToday,
  formatDate,
  parseDate,
  getTomorrow,
  getEndOfWeek,
  getStartOfWeek,
  isOverdue,
  isDueToday,
  isScheduledToday,
  isNewlyActionable,
  isDueThisWeek,
  isScheduledThisWeek,
  wasModifiedRecently,
  addDays,
  formatRelativeDate,
  getWeekday,
  getShortWeekday,
  formatDayWithDate,
  hoursAgo,
} from './date-utils.ts';

// Status emoji maps
export {
  PROJECT_STATUS_EMOJI,
  TASK_STATUS_EMOJI,
  AREA_ICON,
  DIRECT_TASKS_ICON,
  OVERDUE_ICON,
  DUE_TODAY_ICON,
  SCHEDULED_TODAY_ICON,
  NEWLY_ACTIONABLE_ICON,
  getProjectStatusEmoji,
  getTaskStatusEmoji,
} from './status-emoji.ts';

// Stats utilities
export {
  countTasksByStatus,
  formatTaskCountShorthand,
  getTotalActiveCount,
  type TaskStatusCounts,
} from './stats.ts';

// Body utilities
export { truncateBody, isEmptyBody, countWords, countLines } from './body-utils.ts';

// Reference table utilities
export {
  collectReferences,
  buildReferenceTable,
  buildReferenceSection,
  sortReferenceEntries,
  type EntityType,
  type ReferenceEntry,
  type ReferenceInput,
} from './reference-table.ts';

// Markdown helpers
export {
  formatMetadataTable,
  formatParentChain,
  formatParentChainForTimeline,
  formatBlockquoteExcerpt,
  toKebabCase,
  formatSeparator,
  joinSections,
  formatSectionHeader,
  formatSubsectionHeader,
  formatNone,
  formatCount,
} from './markdown-helpers.ts';

// Tree formatting
export {
  formatProjectOneLiner,
  formatInProgressTaskLine,
  formatDirectTasksSummary,
  renderTree,
  buildAreaTree,
  calculateAreaTaskCount,
  type TreeNode,
} from './tree-format.ts';
