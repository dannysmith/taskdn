import { red, yellow, dim, bold } from 'ansis';
import type { CliError, ErrorCode } from './types.ts';
import type { OutputMode } from '@/output/types.ts';

/**
 * Format an error for human-readable output with colors
 */
function formatHuman(error: CliError): string {
  const lines: string[] = [];

  // Error header with code
  lines.push(red(bold(`Error [${error.code}]`)) + `: ${error.message}`);

  // Add error-specific details
  switch (error.code) {
    case 'NOT_FOUND':
      if (error.suggestions && error.suggestions.length > 0) {
        lines.push('');
        lines.push(dim('Did you mean:'));
        for (const suggestion of error.suggestions) {
          lines.push(`  ${yellow('•')} ${suggestion}`);
        }
      }
      break;

    case 'AMBIGUOUS':
      lines.push('');
      lines.push(dim('Matches:'));
      for (const match of error.matches) {
        lines.push(`  ${yellow('•')} ${match}`);
      }
      break;

    case 'INVALID_STATUS':
      lines.push('');
      lines.push(dim('Valid statuses:') + ` ${error.validStatuses.join(', ')}`);
      break;

    case 'INVALID_DATE':
      lines.push('');
      lines.push(dim('Expected formats:') + ` ${error.expectedFormats.join(', ')}`);
      break;

    case 'INVALID_PATH':
      lines.push('');
      lines.push(dim('Allowed paths:'));
      for (const path of error.allowedPaths) {
        lines.push(`  ${dim('•')} ${path}`);
      }
      break;

    case 'PARSE_ERROR':
      if (error.details) {
        lines.push('');
        lines.push(dim(error.details));
      }
      break;

    case 'CONFIG_ERROR':
      if (error.suggestion) {
        lines.push('');
        lines.push(dim('Suggestion:') + ` ${error.suggestion}`);
      }
      break;
  }

  return lines.join('\n');
}

/**
 * Format an error for AI-readable output (structured text without colors)
 */
function formatAi(error: CliError): string {
  const lines: string[] = [];

  lines.push(`ERROR: ${error.code}`);
  lines.push(`Message: ${error.message}`);

  switch (error.code) {
    case 'NOT_FOUND':
      lines.push(`Entity type: ${error.entityType}`);
      lines.push(`Query: ${error.query}`);
      if (error.suggestions && error.suggestions.length > 0) {
        lines.push(`Suggestions: ${error.suggestions.join(', ')}`);
      }
      break;

    case 'AMBIGUOUS':
      lines.push(`Query: ${error.query}`);
      lines.push(`Matches: ${error.matches.join(', ')}`);
      break;

    case 'INVALID_STATUS':
      lines.push(`Provided: ${error.providedStatus}`);
      lines.push(`Valid statuses: ${error.validStatuses.join(', ')}`);
      break;

    case 'INVALID_DATE':
      lines.push(`Provided: ${error.providedDate}`);
      lines.push(`Expected formats: ${error.expectedFormats.join(', ')}`);
      break;

    case 'INVALID_PATH':
      lines.push(`Path: ${error.providedPath}`);
      lines.push(`Allowed paths: ${error.allowedPaths.join(', ')}`);
      break;

    case 'PARSE_ERROR':
      lines.push(`File: ${error.filePath}`);
      if (error.lineNumber) lines.push(`Line: ${error.lineNumber}`);
      if (error.details) lines.push(`Details: ${error.details}`);
      break;

    case 'MISSING_FIELD':
      lines.push(`File: ${error.filePath}`);
      lines.push(`Field: ${error.fieldName}`);
      break;

    case 'REFERENCE_ERROR':
      lines.push(`File: ${error.filePath}`);
      lines.push(`Broken reference: ${error.brokenReference}`);
      break;

    case 'PERMISSION_ERROR':
      lines.push(`File: ${error.filePath}`);
      lines.push(`Operation: ${error.operation}`);
      break;

    case 'CONFIG_ERROR':
      lines.push(`Details: ${error.details}`);
      if (error.suggestion) lines.push(`Suggestion: ${error.suggestion}`);
      break;
  }

  return lines.join('\n');
}

/**
 * Format an error as JSON
 */
function formatJson(error: CliError): string {
  return JSON.stringify(
    {
      error: true,
      ...error,
    },
    null,
    2
  );
}

/**
 * Format a CLI error for the specified output mode
 */
export function formatError(error: CliError, mode: OutputMode): string {
  switch (mode) {
    case 'human':
      return formatHuman(error);
    case 'ai':
      return formatAi(error);
    case 'json':
      return formatJson(error);
  }
}

/**
 * Exit code mapping for error codes
 */
export const exitCodes: Record<ErrorCode, number> = {
  NOT_FOUND: 1,
  AMBIGUOUS: 1,
  INVALID_STATUS: 2,
  INVALID_DATE: 2,
  INVALID_PATH: 2,
  PARSE_ERROR: 3,
  MISSING_FIELD: 3,
  REFERENCE_ERROR: 3,
  PERMISSION_ERROR: 4,
  CONFIG_ERROR: 5,
};

/**
 * Get the exit code for an error
 */
export function getExitCode(error: CliError): number {
  return exitCodes[error.code];
}
