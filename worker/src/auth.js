import { json } from "./lib.js";

const AUTH_TYPES = new Set(["event", "edit", "manage"]);

export function bearerToken(request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

function normalizeEventCodeValue(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

function normalizeSecretValue(raw) {
  return String(raw ?? "")
    .replace(/[^a-fA-F0-9]/g, "")
    .toLowerCase()
    .slice(0, 32);
}

export function parseBearerAuth(request) {
  const raw = bearerToken(request);
  if (!raw) {
    return { error: json({ error: "Authorization required" }, 401) };
  }

  const colon = raw.indexOf(":");
  if (colon === -1) {
    return { error: json({ error: "Invalid authorization format" }, 401) };
  }

  const type = raw.slice(0, colon);
  const value = raw.slice(colon + 1);

  if (!AUTH_TYPES.has(type)) {
    return { error: json({ error: "Invalid authorization format" }, 401) };
  }

  const normalized =
    type === "event"
      ? normalizeEventCodeValue(value)
      : normalizeSecretValue(value);

  const validLength = type === "event" ? 8 : 32;
  if (normalized.length !== validLength) {
    return { error: json({ error: "Invalid authorization format" }, 401) };
  }

  return { type, value: normalized };
}

export function requireBearerType(request, ...allowedTypes) {
  const parsed = parseBearerAuth(request);
  if (parsed.error) return parsed;
  if (!allowedTypes.includes(parsed.type)) {
    return { error: json({ error: "Authorization required" }, 401) };
  }
  return parsed;
}

export function generateHexToken(byteLength = 16) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...tokenBytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
