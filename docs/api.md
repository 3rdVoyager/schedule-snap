# ScheduleSnap API (v1)

JSON in/out. Errors: `{ "error": "message" }` with 4xx/5xx.

**Base URL:** `http://localhost:8787` (dev) · production URL in `js/app/config.js`

## Auth

| Capability | Credential |
|------------|------------|
| View event (respond UI), submit response | Event code (path) |
| Edit own response | Edit token (Bearer) |
| View results + recommendations | Event code if `resultsVisibleToParticipants`, else organizer secret (Bearer) |
| Full responses list, edit event | Organizer secret (Bearer) only |

- **Manage token** returned once on create (`201`). Organizer routes: `WHERE manage_token = ?`.
- **Edit token** returned once on response submit (`201`). Edit routes: `WHERE edit_token = ?`.

**Frontend:** Dashboard `/app/` · create `/app/create/` · respond `/app/respond/?code={eventCode}` or `#edit={editToken}` · view/manage use codes or `#token=` (see `docs/auth-plan.md`).

Details: `docs/auth-plan.md`

## Three read surfaces

| Surface | API | Audience | Contents |
|---------|-----|----------|----------|
| **Event** | `GET …/:eventCode` | Anyone with code | Metadata + settings to respond — no responses, no recommendations |
| **View** | `GET …/:eventCode/view` or `GET …/view` | Code (if allowed) or Bearer | Recommendations + visible results |
| **Manage** | `GET …/manage` | Bearer only | Event + full raw responses |

---

## Endpoint details

### `POST /api/events` — create

**201:** `{ id, eventCode, manageToken }`

### `GET /api/events/:eventCode` — event (respond)

**200:** event metadata · **404**

### `POST /api/events/:eventCode/responses` — submit response

**201:** `{ id, editToken }` · **400** · **404**

### `GET /api/responses/edit` — load own response

**Bearer** (edit token) · **200:** event metadata + `response` · **401** · **404**

### `PUT /api/responses/edit` — update own response

**Bearer** (edit token) · respects `settings.allowResponseEdits` · **200:** `{ id, editToken }` · **403** · **404**

### `GET /api/events/:eventCode/view` — results (participant)

Event code · **403** if results not shared · **404**

### `GET /api/events/view` — results (organizer)

**Bearer** (organizer secret) · **200** · **401** · **404**

### `GET /api/events/manage` — organizer

**Bearer** · **200:** event + `responses[]` · **401** · **404**

---

## Endpoint index

| Method | Path | Auth | Status | Purpose |
|--------|------|------|--------|---------|
| `POST` | `/api/events` | — | Built | Create event |
| `GET` | `/api/events/:eventCode` | Event code | Built | Event metadata |
| `POST` | `/api/events/:eventCode/responses` | Event code | Built | Submit response |
| `GET` | `/api/responses/edit` | Bearer (edit) | Built | Load own response |
| `PUT` | `/api/responses/edit` | Bearer (edit) | Built | Update own response |
| `GET` | `/api/events/:eventCode/view` | Event code* | Built | Participant results |
| `GET` | `/api/events/view` | Bearer | Built | Organizer results |
| `GET` | `/api/events/manage` | Bearer | Built | Organizer manage |
| `PUT` | `/api/events/manage` | Bearer | Planned | Edit event settings |

\*Only when `resultsVisibleToParticipants` is true.

`:eventCode` — 8 digits. Edit/organizer Bearer tokens — 32 hex chars.
