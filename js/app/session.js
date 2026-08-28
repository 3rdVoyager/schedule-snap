import {
  addOrganizerEvent,
  getOrganizerEventById,
  getOrganizerEventByToken,
} from "./registry.js";

const ACTIVE_ORGANIZER_KEY = "schedulesnap:activeOrganizerEventId";
const PARTICIPANT_CODE_KEY = "schedulesnap:participantEventCode";

export function normalizeEventCode(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

export function normalizeManageToken(raw) {
  return String(raw ?? "")
    .replace(/[^a-fA-F0-9]/g, "")
    .toLowerCase()
    .slice(0, 32);
}

export function normalizeEditToken(raw) {
  return normalizeManageToken(raw);
}

export function parseDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return {
    code: normalizeEventCode(params.get("code")),
    token: normalizeManageToken(hash.get("token")),
    edit: normalizeEditToken(hash.get("edit")),
    next: params.get("next") ?? "",
  };
}

export function getActiveOrganizerEventId() {
  return sessionStorage.getItem(ACTIVE_ORGANIZER_KEY) ?? "";
}

export function setActiveOrganizerEventId(id) {
  if (id) {
    sessionStorage.setItem(ACTIVE_ORGANIZER_KEY, id);
  } else {
    sessionStorage.removeItem(ACTIVE_ORGANIZER_KEY);
  }
}

export function getParticipantEventCode() {
  return normalizeEventCode(sessionStorage.getItem(PARTICIPANT_CODE_KEY));
}

export function setParticipantEventCode(code) {
  const normalized = normalizeEventCode(code);
  if (normalized.length === 8) {
    sessionStorage.setItem(PARTICIPANT_CODE_KEY, normalized);
  } else {
    sessionStorage.removeItem(PARTICIPANT_CODE_KEY);
  }
}

export function redirectToDashboard(nextPath = "") {
  const url = new URL("/app/", window.location.origin);
  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }
  window.location.replace(url);
}

export function registerOrganizerEvent(data, manageToken) {
  const entry = addOrganizerEvent({
    id: data.id,
    eventCode: data.eventCode,
    manageToken,
    title: data.title,
  });
  setActiveOrganizerEventId(entry.id);
  return entry;
}

export function resolveManageToken() {
  const { token } = parseDeepLink();
  if (token.length === 32) return token;

  const activeId = getActiveOrganizerEventId();
  if (!activeId) return "";

  const event = getOrganizerEventById(activeId);
  return event?.manageToken ?? "";
}

export function resolveParticipantCode() {
  const { code } = parseDeepLink();
  if (code.length === 8) return code;
  return getParticipantEventCode();
}

export function findOrganizerByToken(manageToken) {
  return getOrganizerEventByToken(manageToken);
}
