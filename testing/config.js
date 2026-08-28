// Local dev defaults and sample data for testing scripts.

export const API_URL = "http://127.0.0.1:8787";
export const APP_ORIGIN = "http://localhost:3000";

/** 8-digit event code to reuse in prefill-respond; leave empty to create a new event. */
export const REUSE_EVENT_CODE = "96682504";

// --- Sample event (America/New_York, UTC-4 in September) ---

export const sampleEventPayload = {
  title: "Q3 Planning Sync",
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
    resultsVisibleToParticipants: true,
  },
};

/** datetime-local values for the create form (event timezone). */
export const sampleSchedulingWindowsLocal = [
  { start: "2026-09-02T09:00", end: "2026-09-02T12:00" },
  { start: "2026-09-03T14:00", end: "2026-09-03T17:00" },
  { start: "2026-09-05T10:00", end: "2026-09-05T16:00" },
];

/** datetime-local values for the respond form (inside scheduling windows). */
export const sampleAvailabilityLocal = {
  displayName: "John Doe",
  windows: [
    { start: "2026-09-02T09:00", end: "2026-09-02T11:30", preference: 5 },
    { start: "2026-09-03T14:00", end: "2026-09-03T16:00", preference: 3 },
  ],
};
