# MCJ 104 — Assignment Picker

A small web app for **MCJ 104: Journalistic Writing Skills (Bengali)**,
Department of Mass Communication and Journalism, University of Dhaka.

Students pick one newspaper and one date for seven historical periods
(1960s → 2020–2026). No two students may pick the same newspaper + date
combination. A public Live Viewer page shows every submission in real
time, with search, sorting, printing, and CSV export.

Stack: plain **HTML / CSS / vanilla JavaScript** on the frontend,
**Google Sheets + Google Apps Script** as the backend/database, deployed
as a static site on **Vercel**.

## Files

| File                  | Purpose                                           |
|-----------------------|----------------------------------------------------|
| `index.html`          | Entry form (Page 1)                                |
| `live.html`           | Public live viewer (Page 2)                        |
| `style.css`           | Shared, minimal styling                            |
| `config.js`           | Holds the Apps Script Web App URL + settings       |
| `app.js`              | Form validation + submission logic                 |
| `live.js`             | Live table: fetch, search, sort, print, CSV export |
| `GoogleAppsScript.gs` | Backend API (paste into Apps Script editor)        |

## 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new,
   blank spreadsheet.
2. Name it something like **MCJ 104 Assignment Picker**.
3. You do **not** need to create the `Entries` tab or header row by
   hand — the script creates them automatically the first time it runs.

## 2. Paste the Apps Script

1. In the sheet, open **Extensions → Apps Script**.
2. Delete any placeholder code in `Code.gs`.
3. Copy the entire contents of `GoogleAppsScript.gs` from this project
   and paste it in.
4. Click the save icon (or `Ctrl/Cmd + S`).

## 3. Deploy the Apps Script as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: `MCJ 104 Assignment Picker API` (or anything)
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. Google will ask you to authorize the script — click through the
   consent screens (you may see an "unverified app" warning since this
   is your own script; click **Advanced → Go to (project name)**).

## 4. Make it publicly accessible

The "Who has access: Anyone" setting from Step 3 already makes both the
GET and POST endpoints publicly reachable without a Google login. No
further action is needed. If you ever edit `GoogleAppsScript.gs` again,
you must create a **new deployment version** (Deploy → Manage
deployments → edit → New version) for the changes to go live — saving
the file alone does not update an existing deployment's live URL.

## 5. Copy the Web App URL

After deployment, Apps Script shows a **Web app URL** that looks like:

```
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
```

Copy this URL.

## 6. Configure `config.js`

Open `config.js` in this project and paste the URL in:

```js
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec",
  ...
};
```

Save the file.

## 7. Push the project to GitHub

```bash
cd mcj-assignment-picker
git init
git add .
git commit -m "Initial commit: MCJ 104 assignment picker"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 8. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub login is
   easiest).
2. Click **Add New → Project**, then import the GitHub repository you
   just pushed.
3. Vercel will detect this as a static site. No build command is
   needed — leave **Framework Preset** as "Other" and **Build
   Command** / **Output Directory** blank, since these are plain
   static HTML/CSS/JS files.
4. Click **Deploy**.
5. Once deployed, Vercel gives you a URL such as
   `https://your-project.vercel.app`. Share:
   - `https://your-project.vercel.app/index.html` with students to
     submit entries.
   - `https://your-project.vercel.app/live.html` as the public live
     viewer.

The app works immediately once `config.js` has the correct `API_URL` —
no other configuration is required.

## How duplicate checking works

A submission is rejected if any of its seven newspaper+date pairs
matches a newspaper+date pair **already saved by any other student, in
any of the seven periods** (newspaper name comparison is
case-insensitive; date comparison is exact string match). Roll numbers
must also be unique — a roll that has already submitted cannot submit
again.

Dates are entered as free text in **DD/MM/YYYY** format (e.g.
`15/03/1965`) and validated on both the client and server to be a real
calendar date within the matching decade. The newspaper field is a
plain free-text box — students can type any newspaper name; there is
no dropdown or list restricting the input.

## Notes on CORS

Google Apps Script Web Apps do not support custom CORS response
headers, and browsers preflight `POST` requests that use
`Content-Type: application/json`. To avoid this, `app.js` sends POST
requests with `Content-Type: text/plain`, which browsers do not
preflight. The Apps Script backend still parses the request body as
JSON regardless of that header, so this is purely a workaround and has
no effect on the data sent or received.

## Local testing

You can open `index.html` and `live.html` directly in a browser once
`config.js` is configured — no local server or build step is required,
since everything is static files talking to the Apps Script API.
