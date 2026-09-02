# Dev console snippets

Local setup: `npm run dev` (API on 8787) + `npx serve .` (app on 3000).

Open the page, paste the snippet into DevTools console, press Enter.

---

## Create event

**Page:** http://localhost:3000/app/create/

```js
document.querySelector("#title").value = "Q3 Planning Sync";
document.querySelector("#description").value = "Core team availability for quarterly planning.";
document.querySelector("#duration").value = "90";
document.querySelector("#timezone").value = "America/New_York";
document.querySelector(".scheduling-window-start").value = "2026-09-02T09:00";
document.querySelector(".scheduling-window-end").value = "2026-09-02T12:00";
document.querySelector("#add-scheduling-window").click();
(() => { const rows = document.querySelectorAll(".scheduling-window-row"); const row = rows[rows.length - 1];
row.querySelector(".scheduling-window-start").value = "2026-09-03T14:00";
row.querySelector(".scheduling-window-end").value = "2026-09-03T17:00"; })();
document.querySelector("#add-scheduling-window").click();
(() => { const rows = document.querySelectorAll(".scheduling-window-row"); const row = rows[rows.length - 1];
row.querySelector(".scheduling-window-start").value = "2026-09-05T10:00";
row.querySelector(".scheduling-window-end").value = "2026-09-05T16:00"; })();
document.querySelector("#create-event-form").requestSubmit();
```

---

## Respond to event

**Page:** http://localhost:3000/app/respond/?code=YOUR_EVENT_CODE

Replace `YOUR_EVENT_CODE` with an 8-digit code from the create success screen.

```js
document.querySelector("#display-name-input").value = "John Doe";
document.querySelector(".availability-window-start").value = "2026-09-02T09:00";
document.querySelector(".availability-window-end").value = "2026-09-02T11:30";
document.querySelector(".availability-window-preference").value = "5";
document.querySelector("#add-availability-window").click();
(() => { const rows = document.querySelectorAll(".availability-window-row"); const row = rows[rows.length - 1];
row.querySelector(".availability-window-start").value = "2026-09-03T14:00";
row.querySelector(".availability-window-end").value = "2026-09-03T16:00";
row.querySelector(".availability-window-preference").value = "3"; })();
document.querySelector("#response-form").requestSubmit();
```

---

## Join from dashboard

**Page:** http://localhost:3000/app/

```js
document.querySelector("#join-code-input").value = "YOUR_EVENT_CODE";
document.querySelector("#join-form").requestSubmit();
```

---

## Create event via API (optional)

Run in the console on any page (uses local API directly).

```js
fetch("http://127.0.0.1:8787/api/events/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Q3 Planning Sync",
    description: "Core team availability for quarterly planning.",
    settings: {
      timezone: "America/New_York",
      durationMinutes: 90,
      schedulingWindows: [
        { start: "2026-09-02T13:00:00.000Z", end: "2026-09-02T16:00:00.000Z" },
        { start: "2026-09-03T18:00:00.000Z", end: "2026-09-03T21:00:00.000Z" },
        { start: "2026-09-05T14:00:00.000Z", end: "2026-09-05T20:00:00.000Z" },
      ],
      allowResponseEdits: true,
      resultsVisibleToParticipants: true,
    },
  }),
})
  .then((r) => r.json())
  .then((data) => {
    console.log(data);
    console.log(`Respond: http://localhost:3000/app/respond/?code=${data.eventCode}`);
    console.log(`Manage: http://localhost:3000/app/manage/#token=${data.manageToken}`);
    console.log(`API auth example: Authorization: Bearer event:${data.eventCode}`);
  });
```

Example respond load via API:

```js
fetch("http://127.0.0.1:8787/api/events/respond", {
  headers: { Authorization: "Bearer event:YOUR_EVENT_CODE" },
}).then((r) => r.json()).then(console.log);
```
