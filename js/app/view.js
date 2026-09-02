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
import {
  computeRecommendations,
  renderRecommendationsList,
} from "./recommendations.js";
import { showToast } from "./toast.js";

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

  const recommendations = computeRecommendations(data.settings, data.responses);
  renderRecommendationsList(
    document.querySelector("#recommendations-list"),
    document.querySelector("#recommendations-empty"),
    recommendations,
    timezone,
  );

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
