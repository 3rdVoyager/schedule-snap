import {
  buildManageEventPayload,
  fetchEventResponses,
  getEventByManageToken,
  json,
  validateSettings,
} from "./lib.js";

export async function getManageEvent(env, manageToken) {
  const event = await getEventByManageToken(env, manageToken);

  if (event === null) {
    return json({ error: "Invalid organizer secret" }, 404);
  }

  const rows = await fetchEventResponses(env, event.id);
  return json(buildManageEventPayload(event, rows));
}

export async function updateManageEvent(request, env, manageToken) {
  const event = await getEventByManageToken(env, manageToken);

  if (event === null) {
    return json({ error: "Invalid organizer secret" }, 404);
  }

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

  const settingsToStore = JSON.stringify({
    description,
    ...validated.settings,
  });

  const now = new Date().toISOString();

  await env.DB.prepare(
    "UPDATE events SET title = ?, settings = ?, updated_at = ? WHERE id = ?",
  )
    .bind(title, settingsToStore, now, event.id)
    .run();

  const updated = await getEventByManageToken(env, manageToken);
  const rows = await fetchEventResponses(env, event.id);
  return json(buildManageEventPayload(updated, rows));
}

export async function deleteManageEvent(env, manageToken) {
  const event = await getEventByManageToken(env, manageToken);

  if (event === null) {
    return json({ error: "Invalid organizer secret" }, 404);
  }

  await env.DB.prepare("DELETE FROM responses WHERE event_id = ?")
    .bind(event.id)
    .run();
  await env.DB.prepare("DELETE FROM events WHERE id = ?")
    .bind(event.id)
    .run();

  return json({ ok: true });
}

export async function updateResponseCritical(
  request,
  env,
  manageToken,
  responseId,
) {
  const event = await getEventByManageToken(env, manageToken);
  if (event === null) {
    return json({ error: "Invalid organizer secret" }, 404);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be valid JSON" }, 400);
  }

  if (typeof body.critical !== "boolean") {
    return json({ error: "critical must be a boolean" }, 400);
  }

  const response = await env.DB.prepare(
    "SELECT id FROM responses WHERE id = ? AND event_id = ?",
  )
    .bind(responseId, event.id)
    .first();

  if (response === null) {
    return json({ error: "Response not found" }, 404);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE responses SET critical = ?, updated_at = ? WHERE id = ?",
  )
    .bind(body.critical ? 1 : 0, now, responseId)
    .run();

  const rows = await fetchEventResponses(env, event.id);
  const updated = await getEventByManageToken(env, manageToken);
  return json(buildManageEventPayload(updated, rows));
}
