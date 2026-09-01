import { createCalendar } from "./calendar.js";

/**
 * @param {{
 *   listElement: HTMLElement,
 *   viewerElement: HTMLElement,
 *   nameElement: HTMLElement,
 *   calendarMount: HTMLElement,
 * }} elements
 */
export function createResponseListController(elements) {
  const { listElement, viewerElement, nameElement, calendarMount } = elements;
  let calendar = null;
  let eventContext = null;
  let selectedId = "";

  function hideViewer() {
    calendar?.destroy();
    calendar = null;
    selectedId = "";
    viewerElement.hidden = true;
    listElement
      .querySelectorAll(".dashboard-list-item--selected")
      .forEach((item) => item.classList.remove("dashboard-list-item--selected"));
  }

  function showResponse(response) {
    if (!eventContext) return;

    selectedId = response.id;
    nameElement.textContent = response.displayName;
    viewerElement.hidden = false;

    for (const item of listElement.querySelectorAll(".dashboard-list-item")) {
      item.classList.toggle(
        "dashboard-list-item--selected",
        item.dataset.responseId === response.id,
      );
    }

    calendar?.destroy();
    calendar = createCalendar(calendarMount, {
      mode: "view",
      timezone: eventContext.timezone,
      schedulingWindows: eventContext.schedulingWindows,
      initialRanges: response.availability ?? [],
    });
  }

  /**
   * @param {{ id: string, displayName: string, availability?: { start: string, end: string }[] }[]} responses
   * @param {{ timezone: string, schedulingWindows?: { start: string, end: string }[] }} settings
   */
  function render(responses, settings) {
    eventContext = {
      timezone: settings.timezone,
      schedulingWindows: settings.schedulingWindows ?? [],
    };
    hideViewer();
    listElement.replaceChildren();

    for (const response of responses) {
      const li = document.createElement("li");
      li.className =
        "dashboard-list-item dashboard-list-item--selectable text-body-sm text-medium";
      li.dataset.responseId = response.id;
      li.textContent = response.displayName;
      li.addEventListener("click", () => showResponse(response));
      listElement.appendChild(li);
    }
  }

  function destroy() {
    hideViewer();
    listElement.replaceChildren();
    eventContext = null;
  }

  return { render, destroy, hideViewer };
}
