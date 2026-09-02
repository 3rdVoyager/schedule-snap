import { createCalendar } from "./calendar.js";

/**
 * @param {{
 *   listElement: HTMLElement,
 *   viewerElement: HTMLElement,
 *   nameElement: HTMLElement,
 *   calendarMount: HTMLElement,
 * }} elements
 * @param {{ showCritical?: boolean, onCriticalChange?: (responseId: string, critical: boolean) => void }} [options]
 */
export function createResponseListController(elements, options = {}) {
  const { listElement, viewerElement, nameElement, calendarMount } = elements;
  const { showCritical = false, onCriticalChange } = options;
  let calendar = null;
  let eventContext = null;
  let selectedId = "";

  function hideViewer() {
    calendar?.destroy();
    calendar = null;
    selectedId = "";
    viewerElement.hidden = true;
    listElement
      .querySelectorAll(".app-list-item--selected")
      .forEach((item) => item.classList.remove("app-list-item--selected"));
  }

  function showResponse(response) {
    if (!eventContext) return;

    selectedId = response.id;
    nameElement.textContent = response.displayName;
    viewerElement.hidden = false;

    for (const item of listElement.querySelectorAll(".app-list-item")) {
      item.classList.toggle(
        "app-list-item--selected",
        item.dataset.responseId === response.id,
      );
    }

    calendar?.destroy();
    calendar = createCalendar(calendarMount, {
      mode: "view",
      timezone: eventContext.timezone,
      schedulingWindows: eventContext.schedulingWindows,
      initialRanges: response.availability ?? [],
      initialPreferences: response.preferences ?? {},
    });
  }

  /**
   * @param {{ id: string, displayName: string, critical?: boolean, availability?: { start: string, end: string }[] }[]} responses
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
      li.className = "app-list-item app-list-item--selectable";
      li.dataset.responseId = response.id;

      const name = document.createElement("span");
      name.className = "response-list-name text-body-sm text-medium";
      name.textContent = response.displayName;
      li.appendChild(name);

      if (showCritical) {
        const criticalLabel = document.createElement("label");
        criticalLabel.className = "response-critical";
        criticalLabel.addEventListener("click", (event) => {
          event.stopPropagation();
        });

        const criticalText = document.createElement("span");
        criticalText.className = "response-critical-text text-body-sm text-medium";
        criticalText.textContent = "Critical";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "response-critical-input";
        checkbox.checked = response.critical === true;
        checkbox.addEventListener("change", () => {
          onCriticalChange?.(response.id, checkbox.checked);
        });

        const switchEl = document.createElement("span");
        switchEl.className = "response-critical-switch";
        switchEl.setAttribute("aria-hidden", "true");

        criticalLabel.append(criticalText, checkbox, switchEl);
        li.appendChild(criticalLabel);
      }

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
