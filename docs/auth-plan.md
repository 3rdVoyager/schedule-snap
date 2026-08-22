# ScheduleSnap Auth Plan

Lightweight auth split: **participants stay accountless**; **organizers use email + password** for multi-device workspace access.

## Overview

| Role | Access | Account required |
|------|--------|------------------|
| **Organizer** | Create/manage polls, view all responses, run scheduling | Yes (email + password) |
| **Participant** | View poll, submit/edit own availability & preferences | No |

Poll codes grant **join-only** access. They never grant organizer/admin actions.

## Organizer: Workspace Login

Organizers register with **email + user-chosen password** to access their workspace from any device.

- **Register:** email + password (min 12 characters)
- **Login:** email + password → HttpOnly session cookie
- **Session:** long-lived cookie per device; re-login only when session expires
- **Password storage:** bcrypt or argon2 hash in D1 (never plaintext)
- **Login rate limiting:** throttle failed attempts by IP and/or email

### Recovery

No automated forgot-password flow in v1. UI should state clearly that passwords cannot be reset automatically without being already logged in. Optional manual reset by project maintainer — not a guaranteed feature.

## Participant: Poll Codes (Meet-style)

Each poll gets a short **join code** for sharing. Participants can:

1. Open a direct link with the code embedded, or
2. Visit a universal **`/join`** page, enter the code, and land on that poll

### Code format

**Numeric only** 8 digits, formatted for readability (e.g. `482-910-73`).

- No ambiguous characters; easy to read aloud and type on a phone
- ~100M combinations — sufficient for join-only access with rate limiting
- Matches the Google Meet mental model

- Generated server-side; checked for uniqueness before assignment

### Security posture

Poll codes are **low-privilege**. A guessed code only allows viewing the poll and submitting responses — not managing the workspace or other polls.

Still apply **light rate limiting** on code lookup (anti-spam / bot protection, not high-security threat model).

## Access Rules

```
Organizer actions  → valid workspace session (email + password)
Participant view   → valid poll code or poll link
Participant submit → valid poll code or poll link
Poll admin/edit    → workspace session only (never poll code alone)
```

## What We Are Not Building (v1)

- Magic links via email
- System-generated admin/recovery keys
- Automated password reset
- Participant accounts
- OAuth / social login

## Infrastructure Notes

- **Frontend:** Cloudflare Pages
- **API + auth:** Cloudflare Workers
- **Persistent data:** Cloudflare D1 (schema defined separately)
- Session cookies set by Worker; poll code validation on join/respond endpoints

## UX Summary

**Organizer:** sign up once → log in on any device → dashboard with all polls.

**Participant:** receive link or code → join → respond. No signup.
