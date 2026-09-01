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
import { populatePageHeader } from "./page-header.js";
import { createResponseListController } from "./response-viewer.js";
import { showToast } from "./toast.js";
import { formatInZone } from "./time.js";

const article = document.querySelector("#view-article");

const responseViewer = createResponseListController({
  listElement: document.querySelector("#responses-list"),
  viewerElement: document.querySelector("#response-viewer"),
  nameElement: document.querySelector("#response-viewer-name"),
  calendarMount: document.querySelector("#response-viewer-calendar"),
});

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
  article.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/view`, {
      headers: bearerAuth("event", eventCode),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not load results", { type: "error" });
      return;
    }
    renderView(data);
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
}

async function loadOrganizerView(token) {
  article.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/view`, {
      headers: bearerAuth("manage", token),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "Could not load results", { type: "error" });
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

    renderView(data);
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
}

function renderView(data) {
  const timezone = data.settings?.timezone ?? "UTC";

  populatePageHeader(document.querySelector("#page-header"), data);

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
      li.className = "app-list-item";

      const time = document.createElement("span");
      time.className = "text-body-sm text-medium";
      time.textContent = `${formatInZone(rec.start, timezone)} – ${formatInZone(rec.end, timezone)}`;

      const meta = document.createElement("span");
      meta.className = "text-sub";
      meta.textContent = `${rec.availableCount} of ${rec.totalResponses} available`;

      li.append(time, meta);
      recList.appendChild(li);
    }
  }

  const resList = document.querySelector("#responses-list");
  const resEmpty = document.querySelector("#responses-empty");

  if (data.responses.length === 0) {
    resList.hidden = true;
    resEmpty.hidden = false;
    responseViewer.hideViewer();
  } else {
    resEmpty.hidden = true;
    resList.hidden = false;
    responseViewer.render(data.responses, data.settings);
  }

  article.hidden = false;
}
