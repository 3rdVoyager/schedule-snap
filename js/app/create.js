import { API_URL } from "./config.js";
import { zonedToUtcIso } from "./time.js";
import { addMyResponse } from "./registry.js";
import { registerOrganizerEvent } from "./session.js";

const createEventForm = document.querySelector("#create-event-form");

document
  .querySelector("#add-scheduling-window")
  .addEventListener("click", () => {
    const template = document.querySelector(
      "#scheduling-windows .scheduling-window-row",
    );
    const clone = template.cloneNode(true);
    clone.querySelectorAll("input").forEach((input) => (input.value = ""));
    document.querySelector("#scheduling-windows").appendChild(clone);
  });

function copyInputValue(inputId, buttonId) {
  document.querySelector(buttonId).addEventListener("click", async () => {
    const input = document.querySelector(inputId);
    await navigator.clipboard.writeText(input.value);
  });
}
copyInputValue("#respond-link", "#copy-respond-link");
copyInputValue("#organizer-link", "#copy-organizer-link");

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
  } catch (error) {
    console.error("Create event failed:", error);
  }
});
