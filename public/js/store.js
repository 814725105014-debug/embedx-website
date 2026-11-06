// EMBEDX — Data store: Firestore first, graceful static fallback.
import { firebaseConfig, isConfigured } from "./config.js?v=20261106";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
let appPromise = null;

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

async function loadCollection(name, orderField = "order", dir = "asc") {
  if (!isConfigured) throw new Error("Firestore not configured");
  const app = await getApp();
  const { getFirestore, collection, getDocs } = await import(`${SDK}/firebase-firestore.js`);
  const snap = await getDocs(collection(getFirestore(app), name));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Sort client-side so older documents missing the indexed field are not silently hidden.
  if (!orderField) return rows;
  const sign = dir === "desc" ? -1 : 1;
  const value = (v) => v && typeof v.toDate === "function" ? v.toDate().getTime() : v;
  return rows.sort((a, b) => {
    const x = value(a[orderField]), y = value(b[orderField]);
    if (x == null) return y == null ? 0 : 1;
    if (y == null) return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * sign;
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * sign;
  });
}

async function addDocument(name, data) {
  if (!isConfigured) throw new Error("Firestore not configured");
  const app = await getApp();
  const { getFirestore, collection, addDoc } = await import(`${SDK}/firebase-firestore.js`);
  return addDoc(collection(getFirestore(app), name), data);
}

// --- public read API with fallbacks ---
export async function getProjects() {
  try { return await loadCollection("projects"); }
  catch { const m = await import("./data/projects.js"); return m.projects; }
}
export async function getEvents() {
  try { return await loadCollection("events"); }
  catch { const m = await import("./data/events.js?v=20261106-event-forms"); return m.events; }
}
export async function getTeam() {
  try { return await loadCollection("team"); }
  catch { const m = await import("./data/team.js"); return m.team; }
}
export async function getGallery() {
  try { return await loadCollection("gallery"); }
  catch { const m = await import("./data/gallery.js"); return m.gallery; }
}
export async function getResources() {
  try { return await loadCollection("resources", null); }
  catch { const m = await import("./data/resources.js"); return m.resources; }
}
export async function getAchievements() {
  try { return await loadCollection("achievements", null); }
  catch { const m = await import("./data/achievements.js"); return m.achievements; }
}
export async function getAnnouncements() {
  try { return await loadCollection("announcements", "createdAt", "desc"); }
  catch { const m = await import("./data/announcements.js"); return m.announcements; }
}

const LEGACY_COLLEGE_LOGO_URLS = new Set([
  "https://trp.srmtrichy.edu.in/wp-content/uploads/2026/03/TRP.png",
  "/assets/images/srm-logo.webp"
]);
export const DEFAULT_SITE_SETTINGS = Object.freeze({
  collegeLogoUrl: "/assets/images/srm-trp-college-wordmark.webp",
  collegeWebsiteUrl: "https://www.trpengg.ac.in",
  collegeWebsiteLabel: "www.trpengg.ac.in",
  contactEmail: "eee@srmtrpr.edu.in",
  phoneDisplay: "0431-2908050",
  phoneHref: "tel:04312908050",
  linkedinUrl: "https://www.linkedin.com/school/srm-trp-engineering-college",
  instagramUrl: "https://www.instagram.com/trpengineeringcollege",
  facebookUrl: "https://www.facebook.com/SRMTRPEngg",
  whatsappUrl: "https://chat.whatsapp.com/C0lGhoQ6D9MK79OXroCPuF"
});

export function normalizeSiteSettings(overrides = {}) {
  const source = overrides && typeof overrides === "object" ? overrides : {};
  const settings = { ...DEFAULT_SITE_SETTINGS, ...source };
  const logoUrl = String(settings.collegeLogoUrl || "").trim();
  if (!logoUrl || LEGACY_COLLEGE_LOGO_URLS.has(logoUrl.split(/[?#]/, 1)[0])) {
    settings.collegeLogoUrl = DEFAULT_SITE_SETTINGS.collegeLogoUrl;
  }
  return settings;
}

export async function getSiteSettings() {
  if (!isConfigured) return normalizeSiteSettings();
  try {
    const app = await getApp();
    const { getFirestore, doc, getDoc } = await import(`${SDK}/firebase-firestore.js`);
    const snap = await getDoc(doc(getFirestore(app), "site_settings", "site"));
    return normalizeSiteSettings(snap.exists() ? snap.data() : {});
  } catch (err) { console.warn("Using bundled site settings", err); return normalizeSiteSettings(); }
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
