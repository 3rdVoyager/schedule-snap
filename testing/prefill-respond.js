// Ensures an event exists, then prints a respond URL and browser prefill snippet.
// Requires: npm run dev + a static server (e.g. npx serve .)
//
// Usage:
//   npm run dev:prefill-respond
//   (set REUSE_EVENT_CODE in testing/config.js to reuse an existing event)

import {
  API_URL,
  APP_ORIGIN,
  REUSE_EVENT_CODE,
  sampleAvailabilityLocal,
  sampleEventPayload,
} from "./config.js";

const reuseCode = REUSE_EVENT_CODE.replace(/\D/g, "").slice(0, 8);

async function fetchEvent(eventCode) {
  const res = await fetch(`${API_URL}/api/events/${eventCode}`);
  const data = await res.json();
  if (!res.ok) return null;
  return data;
}

async function createEvent() {
  const res = await fetch(`${API_URL}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sampleEventPayload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `POST failed (${res.status})`);
  }
  return data;
}

async function ensureEvent() {
  if (reuseCode.length === 8) {
    const existing = await fetchEvent(reuseCode);
    if (existing) {
      console.log(`Reusing event code ${reuseCode}\n`);
      return { eventCode: reuseCode };
    }
    console.warn(
      `REUSE_EVENT_CODE ${reuseCode} not found — creating a new event.\n`,
    );
  }

  const created = await createEvent();
  console.log(`Created event ${created.id}`);
  console.log(`Manage token (save if needed): ${created.manageToken}\n`);
  return { eventCode: created.eventCode };
}

function buildBrowserSnippet() {
  const lines = [
    `document.querySelector("#display-name-input").value = ${JSON.stringify(sampleAvailabilityLocal.displayName)};`,
  ];

  const [first, ...rest] = sampleAvailabilityLocal.windows;

  lines.push(
    `document.querySelector(".availability-window-start").value = ${JSON.stringify(first.start)};`,
    `document.querySelector(".availability-window-end").value = ${JSON.stringify(first.end)};`,
    `document.querySelector(".availability-window-preference").value = ${JSON.stringify(String(first.preference))};`,
  );

  for (const window of rest) {
    lines.push(`document.querySelector("#add-availability-window").click();`);
    lines.push(
      `(() => { const rows = document.querySelectorAll(".availability-window-row"); const row = rows[rows.length - 1];`,
      `row.querySelector(".availability-window-start").value = ${JSON.stringify(window.start)};`,
      `row.querySelector(".availability-window-end").value = ${JSON.stringify(window.end)};`,
      `row.querySelector(".availability-window-preference").value = ${JSON.stringify(String(window.preference))}; })();`,
    );
  }

  lines.push(`document.querySelector("#response-form").requestSubmit();`);
  return lines.join("\n");
}

try {
  const { eventCode } = await ensureEvent();
  const respondUrl = `${APP_ORIGIN}/app/respond/?code=${eventCode}`;

  console.log("1. Open this URL (event loads automatically):");
  console.log(`   ${respondUrl}\n`);
  console.log(
    "2. Paste in DevTools console to prefill and submit the respond form:\n",
  );
  console.log(buildBrowserSnippet());
  console.log("\n3. Check the console for the response payload.");
} catch (error) {
  console.error(error.message);
  console.error("\nIs the worker running? Try: npm run dev");
  process.exit(1);
}
