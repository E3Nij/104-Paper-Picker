// app.js
// -----------------------------------------------------------------------
// Handles the entry form on index.html:
//   - client-side validation (required fields, trimming, own-submission
//     duplicate check for a fast UX before hitting the server)
//   - POSTs the submission to the Google Apps Script Web App
//   - shows a clear success or error message
// -----------------------------------------------------------------------

const form = document.getElementById("entry-form");
const messageBox = document.getElementById("message");
const submitBtn = document.getElementById("submit-btn");

/**
 * Displays a message to the user in the message box.
 * @param {string} text
 * @param {"error"|"success"} type
 */
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = "message " + type;
}

/**
 * Clears any previously shown message.
 */
function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

/**
 * Reads every field out of the form and returns a plain object shaped
 * exactly the way GoogleAppsScript.gs expects it, with whitespace
 * trimmed from every value.
 */
function collectFormData() {
  const data = {
    name: form.elements["name"].value.trim(),
    roll: form.elements["roll"].value.trim()
  };

  CONFIG.PERIODS.forEach(function (period) {
    const newspaperField = form.elements[period.key + "Newspaper"];
    const dateField = form.elements[period.key + "Date"];
    data[period.key + "Newspaper"] = newspaperField.value.trim();
    data[period.key + "Date"] = dateField.value.trim();
  });

  return data;
}

/**
 * Basic client-side validation: every field required, and no
 * newspaper+date pair repeated within this single submission.
 * Returns an error string, or null if the data is valid.
 */
function validateFormData(data) {
  if (!data.name) return "Please enter your name.";
  if (!data.roll) return "Please enter your roll number.";

  const seen = {};
  for (const period of CONFIG.PERIODS) {
    const newspaper = data[period.key + "Newspaper"];
    const date = data[period.key + "Date"];

    if (!newspaper || !date) {
      return "Please fill in both the newspaper and date for the " + period.label + " period.";
    }

    const key = newspaper.toLowerCase() + "|" + date;
    if (seen[key]) {
      return "You entered \"" + newspaper + "\" on " + date + " more than once. Each newspaper+date pair must be different.";
    }
    seen[key] = true;
  }

  return null;
}

/**
 * Submits the form data to the Apps Script backend.
 * Uses "text/plain" as the Content-Type to avoid a CORS preflight
 * request, which Apps Script Web Apps do not handle. The backend still
 * reads e.postData.contents as JSON regardless of this header.
 */
async function submitEntry(data) {
  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Server responded with status " + response.status);
  }

  return response.json();
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearMessage();

  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf("PASTE_YOUR") !== -1) {
    showMessage("This app is not configured yet: set API_URL in config.js.", "error");
    return;
  }

  const data = collectFormData();
  const validationError = validateFormData(data);
  if (validationError) {
    showMessage(validationError, "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const result = await submitEntry(data);

    if (result.success) {
      showMessage("Submitted successfully. Thank you!", "success");
      form.reset();
    } else {
      showMessage(result.error || "Submission failed. Please try again.", "error");
    }
  } catch (err) {
    showMessage("Could not reach the server: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});
