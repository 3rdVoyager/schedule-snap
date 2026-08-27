const API_URL = "http://localhost:8787";

const form = document.querySelector("#join-form");
const statusEl = document.querySelector("#join-status");
const view = document.querySelector("#event-view");
const code = codeFromUrl();

if (code.length === 8) {
  loadEvent(code);
}

function normalizeCode(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

function codeFromUrl() {
  return normalizeCode(new URLSearchParams(window.location.search).get("code"));
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = normalizeCode(e.target.code.value);
  if (code) {
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    history.replaceState(null, "", url);
    loadEvent(code);
  }
});

async function loadEvent(code) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  view.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/${code}`);
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load event";
      return;
    }
    statusEl.hidden = true;
    renderEvent(data);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
}

function formatInZone(iso, tz) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function renderEvent(data) {
  document.querySelector("#event-title").textContent = data.title;

  const desc = document.querySelector("#event-description");
  desc.textContent = data.description ?? "";
  desc.hidden = !data.description;

  const tz = data.settings.timezone;
  const mins = data.settings.durationMinutes;
  document.querySelector("#event-meta").textContent = `${mins} minutes · ${tz}`;

  const list = document.querySelector("#event-windows");
  list.replaceChildren();
  for (const w of data.settings.schedulingWindows) {
    const li = document.createElement("li");
    li.textContent = `${formatInZone(w.start, tz)} – ${formatInZone(w.end, tz)}`;
    list.appendChild(li);
  }

  view.hidden = false;
  form.hidden = true;
}