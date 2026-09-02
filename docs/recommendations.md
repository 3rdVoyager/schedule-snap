# Recommendation ranking

ScheduleSnap suggests meeting times by scoring every candidate slot that fits the event duration inside the organizer's scheduling windows.

## Candidate slots

- Slots start every **15 minutes** within each scheduling window.
- Each slot lasts the event **duration** from settings (for example, 60 minutes).
- A slot is only considered if at least one respondent can attend.
- A slot is excluded if any respondent marked **critical** cannot attend that time.

## Critical respondents

Organizers can mark a response as **critical** on the manage page **Responses** tab. Any slot where a critical person cannot attend is removed from recommendations before scoring.

## Participant preferences

When someone responds, they mark availability ranges on the calendar and rate each range from **1** (low) to **5** (high). If a slot falls inside multiple ranges for one person, their **highest** rating among those ranges is used.

## Component scores (0–1 internally)

Each candidate slot gets two normalized scores before weighting:

**Attendance score**

```
availableCount / totalResponses
```

`availableCount` is how many respondents can fully cover the slot. `totalResponses` is everyone who submitted.

**Preference score**

```
(average preference among attendees) / 5
```

Preferences are averaged only across people who can attend the slot, then divided by `5` (the top rating).

## Weighted total score (0–100%)

On the manage page **Recommendations** tab, one slider sets the balance between attendance and preference. The two weights always sum to **100%**:

```
preferenceWeight = 1 - attendanceWeight
weightedTotal = (attendanceWeight × attendanceScore) + (preferenceWeight × preferenceScore)
totalScore% = weightedTotal × 100
```

When both component scores are perfect, `totalScore` is **100%**.

The slot with the highest `totalScore` ranks first. Ties break to the earlier start time.

### Examples

| Attendance weight | Preference weight | Effect |
|-------------------|-------------------|--------|
| 100% | 0% | Rank purely by how many people can attend |
| 0% | 100% | Rank purely by how much attendees like the time |
| 50% | 50% | Balance both equally (default on the public results page) |

The balance is stored in the browser session on the manage page. The public results page uses the default **50% / 50%** split.

## Implementation

- Scoring logic: `js/app/recommendations.js` (client-side; manage + view pages)
- Manage balance UI: `app/manage/index.html`, `js/app/manage.js`
- API: `GET /api/events/view` and `GET /api/events/manage` return `settings` + `responses[]` only
