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
import { initTabs } from "./tabs.js";
import { showToast } from "./toast.js";
import { utcToDatetimeLocal, zonedToUtcIso } from "./time.js";

const view = document.querySelector("#manage-view");
const form = document.querySelector("#manage-event-form");

initTabs(document.querySelector("#manage-tabs"), { defaultTab: "links" });

let currentManageToken = "";
let currentEventId = "";

const manageToken = resolveManageToken();

if (manageToken.length !== 32) {
  redirectToDashboard("/app/manage/");
} else {
  currentManageToken = manageToken;
  loadManage(manageToken);
}

document
  .querySelector("#add-scheduling-window")
  .addEventListener("click", () => {
    const template = document.querySelector(
      "#scheduling-windows .scheduling-window-row",
    );
    const clone = template.cloneNode(true);
    clone.querySelectorAll("input").forEach((input) => (input.value = ""));
    document.querySelector("#scheduling-windows").appendChild(clone);
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

  const timezone = document.querySelector("#timezone").value;
  const schedulingWindows = [
    ...document.querySelectorAll("#scheduling-windows .scheduling-window-row"),
  ]
    .map((windowRow) => ({
      start: windowRow.querySelector(".scheduling-window-start").value,
      end: windowRow.querySelector(".scheduling-window-end").value,
    }))
    .filter((window) => window.start && window.end)
    .map((window) => ({
      start: zonedToUtcIso(window.start, timezone),
      end: zonedToUtcIso(window.end, timezone),
    }));

  const payload = {
    title: document.querySelector("#title").value.trim(),
    description: document.querySelector("#description").value.trim(),
    settings: {
      timezone,
      durationMinutes: Number(document.querySelector("#duration").value),
      schedulingWindows,
      responseWindow: { opensAt: null, closesAt: null },
      allowResponseEdits: document.querySelector("#allow-response-edits")
        .checked,
      resultsVisibleToParticipants: document.querySelector("#results-visible")
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
    populatePageHeader(document.querySelector("#page-header"), data);
    populateForm(data);
    renderResponses(data);
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

  const container = document.querySelector("#scheduling-windows");
  const template = container.querySelector(".scheduling-window-row");
  container.replaceChildren();

  const windows = settings.schedulingWindows ?? [];
  if (windows.length === 0) {
    container.appendChild(template.cloneNode(true));
    return;
  }

  for (const window of windows) {
    const row = template.cloneNode(true);
    row.querySelector(".scheduling-window-start").value = utcToDatetimeLocal(
      window.start,
      timezone,
    );
    row.querySelector(".scheduling-window-end").value = utcToDatetimeLocal(
      window.end,
      timezone,
    );
    container.appendChild(row);
  }
}

function renderResponses(data) {
  document.querySelector("#response-count").textContent =
    `${data.responses.length} response(s)`;

  const list = document.querySelector("#responses-list");
  const empty = document.querySelector("#responses-empty");
  list.replaceChildren();

  if (data.responses.length === 0) {
    list.hidden = true;
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  list.hidden = false;
  for (const r of data.responses) {
    const li = document.createElement("li");
    li.className = "dashboard-list-item text-body-sm text-medium";
    li.textContent = r.displayName;
    list.appendChild(li);
  }
}
