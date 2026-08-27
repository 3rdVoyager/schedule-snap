# Database Schema (v1: link-based, no accounts)

v1 uses capability links instead of accounts: participants join with an 8-digit
join code; organizers act via a per-event secret manage token. No `users` or
`sessions` tables — see `auth-plan.md` for the v2 account design.

```sql
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
```

## Access model

| Capability | Granted by |
|------------|-----------|
| View event, submit/edit response | Join code (low-privilege, rate-limited lookup) |
| Edit event settings, close event, view all responses, run scheduling | Manage token for that event (high-entropy, per-event, rotatable) |

Manage tokens never appear in API responses to participants; only the creator
receives one at event creation.

## Queries

| Action | D1 query |
|--------|----------|
| Create event | Generate id + join_code + manage_token → INSERT with unique check on join_code |
| Join event | SELECT * FROM events WHERE join_code = ? |
| Organizer action | SELECT * FROM events WHERE join_code = ? AND manage_token = ? |
| Submit response | INSERT or UPDATE responses |
| Recommend times | SELECT * FROM responses WHERE event_id = ? → run algo in Worker |
