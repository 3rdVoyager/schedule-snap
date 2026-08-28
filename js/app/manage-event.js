import { API_URL } from "./config.js";
import {
  parseDeepLink,
  redirectToDashboard,
  registerOrganizerEvent,
  resolveManageToken,
  setActiveOrganizerEventId,
} from "./session.js";

const statusEl = document.querySelector("#manage-status");
const view = document.querySelector("#manage-view");

const manageToken = resolveManageToken();

if (manageToken.length !== 32) {
  redirectToDashboard("/app/manage/");
} else {
  loadManage(manageToken);
}

async function loadManage(manageToken) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  view.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/manage`, {
      headers: { Authorization: `Bearer ${manageToken}` },
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load event";
      return;
    }

    const entry = registerOrganizerEvent(data, manageToken);
    setActiveOrganizerEventId(entry.id);

    const { token } = parseDeepLink();
    if (token.length === 32) {
      const url = new URL(window.location.href);
      url.hash = "";
      history.replaceState(null, "", url);
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
