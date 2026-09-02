import {
  fetchEventResponses,
  getEventByManageToken,
  json,
  parseStoredSettings,
  parseViewResponses,
  publicSettings,
} from "./lib.js";

async function loadViewData(env, event) {
  const stored = parseStoredSettings(event.settings) ?? {};
  const rows = await fetchEventResponses(env, event.id);
  const settings = publicSettings(stored);
  const responses = parseViewResponses(rows);

  return {
    eventCode: event.event_code,
    title: event.title,
    settings,
    responses,
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
