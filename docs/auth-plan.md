# ScheduleSnap Auth (v1)

No accounts. Access is **capability-based**: short codes and secret links, not logins.

## Roles

| Role | Credential | What they can do |
|------|------------|------------------|
| **Participant** | Event code | Respond; view results only if organizer enabled sharing |
| **Organizer** | Manage token (`Bearer`) | Full responses, edit event (planned); always can use `/view` |

Event codes never grant manage/edit access.

## Links

| Link | URL |
|------|-----|
| Respond | `/app/respond/?code={eventCode}` |
| View results | `/app/view/?code={eventCode}` (participant) or `/app/view/#token={manageToken}` (organizer) |
| Manage | `/app/manage/#token={manageToken}` |

Manage token: 32 hex chars, returned once at create. Pasteable like the event code; link uses `#token=` hash. Also stored in `localStorage` (`manageToken:{eventId}`).

## Access rules

```
Respond / read event metadata     → event code
View recommendations + results    → event code IF resultsVisibleToParticipants, else organizer secret (Bearer)
Full responses / manage event     → organizer secret (Bearer) only
```

`/view` is the single source of truth for recommendations (organizers use Bearer; participants use code when allowed). **403** when results exist but are not shared; **404** for bad code/token on protected routes.

## Security (v1)

- Manage links = passwords for that event.
- Light rate limiting on code lookup when deployed.

## Not in v1

Accounts, OAuth, participant login, automated recovery.

## v2 (shelved)

Organizer workspace login; participants stay accountless.

Endpoints: `docs/api.md`
