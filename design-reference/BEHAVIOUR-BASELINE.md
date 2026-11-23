# Behaviour baseline (before the redesign)

Recorded 2026-11-23 on branch `frontend-redesign` at commit `58300e7`, before any
page was restyled. Every redesign step must keep all of this working. Probes
were run with Playwright at 1440x900 against a throwaway mock of the existing
endpoints, because no `backend/.env` was available to reach the real MySQL.

## Pages and routes (server.js, unchanged)

| Route | Allowed roles | Serves |
|-------|---------------|--------|
| `/login` | anyone | `login.html` |
| `/` | logged in | redirects to `/admin`, `/dashboard` or `/guest` by role |
| `/admin` | admin | `index.html` |
| `/dashboard` | user | `index.html` |
| `/guest` | guest | `index.html` |
| `/reports` | admin, user | `reports.html` (guest gets 403) |

`server.js` has **no `express.static`**. Pages are sent with `res.sendFile`, so
today no separate CSS, JS or image file under `backend/public/` can be loaded.
Chart.js comes from `cdn.jsdelivr.net` (reports page only).

## Login (`login.html`)

- Sign in: `POST /api/auth/login` with `{ username, password }` (username trimmed, `maxlength=50`). On success, redirect to `/`. On error, show the server message in `#message` (for example "Invalid username or password.").
- Create account: toggles to a register form. Client checks: username pattern `[A-Za-z0-9_.-]{3,50}`, email, password at least 8 characters, passwords match, at most 72 UTF-8 bytes. Then `POST /api/auth/register` with `{ username, email, password, confirmPassword }`. On success, return to the login form with the username pre-filled and a green success message.
- Continue as Guest: `POST /api/auth/guest`, then redirect to `/`.
- Buttons are disabled while their request is in flight.

## Dashboard (`index.html`, one file for all three roles)

On load it calls `GET /api/auth/me`. If the path doesn't match the role's route, it replaces the location with the right one.

| Feature | Guest | User | Admin |
|---------|-------|------|-------|
| Header shows username and role pill | yes | yes | yes |
| Reports link (`#reportsLink`) | **hidden** | shown | shown |
| Stat cards: Total, Open, Critical, Resolved/Closed | yes | yes | yes |
| Issues table (`GET /api/issues`) | yes | yes | yes |
| Search, severity and status filters | yes | yes | yes |
| "+ Create Issue" button and panel | **hidden** | shown | shown |
| Delete button per issue (`DELETE /api/issues/:id`, confirm dialog) | no | no | **yes** |
| User management panel (`GET /api/admin/users`, `PATCH /api/admin/users/:id`) | no | no | **yes** |
| Logout (`POST /api/auth/logout`, then `/login`) | yes | yes | yes |

- **Filters** are purely client-side over the loaded issues. Search is a case-insensitive substring match on `title + " " + project_name`. The severity select is Low/Medium/High/Critical and the status select is Open/In Progress/Resolved/Closed. Filters combine with AND. `#message` reads "Showing X of Y issues".
- **Create issue** is an inline panel opened by `#newIssueBtn`. Fields: project and reporter selects (from `GET /api/issues/options`), title (`maxlength=180`, required), description (`maxlength=10000`, required), and severity (default Medium). It posts `{ project_id, reporter_id, title, description, severity }` to `POST /api/issues`. On success it resets the form, hides the panel, shows "Issue created successfully!" and reloads issues. On failure it shows "Unable to create issue: <server message>".
- **Statuses** are display-only. No endpoint exists to change an issue's status yet, because issue update is in progress in `routes/issues.js`.
- **Admin user table:** the admin's own row is disabled ("You cannot edit your own account.").
- A 401 from any API call goes to `/login`.

## Reports (`reports.html`)

- The "Back to Dashboard" link is set from the role on load (`/admin` or `/dashboard`).
- "Refresh Reports" reloads all ten views.
- Summary cards: Urgent Issues (`urgent-issues` row count), Active Developers (`active-developers`), Projects (`project-issue-statistics`), Accepted Solutions (`accepted-solutions`).
- Charts (Chart.js): Severity doughnut from `issue-details`, and Developer Workload bar from `developer-workload` (name and count columns detected by regex).
- One panel per view (ten in total, loaded with `Promise.allSettled`). A failed view shows its error inside its panel.
- **Search** per table: case-insensitive substring over each row's text. Hides non-matching rows and updates "Showing X of Y records". "Clear" resets it.
- **CSV export** per table always exports **all** rows (not just the filtered ones). Every value is double-quoted with `"` escaped as `""`, the original column names form the header, rows end in CRLF, a UTF-8 BOM is added, and the file is named `bugpilot-<view-id>.csv`.
- A 401 redirects to `/`.

## Probe results (before)

| Probe | Guest | User | Admin |
|-------|-------|------|-------|
| Lands on | `/guest` | `/dashboard` | `/admin` |
| Reports link visible | false | true | true |
| Create button visible | false | true | true |
| User management visible | false | false | true |
| Delete buttons | 0 | 0 | one per row |
| `GET /reports` | 403 | 200 | 200 |
| `GET /api/views/issue-details` | 403 | 200 | 200 |
| Create issue adds a row and shows the notice | n/a | yes | yes |
| Search, severity, and severity+status filters narrow rows | yes | yes | yes |
| Logout lands on `/login` | yes | yes | yes |

Reports: 10 panels. Searching "checkout" in Issue Details shows "Showing 6 of 16 records". The CSV file is named `bugpilot-issue-details.csv`, has a BOM, and its header is `"issue_id","title","severity","status","project_name","reporter"` with every row exported.
