import { API_URL } from "./config.js";
import { bearerAuth } from "./api-auth.js";
import {
  getMyResponses,
  getOrganizerEvents,
  updateOrganizerEventTitle,
} from "./storage.js";
import {
  normalizeEventCode,
  normalizeManageToken,
  parseDeepLink,
  registerOrganizerEvent,
  setActiveOrganizerEventId,
  setParticipantEventCode,
} from "./session.js";

const statusEl = document.querySelector("#dashboard-status");
const joinForm = document.querySelector("#join-form");
const addOrganizerForm = document.querySelector("#add-organizer-form");
const organizerList = document.querySelector("#organizer-events-list");
const responsesList = document.querySelector("#my-responses-list");
const organizerEmpty = document.querySelector("#organizer-empty");
const responsesEmpty = document.querySelector("#responses-empty");

const { code, token, next } = parseDeepLink();

init();

async function init() {
  if (token.length === 32) {
    await handleOrganizerToken(token, next || "/app/manage/");
    return;
  }
  if (code.length === 8) {
    await validateAndJoin(code, next || "/app/respond/");
    return;
  }
  renderLists();
}

joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const eventCode = normalizeEventCode(e.target.code.value);
  if (eventCode.length !== 8) {
    showStatus("Enter a valid 8-digit event code.");
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get("next") || "/app/respond/";
  await validateAndJoin(eventCode, nextPath);
});

addOrganizerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const manageToken = normalizeManageToken(e.target.token.value);
  if (manageToken.length !== 32) {
    showStatus("Enter a valid organizer secret.");
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get("next") || "/app/manage/";
  await handleOrganizerToken(manageToken, nextPath);
});

function showStatus(message) {
  statusEl.hidden = false;
  statusEl.textContent = message;
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.textContent = "";
}

async function validateAndJoin(eventCode, nextPath) {
  hideStatus();
  showStatus("Checking event code…");
  try {
    const response = await fetch(`${API_URL}/api/events/respond`, {
      headers: bearerAuth("event", eventCode),
    });
    const data = await response.json();
    if (!response.ok) {
      showStatus(data.error ?? "Event not found");
      return;
    }
    setParticipantEventCode(eventCode);
    window.location.href = appendCode(nextPath, eventCode);
  } catch {
    showStatus("Could not reach the server");
  }
}

async function handleOrganizerToken(manageToken, nextPath) {
  hideStatus();
  showStatus("Verifying organizer secret…");
  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      headers: bearerAuth("manage", manageToken),
    });
    const data = await response.json();
    if (!response.ok) {
      showStatus(data.error ?? "Invalid organizer secret");
      renderLists();
      return;
    }
    registerOrganizerEvent(data, manageToken);
    window.location.href = appendToken(nextPath, manageToken);
  } catch {
    showStatus("Could not reach the server");
    renderLists();
  }
}

function appendCode(path, eventCode) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("code", eventCode);
  return url.pathname + url.search + url.hash;
}

function appendToken(path, manageToken) {
  const url = new URL(path, window.location.origin);
  url.hash = `token=${manageToken}`;
  return url.pathname + url.search + url.hash;
}

function renderLists() {
  hideStatus();
  renderOrganizerEvents();
  renderMyResponses();
}

function renderOrganizerEvents() {
  const events = getOrganizerEvents();
  organizerList.replaceChildren();
  organizerList.hidden = events.length === 0;
  organizerEmpty.hidden = events.length > 0;

  for (const event of events) {
    const li = document.createElement("li");
    li.className = "dashboard-list-item";

    const title = document.createElement("span");
    title.className = "dashboard-list-title";
    title.textContent = event.title;
    li.appendChild(title);

    const actions = document.createElement("span");
    actions.className = "dashboard-list-actions";

    const manageBtn = document.createElement("a");
    manageBtn.href = appendToken("/app/manage/", event.manageToken);
    manageBtn.className = "button button-primary-outline";
    manageBtn.textContent = "Manage";
    manageBtn.addEventListener("click", () => {
      setActiveOrganizerEventId(event.id);
    });
    actions.appendChild(manageBtn);

    const viewBtn = document.createElement("a");
    viewBtn.href = appendToken("/app/view/", event.manageToken);
    viewBtn.className = "button button-primary-outline";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => {
      setActiveOrganizerEventId(event.id);
    });
    actions.appendChild(viewBtn);

    li.appendChild(actions);
    organizerList.appendChild(li);

    if (event.title === "Untitled event") {
      refreshOrganizerTitle(event);
    }
  }
}

async function refreshOrganizerTitle(event) {
  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      headers: bearerAuth("manage", event.manageToken),
    });
    const data = await response.json();
    if (response.ok && data.title) {
      updateOrganizerEventTitle(event.id, data.title);
      renderOrganizerEvents();
    }
  } catch {
    // ignore
  }
}

function renderMyResponses() {
  const responses = getMyResponses();
  responsesList.replaceChildren();
  responsesList.hidden = responses.length === 0;
  responsesEmpty.hidden = responses.length > 0;

  for (const entry of responses) {
    const li = document.createElement("li");
    li.className = "dashboard-list-item";

    const label = document.createElement("span");
    label.className = "dashboard-list-title";
    label.textContent = `${entry.eventTitle} — ${entry.displayName}`;
    li.appendChild(label);

    const actions = document.createElement("span");
    actions.className = "dashboard-list-actions";

    const editBtn = document.createElement("a");
    editBtn.href = `/app/respond/#edit=${entry.editToken}`;
    editBtn.className = "button button-primary-outline";
    editBtn.textContent = "Edit";
    actions.appendChild(editBtn);

    if (entry.resultsVisibleToParticipants) {
      const viewBtn = document.createElement("a");
      viewBtn.href = `/app/view/?code=${entry.eventCode}`;
      viewBtn.className = "button button-primary-outline";
      viewBtn.textContent = "View results";
      actions.appendChild(viewBtn);
    }

    li.appendChild(actions);
    responsesList.appendChild(li);
  }
}
