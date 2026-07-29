/**
 * GoogleAppsScript.gs
 * -----------------------------------------------------------------------
 * Backend for the MCJ 104 Assignment Picker.
 *
 * This script turns a Google Sheet into a small JSON API:
 *   - GET  -> returns every submitted entry as JSON (used by live.html)
 *   - POST -> validates and saves a new entry (used by index.html)
 *
 * SETUP
 *   1. Create a Google Sheet (any name).
 *   2. Extensions > Apps Script, paste this whole file in, save.
 *   3. Deploy > New deployment > Web app.
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   4. Copy the Web App URL into config.js (API_URL).
 *
 * The script automatically creates a sheet named "Entries" with the
 * correct header row the first time it runs, so you do not need to
 * create the header row by hand.
 * -----------------------------------------------------------------------
 */

// Name of the sheet (tab) that stores all submissions.
const SHEET_NAME = "Entries";

// The seven historical periods students must fill in. Keep this in sync
// with CONFIG.PERIODS in config.js.
const PERIODS = ["1960", "1970", "1980", "1990", "2000", "2010", "2020"];

// The exact column headers, in order, as required by the assignment.
const HEADERS = [
  "Name",
  "Roll",
  "1960 Newspaper", "1960 Date",
  "1970 Newspaper", "1970 Date",
  "1980 Newspaper", "1980 Date",
  "1990 Newspaper", "1990 Date",
  "2000 Newspaper", "2000 Date",
  "2010 Newspaper", "2010 Date",
  "2020 Newspaper", "2020 Date",
  "Timestamp"
];

/**
 * Returns the "Entries" sheet, creating it (with headers) if it does
 * not exist yet. Centralizing this avoids repeating the lookup logic.
 */
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Wraps a JS object in a JSON ContentService response.
 * Apps Script does not let us set arbitrary CORS headers on the
 * response, so the frontend avoids CORS preflights entirely by sending
 * POST requests with a "text/plain" Content-Type (see app.js). Simple
 * GET requests are not preflighted by browsers, so no extra headers are
 * required for those either.
 */
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Reads all rows from the sheet and converts them into an array of
 * plain objects keyed by header name. Row 1 (headers) is skipped.
 */
function readAllEntries_() {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows
    .filter(function (row) {
      // Skip completely blank rows.
      return row.some(function (cell) { return String(cell).trim() !== ""; });
    })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (header, i) {
        obj[header] = row[i];
      });
      return obj;
    });
}

/**
 * GET /exec
 * Returns every saved entry as JSON: { success: true, entries: [...] }
 * Used by live.html to render and refresh the public viewer table.
 */
function doGet(e) {
  try {
    const entries = readAllEntries_();
    return jsonResponse_({ success: true, entries: entries });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}

/**
 * POST /exec
 * Body: JSON with { name, roll, "1960Newspaper", "1960Date", ... }
 * Validates the submission (required fields, unique roll, unique
 * newspaper+date combinations) and appends a row if everything passes.
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, error: "No data received." });
    }

    const payload = JSON.parse(e.postData.contents);
    const name = String(payload.name || "").trim();
    const roll = String(payload.roll || "").trim();

    if (!name) {
      return jsonResponse_({ success: false, error: "Name is required." });
    }
    if (!roll) {
      return jsonResponse_({ success: false, error: "Roll is required." });
    }

    // Collect and validate the 7 newspaper/date pairs.
    const selections = {};
    for (let i = 0; i < PERIODS.length; i++) {
      const p = PERIODS[i];
      const newspaperRaw = String(payload[p + "Newspaper"] || "").trim();
      const dateRaw = String(payload[p + "Date"] || "").trim();

      if (!newspaperRaw || !dateRaw) {
        return jsonResponse_({
          success: false,
          error: "Newspaper and date are both required for the " + p + "s period."
        });
      }
      selections[p] = { newspaper: newspaperRaw, date: dateRaw };
    }

    // A student must not pick the same newspaper+date twice within
    // their own submission (case-insensitive on the newspaper name).
    const seenInSubmission = {};
    for (let i = 0; i < PERIODS.length; i++) {
      const p = PERIODS[i];
      const key = selections[p].newspaper.toLowerCase() + "|" + selections[p].date;
      if (seenInSubmission[key]) {
        return jsonResponse_({
          success: false,
          error: "You selected \"" + selections[p].newspaper + "\" on " + selections[p].date + " more than once in your own submission."
        });
      }
      seenInSubmission[key] = true;
    }

    const sheet = getSheet_();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rollColIndex = headers.indexOf("Roll");

    // ---- Roll uniqueness check ----
    for (let r = 1; r < data.length; r++) {
      const existingRoll = String(data[r][rollColIndex] || "").trim();
      if (existingRoll !== "" && existingRoll.toLowerCase() === roll.toLowerCase()) {
        return jsonResponse_({
          success: false,
          error: "Roll \"" + roll + "\" has already submitted an entry."
        });
      }
    }

    // ---- Newspaper + date uniqueness check (across ALL existing rows,
    // and across ALL periods, since a duplicate is defined purely by
    // the newspaper+date pair, not by which decade it was entered under) ----
    const existingCombos = {};
    for (let r = 1; r < data.length; r++) {
      for (let i = 0; i < PERIODS.length; i++) {
        const p = PERIODS[i];
        const npIdx = headers.indexOf(p + " Newspaper");
        const dtIdx = headers.indexOf(p + " Date");
        const np = String(data[r][npIdx] || "").trim().toLowerCase();
        const dt = String(data[r][dtIdx] || "").trim();
        if (np !== "" && dt !== "") {
          existingCombos[np + "|" + dt] = true;
        }
      }
    }

    for (let i = 0; i < PERIODS.length; i++) {
      const p = PERIODS[i];
      const key = selections[p].newspaper.toLowerCase() + "|" + selections[p].date;
      if (existingCombos[key]) {
        return jsonResponse_({
          success: false,
          error: "\"" + selections[p].newspaper + "\" on " + selections[p].date + " has already been taken by another student."
        });
      }
    }

    // ---- All checks passed: append the row ----
    const row = [name, roll];
    for (let i = 0; i < PERIODS.length; i++) {
      const p = PERIODS[i];
      row.push(selections[p].newspaper, selections[p].date);
    }
    row.push(new Date());

    sheet.appendRow(row);

    return jsonResponse_({ success: true, message: "Submission saved successfully." });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}
