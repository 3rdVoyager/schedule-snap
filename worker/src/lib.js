export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const validDurationMinutes = new Set([30, 45, 60, 90, 120, 180, 360]);

export function json(data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

function isValidTimezone(tz) {
  if (typeof tz !== "string" || tz.trim() === "") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function parseUtcInstant(value) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateTimeRange(range, fieldName) {
  if (!range || typeof range !== "object") {
    return `${fieldName} must be an object with start and end`;
  }
  const start = parseUtcInstant(range.start);
  const end = parseUtcInstant(range.end);
  if (!start || !end) {
    return `${fieldName} start and end must be valid UTC ISO timestamps`;
  }
  if (end <= start) {
    return `${fieldName} end must be after start`;
  }
  return null;
}

export function isInsideWindow(range, window) {
  const rangeStart = parseUtcInstant(range.start);
  const rangeEnd = parseUtcInstant(range.end);
  const windowStart = parseUtcInstant(window.start);
  const windowEnd = parseUtcInstant(window.end);
  if (!rangeStart || !rangeEnd || !windowStart || !windowEnd) return false;
  return rangeStart >= windowStart && rangeEnd <= windowEnd;
}

export function validateSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== "object") {
    return { error: "settings is required" };
  }

  const timezone = rawSettings.timezone;
  if (!isValidTimezone(timezone)) {
    return { error: "settings.timezone must be a valid IANA timezone" };
  }

  const durationMinutes = rawSettings.durationMinutes;
  if (!validDurationMinutes.has(durationMinutes)) {
    return {
      error:
        "settings.durationMinutes must be one of 30, 45, 60, 90, 120, 180, 360",
    };
  }

  const schedulingWindows = rawSettings.schedulingWindows;
  if (!Array.isArray(schedulingWindows) || schedulingWindows.length === 0) {
    return {
      error: "settings.schedulingWindows must have at least one window",
    };
  }

  for (let i = 0; i < schedulingWindows.length; i++) {
    const rangeError = validateTimeRange(
      schedulingWindows[i],
      `settings.schedulingWindows[${i}]`,
    );
    if (rangeError) return { error: rangeError };
  }

  const allowResponseEdits =
    rawSettings.allowResponseEdits === undefined
      ? true
      : rawSettings.allowResponseEdits;
  const resultsVisibleToParticipants =
    rawSettings.resultsVisibleToParticipants === undefined
      ? false
      : rawSettings.resultsVisibleToParticipants;

  if (typeof allowResponseEdits !== "boolean") {
    return { error: "settings.allowResponseEdits must be a boolean" };
  }
  if (typeof resultsVisibleToParticipants !== "boolean") {
    return { error: "settings.resultsVisibleToParticipants must be a boolean" };
  }

  const acceptingResponses =
    rawSettings.acceptingResponses === undefined
      ? true
      : rawSettings.acceptingResponses;
  if (typeof acceptingResponses !== "boolean") {
    return { error: "settings.acceptingResponses must be a boolean" };
  }

  return {
    settings: {
      timezone,
      durationMinutes,
      schedulingWindows,
      allowResponseEdits,
      resultsVisibleToParticipants,
      acceptingResponses,
    },
  };
}

export function parseStoredSettings(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function publicSettings(stored) {
  if (!stored || typeof stored !== "object") return {};
  const { description: _description, responseWindow: _responseWindow, ...settings } =
    stored;
  return settings;
}

export function validateAvailability(raw) {
  if (!Array.isArray(raw)) {
    return { error: "availability must be an array" };
  }
  const availability = [];
  for (let i = 0; i < raw.length; i++) {
    const rangeError = validateTimeRange(raw[i], `availability[${i}]`);
    if (rangeError) return { error: rangeError };
    availability.push({
      start: raw[i].start,
      end: raw[i].end,
    });
  }
  return { availability };
}

function availabilityKey(range) {
  return `${range.start}|${range.end}`;
}

export { availabilityKey };

export function validatePreferences(raw, availability) {
  if (raw === null || raw === undefined) {
    if (availability.length === 0) {
      return { preferences: null };
    }
    const preferences = {};
    for (const range of availability) {
      preferences[availabilityKey(range)] = 3;
    }
    return { preferences };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "preferences must be an object" };
  }

  const allowedKeys = new Set(availability.map(availabilityKey));
  const preferences = {};

  for (const range of availability) {
    const key = availabilityKey(range);
    const value = raw[key];
    if (value === undefined) {
      preferences[key] = 3;
      continue;
    }
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return {
        error: `preferences["${key}"] must be an integer from 1 to 5`,
      };
    }
    preferences[key] = value;
  }

  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      return {
        error: `preferences key "${key}" does not match any availability range`,
      };
    }
  }

  return { preferences };
}

export async function getEventByManageToken(env, manageToken) {
  return env.DB.prepare("SELECT * FROM events WHERE manage_token = ?")
    .bind(manageToken)
    .first();
}

export async function getResponseWithEventByEditToken(env, editToken) {
  const row = await env.DB.prepare(
    `SELECT responses.*, events.event_code, events.title AS event_title, events.settings AS event_settings
     FROM responses
     JOIN events ON events.id = responses.event_id
     WHERE responses.edit_token = ?`,
  )
    .bind(editToken)
    .first();
  return row ?? null;
}

export function parseResponseRow(row) {
  let availability = [];
  try {
    availability = JSON.parse(row.availability);
  } catch {
    availability = [];
  }
  let preferences = null;
  if (row.preferences != null) {
    try {
      preferences = JSON.parse(row.preferences);
    } catch {
      preferences = null;
    }
  }
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    critical: row.critical === 1,
    availability,
    preferences,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildManageEventPayload(event, rows) {
  const stored = parseStoredSettings(event.settings) ?? {};
  return {
    id: event.id,
    eventCode: event.event_code,
    title: event.title,
    description:
      typeof stored.description === "string" ? stored.description : "",
    settings: publicSettings(stored),
    responses: (rows.results ?? []).map((row) => parseResponseRow(row)),
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

export async function fetchEventResponses(env, eventId) {
  return env.DB.prepare(
    "SELECT * FROM responses WHERE event_id = ? ORDER BY created_at ASC",
  )
    .bind(eventId)
    .all();
}

export async function isDisplayNameTaken(
  env,
  eventId,
  displayName,
  excludeResponseId = null,
) {
  const row = excludeResponseId
    ? await env.DB.prepare(
        "SELECT 1 FROM responses WHERE event_id = ? AND display_name = ? AND id != ? LIMIT 1",
      )
        .bind(eventId, displayName, excludeResponseId)
        .first()
    : await env.DB.prepare(
        "SELECT 1 FROM responses WHERE event_id = ? AND display_name = ? LIMIT 1",
      )
        .bind(eventId, displayName)
        .first();
  return row !== null;
}

export function parseViewResponses(rows) {
  return (rows.results ?? []).map((row) => {
    const parsed = parseResponseRow(row);
    return {
      id: parsed.id,
      displayName: parsed.displayName,
      availability: parsed.availability,
      preferences: parsed.preferences,
      critical: parsed.critical,
    };
  });
}
