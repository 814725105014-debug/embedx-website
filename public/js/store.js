// EMBEDX — Data store: Firestore first, graceful static fallback.
import { firebaseConfig, isConfigured } from "./config.js?v=20261106";
import { getPageContentDefaults } from "./data/page-content.js?v=20261107-admin-controls";
import { DEFAULT_SITE_LINKS, normalizeSiteLinks } from "./data/site-links.js?v=20261107-editor";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
const PUBLIC_READ_TIMEOUT_MS = 1800;
let appPromise = null;
const publicCollectionCache = new Map();
const publicCollectionFingerprints = new Map();
let siteSettingsCache = null;
let siteSettingsFingerprint = "";

function withDeadline(task, timeout = PUBLIC_READ_TIMEOUT_MS) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Firebase read timed out")), timeout);
  });
  return Promise.race([Promise.resolve().then(task), deadline]).finally(() => clearTimeout(timer));
}

async function readOrFallback(read, fallback) {
  try { return await withDeadline(read); }
  catch { return fallback(); }
}

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps, getApp: existing } = await import(`${SDK}/firebase-app.js`);
      const app = getApps().length ? existing() : initializeApp(firebaseConfig);
      // GA4 only on real deployments (not localhost / sandbox previews)
      if (!/(localhost|127\.0\.0\.1|e2b\.app|preview\.)/.test(location.hostname) && firebaseConfig.measurementId) {
        import(`${SDK}/firebase-analytics.js`).then((m) => m.getAnalytics(app)).catch(() => {});
      }
      return app;
    })();
  }
  return appPromise;
}

function sortCollection(rows, orderField = "order", dir = "asc") {
  if (!orderField) return [...rows];
  const sign = dir === "desc" ? -1 : 1;
  const value = (v) => v && typeof v.toDate === "function" ? v.toDate().getTime() : v;
  return [...rows].sort((a, b) => {
    const x = value(a[orderField]), y = value(b[orderField]);
    if (x == null) return y == null ? 0 : 1;
    if (y == null) return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * sign;
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * sign;
  });
}

function fingerprint(value) {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item.toDate === "function" ? item.toDate().toISOString() : item
  );
}

function notifyCollectionUpdate(name) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("embedx:public-collection-updated", { detail: { name } }));
  }
}

async function loadCollection(name, orderField = "order", dir = "asc") {
  if (!isConfigured) throw new Error("Firestore not configured");
  if (publicCollectionCache.has(name)) return sortCollection(publicCollectionCache.get(name), orderField, dir);
  const app = await getApp();
  const { getFirestore, collection, getDocs } = await import(`${SDK}/firebase-firestore.js`);
  const snap = await getDocs(collection(getFirestore(app), name));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextFingerprint = fingerprint(rows);
  const previousFingerprint = publicCollectionFingerprints.get(name);
  publicCollectionCache.set(name, rows);
  publicCollectionFingerprints.set(name, nextFingerprint);
  if (nextFingerprint !== previousFingerprint) notifyCollectionUpdate(name);
  return sortCollection(rows, orderField, dir);
}

// Keep an open public page in sync with Admin writes. The initial server snapshot
// also replaces any stale bundled fallback that was shown during a slow read.
export function subscribePublicCollection(name, onChange = () => {}) {
  let stopped = false;
  let unsubscribe = () => {};
  getApp().then(async (app) => {
    const { getFirestore, collection, onSnapshot } = await import(`${SDK}/firebase-firestore.js`);
    if (stopped) return;
    unsubscribe = onSnapshot(collection(getFirestore(app), name), (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const nextFingerprint = fingerprint(rows);
      const previousFingerprint = publicCollectionFingerprints.get(name);
      publicCollectionCache.set(name, rows);
      publicCollectionFingerprints.set(name, nextFingerprint);
      if (nextFingerprint !== previousFingerprint) onChange(sortCollection(rows));
    }, (error) => console.warn(`Live ${name} updates are unavailable`, error));
  }).catch((error) => console.warn(`Could not subscribe to live ${name} updates`, error));
  return () => { stopped = true; unsubscribe(); };
}

async function addDocument(name, data) {
  if (!isConfigured) throw new Error("Firestore not configured");
  const app = await getApp();
  const { getFirestore, collection, addDoc } = await import(`${SDK}/firebase-firestore.js`);
  return addDoc(collection(getFirestore(app), name), data);
}

// --- public reads resolve from Firestore quickly, then fall back to bundled data on slow/offline links ---
export function getProjects() {
  return readOrFallback(() => loadCollection("projects"), async () => (await import("./data/projects.js")).projects);
}
export function getEvents() {
  return readOrFallback(() => loadCollection("events"), async () => (await import("./data/events.js?v=20261106-event-forms")).events);
}
export function getTeam() {
  return readOrFallback(() => loadCollection("team"), async () => (await import("./data/team.js?v=hod-amudha-20261105")).team);
}
export function getGallery() {
  return readOrFallback(() => loadCollection("gallery"), async () => (await import("./data/gallery.js")).gallery);
}
export function getResources() {
  return readOrFallback(() => loadCollection("resources", null), async () => (await import("./data/resources.js")).resources);
}
export function getAchievements() {
  return readOrFallback(() => loadCollection("achievements", null), async () => (await import("./data/achievements.js")).achievements);
}
export function getAnnouncements() {
  return readOrFallback(() => loadCollection("announcements", "createdAt", "desc"), async () => (await import("./data/announcements.js")).announcements);
}

const pageContentCache = new Map();
function normalizePageContent(page, value = {}) {
  const defaults = getPageContentDefaults(page);
  const safeValues = Object.fromEntries(Object.keys(defaults).map((key) => [key,
    typeof value?.[key] === "string" ? value[key] : defaults[key]
  ]));
  return { ...defaults, ...safeValues };
}
export async function getPageContent(page) {
  if (pageContentCache.has(page)) return pageContentCache.get(page);
  if (!isConfigured) return normalizePageContent(page);
  return readOrFallback(async () => {
    const app = await getApp();
    const { getFirestore, doc, getDoc } = await import(`${SDK}/firebase-firestore.js`);
    const snap = await getDoc(doc(getFirestore(app), "page_content", page));
    const content = normalizePageContent(page, snap.exists() ? snap.data() : {});
    pageContentCache.set(page, content);
    return content;
  }, () => normalizePageContent(page));
}
function applyCopyText(element, value) {
  const gradient = element.querySelector(".grad-text");
  if (!gradient) { element.textContent = value; return; }

  const anchor = gradient.dataset.copyGradientAnchor || gradient.textContent.trim();
  gradient.dataset.copyGradientAnchor = anchor;
  let start = anchor ? value.toLowerCase().indexOf(anchor.toLowerCase()) : -1;
  let end;
  if (start >= 0) {
    end = start + anchor.length;
  } else {
    // If CMS copy changes the highlighted wording, keep a visible accent on its final word.
    const trimmedEnd = value.trimEnd();
    end = trimmedEnd.length;
    start = trimmedEnd.lastIndexOf(" ") + 1;
  }

  gradient.textContent = value.slice(start, end);
  element.replaceChildren(
    document.createTextNode(value.slice(0, start)),
    gradient,
    document.createTextNode(value.slice(end))
  );
}

export function applyPageContent(page, content) {
  const values = normalizePageContent(page, content);
  for (const [key, value] of Object.entries(values)) {
    document.querySelectorAll(`[data-page-copy="${page}:${key}"]`).forEach((element) => {
      applyCopyText(element, value);
    });
  }
}
export function subscribePageContent(page, onChange = () => {}) {
  let stopped = false;
  let unsubscribe = () => {};
  if (!isConfigured) return () => {};
  getApp().then(async (app) => {
    const { getFirestore, doc, onSnapshot } = await import(`${SDK}/firebase-firestore.js`);
    if (stopped) return;
    unsubscribe = onSnapshot(doc(getFirestore(app), "page_content", page), (snapshot) => {
      const content = normalizePageContent(page, snapshot.exists() ? snapshot.data() : {});
      const previous = pageContentCache.get(page);
      pageContentCache.set(page, content);
      if (fingerprint(content) !== fingerprint(previous)) onChange(content);
    }, (error) => console.warn(`Live ${page} page-copy updates are unavailable`, error));
  }).catch((error) => console.warn(`Could not subscribe to ${page} page-copy updates`, error));
  return () => { stopped = true; unsubscribe(); };
}

const PAGE_BLOCK_TYPES = new Set(["heading", "text", "feature", "link", "image", "video"]);
export function normalizePageBlocks(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((block) => block && PAGE_BLOCK_TYPES.has(block.type)).slice(0, 50).map((block, index) => ({
    id: String(block.id || `block-${index + 1}`).slice(0, 80),
    type: block.type,
    title: typeof block.title === "string" ? block.title.slice(0, 180) : "",
    body: typeof block.body === "string" ? block.body.slice(0, 3000) : "",
    label: typeof block.label === "string" ? block.label.slice(0, 100) : "",
    url: typeof block.url === "string" ? block.url.slice(0, 1000) : "",
    caption: typeof block.caption === "string" ? block.caption.slice(0, 300) : ""
  }));
}
export async function getPageBlocks(page) {
  if (!isConfigured) return [];
  return readOrFallback(async () => {
    const app = await getApp();
    const { getFirestore, doc, getDoc } = await import(`${SDK}/firebase-firestore.js`);
    const snap = await getDoc(doc(getFirestore(app), "page_content", page));
    return normalizePageBlocks(snap.exists() ? snap.get("blocks") : []);
  }, () => []);
}
export function subscribePageBlocks(page, onChange = () => {}) {
  let stopped = false;
  let unsubscribe = () => {};
  if (!isConfigured) return () => {};
  getApp().then(async (app) => {
    const { getFirestore, doc, onSnapshot } = await import(`${SDK}/firebase-firestore.js`);
    if (stopped) return;
    unsubscribe = onSnapshot(doc(getFirestore(app), "page_content", page), (snapshot) => {
      onChange(normalizePageBlocks(snapshot.exists() ? snapshot.get("blocks") : []));
    }, (error) => console.warn(`Live ${page} page features are unavailable`, error));
  }).catch((error) => console.warn(`Could not subscribe to ${page} page features`, error));
  return () => { stopped = true; unsubscribe(); };
}

export async function getSiteLinks() {
  if (!isConfigured) return normalizeSiteLinks(DEFAULT_SITE_LINKS);
  return readOrFallback(async () => {
    const app = await getApp();
    const { getFirestore, doc, getDoc } = await import(`${SDK}/firebase-firestore.js`);
    const snap = await getDoc(doc(getFirestore(app), "site_links", "links"));
    return normalizeSiteLinks(snap.exists() ? snap.data() : {});
  }, () => normalizeSiteLinks(DEFAULT_SITE_LINKS));
}
export function subscribeSiteLinks(onChange = () => {}) {
  let stopped = false;
  let unsubscribe = () => {};
  if (!isConfigured) return () => {};
  getApp().then(async (app) => {
    const { getFirestore, doc, onSnapshot } = await import(`${SDK}/firebase-firestore.js`);
    if (stopped) return;
    unsubscribe = onSnapshot(doc(getFirestore(app), "site_links", "links"), (snapshot) => {
      onChange(normalizeSiteLinks(snapshot.exists() ? snapshot.data() : {}));
    }, (error) => console.warn("Live navigation links are unavailable", error));
  }).catch((error) => console.warn("Could not subscribe to navigation links", error));
  return () => { stopped = true; unsubscribe(); };
}

export const DEFAULT_SITE_SETTINGS = Object.freeze({
  collegeLogoUrl: "/assets/images/srm-trp-college-attached.png?v=college-logo-mark-20261105",
  collegeWebsiteUrl: "https://trp.srmtrichy.edu.in",
  collegeWebsiteLabel: "trp.srmtrichy.edu.in",
  contactEmail: "hod.eee@trp.srmtrichy.edu.in",
  phoneDisplay: "0431-2908050",
  phoneHref: "tel:04312908050",
  linkedinUrl: "https://www.linkedin.com/school/srm-trp-engineering-college",
  instagramUrl: "https://www.instagram.com/trpengineeringcollege",
  facebookUrl: "https://www.facebook.com/SRMTRPEngg",
  whatsappUrl: "https://chat.whatsapp.com/C0lGhoQ6D9MK79OXroCPuF",
  heroImageUrl: "/assets/images/robotics-hero.webp",
  heroImageAlt: "Collaborative robotic arm working over a microcontroller board in an embedded systems lab",
  heroImageFit: "cover",
  heroImagePositionX: 50,
  heroImagePositionY: 50,
  heroImageCaption: "From circuit to system",
  heroImageSubcaption: "Embedded · Robotics · Automation"
});

export function normalizeSiteSettings(overrides = {}) {
  const source = overrides && typeof overrides === "object" ? overrides : {};
  const settings = { ...DEFAULT_SITE_SETTINGS, ...source };
  // Keep the official college mark identical on every page; ignore older CMS overrides.
  settings.collegeLogoUrl = DEFAULT_SITE_SETTINGS.collegeLogoUrl;
  if (String(settings.collegeWebsiteUrl || "").replace(/\/$/, "") === "https://www.trpengg.ac.in") {
    settings.collegeWebsiteUrl = DEFAULT_SITE_SETTINGS.collegeWebsiteUrl;
    settings.collegeWebsiteLabel = DEFAULT_SITE_SETTINGS.collegeWebsiteLabel;
  }
  if (String(settings.contactEmail || "").toLowerCase() === "eee@srmtr.edu.in") {
    settings.contactEmail = DEFAULT_SITE_SETTINGS.contactEmail;
  }
  if (!["cover", "contain"].includes(settings.heroImageFit)) settings.heroImageFit = DEFAULT_SITE_SETTINGS.heroImageFit;
  for (const key of ["heroImagePositionX", "heroImagePositionY"]) {
    const value = Number(settings[key]);
    settings[key] = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : DEFAULT_SITE_SETTINGS[key];
  }
  for (const [key, limit] of [["heroImageAlt", 240], ["heroImageCaption", 120], ["heroImageSubcaption", 180]]) {
    settings[key] = typeof settings[key] === "string" ? settings[key].slice(0, limit) : DEFAULT_SITE_SETTINGS[key];
  }
  return settings;
}

export function getSiteSettings() {
  if (siteSettingsCache) return Promise.resolve(siteSettingsCache);
  if (!isConfigured) return Promise.resolve(normalizeSiteSettings());
  return readOrFallback(async () => {
    const app = await getApp();
    const { getFirestore, doc, getDoc } = await import(`${SDK}/firebase-firestore.js`);
    const snap = await getDoc(doc(getFirestore(app), "site_settings", "site"));
    const settings = normalizeSiteSettings(snap.exists() ? snap.data() : {});
    siteSettingsCache = settings;
    siteSettingsFingerprint = fingerprint(settings);
    return settings;
  }, () => normalizeSiteSettings());
}

export function subscribeSiteSettings(onChange = () => {}) {
  let stopped = false;
  let unsubscribe = () => {};
  if (!isConfigured) return () => {};
  getApp().then(async (app) => {
    const { getFirestore, doc, onSnapshot } = await import(`${SDK}/firebase-firestore.js`);
    if (stopped) return;
    unsubscribe = onSnapshot(doc(getFirestore(app), "site_settings", "site"), (snapshot) => {
      const settings = normalizeSiteSettings(snapshot.exists() ? snapshot.data() : {});
      const nextFingerprint = fingerprint(settings);
      const previousFingerprint = siteSettingsFingerprint;
      siteSettingsCache = settings;
      siteSettingsFingerprint = nextFingerprint;
      if (nextFingerprint !== previousFingerprint) onChange(settings);
    }, (error) => console.warn("Live website settings are unavailable", error));
  }).catch((error) => console.warn("Could not subscribe to live website settings", error));
  return () => { stopped = true; unsubscribe(); };
}

// --- public form API ---
export async function getFormDefinition(formId) {
  if (!isConfigured) throw new Error("Forms are temporarily unavailable.");
  const app = await getApp();
  const { getFirestore, doc, getDoc } = await import(`${SDK}/firebase-firestore.js`);
  const snap = await getDoc(doc(getFirestore(app), "forms", formId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function submitApplication(data) { return addDocument("members_applications", data); }
export async function submitContact(data) { return addDocument("contact_messages", data); }
export async function submitFormResponse(data) { return addDocument("form_responses", data); }
export { isConfigured };
