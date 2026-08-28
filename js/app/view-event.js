import { API_URL } from "./config.js";
import {
  parseDeepLink,
  redirectToDashboard,
  registerOrganizerEvent,
  resolveManageToken,
  resolveParticipantCode,
  setActiveOrganizerEventId,
  setParticipantEventCode,
} from "./session.js";

const statusEl = document.querySelector("#view-status");
const article = document.querySelector("#view-article");

const deepLink = parseDeepLink();
const manageToken = resolveManageToken();
const participantCode = resolveParticipantCode();

if (manageToken.length === 32) {
  loadOrganizerView(manageToken);
} else if (participantCode.length === 8) {
  if (deepLink.code.length === 8) {
    setParticipantEventCode(deepLink.code);
  }
  loadParticipantView(participantCode);
} else {
  redirectToDashboard("/app/view/");
}

async function loadParticipantView(eventCode) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  article.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/${eventCode}/view`);
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load results";
      return;
    }
    statusEl.hidden = true;
    renderView(data);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

async function loadOrganizerView(token) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  article.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/view`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load results";
      return;
    }

    const manageRes = await fetch(`${API_URL}/api/events/manage`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const manageData = await manageRes.json();
    if (manageRes.ok) {
      const entry = registerOrganizerEvent(manageData, token);
      setActiveOrganizerEventId(entry.id);
    }

    statusEl.hidden = true;
    renderView(data);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

function renderView(data) {
  document.querySelector("#event-title").textContent = data.title;

  const recList = document.querySelector("#recommendations-list");
  recList.replaceChildren();
  if (data.recommendations.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No recommendations yet.";
    recList.appendChild(li);
  }

  const resList = document.querySelector("#responses-list");
  resList.replaceChildren();
  for (const r of data.responses) {
    const li = document.createElement("li");
    li.textContent = r.displayName;
    resList.appendChild(li);
  }
  article.hidden = false;
}
