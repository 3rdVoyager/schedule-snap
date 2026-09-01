import { generateHexToken } from "./auth.js";
import { json, validateSettings } from "./lib.js";

export async function createEvent(request, env) {
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
  const eventCode = String(randomNumber % 100_000_000).padStart(8, "0");
  const manageToken = generateHexToken();

  const settingsToStore = JSON.stringify({
    description,
    ...validated.settings,
  });

  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO events (id, event_code, manage_token, title, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(id, eventCode, manageToken, title, settingsToStore, now, now)
    .run();

  return json({ id, eventCode, manageToken }, 201);
}
