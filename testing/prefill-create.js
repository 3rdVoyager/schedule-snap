// Prints a browser console snippet to prefill and submit the create event form.
// Requires: npx serve . (static site)
//
// Usage: npm run dev:prefill-create

import {
  APP_ORIGIN,
  sampleEventPayload,
  sampleSchedulingWindowsLocal,
} from "./config.js";

function buildCreateFormSnippet() {
  const { title, description, settings } = sampleEventPayload;
  const lines = [
    `document.querySelector("#title").value = ${JSON.stringify(title)};`,
    `document.querySelector("#description").value = ${JSON.stringify(description)};`,
    `document.querySelector("#duration").value = ${JSON.stringify(String(settings.durationMinutes))};`,
    `document.querySelector("#timezone").value = ${JSON.stringify(settings.timezone)};`,
  ];

  const [first, ...rest] = sampleSchedulingWindowsLocal;

  lines.push(
    `document.querySelector(".scheduling-window-start").value = ${JSON.stringify(first.start)};`,
    `document.querySelector(".scheduling-window-end").value = ${JSON.stringify(first.end)};`,
  );

  for (const window of rest) {
    lines.push(`document.querySelector("#add-scheduling-window").click();`);
    lines.push(
      `(() => { const row = document.querySelectorAll(".scheduling-window-row").item(-1);`,
      `row.querySelector(".scheduling-window-start").value = ${JSON.stringify(window.start)};`,
      `row.querySelector(".scheduling-window-end").value = ${JSON.stringify(window.end)}; })();`,
    );
  }

  lines.push(`document.querySelector("#create-event-form").requestSubmit();`);
  return lines.join("\n");
}

const createUrl = `${APP_ORIGIN}/app/`;

console.log("1. Open the create page:");
console.log(`   ${createUrl}\n`);
console.log("2. Paste in DevTools console to prefill and submit:\n");
console.log(buildCreateFormSnippet());
