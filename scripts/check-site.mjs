#!/usr/bin/env node
/** No-dependency static QA for the published site. Run: node scripts/check-site.mjs */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (ent) => {
  const full = path.join(dir, ent.name);
  return ent.isDirectory() ? walk(full) : [full];
}))).flat();
const files = await walk(pub);
const exists = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };
const cleanRef = (value) => decodeURIComponent(value.split(/[?#]/, 1)[0]);

// HTML basics, local links/assets, duplicate IDs, image labels, and safe new tabs.
const htmlFiles = files.filter((f) => f.endsWith(".html"));
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const rel = path.relative(root, file);
  if (!/<html\b[^>]*\blang\s*=/i.test(html)) fail(`${rel}: missing html lang`);
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) fail(`${rel}: missing viewport meta`);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${rel}: missing document title`);
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) fail(`${rel}: duplicate id "${id}"`);
  for (const tag of html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const name = tag[1].toLowerCase(), attrs = tag[2];
    const get = (key) => attrs.match(new RegExp(`(?:^|\\s)${key}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2] || "";
    if (name === "img" && !/\balt\s*=/.test(attrs)) fail(`${rel}: img missing alt attribute`);
    if (get("target") === "_blank" && !/\brel=["'][^"']*\bnoopener\b/i.test(attrs)) fail(`${rel}: target=_blank link missing rel=noopener`);
    for (const key of ["href", "src", "poster"]) {
      const value = get(key).trim();
      if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) continue;
      const pathname = cleanRef(value);
      if (!pathname) continue;
      const base = pathname.startsWith("/") ? pub : path.dirname(file);
      const target = path.resolve(base, pathname.replace(/^\//, ""));
      const candidates = [target];
      if (!path.extname(target)) candidates.push(`${target}.html`, path.join(target, "index.html"));
      let found = false;
      for (const candidate of candidates) if (await exists(candidate)) { found = true; break; }
      if (!found) fail(`${rel}: missing local ${key} "${value}"`);
    }
  }
}

// Validate static ES-module imports, including versioned local imports.
const jsFiles = files.filter((f) => f.endsWith(".js"));
for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  const imports = /(?:\bimport|\bexport)\s+(?:[^"']*?\s+from\s*)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(imports)) {
    const spec = match[1] || match[2];
    if (!spec.startsWith(".")) continue;
    const target = path.resolve(path.dirname(file), cleanRef(spec));
    if (!(await exists(target))) fail(`${path.relative(root, file)}: missing module ${spec}`);
  }
  const tmp = path.join("/tmp", `embedx-check-${process.pid}.mjs`);
  const { writeFile, unlink } = await import("node:fs/promises");
  await writeFile(tmp, source);
  const result = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
  await unlink(tmp).catch(() => {});
  if (result.status !== 0) fail(`${path.relative(root, file)}: JavaScript syntax error: ${result.stderr.trim()}`);
}

// Syntax-check trusted backend scripts and Apps Script sources as well as browser modules.
const { writeFile: writeTemp, unlink: unlinkTemp } = await import("node:fs/promises");
let checkedScript = 0;
for (const dir of [path.join(root, "scripts"), path.join(root, "backend-bundle", "scripts"), path.join(root, "backend-bundle", "appsscript")]) {
  for (const file of await readdir(dir)) {
    if (!/\.(?:js|mjs|gs)$/.test(file)) continue;
    const source = await readFile(path.join(dir, file), "utf8");
    const tmp = path.join("/tmp", `embedx-trusted-${process.pid}-${checkedScript++}.mjs`);
    await writeTemp(tmp, source);
    const result = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
    await unlinkTemp(tmp).catch(() => {});
    if (result.status !== 0) fail(`${path.relative(root, path.join(dir, file))}: syntax error: ${result.stderr.trim()}`);
  }
}

// Configuration, rules mirrors and sitemap integrity.
for (const name of ["firebase.json", "firestore.indexes.json", "public/manifest.webmanifest", "scripts/package.json", "backend-bundle/scripts/package.json", "backend-bundle/appsscript/appsscript.json"]) {
  try { JSON.parse(await readFile(path.join(root, name), "utf8")); }
  catch (err) { fail(`${name}: invalid JSON (${err.message})`); }
}
for (const name of ["firestore.rules", "storage.rules", "firestore.indexes.json"]) {
  const a = await readFile(path.join(root, name), "utf8");
  const b = await readFile(path.join(root, "backend-bundle", name), "utf8");
  if (a !== b) fail(`${name}: differs from backend-bundle mirror`);
}
try {
  const indexConfig = JSON.parse(await readFile(path.join(root, "firestore.indexes.json"), "utf8"));
  for (const [index, entry] of (indexConfig.indexes || []).entries()) {
    if (!entry.collectionGroup || entry.queryScope !== "COLLECTION" || !Array.isArray(entry.fields) || entry.fields.length < 2) fail(`firestore.indexes.json: index ${index} needs collectionGroup, COLLECTION scope, and at least two fields`);
    for (const field of entry.fields || []) {
      if (!field.fieldPath || (!field.order && !field.arrayConfig)) fail(`firestore.indexes.json: index ${index} has a field missing fieldPath/order/arrayConfig`);
    }
  }
} catch (err) { fail(`firestore.indexes.json: invalid index schema (${err.message})`); }
const config = await readFile(path.join(pub, "js/config.js"), "utf8");
if (/taskMail\s*=\s*\{[^}]*\btoken\s*:/s.test(config)) fail("public/js/config.js: public task-mail token must not be shipped");
if (!config.includes("export const taskMail =")) fail("public/js/config.js: task notification compatibility endpoint is missing");
if (config.includes("EMBEDX_MAIL_WEB_APP_URL") || config.includes("mailWorkspace")) fail("public/js/config.js: manual official-mail endpoint must be removed");
const adminAppSource = await readFile(path.join(pub, "js/admin-app.js"), "utf8");
if (adminAppSource.includes("renderMailWorkspace") || adminAppSource.includes("/admin/mail")) fail("public/js/admin-app.js: manual official-mail UI is still present");
if (!adminAppSource.includes("async function notifyTaskAssignee") || !adminAppSource.includes("notifyTaskAssignee(editingId)")) fail("public/js/admin-app.js: task notification compatibility was removed");
if (/id=["'](?:restoreStarterContent|restoreGallery|seedForms)["']/.test(adminAppSource)) fail("public/js/admin-app.js: starter data must sync automatically, without manual seed controls");
if (!adminAppSource.includes('dbMod.collection(db, "content_tombstones")') || !adminAppSource.includes("addContentTombstone(batch")) fail("public/js/admin-app.js: automatic restore/delete tombstone protection is missing");
for (const seedFile of ["scripts/seed.js", "backend-bundle/scripts/seed.js"]) {
  const source = await readFile(path.join(root, seedFile), "utf8");
  if (!source.includes('collection("content_tombstones")') || !source.includes("deletedKeys.has")) fail(`${seedFile}: trusted seeder must preserve intentionally deleted starter records`);
}
if (/CHANGE_ME|REPLACE_WITH|TODO:\s*after first deploy/i.test(config)) fail("public/js/config.js: contains unfinished deployment placeholder");
const sitemap = await readFile(path.join(pub, "sitemap.xml"), "utf8");
if (/TODO|REPLACE_WITH/i.test(sitemap)) fail("public/sitemap.xml: unfinished placeholder remains");
for (const match of sitemap.matchAll(/<loc>(https:\/\/embedx-club-eee\.web\.app[^<]*)<\/loc>/g)) {
  const url = new URL(match[1]);
  const target = path.join(pub, url.pathname.replace(/^\//, ""));
  const candidates = [target];
  if (!path.extname(target)) candidates.push(`${target}.html`, path.join(target, "index.html"));
  let found = false;
  for (const candidate of candidates) if (await exists(candidate)) { found = true; break; }
  if (!found) fail(`sitemap.xml: missing page ${url.pathname}`);
}

// Ensure the complete public starter dataset stays in sync with both seeders.
const seedCollections = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements", "forms"];
for (const seedFile of ["scripts/seed.js", "backend-bundle/scripts/seed.js"]) {
  const source = await readFile(path.join(root, seedFile), "utf8");
  const declared = source.match(/const COLLECTIONS = \[([^\]]*)\]/)?.[1] || "";
  const actual = [...declared.matchAll(/["']([a-z_]+)["']/g)].map((m) => m[1]);
  if (actual.join(",") !== seedCollections.join(",")) fail(`${seedFile}: must seed exactly ${seedCollections.join(", ")}`);
}
for (const name of seedCollections) {
  const dataFile = path.join(pub, "js", "data", `${name}.js`);
  const mirrorFile = path.join(root, "backend-bundle", "data", `${name}.js`);
  if (!(await exists(dataFile)) || !(await exists(mirrorFile))) { fail(`Seed data missing for ${name}`); continue; }
  const dataSource = await readFile(dataFile, "utf8");
  if (dataSource !== await readFile(mirrorFile, "utf8")) fail(`Seed data mirror differs for ${name}`);
  try {
    const mod = await import(pathToFileURL(dataFile).href);
    const rows = mod[name];
    if (!Array.isArray(rows)) { fail(`${name}.js: named export ${name} must be an array`); continue; }
    const ids = rows.map((row) => row && row.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) fail(`${name}.js: duplicate stable document IDs`);
    const checkImage = (value, label) => {
      if (typeof value !== "string" || !value || /^https:\/\//i.test(value)) return;
      const pathname = cleanRef(value);
      const target = path.resolve(pub, pathname.replace(/^\/+/, ""));
      if (!target.startsWith(pub + path.sep) || !(existsSync(target))) fail(`${name}.js: missing/unsafe image path "${value}" (${label})`);
    };
    const inspect = (value, label = name, key = "") => {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (key === "gallery" && typeof item === "string") checkImage(item, label);
          else inspect(item, label, key);
        }
      } else if (value && typeof value === "object") {
        for (const [childKey, child] of Object.entries(value)) inspect(child, `${label}.${childKey}`, childKey);
      } else if (/(?:image|photo|poster|logo)(?:url)?/i.test(key)) checkImage(value, label);
    };
    inspect(rows);
  } catch (err) { fail(`${name}.js: could not load seed data (${err.message})`); }
}

if (failures.length) {
  console.error(`QA FAILED (${failures.length} issue${failures.length === 1 ? "" : "s"})`);
  failures.forEach((m) => console.error(` - ${m}`));
  process.exit(1);
}
console.log(`QA PASSED: ${htmlFiles.length} HTML pages, ${jsFiles.length} JS modules, local assets/imports, JSON, rules mirrors, and sitemap checked.`);
if (warnings.length) warnings.forEach((m) => console.warn(`WARN: ${m}`));
