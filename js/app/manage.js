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
import { utcToDatetimeLocal, zonedToUtcIso } from "./time.js";

const statusEl = document.querySelector("#manage-status");
const view = document.querySelector("#manage-view");
const form = document.querySelector("#manage-event-form");

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
});

document
  .querySelector("#copy-organizer-link")
  .addEventListener("click", async () => {
    const input = document.querySelector("#organizer-link");
    await navigator.clipboard.writeText(input.value);
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

  statusEl.hidden = false;
  statusEl.textContent = "Deleting…";

  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      method: "DELETE",
      headers: bearerAuth("manage", currentManageToken),
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not delete event";
      return;
    }

    removeOrganizerEvent(currentEventId);
    if (getActiveOrganizerEventId() === currentEventId) {
      setActiveOrganizerEventId("");
    }
    window.location.href = "/app/";
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.hidden = false;
  statusEl.textContent = "Saving…";

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
      statusEl.textContent = data.error ?? "Could not save changes";
      return;
    }

    updateOrganizerEventTitle(data.id, data.title);
    populateForm(data);
    renderResponses(data);
    statusEl.textContent = "Changes saved";
    setTimeout(() => {
      statusEl.hidden = true;
    }, 2000);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
});

async function loadManage(manageToken) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  view.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      headers: bearerAuth("manage", manageToken),
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load event";
      return;
    }

    const entry = registerOrganizerEvent(data, manageToken);
    currentEventId = data.id;
    setActiveOrganizerEventId(entry.id);

    statusEl.hidden = true;
    renderManage(data, manageToken);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

function renderManage(data, manageToken) {
  document.querySelector("#page-title").textContent = data.title;
  document.querySelector("#page-lead").textContent =
    `Event code ${data.eventCode} · update settings and share links.`;
  document.querySelector("#event-code").textContent = data.eventCode;
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
  document.querySelector("#page-title").textContent = data.title;
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
    li.className = "dashboard-list-item";
    li.textContent = r.displayName;
    list.appendChild(li);
  }
}
