import {
  getEventByManageToken,
  json,
  parseStoredSettings,
  parseViewResponses,
  publicSettings,
} from "./lib.js";

async function loadViewData(env, event) {
  const stored = parseStoredSettings(event.settings) ?? {};

  const rows = await env.DB.prepare(
    "SELECT * FROM responses WHERE event_id = ? ORDER BY created_at ASC",
  )
    .bind(event.id)
    .all();

  return {
    eventCode: event.event_code,
    title: event.title,
    settings: publicSettings(stored),
    recommendations: [],
    responses: parseViewResponses(rows),
  };
}

export async function getOrganizerView(env, manageToken) {
  const event = await getEventByManageToken(env, manageToken);

  if (event === null) {
    return json({ error: "Invalid organizer secret" }, 404);
  }

  return json(await loadViewData(env, event));
}

export async function getParticipantView(env, eventCode) {
  const event = await env.DB.prepare(
    "SELECT * FROM events WHERE event_code = ?",
  )
    .bind(eventCode)
    .first();

  if (event === null) {
    return json({ error: "Event not found" }, 404);
  }

  const stored = parseStoredSettings(event.settings) ?? {};

  if (!stored.resultsVisibleToParticipants) {
    return json({ error: "Results are not visible to participants" }, 403);
  }

  return json(await loadViewData(env, event));
}
