import { API_URL } from "./config.js";

const statusEl = document.querySelector("#manage-status");
const view = document.querySelector("#manage-view");

const eventCode = normalizeEventCode(
  new URLSearchParams(location.search).get("code"),
);
const manageToken = new URLSearchParams(location.hash.slice(1)).get("token");

if (eventCode.length !== 8 || !manageToken) {
  statusEl.hidden = false;
  statusEl.textContent = "Invalid organizer link.";
} else {
  loadManage(eventCode, manageToken);
}

function normalizeEventCode(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

async function loadManage(eventCode, manageToken) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  view.hidden = true;

  try {
    const response = await fetch(
      `${API_URL}/api/events/${eventCode}/manage`,
      { headers: { Authorization: `Bearer ${manageToken}` } },
    );
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load event";
      return;
    }
    statusEl.hidden = true;
    renderManage(data);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

function renderManage(data) {
  document.querySelector("#event-title").textContent = data.title;
  document.querySelector("#event-meta").textContent =
    `${data.responses.length} response(s)`;

  const list = document.querySelector("#responses-list");
  list.replaceChildren();
  for (const r of data.responses) {
    const li = document.createElement("li");
    li.textContent = r.displayName;
    list.appendChild(li);
  }
  view.hidden = false;
}
