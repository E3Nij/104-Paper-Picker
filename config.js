// config.js
// -----------------------------------------------------------------------
// Global configuration for the MCJ Assignment Picker web app.
// Paste the Google Apps Script Web App URL you get after deployment
// (see README.md, Step 3-5) into API_URL below.
// -----------------------------------------------------------------------

const CONFIG = {
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  API_URL: "https://script.google.com/macros/s/AKfycbyYHrp_zqnmhUSojPcJtjnYb8mjuzyweeRTaeMahd7Rp8U1ttloQvleLg2mwG95VD3T/exec",

  // How often (in milliseconds) the Live Viewer page polls for new data.
  LIVE_REFRESH_INTERVAL_MS: 5000,

  // The seven historical periods every student must fill in.
  // "key" must match the field name prefix used in app.js, live.js and
  // GoogleAppsScript.gs (e.g. "1960" -> "1960 Newspaper" / "1960 Date").
  // minYear/maxYear are used to sanity-check the year typed into each
  // DD/MM/YYYY date field.
  PERIODS: [
    { key: "1960", label: "1960s", minYear: 1960, maxYear: 1969 },
    { key: "1970", label: "1970s", minYear: 1970, maxYear: 1979 },
    { key: "1980", label: "1980s", minYear: 1980, maxYear: 1989 },
    { key: "1990", label: "1990s", minYear: 1990, maxYear: 1999 },
    { key: "2000", label: "2000s", minYear: 2000, maxYear: 2009 },
    { key: "2010", label: "2010s", minYear: 2010, maxYear: 2019 },
    { key: "2020", label: "2020–2026", minYear: 2020, maxYear: 2026 }
  ]
};
