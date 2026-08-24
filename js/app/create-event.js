const API_URL = "http://localhost:8787";

const createEventForm = document.querySelector("#create-event-form");

document.querySelector("#add-scheduling-window").addEventListener("click", (event) => {
  const template = document.querySelector("#scheduling-windows .scheduling-window-row");
  const clone = template.cloneNode(true);
  clone.querySelectorAll("input").forEach((input) => (input.value = ""));
  document.querySelector("#scheduling-windows").appendChild(clone);
});

createEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.querySelector("#title").value;
  const description = document.querySelector("#description").value;
  const durationMinutes = Number(
    document.querySelector("#duration").value,
  );
  const timezone = document.querySelector("#timezone").value;
  const schedulingWindows = [...document.querySelectorAll("#scheduling-windows .scheduling-window-row")]
    .map((windowRow) => ({
      start: windowRow.querySelector(".scheduling-window-start").value,
      end: windowRow.querySelector(".scheduling-window-end").value,
    }))
    .filter((window) => window.start && window.end)
    .map((window) => ({
      start: zonedToUtcIso(window.start, timezone),
      end: zonedToUtcIso(window.end, timezone),
    }));

  const payload = {
    title,
    description,
    settings: {
      timezone,
      durationMinutes,
      schedulingWindows,
      responseWindow: { opensAt: null, closesAt: null },
      allowResponseEdits: true,
      resultsVisibleToParticipants: false,
    },
  };

  try {
    const response = await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Create event failed:", data.error);
      return;
    }

    localStorage.setItem(`manageToken:${data.id}`, data.manageToken);
    console.log("Event created:", data);
  } catch (error) {
    console.error("Create event failed:", error);
  }
});

// At instant `date`, how many milliseconds is `tz` offset from UTC?
function tzOffsetMs(date, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
  );
  return asUtc - date.getTime();
}

// "2026-09-01T09:00" + "America/New_York" → "2026-09-01T13:00:00.000Z"
function zonedToUtcIso(naive, tz) {
  const wallAsUtc = new Date(naive + "Z"); // pretend the wall time IS UTC
  const offset = tzOffsetMs(wallAsUtc, tz);
  return new Date(wallAsUtc.getTime() - offset).toISOString();
}
