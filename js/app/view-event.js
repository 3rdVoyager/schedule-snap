import { API_URL } from "./config.js";

const eventCodeForm = document.querySelector("#event-code-form");
const organizerForm = document.querySelector("#organizer-token-form");
const statusEl = document.querySelector("#view-status");
const article = document.querySelector("#view-article");

const tokenFromHash = tokenFromUrl();
const eventCodeFromUrl = codeFromUrl();

if (tokenFromHash.length === 32) {
  loadOrganizerView(tokenFromHash);
} else if (eventCodeFromUrl.length === 8) {
  loadParticipantView(eventCodeFromUrl);
}

eventCodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const eventCode = normalizeEventCode(e.target.code.value);
  if (eventCode.length !== 8) {
    statusEl.hidden = false;
    statusEl.textContent = "Enter a valid 8-digit event code.";
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("code", eventCode);
  url.hash = "";
  history.replaceState(null, "", url);
  loadParticipantView(eventCode);
});

organizerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const manageToken = normalizeManageToken(e.target.token.value);
  if (manageToken.length !== 32) {
    statusEl.hidden = false;
    statusEl.textContent = "Enter a valid organizer secret.";
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.hash = `token=${manageToken}`;
  history.replaceState(null, "", url);
  loadOrganizerView(manageToken);
});

function normalizeEventCode(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

function normalizeManageToken(raw) {
  return String(raw ?? "")
    .replace(/[^a-fA-F0-9]/g, "")
    .toLowerCase()
    .slice(0, 32);
}

function codeFromUrl() {
  return normalizeEventCode(
    new URLSearchParams(location.search).get("code"),
  );
}

function tokenFromUrl() {
  return normalizeManageToken(
    new URLSearchParams(location.hash.slice(1)).get("token"),
  );
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
    eventCodeForm.hidden = true;
    organizerForm.hidden = true;
    renderView(data);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

async function loadOrganizerView(manageToken) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  article.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/view`, {
      headers: { Authorization: `Bearer ${manageToken}` },
    });
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load results";
      return;
    }
    statusEl.hidden = true;
    eventCodeForm.hidden = true;
    organizerForm.hidden = true;
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
