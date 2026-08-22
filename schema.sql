-- ScheduleSnap v1: link-based access, no accounts.
-- Participants join via 8-digit join code; organizers act via a per-event
-- secret manage token (capability link). Users/sessions shelved until v2.

CREATE TABLE events (
  id           TEXT PRIMARY KEY,
  join_code    TEXT UNIQUE NOT NULL,  -- 8 digits, stored without dashes
  manage_token TEXT UNIQUE NOT NULL,  -- 32 hex chars, grants organizer actions for this event only
  title        TEXT NOT NULL,
  settings     TEXT,                  -- JSON: date range, duration, constraints
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE responses (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL REFERENCES events(id),
  display_name  TEXT NOT NULL,
  role          TEXT,                 -- optional, for weighted scheduling
  availability  TEXT NOT NULL,        -- JSON: ranges or slot map
  preferences   TEXT,                 -- JSON: slot -> preference score
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_events_join_code ON events(join_code);
CREATE INDEX idx_responses_event_id ON responses(event_id);
