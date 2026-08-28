# Database (D1 / SQLite)

v1 uses capability links instead of accounts: participants respond with an 8-digit
event code; organizers act via a per-event secret manage token. No `users` or
`sessions` tables until v2.

```sql
CREATE TABLE events (
  id           TEXT PRIMARY KEY,
  event_code   TEXT UNIQUE NOT NULL,  -- 8 digits, stored without dashes
  manage_token TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  settings     TEXT,                  -- JSON blob
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE responses (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL REFERENCES events(id),
  display_name  TEXT NOT NULL,
  role          TEXT,
  availability  TEXT NOT NULL,        -- JSON
  preferences   TEXT,                 -- JSON
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_events_event_code ON events(event_code);
CREATE INDEX idx_responses_event_id ON responses(event_id);
```

## Access patterns

| Action | Lookup |
|--------|--------|
| View event, submit/edit response | Event code (low-privilege, rate-limited lookup) |
| Organizer action | Manage token only (`WHERE manage_token = ?`) |

Full schema: `schema.sql` at repo root.

## Worker queries (v1)

| Operation | SQL |
|-----------|-----|
| Create event | Generate id + event_code + manage_token → INSERT with unique check on event_code |
| Load event (participant) | `SELECT * FROM events WHERE event_code = ?` |
| Organizer action | `SELECT * FROM events WHERE manage_token = ?` |
