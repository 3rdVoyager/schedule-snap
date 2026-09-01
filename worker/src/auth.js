import { json } from "./lib.js";

export function bearerToken(request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function requireBearer(request) {
  const token = bearerToken(request);
  if (!token) {
    return { error: json({ error: "Authorization required" }, 401) };
  }
  return { token };
}

export function generateHexToken(byteLength = 16) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...tokenBytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
