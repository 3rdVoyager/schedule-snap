import { formatInZone } from "./time.js";

export const MAX_PREFERENCE = 5;
export const DEFAULT_ATTENDANCE_WEIGHT = 0.5;

const DEFAULT_RECOMMENDATION_LIMIT = 10;
const DEFAULT_PREFERENCE = 3;
const SLOT_START_INCREMENT_MINUTES = 15;

function parseInstantMs(iso) {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function isInsideWindow(range, window) {
  const rangeStart = parseInstantMs(range.start);
  const rangeEnd = parseInstantMs(range.end);
  const windowStart = parseInstantMs(window.start);
  const windowEnd = parseInstantMs(window.end);
  if (rangeStart === null || rangeEnd === null || windowStart === null || windowEnd === null) {
    return false;
  }
  return rangeStart >= windowStart && rangeEnd <= windowEnd;
}

function availabilityKey(range) {
  return `${range.start}|${range.end}`;
}

function clampWeight(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

export function pairedWeights(attendanceWeight = DEFAULT_ATTENDANCE_WEIGHT) {
  const attendance = clampWeight(attendanceWeight, DEFAULT_ATTENDANCE_WEIGHT);
  return {
    attendanceWeight: attendance,
    preferenceWeight: 1 - attendance,
  };
}

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

function getParticipantPreference(slot, response) {
  const preferences = response.preferences ?? {};
  let best = null;

  for (const range of response.availability) {
    if (!isInsideWindow(slot, range)) continue;
    const preference = preferences[availabilityKey(range)] ?? DEFAULT_PREFERENCE;
    if (best === null || preference > best) {
      best = preference;
    }
  }

  return best;
}

function slotIncludesAllCritical(slot, responses) {
  for (const response of responses) {
    if (!response.critical) continue;
    if (getParticipantPreference(slot, response) === null) {
      return false;
    }
  }
  return true;
}

export function computeRecommendations(
  settings,
  responses,
  { limit = DEFAULT_RECOMMENDATION_LIMIT, attendanceWeight = DEFAULT_ATTENDANCE_WEIGHT } = {},
) {
  const schedulingWindows = settings.schedulingWindows ?? [];
  const durationMinutes = settings.durationMinutes;
  const totalResponses = responses.length;
  const { attendanceWeight: attendanceW, preferenceWeight } =
    pairedWeights(attendanceWeight);

  if (totalResponses === 0 || schedulingWindows.length === 0) {
    return [];
  }

  const candidates = generateCandidateSlots(schedulingWindows, durationMinutes);
  const ranked = [];

  for (const slot of candidates) {
    let availableCount = 0;
    let preferenceSum = 0;

    for (const response of responses) {
      const preference = getParticipantPreference(slot, response);
      if (preference === null) continue;
      availableCount++;
      preferenceSum += preference;
    }

    if (availableCount === 0) continue;
    if (!slotIncludesAllCritical(slot, responses)) continue;

    const attendanceScore = availableCount / totalResponses;
    const preferenceScore = preferenceSum / availableCount / MAX_PREFERENCE;
    const weightedTotal =
      attendanceW * attendanceScore + preferenceWeight * preferenceScore;
    const totalScore = weightedTotal * 100;

    ranked.push({
      start: slot.start,
      end: slot.end,
      availableCount,
      totalResponses,
      preferenceSum,
      attendanceScore,
      preferenceScore,
      totalScore,
      score: totalScore,
    });
  }

  ranked.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.start.localeCompare(b.start);
  });

  return ranked.slice(0, limit);
}

export function formatScorePercent(score) {
  return `${Math.round(score)}%`;
}

export function formatRecommendationMeta(rec) {
  const attendance = `${rec.availableCount} of ${rec.totalResponses} available`;
  const avgPreference = (rec.preferenceSum / rec.availableCount).toFixed(1);
  return `${attendance} · ${avgPreference} avg preference · score ${formatScorePercent(rec.totalScore)}`;
}

export function renderRecommendationsList(listEl, emptyEl, recommendations, timezone) {
  listEl.replaceChildren();

  if (recommendations.length === 0) {
    listEl.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  listEl.hidden = false;

  for (const rec of recommendations) {
    const li = document.createElement("li");
    li.className = "app-list-item";

    const time = document.createElement("span");
    time.className = "text-body-sm text-medium";
    time.textContent = `${formatInZone(rec.start, timezone)} – ${formatInZone(rec.end, timezone)}`;

    const meta = document.createElement("span");
    meta.className = "text-sub";
    meta.textContent = formatRecommendationMeta(rec);

    li.append(time, meta);
    listEl.appendChild(li);
  }
}
