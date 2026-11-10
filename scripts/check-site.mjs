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
const accessGateSource = await readFile(path.join(pub, "js/access-gate.js"), "utf8");
if (!accessGateSource.includes("signInWithPopup") || !accessGateSource.includes("GoogleAuthProvider") || !accessGateSource.includes('hd: "trp.srmtrichy.edu.in"') || !accessGateSource.includes("signInWithEmailAndPassword") || !accessGateSource.includes('id="collegeAccessEmail"') || !accessGateSource.includes('id="collegeAccessPassword"') || accessGateSource.includes("createUserWithEmailAndPassword") || !accessGateSource.includes("trp\\.srmtrichy\\.edu\\.in")) fail("public/js/access-gate.js: require college-domain Google/password sign-in and no public account creation");
const hostingConfig = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
for (const source of ["**/*.html", "/", "/manifest.webmanifest"]) {
  const rule = hostingConfig.hosting.headers.find((entry) => entry.source === source);
  if (!rule?.headers.some((header) => header.key === "Cache-Control" && header.value.includes("no-store"))) fail(`firebase.json: ${source} must not retain cached HTML/manifest responses`);
}
const forceRefreshToken = "refresh-mobile-20261105";
for (const name of ["index.html", "pages/resources.html", "pages/certificates.html"]) {
  const source = await readFile(path.join(pub, name), "utf8");
  if (!source.includes(forceRefreshToken)) fail(`public/${name}: references need the current force-refresh token`);
}
const mainAppSource = await readFile(path.join(pub, "js/main.js"), "utf8");
const introStart = mainAppSource.indexOf("initializeBrandIntro();");
const resourcesGate = mainAppSource.indexOf('if (document.body.dataset.page === "resources") await requireCollegeAccess();');
if (resourcesGate < 0 || introStart < 0 || introStart > resourcesGate) fail("public/js/main.js: show the intro first and gate only the Resources page");
const resourcesHtml = await readFile(path.join(pub, "pages/resources.html"), "utf8");
if (!resourcesHtml.includes('href="/pages/certificates.html"')) fail("public/pages/resources.html: needs a visible certificates link");
const circleLogoPath = "/assets/images/embedx-circle-logo.webp";
for (const name of ["js/layout.js", "js/access-gate.js", "js/admin-app.js", "index.html", "pages/resources.html"]) {
  const source = await readFile(path.join(pub, name), "utf8");
  if (!source.includes(circleLogoPath)) fail(`public/${name}: needs the user-provided circular club logo`);
  if (source.includes("/assets/images/embedx-emblem.webp")) fail(`public/${name}: old circle emblem reference remains`);
}
if (!(await exists(path.join(pub, "assets/images/embedx-circle-logo-512.png")))) fail("PWA icon is missing the provided circular logo asset");
const layoutCertSource = await readFile(path.join(pub, "js/layout.js"), "utf8");
if (!layoutCertSource.includes('href: "/pages/certificates.html"') || !layoutCertSource.includes("[...links.footerCommunity, certificatesLink]")) fail("The public footer must retain a Certificates page link even when CMS navigation is customized.");
if (!layoutCertSource.includes('const isResourcesPage = document.body.dataset.page === "resources";') || !layoutCertSource.includes('mobile-resource-signout') || !layoutCertSource.includes('resource-signout-desktop')) fail("The public sign-out controls must appear only on the Resources page, including the mobile menu.");
if (!layoutCertSource.includes('new CustomEvent("embedx:college-signout"') || !layoutCertSource.includes("result?.ok") || !layoutCertSource.includes('toast(`Could not sign out:')) fail("Resources sign-out must await auth completion and report failures instead of silently hanging.");
if (!accessGateSource.includes('window.addEventListener("embedx:college-signout"') || !accessGateSource.includes('await authMod.signOut(auth);') || !accessGateSource.includes('event.detail?.complete?.({ ok: true })')) fail("Resources sign-out must await Firebase sign-out and confirm completion.");
const homeHtml = await readFile(path.join(pub, "index.html"), "utf8");
if (![resourcesHtml, homeHtml].every((source) => source.includes("brandIntro") && source.includes("embedx-circle-logo.webp"))) fail("Home and Resources pages need the provided circular logo in the intro");
const corporateCss = await readFile(path.join(pub, "css/corporate.css"), "utf8");
const siteCss = await readFile(path.join(pub, "css/style.css"), "utf8");
if (!corporateCss.includes("@media (prefers-reduced-motion:reduce)") || !corporateCss.includes(".brand-intro.is-static")) fail("public/css/corporate.css: branded intro needs a no-motion version for reduced-motion preferences");
if (!siteCss.includes("body.site-access-pending > #brandIntro")) fail("public/css/style.css: show the Resources intro above its sign-in gate");
for (const file of htmlFiles.filter((entry) => !entry.includes(`${path.sep}admin${path.sep}`))) {
  const source = await readFile(file, "utf8");
  const rel = path.relative(root, file);
  const isResources = rel === path.join("public", "pages", "resources.html");
  const isPrivateNoindex = isResources || rel === path.join("public", "pages", "form.html") || rel === path.join("public", "404.html");
  const pending = /<body\b[^>]*class=["'][^"']*\bsite-access-pending\b/i.test(source);
  if (isResources && (!pending || !/<body\b[^>]*data-page=["']resources["']/i.test(source))) fail(`${rel}: the Learning Hub must be the only public page behind the college access gate`);
  if (!isResources && pending) fail(`${rel}: only the Learning Hub may start behind the college access gate`);
  if (isPrivateNoindex && !/<meta\b[^>]*name=["']robots["'][^>]*content=["']noindex, nofollow["']/i.test(source)) fail(`${rel}: this page must remain noindex`);
  if (!isPrivateNoindex && !/<meta\b[^>]*name=["']robots["'][^>]*content=["']index, follow["']/i.test(source)) fail(`${rel}: public pages should be indexable`);
  if (!/frame-src[^;]*https:\/\/embedx-club-eee\.firebaseapp\.com/.test(source) || !/frame-src[^;]*https:\/\/accounts\.google\.com/.test(source)) fail(`${rel}: Content Security Policy must allow Firebase Auth and Google sign-in frames`);
  if (!/script-src[^;]*https:\/\/apis\.google\.com/.test(source)) fail(`${rel}: Content Security Policy must allow the Google Auth helper script`);
  if (rel === path.join("public", "404.html") ? source.includes("access-only.js") : !source.includes("main.js")) fail(`${rel}: page boot script does not match the public access policy`);
}
const firestoreSource = await readFile(path.join(root, "firestore.rules"), "utf8");
if (!firestoreSource.includes("function isVerifiedCollegeUser()")) fail("firestore.rules: verified college checks are missing");
for (const collection of ["events", "projects", "team", "gallery", "announcements", "achievements"]) {
  if (!new RegExp(`match \/${collection}\\/\\{id\\}\\s*\\{\\s*allow read: if true;`).test(firestoreSource)) fail(`firestore.rules: ${collection} should be visitor-readable`);
}
if (!/match \/resources\/\{id\}\s*\{\s*allow read: if isVerifiedCollegeUser\(\);/.test(firestoreSource)) fail("firestore.rules: Learning Hub data must remain college-only");
if (!/match \/page_content\/\{pageId\}\s*\{\s*allow read: if pageId != 'resources' \|\| isVerifiedCollegeUser\(\);/.test(firestoreSource)) fail("firestore.rules: Learning Hub page content must remain college-only");
if (!firestoreSource.includes("match /{document=**}") || !/match \/\{document=\*\*\} \{\s*allow read: if false;/.test(firestoreSource)) fail("firestore.rules: unmatched documents must remain private");
const storageSource = await readFile(path.join(root, "storage.rules"), "utf8");
if (!storageSource.includes("function isVerifiedCollegeUser()") || /allow read:\s*if true/.test(storageSource)) fail("storage.rules: stored media must not allow anonymous reads");
const adminAuthSource = await readFile(path.join(pub, "js/admin-app.js"), "utf8");
if (!adminAuthSource.includes("isCollegeEmail(user.email)") || !adminAuthSource.includes("!user.emailVerified")) fail("public/js/admin-app.js: Admin sign-in must require a verified college-domain email");
const collegeLogoPath = "/assets/images/srm-trp-college-attached.png";
const layoutSource = await readFile(path.join(pub, "js/layout.js"), "utf8");
const contactSource = await readFile(path.join(pub, "pages/contact.html"), "utf8");
if (![layoutSource, contactSource, adminAuthSource].every((source) => source.includes(collegeLogoPath))) fail("College logos must use the canonical Department Information logo asset everywhere.");
if (layoutSource.includes('data-site-src="collegeLogoUrl"') || contactSource.includes('data-site-src="collegeLogoUrl"') || adminAuthSource.includes('siteSettingField("collegeLogoUrl"')) fail("The canonical college logo must not be overridden by CMS settings.");
const storeSource = await readFile(path.join(pub, "js/store.js"), "utf8");
if (!storeSource.includes("settings.collegeLogoUrl = DEFAULT_SITE_SETTINGS.collegeLogoUrl;")) fail("public/js/store.js: college logo overrides must normalize to the canonical asset.");
const formsSource = await readFile(path.join(pub, "js/forms.js"), "utf8");
if (/await\s+submit\(payload\)/.test(formsSource)) fail("public/js/forms.js: public form submit handler must call a defined Firestore writer");
if (!formsSource.includes("submitApplication(payload)") || !formsSource.includes("submitContact(payload)") || !formsSource.includes("submitFormResponse({ formId: formKey")) fail("public/js/forms.js: built-in forms must support legacy fallback and managed Firestore responses");
const adminFormsSource = await readFile(path.join(pub, "js/admin-app.js"), "utf8");
if (!adminFormsSource.includes('id="managedFieldRows"') || !adminFormsSource.includes('data-field-row')) fail("public/js/admin-app.js: managed form questions must be editable");
if (!adminFormsSource.includes('data-form-share-link') || !adminFormsSource.includes('data-form-copy') || !adminFormsSource.includes('navigator.clipboard.writeText')) fail("public/js/admin-app.js: managed forms need public share URLs and a copy-link action");
const retiredSyncSource = await readFile(path.join(root, "backend-bundle", "appsscript", "forms-sync.gs"), "utf8");
if (/SpreadsheetApp|spreadsheets\.googleapis\.com|setupEmbedxSheets|function\s+writeSettings_/.test(retiredSyncSource)) fail("backend-bundle/appsscript/forms-sync.gs: response-to-Sheets sync must remain retired");
const config = await readFile(path.join(pub, "js/config.js"), "utf8");
if (/taskMail\s*=\s*\{[^}]*\btoken\s*:/s.test(config)) fail("public/js/config.js: public task-mail token must not be shipped");
if (!config.includes("export const taskMail =")) fail("public/js/config.js: task notification compatibility endpoint is missing");
if (config.includes("EMBEDX_MAIL_WEB_APP_URL") || config.includes("mailWorkspace")) fail("public/js/config.js: manual official-mail endpoint must be removed");
const taskMailSource = await readFile(path.join(root, "backend-bundle", "appsscript", "task-mail.gs"), "utf8");
if (/FIREBASE_API_KEY\s*=\s*["']AIza/.test(taskMailSource)) fail("backend-bundle/appsscript/task-mail.gs: Firebase API key must come from Script Properties, not checked-in source");
const storageRules = await readFile(path.join(root, "storage.rules"), "utf8");
if (!storageRules.includes("function verifiedRole()") || !storageRules.includes("request.auth.token.email_verified == true")) fail("storage.rules: privileged uploads must honor required email verification");
const publicCredentialPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|ya29\.[A-Za-z0-9_-]{20,})/;
for (const file of files.filter((f) => /\.(?:html|js|mjs)$/.test(f) && !f.includes(`${path.sep}js${path.sep}vendor${path.sep}`))) {
  const source = await readFile(file, "utf8");
  if (publicCredentialPattern.test(source)) fail(`${path.relative(root, file)}: private credential-like material must not ship in the public site`);
}
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
const seedCollections = ["announcements", "events", "projects", "team", "resources", "achievements", "forms"];
for (const seedFile of ["scripts/seed.js", "backend-bundle/scripts/seed.js"]) {
  const source = await readFile(path.join(root, seedFile), "utf8");
  const declared = source.match(/const COLLECTIONS = \[([^\]]*)\]/)?.[1] || "";
  const actual = [...declared.matchAll(/["']([a-z_]+)["']/g)].map((m) => m[1]);
  if (actual.join(",") !== seedCollections.join(",")) fail(`${seedFile}: must seed exactly ${seedCollections.join(", ")}`);
}
for (const name of [...seedCollections, "gallery"]) {
  const dataFile = path.join(pub, "js", "data", `${name}.js`);
  const mirrorFile = path.join(root, "backend-bundle", "data", `${name}.js`);
  if (!(await exists(dataFile)) || !(await exists(mirrorFile))) { fail(`Seed data missing for ${name}`); continue; }
  const dataSource = await readFile(dataFile, "utf8");
  if (dataSource !== await readFile(mirrorFile, "utf8")) fail(`Seed data mirror differs for ${name}`);
  try {
    const mod = await import(pathToFileURL(dataFile).href);
    const rows = mod[name];
    if (!Array.isArray(rows)) { fail(`${name}.js: named export ${name} must be an array`); continue; }
    if (name === "gallery" && rows.length) fail("gallery.js: bundled starter gallery must remain empty");
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
