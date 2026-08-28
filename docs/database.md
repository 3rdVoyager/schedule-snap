# Database (D1 / SQLite)

v1 uses capability links instead of accounts: participants respond with an 8-digit
event code; organizers act via a per-event secret manage token; respondents edit
via a per-response edit token. No `users` or `sessions` tables until v2.

```sql
CREATE TABLE responses (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL REFERENCES events(id),
  edit_token    TEXT UNIQUE NOT NULL,  -- 32 hex chars
  display_name  TEXT NOT NULL,
  ...
);
```

## Access patterns

| Action | Lookup |
|--------|--------|
| View event, submit response | `WHERE event_code = ?` |
| Edit own response | `WHERE edit_token = ?` |
| Organizer action | `WHERE manage_token = ?` |

Full schema: `schema.sql` at repo root.

## Worker queries (v1)

| Operation | SQL |
|-----------|-----|
| Submit response | INSERT with generated `edit_token` |
| Edit response | `SELECT responses.*, events.* FROM responses JOIN events WHERE edit_token = ?` |
| Organizer action | `SELECT * FROM events WHERE manage_token = ?` |
