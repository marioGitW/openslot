# openslot
OpenSlot – book expert office hours in seconds. Scheduling app built with React, NestJS and PostgreSQL (TeamLift internship challenge).

## Google Calendar

OpenSlot can check the host's Google Calendar so that slots clashing with a meeting are
not offered to bookers.

### How it works

- The API reads the calendar through a **service account** with the
  `calendar.freebusy` scope. It sees only busy/free times, never event titles or details.
- `GET /slots` leaves out slots that overlap a busy time. The host view
  (`GET /slots?status=all`) keeps them and marks them "Calendar conflict".
- Publishing a slot that overlaps a busy time returns `409`, and so does moving an
  open slot onto one (open slots can be edited; a topic-only edit skips the check).
  Booking checks the calendar again just before saving.
- Each conflict links to that day in Google Calendar ("View in Google Calendar"). The
  link opens the calendar of whoever is signed in to Google, so only the host sees the
  actual events.
- Answers from Google are cached in memory for 60 seconds, and each call times out
  after 4 seconds.
- **Fail open:** if Google errors or times out, slots are shown and bookings are
  allowed as if there were no conflicts, and the host view says the calendar couldn't
  be checked. The calendar never breaks booking.
- `GET /calendar/status` returns `{ "enabled": boolean, "ok": boolean }`.

### Setup (optional)

The feature is off when any of the three variables is missing, and the app then works
exactly as without it.

1. In Google Cloud, create a project, enable the **Google Calendar API**, create a
   **service account** and add a JSON key.
2. In Google Calendar, open the calendar's settings → *Share with specific people* →
   add the service account's email with **See only free/busy (hide details)**.
3. In `api/.env`, set:
   - `GOOGLE_CALENDAR_ID`: the calendar ID from *Integrate calendar*. For your main
     calendar this is your Gmail address.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `client_email` from the JSON key.
   - `GOOGLE_PRIVATE_KEY`: only the `private_key` value from the JSON key, in double
     quotes, on one line with `\n` kept as written. Don't paste the whole JSON file.
4. Restart the API. `GET /calendar/status` should return `{ "enabled": true, "ok": true }`.

Never commit the JSON key; `.gitignore` excludes the usual file names.

### Try it

The demo calendar has a "Team standup" every weekday from 10:00 to 10:30 and "Lunch"
from 12:00 to 13:00 (Skopje time). After `npm run db:seed` (in `api/`), a few open
slots overlap these events and show as conflicts in the host view, and they are missing
from the booking page. In the host view, publishing a slot at 10:15 on the next weekday
is blocked with "This overlaps an event in your Google Calendar (10:00–10:30)."

### Why a service account and not OAuth

OpenSlot has a single host, so one calendar shared with a service account is enough,
and there is no sign-in flow to build. OAuth with a calendar scope would need Google's
app verification, and until then only listed test users can connect. Reviewers would
hit that wall.

### Improvements

- OAuth per host, once there are several hosts with their own calendars.
