const STORAGE_KEY = "schedulesnap:v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { organizerEvents: [], myResponses: [] };
    const data = JSON.parse(raw);
    return {
      organizerEvents: Array.isArray(data.organizerEvents)
        ? data.organizerEvents
        : [],
      myResponses: Array.isArray(data.myResponses) ? data.myResponses : [],
    };
  } catch {
    return { organizerEvents: [], myResponses: [] };
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getOrganizerEvents() {
  return load().organizerEvents;
}

export function getMyResponses() {
  return load().myResponses;
}

export function addOrganizerEvent({ id, eventCode, manageToken, title }) {
  const data = load();
  const existing = data.organizerEvents.findIndex((e) => e.id === id);
  const entry = {
    id,
    eventCode,
    manageToken,
    title: title ?? "Untitled event",
    addedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    data.organizerEvents[existing] = { ...data.organizerEvents[existing], ...entry };
  } else {
    data.organizerEvents.push(entry);
  }
  save(data);
  return entry;
}

export function addMyResponse({
  responseId,
  eventCode,
  editToken,
  eventTitle,
  displayName,
  resultsVisibleToParticipants = false,
}) {
  const data = load();
  const existing = data.myResponses.findIndex((r) => r.responseId === responseId);
  const entry = {
    responseId,
    eventCode,
    editToken,
    eventTitle: eventTitle ?? "Untitled event",
    displayName,
    resultsVisibleToParticipants,
    submittedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    data.myResponses[existing] = { ...data.myResponses[existing], ...entry };
  } else {
    data.myResponses.push(entry);
  }
  save(data);
  return entry;
}

export function updateOrganizerEventTitle(id, title) {
  const data = load();
  const event = data.organizerEvents.find((e) => e.id === id);
  if (event) {
    event.title = title;
    save(data);
  }
}

export function updateResponseMeta(responseId, patch) {
  const data = load();
  const response = data.myResponses.find((r) => r.responseId === responseId);
  if (response) {
    Object.assign(response, patch);
    save(data);
  }
}

export function getOrganizerEventById(id) {
  return load().organizerEvents.find((e) => e.id === id) ?? null;
}

export function getOrganizerEventByToken(manageToken) {
  return (
    load().organizerEvents.find((e) => e.manageToken === manageToken) ?? null
  );
}

export function getResponseByEditToken(editToken) {
  return load().myResponses.find((r) => r.editToken === editToken) ?? null;
}

export function removeOrganizerEvent(id) {
  const data = load();
  const index = data.organizerEvents.findIndex((e) => e.id === id);
  if (index < 0) return false;
  data.organizerEvents.splice(index, 1);
  save(data);
  return true;
}

export function removeMyResponse(responseId) {
  const data = load();
  const index = data.myResponses.findIndex((r) => r.responseId === responseId);
  if (index < 0) return false;
  data.myResponses.splice(index, 1);
  save(data);
  return true;
}
