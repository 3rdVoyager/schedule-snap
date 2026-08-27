// testing/seed-event.js — run: node testing/seed-event.js
const payload = {
  title: "Q3 Planning",
  description: "Core team availability for quarterly planning.",
  settings: {
    timezone: "America/New_York",
    durationMinutes: 90,
    schedulingWindows: [
      { start: "2026-09-02T13:00:00.000Z", end: "2026-09-02T16:00:00.000Z" },
      { start: "2026-09-03T18:00:00.000Z", end: "2026-09-03T21:00:00.000Z" },
      { start: "2026-09-05T14:00:00.000Z", end: "2026-09-05T20:00:00.000Z" },
    ],
    responseWindow: { opensAt: null, closesAt: null },
    allowResponseEdits: true,
    resultsVisibleToParticipants: false,
  },
};

const res = await fetch("http://127.0.0.1:8787/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
console.log(await res.json());
