const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
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
      // Validate body
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Body must be valid JSON" }, 400);
      }

      // Validate title
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (title.length === 0) {
        return json({ error: "title is required" }, 400);
      }

      // Generate event ID and join code
      const id = crypto.randomUUID();

      const randomNumber = crypto.getRandomValues(new Uint32Array(1))[0];
      const joinCode = String(randomNumber % 100_000_000).padStart(8, "0");

      // Generate manage token
      const tokenBytes = crypto.getRandomValues(new Uint8Array(16));
      const manageToken = [...tokenBytes]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Insert event into database
      const now = new Date().toISOString();

      await env.DB.prepare(
        "INSERT INTO events (id, join_code, manage_token, title, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(id, joinCode, manageToken, title, null, now, now)
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
      return json({
        id: event.id,
        joinCode: event.join_code,
        title: event.title,
        settings: event.settings,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
      });
    }

    return json({ message: "Not found" }, 404);
  },
};
