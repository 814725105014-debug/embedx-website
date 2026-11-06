#!/usr/bin/env node
/** Dependency-free unit checks for the Apps Script mail authorization/send path. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../appsscript-mail/Code.gs", import.meta.url), "utf8");
const mailManifest = JSON.parse(await readFile(new URL("../appsscript-mail/appsscript.json", import.meta.url), "utf8"));
assert.equal(mailManifest.webapp.executeAs, "USER_ACCESSING");
assert.equal(mailManifest.webapp.access, "DOMAIN");
assert(mailManifest.oauthScopes.includes("https://www.googleapis.com/auth/gmail.send"));
assert(!mailManifest.oauthScopes.some((scope) => /spreadsheets|datastore|script\.scriptapp/.test(scope)), "coordinators should not be asked for unrelated owner-project scopes");
const senderEmail = "hod@trp.srmtrichy.edu.in";
const idToken = `firebase-${"x".repeat(140)}`;
const props = new Map();
const sent = [];
let rolePerms = ["mail"];
let googleEmail = senderEmail;
const response = (body, status = 200) => ({ getResponseCode: () => status, getContentText: () => JSON.stringify(body) });
const sandbox = {
  console,
  Date,
  JSON,
  Math,
  String,
  Number,
  Object,
  Array,
  Set,
  Error,
  RegExp,
  encodeURIComponent,
  Utilities: {
    DigestAlgorithm: { SHA_256: "sha256" },
    computeDigest: (_algorithm, data) => new Uint8Array(createHash("sha256").update(data).digest()),
    base64EncodeWebSafe: (data) => Buffer.from(data).toString("base64url"),
    base64Decode: (text) => new Uint8Array(Buffer.from(text, "base64")),
    formatDate: (date, _timeZone, format) => format === "yyyyMMdd" ? date.toISOString().slice(0, 10).replace(/-/g, "") : date.toISOString(),
    newBlob: (bytes, type, name) => ({ getBytes: () => bytes, getContentType: () => type, getName: () => name })
  },
  UrlFetchApp: {
    fetch: (url) => {
      if (url.includes("accounts:lookup")) return response({ users: [{ email: senderEmail, emailVerified: true, customAttributes: "{}" }] });
      if (url.includes("/admin_roles/")) return response({ fields: {
        role: { stringValue: "hod" }, name: { stringValue: "HOD Example" },
        perms: { arrayValue: { values: rolePerms.map((stringValue) => ({ stringValue })) } }
      }});
      throw new Error(`Unexpected URL in test: ${url}`);
    }
  },
  Session: {
    getActiveUser: () => ({ getEmail: () => googleEmail }),
    getEffectiveUser: () => ({ getEmail: () => googleEmail })
  },
  GmailApp: { getAliases: () => [], sendEmail: (...args) => sent.push(args) },
  MailApp: { getRemainingDailyQuota: () => 500 },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => props.get(key) || null, setProperty: (key, value) => props.set(key, value) }) },
  HtmlService: { createHtmlOutput: () => ({ setTitle() { return this; }, setXFrameOptionsMode() { return this; } }), XFrameOptionsMode: { ALLOWALL: "ALLOWALL" } }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "mail-workspace.gs" });

const pdfBase64 = Buffer.from("test report").toString("base64");
const message = {
  requestId: "mail-request-0001",
  to: ["faculty@example.com", "hod@trp.srmtrichy.edu.in"],
  cc: ["faculty@example.com", "coordinator@example.org"],
  bcc: ["private@example.net"],
  subject: "Official workshop report",
  body: "Dear colleagues,\nPlease find the report attached.",
  attachments: [{ name: "report.pdf", size: Buffer.from("test report").length, data: pdfBase64 }]
};

const context = sandbox.mailBridgeContext(idToken);
assert.equal(context.senderEmail, senderEmail);
assert.equal(context.role, "hod");
const first = sandbox.mailBridgeSend(idToken, message);
assert.equal(first.senderEmail, senderEmail);
assert.equal(first.recipientCount, 4);
assert.equal(first.duplicate, false);
assert.equal(sent.length, 1);
assert.match(sent[0][3].htmlBody, /EMBEDX/);
assert.match(sent[0][3].htmlBody, /&lt;|report|Dear colleagues/);
assert.equal(sent[0][3].cc, "coordinator@example.org");
assert.equal(sent[0][3].bcc, "private@example.net");
assert.equal(sent[0][3].attachments.length, 1);

const retry = sandbox.mailBridgeSend(idToken, message);
assert.equal(retry.duplicate, true);
assert.equal(sent.length, 1, "same send request must not deliver twice");
assert.throws(() => sandbox.mailBridgeSend(idToken, { ...message, subject: "Changed message subject" }), /different message content/);
assert.equal(sent.length, 1);

rolePerms = [];
assert.throws(() => sandbox.mailBridgeSend(idToken, { ...message, requestId: "mail-request-0002" }), /does not have Official mail permission/);
rolePerms = ["mail"];
googleEmail = "different@trp.srmtrichy.edu.in";
assert.throws(() => sandbox.mailBridgeSend(idToken, { ...message, requestId: "mail-request-0003" }), /does not match/);
googleEmail = senderEmail;
assert.throws(() => sandbox.mailBridgeSend(idToken, { ...message, requestId: "mail-request-0004", attachments: [{ name: "unsafe.exe", size: 1, data: "YQ==" }] }), /not permitted/);
assert.equal(sent.length, 1);
console.log("Mail workspace tests passed: verified sender/role, branded send, CC/BCC, attachment checks, duplicate protection, and denial paths.");
