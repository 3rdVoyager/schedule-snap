import { API_URL } from "./config.js";

const tokenForm = document.querySelector("#organizer-token-form");
const statusEl = document.querySelector("#manage-status");
const view = document.querySelector("#manage-view");

const tokenFromHash = tokenFromUrl();

if (tokenFromHash.length === 32) {
  loadManage(tokenFromHash);
}

tokenForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const manageToken = normalizeManageToken(e.target.token.value);
  if (manageToken.length !== 32) {
    statusEl.hidden = false;
    statusEl.textContent = "Enter a valid organizer secret.";
    return;
  }
  const url = new URL(window.location.href);
  url.hash = `token=${manageToken}`;
  history.replaceState(null, "", url);
  loadManage(manageToken);
});

function normalizeManageToken(raw) {
  return String(raw ?? "")
    .replace(/[^a-fA-F0-9]/g, "")
    .toLowerCase()
    .slice(0, 32);
}

function tokenFromUrl() {
  return normalizeManageToken(
    new URLSearchParams(location.hash.slice(1)).get("token"),
  );
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
    statusEl.hidden = true;
    tokenForm.hidden = true;
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
