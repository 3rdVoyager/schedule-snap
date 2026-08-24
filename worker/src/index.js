const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const VALID_DURATIONS = new Set([30, 45, 60, 90, 120, 180, 360]);

function json(data, status = 200) {
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

function validateSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== "object") {
    return { error: "settings is required" };
  }

  const timezone = rawSettings.timezone;
  if (!isValidTimezone(timezone)) {
    return { error: "settings.timezone must be a valid IANA timezone" };
  }

  const durationMinutes = rawSettings.durationMinutes;
  if (!VALID_DURATIONS.has(durationMinutes)) {
    return {
      error:
        "settings.durationMinutes must be one of 30, 45, 60, 90, 120, 180, 360",
    };
  }

  const schedulingWindows = rawSettings.schedulingWindows;
  if (!Array.isArray(schedulingWindows) || schedulingWindows.length === 0) {
    return { error: "settings.schedulingWindows must have at least one window" };
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
    return { error: "settings.responseWindow.opensAt must be null or a UTC ISO timestamp" };
  }
  if (responseWindow.closesAt !== null && !closesAt) {
    return { error: "settings.responseWindow.closesAt must be null or a UTC ISO timestamp" };
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

function parseStoredSettings(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function publicSettings(stored) {
  if (!stored || typeof stored !== "object") return {};
  const { description: _description, ...settings } = stored;
  return settings;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const segments = path.split("/"); // "/api/events/27473282" → ["", "api", "events", "27473282"]

    // CORS preflight check
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Create event
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      request.method === "POST"
    ) {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Body must be valid JSON" }, 400);
      }

      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (title.length === 0) {
        return json({ error: "title is required" }, 400);
      }

      const description =
        typeof body.description === "string" ? body.description.trim() : "";

      const validated = validateSettings(body.settings);
      if (validated.error) {
        return json({ error: validated.error }, 400);
      }

      const id = crypto.randomUUID();

      const randomNumber = crypto.getRandomValues(new Uint32Array(1))[0];
      const joinCode = String(randomNumber % 100_000_000).padStart(8, "0");

      const tokenBytes = crypto.getRandomValues(new Uint8Array(16));
      const manageToken = [...tokenBytes]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const settingsToStore = JSON.stringify({
        description,
        ...validated.settings,
      });

      const now = new Date().toISOString();

      await env.DB.prepare(
        "INSERT INTO events (id, join_code, manage_token, title, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(id, joinCode, manageToken, title, settingsToStore, now, now)
        .run();

      return json({ id, joinCode, manageToken }, 201);
    }

    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] &&
      request.method === "GET"
    ) {
      const code = segments[3];
      const event = await env.DB.prepare(
        "SELECT * FROM events WHERE join_code = ?",
      )
        .bind(code)
        .first();
      if (event === null) {
        return json({ error: "Event not found" }, 404);
      }

      const stored = parseStoredSettings(event.settings) ?? {};

      return json({
        id: event.id,
        joinCode: event.join_code,
        title: event.title,
        description:
          typeof stored.description === "string" ? stored.description : "",
        settings: publicSettings(stored),
        createdAt: event.created_at,
        updatedAt: event.updated_at,
      });
    }

    return json({ message: "Not found" }, 404);
  },
};
