import { API_URL } from "./config.js";
import { formatInZone, utcToDatetimeLocal, zonedToUtcIso } from "./time.js";
import { addMyResponse, removeMyResponse, updateResponseMeta } from "./registry.js";
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

let currentEvent = null;
let currentEventCode = "";
let editToken = "";
let editMode = false;
let currentResponseId = "";

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
  if (!currentEvent) return;

  statusEl.hidden = true;
  statusEl.textContent = "";

  const displayName = document
    .querySelector("#display-name-input")
    .value.trim();
  const timezone = currentEvent.settings.timezone;
  const availability = collectAvailability(timezone);

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

function collectAvailability(timezone) {
  return [
    ...document.querySelectorAll(
      "#availability-windows .availability-window-row",
    ),
  ]
    .map((row) => ({
      start: row.querySelector(".availability-window-start").value,
      end: row.querySelector(".availability-window-end").value,
    }))
    .filter((w) => w.start && w.end)
    .map((w) => ({
      start: zonedToUtcIso(w.start, timezone),
      end: zonedToUtcIso(w.end, timezone),
    }));
}

async function submitCreate(payload, displayName) {
  const response = await fetch(
    `${API_URL}/api/events/${currentEventCode}/responses`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
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
  showUnlinkSection();

  const editLink = `${window.location.origin}/app/respond/#edit=${data.editToken}`;
  document.querySelector("#edit-link").value = editLink;
  document.querySelector("#edit-token").textContent = data.editToken;

  responseForm.hidden = true;
  successEl.hidden = false;
}

async function submitEdit(payload, displayName) {
  const response = await fetch(`${API_URL}/api/responses/edit`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${editToken}`,
    },
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
    const response = await fetch(`${API_URL}/api/responses/edit`, {
      headers: { Authorization: `Bearer ${token}` },
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
    prefillAvailability(data.response.availability, data.settings.timezone);

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
    const response = await fetch(`${API_URL}/api/events/${eventCode}`);
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
    responseForm.hidden = false;
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

function prefillAvailability(availability, timezone) {
  const container = document.querySelector("#availability-windows");
  const template = container.querySelector(".availability-window-row");
  container.replaceChildren();

  for (const range of availability) {
    const row = template.cloneNode(true);
    row.querySelector(".availability-window-start").value = utcToDatetimeLocal(
      range.start,
      timezone,
    );
    row.querySelector(".availability-window-end").value = utcToDatetimeLocal(
      range.end,
      timezone,
    );
    container.appendChild(row);
  }

  if (availability.length === 0) {
    container.appendChild(template.cloneNode(true));
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

document
  .querySelector("#add-availability-window")
  .addEventListener("click", () => {
    const template = document.querySelector(
      "#availability-windows .availability-window-row",
    );
    const clone = template.cloneNode(true);
    clone.querySelectorAll("input").forEach((input) => (input.value = ""));
    document.querySelector("#availability-windows").appendChild(clone);
  });

document.querySelector("#copy-edit-link")?.addEventListener("click", async () => {
  const input = document.querySelector("#edit-link");
  await navigator.clipboard.writeText(input.value);
});

document.querySelector("#unlink-response").addEventListener("click", () => {
  if (!currentResponseId) return;
  removeMyResponse(currentResponseId);
  window.location.href = "/app/";
});

function showUnlinkSection() {
  if (currentResponseId) {
    unlinkSection.hidden = false;
  }
}
