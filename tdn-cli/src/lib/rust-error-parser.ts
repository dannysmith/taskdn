import type { TdnError } from '@bindings';
import { createError, type CliError, type EntityType } from '@/errors/types.ts';

/**
 * Parse a Rust error into a CLI error type.
 *
 * Rust errors are serialized as JSON in the error message by the TdnError::into() implementation.
 * This function extracts the structured error information and maps it to appropriate CLI errors.
 */
export function parseRustError(error: unknown, entityType: EntityType = 'task'): CliError {
  const message = error instanceof Error ? error.message : String(error);

  // Try to parse as JSON error
  try {
    const parsed = JSON.parse(message) as TdnError;

    switch (parsed.kind) {
      case 'FileNotFound':
        return createError.notFound(entityType, parsed.path || '(unknown)');

      case 'ParseError': {
        const details = parsed.message.replace(/^Failed to parse frontmatter:\s*/, '');
        return createError.parseError(parsed.path || '(unknown)', undefined, details);
      }

      case 'ValidationError':
        // Validation errors are treated as parse errors in the CLI
        return createError.parseError(parsed.path || '(unknown)', undefined, parsed.message);

      case 'FileReadError':
      case 'WriteError':
        // File I/O errors are treated as parse errors in the CLI
        return createError.parseError(parsed.path || '(unknown)', undefined, parsed.message);

      default:
        // Unknown error kinds are treated as parse errors
        return createError.parseError('(unknown)', undefined, parsed.message);
    }
  } catch {
    // Not a JSON error - fall back to string-based parsing for backwards compatibility
    // This handles cases where Rust code might still throw old-style errors
    if (message.includes('File not found')) {
      // Extract path from message if possible
      const pathMatch = message.match(/File not found: (.+)/);
      const path: string = pathMatch?.[1] ?? '(unknown)';
      return createError.notFound(entityType, path);
    } else if (
      message.includes('Failed to parse frontmatter') ||
      message.includes('No frontmatter found')
    ) {
      const details = message.replace(/^Failed to parse frontmatter:\s*/, '');
      return createError.parseError('(unknown)', undefined, details);
    } else {
      // Generic error
      return createError.parseError('(unknown)', undefined, message);
    }
  }
}
