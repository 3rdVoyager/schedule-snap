import { API_URL } from "./config.js";
import { bearerAuth, jsonHeaders } from "./api-auth.js";
import { removeOrganizerEvent, updateOrganizerEventTitle } from "./storage.js";
import {
  getActiveOrganizerEventId,
  redirectToDashboard,
  registerOrganizerEvent,
  resolveManageToken,
  setActiveOrganizerEventId,
} from "./session.js";
import { populatePageHeader } from "./page-header.js";
import { createCalendar } from "./calendar.js";
import { initTabs } from "./tabs.js";
import { createResponseListController } from "./response-viewer.js";
import {
  computeRecommendations,
  renderRecommendationsList,
} from "./recommendations.js";
import { showToast } from "./toast.js";

const view = document.querySelector("#manage-view");
const form = document.querySelector("#manage-event-form");
const timezoneSelect = document.querySelector("#timezone");
const calendarMount = document.querySelector("#scheduling-calendar");

initTabs(document.querySelector("#manage-tabs"), { defaultTab: "links" });

let schedulingCalendar = null;
let currentManageToken = "";
let currentEventId = "";
let currentEventData = null;

const weightsStorageKey = (eventId) =>
  `schedule-snap:recommendation-balance:${eventId}`;

const scoreBalanceInput = document.querySelector("#score-balance");
const scoreBalanceValue = document.querySelector("#score-balance-value");

const DEFAULT_ATTENDANCE_WEIGHT = 0.5;

function getAttendanceWeight() {
  const parsed = Number(scoreBalanceInput?.value);
  if (Number.isNaN(parsed)) return DEFAULT_ATTENDANCE_WEIGHT;
  return Math.min(1, Math.max(0, parsed / 100));
}

function setAttendanceWeight(weight) {
  const attendance = Math.min(1, Math.max(0, Number(weight) || DEFAULT_ATTENDANCE_WEIGHT));
  if (scoreBalanceInput) {
    scoreBalanceInput.value = String(Math.round(attendance * 100));
  }
  updateBalanceLabel();
}

function updateBalanceLabel() {
  const attendance = Math.round(getAttendanceWeight() * 100);
  const preference = 100 - attendance;
  if (scoreBalanceValue) {
    scoreBalanceValue.textContent =
      `Attendance ${attendance}% · Preference ${preference}%`;
  }
}

function saveBalance() {
  sessionStorage.setItem(
    weightsStorageKey(currentEventId),
    String(getAttendanceWeight()),
  );
}

function loadSavedBalance(eventId) {
  const raw = sessionStorage.getItem(weightsStorageKey(eventId));
  if (raw === null) {
    setAttendanceWeight(DEFAULT_ATTENDANCE_WEIGHT);
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") {
      setAttendanceWeight(parsed);
      return;
    }
    if (parsed?.attendanceWeight !== undefined) {
      setAttendanceWeight(parsed.attendanceWeight);
      return;
    }
  } catch {
    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber)) {
      setAttendanceWeight(asNumber);
      return;
    }
  }
  setAttendanceWeight(DEFAULT_ATTENDANCE_WEIGHT);
}

scoreBalanceInput?.addEventListener("input", () => {
  updateBalanceLabel();
  if (!currentEventData) return;
  saveBalance();
  renderRecommendations();
});

async function updateResponseCritical(responseId, critical) {
  if (!currentManageToken) return;

  try {
    const response = await fetch(
      `${API_URL}/api/events/manage/responses/${responseId}`,
      {
        method: "PATCH",
        headers: jsonHeaders("manage", currentManageToken),
        body: JSON.stringify({ critical }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not update response", { type: "error" });
      if (currentEventData) renderResponses(currentEventData);
      return;
    }

    currentEventData = data;
    renderResponses(data);
    renderRecommendations();
  } catch {
    showToast("Could not reach the server", { type: "error" });
    if (currentEventData) renderResponses(currentEventData);
  }
}

const responseViewer = createResponseListController(
  {
    listElement: document.querySelector("#responses-list"),
    viewerElement: document.querySelector("#response-viewer"),
    nameElement: document.querySelector("#response-viewer-name"),
    calendarMount: document.querySelector("#response-viewer-calendar"),
  },
  {
    showCritical: true,
    onCriticalChange: updateResponseCritical,
  },
);

const manageToken = resolveManageToken();

if (manageToken.length !== 32) {
  redirectToDashboard("/app/manage/");
} else {
  currentManageToken = manageToken;
  loadManage(manageToken);
}

function initSchedulingCalendar(initialRanges = []) {
  schedulingCalendar?.destroy();
  schedulingCalendar = createCalendar(calendarMount, {
    mode: "scheduling",
    timezone: timezoneSelect.value,
    initialRanges,
  });
}

timezoneSelect.addEventListener("change", () => {
  const ranges = schedulingCalendar?.getRanges() ?? [];
  initSchedulingCalendar(ranges);
});

document.querySelector("#copy-respond-link").addEventListener("click", async () => {
  const input = document.querySelector("#respond-link");
  await navigator.clipboard.writeText(input.value);
  showToast("Participant link copied");
});

document
  .querySelector("#copy-organizer-link")
  .addEventListener("click", async () => {
    const input = document.querySelector("#organizer-link");
    await navigator.clipboard.writeText(input.value);
    showToast("Organizer link copied");
  });

document.querySelector("#unlink-event").addEventListener("click", () => {
  if (!currentEventId) return;
  removeOrganizerEvent(currentEventId);
  if (getActiveOrganizerEventId() === currentEventId) {
    setActiveOrganizerEventId("");
  }
  window.location.href = "/app/";
});

document.querySelector("#delete-event").addEventListener("click", async () => {
  if (!currentEventId) return;
  if (
    !confirm(
      "Delete this event and all responses permanently? This cannot be undone.",
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      method: "DELETE",
      headers: bearerAuth("manage", currentManageToken),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not delete event", { type: "error" });
      return;
    }

    removeOrganizerEvent(currentEventId);
    if (getActiveOrganizerEventId() === currentEventId) {
      setActiveOrganizerEventId("");
    }
    window.location.href = "/app/";
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const timezone = timezoneSelect.value;
  const schedulingWindows = schedulingCalendar?.getRanges() ?? [];

  if (schedulingWindows.length === 0) {
    showToast("Add at least one scheduling window.", { type: "error" });
    return;
  }

  const payload = {
    title: document.querySelector("#title").value.trim(),
    description: document.querySelector("#description").value.trim(),
    settings: {
      timezone,
      durationMinutes: Number(document.querySelector("#duration").value),
      schedulingWindows,
      allowResponseEdits: document.querySelector("#allow-response-edits")
        .checked,
      resultsVisibleToParticipants: document.querySelector("#results-visible")
        .checked,
      acceptingResponses: document.querySelector("#accepting-responses")
        .checked,
    },
  };

  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      method: "PATCH",
      headers: jsonHeaders("manage", currentManageToken),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not save changes", { type: "error" });
      return;
    }

    updateOrganizerEventTitle(data.id, data.title);
    currentEventData = data;
    populatePageHeader(document.querySelector("#page-header"), data);
    populateForm(data);
    renderResponses(data);
    renderRecommendations();
    showToast("Changes saved");
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
});

async function loadManage(manageToken) {
  view.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      headers: bearerAuth("manage", manageToken),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not load event", { type: "error" });
      return;
    }

    const entry = registerOrganizerEvent(data, manageToken);
    currentEventId = data.id;
    setActiveOrganizerEventId(entry.id);

    renderManage(data, manageToken);
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
}

function renderManage(data, manageToken) {
  currentEventData = data;
  loadSavedBalance(data.id);

  populatePageHeader(document.querySelector("#page-header"), data);
  document.querySelector("#event-meta").textContent +=
    ` · ${data.eventCode}`;
  document.querySelector("#respond-link").value =
    `${window.location.origin}/app/respond/?code=${data.eventCode}`;
  document.querySelector("#organizer-link").value =
    `${window.location.origin}/app/manage/#token=${manageToken}`;
  document.querySelector("#view-results-link").href =
    `/app/view/#token=${manageToken}`;

  populateForm(data);
  renderResponses(data);
  renderRecommendations();
  view.hidden = false;
}

function populateForm(data) {
  const { settings } = data;
  const timezone = settings.timezone;

  document.querySelector("#title").value = data.title;
  document.querySelector("#description").value = data.description ?? "";
  document.querySelector("#duration").value = String(settings.durationMinutes);
  document.querySelector("#timezone").value = timezone;
  document.querySelector("#allow-response-edits").checked =
    settings.allowResponseEdits;
  document.querySelector("#results-visible").checked =
    settings.resultsVisibleToParticipants;
  document.querySelector("#accepting-responses").checked =
    settings.acceptingResponses !== false;

  initSchedulingCalendar(settings.schedulingWindows ?? []);
}

function renderResponses(data) {
  document.querySelector("#response-count").textContent =
    `${data.responses.length} response(s)`;

  const list = document.querySelector("#responses-list");
  const empty = document.querySelector("#responses-empty");

  if (data.responses.length === 0) {
    list.hidden = true;
    empty.hidden = false;
    responseViewer.hideViewer();
    return;
  }

  empty.hidden = true;
  list.hidden = false;
  responseViewer.render(data.responses, data.settings);
}

function renderRecommendations() {
  if (!currentEventData) return;

  const timezone = currentEventData.settings?.timezone ?? "UTC";
  const recommendations = computeRecommendations(
    currentEventData.settings,
    currentEventData.responses,
    { attendanceWeight: getAttendanceWeight() },
  );

  renderRecommendationsList(
    document.querySelector("#manage-recommendations-list"),
    document.querySelector("#manage-recommendations-empty"),
    recommendations,
    timezone,
  );
}
