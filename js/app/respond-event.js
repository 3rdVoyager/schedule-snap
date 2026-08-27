import { API_URL } from "./config.js";
import { formatInZone, zonedToUtcIso } from "./time.js";

const eventCodeForm = document.querySelector("#event-code-form");
const statusEl = document.querySelector("#respond-status");
const view = document.querySelector("#event-view");
const responseForm = document.querySelector("#response-form");
const eventCodeFromUrl = codeFromUrl();
let currentEvent = null;
let currentEventCode = eventCodeFromUrl.length === 8 ? eventCodeFromUrl : "";

if (eventCodeFromUrl.length === 8) {
  loadEvent(eventCodeFromUrl);
}

function normalizeEventCode(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

function codeFromUrl() {
  return normalizeEventCode(
    new URLSearchParams(window.location.search).get("code"),
  );
}

eventCodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const eventCode = normalizeEventCode(e.target.code.value);
  if (eventCode) {
    const url = new URL(window.location.href);
    url.searchParams.set("code", eventCode);
    history.replaceState(null, "", url);
    loadEvent(eventCode);
  }
});

responseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentEvent || !currentEventCode) return;
  const displayName = document
    .querySelector("#display-name-input")
    .value.trim();
  const timezone = currentEvent.settings.timezone;
  const availability = [
    ...document.querySelectorAll(
      "#availability-windows .availability-window-row",
    ),
  ]
    .map((row) => ({
      start: row.querySelector(".availability-window-start").value,
      end: row.querySelector(".availability-window-end").value,
      preference: Number(
        row.querySelector(".availability-window-preference").value,
      ),
    }))
    .filter((w) => w.start && w.end)
    .map((w) => ({
      start: zonedToUtcIso(w.start, timezone),
      end: zonedToUtcIso(w.end, timezone),
      preference: w.preference,
    }));
  const payload = {
    displayName,
    availability: availability.map(({ start, end }) => ({ start, end })),
    preferences: null,
  };
  console.log(payload);
});

async function loadEvent(eventCode) {
  statusEl.hidden = false;
  statusEl.textContent = "Loading…";
  view.hidden = true;

  try {
    const response = await fetch(`${API_URL}/api/events/${eventCode}`);
    const data = await response.json();
    if (!response.ok) {
      statusEl.textContent = data.error ?? "Could not load event";
      return;
    }
    currentEvent = data;
    currentEventCode = eventCode;
    statusEl.hidden = true;
    renderEvent(data);
  } catch {
    statusEl.textContent = "Could not reach the server";
  }
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
  eventCodeForm.hidden = true;
  responseForm.hidden = false;
}

document
  .querySelector("#add-availability-window")
  .addEventListener("click", () => {
    const template = document.querySelector(
      "#availability-windows .availability-window-row",
    );
    const clone = template.cloneNode(true);
    clone.querySelectorAll("input").forEach((input) => (input.value = ""));
    document.querySelector("#availability-windows").appendChild(clone);
  });
