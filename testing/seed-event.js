// Create a sample event via the local API. Requires: npm run dev
// Usage: npm run seed:event

import { API_URL, APP_ORIGIN, sampleEventPayload } from "./config.js";

const res = await fetch(`${API_URL}/api/events`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(sampleEventPayload),
});

const data = await res.json();

if (!res.ok) {
  console.error("Seed failed:", data.error ?? data);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
console.log(`\nRespond: ${APP_ORIGIN}/app/respond/?code=${data.eventCode}`);
console.log(`\nManage: ${APP_ORIGIN}/app/manage/#token=${data.manageToken}`);
console.log(`\nView (organizer): ${APP_ORIGIN}/app/view/#token=${data.manageToken}`);
console.log(`\nView (participant): ${APP_ORIGIN}/app/view/?code=${data.eventCode}`);