#!/usr/bin/env node
/** Create and sync the checked-in Apps Script sources with Google clasp. */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "../appsscript");
const linkFile = path.join(appDir, ".clasp.json");
const DEFAULT_SCRIPT_ID = "1oArp0lQZiDrvz7ZqNVWZbhjLds_kRpleJNRA6OpB0WAzj30bWX5pH-mc";
const DEFAULT_PROJECT_TITLE = "EMBEDX CLUB NEW WEBSITE";
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

try {
  const supported = ["setup", "login", "create", "push"];
  if (!supported.includes(action)) throw new Error(`Usage: node apps-script.mjs [${supported.join("|")}]`);
  if (action === "login") {
    clasp(["login"]);
    process.exit(0);
  }

  if (action === "setup" && !existsSync(linkFile)) clasp(["login"]);
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
