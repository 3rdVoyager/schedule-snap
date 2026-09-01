# ScheduleSnap API (v1)

JSON in/out. Errors: `{ "error": "message" }` with 4xx/5xx.

**Base URL:** `http://localhost:8787` (dev) · production URL in `js/app/config.js`

## Auth

All credentials use the `Authorization` header with typed Bearer prefixes. **No credentials in API paths or query strings.**

```
Authorization: Bearer event:12345678
Authorization: Bearer edit:a1b2c3d4…   (32 hex)
Authorization: Bearer manage:a1b2c3d4… (32 hex)
```

| Type | Value | Grants |
|------|-------|--------|
| `event` | 8-digit event code | Load event for respond; submit response; view results (if allowed) |
| `edit` | 32 hex edit token | Load, update, or delete own response |
| `manage` | 32 hex manage token | View results, manage event, full response list |

- **Manage token** returned once on create (`201`).
- **Edit token** returned once on response submit (`201`).
- Malformed or missing prefix → `401`. Wrong type for route → `401`.

**Frontend page URLs** (share links) still use `?code=`, `#edit=`, `#token=` — see `docs/auth-plan.md`. Only API calls use prefixed Bearer headers.

## Three surfaces

| Surface | Path | Auth | Contents |
|---------|------|------|----------|
| **Respond** | `/api/events/respond` | `event:` or `edit:` | Event metadata; submit/update/delete response |
| **View** | `/api/events/view` | `event:` or `manage:` | Recommendations + visible results |
| **Manage** | `/api/events/manage` | `manage:` | Event + full raw responses |

---

## Endpoint details

### `POST /api/events/create` — create

No auth · **201:** `{ id, eventCode, manageToken }`

### `GET /api/events/respond` — load (new respond)

`Bearer event:{code}` · **200:** event metadata · **401** · **404**

### `GET /api/events/respond` — load (edit)

`Bearer edit:{token}` · **200:** event metadata + `response` · **401** · **404**

### `POST /api/events/respond` — submit response

`Bearer event:{code}` · **201:** `{ id, editToken }` · **400** · **401** · **404**

### `PATCH /api/events/respond` — update response

`Bearer edit:{token}` · respects `settings.allowResponseEdits` · **200:** `{ id, editToken }` · **403** · **404**

### `DELETE /api/events/respond` — delete response

`Bearer edit:{token}` · **200:** `{ ok: true }` · **401** · **404**

### `GET /api/events/view` — results (participant)

`Bearer event:{code}` · **403** if results not shared · **404**

### `GET /api/events/view` — results (organizer)

`Bearer manage:{token}` · **200** · **401** · **404**

### `GET /api/events/manage` — organizer load

`Bearer manage:{token}` · **200:** event + `responses[]` · **401** · **404**

### `PATCH /api/events/manage` — update event

`Bearer manage:{token}` · body: `{ title, description, settings }` (same shape as create) · **200:** updated event + `responses[]` · **400** · **401** · **404**

### `DELETE /api/events/manage` — delete event

`Bearer manage:{token}` · **200:** `{ ok: true }` · **401** · **404** — permanently deletes event and all responses

---

## Endpoint index

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/events/create` | — | Create event |
| `GET` | `/api/events/respond` | `event:` or `edit:` | Load event (or event + response for edit) |
| `POST` | `/api/events/respond` | `event:` | Submit response |
| `PATCH` | `/api/events/respond` | `edit:` | Update response |
| `DELETE` | `/api/events/respond` | `edit:` | Delete response |
| `GET` | `/api/events/view` | `event:`* or `manage:` | View results |
| `GET` | `/api/events/manage` | `manage:` | Organizer manage load |
| `PATCH` | `/api/events/manage` | `manage:` | Update event settings |
| `DELETE` | `/api/events/manage` | `manage:` | Delete event + responses |

\*Participant view only when `resultsVisibleToParticipants` is true.
