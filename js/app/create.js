import { API_URL } from "./config.js";
import { createCalendar } from "./calendar.js";
import { addMyResponse } from "./storage.js";
import { registerOrganizerEvent } from "./session.js";
import { showToast } from "./toast.js";

const createEventForm = document.querySelector("#create-event-form");
const timezoneSelect = document.querySelector("#timezone");
const calendarMount = document.querySelector("#scheduling-calendar");

let schedulingCalendar = null;

function initSchedulingCalendar(initialRanges = []) {
  schedulingCalendar?.destroy();
  schedulingCalendar = createCalendar(calendarMount, {
    mode: "scheduling",
    timezone: timezoneSelect.value,
    initialRanges,
  });
}

initSchedulingCalendar();

timezoneSelect.addEventListener("change", () => {
  const ranges = schedulingCalendar?.getRanges() ?? [];
  initSchedulingCalendar(ranges);
});

function copyInputValue(inputId, buttonId, label) {
  document.querySelector(buttonId).addEventListener("click", async () => {
    const input = document.querySelector(inputId);
    await navigator.clipboard.writeText(input.value);
    showToast(`${label} copied`);
  });
}
copyInputValue("#respond-link", "#copy-respond-link", "Participant link");
copyInputValue("#organizer-link", "#copy-organizer-link", "Organizer link");

createEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.querySelector("#title").value;
  const description = document.querySelector("#description").value;
  const durationMinutes = Number(document.querySelector("#duration").value);
  const timezone = timezoneSelect.value;
  const schedulingWindows = schedulingCalendar?.getRanges() ?? [];

  if (schedulingWindows.length === 0) {
    showToast("Add at least one scheduling window.", { type: "error" });
    return;
  }

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
    const response = await fetch(`${API_URL}/api/events/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error ?? "Could not create event", { type: "error" });
      return;
    }

    registerOrganizerEvent(data, data.manageToken);

    const respondUrl = `${window.location.origin}/app/respond/?code=${data.eventCode}`;
    const manageUrl = `${window.location.origin}/app/manage/#token=${data.manageToken}`;

    document.querySelector("#create-event-form").hidden = true;

    const success = document.querySelector("#create-success");
    document.querySelector("#event-code").textContent = data.eventCode;
    document.querySelector("#organizer-secret").textContent = data.manageToken;
    document.querySelector("#respond-link").value = respondUrl;
    document.querySelector("#organizer-link").value = manageUrl;
    success.hidden = false;
  } catch {
    showToast("Could not reach the server", { type: "error" });
  }
});
