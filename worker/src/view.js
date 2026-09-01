import {
  getEventByManageToken,
  isInsideWindow,
  json,
  parseStoredSettings,
  parseViewResponses,
  publicSettings,
} from "./lib.js";

const DEFAULT_RECOMMENDATION_LIMIT = 10;

/** Minutes between candidate slot start times (change here to retune granularity). */
const SLOT_START_INCREMENT_MINUTES = 15;

function parseInstantMs(iso) {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Walk each scheduling window in SLOT_START_INCREMENT_MINUTES steps.
 * Each candidate is durationMinutes long and must fit entirely in the window.
 */
function generateCandidateSlots(schedulingWindows, durationMinutes) {
  const durationMs = durationMinutes * 60 * 1000;
  const incrementMs = SLOT_START_INCREMENT_MINUTES * 60 * 1000;
  if (durationMs <= 0 || incrementMs <= 0) return [];

  const slots = [];
  const seen = new Set();

  for (const window of schedulingWindows) {
    const windowStartMs = parseInstantMs(window.start);
    const windowEndMs = parseInstantMs(window.end);
    if (windowStartMs === null || windowEndMs === null) continue;

    let startMs = Math.ceil(windowStartMs / incrementMs) * incrementMs;

    for (; startMs + durationMs <= windowEndMs; startMs += incrementMs) {
      const slot = {
        start: new Date(startMs).toISOString(),
        end: new Date(startMs + durationMs).toISOString(),
      };
      const key = `${slot.start}|${slot.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slots.push(slot);
    }
  }

  return slots;
}

function participantCanAttend(slot, availability) {
  return availability.some((range) => isInsideWindow(slot, range));
}

/**
 * v1 scoring: count how many respondents can fully cover the slot.
 * Tie-break: earlier start. Preferences/roles can extend scoreSlot later.
 */
function computeRecommendations(settings, responses, { limit = DEFAULT_RECOMMENDATION_LIMIT } = {}) {
  const schedulingWindows = settings.schedulingWindows ?? [];
  const durationMinutes = settings.durationMinutes;
  const totalResponses = responses.length;

  if (totalResponses === 0 || schedulingWindows.length === 0) {
    return [];
  }

  const candidates = generateCandidateSlots(schedulingWindows, durationMinutes);
  const ranked = [];

  for (const slot of candidates) {
    let availableCount = 0;
    for (const response of responses) {
      if (participantCanAttend(slot, response.availability)) {
        availableCount++;
      }
    }

    if (availableCount === 0) continue;

    ranked.push({
      start: slot.start,
      end: slot.end,
      availableCount,
      totalResponses,
      score: availableCount,
    });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.start.localeCompare(b.start);
  });

  return ranked.slice(0, limit);
}

async function loadViewData(env, event) {
  const stored = parseStoredSettings(event.settings) ?? {};

  const rows = await env.DB.prepare(
    "SELECT * FROM responses WHERE event_id = ? ORDER BY created_at ASC",
  )
    .bind(event.id)
    .all();

  const settings = publicSettings(stored);
  const responses = parseViewResponses(rows);

  return {
    eventCode: event.event_code,
    title: event.title,
    settings,
    recommendations: computeRecommendations(settings, responses),
    responses,
  };
}

export async function getOrganizerView(env, manageToken) {
  const event = await getEventByManageToken(env, manageToken);

  if (event === null) {
    return json({ error: "Invalid organizer secret" }, 404);
  }

  return json(await loadViewData(env, event));
}

export async function getParticipantView(env, eventCode) {
  const event = await env.DB.prepare(
    "SELECT * FROM events WHERE event_code = ?",
  )
    .bind(eventCode)
    .first();

  if (event === null) {
    return json({ error: "Event not found" }, 404);
  }

  const stored = parseStoredSettings(event.settings) ?? {};

  if (!stored.resultsVisibleToParticipants) {
    return json({ error: "Results are not visible to participants" }, 403);
  }

  return json(await loadViewData(env, event));
}
