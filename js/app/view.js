import { API_URL } from "./config.js";
import { bearerAuth } from "./api-auth.js";
import {
  parseDeepLink,
  redirectToDashboard,
  registerOrganizerEvent,
  resolveManageToken,
  resolveParticipantCode,
  setActiveOrganizerEventId,
  setParticipantEventCode,
} from "./session.js";
import { formatInZone } from "./time.js";

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
    const response = await fetch(`${API_URL}/api/events/view`, {
      headers: bearerAuth("event", eventCode),
    });
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
      headers: bearerAuth("manage", token),
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load results";
      return;
    }

    const manageRes = await fetch(`${API_URL}/api/events/manage`, {
      headers: bearerAuth("manage", token),
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
  const timezone = data.settings?.timezone ?? "UTC";

  document.querySelector("#event-title").textContent = data.title;

  const recList = document.querySelector("#recommendations-list");
  const recEmpty = document.querySelector("#recommendations-empty");
  recList.replaceChildren();

  if (data.recommendations.length === 0) {
    recList.hidden = true;
    recEmpty.hidden = false;
  } else {
    recEmpty.hidden = true;
    recList.hidden = false;
    for (const rec of data.recommendations) {
      const li = document.createElement("li");
      li.className = "dashboard-list-item";

      const time = document.createElement("span");
      time.className = "view-list-time";
      time.textContent = `${formatInZone(rec.start, timezone)} – ${formatInZone(rec.end, timezone)}`;

      const meta = document.createElement("span");
      meta.className = "view-list-meta";
      meta.textContent = `${rec.availableCount} of ${rec.totalResponses} available`;

      li.append(time, meta);
      recList.appendChild(li);
    }
  }

  const resList = document.querySelector("#responses-list");
  const resEmpty = document.querySelector("#responses-empty");
  resList.replaceChildren();

  if (data.responses.length === 0) {
    resList.hidden = true;
    resEmpty.hidden = false;
  } else {
    resEmpty.hidden = true;
    resList.hidden = false;
    for (const r of data.responses) {
      const li = document.createElement("li");
      li.className = "dashboard-list-item";
      li.textContent = r.displayName;
      resList.appendChild(li);
    }
  }

  article.hidden = false;
}
