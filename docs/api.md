# ScheduleSnap API (v1)

JSON in/out. Errors: `{ "error": "message" }` with 4xx/5xx.

**Base URL:** `http://localhost:8787` (dev) · production URL in `js/app/config.js`

## Auth

| Capability | Credential |
|------------|------------|
| View event (respond UI), submit response | Event code (path) |
| View results + recommendations | Event code if `resultsVisibleToParticipants`, else organizer secret (Bearer) |
| Full responses list, edit event | Organizer secret (Bearer) only |

Manage token returned **once** on create (`201`). Never in other responses. Globally unique — organizer routes do not require the event code.

**Frontend links:** respond `/app/respond/?code={eventCode}` · view `/app/view/?code={eventCode}` (participant) or `/app/view/#token={manageToken}` (organizer) · manage `/app/manage/#token={manageToken}`

Details: `docs/auth-plan.md`

## Three read surfaces

| Surface | API | Audience | Contents |
|---------|-----|----------|----------|
| **Event** | `GET …/:eventCode` | Anyone with code | Metadata + settings to respond — no responses, no recommendations |
| **View** | `GET …/:eventCode/view` or `GET …/view` | Code (if allowed) or Bearer | Recommendations + visible results — **single source of truth for scheduling output** |
| **Manage** | `GET …/manage` | Bearer only | Event + full raw responses (organizer operations) |

Organizers fetch recommendations via **`/view`** (with Bearer), not a separate manage subpath.

## Time ranges

`{ "start": "<UTC ISO Z>", "end": "<UTC ISO Z>" }` with `end > start` (`end` exclusive). Used in `schedulingWindows` and `availability`.

## Settings (`events.settings` JSON)

```json
{
  "timezone": "America/New_York",
  "durationMinutes": 60,
  "schedulingWindows": [{ "start": "...", "end": "..." }],
  "responseWindow": { "opensAt": null, "closesAt": null },
  "allowResponseEdits": true,
  "resultsVisibleToParticipants": false
}
```

`description` is stored here and returned top-level on GET. `durationMinutes`: 30–360 (see worker). `responseWindow` enforcement planned.

---

## Endpoint details

### `POST /api/events` — create

**Body:** `{ title, description?, settings }` · **201:** `{ id, eventCode, manageToken }` · **400**

### `GET /api/events/:eventCode` — event (respond)

**200:** event fields, no responses/recommendations · **404**

### `POST /api/events/:eventCode/responses` — submit response

**Body:** `{ displayName, availability: [{ start, end }], preferences: null }` · **201:** `{ id }` · **400** · **404**

### `GET /api/events/:eventCode/view` — results (participant)

Event code only · **200** if `settings.resultsVisibleToParticipants`, else **403** · **404**

### `GET /api/events/view` — results (organizer)

**Bearer required** (organizer secret) · **200:** recommendations + responses · **401** · **404**

### `GET /api/events/manage` — organizer

**Bearer required** · **200:** event + `responses[]` (full list) · **401** · **404**

---

## Endpoint index

| Method | Path | Auth | Status | Purpose |
|--------|------|------|--------|---------|
| `POST` | `/api/events` | — | Built | Create event |
| `GET` | `/api/events/:eventCode` | Event code | Built | Event metadata for respond flow |
| `POST` | `/api/events/:eventCode/responses` | Event code | Built | Submit response |
| `GET` | `/api/events/:eventCode/view` | Event code* | Built | Participant-visible results |
| `GET` | `/api/events/view` | Bearer | Built | Organizer: recommendations + results |
| `GET` | `/api/events/manage` | Bearer | Built | Organizer: event + all responses |
| `PUT` | `/api/events/:eventCode/responses/:responseId` | Event code | Planned | Edit own response |
| `PUT` | `/api/events/manage` | Bearer | Planned | Edit settings / close event |

\*Event code on `/api/events/:eventCode/view` only when `resultsVisibleToParticipants` is true.

`:eventCode` — 8 digits. Bearer routes: `WHERE manage_token = ?`.
