/**
 * Converts seconds-per-km to a "M:SS/km" display string.
 * e.g. 470 → "7:50/km"
 */
export function formatPaceSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}/km`
}

/**
 * Returns a pace display string from a workout's pace fields.
 * - If pace_min_seconds and pace_max_seconds exist and are different: "7:30–7:50/km"
 * - If they're the same: "7:50/km"
 * - Falls back to legacy pace_target string if numeric fields are null
 * - Returns null if no pace data at all
 */
export function formatWorkoutPace(
  pace_min_seconds: number | null,
  pace_max_seconds: number | null,
  pace_target: string | null
): string | null {
  if (pace_min_seconds !== null && pace_max_seconds !== null) {
    if (pace_min_seconds === pace_max_seconds) {
      return formatPaceSeconds(pace_min_seconds)
    }
    // min is the slower end (higher number), max is the faster end (lower number)
    const slower = formatPaceSeconds(Math.max(pace_min_seconds, pace_max_seconds))
    const faster = formatPaceSeconds(Math.min(pace_min_seconds, pace_max_seconds))
    return `${faster}–${slower}/km`
  }
  // Legacy fallback
  return pace_target ?? null
}

/**
 * Converts a "M:SS/km" string to total seconds.
 * e.g. "7:50/km" → 470
 */
export function paceStringToSeconds(pace: string): number | null {
  const match = pace.match(/^(\d+):(\d{2})/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

/**
 * Adds days to a date string (YYYY-MM-DD) and returns a new YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * Returns YYYY-MM-DD string from a Date object in local time.
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}