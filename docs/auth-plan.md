# ScheduleSnap Auth (v1)

No accounts. Access is **capability-based**: short codes and secret tokens, not logins.

## Roles

| Role | Credential | What they can do |
|------|------------|------------------|
| **Participant** | Event code | Respond; view results if sharing enabled |
| **Respondent (returning)** | Edit token | Edit own response when allowed |
| **Organizer** | Manage token | Full responses, manage event; always can use `/view` |

Event codes never grant manage access. Edit tokens never grant access to other responses.

## API authorization

All API credentials go in the `Authorization` header with a type prefix:

```
Authorization: Bearer event:12345678
Authorization: Bearer edit:{32-hex}
Authorization: Bearer manage:{32-hex}
```

| API surface | Header |
|-------------|--------|
| Respond (load/submit) | `Bearer event:{code}` |
| Respond (edit load/update/delete) | `Bearer edit:{token}` |
| View (participant) | `Bearer event:{code}` |
| View (organizer) | `Bearer manage:{token}` |
| Manage | `Bearer manage:{token}` |

Page share links still use query/hash (see below). The frontend reads those and sends prefixed Bearer on API calls.

## App dashboard (`/app/`)

Central entry for this device:

- **Join an event** — enter event code → respond (or `?next=` target)
- **Your events** — organizer events stored in `localStorage` (`schedulesnap:v1`)
- **Your responses** — responses submitted on this device, with edit links
- **Create** — `/app/create/`

Pages without credentials redirect to `/app/?next=…`. Deep links (`?code=`, `#token=`, `#edit=`) skip the dashboard.

## Page links (share URLs)

| Link | URL |
|------|-----|
| Dashboard | `/app/` |
| Create | `/app/create/` |
| Respond | `/app/respond/?code={eventCode}` |
| Edit response | `/app/respond/#edit={editToken}` |
| View (participant) | `/app/view/?code={eventCode}` |
| View / manage (organizer) | `/app/view/#token={manageToken}` · `/app/manage/#token={manageToken}` |

**Manage token:** 32 hex, once at create. **Edit token:** 32 hex, once at response submit.

## Local storage (device-only)

```json
{
  "organizerEvents": [{ "id", "eventCode", "manageToken", "title", "addedAt" }],
  "myResponses": [{ "responseId", "eventCode", "editToken", "eventTitle", "displayName", "submittedAt" }]
}
```

Not synced across devices; no server-side account list in v1.

## Access rules

```
Respond / read event metadata     → Bearer event:{code}
Edit own response                 → Bearer edit:{token}
View results (participant)        → Bearer event:{code} IF resultsVisibleToParticipants
View results (organizer)          → Bearer manage:{token}
Full responses / manage event     → Bearer manage:{token}
```

Endpoints: `docs/api.md`
