const API_URL = "http://localhost:8787";

const createEventForm = document.querySelector("#create-event-form");

// Wire button for adding scheduling windows
document
  .querySelector("#add-scheduling-window")
  .addEventListener("click", (event) => {
    const template = document.querySelector(
      "#scheduling-windows .scheduling-window-row",
    );
    const clone = template.cloneNode(true);
    clone.querySelectorAll("input").forEach((input) => (input.value = ""));
    document.querySelector("#scheduling-windows").appendChild(clone);
  });

// Wire buttons for copying input values
function copyInputValue(inputId, buttonId) {
  document.querySelector(buttonId).addEventListener("click", async () => {
    const input = document.querySelector(inputId);
    await navigator.clipboard.writeText(input.value);
  });
}
copyInputValue("#join-link", "#copy-join-link");
copyInputValue("#organizer-link", "#copy-organizer-link");

// Wire form submission
createEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.querySelector("#title").value;
  const description = document.querySelector("#description").value;
  const durationMinutes = Number(document.querySelector("#duration").value);
  const timezone = document.querySelector("#timezone").value;
  const schedulingWindows = [
    ...document.querySelectorAll("#scheduling-windows .scheduling-window-row"),
  ]
    .map((windowRow) => ({
      start: windowRow.querySelector(".scheduling-window-start").value,
      end: windowRow.querySelector(".scheduling-window-end").value,
    }))
    .filter((window) => window.start && window.end)
    .map((window) => ({
      start: zonedToUtcIso(window.start, timezone),
      end: zonedToUtcIso(window.end, timezone),
    }));

  // Build payload for API request
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

  // Send payload to API
  try {
    const response = await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // If response is not OK, show error message
    if (!response.ok) {
      console.error("Create event failed:", data.error);
      return;
    }

    // Save manage token to localStorage
    localStorage.setItem(`manageToken:${data.id}`, data.manageToken);

    // Build join and manage URLs
    const joinUrl = `${window.location.origin}/app/join/?code=${data.joinCode}`;
    const manageUrl = `${window.location.origin}/app/manage/?code=${data.joinCode}#token=${data.manageToken}`;

    // Hide create event form and show success message
    document.querySelector("#create-event-form").hidden = true;

    const success = document.querySelector("#create-success");
    // Set join code, join link, and organizer link in success message
    document.querySelector("#join-code").textContent = data.joinCode;
    document.querySelector("#join-link").value = joinUrl;
    document.querySelector("#organizer-link").value = manageUrl;
    success.hidden = false;
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
