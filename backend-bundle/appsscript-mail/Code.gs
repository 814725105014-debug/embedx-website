/**
 * EMBEDX official-mail workspace bridge.
 *
 * Deploy this project as a web app that executes as the user accessing it. The
 * browser invokes these RPCs only inside the Apps Script HTML-service frame; the
 * caller must also present a verified Firebase Admin ID token with `mail`
 * permission. The sender's Google identity must match the Firebase identity.
 */
const MAIL_PROJECT_ID = "embedx-club-eee";
const MAIL_FIREBASE_API_KEY = "AIzaSyBwNaduceEdAcJX0uCRv2nLNVZca2OWSgA";
const MAIL_OWNER_EMAIL = "814725105014@trp.srmtrichy.edu.in";
const MAIL_FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${MAIL_PROJECT_ID}/databases/(default)/documents`;
const MAIL_ALLOWED_PARENT_ORIGINS = [
  "https://embedx-club-eee.web.app",
  "https://embedx-club-eee.firebaseapp.com"
];
const MAIL_MAX_RECIPIENTS = 50;
const MAIL_MAX_FILES = 8;
const MAIL_MAX_BYTES = 15 * 1024 * 1024;
const MAIL_DAILY_RECIPIENT_LIMIT = 100;
const MAIL_ATTACHMENT_TYPES = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/vnd.ms-excel"]
};

function doGet(e) {
  const parentOrigins = JSON.stringify(MAIL_ALLOWED_PARENT_ORIGINS);
  const authorizeMode = Boolean(e && e.parameter && e.parameter.authorize === "1");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EMBEDX mail authorization</title><style>body{font:16px Arial,sans-serif;background:#100b18;color:#f7f3fb;margin:0;padding:28px}main{max-width:620px;margin:8vh auto;padding:28px;border:1px solid #463858;border-radius:16px;background:#1b1423}h1{color:#c69afa;font-size:1.4rem}p{line-height:1.6;color:#d2c9db}small{color:#aaa0b4}</style></head><body><main><h1>EMBEDX official mail</h1><p id="status">Checking your Google account authorization…</p><small>Department of Electrical and Electronics Engineering · SRM TRP Engineering College</small></main><script>
const MAIL_PARENT_ORIGINS=${parentOrigins};
const MAIL_AUTHORIZE_MODE=${authorizeMode};
function sendToParent(data,origin){if(window.parent!==window&&MAIL_PARENT_ORIGINS.includes(origin)){window.parent.postMessage(data,origin)}}
function show(text){document.getElementById('status').textContent=text}
function handleCall(event){if(event.source!==window.parent||!MAIL_PARENT_ORIGINS.includes(event.origin))return;const m=event.data||{};if(m.source!=='embedx-admin-mail'||m.type!=='call'||typeof m.requestId!=='string'||m.requestId.length>100)return;const done=(result)=>sendToParent({source:'embedx-mail-bridge',type:'result',requestId:m.requestId,ok:true,result:result},event.origin);const fail=(error)=>sendToParent({source:'embedx-mail-bridge',type:'result',requestId:m.requestId,ok:false,error:String(error&&error.message||error||'Mail request failed.')},event.origin);let runner=google.script.run.withSuccessHandler(done).withFailureHandler(fail);if(m.action==='context')runner.mailBridgeContext(m.idToken);else if(m.action==='send')runner.mailBridgeSend(m.idToken,m.payload||{});else fail('Unknown mail action.')}
window.addEventListener('message',handleCall);
if(MAIL_AUTHORIZE_MODE){google.script.run.withSuccessHandler((result)=>show('Google authorization is ready for '+result.senderEmail+'. You may return to the EMBEDX Admin mail page.')).withFailureHandler((error)=>show('Authorization is not complete. Sign in with your college Google account, approve the requested Gmail access, then return to Admin. '+String(error&&error.message||''))).mailBridgeAuthorize()}else{MAIL_PARENT_ORIGINS.forEach(origin=>sendToParent({source:'embedx-mail-bridge',type:'ready'},origin));show('Secure bridge ready. Verify your sender from the Admin mail workspace.')}
</script></body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle("EMBEDX official mail authorization").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function mailBridgeAuthorize() {
  const googleEmail = mailGoogleEmail_();
  // Calling GmailApp is intentional: Google presents the per-user consent screen
  // on first use, and the message is sent from this same mailbox.
  GmailApp.getAliases();
  return { senderEmail: googleEmail };
}

function mailBridgeContext(idToken) {
  const identity = mailVerifyAdmin_(idToken);
  const googleEmail = mailGoogleEmail_();
  if (googleEmail !== identity.email) throw new Error("Authorize the Google mailbox that matches your signed-in EMBEDX Admin email.");
  return { senderEmail: googleEmail, senderName: identity.name || "", role: identity.role };
}

function mailBridgeSend(idToken, payload) {
  const identity = mailVerifyAdmin_(idToken);
  const sender = mailGoogleEmail_();
  if (sender !== identity.email) throw new Error("Google sender does not match your signed-in EMBEDX Admin account.");
  const mail = payload && typeof payload === "object" ? payload : {};
  const recipients = mailNormalizeRecipients_(mail.to, mail.cc, mail.bcc);
  if (!recipients.to.length) throw new Error("Add at least one valid To recipient.");
  const allRecipients = [...new Set([...recipients.to, ...recipients.cc, ...recipients.bcc])];
  if (allRecipients.length > MAIL_MAX_RECIPIENTS) throw new Error("A message can have at most 50 unique recipients.");
  const subject = String(mail.subject || "").trim();
  const body = String(mail.body || "").trim();
  if (subject.length < 3 || subject.length > 160 || /[\r\n]/.test(subject)) throw new Error("Subject must be 3 to 160 characters on one line.");
  if (body.length < 2 || body.length > 12000) throw new Error("Message must be 2 to 12,000 characters.");
  const attachments = mailNormalizeAttachments_(mail.attachments);
  const requestId = String(mail.requestId || "");
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) throw new Error("Invalid send request. Reload the page and try again.");
  const fingerprintData = {
    to: recipients.to, cc: recipients.cc, bcc: recipients.bcc, subject, body,
    attachments: attachments.map((blob) => ({
      name: blob.getName(), size: blob.getBytes().length, type: blob.getContentType(),
      hash: Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, blob.getBytes()))
    }))
  };
  const fingerprint = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(fingerprintData)));
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error("Another message is being sent. Wait a moment and retry.");
  try {
    const props = PropertiesService.getScriptProperties();
    const requestKey = "official_mail_" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sender + ":" + requestId)).slice(0, 40);
    const previous = props.getProperty(requestKey);
    if (previous) {
      const cached = JSON.parse(previous);
      if (cached.fingerprint !== fingerprint) throw new Error("This send request ID was already used for different message content. Reload the mail page before sending an edited message.");
      return Object.assign({}, cached.result, { duplicate: true });
    }
    const dayKey = "official_mail_day_" + Utilities.base64EncodeWebSafe(sender).slice(0, 30) + "_" + Utilities.formatDate(new Date(), "UTC", "yyyyMMdd");
    const sentToday = Number(props.getProperty(dayKey) || 0);
    if (sentToday + allRecipients.length > MAIL_DAILY_RECIPIENT_LIMIT) throw new Error("Daily EMBEDX mail workspace limit reached for this account.");
    if (MailApp.getRemainingDailyQuota() < allRecipients.length) throw new Error("Google daily email quota reached for this account.");

    const htmlBody = mailBrandedHtml_(identity.name || sender, body);
    const options = { htmlBody, name: "EMBEDX | SRM TRP Engineering College", attachments };
    if (recipients.cc.length) options.cc = recipients.cc.join(",");
    if (recipients.bcc.length) options.bcc = recipients.bcc.join(",");
    GmailApp.sendEmail(recipients.to.join(","), subject, body, options);
    const result = { senderEmail: sender, recipientCount: allRecipients.length, duplicate: false };
    props.setProperty(requestKey, JSON.stringify({ fingerprint, result }));
    props.setProperty(dayKey, String(sentToday + allRecipients.length));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function mailGoogleEmail_() {
  const email = String(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
  if (!email || !email.endsWith("@trp.srmtrichy.edu.in")) throw new Error("Sign in to Apps Script with your college Google account to send official mail.");
  return email;
}

function mailVerifyAdmin_(idToken) {
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 5000) throw new Error("Your Admin session expired. Sign in again.");
  const lookup = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(MAIL_FIREBASE_API_KEY), {
    method: "post", contentType: "application/json", payload: JSON.stringify({ idToken }), muteHttpExceptions: true
  });
  if (lookup.getResponseCode() !== 200) throw new Error("Your Admin session expired. Sign in again.");
  const user = (JSON.parse(lookup.getContentText()).users || [])[0];
  const email = String(user && user.email || "").trim().toLowerCase();
  if (!email || !email.endsWith("@trp.srmtrichy.edu.in") || user.emailVerified !== true) throw new Error("Verify your college email before using official mail.");
  let roleData = {};
  let customAdmin = false;
  try { customAdmin = JSON.parse(user.customAttributes || "{}").admin === true; } catch (ignored) {}
  if (email === MAIL_OWNER_EMAIL || customAdmin) {
    roleData = { role: "owner", name: "EMBEDX Owner", perms: ["mail"] };
  } else {
    const response = UrlFetchApp.fetch(MAIL_FIRESTORE_BASE + "/admin_roles/" + encodeURIComponent(email), {
      method: "get", headers: { Authorization: "Bearer " + idToken }, muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) throw new Error("This account has no active EMBEDX Admin role.");
    const fields = (JSON.parse(response.getContentText()).fields || {});
    roleData = {
      role: fields.role && fields.role.stringValue || "",
      name: fields.name && fields.name.stringValue || "",
      emailVerificationRequired: fields.emailVerificationRequired && fields.emailVerificationRequired.booleanValue === true,
      mustChangePassword: fields.mustChangePassword && fields.mustChangePassword.booleanValue === true,
      perms: fields.perms && fields.perms.arrayValue && fields.perms.arrayValue.values ? fields.perms.arrayValue.values.map((item) => item.stringValue) : null
    };
  }
  if (roleData.emailVerificationRequired || roleData.mustChangePassword) throw new Error("Complete your Admin email verification and password setup first.");
  const legacy = {
    president: ["announcements", "team", "achievements", "forms", "tasks", "mail"],
    event_coordinator: ["events", "mail"], social_media: ["gallery", "announcements", "mail"],
    technical: ["projects", "resources", "achievements", "mail"], hod: ["mail"]
  };
  const perms = Array.isArray(roleData.perms) ? roleData.perms : (legacy[roleData.role] || []);
  if (email !== MAIL_OWNER_EMAIL && !perms.includes("mail")) throw new Error("Your EMBEDX role does not have Official mail permission.");
  return { email, name: String(roleData.name || ""), role: roleData.role || "admin" };
}

function mailNormalizeRecipients_(to, cc, bcc) {
  const clean = (list) => {
    if (list == null) return [];
    if (!Array.isArray(list) || list.length > MAIL_MAX_RECIPIENTS) throw new Error("Recipient list is invalid or too long.");
    const output = [];
    list.forEach((value) => {
      const email = String(value || "").trim().toLowerCase();
      if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(email) || email.length > 254) throw new Error("A recipient email address is invalid.");
      if (!output.includes(email)) output.push(email);
    });
    return output;
  };
  const groups = [clean(to), clean(cc), clean(bcc)];
  const seen = new Set();
  groups.forEach((group) => group.forEach((email) => seen.add(email)));
  return { to: groups[0], cc: groups[1].filter((email) => !groups[0].includes(email)), bcc: groups[2].filter((email) => !groups[0].includes(email) && !groups[1].includes(email)) };
}

function mailNormalizeAttachments_(files) {
  if (files == null) return [];
  if (!Array.isArray(files) || files.length > MAIL_MAX_FILES) throw new Error("Attach no more than 8 files.");
  let total = 0;
  return files.map((file) => {
    if (!file || typeof file !== "object" || typeof file.data !== "string" || file.data.length > MAIL_MAX_BYTES * 1.5) throw new Error("An attachment is invalid or too large.");
    const name = String(file.name || "attachment").replace(/[\\/\r\n\x00-\x1f]/g, "_").trim().slice(0, 120) || "attachment";
    const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    const types = MAIL_ATTACHMENT_TYPES[extension];
    if (!types) throw new Error("Attachment type not permitted: " + extension + ". Use PDF, Office documents, images, TXT, or CSV.");
    let bytes;
    try { bytes = Utilities.base64Decode(file.data); } catch (error) { throw new Error("Attachment data is invalid."); }
    if (Number(file.size) !== bytes.length || bytes.length <= 0) throw new Error("Attachment size check failed.");
    total += bytes.length;
    if (total > MAIL_MAX_BYTES) throw new Error("Attachments must total 15 MB or less.");
    return Utilities.newBlob(bytes, types[0], name);
  });
}

function mailBrandedHtml_(senderName, body) {
  const safeSender = mailHtmlEscape_(senderName);
  const paragraphs = String(body).split(/\r?\n/).map((line) => line ? "<p style=\"margin:0 0 14px;line-height:1.65;\">" + mailHtmlEscape_(line) + "</p>" : "<div style=\"height:6px\"></div>").join("");
  return `<div style="margin:0;background:#f4f1f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#241b2c"><div style="max-width:660px;margin:0 auto;background:#fff;border:1px solid #e7e0ed;border-radius:12px;overflow:hidden"><div style="padding:22px 26px;background:#15101b;border-bottom:4px solid #d4af37"><div style="font-size:12px;letter-spacing:2px;color:#d6b8fb;font-weight:bold">EMBEDX</div><div style="margin-top:7px;font-size:18px;color:#fff;font-weight:bold">Department of Electrical and Electronics Engineering</div><div style="margin-top:4px;font-size:13px;color:#c8bfce">SRM TRP Engineering College</div></div><div style="padding:28px 26px">${paragraphs}<div style="height:1px;background:#eee8f2;margin:26px 0 16px"></div><p style="margin:0;color:#62596a;font-size:12px">Sent by ${safeSender} via the EMBEDX official communications workspace.</p></div><div style="padding:13px 26px;background:#faf8fc;color:#827b89;font-size:11px">EMBEDX · SRM TRP Engineering College · Official communication</div></div></div>`;
}

function mailHtmlEscape_(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
