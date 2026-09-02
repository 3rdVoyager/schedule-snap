# ScheduleSnap API (v1)

Base: `http://localhost:8787` (dev) · prod in `js/app/config.js` · JSON in/out · errors `{ "error": "…" }`

Auth header: `Authorization: Bearer {type}:{value}` — types `event` (8 digits), `edit` / `manage` (32 hex). No credentials in paths or query strings.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/api/events/create` | — | **201** `{ id, eventCode, manageToken }` |
| `GET` | `/api/events/respond` | `event:` | Event metadata for respond UI |
| `GET` | `/api/events/respond` | `edit:` | Event metadata + own `response` |
| `POST` | `/api/events/respond` | `event:` | **201** `{ id, editToken }`; **409** if display name taken |
| `PATCH` | `/api/events/respond` | `edit:` | Update response; **403** if edits disabled; **409** if display name taken |
| `DELETE` | `/api/events/respond` | `edit:` | **200** `{ ok: true }` |
| `GET` | `/api/events/view` | `event:` | Event + `responses[]`; **403** unless sharing enabled |
| `GET` | `/api/events/view` | `manage:` | Event + `responses[]` (organizer) |
| `GET` | `/api/events/manage` | `manage:` | Event + `responses[]` |
| `PATCH` | `/api/events/manage` | `manage:` | Body same as create; returns event + `responses[]` |
| `PATCH` | `/api/events/manage/responses/:id` | `manage:` | Body `{ critical: boolean }`; returns event + `responses[]` |
| `DELETE` | `/api/events/manage` | `manage:` | Deletes event and all responses |

Page share URLs: `docs/auth-plan.md`
