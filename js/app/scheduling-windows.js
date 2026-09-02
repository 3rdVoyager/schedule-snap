function availabilityKey(range) {
  return `${range.start}|${range.end}`;
}

function normalizeRanges(ranges) {
  return [...ranges]
    .map((range) => ({ start: range.start, end: range.end }))
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
    );
}

export function intersectTimeRange(range, window) {
  const rangeStart = new Date(range.start).getTime();
  const rangeEnd = new Date(range.end).getTime();
  const windowStart = new Date(window.start).getTime();
  const windowEnd = new Date(window.end).getTime();
  if (
    Number.isNaN(rangeStart) ||
    Number.isNaN(rangeEnd) ||
    Number.isNaN(windowStart) ||
    Number.isNaN(windowEnd)
  ) {
    return null;
  }

  const startMs = Math.max(rangeStart, windowStart);
  const endMs = Math.min(rangeEnd, windowEnd);
  if (endMs <= startMs) return null;

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

export function clipAvailabilityToWindows(
  availability,
  preferences,
  schedulingWindows,
) {
  const clippedAvailability = [];
  const clippedPreferences = {};
  const prefs = preferences ?? {};

  for (const range of availability) {
    const sourcePreference = prefs[availabilityKey(range)] ?? 3;

    for (const window of schedulingWindows) {
      const part = intersectTimeRange(range, window);
      if (!part) continue;

      const key = availabilityKey(part);
      if (clippedAvailability.some((existing) => availabilityKey(existing) === key)) {
        continue;
      }

      clippedAvailability.push(part);
      clippedPreferences[key] = sourcePreference;
    }
  }

  clippedAvailability.sort(
    (a, b) => new Date(a.start) - new Date(b.start),
  );

  return {
    availability: clippedAvailability,
    preferences:
      clippedAvailability.length > 0 ? clippedPreferences : null,
  };
}

export function schedulingWindowsChanged(previousWindows, nextWindows) {
  return (
    JSON.stringify(normalizeRanges(previousWindows ?? [])) !==
    JSON.stringify(normalizeRanges(nextWindows ?? []))
  );
}

export function availabilityWouldBeClipped(availability, schedulingWindows) {
  const { availability: clipped } = clipAvailabilityToWindows(
    availability,
    {},
    schedulingWindows,
  );
  return (
    JSON.stringify(normalizeRanges(availability)) !==
    JSON.stringify(normalizeRanges(clipped))
  );
}

export function countResponsesNeedingClip(responses, schedulingWindows) {
  return responses.filter((response) =>
    availabilityWouldBeClipped(response.availability ?? [], schedulingWindows),
  ).length;
}
