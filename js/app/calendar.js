import {
  dateKeyInZone,
  formatInZone,
  formatMinutesLabel,
  getDayWindowSegments,
  isDayInSchedulingWindows,
  minutesInZone,
  rangeFromDayMinutes,
} from "./time.js";

const SLOT_MINUTES = 15;
const SLOT_HEIGHT_PX = 24;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function snapMinute(minute, mode) {
  if (mode === "ceil") {
    return Math.ceil(minute / SLOT_MINUTES) * SLOT_MINUTES;
  }
  return Math.floor(minute / SLOT_MINUTES) * SLOT_MINUTES;
}

/**
 * @param {HTMLElement} container
 * @param {{ timezone: string, schedulingWindows: {start:string,end:string}[], initialRanges?: {start:string,end:string}[], onChange?: () => void }} options
 */
export function createCalendar(container, options) {
  const { timezone, schedulingWindows, onChange } = options;
  let ranges = [...(options.initialRanges ?? [])];
  let viewYear;
  let viewMonth;
  let selectedDay = null;
  let dragStartSlot = null;
  let dragEndSlot = null;
  let isDragging = false;

  const root = document.createElement("div");
  root.className = "calendar";
  container.replaceChildren(root);

  initViewMonth();
  autoSelectFirstDay();
  render();

  const onDocPointerUp = () => endDrag();
  const onDocPointerMove = (e) => {
    if (!isDragging) return;
    const grid = root.querySelector(".calendar-time-grid");
    if (!grid) return;
    const minute = minuteAtPointer(e, grid);
    if (minute !== null && minute !== dragEndSlot) {
      dragEndSlot = minute;
      updateDragPreview();
    }
  };

  document.addEventListener("mouseup", onDocPointerUp);
  document.addEventListener("touchend", onDocPointerUp);
  document.addEventListener("mousemove", onDocPointerMove);
  document.addEventListener("touchmove", onDocTouchMove, { passive: false });

  function initViewMonth() {
    const first =
      schedulingWindows.length > 0
        ? dateKeyInZone(schedulingWindows[0].start, timezone)
        : dateKeyInZone(new Date().toISOString(), timezone);
    const [y, m] = first.split("-").map(Number);
    viewYear = y;
    viewMonth = m - 1;
  }

  function autoSelectFirstDay() {
    if (ranges.length > 0) {
      selectedDay = dateKeyInZone(ranges[0].start, timezone);
      const [y, m] = selectedDay.split("-").map(Number);
      viewYear = y;
      viewMonth = m - 1;
      return;
    }
    for (const w of schedulingWindows) {
      const key = dateKeyInZone(w.start, timezone);
      if (isDayInSchedulingWindows(key, schedulingWindows, timezone)) {
        selectedDay = key;
        const [y, m] = key.split("-").map(Number);
        viewYear = y;
        viewMonth = m - 1;
        return;
      }
    }
  }

  function dayKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function weekdayIndex(dayKeyStr) {
    const sample = rangeFromDayMinutes(dayKeyStr, 12 * 60, 12 * 60 + 1, timezone);
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(new Date(sample.start));
    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[name];
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function rangesOnDay(dayKeyStr) {
    return ranges.filter((r) => dateKeyInZone(r.start, timezone) === dayKeyStr);
  }

  function segmentEndMinutes(segment) {
    return segment.endMinutes <= segment.startMinutes
      ? 24 * 60
      : segment.endMinutes;
  }

  function isMinuteAllowed(minute, segments) {
    const end = minute + SLOT_MINUTES;
    return segments.some(
      (s) => minute >= s.startMinutes && end <= segmentEndMinutes(s),
    );
  }

  function isMinuteOccupied(minute, dayKeyStr, ignoreNewDrag = false) {
    const end = minute + SLOT_MINUTES;
    const dayRanges = rangesOnDay(dayKeyStr);
    return dayRanges.some((r) => {
      const rs = snapMinute(minutesInZone(r.start, timezone), "floor");
      const re = snapMinute(minutesInZone(r.end, timezone), "ceil");
      return minute < re && end > rs;
    });
  }

  function mergeMinuteIntervals(intervals) {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged = [{ start: sorted[0].start, end: sorted[0].end }];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const cur = sorted[i];
      if (cur.start <= last.end) {
        last.end = Math.max(last.end, cur.end);
      } else {
        merged.push({ start: cur.start, end: cur.end });
      }
    }
    return merged;
  }

  function addRangeOnDay(dayKeyStr, lo, endMinute) {
    const otherDays = ranges.filter(
      (r) => dateKeyInZone(r.start, timezone) !== dayKeyStr,
    );
    const dayIntervals = [
      ...rangesOnDay(dayKeyStr).map((r) => ({
        start: minutesInZone(r.start, timezone),
        end: minutesInZone(r.end, timezone),
      })),
      { start: lo, end: endMinute },
    ];
    const merged = mergeMinuteIntervals(dayIntervals);
    const dayRanges = merged.map(({ start, end }) =>
      rangeFromDayMinutes(dayKeyStr, start, end, timezone),
    );
    ranges = [...otherDays, ...dayRanges].sort(
      (a, b) => new Date(a.start) - new Date(b.start),
    );
  }

  function removeRange(range) {
    ranges = ranges.filter((r) => r !== range);
    notifyChange();
    render();
  }

  function notifyChange() {
    onChange?.();
  }

  function minuteAtPointer(e, grid) {
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientY === undefined) return null;
    for (const row of grid.querySelectorAll(".calendar-time-slot")) {
      const rect = row.getBoundingClientRect();
      if (clientY >= rect.top && clientY < rect.bottom) {
        const minute = Number(row.dataset.minute);
        return Number.isFinite(minute) ? minute : null;
      }
    }
    return null;
  }

  function onDocTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    onDocPointerMove(e);
  }

  function render() {
    root.replaceChildren();

    const layout = document.createElement("div");
    layout.className = "calendar-layout";

    const monthSection = document.createElement("div");
    monthSection.className = "calendar-month";

    const header = document.createElement("div");
    header.className = "calendar-header";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "calendar-nav";
    prev.setAttribute("aria-label", "Previous month");
    prev.textContent = "‹";
    prev.addEventListener("click", () => {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      render();
    });

    const title = document.createElement("h3");
    title.className = "text-body-sm text-semibold";
    const midKey = dayKey(viewYear, viewMonth, 15);
    const midSample = rangeFromDayMinutes(midKey, 12 * 60, 12 * 60 + 1, timezone);
    title.textContent = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date(midSample.start));

    const next = document.createElement("button");
    next.type = "button";
    next.className = "calendar-nav";
    next.setAttribute("aria-label", "Next month");
    next.textContent = "›";
    next.addEventListener("click", () => {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      render();
    });

    header.append(prev, title, next);
    monthSection.appendChild(header);

    const weekdays = document.createElement("div");
    weekdays.className = "calendar-weekdays";
    for (const label of WEEKDAYS) {
      const span = document.createElement("span");
      span.textContent = label;
      weekdays.appendChild(span);
    }
    monthSection.appendChild(weekdays);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startPad = weekdayIndex(dayKey(viewYear, viewMonth, 1));

    for (let i = 0; i < startPad; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar-day calendar-day--empty";
      empty.setAttribute("aria-hidden", "true");
      grid.appendChild(empty);
    }

    for (let d = 1; d <= totalDays; d++) {
      const key = dayKey(viewYear, viewMonth, d);
      const inWindow = isDayInSchedulingWindows(
        key,
        schedulingWindows,
        timezone,
      );
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-day";
      btn.textContent = String(d);
      if (!inWindow) {
        btn.classList.add("calendar-day--disabled");
        btn.disabled = true;
      } else {
        btn.classList.add("calendar-day--in-window");
        if (key === selectedDay) {
          btn.classList.add("calendar-day--selected", "text-bold");
        }
        if (rangesOnDay(key).length > 0) {
          btn.classList.add("calendar-day--has-ranges");
        }
        btn.addEventListener("click", () => {
          selectedDay = key;
          render();
        });
      }
      grid.appendChild(btn);
    }
    monthSection.appendChild(grid);
    layout.appendChild(monthSection);

    if (
      selectedDay &&
      isDayInSchedulingWindows(selectedDay, schedulingWindows, timezone)
    ) {
      layout.appendChild(buildTimePanel());
    } else {
      const placeholder = document.createElement("div");
      placeholder.className =
        "calendar-time-panel calendar-time-panel--empty text-sub text-center";
      placeholder.textContent = "Select a highlighted day to set your availability.";
      layout.appendChild(placeholder);
    }

    root.appendChild(layout);
  }

  function rowOffsetPx(_grid, minute, baseMin) {
    return ((minute - baseMin) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  }

  function rowSpanPx(_grid, startMin, endMin) {
    return ((endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  }

  function paintBlocks(overlay, _grid, baseMin, maxMinute) {
    overlay.style.height = `${((maxMinute - baseMin) / SLOT_MINUTES) * SLOT_HEIGHT_PX}px`;
    overlay.replaceChildren();
    for (const range of rangesOnDay(selectedDay)) {
      appendBlock(
        overlay,
        _grid,
        baseMin,
        snapMinute(minutesInZone(range.start, timezone), "floor"),
        snapMinute(minutesInZone(range.end, timezone), "ceil"),
        "calendar-time-block",
        range,
      );
    }
    if (isDragging && dragStartSlot !== null) {
      const lo = Math.min(dragStartSlot, dragEndSlot ?? dragStartSlot);
      const endMinute =
        Math.max(dragStartSlot, dragEndSlot ?? dragStartSlot) + SLOT_MINUTES;
      appendBlock(
        overlay,
        _grid,
        baseMin,
        lo,
        endMinute,
        "calendar-time-block calendar-time-block--preview",
        null,
      );
    }
  }

  function appendBlock(
    overlay,
    grid,
    baseMin,
    startMin,
    endMin,
    className,
    rangeRef,
  ) {
    const topPx = rowOffsetPx(grid, startMin, baseMin);
    const heightPx = rowSpanPx(grid, startMin, endMin);
    const block = document.createElement("button");
    block.type = "button";
    block.className = className;
    block.style.top = `${topPx}px`;
    block.style.height = `${heightPx}px`;
    if (rangeRef) {
      block.title = "Click to remove";
      block.setAttribute("aria-label", "Remove availability block");
      block.addEventListener("click", (e) => {
        e.stopPropagation();
        removeRange(rangeRef);
      });
    }
    overlay.appendChild(block);
  }

  function buildTimePanel() {
    const panel = document.createElement("div");
    panel.className = "calendar-time-panel";

    const label = document.createElement("p");
    label.className = "text-body-sm text-semibold";
    const sample = rangeFromDayMinutes(selectedDay, 12 * 60, 12 * 60 + 1, timezone);
    label.textContent = formatInZone(sample.start, timezone).split(",")[0];
    panel.appendChild(label);

    const hint = document.createElement("p");
    hint.className = "text-sub";
    hint.textContent = "Drag empty slots to add time. Click a block to remove it.";
    panel.appendChild(hint);

    const segments = getDayWindowSegments(
      schedulingWindows,
      selectedDay,
      timezone,
    );
    if (segments.length === 0) return panel;

    const minMinute = snapMinute(
      Math.min(...segments.map((s) => s.startMinutes)),
      "floor",
    );
    const maxMinute = snapMinute(
      Math.max(...segments.map((s) => segmentEndMinutes(s))),
      "ceil",
    );

    const grid = document.createElement("div");
    grid.className = "calendar-time-grid";

    for (let m = minMinute; m < maxMinute; m += SLOT_MINUTES) {
      const allowed = isMinuteAllowed(m, segments);
      const occupied = isMinuteOccupied(m, selectedDay);
      const row = document.createElement("div");
      row.className = "calendar-time-slot";
      row.dataset.minute = String(m);
      if (!allowed) row.classList.add("calendar-time-slot--disabled");
      if (occupied) row.classList.add("calendar-time-slot--occupied");

      const timeLabel = document.createElement("span");
      timeLabel.className = "calendar-time-slot-label";
      timeLabel.textContent = formatMinutesLabel(m);
      row.appendChild(timeLabel);

      const track = document.createElement("div");
      track.className = "calendar-time-slot-track";
      row.appendChild(track);

      if (allowed && !occupied) {
        row.addEventListener("mousedown", (e) => startDrag(m, e));
        row.addEventListener("touchstart", (e) => {
          e.preventDefault();
          startDrag(m, e);
        });
      }

      grid.appendChild(row);
    }

    const overlay = document.createElement("div");
    overlay.className = "calendar-time-overlay";
    grid.appendChild(overlay);
    panel.appendChild(grid);
    paintBlocks(overlay, grid, minMinute, maxMinute);
    renderRangeList(panel);

    return panel;
  }

  function renderRangeList(panel) {
    const dayRanges = rangesOnDay(selectedDay);
    if (dayRanges.length === 0) return;

    const list = document.createElement("ul");
    list.className = "calendar-range-list";

    for (const range of dayRanges) {
      const li = document.createElement("li");
      li.className = "calendar-range-item text-sub";

      const text = document.createElement("span");
      text.textContent = `${formatInZone(range.start, timezone)} – ${formatInZone(range.end, timezone)}`;
      li.appendChild(text);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "calendar-range-remove";
      removeBtn.setAttribute("aria-label", "Remove this time range");
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => removeRange(range));
      li.appendChild(removeBtn);

      list.appendChild(li);
    }

    panel.appendChild(list);
  }

  function startDrag(minute, e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest(".calendar-time-block")) return;
    isDragging = true;
    dragStartSlot = minute;
    dragEndSlot = minute;
    updateDragPreview();
  }

  function endDrag() {
    if (!isDragging || dragStartSlot === null || !selectedDay) return;
    const segments = getDayWindowSegments(
      schedulingWindows,
      selectedDay,
      timezone,
    );
    const lo = Math.min(dragStartSlot, dragEndSlot ?? dragStartSlot);
    const hi = Math.max(dragStartSlot, dragEndSlot ?? dragStartSlot);
    const endMinute = hi + SLOT_MINUTES;

    let valid = lo < endMinute;
    for (let m = lo; m < endMinute && valid; m += SLOT_MINUTES) {
      if (!isMinuteAllowed(m, segments)) valid = false;
    }

    if (valid) {
      addRangeOnDay(selectedDay, lo, endMinute);
      notifyChange();
    }

    isDragging = false;
    dragStartSlot = null;
    dragEndSlot = null;
    render();
  }

  function updateDragPreview() {
    const grid = root.querySelector(".calendar-time-grid");
    const overlay = root.querySelector(".calendar-time-overlay");
    if (!overlay || !grid || !selectedDay) return;
    const segments = getDayWindowSegments(
      schedulingWindows,
      selectedDay,
      timezone,
    );
    const minMinute = snapMinute(
      Math.min(...segments.map((s) => s.startMinutes)),
      "floor",
    );
    const maxMinute = snapMinute(
      Math.max(...segments.map((s) => segmentEndMinutes(s))),
      "ceil",
    );
    paintBlocks(overlay, grid, minMinute, maxMinute);
  }

  return {
    getRanges() {
      return ranges.map((r) => ({ start: r.start, end: r.end }));
    },
    setRanges(next) {
      ranges = next.map((r) => ({ ...r }));
      if (ranges.length > 0) {
        selectedDay = dateKeyInZone(ranges[0].start, timezone);
        const [y, m] = selectedDay.split("-").map(Number);
        viewYear = y;
        viewMonth = m - 1;
      }
      render();
    },
    destroy() {
      document.removeEventListener("mouseup", onDocPointerUp);
      document.removeEventListener("touchend", onDocPointerUp);
      document.removeEventListener("mousemove", onDocPointerMove);
      document.removeEventListener("touchmove", onDocTouchMove);
      container.replaceChildren();
    },
  };
}
