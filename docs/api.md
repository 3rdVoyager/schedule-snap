# ScheduleSnap API (v1)

JSON in/out. Errors: `{ "error": "message" }` with 4xx/5xx.

**Base URL:** `http://localhost:8787` (dev) · production URL in `js/app/config.js`

## Auth

| Capability | Credential |
|------------|------------|
| View event (respond UI), submit response | Event code (path) |
| View results + recommendations | Event code if `resultsVisibleToParticipants`, else Bearer token |
| Full responses list, edit event | Bearer token only |

Manage token returned **once** on create (`201`). Never in other responses.

**Frontend links:** respond `/app/respond/?code={eventCode}` · results `/app/view/?code={eventCode}` · organizer `/app/manage/?code={eventCode}#token={manageToken}`

Details: `docs/auth-plan.md`

## Three read surfaces

| Surface | API | Audience | Contents |
|---------|-----|----------|----------|
| **Event** | `GET …/:eventCode` | Anyone with code | Metadata + settings to respond — no responses, no recommendations |
| **View** | `GET …/:eventCode/view` | Code (if allowed) or Bearer | Recommendations + visible results — **single source of truth for scheduling output** |
| **Manage** | `GET …/:eventCode/manage` | Bearer only | Event + full raw responses (organizer operations) |

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

### `GET /api/events/:eventCode/view` — results (planned)

Recommendations + responses when permitted.

**Auth:**

- **Bearer** → always **200** (organizer)
- **Event code only** → **200** if `settings.resultsVisibleToParticipants`, else **403**
- Unknown code → **404**

**200 (shape, tentative):**

```json
{
  "eventCode": "49716826",
  "title": "...",
  "settings": { "...": "..." },
  "recommendations": [{ "start": "...", "end": "...", "score": 0.9 }],
  "responses": [{ "id": "...", "displayName": "...", "availability": [...] }]
}
```

`responses` omitted or empty when caller only receives recommendations-only policy (TBD); v1 likely includes responses when the setting is on.

### `GET /api/events/:eventCode/manage` — organizer

**Bearer required** · **200:** event + `responses[]` (full list) · **401** · **404**

---

## Endpoint index

| Method | Path | Auth | Status | Purpose |
|--------|------|------|--------|---------|
| `POST` | `/api/events` | — | Built | Create event |
| `GET` | `/api/events/:eventCode` | Event code | Built | Event metadata for respond flow |
| `POST` | `/api/events/:eventCode/responses` | Event code | Built | Submit response |
| `GET` | `/api/events/:eventCode/view` | Code* or Bearer | Planned | Recommendations + participant-visible results |
| `GET` | `/api/events/:eventCode/manage` | Bearer | Built | Organizer: event + all responses |
| `PUT` | `/api/events/:eventCode/responses/:responseId` | Event code | Planned | Edit own response |
| `PUT` | `/api/events/:eventCode/manage` | Bearer | Planned | Edit settings / close event |

\*Event code on `/view` only when `resultsVisibleToParticipants` is true.

`:eventCode` — 8 digits. Bearer routes: `WHERE event_code = ? AND manage_token = ?`.
