import { API_URL } from "./config.js";
import { bearerAuth, jsonHeaders } from "./api-auth.js";
import { createCalendar } from "./calendar.js";
import { populatePageHeader } from "./page-header.js";
import { showToast } from "./toast.js";
import { addMyResponse, removeMyResponse, updateResponseMeta } from "./storage.js";
import {
  parseDeepLink,
  redirectToDashboard,
  resolveParticipantCode,
  setParticipantEventCode,
} from "./session.js";

const view = document.querySelector("#event-view");
const responseForm = document.querySelector("#response-form");
const responsesClosedEl = document.querySelector("#responses-closed");
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

  const displayName = document
    .querySelector("#display-name-input")
    .value.trim();
  const availability = availabilityCalendar.getRanges();

  if (!displayName) return;
  if (availability.length === 0) {
    showToast("Add at least one availability window.", { type: "error" });
    return;
  }

  const payload = {
    displayName,
    availability: availability.map(({ start, end }) => ({ start, end })),
    preferences: availabilityCalendar.getPreferences(),
  };

  try {
    if (editMode) {
      await submitEdit(payload, displayName);
    } else {
      await submitCreate(payload, displayName);
    }
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
});

function initCalendar(event, initialRanges = [], initialPreferences = {}) {
  availabilityCalendar?.destroy();
  availabilityCalendar = createCalendar(calendarMount, {
    timezone: event.settings.timezone,
    schedulingWindows: event.settings.schedulingWindows ?? [],
    initialRanges,
    initialPreferences,
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
    showToast(data.error ?? "Could not submit response", { type: "error" });
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
    showToast(data.error ?? "Could not update response", { type: "error" });
    return;
  }

  updateResponseMeta(currentResponseId, { displayName });

  responseForm.hidden = true;
  document.querySelector("#respond-success h2").textContent =
    "Your response was updated.";
  successEl.hidden = false;
  document.querySelector("#edit-link-section").hidden = true;
  showToast("Response updated");
}

async function loadForEdit(token) {
  view.hidden = true;
  responseForm.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/respond`, {
      headers: bearerAuth("edit", token),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not load response", { type: "error" });
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

    renderEvent(currentEvent);

    showUnlinkSection();

    if (data.settings.allowResponseEdits === false) {
      responseForm.hidden = true;
      showToast("Edits are not allowed for this event.", { type: "error" });
      return;
    }

    document.querySelector("#display-name-input").value =
      data.response.displayName;
    initCalendar(
      currentEvent,
      data.response.availability ?? [],
      data.response.preferences ?? {},
    );

    responseForm.hidden = false;
    document.querySelector("#submit-response-btn").textContent =
      "Update response";
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
}

async function loadEvent(eventCode) {
  view.hidden = true;
  responseForm.hidden = true;
  responsesClosedEl.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/respond`, {
      headers: bearerAuth("event", eventCode),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not load event", { type: "error" });
      return;
    }
    currentEvent = data;
    currentEventCode = eventCode;
    setParticipantEventCode(eventCode);
    renderEvent(data);
    if (data.settings?.acceptingResponses === false) {
      responsesClosedEl.hidden = false;
      return;
    }
    initCalendar(currentEvent);
    responseForm.hidden = false;
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
}

function renderEvent(data) {
  populatePageHeader(view, data);
  view.hidden = false;
}

document.querySelector("#copy-edit-link")?.addEventListener("click", async () => {
  const input = document.querySelector("#edit-link");
  await navigator.clipboard.writeText(input.value);
  showToast("Edit link copied");
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

  try {
    const response = await fetch(`${API_URL}/api/events/respond`, {
      method: "DELETE",
      headers: bearerAuth("edit", editToken),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not delete response", { type: "error" });
      return;
    }

    if (currentResponseId) {
      removeMyResponse(currentResponseId);
    }
    window.location.href = "/app/";
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
});

function showUnlinkSection() {
  if (currentResponseId) {
    unlinkSection.hidden = false;
  }
}
