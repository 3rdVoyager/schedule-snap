import { formatInZone } from "./time.js";

/**
 * @param {HTMLElement} root
 * @param {{ title: string, description?: string, settings: { timezone: string, durationMinutes: number, schedulingWindows?: { start: string, end: string }[] } }} data
 */
export function populatePageHeader(root, data) {
  const tz = data.settings.timezone;
  const mins = data.settings.durationMinutes;

  root.querySelector("#event-title").textContent = data.title;

  const desc = root.querySelector("#event-description");
  if (desc) {
    desc.textContent = data.description ?? "";
    desc.hidden = !data.description;
  }

  const meta = root.querySelector("#event-meta");
  if (meta) {
    meta.textContent = `${mins} minutes · ${tz}`;
  }

  const list = root.querySelector("#event-windows");
  if (list) {
    list.replaceChildren();
    for (const w of data.settings.schedulingWindows ?? []) {
      const li = document.createElement("li");
      li.className = "text-body-sm";
      li.textContent = `${formatInZone(w.start, tz)} – ${formatInZone(w.end, tz)}`;
      list.appendChild(li);
    }
    list.hidden = list.childElementCount === 0;
  }
}
