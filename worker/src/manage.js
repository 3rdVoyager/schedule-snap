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
