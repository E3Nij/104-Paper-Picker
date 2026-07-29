// live.js
// -----------------------------------------------------------------------
// Handles the public Live Viewer on live.html:
//   - fetches entries from the Google Apps Script Web App
//   - renders them into a table
//   - live search / filter, sorting, print, and CSV export
//   - auto-refreshes on an interval so everyone sees new submissions
// -----------------------------------------------------------------------

const statusLine = document.getElementById("status-line");
const tableHeadRow = document.getElementById("table-head-row");
const tableBody = document.getElementById("table-body");
const emptyState = document.getElementById("empty-state");
const searchBox = document.getElementById("search-box");
const sortSelect = document.getElementById("sort-select");
const printBtn = document.getElementById("print-btn");
const csvBtn = document.getElementById("csv-btn");

// Column list used for both the table header and CSV export, in order.
const COLUMNS = ["Name", "Roll"];
CONFIG.PERIODS.forEach(function (period) {
  COLUMNS.push(period.label + " Newspaper");
  COLUMNS.push(period.label + " Date");
});
COLUMNS.push("Timestamp");

// Maps a display column name back to the raw sheet column name.
function sheetColumnFor(displayColumn) {
  if (displayColumn === "Name" || displayColumn === "Roll" || displayColumn === "Timestamp") {
    return displayColumn;
  }
  for (const period of CONFIG.PERIODS) {
    if (displayColumn === period.label + " Newspaper") return period.key + " Newspaper";
    if (displayColumn === period.label + " Date") return period.key + " Date";
  }
  return displayColumn;
}

let allEntries = [];       // raw entries as returned by the API
let refreshTimer = null;

/**
 * Builds the <thead> row once, based on COLUMNS. Each header is
 * clickable for sorting where it makes sense (Roll, Name, Timestamp).
 */
function buildTableHead() {
  tableHeadRow.innerHTML = "";
  COLUMNS.forEach(function (col) {
    const th = document.createElement("th");
    th.textContent = col;
    tableHeadRow.appendChild(th);
  });
}

/**
 * Fetches all entries from the Apps Script Web App.
 */
async function fetchEntries() {
  const response = await fetch(CONFIG.API_URL, { method: "GET" });
  if (!response.ok) {
    throw new Error("Server responded with status " + response.status);
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Unknown server error.");
  }
  return result.entries || [];
}

/**
 * Returns entries filtered by the current search box text.
 * Matches against name, roll, and every newspaper/date field.
 */
function applySearch(entries) {
  const query = searchBox.value.trim().toLowerCase();
  if (!query) return entries;

  return entries.filter(function (entry) {
    return Object.values(entry).some(function (value) {
      return String(value).toLowerCase().indexOf(query) !== -1;
    });
  });
}

/**
 * Returns entries sorted according to the current sort dropdown.
 */
function applySort(entries) {
  const sorted = entries.slice();
  const by = sortSelect.value;

  sorted.sort(function (a, b) {
    if (by === "roll") {
      return String(a.Roll || "").localeCompare(String(b.Roll || ""), undefined, { numeric: true });
    }
    if (by === "name") {
      return String(a.Name || "").localeCompare(String(b.Name || ""));
    }
    // timestamp
    const ta = new Date(a.Timestamp).getTime() || 0;
    const tb = new Date(b.Timestamp).getTime() || 0;
    return ta - tb;
  });

  return sorted;
}

/**
 * Renders the given entries into the table body.
 */
function renderTable(entries) {
  tableBody.innerHTML = "";

  if (entries.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  entries.forEach(function (entry) {
    const tr = document.createElement("tr");
    COLUMNS.forEach(function (col) {
      const td = document.createElement("td");
      const sheetCol = sheetColumnFor(col);
      let value = entry[sheetCol];

// Format all newspaper date columns as DD/MM/YYYY
if (col.endsWith(" Date") && col !== "Timestamp" && value) {
  const d = new Date(value);
  value = isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB");
}

// Format timestamp separately
if (col === "Timestamp" && value) {
  const d = new Date(value);
  value = isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-GB");
}
      td.textContent = value == null ? "" : value;
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

/**
 * Re-applies search + sort to the currently loaded entries and
 * re-renders the table. Called after every fetch and on every
 * search/sort interaction.
 */
function refreshView() {
  const filtered = applySearch(allEntries);
  const sorted = applySort(filtered);
  renderTable(sorted);
}

/**
 * Loads entries from the server and updates the view.
 */
async function loadEntries() {
  try {
    allEntries = await fetchEntries();
    statusLine.textContent = allEntries.length + " submission(s) — last updated " + new Date().toLocaleTimeString();
    refreshView();
  } catch (err) {
    statusLine.textContent = "Could not load data: " + err.message;
  }
}

/**
 * Converts the currently filtered/sorted entries into a CSV file and
 * triggers a download.
 */
function downloadCSV() {
  const filtered = applySort(applySearch(allEntries));

  const escapeCsv = function (value) {
    const str = value == null ? "" : String(value);
    if (str.indexOf(",") !== -1 || str.indexOf('"') !== -1 || str.indexOf("\n") !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [];
  lines.push(COLUMNS.map(escapeCsv).join(","));

  filtered.forEach(function (entry) {
    const row = COLUMNS.map(function (col) {
      return escapeCsv(entry[sheetColumnFor(col)]);
    });
    lines.push(row.join(","));
  });

  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "mcj104-submissions.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---- Wire up events ----

searchBox.addEventListener("input", refreshView);
sortSelect.addEventListener("change", refreshView);
printBtn.addEventListener("click", function () { window.print(); });
csvBtn.addEventListener("click", downloadCSV);

// ---- Init ----

buildTableHead();

if (!CONFIG.API_URL || CONFIG.API_URL.indexOf("PASTE_YOUR") !== -1) {
  statusLine.textContent = "This app is not configured yet: set API_URL in config.js.";
} else {
  loadEntries();
  refreshTimer = setInterval(loadEntries, CONFIG.LIVE_REFRESH_INTERVAL_MS);
}
