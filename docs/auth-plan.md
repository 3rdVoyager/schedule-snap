# ScheduleSnap Auth (v1)

No accounts — capability links only. Page URLs are for sharing; API calls use `Authorization: Bearer {type}:{value}` (see `docs/api.md`).

| Use | Credential | Page URL | API header | Device storage |
|-----|------------|----------|------------|----------------|
| Dashboard | — | `/app/` | — | — |
| Create event | — | `/app/create/` | — | — |
| Respond | Event code (8 digits) | `/app/respond/?code={code}` | `Bearer event:{code}` | Session |
| Edit response | Edit token (32 hex) | `/app/respond/#edit={token}` | `Bearer edit:{token}` | `localStorage` → `myResponses` |
| View results (participant) | Event code | `/app/view/?code={code}` | `Bearer event:{code}` | Session |
| Manage / view (organizer) | Manage token (32 hex) | `/app/manage/#token={token}` · `/app/view/#token={token}` | `Bearer manage:{token}` | `localStorage` → `organizerEvents` |

Edit/manage tokens issued once (response submit / event create). Event codes ≠ manage access; edit tokens ≠ other responses. Deep links skip dashboard; missing creds → `/app/?next=…`.
