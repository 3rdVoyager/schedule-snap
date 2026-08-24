# ScheduleSnap API Contract (v1)

Base URL: `http://localhost:8787` in development; workers.dev URL in production
(the frontend keeps one `API_URL` constant to switch).

All requests and responses are JSON. Errors are always
`{ "error": "human-readable message" }` with a 4xx/5xx status.

## Access model

| Capability | Granted by |
|------------|-----------|
| View event, submit/edit response | Join code (8 digits) in the URL |
| Organizer actions (edit, all responses, recommendations) | `Authorization: Bearer <manageToken>` header |

The manage token is returned exactly once — at event creation — and stored in
the organizer's localStorage. It is never included in any other response.

## Core data format: time ranges

Every list of times in this system uses the same primitive shape:

```json
{ "start": "2026-09-01T13:00:00.000Z", "end": "2026-09-01T21:00:00.000Z" }
```

- Timestamps are **UTC ISO 8601 strings** (trailing `Z`). The frontend converts
  to/from the event timezone for display; storage and the API are UTC-only.
- `end` is **exclusive**: it marks the moment the range stops, so adjacent
  ranges (09:00–10:00, 10:00–11:00) can merge or abut without overlap.
- A valid range has `end > start`.

### Where ranges appear

| Field | Who sets it | Meaning |
|-------|-------------|---------|
| `settings.schedulingWindows` | Organizer | Times the meeting *could* happen; respondents mark availability inside these windows |
| `availability` (on responses) | Participant | Times the participant is free, within the organizer's scheduling windows |
| Recommendations (planned) | System | Suggested meeting times derived from responses |

The primitive is always `{ start, end }`. Product language differs; the data
shape does not.

## Endpoints

### Create event — `POST /api/events`

Request body:

```json
{
  "title": "Team sync",
  "description": "Quarterly planning",
  "settings": {
    "timezone": "America/New_York",
    "durationMinutes": 60,
    "schedulingWindows": [
      { "start": "2026-09-01T13:00:00.000Z", "end": "2026-09-01T21:00:00.000Z" },
      { "start": "2026-09-03T13:00:00.000Z", "end": "2026-09-03T17:00:00.000Z" }
    ],
    "responseWindow": { "opensAt": null, "closesAt": null },
    "allowResponseEdits": true,
    "resultsVisibleToParticipants": false
  }
}
```

Validation (server-side):
- `title`: string, non-empty after trim
- `description`: string, optional (empty string allowed)
- `settings.timezone`: valid IANA timezone name (e.g. `America/New_York`)
- `settings.durationMinutes`: one of `30`, `45`, `60`, `90`, `120`, `180`, `360`
- `settings.schedulingWindows`: at least one; each has `start` and `end` as UTC
  ISO strings with `end > start`
- `settings.responseWindow`: optional; if present, `opensAt` and/or `closesAt`
  are UTC ISO timestamps with `closesAt > opensAt` when both given
- `settings.allowResponseEdits`: boolean, defaults to `true` when absent
- `settings.resultsVisibleToParticipants`: boolean, defaults to `false` when absent

On create, `description` and all `settings` fields are persisted together as
JSON in `events.settings` (there is no separate `description` column in v1).

Response `201` (only time the manage token is sent):

```json
{ "id": "uuid", "joinCode": "27473282", "manageToken": "32-hex-chars" }
```

Errors: `400` invalid JSON / validation failure.

### Get event by join code — `GET /api/events/:code`

No auth beyond the code itself. Response `200`:

```json
{
  "id": "uuid",
  "joinCode": "27473282",
  "title": "Team sync",
  "description": "Quarterly planning",
  "settings": {
    "timezone": "America/New_York",
    "durationMinutes": 60,
    "schedulingWindows": [ { "start": "...", "end": "..." } ],
    "responseWindow": { "opensAt": null, "closesAt": null },
    "allowResponseEdits": true,
    "resultsVisibleToParticipants": false
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

`description` is read from the stored settings JSON and returned at the top
level for convenience. `settings` in the response omits `description`.

Errors: `404` unknown code. Never includes `manageToken`.

### Planned (not yet built)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/events/:code/responses` | Participant submits availability + preferences |
| `PUT /api/events/:code/responses/:responseId` | Participant edits their response |
| `GET /api/events/:id/manage` | Organizer view (Bearer token) — all responses |
| `PUT /api/events/:id/manage` | Organizer edits settings / closes event (Bearer token) |
| `GET /api/events/:id/manage/recommendations` | Run scheduling algorithm (Bearer token) |

## Settings object

Stored as JSON text in `events.settings`. One timezone per event in v1
(display-layer conversion per participant is a v2 feature).

```json
{
  "description": "Quarterly planning",
  "timezone": "America/New_York",
  "durationMinutes": 60,
  "schedulingWindows": [ { "start": "...", "end": "..." } ],
  "responseWindow": { "opensAt": null, "closesAt": "2026-08-30T00:00:00.000Z" },
  "allowResponseEdits": true,
  "resultsVisibleToParticipants": false
}
```

`schedulingWindows` defines when the meeting could happen. Participants submit
`availability` ranges (same `{ start, end }` shape) that must fall within those
windows. `responseWindow` controls when responses are accepted (enforcement is
planned; the format is reserved now).
