#!/usr/bin/env node
/** Create and sync the checked-in Apps Script sources with Google clasp. */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "../appsscript");
const mailAppDir = path.resolve(here, "../appsscript-mail");
const linkFile = path.join(appDir, ".clasp.json");
const mailLinkFile = path.join(mailAppDir, ".clasp.json");
const credentialsFile = path.join(homedir(), ".clasprc.json");
const DEFAULT_SCRIPT_ID = "1oArp0lQZiDrvz7ZqNVWZbhjLds_kRpleJNRA6OpB0WAzj30bWX5pH-mc";
const DEFAULT_PROJECT_TITLE = "EMBEDX CLUB NEW WEBSITE";
const MAIL_PROJECT_TITLE = "EMBEDX Official Mail Workspace";
const action = process.argv[2] || "setup";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function clasp(args, cwd = appDir) {
  const result = spawnSync(npm, ["exec", "--yes", "--package=@google/clasp", "--", "clasp", ...args], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

async function linkOrCreate() {
  if (existsSync(linkFile)) {
    console.log(`Using the Apps Script project linked in appsscript/.clasp.json (${DEFAULT_PROJECT_TITLE})`);
    return;
  }
  if (DEFAULT_SCRIPT_ID) {
    await writeFile(linkFile, JSON.stringify({ scriptId: DEFAULT_SCRIPT_ID, rootDir: "." }, null, 2) + "\n");
    console.log(`Linked the source folder to the existing project: ${DEFAULT_PROJECT_TITLE}`);
    return;
  }
  console.log("Creating a standalone EMBEDX Apps Script project...");
  clasp(["create", "--type", "standalone", "--title", DEFAULT_PROJECT_TITLE]);
  if (!existsSync(linkFile)) throw new Error("clasp created the project but did not write appsscript/.clasp.json; check the clasp output.");
}

function linkOrCreateMail() {
  if (existsSync(mailLinkFile)) {
    console.log(`Using the isolated coordinator-mail Apps Script project linked in appsscript-mail/.clasp.json`);
    return;
  }
  console.log(`Creating a dedicated ${MAIL_PROJECT_TITLE} Apps Script project...`);
  clasp(["create", "--type", "standalone", "--title", MAIL_PROJECT_TITLE], mailAppDir);
  if (!existsSync(mailLinkFile)) throw new Error("clasp created the mail project but did not write appsscript-mail/.clasp.json; check the clasp output.");
}

try {
  const supported = ["setup", "login", "create", "push", "deploy-mail", "mail-push"];
  if (!supported.includes(action)) throw new Error(`Usage: node apps-script.mjs [${supported.join("|")}]`);
  if (action === "login") {
    clasp(["login"]);
    process.exit(0);
  }

  if (["deploy-mail", "mail-push"].includes(action)) {
    if (!existsSync(credentialsFile)) clasp(["login"], mailAppDir);
    linkOrCreateMail();
    console.log("Uploading the isolated official-mail sources and least-privilege manifest...");
    clasp(["push", "--force"], mailAppDir);
    if (action === "deploy-mail") {
      console.log("Creating the official-mail web-app deployment from the manifest. Copy the /exec URL from clasp output.");
      clasp(["version", "EMBEDX official mail workspace"], mailAppDir);
      clasp(["deploy", "--description", "EMBEDX official mail workspace"], mailAppDir);
      console.log("Confirm the deployment is User accessing the web app and restricted to the college Google Workspace domain.");
    } else {
      console.log("Mail source is pushed. In Apps Script → Deploy → Manage deployments, edit the existing mail deployment to use a new version; keep its execution/access settings and URL.");
    }
    process.exit(0);
  }

  if (action === "setup" && !existsSync(credentialsFile)) clasp(["login"]);
  if (action === "create" && existsSync(linkFile)) throw new Error("This Apps Script folder is already linked. Use `npm run apps-script:push` to update it.");
  if (action === "setup" || action === "create") await linkOrCreate();
  if (action === "push" && !existsSync(linkFile)) throw new Error("No project is linked yet. Run `npm run apps-script:setup` first.");
  console.log("Uploading the owner forms/task Apps Script sources and appsscript.json...");
  clasp(["push", "--force"]);
  console.log("Owner Apps Script source is up to date. Run setupEmbedxSheets() once in the Apps Script editor to authorize scopes and create the response spreadsheet.");
} catch (error) {
  console.error(`Apps Script setup failed: ${error.message}`);
  process.exit(1);
}
