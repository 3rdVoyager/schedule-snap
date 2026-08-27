/**
 * Time helpers for ScheduleSnap.
 *
 * The API stores UTC ISO strings ("2026-09-01T13:00:00.000Z").
 * HTML <input type="datetime-local"> values have NO timezone — "2026-09-01T09:00"
 * means "9:00 on the wall clock somewhere", not a universal instant.
 *
 * These functions bridge that gap using the event's IANA timezone
 * (e.g. "America/New_York"), which encodes daylight-saving rules.
 */

/**
 * Display a UTC instant in a specific timezone for humans.
 *
 * @param {string} iso - UTC ISO string from the API (with trailing Z)
 * @param {string} tz  - IANA timezone name from event settings
 * @returns {string}   - Locale-formatted date/time, e.g. "Sep 2, 2026, 9:00 AM"
 *
 * Example: formatInZone("2026-09-02T13:00:00.000Z", "America/New_York")
 *          → "Sep 2, 2026, 9:00 AM" (EDT is UTC-4 in September)
 */
export function formatInZone(iso, tz) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/**
 * At a given instant, how many milliseconds is timezone `tz` ahead of UTC?
 *
 * JavaScript Date objects are always UTC internally. Intl can answer:
 * "At instant X, what does the clock in zone Z read?" We compare that
 * wall-clock reading (interpreted as UTC) to the real instant to get the offset.
 *
 * Positive offset = zone is ahead of UTC (e.g. Tokyo +9h).
 * Negative offset = zone is behind UTC (e.g. New York -4h in summer).
 *
 * @param {Date} date - Any instant
 * @param {string} tz - IANA timezone name
 * @returns {number}  - Offset in milliseconds
 */
function tzOffsetMs(date, tz) {
  // Ask Intl: at `date`, what are the year/month/day/hour/minute in `tz`?
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  // formatToParts returns labeled pieces, e.g. [{ type: "month", value: "09" }, ...]
  const get = (type) => Number(parts.find((p) => p.type === type).value);

  // Pretend those wall-clock numbers ARE UTC — gives us a fake instant to compare against.
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1, // JS months are 0-indexed
    get("day"),
    get("hour") % 24, // en-US sometimes formats midnight as hour "24"
    get("minute"),
  );

  // Difference between "what the zone's clock reads (as UTC)" and the real instant = offset.
  return asUtc - date.getTime();
}

/**
 * Convert a datetime-local value + IANA timezone → UTC ISO string for the API.
 *
 * The hard problem: "2026-09-01T09:00" from an input means "9 AM in the event
 * timezone", but JS has no built-in parser for that. This uses a two-step trick:
 *
 *   1. Append "Z" so the parser treats 09:00 as if it were UTC (wrong on purpose).
 *   2. Look up how far `tz` is from UTC at that instant, then subtract the offset.
 *
 * @param {string} naive - datetime-local string, e.g. "2026-09-01T09:00"
 * @param {string} tz     - IANA timezone, e.g. "America/New_York"
 * @returns {string}      - UTC ISO string, e.g. "2026-09-01T13:00:00.000Z"
 *
 * Walkthrough (9 AM New York, September = EDT, UTC-4):
 *   naive     = "2026-09-01T09:00"
 *   wallAsUtc = Date("2026-09-01T09:00Z")     — fake: treats 09:00 as UTC
 *   offset    = tzOffsetMs(...)               — at 09:00Z, NY clock reads 05:00 → -4h
 *   result    = 09:00Z minus (-4h) = 13:00Z   — correct UTC instant for 9 AM NY
 */
export function zonedToUtcIso(naive, tz) {
  const wallAsUtc = new Date(naive + "Z");
  const offset = tzOffsetMs(wallAsUtc, tz);
  return new Date(wallAsUtc.getTime() - offset).toISOString();
}
