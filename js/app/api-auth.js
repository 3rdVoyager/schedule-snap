export function bearerAuth(type, value) {
  return { Authorization: `Bearer ${type}:${value}` };
}

export function jsonHeaders(type, value) {
  return { "Content-Type": "application/json", ...bearerAuth(type, value) };
}
