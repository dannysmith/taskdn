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

    case 'MISSING_FIELD':
      lines.push('');
      lines.push(dim('File:') + ` ${error.filePath}`);
      lines.push(dim('Missing field:') + ` ${error.fieldName}`);
      break;

    case 'REFERENCE_ERROR':
      lines.push('');
      lines.push(dim('File:') + ` ${error.filePath}`);
      lines.push(dim('Broken reference:') + ` ${error.brokenReference}`);
      break;

    case 'PERMISSION_ERROR':
      lines.push('');
      lines.push(dim('File:') + ` ${error.filePath}`);
      lines.push(dim('Operation:') + ` ${error.operation}`);
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
 * Format an error for AI-readable output (structured Markdown)
 * Uses the format: ## Error: CODE with - **field:** value lines
 */
function formatAi(error: CliError): string {
  const lines: string[] = [];

  lines.push(`## Error: ${error.code}`);
  lines.push('');
  lines.push(`- **message:** ${error.message}`);

  switch (error.code) {
    case 'NOT_FOUND':
      lines.push(`- **path:** ${error.query}`);
      if (error.suggestions && error.suggestions.length > 0) {
        lines.push(`- **suggestion:** Did you mean ${error.suggestions[0]}?`);
      }
      break;

    case 'AMBIGUOUS':
      lines.push(`- **query:** ${error.query}`);
      lines.push(`- **matches:**`);
      for (const match of error.matches) {
        lines.push(`  - ${match}`);
      }
      break;

    case 'INVALID_STATUS':
      lines.push(`- **value:** ${error.providedStatus}`);
      lines.push(`- **valid-values:** ${error.validStatuses.join(', ')}`);
      break;

    case 'INVALID_DATE':
      lines.push(`- **value:** ${error.providedDate}`);
      lines.push(`- **expected-formats:** ${error.expectedFormats.join(', ')}`);
      break;

    case 'INVALID_PATH':
      lines.push(`- **path:** ${error.providedPath}`);
      lines.push(`- **allowed-paths:** ${error.allowedPaths.join(', ')}`);
      break;

    case 'PARSE_ERROR':
      lines.push(`- **path:** ${error.filePath}`);
      if (error.lineNumber) lines.push(`- **line:** ${error.lineNumber}`);
      if (error.details) lines.push(`- **details:** ${error.details}`);
      break;

    case 'MISSING_FIELD':
      lines.push(`- **path:** ${error.filePath}`);
      lines.push(`- **field:** ${error.fieldName}`);
      break;

    case 'REFERENCE_ERROR':
      lines.push(`- **path:** ${error.filePath}`);
      lines.push(`- **broken-reference:** ${error.brokenReference}`);
      break;

    case 'PERMISSION_ERROR':
      lines.push(`- **path:** ${error.filePath}`);
      lines.push(`- **operation:** ${error.operation}`);
      break;

    case 'CONFIG_ERROR':
      lines.push(`- **details:** ${error.details}`);
      if (error.suggestion) lines.push(`- **suggestion:** ${error.suggestion}`);
      break;
  }

  return lines.join('\n');
}

/**
 * Format an error as JSON
 * Normalizes field names for consistency with the spec
 */
function formatJson(error: CliError): string {
  const base = {
    error: true,
    code: error.code,
    message: error.message,
  };

  switch (error.code) {
    case 'NOT_FOUND':
      return JSON.stringify(
        {
          ...base,
          path: error.query,
          ...(error.suggestions &&
            error.suggestions.length > 0 && { suggestion: error.suggestions[0] }),
        },
        null,
        2
      );

    case 'AMBIGUOUS':
      return JSON.stringify(
        {
          ...base,
          query: error.query,
          matches: error.matches,
        },
        null,
        2
      );

    case 'INVALID_STATUS':
      return JSON.stringify(
        {
          ...base,
          value: error.providedStatus,
          validValues: error.validStatuses,
        },
        null,
        2
      );

    case 'INVALID_DATE':
      return JSON.stringify(
        {
          ...base,
          value: error.providedDate,
          expectedFormats: error.expectedFormats,
        },
        null,
        2
      );

    case 'INVALID_PATH':
      return JSON.stringify(
        {
          ...base,
          path: error.providedPath,
          allowedPaths: error.allowedPaths,
        },
        null,
        2
      );

    case 'PARSE_ERROR':
      return JSON.stringify(
        {
          ...base,
          path: error.filePath,
          ...(error.lineNumber && { line: error.lineNumber }),
          ...(error.details && { details: error.details }),
        },
        null,
        2
      );

    case 'MISSING_FIELD':
      return JSON.stringify(
        {
          ...base,
          path: error.filePath,
          field: error.fieldName,
        },
        null,
        2
      );

    case 'REFERENCE_ERROR':
      return JSON.stringify(
        {
          ...base,
          path: error.filePath,
          brokenReference: error.brokenReference,
        },
        null,
        2
      );

    case 'PERMISSION_ERROR':
      return JSON.stringify(
        {
          ...base,
          path: error.filePath,
          operation: error.operation,
        },
        null,
        2
      );

    case 'CONFIG_ERROR':
      return JSON.stringify(
        {
          ...base,
          details: error.details,
          ...(error.suggestion && { suggestion: error.suggestion }),
        },
        null,
        2
      );

    default:
      // For any unhandled error types, just return the base info
      return JSON.stringify(base, null, 2);
  }
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
    case 'ai-json':
      // Both json and ai-json use JSON format for errors
      return formatJson(error);
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unhandled output mode: ${_exhaustive}`);
    }
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
