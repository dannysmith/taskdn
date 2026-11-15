/**
 * Date helpers for test vaults. Vault dates are plain `YYYY-MM-DD` calendar
 * dates; all arithmetic happens in UTC so it never crosses a DST change.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True if `value` is a real calendar date in `YYYY-MM-DD` form. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d
}

function toUtc(date: string): number {
  if (!isIsoDate(date)) throw new Error(`Not a valid YYYY-MM-DD date: ${date}`)
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** `date` moved by `days` (negative moves back). */
export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * 86_400_000)
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

/** Today's date on this machine, in local time. */
export function localToday(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Full ISO dates anywhere in text, not touching other digits. Partial dates
 * (`2024-06`), years and longer digit runs don't match. A time or offset after
 * the date is left as written.
 */
const DATE_IN_TEXT = /(?<!\d)(\d{4}-\d{2}-\d{2})(?!\d)/g

/**
 * Shift every full ISO date in `text` by `days`. Strings that look like dates
 * but aren't real ones (`2026-13-40`) are left alone.
 */
export function shiftDatesInText(text: string, days: number): string {
  if (days === 0) return text
  return text.replace(DATE_IN_TEXT, (match) => (isIsoDate(match) ? addDays(match, days) : match))
}
