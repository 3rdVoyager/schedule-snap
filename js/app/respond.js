import { API_URL } from "./config.js";
import { bearerAuth, jsonHeaders } from "./api-auth.js";
import { createCalendar } from "./calendar.js";
import { formatInZone } from "./time.js";
import { addMyResponse, removeMyResponse, updateResponseMeta } from "./storage.js";
import {
  parseDeepLink,
  redirectToDashboard,
  resolveParticipantCode,
  setParticipantEventCode,
} from "./session.js";

const statusEl = document.querySelector("#respond-status");
const view = document.querySelector("#event-view");
const responseForm = document.querySelector("#response-form");
const successEl = document.querySelector("#respond-success");
const unlinkSection = document.querySelector("#unlink-section");
const calendarMount = document.querySelector("#availability-calendar");

let currentEvent = null;
let currentEventCode = "";
let editToken = "";
let editMode = false;
let currentResponseId = "";
let availabilityCalendar = null;

const deepLink = parseDeepLink();
const editFromHash = deepLink.edit;

if (editFromHash.length === 32) {
  editToken = editFromHash;
  editMode = true;
  loadForEdit(editFromHash);
} else {
  const eventCode = resolveParticipantCode();
  if (deepLink.code.length === 8) {
    setParticipantEventCode(deepLink.code);
    loadEvent(deepLink.code);
  } else if (eventCode.length === 8) {
    loadEvent(eventCode);
  } else {
    redirectToDashboard("/app/respond/");
  }
}

responseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentEvent || !availabilityCalendar) return;

  statusEl.hidden = true;
  statusEl.textContent = "";

  const displayName = document
    .querySelector("#display-name-input")
    .value.trim();
  const availability = availabilityCalendar.getRanges();

  if (!displayName) return;
  if (availability.length === 0) {
    statusEl.hidden = false;
    statusEl.textContent = "Add at least one availability window.";
    return;
  }

  const payload = {
    displayName,
    availability: availability.map(({ start, end }) => ({ start, end })),
    preferences: null,
  };

  try {
    if (editMode) {
      await submitEdit(payload, displayName);
    } else {
      await submitCreate(payload, displayName);
    }
  } catch {
    statusEl.hidden = false;
    statusEl.textContent = "Could not reach the server";
  }
});

function initCalendar(event, initialRanges = []) {
  availabilityCalendar?.destroy();
  availabilityCalendar = createCalendar(calendarMount, {
    timezone: event.settings.timezone,
    schedulingWindows: event.settings.schedulingWindows ?? [],
    initialRanges,
  });
}

async function submitCreate(payload, displayName) {
  const response = await fetch(`${API_URL}/api/events/respond`, {
    method: "POST",
    headers: jsonHeaders("event", currentEventCode),
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    statusEl.hidden = false;
    statusEl.textContent = data.error ?? "Could not submit response";
    return;
  }

  addMyResponse({
    responseId: data.id,
    eventCode: currentEventCode,
    editToken: data.editToken,
    eventTitle: currentEvent.title,
    displayName,
    resultsVisibleToParticipants:
      currentEvent.settings.resultsVisibleToParticipants === true,
  });

  currentResponseId = data.id;
  editToken = data.editToken;
  showUnlinkSection();

  const editLink = `${window.location.origin}/app/respond/#edit=${data.editToken}`;
  document.querySelector("#edit-link").value = editLink;
  document.querySelector("#edit-token").textContent = data.editToken;

  responseForm.hidden = true;
  successEl.hidden = false;
}

async function submitEdit(payload, displayName) {
  const response = await fetch(`${API_URL}/api/events/respond`, {
    method: "PATCH",
    headers: jsonHeaders("edit", editToken),
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    statusEl.hidden = false;
    statusEl.textContent = data.error ?? "Could not update response";
    return;
  }

  updateResponseMeta(currentResponseId, { displayName });

  responseForm.hidden = true;
  document.querySelector("#respond-success h2").textContent =
    "Your response was updated.";
  successEl.hidden = false;
  document.querySelector("#edit-link-section").hidden = true;
}

async function loadForEdit(token) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  view.hidden = true;
  responseForm.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/respond`, {
      headers: bearerAuth("edit", token),
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load response";
      return;
    }

    currentEvent = {
      title: data.title,
      description: data.description,
      settings: data.settings,
    };
    currentEventCode = data.eventCode;
    currentResponseId = data.response.id;
    editToken = token;

    statusEl.hidden = true;
    renderEvent(currentEvent);

    showUnlinkSection();

    if (data.settings.allowResponseEdits === false) {
      responseForm.hidden = true;
      statusEl.hidden = false;
      statusEl.textContent = "Edits are not allowed for this event.";
      return;
    }

    document.querySelector("#display-name-input").value =
      data.response.displayName;
    initCalendar(currentEvent, data.response.availability ?? []);

    responseForm.hidden = false;
    document.querySelector("#submit-response-btn").textContent =
      "Update response";
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

async function loadEvent(eventCode) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  view.hidden = true;
  responseForm.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/respond`, {
      headers: bearerAuth("event", eventCode),
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load event";
      return;
    }
    currentEvent = data;
    currentEventCode = eventCode;
    setParticipantEventCode(eventCode);
    statusEl.hidden = true;
    renderEvent(data);
    initCalendar(currentEvent);
    responseForm.hidden = false;
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

function renderEvent(data) {
  document.querySelector("#event-title").textContent = data.title;

  const desc = document.querySelector("#event-description");
  desc.textContent = data.description ?? "";
  desc.hidden = !data.description;

  const tz = data.settings.timezone;
  const mins = data.settings.durationMinutes;
  document.querySelector("#event-meta").textContent = `${mins} minutes · ${tz}`;

  const list = document.querySelector("#event-windows");
  list.replaceChildren();
  for (const w of data.settings.schedulingWindows) {
    const li = document.createElement("li");
    li.textContent = `${formatInZone(w.start, tz)} – ${formatInZone(w.end, tz)}`;
    list.appendChild(li);
  }

  view.hidden = false;
}

document.querySelector("#copy-edit-link")?.addEventListener("click", async () => {
  const input = document.querySelector("#edit-link");
  await navigator.clipboard.writeText(input.value);
});

document.querySelector("#unlink-response").addEventListener("click", () => {
  if (!currentResponseId) return;
  removeMyResponse(currentResponseId);
  window.location.href = "/app/";
});

document.querySelector("#delete-response").addEventListener("click", async () => {
  if (!editToken) return;
  if (
    !confirm(
      "Delete your response permanently? This cannot be undone.",
    )
  ) {
    return;
  }

  statusEl.hidden = false;
  statusEl.textContent = "Deleting…";

  try {
    const response = await fetch(`${API_URL}/api/events/respond`, {
      method: "DELETE",
      headers: bearerAuth("edit", editToken),
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not delete response";
      return;
    }

    if (currentResponseId) {
      removeMyResponse(currentResponseId);
    }
    window.location.href = "/app/";
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
});

function showUnlinkSection() {
  if (currentResponseId) {
    unlinkSection.hidden = false;
  }
}
