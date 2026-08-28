# ScheduleSnap Auth (v1)

No accounts. Access is **capability-based**: short codes and secret tokens, not logins.

## Roles

| Role | Credential | What they can do |
|------|------------|------------------|
| **Participant** | Event code | Respond; view results if sharing enabled |
| **Respondent (returning)** | Edit token (`Bearer`) | Edit own response when allowed |
| **Organizer** | Manage token (`Bearer`) | Full responses, manage event; always can use `/view` |

Event codes never grant manage access. Edit tokens never grant access to other responses.

## App dashboard (`/app/`)

Central entry for this device:

- **Join an event** — enter event code → respond (or `?next=` target)
- **Your events** — organizer events stored in `localStorage` (`schedulesnap:v1`)
- **Your responses** — responses submitted on this device, with edit links
- **Create** — `/app/create/`

Pages without credentials redirect to `/app/?next=…`. Deep links (`?code=`, `#token=`, `#edit=`) skip the dashboard.

## Links

| Link | URL |
|------|-----|
| Dashboard | `/app/` |
| Create | `/app/create/` |
| Respond | `/app/respond/?code={eventCode}` |
| Edit response | `/app/respond/#edit={editToken}` |
| View (participant) | `/app/view/?code={eventCode}` |
| View / manage (organizer) | `/app/view/#token={manageToken}` · `/app/manage/#token={manageToken}` |

**Manage token:** 32 hex, once at create. **Edit token:** 32 hex, once at response submit.

## Local registry (device-only)

```json
{
  "organizerEvents": [{ "id", "eventCode", "manageToken", "title", "addedAt" }],
  "myResponses": [{ "responseId", "eventCode", "editToken", "eventTitle", "displayName", "submittedAt" }]
}
```

Not synced across devices; no server-side account list in v1.

## Access rules

```
Respond / read event metadata     → event code
Edit own response                 → edit token (Bearer)
View results                      → event code IF resultsVisibleToParticipants, else organizer secret
Full responses / manage event     → organizer secret only
```

Endpoints: `docs/api.md`
