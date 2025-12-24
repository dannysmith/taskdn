/**
 * Error codes used throughout the CLI
 * See cli-requirements.md for full specification
 */
export type ErrorCode =
  | 'NOT_FOUND'
  | 'AMBIGUOUS'
  | 'INVALID_STATUS'
  | 'INVALID_DATE'
  | 'INVALID_PATH'
  | 'PARSE_ERROR'
  | 'MISSING_FIELD'
  | 'REFERENCE_ERROR'
  | 'PERMISSION_ERROR'
  | 'CONFIG_ERROR';

/**
 * Base interface for all CLI errors
 */
export interface CliErrorBase {
  code: ErrorCode;
  message: string;
}

/**
 * Entity not found error - includes suggestions for similar matches
 */
export interface NotFoundError extends CliErrorBase {
  code: 'NOT_FOUND';
  entityType: 'task' | 'project' | 'area';
  query: string;
  suggestions?: string[];
}

/**
 * Ambiguous match error - fuzzy search returned multiple results
 */
export interface AmbiguousError extends CliErrorBase {
  code: 'AMBIGUOUS';
  query: string;
  matches: string[];
}

/**
 * Invalid status value error
 */
export interface InvalidStatusError extends CliErrorBase {
  code: 'INVALID_STATUS';
  providedStatus: string;
  validStatuses: string[];
}

/**
 * Invalid date format error
 */
export interface InvalidDateError extends CliErrorBase {
  code: 'INVALID_DATE';
  providedDate: string;
  expectedFormats: string[];
}

/**
 * Invalid path error - path outside allowed directories
 */
export interface InvalidPathError extends CliErrorBase {
  code: 'INVALID_PATH';
  providedPath: string;
  allowedPaths: string[];
}

/**
 * YAML parse error
 */
export interface ParseError extends CliErrorBase {
  code: 'PARSE_ERROR';
  filePath: string;
  lineNumber?: number;
  details?: string;
}

/**
 * Missing required field error
 */
export interface MissingFieldError extends CliErrorBase {
  code: 'MISSING_FIELD';
  filePath: string;
  fieldName: string;
}

/**
 * Reference error - referenced entity doesn't exist
 */
export interface ReferenceError extends CliErrorBase {
  code: 'REFERENCE_ERROR';
  filePath: string;
  brokenReference: string;
}

/**
 * Permission error - can't read/write file
 */
export interface PermissionError extends CliErrorBase {
  code: 'PERMISSION_ERROR';
  filePath: string;
  operation: 'read' | 'write';
}

/**
 * Configuration error - config missing or invalid
 */
export interface ConfigError extends CliErrorBase {
  code: 'CONFIG_ERROR';
  details: string;
  suggestion?: string;
}

/**
 * Union of all CLI error types
 */
export type CliError =
  | NotFoundError
  | AmbiguousError
  | InvalidStatusError
  | InvalidDateError
  | InvalidPathError
  | ParseError
  | MissingFieldError
  | ReferenceError
  | PermissionError
  | ConfigError;

/**
 * Type guard to check if a value is a CliError
 */
export function isCliError(value: unknown): value is CliError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as CliError).code === 'string' &&
    typeof (value as CliError).message === 'string'
  );
}

/**
 * Helper functions to create specific error types
 */
export const createError = {
  notFound(
    entityType: 'task' | 'project' | 'area',
    query: string,
    suggestions?: string[]
  ): NotFoundError {
    return {
      code: 'NOT_FOUND',
      message: `${entityType} not found: "${query}"`,
      entityType,
      query,
      suggestions,
    };
  },

  ambiguous(query: string, matches: string[]): AmbiguousError {
    return {
      code: 'AMBIGUOUS',
      message: `Multiple matches found for "${query}"`,
      query,
      matches,
    };
  },

  invalidStatus(providedStatus: string, validStatuses: string[]): InvalidStatusError {
    return {
      code: 'INVALID_STATUS',
      message: `Invalid status: "${providedStatus}"`,
      providedStatus,
      validStatuses,
    };
  },

  invalidDate(
    fieldName: string,
    providedDate: string,
    expectedFormats: string[]
  ): InvalidDateError {
    return {
      code: 'INVALID_DATE',
      message: `Invalid date format for ${fieldName}: "${providedDate}"`,
      providedDate,
      expectedFormats,
    };
  },

  invalidPath(providedPath: string, allowedPaths: string[]): InvalidPathError {
    return {
      code: 'INVALID_PATH',
      message: `Path outside allowed directories: "${providedPath}"`,
      providedPath,
      allowedPaths,
    };
  },

  parseError(filePath: string, lineNumber?: number, details?: string): ParseError {
    const linePart = lineNumber ? ` at line ${lineNumber}` : '';
    return {
      code: 'PARSE_ERROR',
      message: `Failed to parse "${filePath}"${linePart}`,
      filePath,
      lineNumber,
      details,
    };
  },

  missingField(filePath: string, fieldName: string): MissingFieldError {
    return {
      code: 'MISSING_FIELD',
      message: `Missing required field "${fieldName}" in "${filePath}"`,
      filePath,
      fieldName,
    };
  },

  referenceError(filePath: string, brokenReference: string): ReferenceError {
    return {
      code: 'REFERENCE_ERROR',
      message: `Broken reference "${brokenReference}" in "${filePath}"`,
      filePath,
      brokenReference,
    };
  },

  permissionError(filePath: string, operation: 'read' | 'write'): PermissionError {
    return {
      code: 'PERMISSION_ERROR',
      message: `Cannot ${operation} file: "${filePath}"`,
      filePath,
      operation,
    };
  },

  configError(details: string, suggestion?: string): ConfigError {
    return {
      code: 'CONFIG_ERROR',
      message: `Configuration error: ${details}`,
      details,
      suggestion,
    };
  },
};
