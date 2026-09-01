export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

  const responseWindow = rawSettings.responseWindow ?? {
    opensAt: null,
    closesAt: null,
  };
  if (typeof responseWindow !== "object") {
    return { error: "settings.responseWindow must be an object" };
  }

  const opensAt =
    responseWindow.opensAt === null
      ? null
      : parseUtcInstant(responseWindow.opensAt);
  const closesAt =
    responseWindow.closesAt === null
      ? null
      : parseUtcInstant(responseWindow.closesAt);

  if (responseWindow.opensAt !== null && !opensAt) {
    return {
      error:
        "settings.responseWindow.opensAt must be null or a UTC ISO timestamp",
    };
  }
  if (responseWindow.closesAt !== null && !closesAt) {
    return {
      error:
        "settings.responseWindow.closesAt must be null or a UTC ISO timestamp",
    };
  }
  if (opensAt && closesAt && closesAt <= opensAt) {
    return { error: "settings.responseWindow.closesAt must be after opensAt" };
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

  return {
    settings: {
      timezone,
      durationMinutes,
      schedulingWindows,
      responseWindow: {
        opensAt: responseWindow.opensAt ?? null,
        closesAt: responseWindow.closesAt ?? null,
      },
      allowResponseEdits,
      resultsVisibleToParticipants,
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
  const { description: _description, ...settings } = stored;
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

export function parseViewResponses(rows) {
  return (rows.results ?? []).map((row) => {
    let availability = [];
    try {
      availability = JSON.parse(row.availability);
    } catch {
      availability = [];
    }
    return {
      id: row.id,
      displayName: row.display_name,
      availability,
    };
  });
}
