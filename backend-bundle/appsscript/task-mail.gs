/**
 * EMBEDX task-assignment mailer (Google Apps Script web app).
 *
 * Security model:
 *  - No secret is placed in the public website.
 *  - Caller must present a current Firebase ID token. Identity Toolkit validates it.
 *  - The caller must be an EMBEDX admin with the Tasks permission (Firestore-equivalent check).
 *  - Recipient addresses are restricted to the college domain.
 *  - Repeated delivery requests for a task are idempotent.
 *
 * Setup: paste into Apps Script, deploy as Web app (execute as Me; access Anyone).
 * Then update taskMail.url in public/js/config.js with the /exec URL and deploy Hosting.
 * The public client sends only {idToken, taskId}; never place a mail token/password here.
 */
const PROJECT_ID = "embedx-club-eee";
const FIREBASE_API_KEY = "AIzaSyBwNaduceEdAcJX0uCRv2nLNVZca2OWSgA";
const ALLOWED_DOMAIN = "@trp.srmtrichy.edu.in";
const MAX_RECIPIENTS = 25;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyIdentity_(idToken) {
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 5000) {
    throw new Error("Sign-in expired. Please sign in again.");
  }
  const response = UrlFetchApp.fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    { method: "post", contentType: "application/json", payload: JSON.stringify({ idToken }), muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) throw new Error("Sign-in expired. Please sign in again.");
  const users = JSON.parse(response.getContentText()).users || [];
  const user = users[0];
  const email = String(user && user.email || "").trim().toLowerCase();
  if (!email.endsWith(ALLOWED_DOMAIN) || user.emailVerified !== true) throw new Error("Verify your college email before requesting task mail.");
  return { email, user };
}

function firestore_(path, idToken, options) {
  const response = UrlFetchApp.fetch(`${FIRESTORE_BASE}/${path}`, Object.assign({
    method: "get", headers: { Authorization: `Bearer ${idToken}` }, muteHttpExceptions: true
  }, options || {}));
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error("Task or admin access could not be verified.");
  return response.getContentText() ? JSON.parse(response.getContentText()) : {};
}

function stringField_(doc, name) {
  return doc && doc.fields && doc.fields[name] && doc.fields[name].stringValue || "";
}
function html_(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function canManageTasks_(email, identity, idToken) {
  if (email === "814725105014@trp.srmtrichy.edu.in") return true;
  try {
    const claims = JSON.parse(identity.users[0].customAttributes || "{}");
    if (claims.admin === true) return true;
  } catch (ignored) {}
  const roleDoc = firestore_(`admin_roles/${encodeURIComponent(email)}`, idToken);
  const fields = roleDoc.fields || {};
  const role = fields.role && fields.role.stringValue || "";
  const explicit = fields.perms && fields.perms.arrayValue && fields.perms.arrayValue.values;
  if (Array.isArray(explicit)) return explicit.some(value => value.stringValue === "tasks");
  const presets = {
    president: ["tasks"], event_coordinator: [], social_media: [], technical: [], hod: []
  };
  return Boolean((presets[role] || []).includes("tasks"));
}

function getRecipients_(task, idToken) {
  const direct = stringField_(task, "assigneeEmail").trim().toLowerCase();
  const assignedRole = stringField_(task, "assigneeRole").trim();
  if (direct && assignedRole) throw new Error("Choose one assignee: a person or a role.");
  if (direct) {
    if (!direct.endsWith(ALLOWED_DOMAIN) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direct)) {
      throw new Error("Task email can only be sent to a valid college address.");
    }
    return [direct];
  }
  if (!assignedRole) return [];

  const result = firestore_("admin_roles?pageSize=1000", idToken);
  return [...new Set((result.documents || []).filter(doc => stringField_(doc, "role") === assignedRole)
    .map(doc => decodeURIComponent(doc.name.split("/").pop()).toLowerCase())
    .filter(email => email.endsWith(ALLOWED_DOMAIN)))];
}

function recordSent_(taskId, idToken, recipients) {
  const path = `tasks/${encodeURIComponent(taskId)}?updateMask.fieldPaths=notified&updateMask.fieldPaths=notifiedAt&updateMask.fieldPaths=notifiedToCount`;
  const body = { fields: {
    notified: { booleanValue: true },
    notifiedAt: { timestampValue: new Date().toISOString() },
    notifiedToCount: { integerValue: String(recipients) }
  }};
  firestore_(path, idToken, { method: "patch", contentType: "application/json", payload: JSON.stringify(body) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e && e.postData && e.postData.contents || "{}");
    const taskId = String(data.taskId || "");
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(taskId)) throw new Error("Invalid task reference.");
    const identity = verifyIdentity_(data.idToken);
    const email = identity.email;
    if (!canManageTasks_(email, identity, data.idToken)) throw new Error("Your account does not have Tasks permission.");
    if (!lock.tryLock(5000)) throw new Error("Please retry in a moment.");

    const task = firestore_(`tasks/${encodeURIComponent(taskId)}`, data.idToken);
    const recipients = getRecipients_(task, data.idToken);
    if (!recipients.length) return json_({ ok: true, sent: 0, message: "No assignee email." });
    if (recipients.length > MAX_RECIPIENTS) throw new Error("Too many role recipients; assign the task to a person instead.");
    const props = PropertiesService.getScriptProperties();
    const fingerprint = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, recipients.slice().sort().join(","))).slice(0, 22);
    const sentKey = `task_mail_sent_${taskId}_${fingerprint}`;
    if (props.getProperty(sentKey)) return json_({ ok: true, duplicate: true });
    const dayKey = `task_mail_day_${email}_${Utilities.formatDate(new Date(), "UTC", "yyyyMMdd")}`;
    const sentToday = Number(props.getProperty(dayKey) || 0);
    if (sentToday + recipients.length > 40) throw new Error("Daily task-email limit reached for this account.");
    if (MailApp.getRemainingDailyQuota() < recipients.length) throw new Error("Daily mail quota reached.");

    const title = (stringField_(task, "title").replace(/[\r\n]+/g, " ").trim().slice(0, 180)) || "New task";
    const detail = stringField_(task, "detail").slice(0, 2000);
    const due = stringField_(task, "due").slice(0, 80);
    const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#211b2a">
      <h2 style="color:#6d28d9">A task has been assigned to you</h2>
      <p><strong>${html_(title)}</strong></p>${detail ? `<p>${html_(detail).replace(/\n/g, "<br>")}</p>` : ""}
      ${due ? `<p>Due: <strong>${html_(due)}</strong></p>` : ""}
      <p><a href="https://embedx-club-eee.web.app/admin/tasks">Open EMBEDX Tasks</a></p>
      <p style="color:#777;font-size:12px">EMBEDX · Department of EEE · SRM TRP Engineering College</p></div>`;
    const to = recipients[0];
    const bcc = recipients.slice(1).join(",");
    MailApp.sendEmail({ to, bcc, subject: `[EMBEDX Task] ${title}`, body: `${title}${due ? ` — due ${due}` : ""}\nOpen https://embedx-club-eee.web.app/admin/tasks`, htmlBody });
    props.setProperty(sentKey, new Date().toISOString());
    props.setProperty(dayKey, String(sentToday + recipients.length));
    try { recordSent_(taskId, data.idToken, recipients.length); } catch (ignored) { /* mail is already sent; dedupe remains recorded */ }
    return json_({ ok: true, sent: recipients.length });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || "Unable to send task mail.") });
  } finally {
    try { if (lock.hasLock()) lock.releaseLock(); } catch (ignored) {}
  }
}
