import { generateHexToken } from "./auth.js";
import {
  getResponseWithEventByEditToken,
  isInsideWindow,
  json,
  parseResponseRow,
  parseStoredSettings,
  publicSettings,
  validateAvailability,
} from "./lib.js";

export async function getEventByCode(env, eventCode) {
  const event = await env.DB.prepare(
    "SELECT * FROM events WHERE event_code = ?",
  )
    .bind(eventCode)
    .first();

  if (event === null) {
    return json({ error: "Event not found" }, 404);
  }

  const stored = parseStoredSettings(event.settings) ?? {};

  return json({
    id: event.id,
    eventCode: event.event_code,
    title: event.title,
    description:
      typeof stored.description === "string" ? stored.description : "",
    settings: publicSettings(stored),
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  });
}

export async function getResponseForEdit(env, editToken) {
  const row = await getResponseWithEventByEditToken(env, editToken);
  if (row === null) {
    return json({ error: "Invalid edit token" }, 404);
  }

  const stored = parseStoredSettings(row.event_settings) ?? {};

  return json({
    eventCode: row.event_code,
    title: row.event_title,
    description:
      typeof stored.description === "string" ? stored.description : "",
    settings: publicSettings(stored),
    response: parseResponseRow(row),
  });
}

export async function updateResponse(request, env, editToken) {
  const row = await getResponseWithEventByEditToken(env, editToken);
  if (row === null) {
    return json({ error: "Invalid edit token" }, 404);
  }

  const stored = parseStoredSettings(row.event_settings) ?? {};
  if (stored.allowResponseEdits === false) {
    return json({ error: "Response edits are not allowed for this event" }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be valid JSON" }, 400);
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (displayName.length === 0) {
    return json({ error: "displayName is required" }, 400);
  }

  const availability = body.availability;
  if (!Array.isArray(availability)) {
    return json({ error: "availability must be an array" }, 400);
  }

  const validated = validateAvailability(availability);
  if (validated.error) {
    return json({ error: validated.error }, 400);
  }

  const schedulingWindows = stored.schedulingWindows ?? [];
  for (let i = 0; i < validated.availability.length; i++) {
    const range = validated.availability[i];
    const inside = schedulingWindows.some((w) => isInsideWindow(range, w));
    if (!inside) {
      return json(
        { error: `availability[${i}] must fall within a scheduling window` },
        400,
      );
    }
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE responses SET display_name = ?, availability = ?, updated_at = ? WHERE id = ?",
  )
    .bind(displayName, JSON.stringify(validated.availability), now, row.id)
    .run();

  return json({ id: row.id, editToken }, 200);
}

export async function submitResponse(request, env, eventCode) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be valid JSON" }, 400);
  }

  const event = await env.DB.prepare(
    "SELECT * FROM events WHERE event_code = ?",
  )
    .bind(eventCode)
    .first();

  if (event === null) {
    return json({ error: "Event not found" }, 404);
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (displayName.length === 0) {
    return json({ error: "displayName is required" }, 400);
  }

  const availability = body.availability;
  if (!Array.isArray(availability)) {
    return json({ error: "availability must be an array" }, 400);
  }

  const validated = validateAvailability(availability);
  if (validated.error) {
    return json({ error: validated.error }, 400);
  }

  const stored = parseStoredSettings(event.settings) ?? {};
  if (stored.acceptingResponses === false) {
    return json({ error: "This event is no longer accepting new responses" }, 403);
  }

  const schedulingWindows = stored.schedulingWindows ?? [];

  for (let i = 0; i < validated.availability.length; i++) {
    const range = validated.availability[i];
    const inside = schedulingWindows.some((w) => isInsideWindow(range, w));
    if (!inside) {
      return json(
        { error: `availability[${i}] must fall within a scheduling window` },
        400,
      );
    }
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const editToken = generateHexToken();

  await env.DB.prepare(
    "INSERT INTO responses (id, event_id, edit_token, display_name, availability, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      event.id,
      editToken,
      displayName,
      JSON.stringify(validated.availability),
      now,
      now,
    )
    .run();

  return json({ id, editToken }, 201);
}

export async function deleteResponse(env, editToken) {
  const row = await getResponseWithEventByEditToken(env, editToken);
  if (row === null) {
    return json({ error: "Invalid edit token" }, 404);
  }

  await env.DB.prepare("DELETE FROM responses WHERE id = ?")
    .bind(row.id)
    .run();

  return json({ ok: true });
}
