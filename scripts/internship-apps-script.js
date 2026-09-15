/**
 * SDOT Internship — Google Apps Script webhook
 *
 * IMPORTANT: Open this from the Google Sheet itself:
 *   Sheet → Extensions → Apps Script → paste this file
 * (So the script is bound to the spreadsheet.)
 *
 * Deploy:
 * 1. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 2. Copy the /exec URL → GOOGLE_SHEETS_WEBHOOK_URL
 *
 * Optional Script Properties:
 *   WEBHOOK_SECRET  — must match GOOGLE_SHEETS_WEBHOOK_SECRET
 *   SPREADSHEET_ID  — only needed if this is a standalone script
 *                     (Sheet URL: https://docs.google.com/spreadsheets/d/THIS_ID/edit)
 */

var SHEET_NAME = "Applications";
var EXPECTED_SECRET_PROPERTY = "WEBHOOK_SECRET";
var SPREADSHEET_ID_PROPERTY = "SPREADSHEET_ID";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: "Empty body" });
    }

    var data = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty(
      EXPECTED_SECRET_PROPERTY,
    );
    if (expected && data.secret !== expected) {
      return json_({ ok: false, error: "Unauthorized" });
    }

    var sheet = getOrCreateSheet_();
    ensureHeader_(sheet);

    sheet.appendRow([
      data.refId || "",
      data.submittedAt || new Date().toISOString(),
      data.name || "",
      data.email || "",
      data.phone || "",
      data.city || "",
      data.degree || "",
      data.institution || "",
      data.year || "",
      data.portfolio || "",
      data.interests || "",
      data.interestsOther || "",
      data.why || "",
      data.analysis || "",
      data.tools || "",
      data.toolsOther || "",
      data.hoursPerWeek || "",
      data.startDate || "",
      data.videoLink || "",
      data.videoNote || "",
      data.notionError || "",
      data.storedVia || "google-sheets-fallback",
    ]);

    return json_({ ok: true, refId: data.refId || "" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  try {
    var ss = getSpreadsheet_();
    return json_({
      ok: true,
      service: "sdot-internship-sheets",
      spreadsheet: ss.getName(),
      sheet: SHEET_NAME,
    });
  } catch (err) {
    return json_({
      ok: true,
      service: "sdot-internship-sheets",
      warning: String(err),
    });
  }
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(
    SPREADSHEET_ID_PROPERTY,
  );
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      "No spreadsheet bound. Open Apps Script from the Sheet, or set Script property SPREADSHEET_ID.",
    );
  }
  return ss;
}

function getOrCreateSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    "Ref",
    "Submitted",
    "Name",
    "Email",
    "Phone",
    "City",
    "Degree",
    "Institution",
    "Year",
    "Portfolio",
    "Interests",
    "Interests other",
    "Why SDOT",
    "Analysis",
    "Tools",
    "Tools other",
    "Hours/week",
    "Start date",
    "Video link",
    "Video note",
    "Notion error",
    "Stored via",
  ]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
