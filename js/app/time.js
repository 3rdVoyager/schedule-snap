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

/**
 * Convert a UTC ISO instant to a datetime-local string in the event timezone.
 */
export function utcToDatetimeLocal(iso, tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type) => parts.find((p) => p.type === type).value;
  const hour = String(Number(get("hour")) % 24).padStart(2, "0");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** YYYY-MM-DD for an instant in the event timezone. */
export function dateKeyInZone(iso, tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Minutes from local midnight (0–1439) for an instant in the event timezone. */
export function minutesInZone(iso, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return (get("hour") % 24) * 60 + get("minute");
}

/** Add calendar days to a YYYY-MM-DD key in the event timezone. */
export function addDaysToDateKey(dayKey, days, tz) {
  const noon = zonedToUtcIso(`${dayKey}T12:00`, tz);
  const next = new Date(new Date(noon).getTime() + days * 86400000);
  return dateKeyInZone(next.toISOString(), tz);
}

/** Clip a scheduling window to one calendar day; returns minute bounds or null. */
export function intersectWindowWithDay(window, dayKey, tz) {
  const dayStartIso = zonedToUtcIso(`${dayKey}T00:00`, tz);
  const dayEndIso = zonedToUtcIso(`${addDaysToDateKey(dayKey, 1, tz)}T00:00`, tz);
  const winStart = new Date(window.start).getTime();
  const winEnd = new Date(window.end).getTime();
  const clipStart = Math.max(winStart, new Date(dayStartIso).getTime());
  const clipEnd = Math.min(winEnd, new Date(dayEndIso).getTime());
  if (clipStart >= clipEnd) return null;
  const dayEndMs = new Date(dayEndIso).getTime();
  let endMinutes = minutesInZone(new Date(clipEnd).toISOString(), tz);
  // Midnight at the start of the next day means end-of-day, not minute 0.
  if (clipEnd >= dayEndMs) {
    endMinutes = 24 * 60;
  }
  return {
    startMinutes: minutesInZone(new Date(clipStart).toISOString(), tz),
    endMinutes,
  };
}

/** Whether any scheduling window overlaps this calendar day. */
export function isDayInSchedulingWindows(dayKey, schedulingWindows, tz) {
  return schedulingWindows.some(
    (w) => intersectWindowWithDay(w, dayKey, tz) !== null,
  );
}

/** All scheduling segments (minute bounds) for one day. */
export function getDayWindowSegments(schedulingWindows, dayKey, tz) {
  return schedulingWindows
    .map((w) => intersectWindowWithDay(w, dayKey, tz))
    .filter(Boolean)
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

/** Build a UTC ISO range from local day + minute bounds. */
export function rangeFromDayMinutes(dayKey, startMinutes, endMinutes, tz) {
  const fmt = (mins) => {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    return `${h}:${m}`;
  };
  const endDay =
    endMinutes >= 24 * 60 ? addDaysToDateKey(dayKey, 1, tz) : dayKey;
  const endMins = endMinutes >= 24 * 60 ? 0 : endMinutes;
  return {
    start: zonedToUtcIso(`${dayKey}T${fmt(startMinutes)}`, tz),
    end: zonedToUtcIso(`${endDay}T${fmt(endMins)}`, tz),
  };
}

/** Format minutes as compact label for calendar grid (no wrap). */
export function formatMinutesLabel(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "p" : "a";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")}${period}`;
}
