import { API_URL } from "./config.js";

const statusEl = document.querySelector("#view-status");
const article = document.querySelector("#view-article");

const eventCode = normalizeEventCode(
  new URLSearchParams(location.search).get("code"),
);
const manageToken = new URLSearchParams(location.hash.slice(1)).get("token");

if (eventCode.length !== 8) {
  statusEl.hidden = false;
  statusEl.textContent = "Invalid view link — event code is missing.";
} else {
  loadView(eventCode, manageToken);
}

function normalizeEventCode(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

async function loadView(eventCode, manageToken) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  article.hidden = true;

  const headers = {};
  if (manageToken) {
    headers.Authorization = `Bearer ${manageToken}`;
  }

  try {
    const response = await fetch(`${API_URL}/api/events/${eventCode}/view`, {
      headers,
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
