/**
 * EMBEDX response-to-Sheets bridge (Spark-compatible; no Cloud Functions).
 * Run setupEmbedxSheets() once as the allowlisted owner, authorize requested
 * Google scopes, then share the created spreadsheet only with the intended team.
 * This script polls Firestore using the owner's OAuth identity every minute.
 */
const EMBEDX_PROJECT_ID = "embedx-club-eee";
const EMBEDX_OWNER_EMAIL = "814725105014@trp.srmtrichy.edu.in";
const EMBEDX_COLLEGE_LOGO = "https://trp.srmtrichy.edu.in/wp-content/uploads/2026/03/TRP.png";
const EMBEDX_SHEET_PROPERTY = "EMBEDX_FORMS_SPREADSHEET_ID";
const EMBEDX_SHEETS = {
  members_applications: ["Join Requests", ["Submission ID", "Submitted At", "Name", "Email", "Register No.", "Department", "Year", "Interests", "Details", "Form ID"]],
  contact_messages: ["Enquiries", ["Submission ID", "Submitted At", "Name", "Email", "Subject", "Message", "Form ID"]],
  form_responses: ["Custom Form Responses", ["Submission ID", "Submitted At", "Form ID", "Form Title", "Name", "Email", "Answers JSON"]]
};

function setupEmbedxSheets() {
  assertOwner_();
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(EMBEDX_SHEET_PROPERTY);
  let spreadsheet;
  if (id) {
    try { spreadsheet = SpreadsheetApp.openById(id); } catch (_) { id = ""; }
  }
  if (!id) {
    spreadsheet = SpreadsheetApp.create("EMBEDX — Form Responses");
    id = spreadsheet.getId();
    props.setProperty(EMBEDX_SHEET_PROPERTY, id);
  }
  Object.values(EMBEDX_SHEETS).forEach(([name, headers]) => ensureTab_(spreadsheet, name, headers));
  ensureTab_(spreadsheet, "Sync Log", ["Last Sync", "Result", "Details"]);
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === "syncEmbedxFormsToSheets").forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncEmbedxFormsToSheets").timeBased().everyMinutes(1).create();
  writeSettings_({ spreadsheetUrl: spreadsheet.getUrl(), spreadsheetId: id, syncEnabled: true, lastSyncedAt: "", lastError: "" });
  syncEmbedxFormsToSheets();
  console.log("EMBEDX response sheet: " + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function syncEmbedxFormsToSheets() {
  assertOwner_();
  const id = PropertiesService.getScriptProperties().getProperty(EMBEDX_SHEET_PROPERTY);
  if (!id) throw new Error("Run setupEmbedxSheets() once before syncing.");
  const spreadsheet = SpreadsheetApp.openById(id);
  let added = 0;
  const ownerNotices = [];
  try {
    Object.keys(EMBEDX_SHEETS).forEach((collection) => {
      const [sheetName] = EMBEDX_SHEETS[collection];
      const sheet = spreadsheet.getSheetByName(sheetName);
      const seen = existingIds_(sheet);
      const docs = listFirestoreDocuments_(collection);
      docs.forEach((document) => {
        const docId = document.name.split("/").pop();
        if (seen.has(docId)) return;
        const record = decodeFields_(document.fields || {});
        const row = rowFor_(collection, docId, record);
        sheet.appendRow(row.map(sheetSafe_));
        seen.add(docId);
        added++;
        notifySubmitter_(collection, record);
        if (collection === "members_applications" || collection === "contact_messages") ownerNotices.push({ collection: collection, record: record });
      });
    });
    const now = new Date().toISOString();
    writeSettings_({ spreadsheetUrl: spreadsheet.getUrl(), spreadsheetId: id, syncEnabled: true, lastSyncedAt: now, lastError: "" });
    if (ownerNotices.length) notifyOwnerOfSubmissions_(ownerNotices, added);
    else if (added) notifyOwnerOfOtherResponses_(added);
    logSync_(spreadsheet, "OK", added + " new response(s) imported.");
    return added;
  } catch (error) {
    writeSettings_({ spreadsheetUrl: spreadsheet.getUrl(), spreadsheetId: id, syncEnabled: true, lastError: String(error.message || error) });
    logSync_(spreadsheet, "ERROR", String(error.message || error));
    throw error;
  }
}

function ensureTab_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0b2a6f").setFontColor("#ffffff");
  return sheet;
}

function existingIds_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return new Set();
  return new Set(sheet.getRange(2, 1, last - 1, 1).getDisplayValues().flat().filter(Boolean));
}

function listFirestoreDocuments_(collection) {
  const token = ScriptApp.getOAuthToken();
  const all = [];
  let pageToken = "";
  do {
    let url = "https://firestore.googleapis.com/v1/projects/" + EMBEDX_PROJECT_ID + "/databases/(default)/documents/" + encodeURIComponent(collection) + "?pageSize=1000";
    if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);
    const response = UrlFetchApp.fetch(url, { method: "get", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code < 200 || code >= 300) throw new Error("Firestore " + collection + " read failed (HTTP " + code + "): " + response.getContentText().slice(0, 500));
    const body = JSON.parse(response.getContentText() || "{}");
    all.push.apply(all, body.documents || []);
    pageToken = body.nextPageToken || "";
  } while (pageToken);
  return all;
}

function decodeFields_(fields) {
  const out = {};
  Object.keys(fields).forEach((key) => { out[key] = decodeValue_(fields[key]); });
  return out;
}
function decodeValue_(value) {
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return "";
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue_);
  if (value.mapValue) return decodeFields_(value.mapValue.fields || {});
  return "";
}

function rowFor_(collection, id, d) {
  if (collection === "members_applications") return [id, d.createdAt || "", d.name || "", d.email || "", d.regNo || "", d.department || "", d.year || "", d.interest || "", d.message || "", d.formId || "join"];
  if (collection === "contact_messages") return [id, d.createdAt || "", d.name || "", d.email || "", d.subject || "", d.message || "", d.formId || "enquiry"];
  const answers = d.answers || {};
  return [id, d.submittedAt || "", d.formId || "", d.formTitle || "", answers.name || "", answers.email || "", JSON.stringify(answers)];
}

function notifyOwnerOfSubmissions_(notices, totalAdded) {
  const rows = notices.slice(0, 30).map((item) => {
    const d = item.record || {};
    const kind = item.collection === "members_applications" ? "Join application" : "Enquiry";
    const details = item.collection === "members_applications"
      ? ["Name: " + (d.name || ""), "Email: " + (d.email || ""), "Register No.: " + (d.regNo || ""), "Department: " + (d.department || ""), "Year: " + (d.year || ""), "Interests: " + (d.interest || ""), "Details: " + (d.message || "")]
      : ["Name: " + (d.name || ""), "Email: " + (d.email || ""), "Subject: " + (d.subject || ""), "Message: " + (d.message || "")];
    return { kind: kind, details: details };
  });
  const text = rows.map((row, index) => (index + 1) + ". " + row.kind + "\n" + row.details.join("\n")).join("\n\n");
  const html = rows.map((row) => "<h4 style=\"margin:20px 0 6px;color:#0b2a6f\">" + escapeMailHtml_(row.kind) + "</h4><p style=\"line-height:1.6;white-space:pre-line\">" + row.details.map(escapeMailHtml_).join("<br>") + "</p>").join("");
  try {
    MailApp.sendEmail({
      to: EMBEDX_OWNER_EMAIL,
      subject: "EMBEDX | New Join/Enquiry submission" + (notices.length > 1 ? "s (" + notices.length + ")" : ""),
      body: "New public form submission(s)\n\n" + text + (totalAdded > notices.length ? "\n\n" + (totalAdded - notices.length) + " additional response(s) were also synced." : "") + "\n\nReview them in Admin → Forms & responses.",
      htmlBody: mailCardHtml_("New Join & Enquiry submission", html + (totalAdded > notices.length ? "<p>" + (totalAdded - notices.length) + " additional response(s) were also synced.</p>" : "") + "<p>Review these in Admin → Forms &amp; responses.</p>")
    });
  } catch (error) { console.error("Owner notification failed: " + error.message); }
}

function notifyOwnerOfOtherResponses_(count) {
  try {
    MailApp.sendEmail({
      to: EMBEDX_OWNER_EMAIL,
      subject: "EMBEDX | New form response(s)",
      body: count + " new custom form response(s) were synced to the EMBEDX response spreadsheet. Open Admin → Forms & responses to review.",
      htmlBody: mailCardHtml_("New form responses", count + " new custom form response(s) were synced to the EMBEDX response spreadsheet. Open Forms &amp; responses in the admin portal to review.")
    });
  } catch (error) { console.error("Owner notification failed: " + error.message); }
}

function notifySubmitter_(collection, d) {
  const email = String(d.email || (d.answers && d.answers.email) || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return;
  const name = String(d.name || (d.answers && d.answers.name) || "there").trim().slice(0, 80);
  const label = collection === "members_applications" ? "membership application" : collection === "contact_messages" ? "enquiry" : "form response";
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email);
  const key = "confirm_" + Utilities.base64EncodeWebSafe(digest).slice(0, 36);
  const cache = CacheService.getScriptCache();
  if (cache.get(key)) return;
  try {
    MailApp.sendEmail({ to: email, subject: "EMBEDX | We received your " + label, body: "Dear " + name + ",\n\nThank you. Your response has been received by the EMBEDX team. We will review it and contact you if needed.\n\nEMBEDX — SRM TRP Engineering College", htmlBody: mailCardHtml_("Response received", "Dear " + escapeMailHtml_(name) + ",<br><br>Thank you. Your response has been received by the EMBEDX team. We will review it and contact you if needed.") });
    cache.put(key, "sent", 900);
  } catch (error) { console.error("Submitter confirmation failed: " + error.message); }
}

function mailCardHtml_(title, message) {
  return '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1f2937;background:#f3f6fb"><div style="background:#fff;border-radius:14px;padding:24px"><div style="text-align:center;background:#0b2a6f;padding:18px;border-radius:10px"><img src="' + EMBEDX_COLLEGE_LOGO + '" alt="SRM TRP Engineering College" style="width:150px;max-height:58px;object-fit:contain;background:#fff;padding:6px;border-radius:8px"><h2 style="color:#fff;margin:14px 0 0">EMBEDX</h2></div><h3 style="color:#0b2a6f">' + escapeMailHtml_(title) + '</h3><p style="line-height:1.7">' + message + '</p><p style="color:#64748b;font-size:12px">Embedded Systems &amp; Automation Club · SRM TRP Engineering College</p></div></div>';
}
function escapeMailHtml_(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function sheetSafe_(value) {
  const text = value == null ? "" : String(value);
  return /^[=+@\-]/.test(text) ? "'" + text : text;
}

function logSync_(spreadsheet, result, details) {
  const sheet = spreadsheet.getSheetByName("Sync Log") || ensureTab_(spreadsheet, "Sync Log", ["Last Sync", "Result", "Details"]);
  sheet.appendRow([new Date().toISOString(), result, details]);
}

function writeSettings_(settings) {
  const url = "https://firestore.googleapis.com/v1/projects/" + EMBEDX_PROJECT_ID + "/databases/(default)/documents/site_settings/forms";
  const fields = { spreadsheetUrl: { stringValue: settings.spreadsheetUrl || "" }, spreadsheetId: { stringValue: settings.spreadsheetId || "" }, syncEnabled: { booleanValue: !!settings.syncEnabled }, lastSyncedAt: { stringValue: settings.lastSyncedAt || "" }, lastError: { stringValue: settings.lastError || "" } };
  const response = UrlFetchApp.fetch(url, { method: "patch", contentType: "application/json", headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, payload: JSON.stringify({ fields: fields }), muteHttpExceptions: true });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("Could not publish Sheets status to Firestore (HTTP " + code + "): " + response.getContentText().slice(0, 400));
}

function assertOwner_() {
  const email = String(Session.getEffectiveUser().getEmail() || "").toLowerCase();
  if (email !== EMBEDX_OWNER_EMAIL) throw new Error("Run this script while signed in as the allowlisted EMBEDX owner account.");
}
