# ScheduleSnap API Contract (v1)

Base URL: `http://localhost:8787` in development; workers.dev URL in production
(the frontend keeps one `API_URL` constant to switch).

All requests and responses are JSON. Errors are always
`{ "error": "human-readable message" }` with a 4xx/5xx status.

## Access model

| Capability | Granted by |
|------------|-----------|
| View event, submit/edit response | Event code (8 digits) |
| Organizer actions (edit, all responses, recommendations) | Manage token (`Authorization: Bearer <manageToken>`) |

The manage token is returned exactly once — at event creation — and stored in
the organizer's browser (`localStorage`, keyed by event `id`). It is never
included in any other API response.

### Frontend links

| Audience | URL | Notes |
|----------|-----|-------|
| Participant | `/app/respond/?code={eventCode}` | Public share link |
| Organizer | `/app/manage/?code={eventCode}#token={manageToken}` | Secret capability link |

- **Event code** in the query string identifies which event to load (participant
  view or manage page shell).
- **Manage token** lives in the URL **hash** (`#token=...`) so it is not sent to
  the static host on page load. The manage page reads it client-side and sends
  it as a `Bearer` token on API calls.
- Authorization is enforced by the **token alone**; the event code in manage URLs
  is for routing and UX. The worker verifies that the token belongs to the event
  with that event code.

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
{ "id": "uuid", "eventCode": "27473282", "manageToken": "32-hex-chars" }
```

The frontend uses `eventCode` and `manageToken` to build participant and
organizer links (see [Frontend links](#frontend-links)). `id` is stored in
`localStorage` for manage-token lookup.

Errors: `400` invalid JSON / validation failure.

### Get event by event code — `GET /api/events/:eventCode`

`:eventCode` is the 8-digit event code (digits only, no dashes).

No auth beyond the code itself. Response `200`:

```json
{
  "id": "uuid",
  "eventCode": "27473282",
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

### Submit response — `POST /api/events/:eventCode/responses`

Request body:

```json
{
  "displayName": "Alex",
  "availability": [
    { "start": "2026-09-01T14:00:00.000Z", "end": "2026-09-01T16:00:00.000Z" }
  ],
  "preferences": null
}
```

Response `201`:

```json
{ "id": "uuid" }
```

Errors: `400` validation failure; `404` unknown event code.

### Planned (not yet built)

#### Participant responses

| Endpoint | Purpose |
|----------|---------|
| `PUT /api/events/:eventCode/responses/:responseId` | Participant edits their response |

#### Organizer (manage token required)

All manage endpoints use the event code in the path and the manage token in the
`Authorization` header. The worker resolves the event with:

```sql
SELECT * FROM events WHERE event_code = ? AND manage_token = ?
```

| Endpoint | Purpose |
|----------|---------|
| `GET /api/events/:eventCode/manage` | Organizer view — event + all responses |
| `PUT /api/events/:eventCode/manage` | Organizer edits settings / closes event |
| `GET /api/events/:eventCode/manage/recommendations` | Run scheduling algorithm |

Example request:

```http
GET /api/events/27473282/manage
Authorization: Bearer c0ca6e79244bd6c9675eff2e741d94b3
```

Errors: `401` missing or invalid token; `404` unknown code or token does not
match that event.

Planned `GET /api/events/:eventCode/manage` response `200`:

```json
{
  "id": "uuid",
  "eventCode": "27473282",
  "title": "Team sync",
  "description": "Quarterly planning",
  "settings": { "...": "..." },
  "responses": [
    {
      "id": "uuid",
      "displayName": "Alex",
      "role": null,
      "availability": [ { "start": "...", "end": "..." } ],
      "preferences": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

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
