/**
 * Body utilities for context commands.
 * Per ai-context.md Section 2.4
 */

/**
 * Truncate body content to a reasonable excerpt.
 * Returns first 20 lines OR first 200 words, whichever is shorter.
 *
 * @param body - The body content to truncate
 * @param maxLines - Maximum number of lines (default 20)
 * @param maxWords - Maximum number of words (default 200)
 * @returns Truncated body, or empty string if body is empty/undefined
 */
export function truncateBody(
  body: string | undefined,
  maxLines: number = 20,
  maxWords: number = 200
): string {
  if (!body || body.trim() === '') {
    return '';
  }

  const trimmedBody = body.trim();
  const lines = trimmedBody.split('\n');
  const words = trimmedBody.split(/\s+/);

  // Case 1: Under both limits, return as-is
  if (lines.length <= maxLines && words.length <= maxWords) {
    return trimmedBody;
  }

  // Case 2: Truncate by lines first
  if (lines.length > maxLines) {
    const truncatedLines = lines.slice(0, maxLines);
    const truncatedByLines = truncatedLines.join('\n');

    // Check if this is also under word limit
    const truncatedWords = truncatedByLines.split(/\s+/);
    if (truncatedWords.length <= maxWords) {
      return truncatedByLines;
    }

    // Both limits exceeded - use whichever gives shorter result
    return truncateByWords(truncatedByLines, maxWords);
  }

  // Case 3: Only word limit exceeded
  return truncateByWords(trimmedBody, maxWords);
}

/**
 * Truncate text by word count while preserving whole words
 */
function truncateByWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }

  // Join first N words
  const truncated = words.slice(0, maxWords).join(' ');

  // Try to end at a sentence boundary if near the end
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  // If we find a sentence end in the last 20% of the text, use it
  if (lastSentenceEnd > truncated.length * 0.8) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  return truncated;
}

/**
 * Check if body content is empty or whitespace-only
 */
export function isEmptyBody(body: string | undefined): boolean {
  return !body || body.trim() === '';
}

/**
 * Count words in text
 */
export function countWords(text: string | undefined): number {
  if (!text || text.trim() === '') {
    return 0;
  }
  return text.trim().split(/\s+/).length;
}

/**
 * Count lines in text
 */
export function countLines(text: string | undefined): number {
  if (!text || text.trim() === '') {
    return 0;
  }
  return text.trim().split('\n').length;
}
