// EMBEDX — Admin portal: multi-page, role-based CMS.
// One page per section (/admin/, /admin/events, /admin/admins, …) sharing this module.
// Real security lives in firestore.rules / storage.rules (roles from `admin_roles` collection).
import { firebaseConfig, isConfigured, taskMail } from "./config.js?v=20261106-remove-official-mail";
import { toast } from "./ui.js?v=20261107-admin-controls";
import { esc, asset, driveFileId } from "./render.js?v=20261107-drive-thumbnails";
import { announcements as starterAnnouncements } from "./data/announcements.js?v=20261106-admin-controls";
import { events as starterEvents } from "./data/events.js?v=20261106-event-forms";
import { projects as starterProjects } from "./data/projects.js?v=20261106-admin-controls";
import { team as starterTeam } from "./data/team.js?v=20261106-admin-controls";
import { resources as starterResources } from "./data/resources.js?v=20261106-admin-controls";
import { achievements as starterAchievements } from "./data/achievements.js?v=20261106-admin-controls";
import { forms as starterForms } from "./data/forms.js?v=20261106-admin-controls";
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from "./store.js?v=college-logo-consistency-20261105";
import { PAGE_CONTENT, getPageContentDefaults } from "./data/page-content.js?v=20261107-admin-controls";
import { DEFAULT_SITE_LINKS, SITE_LINK_GROUPS, normalizeSiteLinks } from "./data/site-links.js?v=20261107-editor";

const STARTER_CONTENT = {
  announcements: starterAnnouncements,
  events: starterEvents,
  projects: starterProjects,
  team: starterTeam,
  gallery: [],
  resources: starterResources,
  achievements: starterAchievements,
  forms: starterForms
};

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
let PAGE = document.body.dataset.adminPage || "overview";
const OWNER_EMAIL = "814725105014@trp.srmtrichy.edu.in";
const isCollegeEmail = (email) => /^[^\s@]+@trp\.srmtrichy\.edu\.in$/i.test(String(email || "").trim());

// page metadata — drives instant client-side navigation (SPA with real URLs)
const PAGES = {
  overview:      { h1: "Overview",       hint: "Live counts, your open tasks and access at a glance.", crud: false },
  announcements: { h1: "Announcements",  hint: "Published instantly to the home-page notice board (pinned first).", crud: true },
  events:        { h1: "Events",         hint: "Choose event dates, upload HEIC or other photos, add Drive-hosted video clips, and assign registration forms.", crud: true },
  projects:      { h1: "Projects",       hint: "Featured projects appear on the home page grid.", crud: true },
  team:          { h1: "Team",           hint: "Executive council & faculty — swap photos and edit details any time.", crud: true },
  gallery:       { h1: "Gallery",        hint: "Upload public photos, including iPhone HEIC/HEIF. Event-specific photos and video clips belong under Events.", crud: true },
  resources:     { h1: "Resources",      hint: "Learning Hub guides with category filters.", crud: true },
  achievements:  { h1: "Achievers",      hint: "Hall of Achievers cards.", crud: true },
  forms:         { h1: "Forms & responses", hint: "Edit application and enquiry forms, manage intake, and review or export responses.", crud: false },
  site:          { h1: "Website settings", hint: "Update college contact information and social links; the official college logo is fixed across the site.", crud: false },
  tasks:         { h1: "Tasks",          hint: "Assign work to a person or a role; assignees mark tasks done.", crud: true },
  admins:        { h1: "Admins & roles", hint: "Add coordinators, HOD and president in one click; reset or revoke any time.", crud: false }
};
const pageFromPath = (pathname) => {
  const m = pathname.replace(/\/+$/, "").match(/^\/admin(?:\/(?:index\.html)?|\/([a-z]+)(?:\.html)?)?$/);
  if (!m) return null;
  const p = m[1] || "overview";
  return PAGES[p] ? p : null;
};

/* ---------------- roles & permissions ---------------- */
const ROLES = {
  owner:             { label: "Owner",                 blurb: "Full control, incl. admin logins & roles" },
  president:         { label: "President",             blurb: "Announcements, team, achievers, tasks" },
  hod:               { label: "HOD",                   blurb: "Read-only oversight of every section" },
  event_coordinator: { label: "Event Coordinator",     blurb: "Create & update events" },
  social_media:      { label: "Social Media Coordinator", blurb: "Gallery photos & announcements" },
  technical:         { label: "Technical Coordinator", blurb: "Projects, resources, achievers" }
};
// who may WRITE each section (read is allowed for every signed-in role)
const WRITE = {
  announcements: ["owner", "president", "social_media"],
  events:        ["owner", "president", "event_coordinator"],
  projects:      ["owner", "technical"],
  team:          ["owner", "president"],
  gallery:       ["owner", "social_media"],
  resources:     ["owner", "technical"],
  achievements:  ["owner", "president", "technical"],
  forms:         ["owner", "president"],
  site:          ["owner"],
  tasks:         ["owner", "president"],
  admins:        ["owner"]
};
// per-admin custom permissions: the owner ticks exactly these per person.
const SECTIONS = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements", "forms", "site", "tasks"];
const SECTION_LABELS = { announcements: "Announcements", events: "Events", projects: "Projects", team: "Team", gallery: "Gallery", resources: "Resources", achievements: "Achievers", forms: "Forms & responses", site: "Website settings", tasks: "Tasks" };
// fallback for role docs created before custom perms existed (mirrors firestore.rules legacyPerms)
const LEGACY_PERMS = {
  president: ["announcements", "team", "achievements", "forms", "tasks"],
  event_coordinator: ["events"],
  social_media: ["gallery", "announcements"],
  technical: ["projects", "resources", "achievements"]
};
const NAV = [
  ["overview", "Overview", "/admin/"],
  ["announcements", "Announcements", "/admin/announcements"],
  ["events", "Events", "/admin/events"],
  ["projects", "Projects", "/admin/projects"],
  ["team", "Team", "/admin/team"],
  ["gallery", "Gallery", "/admin/gallery"],
  ["resources", "Resources", "/admin/resources"],
  ["achievements", "Achievers", "/admin/achievers"],
  ["forms", "Forms & responses", "/admin/forms"],
  ["site", "Website settings", "/admin/site"],
  ["tasks", "Tasks", "/admin/tasks"],
  ["admins", "Admins & roles", "/admin/admins"]
];

let authMod = null, dbMod = null, stMod = null, app = null;
let role = null, me = "", perms = [];
let hasTaskAccess = false;
let items = [], editingId = null, pendingImageField = null, editorState = null;
let statsCache = null;
let listRequestId = 0;
let formsRefreshTimer = null;
let roleWatchUnsubscribe = null;
let adminPresenceUnsubscribe = null;
let adminPresenceTimer = null;
let activityHeartbeatTimer = null;
let activityVisibilityHandler = null;
let starterContentSyncUser = "";

async function sdk() {
  const { initializeApp, getApps, getApp } = await import(`${SDK}/firebase-app.js`);
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authMod = authMod || (await import(`${SDK}/firebase-auth.js`));
  dbMod = dbMod || (await import(`${SDK}/firebase-firestore.js`));
  stMod = stMod || (await import(`${SDK}/firebase-storage.js`));
  const storage = stMod.getStorage(app);
  // Do not depend on optional Storage SDK retry-tuning exports. Uploads are bounded
  // by uploadBlobWithProgress's idle and total timers, which cancel stalled transfers.
  return { auth: authMod.getAuth(app), db: dbMod.getFirestore(app), storage };
}
const $ = (s) => document.querySelector(s);
const can = (sec) => role === "owner" || perms.includes(sec);
const canView = (sec) => can(sec) || (role === "hod" && sec !== "tasks" && sec !== "admins" && sec !== "forms");
function canAccessAdminPage(page) {
  if (page === "overview") return true;
  if (page === "tasks") return can("tasks") || hasTaskAccess;
  if (page === "admins") return role === "owner";
  return canView(page);
}

async function recordAdminActivity(field) {
  if (!me || !["lastLoginAt", "lastActiveAt"].includes(field)) return;
  try {
    const { db } = await sdk();
    const ref = dbMod.doc(db, "admin_roles", me);
    const value = dbMod.serverTimestamp();
    if (role === "owner") await dbMod.setDoc(ref, { [field]: value }, { merge: true });
    else await dbMod.updateDoc(ref, { [field]: value });
  } catch (error) { console.warn(`Could not update admin ${field}`, error); }
}
function stopAdminActivity() {
  if (activityHeartbeatTimer) clearInterval(activityHeartbeatTimer);
  activityHeartbeatTimer = null;
  if (activityVisibilityHandler) document.removeEventListener("visibilitychange", activityVisibilityHandler);
  activityVisibilityHandler = null;
}
function startAdminActivity() {
  stopAdminActivity();
  const loginFlag = `embedx-admin-login-recorded:${me}`;
  let alreadyRecorded = false;
  try { alreadyRecorded = sessionStorage.getItem(loginFlag) === "1"; } catch { /* storage can be disabled */ }
  if (!alreadyRecorded) {
    void recordAdminActivity("lastLoginAt");
    try { sessionStorage.setItem(loginFlag, "1"); } catch { /* no persistent session storage */ }
  }
  const touch = () => { if (document.visibilityState === "visible") void recordAdminActivity("lastActiveAt"); };
  touch();
  activityHeartbeatTimer = setInterval(touch, 90_000);
  activityVisibilityHandler = () => { if (document.visibilityState === "visible") touch(); };
  document.addEventListener("visibilitychange", activityVisibilityHandler);
}
function activityMillis(value) {
  if (value && typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatActivityTime(value) {
  const millis = activityMillis(value);
  return millis ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(millis) : "Never recorded";
}
function paintPresenceCard(card) {
  const activity = card?.querySelector("[data-admin-presence]");
  if (!activity) return;
  const lastActive = Number(activity.dataset.lastActive || 0);
  const active = lastActive > 0 && Date.now() - lastActive <= 4 * 60_000;
  const status = activity.querySelector("[data-presence-status]");
  if (status) { status.textContent = active ? "Active now" : lastActive ? "Inactive" : "No recent activity"; status.classList.toggle("is-active", active); }
  const activeLabel = activity.querySelector("[data-last-active-label]");
  if (activeLabel) activeLabel.textContent = `Last active: ${formatActivityTime(lastActive)}`;
  const loginLabel = activity.querySelector("[data-last-login-label]");
  if (loginLabel) loginLabel.textContent = `Last login: ${formatActivityTime(Number(activity.dataset.lastLogin || 0))}`;
}
function updateAdminPresence(email, data = {}) {
  document.querySelectorAll(".admin-user-card[data-admin-email]").forEach((card) => {
    if (card.dataset.adminEmail !== String(email).toLowerCase()) return;
    const activity = card.querySelector("[data-admin-presence]");
    if (!activity) return;
    activity.dataset.lastActive = String(activityMillis(data.lastActiveAt) || 0);
    activity.dataset.lastLogin = String(activityMillis(data.lastLoginAt) || 0);
    paintPresenceCard(card);
  });
}
function stopAdminPresenceWatch() {
  if (adminPresenceUnsubscribe) adminPresenceUnsubscribe();
  adminPresenceUnsubscribe = null;
  if (adminPresenceTimer) clearInterval(adminPresenceTimer);
  adminPresenceTimer = null;
}
async function startAdminPresenceWatch() {
  stopAdminPresenceWatch();
  if (role !== "owner" || PAGE !== "admins") return;
  try {
    const { db } = await sdk();
    if (PAGE !== "admins") return;
    adminPresenceUnsubscribe = dbMod.onSnapshot(dbMod.collection(db, "admin_roles"), (snapshot) => {
      snapshot.docs.forEach((doc) => updateAdminPresence(doc.id, doc.data()));
    }, (error) => console.warn("Live admin activity is unavailable", error));
    adminPresenceTimer = setInterval(() => document.querySelectorAll(".admin-user-card[data-admin-email]").forEach(paintPresenceCard), 30_000);
  } catch (error) { console.warn("Could not subscribe to admin activity", error); }
}

async function countCollection(db, name) {
  const ref = dbMod.collection(db, name);
  try { return (await dbMod.getCountFromServer(ref)).data().count; }
  catch { return (await dbMod.getDocs(ref)).size; }
}

function isSafeMediaReference(value) {
  const url = String(value || "").trim();
  if (!url) return true;
  if (/^https:\/\//i.test(url)) {
    try { return new URL(url).protocol === "https:"; } catch { return false; }
  }
  return !/^[a-z][a-z0-9+.-]*:/i.test(url)
    && !url.startsWith("//")
    && !url.split(/[?#]/, 1)[0].split("/").includes("..");
}

function safeHttpsUrl(value) {
  const url = String(value || "").trim();
  if (!url) return true;
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}

let heicConverterPromise = null;
function loadHeicConverter() {
  if (typeof window.heic2any === "function") return Promise.resolve(window.heic2any);
  if (heicConverterPromise) return heicConverterPromise;
  heicConverterPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/js/vendor/heic2any.min.js?v=20261108-heic";
    script.async = true;
    script.onload = () => typeof window.heic2any === "function" ? resolve(window.heic2any) : reject(new Error("HEIC converter did not initialize."));
    script.onerror = () => reject(new Error("Could not load the HEIC image converter."));
    document.head.appendChild(script);
  }).catch((error) => { heicConverterPromise = null; throw error; });
  return heicConverterPromise;
}
async function browserReadableImage(file) {
  const heic = /\.(?:heic|heif)$/i.test(file.name || "") || /^image\/(?:heic|heif|heic-sequence|heif-sequence)$/i.test(file.type || "");
  if (!heic) return file;
  const convert = await loadHeicConverter();
  const converted = await convert({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!(blob instanceof Blob) || !blob.size) throw new Error("This HEIC/HEIF image could not be converted.");
  return blob;
}
function loadEditorImage(file) {
  return browserReadableImage(file).then((blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The selected image could not be decoded. Try a JPEG or PNG copy.")); };
    image.src = url;
  }));
}
const STORAGE_UPLOAD_IDLE_TIMEOUT_MS = 45_000;
const STORAGE_UPLOAD_TOTAL_TIMEOUT_MS = 180_000;

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(message), { code: "upload/timeout" })), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

function uploadErrorMessage(error) {
  if (["storage/bucket-not-found", "storage/no-default-bucket"].includes(error?.code)) {
    return "Firebase Storage is not enabled for this project. Use a public Drive image link or ask the owner to provision the configured Storage bucket.";
  }
  if (error?.code === "storage/unauthorized") {
    return "Firebase Storage denied this upload. Check that Storage rules are deployed and your verified admin role can edit this section.";
  }
  if (["storage/timeout", "upload/timeout", "storage/retry-limit-exceeded"].includes(error?.code)) {
    return error.message || "The upload stalled. Check your connection and retry.";
  }
  return error?.message || error?.code || "unknown error";
}

function uploadBlobWithProgress(ref, blob, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    let task;
    try { task = stMod.uploadBytesResumable(ref, blob, { contentType: "image/webp" }); }
    catch (error) { reject(error); return; }
    let finished = false;
    let idleTimer = null;
    let totalTimer = null;
    let unsubscribe = () => {};
    const cleanup = () => {
      clearTimeout(idleTimer);
      clearTimeout(totalTimer);
      unsubscribe();
    };
    const finish = (error, result) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error); else resolve(result);
    };
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const error = new Error("No upload progress for 45 seconds. Check the connection and retry.");
        error.code = "storage/timeout";
        finish(error);
        task.cancel();
      }, STORAGE_UPLOAD_IDLE_TIMEOUT_MS);
    };
    totalTimer = setTimeout(() => {
      const error = new Error("Upload exceeded the 3-minute time limit. Check the connection and retry.");
      error.code = "storage/timeout";
      finish(error);
      task.cancel();
    }, STORAGE_UPLOAD_TOTAL_TIMEOUT_MS);
    resetIdleTimer();
    unsubscribe = task.on("state_changed", (snapshot) => {
      resetIdleTimer();
      const percent = snapshot.totalBytes ? Math.floor(snapshot.bytesTransferred / snapshot.totalBytes * 100) : 0;
      try { onProgress(percent); } catch { /* UI progress must never interrupt the transfer. */ }
    }, (error) => finish(error), () => finish(null, task.snapshot.ref));
  });
}

async function uploadOptimizedImage(file, section = PAGE, onProgress = () => {}) {
  if (!file || file.size > 25 * 1024 * 1024) throw new Error("Choose an image under 25 MB.");
  const supported = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)
    || /\.(?:jpe?g|png|webp|heic|heif)$/i.test(file.name || "");
  if (!supported) throw new Error("Choose a JPG, PNG, WebP, or iPhone HEIC/HEIF image.");
  onProgress({ phase: "prepare", percent: 0 });
  const decoded = await withTimeout(browserReadableImage(file), 90_000, "Image conversion took too long. Try a smaller JPG or PNG.");
  const bitmap = await withTimeout(createImageBitmap(decoded), 60_000, "Image decoding took too long. Try a smaller image.");
  try {
    const scale = Math.min(1, 1920 / bitmap.width, 1920 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image editor could not allocate a canvas.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = await withTimeout(new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82)), 30_000, "Image optimization timed out. Try a smaller image.");
    if (!blob) throw new Error("Image optimization failed.");
    if (blob.size >= 5 * 1024 * 1024) blob = await withTimeout(new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.68)), 30_000, "Image optimization timed out. Try a smaller image.");
    if (!blob || blob.size >= 5 * 1024 * 1024) throw new Error("Optimized image exceeds the 5 MB upload limit.");
    onProgress({ phase: "connecting", percent: 0 });
    const { storage } = await withTimeout(sdk(), 30_000, "Could not connect to Firebase Storage. Check your connection and retry.");
    const path = `images/${section}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const ref = stMod.ref(storage, path);
    const uploadedRef = await uploadBlobWithProgress(ref, blob, (percent) => onProgress({ phase: "upload", percent }));
    onProgress({ phase: "finish", percent: 100 });
    const url = await stMod.getDownloadURL(uploadedRef);
    onProgress({ phase: "done", percent: 100 });
    return url;
  } finally { bitmap.close?.(); }
}

/* ---------------- schemas ---------------- */
const SCHEMAS = {
  announcements: {
    label: "announcement",
    sort: ["createdAt", "desc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Title" },
      { k: "kind", t: "select", opts: ["notice", "event", "update", "result"], label: "Type" },
      { k: "body", t: "textarea", req: true, label: "Message" },
      { k: "pinned", t: "check", label: "Pin to top of notice board" }
    ],
    defaults: { kind: "notice", pinned: false },
    title: (d) => d.title,
    sub: (d) => `${d.pinned ? "📌 " : ""}${d.kind || "notice"} • ${(d.createdAt || "").slice(0, 10)}`
  },
  events: {
    label: "event",
    sort: ["order", "asc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Title" },
      { k: "type", t: "text", label: "Type (e.g. Flagship Signature Event)" },
      { k: "subtitle", t: "text", label: "Subtitle" },
      { k: "tagline", t: "text", label: "Tagline" },
      { k: "eventDate", t: "date", label: "Event date (select from calendar)" },
      { k: "venue", t: "text", label: "Venue" },
      { k: "registrationStatus", t: "text", label: "Registration status" },
      { k: "registrationFormId", t: "event-form", full: true, label: "Registration form" },
      { k: "registrationLink", t: "text", full: true, label: "External registration URL (optional)" },
      { k: "eligibility", t: "text", label: "Eligibility" },
      { k: "description", t: "textarea", label: "Description" },
      { k: "eventEnded", t: "check", label: "Event ended — enable event photos and videos" },
      { k: "glimpses", t: "event-media", full: true, label: "Event photos and videos" },
      { k: "imageUrl", t: "image", label: "Poster image" },
      { k: "isUpcoming", t: "check", label: "Upcoming event" },
      { k: "featured", t: "check", label: "Featured" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { isUpcoming: true, eventEnded: false, glimpses: [], featured: false, order: 1, type: "Technical Workshop", registrationFormId: "" },
    image: "imageUrl",
    title: (d) => d.title,
    sub: (d) => `${d.type || ""} • ${d.eventDate || d.date || "Date not set"} ${d.eventEnded ? "• ended" : d.isUpcoming ? "• upcoming" : ""} • ${d.registrationFormId ? "form assigned" : /^https:\/\//i.test(String(d.registrationLink || "")) && safeHttpsUrl(d.registrationLink) ? "external registration" : "unassigned"}`
  },
  projects: {
    label: "project",
    sort: ["order", "asc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Title" },
      { k: "category", t: "text", label: "Technical domain / category" },
      { k: "status", t: "text", label: "Project status" },
      { k: "highlight", t: "text", label: "Highlight" },
      { k: "shortDesc", t: "textarea", label: "Short description" },
      { k: "cardDesc", t: "textarea", label: "Home-page card description" },
      { k: "imageUrl", t: "image", label: "Cover image URL or upload" },
      { k: "githubUrl", t: "text", label: "GitHub URL (HTTPS)" },
      { k: "demoUrl", t: "text", label: "Demo URL (HTTPS)" },
      { k: "tags", t: "list", label: "Tags (one per line)" },
      { k: "team", t: "text", label: "Team / lab" },
      { k: "problemStatement", t: "textarea", label: "Problem statement" },
      { k: "proposedSolution", t: "textarea", label: "Proposed solution" },
      { k: "workingPrinciple", t: "textarea", label: "Working principle" },
      { k: "hardware", t: "list", label: "Hardware (one item per line)" },
      { k: "software", t: "list", label: "Software (one item per line)" },
      { k: "technologies", t: "list", label: "Technologies (one per line)" },
      { k: "outcomes", t: "list", label: "Outcomes (one per line)" },
      { k: "gallery", t: "list", label: "Gallery image paths / HTTPS URLs (one per line)" },
      { k: "featured", t: "check", label: "Featured on home page" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { featured: false, order: 1, status: "Active" },
    image: "imageUrl",
    title: (d) => d.title,
    sub: (d) => d.category || d.domain || ""
  },
  team: {
    label: "member",
    sort: ["order", "asc"],
    fields: [
      { k: "name", t: "text", req: true, label: "Name" },
      { k: "role", t: "text", req: true, label: "Role / position" },
      { k: "group", t: "select", opts: ["student", "faculty"], label: "Group" },
      { k: "department", t: "text", label: "Department" },
      { k: "email", t: "email", label: "Email (optional)" },
      { k: "linkedin", t: "text", label: "LinkedIn URL" },
      { k: "photoUrl", t: "image", label: "Photo" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { group: "student", order: 1 },
    image: "photoUrl",
    title: (d) => d.name,
    sub: (d) => `${d.role || ""} • ${d.group || "student"}`
  },
  gallery: {
    label: "media item",
    sort: ["order", "asc"],
    fields: [
      { k: "caption", t: "text", req: true, label: "Caption" },
      { k: "mediaType", t: "select", opts: ["image", "video"], label: "Media type" },
      { k: "imageUrl", t: "image", req: true, label: "Photo or video URL (HTTPS)" },
      { k: "event", t: "text", label: "Event name (optional)" },
      { k: "order", t: "num", label: "Display order" }
    ],
    defaults: { order: 1, mediaType: "image" },
    image: "imageUrl",
    title: (d) => d.caption,
    sub: (d) => `${d.mediaType === "video" ? "Video" : "Photo"}${d.event ? ` • ${d.event}` : ""}`
  },
  resources: {
    label: "resource",
    sort: ["order", "asc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Title" },
      { k: "category", t: "text", label: "Category" },
      { k: "level", t: "text", label: "Level" },
      { k: "desc", t: "textarea", label: "Description" },
      { k: "tags", t: "list", label: "Tags (one per line)" },
      { k: "url", t: "text", label: "Resource URL (HTTPS)" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { order: 1 },
    title: (d) => d.title,
    sub: (d) => d.category || ""
  },
  achievements: {
    label: "achievement",
    sort: ["order", "asc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Achievement title" },
      { k: "badge", t: "text", label: "Award / badge" },
      { k: "subtitle", t: "text", label: "Subtitle" },
      { k: "description", t: "textarea", label: "Description" },
      { k: "team", t: "text", label: "Member / team" },
      { k: "institution", t: "text", label: "Institution" },
      { k: "projectId", t: "text", label: "Related project ID" },
      { k: "highlights", t: "list", label: "Highlights (one per line)" },
      { k: "image", t: "image", label: "Image URL or upload" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { order: 1 },
    image: "image",
    title: (d) => d.title,
    sub: (d) => `${d.team || d.member || ""} • ${d.badge || d.date || ""}`
  },
  tasks: {
    label: "task",
    sort: ["createdAt", "desc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Task" },
      { k: "detail", t: "textarea", label: "Details" },
      { k: "assigneeEmail", t: "email", label: "Assignee email (optional)" },
      { k: "assigneeRole", t: "select", opts: [{ value: "", label: "No role assignment" }, ...Object.entries(ROLES).filter(([r]) => r !== "owner").map(([value, info]) => ({ value, label: info.label }))], label: "Or assign to a whole role" },
      { k: "due", t: "text", label: "Due (e.g. 2026-11-20)" },
      { k: "status", t: "select", opts: ["open", "in_progress", "done"], label: "Status" }
    ],
    defaults: { status: "open" },
    title: (d) => d.title,
    sub: (d) => `${d.status} • ${d.assigneeEmail || d.assigneeRole || "unassigned"}${d.due ? ` • due ${d.due}` : ""}`
  }
};
const HINTS = {
  announcements: "Published instantly to the home-page notice board (pinned first).",
  events: "Full event pages read these documents; rich seeded fields are preserved on edit.",
  projects: "Featured projects appear on the home page grid.",
  team: "group=faculty shows in Faculty Mentorship, students in the Executive Council. Swap photos any time.",
  gallery: "Photos appear in the home-page gallery with lightbox. Upload replaces or adds new shots.",
  resources: "Learning Hub guides shown on the Resources page with category filters.",
  achievements: "Hall of Achievers cards.",
  tasks: "Assign work to a person or a role. Assignees can mark their tasks done from their own login."
};

/* ---------------- view switching (immune to cached CSS) ---------------- */
function showView(which) {
  const set = (el, on) => { if (el) { el.hidden = !on; el.style.display = on ? "" : "none"; } };
  set($("#loginView"), which === "out");
  set($("#changeView"), which === "change");
  set($("#adminShell"), which === "in");
}

/* ---------------- auth boot ---------------- */
async function resolveRole(user) {
  const email = (user.email || "").toLowerCase();
  if (email === OWNER_EMAIL) return { role: "owner", mustChange: false, perms: SECTIONS };
  try {
    const { db } = await sdk();
    const snap = await dbMod.getDoc(dbMod.doc(db, "admin_roles", email));
    if (snap.exists() && snap.data().role && snap.data().role !== "owner" && ROLES[snap.data().role]) {
      const d = snap.data();
      return {
        role: d.role,
        mustChange: d.mustChangePassword === true,
        needsVerification: d.emailVerificationRequired === true,
        perms: Array.isArray(d.perms) ? d.perms.filter((p) => SECTIONS.includes(p)) : (LEGACY_PERMS[d.role] || [])
      };
    }
  } catch { /* no role doc or read denied → fall through */ }
  for (const force of [false, true]) {
    const t = await user.getIdTokenResult(force).catch(() => null);
    if (t && t.claims.admin) return { role: "owner", mustChange: false, perms: SECTIONS };
  }
  return null;
}

async function boot() {
  if (!isConfigured) {
    showView("out");
    $("#loginError").textContent = "Firebase config missing: paste your web config into public/js/config.js first.";
    return;
  }
  const { auth } = await sdk();
  authMod.onAuthStateChanged(auth, async (user) => {
    if (roleWatchUnsubscribe) { roleWatchUnsubscribe(); roleWatchUnsubscribe = null; }
    if (!user) {
      stopAdminActivity(); stopAdminPresenceWatch(); starterContentSyncUser = "";
      if (me) { try { sessionStorage.removeItem(`embedx-admin-login-recorded:${me}`); } catch { /* storage may be disabled */ } }
      showView("out"); return;
    }
    await user.reload().catch(() => {});
    if (!isCollegeEmail(user.email) || !user.emailVerified) {
      await authMod.signOut(auth);
      showView("out");
      $("#loginError").textContent = "Admin access also requires a verified @trp.srmtrichy.edu.in college email.";
      return;
    }
    await user.getIdToken(true);
    const rr = await resolveRole(user);
    if (!rr) {
      await authMod.signOut(auth);
      showView("out");
      $("#loginError").textContent = `Signed in as ${user.email || "this account"}, but it has no portal role yet. Ask the owner to add it under Admins & roles (or run scripts/grant-admin.js), then sign in again.`;
      return;
    }
    me = (user.email || "").toLowerCase();
    role = rr.role;
    perms = rr.perms || [];
    if (rr.needsVerification) {
      await user.reload().catch(() => {});
      if (!user.emailVerified) {
        await authMod.signOut(auth);
        showView("out");
        $("#loginError").textContent = "Verify your college email using the link sent to your inbox, then sign in again. Portal access stays locked until verification.";
        return;
      }
      try {
        await user.getIdToken(true);
        const { db } = await sdk();
        await dbMod.updateDoc(dbMod.doc(db, "admin_roles", me), { emailVerificationRequired: false });
      } catch (err) { console.warn("Could not clear verified-email flag yet", err); }
    }
    if (rr.mustChange) { showView("change"); return; }
    startAdminActivity();
    hasTaskAccess = can("tasks");
    if (PAGE === "tasks" && !hasTaskAccess) hasTaskAccess = (await myTasks()).length > 0;
    if (!canAccessAdminPage(PAGE)) { PAGE = "overview"; document.body.dataset.adminPage = PAGE; history.replaceState({ page: PAGE }, "", "/admin/"); }
    if (role !== "owner") {
      try {
        const { db } = await sdk();
        let firstRoleSnapshot = true;
        let previousRoleState = "";
        roleWatchUnsubscribe = dbMod.onSnapshot(dbMod.doc(db, "admin_roles", me), (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() : null;
          const state = data ? JSON.stringify({
            role: data.role || "",
            perms: (Array.isArray(data.perms) ? data.perms : LEGACY_PERMS[data.role] || []).filter((section) => SECTIONS.includes(section)).sort(),
            mustChangePassword: data.mustChangePassword === true,
            emailVerificationRequired: data.emailVerificationRequired === true
          }) : "missing";
          if (firstRoleSnapshot) { firstRoleSnapshot = false; previousRoleState = state; return; }
          if (state !== previousRoleState) {
            previousRoleState = state;
            location.reload();
          }
        }, (error) => console.warn("Live admin-role updates are unavailable", error));
      } catch (error) { console.warn("Could not watch admin-role updates", error); }
    }
    showView("in");
    renderShell();
    renderMain();
    route();
    if (!can("tasks") && PAGE !== "tasks") void myTasks().then((assigned) => {
      const next = assigned.length > 0;
      if (next !== hasTaskAccess) { hasTaskAccess = next; renderAdminNav(); }
    });
    if ((role === "owner" || can("gallery")) && starterContentSyncUser !== me) {
      starterContentSyncUser = me;
      const sections = role === "owner" ? Object.keys(STARTER_CONTENT) : ["gallery"];
      void restoreStarterContent({ quiet: true, sections });
    }
  });

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#loginError").textContent = "";
    const btn = $("#loginForm button[type=submit]");
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Signing in…";
    try {
      await authMod.signInWithEmailAndPassword(auth, $("#li-email").value.trim(), $("#li-pass").value);
    } catch (err) {
      $("#loginError").textContent = err.code === "auth/invalid-credential" ? "Invalid email or password." : err.message;
      btn.disabled = false; btn.textContent = label;
    }
  });

  // "Forgot password?" — Firebase emails them a reset link (works for any existing login)
  $("#forgot")?.addEventListener("click", async () => {
    const email = $("#li-email").value.trim();
    if (!email.includes("@")) { $("#loginError").textContent = "Type your email first, then tap “Forgot password?”."; return; }
    try {
      await authMod.sendPasswordResetEmail(auth, email);
      $("#loginError").textContent = "";
      toast("Password-reset email sent ✔", "ok");
    } catch (err) { $("#loginError").textContent = err.message; }
  });

  // Forced first-login password change (temporary password from the owner)
  $("#changeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#changeError"); errEl.textContent = "";
    const a = $("#cp-new").value, b = $("#cp-confirm").value;
    if (a.length < 8) { errEl.textContent = "Use at least 8 characters."; return; }
    if (a !== b) { errEl.textContent = "Passwords don't match."; return; }
    try {
      await authMod.updatePassword(auth.currentUser, a);
      const { db } = await sdk();
      await dbMod.updateDoc(dbMod.doc(db, "admin_roles", me), { mustChangePassword: false });
      toast("Password updated ✔ Welcome aboard!", "ok");
      setTimeout(() => location.reload(), 600);
    } catch (err2) {
      errEl.textContent = err2.code === "auth/requires-recent-login" ? "Session expired — sign in again, then retry." : err2.message;
    }
  });
}

/* ---------------- shell (top bar + sidebar) ---------------- */
function renderAdminNav() {
  const nav = $("#adminNav");
  if (!nav) return;
  nav.innerHTML = NAV.filter(([id]) => canAccessAdminPage(id))
    .map(([id, label, href]) => `<a href="${href}" class="${id === PAGE ? "active" : ""}">${esc(label)}</a>`).join("");
}
function renderShell() {
  $("#adminTop").innerHTML = `
    <div class="wrap admin-top-inner">
      <a class="brand admin-brand" href="/" aria-label="EMBEDX — Department of EEE, SRM TRP Engineering College"><img src="/assets/images/embedx-circle-logo.webp" alt="" width="38" height="38" /><span class="brand-copy"><span class="brand-name">EMBED<span>X</span></span><span class="brand-sub">Department of EEE</span><span class="brand-institution">SRM TRP Engineering College · Admin</span></span><span class="admin-college-logo-frame"><img class="admin-college-mark" src="/assets/images/srm-trp-college-attached.png?v=college-logo-mark-20261105" alt="SRM TRP Engineering College logo" /></span></a>
      <div class="admin-top-actions">
        <span class="chip chip-accent" title="Signed in as">${esc(me)}</span>
        <span class="chip" title="Your role">${esc(ROLES[role].label)}</span>
        <a class="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener noreferrer">View site ↗</a>
        <button class="btn btn-ghost btn-sm" id="signOut">Sign out</button>
      </div>
    </div>`;
  $("#signOut").addEventListener("click", async () => {
    try { sessionStorage.removeItem(`embedx-admin-login-recorded:${me}`); } catch { /* storage may be disabled */ }
    const { auth } = await sdk(); await authMod.signOut(auth); location.href = "/admin/";
  });
  renderAdminNav();
}

function noteReadOnly() {
  const n = $("#roleNote");
  if (n && !can(PAGE)) n.innerHTML = `<span class="chip">👁 View-only — your role (${esc(ROLES[role].label)}) can read but not edit this section.</span>`;
}

function route() {
  if (PAGE === "overview") return renderOverview();
  if (PAGE === "admins") return renderAdmins();
  if (PAGE === "forms") return renderForms();
  if (PAGE === "site") return renderWebsiteSettings();
  return renderCollection(PAGE);
}

/* ---------------- instant client-side navigation ---------------- */
function renderMain() {
  const meta = PAGES[PAGE] || PAGES.overview;
  $("#adminMain").innerHTML = `
    <div class="admin-head">
      <div>
        <h1 style="margin:0 0 .2rem">${esc(meta.h1)}</h1>
        <p class="muted" style="font-size:.9rem;margin:0">${esc(meta.hint)}</p>
        <div id="roleNote" style="margin-top:.5rem"></div>
      </div>
      ${meta.crud ? '<button class="btn btn-primary" id="addItem" hidden>+ New</button>' : ""}
    </div>
    ${meta.crud ? '<div id="statsStrip" class="admin-stats" style="margin:1rem 0"></div>' : ""}
    <div id="pageRegion"></div>`;
  document.title = `${meta.h1} — EMBEDX Admin`;
}

function navigate(page, push = true) {
  if (!PAGES[page] || !canAccessAdminPage(page)) page = "overview";
  if (formsRefreshTimer) { clearInterval(formsRefreshTimer); formsRefreshTimer = null; }
  if (page !== "admins") stopAdminPresenceWatch();
  PAGE = page;
  document.body.dataset.adminPage = page;
  if (push) history.pushState({ page }, "", page === "overview" ? "/admin/" : `/admin/${page}`);
  closeModals();
  renderShell();
  renderMain();
  route();
  window.scrollTo({ top: 0 });
}

/* ---------------- overview ---------------- */
async function renderOverview() {
  const region = $("#pageRegion");
  region.innerHTML = `<div class="skeleton" style="min-height:200px"></div>`;
  const names = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements", "forms"].filter(canView);
  let counts = [];
  if (isConfigured) {
    try {
      const { db } = await sdk();
      counts = await Promise.all(names.map(async (n) => [n, await countCollection(db, n)]));
    } catch { counts = []; }
  }
  const mine = await myTasks();
  if (!can("tasks")) {
    const next = mine.length > 0;
    if (next !== hasTaskAccess) { hasTaskAccess = next; renderAdminNav(); }
  }
  if (PAGE !== "overview" || !region.isConnected) return;
  region.innerHTML = `
    <p class="muted" style="margin:.2rem 0 1rem">${esc(ROLES[role].blurb)}.</p>
    <div class="admin-cards">
      ${counts.map(([n, c]) => `<a class="admin-card card" href="/admin/${n}"><b>${c}</b><span>${n}</span></a>`).join("")}
    </div>
    <h2 style="margin:1.8rem 0 .6rem">My open tasks ${mine.length ? `(${mine.length})` : ""}</h2>
    ${mine.length ? mine.map(taskRow).join("") : `<p class="muted">Nothing assigned to you right now. ${role === "owner" || role === "president" ? "Assign work from the <a href='/admin/tasks'>Tasks</a> page." : ""}</p>`}
    <h2 style="margin:1.8rem 0 .6rem">Your access</h2>
    <div class="admin-list">
      ${NAV.filter(([id]) => id !== "overview" && id !== "tasks" && (id !== "admins" || role === "owner") && canView(id)).map(([id, label]) =>
        `<div class="admin-row card"><div class="admin-row-main"><strong>${esc(label)}</strong><span class="muted">${can(id) ? "read + write" : "read only"}</span></div></div>`).join("")}
      <div class="admin-row card"><div class="admin-row-main"><strong>Tasks</strong><span class="muted">${can("tasks") ? "assign + edit" : "your assigned tasks"}</span></div></div>
    </div>`;
}

async function restoreStarterContent({ quiet = false, sections = Object.keys(STARTER_CONTENT) } = {}) {
  let added = 0;
  try {
    if (!isConfigured || !sections.length || !sections.every((section) => can(section))) return 0;
    const { db } = await sdk();
    for (const collectionName of sections) {
      const rows = STARTER_CONTENT[collectionName] || [];
      if (!rows.length) continue;
      const tombstoneQuery = dbMod.query(
        dbMod.collection(db, "content_tombstones"),
        dbMod.where("section", "==", collectionName)
      );
      const tombstoneSnapshot = await dbMod.getDocs(tombstoneQuery);
      const deletedIds = new Set(tombstoneSnapshot.docs.map((doc) => String(doc.get("contentId") || "")));
      let presentIds = new Set();
      let presentGalleryImages = new Set();
      if (collectionName === "gallery") {
        const currentGallery = await dbMod.getDocs(dbMod.collection(db, "gallery"));
        presentIds = new Set(currentGallery.docs.map((doc) => doc.id));
        presentGalleryImages = new Set(currentGallery.docs.map((doc) => doc.get("imageUrl")).filter(Boolean));
      }
      const candidates = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
        row.id && !deletedIds.has(row.id) && !presentIds.has(row.id)
        && !(collectionName === "gallery" && presentGalleryImages.has(row.imageUrl))
      );
      if (!candidates.length) continue;
      const count = await dbMod.runTransaction(db, async (transaction) => {
        if (candidates.length > 450) throw new Error(`${collectionName} has too many missing starter records to restore safely in one transaction.`);
        const refs = candidates.map(({ row }) => dbMod.doc(db, collectionName, row.id));
        const snapshots = [];
        for (const ref of refs) snapshots.push(await transaction.get(ref));
        let created = 0;
        snapshots.forEach((snapshot, index) => {
          if (snapshot.exists()) return;
          const { row, index: order } = candidates[index];
          const { id, ...data } = row;
          if ((collectionName === "resources" || collectionName === "achievements") && !Number.isFinite(data.order)) data.order = order + 1;
          transaction.set(refs[index], data);
          created++;
        });
        return created;
      });
      added += count;
    }
    statsCache = null;
    if (added) {
      if (PAGE === "overview") await renderOverview();
      else if (STARTER_CONTENT[PAGE]) await route();
      loadStats();
    }
    if (!quiet && added) toast(`Restored ${added} missing starter record${added === 1 ? "" : "s"}. Existing content was preserved.` , "ok");
    return added;
  } catch (err) {
    console.error("Automatic starter-content sync failed", err);
    if (!quiet) toast(`Automatic content sync failed: ${err.message}`, "err");
    else toast("Automatic content sync could not finish. Check Firestore permissions and rules deployment.", "err");
    return added;
  }
}

async function myTasks() {
  if (!isConfigured) return [];
  try {
    const { db } = await sdk();
    const ref = dbMod.collection(db, "tasks");
    let docs;
    if (can("tasks")) docs = (await dbMod.getDocs(ref)).docs;
    else {
      const queries = [dbMod.query(ref, dbMod.where("assigneeEmail", "==", me))];
      if (role) queries.push(dbMod.query(ref, dbMod.where("assigneeRole", "==", role)));
      const snaps = await Promise.all(queries.map((q) => dbMod.getDocs(q)));
      docs = [...new Map(snaps.flatMap((snap) => snap.docs.map((d) => [d.id, d]))).values()];
    }
    return docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((t) => t.status !== "done" && (t.assigneeEmail === me || (t.assigneeRole && t.assigneeRole === role)))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  } catch (err) { console.warn("Could not load assigned tasks", err); return []; }
}
const taskRow = (t) => `
  <div class="admin-row card ${t.status === "done" ? "task-done" : ""}">
    <div class="admin-row-main">
      <strong>${esc(t.title)}</strong>
      <span class="muted">${esc(t.detail || "")}</span>
      <span class="muted">${t.status} • ${esc(t.assigneeEmail || t.assigneeRole || "unassigned")}${t.due ? ` • due ${esc(t.due)}` : ""}</span>
    </div>
  </div>`;

/* ---------------- editable public website settings ---------------- */
async function renderWebsiteSettings() {
  const region = $("#pageRegion");
  if (!canView("site")) { region.innerHTML = `<p class="muted">Website settings access is not assigned to your account.</p>`; return; }
  region.innerHTML = `<div class="skeleton" style="min-height:180px"></div>`;
  try {
    const { db } = await sdk();
    const snap = await dbMod.getDoc(dbMod.doc(db, "site_settings", "site"));
    const settings = normalizeSiteSettings(snap.exists() ? snap.data() : {});
    if (PAGE !== "site" || !region.isConnected) return;
    region.innerHTML = `<section class="admin-site-settings card"><div class="admin-form-toolbar"><div><h2>Public contact &amp; social links</h2><p class="muted">Edit these once here; the public footer and Contact page update live after saving.</p></div></div>
      <div class="admin-site-logo-preview"><img src="${DEFAULT_SITE_SETTINGS.collegeLogoUrl}" alt="Official SRM TRP Engineering College logo" /><div><strong>Official college logo</strong><p class="muted">This exact Department Information logo is used consistently across the footer, contact page, and admin portal.</p></div></div>
      <div class="form-grid admin-site-grid">
        ${siteSettingField("collegeWebsiteUrl", "Official college website", settings.collegeWebsiteUrl, "https://www.example.edu", "url")}
        ${siteSettingField("contactEmail", "Public contact email", settings.contactEmail, "department@example.edu", "email")}
        ${siteSettingField("phoneDisplay", "Public phone number", settings.phoneDisplay, "+91 431 2908050", "tel")}
        ${siteSettingField("linkedinUrl", "LinkedIn URL", settings.linkedinUrl, "https://www.linkedin.com/...", "url")}
        ${siteSettingField("instagramUrl", "Instagram URL", settings.instagramUrl, "https://www.instagram.com/...", "url")}
        ${siteSettingField("facebookUrl", "Facebook URL", settings.facebookUrl, "https://www.facebook.com/...", "url")}
      </div>
      <section class="hero-settings-panel">
        <div class="admin-form-toolbar"><div><h2>Homepage banner &amp; image</h2><p class="muted">Paste a direct image URL or upload a photo. Adjust crop position, fit, alt text, and caption; this one setting updates the public homepage for everyone.</p></div></div>
        <div class="hero-settings-preview"><img id="heroImagePreview" src="${esc(settings.heroImageUrl)}" alt="Homepage banner preview" style="object-fit:${esc(settings.heroImageFit)};object-position:${settings.heroImagePositionX}% ${settings.heroImagePositionY}%" /><span>Live crop preview</span></div>
        <div class="form-grid admin-site-grid">
          ${siteSettingField("heroImageUrl", "Image URL", settings.heroImageUrl, "/assets/images/... or direct HTTPS image URL", "url")}
          <div class="field"><label for="heroImageFile">Choose media from your device</label><input id="heroImageFile" type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif" ${can("site") ? "" : "disabled"} /><small class="muted">Uploads are resized and optimized to WebP (max 25 MB input).</small><small class="muted" id="heroUploadStatus" role="status" aria-live="polite"></small></div>
          ${siteSettingField("heroImageAlt", "Accessibility alt text", settings.heroImageAlt, "Describe the image clearly", "text")}
          <div class="field"><label for="heroImageFit">Image fit</label><select id="heroImageFit" name="heroImageFit" ${can("site") ? "" : "disabled"}><option value="cover" ${settings.heroImageFit === "cover" ? "selected" : ""}>Fill banner (cover)</option><option value="contain" ${settings.heroImageFit === "contain" ? "selected" : ""}>Show full image (contain)</option></select></div>
          <div class="field"><label for="heroImagePositionX">Horizontal focus <output id="heroImagePositionXValue">${settings.heroImagePositionX}%</output></label><input type="range" id="heroImagePositionX" name="heroImagePositionX" min="0" max="100" value="${settings.heroImagePositionX}" ${can("site") ? "" : "disabled"} /></div>
          <div class="field"><label for="heroImagePositionY">Vertical focus <output id="heroImagePositionYValue">${settings.heroImagePositionY}%</output></label><input type="range" id="heroImagePositionY" name="heroImagePositionY" min="0" max="100" value="${settings.heroImagePositionY}" ${can("site") ? "" : "disabled"} /></div>
          ${siteSettingField("heroImageCaption", "Banner caption (blank hides it)", settings.heroImageCaption, "From circuit to system", "text")}
          ${siteSettingField("heroImageSubcaption", "Banner sub-caption", settings.heroImageSubcaption, "Embedded · Robotics · Automation", "text")}
        </div>
      </section>
      ${can("site") ? `<div class="admin-site-actions"><p class="muted" id="siteSettingsMessage" role="status"></p><button class="btn btn-primary" id="saveSiteSettings">Save website settings</button></div>` : `<p class="muted">Read only — ask the owner to grant Website settings permission.</p>`}
    </section><div id="pageCopyEditor"></div>`;
    await renderPageCopyEditor($("#pageCopyEditor"), db);
    const heroPreview = region.querySelector("#heroImagePreview");
    const heroUrlInput = region.querySelector("[name=heroImageUrl]");
    const updateHeroPreview = () => {
      if (!heroPreview) return;
      if (heroUrlInput.value.trim()) heroPreview.src = heroUrlInput.value.trim();
      heroPreview.style.objectFit = region.querySelector("[name=heroImageFit]").value;
      heroPreview.style.objectPosition = `${region.querySelector("[name=heroImagePositionX]").value}% ${region.querySelector("[name=heroImagePositionY]").value}%`;
      for (const axis of ["X", "Y"]) region.querySelector(`#heroImagePosition${axis}Value`).textContent = `${region.querySelector(`[name=heroImagePosition${axis}]`).value}%`;
    };
    heroUrlInput?.addEventListener("input", updateHeroPreview);
    region.querySelector("[name=heroImageFit]")?.addEventListener("change", updateHeroPreview);
    region.querySelector("[name=heroImagePositionX]")?.addEventListener("input", updateHeroPreview);
    region.querySelector("[name=heroImagePositionY]")?.addEventListener("input", updateHeroPreview);
    region.querySelector("#heroImageFile")?.addEventListener("change", async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      const isSupportedImage = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)
        || /\.(?:jpe?g|png|webp|heic|heif)$/i.test(file.name || "");
      if (!isSupportedImage || file.size > 25 * 1024 * 1024) {
        toast("Choose a JPG, PNG, WebP, or iPhone HEIC/HEIF image under 25 MB.", "err"); event.currentTarget.value = ""; return;
      }
      const picker = event.currentTarget;
      const status = region.querySelector("#heroUploadStatus");
      picker.disabled = true;
      if (status) status.textContent = "Preparing image…";
      try {
        heroUrlInput.value = await uploadOptimizedImage(file, "site", (progress) => {
          if (status) status.textContent = progress.phase === "upload"
            ? `Uploading banner: ${progress.percent}%`
            : progress.phase === "finish" ? "Finishing upload: getting the public link…"
              : progress.phase === "connecting" ? "Connecting to Firebase Storage…" : "Preparing optimized banner…";
        });
        updateHeroPreview();
        if (status) status.textContent = "Upload complete. Save website settings to publish it.";
        toast("Banner image uploaded and optimized. Save website settings to publish it.", "ok");
      } catch (error) {
        const message = uploadErrorMessage(error);
        if (status) status.textContent = `Upload failed: ${message}`;
        toast(`Banner upload failed: ${message}`, "err");
      } finally { picker.disabled = false; picker.value = ""; }
    });
    region.querySelector("#saveSiteSettings")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const message = region.querySelector("#siteSettingsMessage");
      const fieldValue = (key) => region.querySelector(`[name="${key}"]`).value.trim();
      const updated = {
        collegeWebsiteUrl: fieldValue("collegeWebsiteUrl"),
        contactEmail: fieldValue("contactEmail"),
        phoneDisplay: fieldValue("phoneDisplay"),
        linkedinUrl: fieldValue("linkedinUrl"),
        instagramUrl: fieldValue("instagramUrl"),
        facebookUrl: fieldValue("facebookUrl"),
        heroImageUrl: fieldValue("heroImageUrl"),
        heroImageAlt: fieldValue("heroImageAlt").slice(0, 240),
        heroImageFit: fieldValue("heroImageFit"),
        heroImagePositionX: Math.min(100, Math.max(0, Number(fieldValue("heroImagePositionX")) || 0)),
        heroImagePositionY: Math.min(100, Math.max(0, Number(fieldValue("heroImagePositionY")) || 0)),
        heroImageCaption: fieldValue("heroImageCaption").slice(0, 120),
        heroImageSubcaption: fieldValue("heroImageSubcaption").slice(0, 180)
      };
      const urlValid = (value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
      const heroImageValid = (value) => value.startsWith("/assets/images/") && !value.split(/[?#]/, 1)[0].split("/").includes("..") || urlValid(value);
      if (!heroImageValid(updated.heroImageUrl)) { message.textContent = "Use a local /assets/images/ banner or a direct HTTPS image URL (or upload a file above)."; return; }
      if (!["cover", "contain"].includes(updated.heroImageFit)) { message.textContent = "Choose a valid banner image fit."; return; }
      if (updated.heroImageAlt.length > 240) { message.textContent = "Banner alt text must be 240 characters or fewer."; return; }
      if (!urlValid(updated.collegeWebsiteUrl)) { message.textContent = "The official website must be a valid HTTPS URL."; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(updated.contactEmail) || updated.contactEmail.length > 120) { message.textContent = "Enter a valid contact email (up to 120 characters)."; return; }
      if (!/^[+0-9()\s-]{8,24}$/.test(updated.phoneDisplay) || updated.phoneDisplay.replace(/\D/g, "").length < 8) { message.textContent = "Enter a phone number with 8–15 digits."; return; }
      for (const key of ["linkedinUrl", "instagramUrl", "facebookUrl"]) if (updated[key] && !urlValid(updated[key])) { message.textContent = `${key.replace("Url", "")} must be an HTTPS URL or left blank.`; return; }
      updated.phoneHref = `tel:${updated.phoneDisplay.replace(/\D/g, "")}`;
      try { updated.collegeWebsiteLabel = new URL(updated.collegeWebsiteUrl).hostname.replace(/^www\./, ""); } catch { updated.collegeWebsiteLabel = updated.collegeWebsiteUrl; }
      button.disabled = true; button.textContent = "Saving…"; message.textContent = "";
      try {
        await dbMod.setDoc(dbMod.doc(db, "site_settings", "site"), { ...updated, updatedAt: new Date().toISOString() });
        toast("Website settings saved. Open public pages will update automatically.", "ok");
        message.textContent = "Saved successfully. Public pages update automatically while open.";
      } catch (err) { message.textContent = `Save failed: ${err.message}`; toast("Could not save website settings.", "err"); }
      finally { button.disabled = false; button.textContent = "Save website settings"; }
    });
  } catch (err) {
    console.error("Website settings failed", err);
    region.innerHTML = `<p class="muted">Could not load website settings: ${esc(err.message)}</p>`;
  }
}

async function renderPageCopyEditor(region, db) {
  if (!region) return;
  const groups = Object.entries(PAGE_CONTENT);
  region.innerHTML = `<section class="admin-site-settings card editor-section" style="margin-top:1.2rem">
    <div class="admin-form-toolbar"><div><h2>Navigation &amp; footer links</h2><p class="muted">Inspect each visible link, edit its label or destination, remove unwanted links, and add new ones. Unsafe destinations are rejected on the public site.</p></div></div>
    <div id="siteLinkGroups"></div>
    ${can("site") ? `<div class="admin-site-actions"><p class="muted" id="siteLinksMessage" role="status"></p><button class="btn btn-primary" id="saveSiteLinks">Save links</button></div>` : `<p class="muted">Read only — ask the owner to grant Website settings permission.</p>`}
  </section>
  <section class="admin-site-settings card editor-section" style="margin-top:1.2rem">
    <div class="admin-form-toolbar"><div><h2>Public page content &amp; features</h2><p class="muted">Edit page copy, then add or remove heading, text, feature, link, image, or video blocks. Blocks appear below the page’s existing content.</p></div></div>
    <div class="field" style="max-width:420px"><label for="pageCopySelect">Choose a page or shared area</label><select id="pageCopySelect">${groups.map(([id, group]) => `<option value="${esc(id)}">${esc(group.label)}</option>`).join("")}</select></div>
    <div id="pageCopyFields" class="form-grid admin-site-grid" style="margin-top:1rem"></div>
    <div id="pageBlocksSection"><div class="admin-site-actions"><h3>Additional page features</h3></div><div id="pageBlocksEditor"></div></div>
    ${can("site") ? `<div class="admin-site-actions"><p class="muted" id="pageCopyMessage" role="status"></p><button class="btn btn-primary" id="savePageCopy">Save page content</button></div>` : `<p class="muted">Read only — ask the owner to grant Website settings permission.</p>`}
  </section>`;

  const canEdit = can("site");
  const linksRegion = region.querySelector("#siteLinkGroups");
  const linksMessage = region.querySelector("#siteLinksMessage");
  let currentLinks = normalizeSiteLinks(DEFAULT_SITE_LINKS);
  const linkMarkup = (group, row = {}) => `<div class="admin-link-row" data-link-row>
    <div class="field"><label>Visible label</label><input data-link-label maxlength="100" value="${esc(row.label || "")}" placeholder="e.g. Join the club" ${canEdit ? "" : "disabled"}></div>
    <div class="field"><label>Link destination</label><input data-link-href maxlength="500" value="${esc(row.href || "")}" placeholder="/pages/about.html or https://example.edu" ${canEdit ? "" : "disabled"}></div>
    ${canEdit ? `<button class="btn btn-ghost" type="button" data-remove-link aria-label="Remove link">Remove</button>` : ""}
  </div>`;
  const paintLinks = () => {
    linksRegion.innerHTML = SITE_LINK_GROUPS.map(([group, title]) => `<section class="admin-link-group" data-link-group="${esc(group)}"><div class="admin-form-toolbar"><h3>${esc(title)}</h3>${canEdit ? `<button class="btn btn-ghost" type="button" data-add-link="${esc(group)}">Add link</button>` : ""}</div><div class="admin-link-list">${currentLinks[group].map((row) => linkMarkup(group, row)).join("")}</div></section>`).join("");
  };
  try {
    const snap = await dbMod.getDoc(dbMod.doc(db, "site_links", "links"));
    if (snap.exists()) currentLinks = normalizeSiteLinks(snap.data());
  } catch (error) { console.warn("Could not load navigation links", error); }
  paintLinks();
  linksRegion.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-link]");
    const remove = event.target.closest("[data-remove-link]");
    if (add && canEdit) {
      const group = add.dataset.addLink;
      const container = linksRegion.querySelector(`[data-link-group="${group}"] .admin-link-list`);
      const maxRows = group === "headerJoin" ? 5 : 25;
      if (container.children.length >= maxRows) { linksMessage.textContent = `This group is limited to ${maxRows} links.`; return; }
      const row = { id: `link-${Date.now()}`, label: "", href: "" };
      container.insertAdjacentHTML("beforeend", linkMarkup(group, row));
      container.lastElementChild.querySelector("[data-link-label]")?.focus();
    }
    if (remove && canEdit) remove.closest("[data-link-row]").remove();
  });
  region.querySelector("#saveSiteLinks")?.addEventListener("click", async (event) => {
    if (!canEdit) return;
    const button = event.currentTarget;
    const updated = {};
    for (const [group] of SITE_LINK_GROUPS) {
      updated[group] = [...linksRegion.querySelectorAll(`[data-link-group="${group}"] [data-link-row]`)].map((row, index) => ({
        id: `link-${group}-${index + 1}`,
        label: row.querySelector("[data-link-label]").value.trim(),
        href: row.querySelector("[data-link-href]").value.trim()
      })).filter((row) => row.label || row.href);
      for (const row of updated[group]) {
        if (!row.label || !row.href || !safeEditableHref(row.href)) {
          linksMessage.textContent = `In ${SITE_LINK_GROUPS.find(([key]) => key === group)[1]}, every link needs a label and a safe path, HTTPS URL, mailto address, or tel number.`;
          return;
        }
      }
    }
    button.disabled = true; button.textContent = "Saving…"; linksMessage.textContent = "";
    try {
      await dbMod.setDoc(dbMod.doc(db, "site_links", "links"), { ...normalizeSiteLinks(updated), updatedAt: new Date().toISOString() });
      toast("Navigation and footer links saved.", "ok"); linksMessage.textContent = "Saved. Open public pages update automatically.";
    } catch (error) { linksMessage.textContent = `Save failed: ${error.message}`; toast("Could not save links.", "err"); }
    finally { button.disabled = false; button.textContent = "Save links"; }
  });

  const select = region.querySelector("#pageCopySelect");
  const fieldsRegion = region.querySelector("#pageCopyFields");
  const blocksRegion = region.querySelector("#pageBlocksEditor");
  const message = region.querySelector("#pageCopyMessage");
  let activeContent = {};
  let activeBlocks = [];
  const blockTypes = ["heading", "text", "feature", "link", "image", "video"];
  const paintBlocks = () => {
    blocksRegion.innerHTML = `${activeBlocks.map((block, index) => `<article class="admin-content-block" data-content-block data-block-index="${index}">
      <div class="admin-form-toolbar"><strong>${esc(block.type[0].toUpperCase() + block.type.slice(1))} block</strong>${canEdit ? `<button class="btn btn-ghost" type="button" data-remove-block>Remove</button>` : ""}</div>
      <div class="form-grid admin-site-grid"><div class="field"><label>Block type</label><select data-block-field="type" ${canEdit ? "" : "disabled"}>${blockTypes.map((type) => `<option value="${type}" ${block.type === type ? "selected" : ""}>${type[0].toUpperCase() + type.slice(1)}</option>`).join("")}</select></div>
      <div class="field"><label>Title</label><input data-block-field="title" maxlength="180" value="${esc(block.title)}" ${canEdit ? "" : "disabled"}></div>
      <div class="field full"><label>Text / description</label><textarea data-block-field="body" maxlength="3000" rows="3" ${canEdit ? "" : "disabled"}>${esc(block.body)}</textarea></div>
      <div class="field"><label>Link label</label><input data-block-field="label" maxlength="100" value="${esc(block.label)}" ${canEdit ? "" : "disabled"}></div>
      <div class="field"><label>Link / media URL</label><input data-block-field="url" maxlength="1000" value="${esc(block.url)}" placeholder="https://…" ${canEdit ? "" : "disabled"}></div>
      <div class="field full"><label>Caption</label><input data-block-field="caption" maxlength="300" value="${esc(block.caption)}" ${canEdit ? "" : "disabled"}></div></div>
    </article>`).join("")}${canEdit ? `<div class="admin-site-actions"><label class="field"><span>Add a page feature</span><select id="newBlockType">${blockTypes.map((type) => `<option value="${type}">${type[0].toUpperCase() + type.slice(1)}</option>`).join("")}</select></label><button class="btn btn-ghost" id="addPageBlock" type="button">Add block</button></div>` : ""}`;
  };
  const syncBlocksFromForm = () => {
    const rows = [...blocksRegion.querySelectorAll("[data-content-block]")];
    activeBlocks = rows.map((row, index) => ({
      id: activeBlocks[index]?.id || `block-${index + 1}`,
      ...Object.fromEntries([...row.querySelectorAll("[data-block-field]")].map((field) => [field.dataset.blockField, field.value.trim()]))
    }));
  };
  const paint = async (pageId) => {
    const defaults = getPageContentDefaults(pageId);
    let stored = {};
    try {
      const snap = await dbMod.getDoc(dbMod.doc(db, "page_content", pageId));
      if (snap.exists()) stored = snap.data();
    } catch (error) { console.warn(`Could not read ${pageId} page content`, error); }
    if (!region.isConnected || select.value !== pageId) return;
    region.querySelector("#pageBlocksSection").hidden = pageId === "global";
    activeContent = Object.fromEntries(Object.keys(defaults).map((key) => [key, typeof stored[key] === "string" ? stored[key] : defaults[key]]));
    activeBlocks = normalizeEditableBlocks(stored.blocks);
    fieldsRegion.innerHTML = PAGE_CONTENT[pageId].fields.map(([key, label]) => `<div class="field full"><label for="copy-${esc(key)}">${esc(label)}</label><textarea id="copy-${esc(key)}" data-copy-key="${esc(key)}" rows="${activeContent[key].length > 180 ? 4 : 2}" maxlength="3000" ${canEdit ? "" : "disabled"}>${esc(activeContent[key])}</textarea></div>`).join("");
    paintBlocks();
    if (message) message.textContent = "";
  };
  select.addEventListener("change", () => { void paint(select.value); });
  blocksRegion.addEventListener("click", (event) => {
    if (!canEdit) return;
    if (event.target.closest("#addPageBlock")) {
      syncBlocksFromForm();
      if (activeBlocks.length >= 50) { if (message) message.textContent = "A page can contain up to 50 additional blocks."; return; }
      activeBlocks.push({ id: `block-${Date.now()}`, type: blocksRegion.querySelector("#newBlockType").value, title: "", body: "", label: "", url: "", caption: "" });
      paintBlocks();
    }
    const remove = event.target.closest("[data-remove-block]");
    if (remove) { const index = Number(remove.closest("[data-content-block]").dataset.blockIndex); syncBlocksFromForm(); activeBlocks.splice(index, 1); paintBlocks(); }
  });
  await paint(select.value);
  region.querySelector("#savePageCopy")?.addEventListener("click", async (event) => {
    if (!canEdit) return;
    const button = event.currentTarget;
    const updated = { ...activeContent };
    fieldsRegion.querySelectorAll("[data-copy-key]").forEach((field) => { updated[field.dataset.copyKey] = field.value.trim(); });
    const blocks = [...blocksRegion.querySelectorAll("[data-content-block]")].map((row) => Object.fromEntries([...row.querySelectorAll("[data-block-field]")].map((field) => [field.dataset.blockField, field.value.trim()]))).map((block, index) => ({ ...block, id: activeBlocks[index]?.id || `block-${index + 1}` }));
    for (const block of blocks) {
      if (["link", "image", "video"].includes(block.type) && block.url && !safeEditableHref(block.url, block.type === "image")) {
        message.textContent = `The ${block.type} block URL must use a safe HTTPS destination (or a local site path).`; return;
      }
    }
    button.disabled = true; button.textContent = "Saving…";
    if (message) message.textContent = "";
    try {
      await dbMod.setDoc(dbMod.doc(db, "page_content", select.value), { ...updated, blocks: normalizeEditableBlocks(blocks), updatedAt: new Date().toISOString() });
      toast(`${PAGE_CONTENT[select.value].label} content saved.`, "ok");
      if (message) message.textContent = "Saved successfully. Open pages update automatically.";
    } catch (error) { if (message) message.textContent = `Save failed: ${error.message}`; toast("Could not save page content.", "err"); }
    finally { button.disabled = false; button.textContent = "Save page content"; }
  });
}

function safeEditableHref(value, allowLocal = true) {
  const text = String(value || "").trim();
  if (!text || text.includes("\\") || text.startsWith("//")) return false;
  if (allowLocal && (text.startsWith("/") || text.startsWith("#"))) return true;
  try { return new URL(text).protocol === "https:"; } catch { return /^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|tel:\+?[0-9().\s-]{6,30})$/i.test(text); }
}
function normalizeEditableBlocks(value) {
  const types = new Set(["heading", "text", "feature", "link", "image", "video"]);
  if (!Array.isArray(value)) return [];
  return value.filter((block) => block && types.has(block.type)).slice(0, 50).map((block, index) => ({
    id: String(block.id || `block-${index + 1}`).slice(0, 80), type: block.type,
    title: typeof block.title === "string" ? block.title.slice(0, 180) : "",
    body: typeof block.body === "string" ? block.body.slice(0, 3000) : "",
    label: typeof block.label === "string" ? block.label.slice(0, 100) : "",
    url: typeof block.url === "string" ? block.url.slice(0, 1000) : "",
    caption: typeof block.caption === "string" ? block.caption.slice(0, 300) : ""
  }));
}

function siteSettingField(name, label, value, placeholder, type) {
  return `<div class="field"><label for="site-${name}">${esc(label)}</label><input id="site-${name}" name="${name}" type="${type}" value="${esc(value || "")}" placeholder="${esc(placeholder)}" autocomplete="off" /></div>`;
}

/* ---------------- forms and responses ---------------- */
async function renderForms() {
  if (formsRefreshTimer) { clearInterval(formsRefreshTimer); formsRefreshTimer = null; }
  const region = $("#pageRegion");
  if (!canView("forms")) { region.innerHTML = `<p class="muted">Forms access is not assigned to your account.</p>`; return; }
  region.innerHTML = `<div class="skeleton" style="min-height:180px"></div>`;
  try {
    const { db } = await sdk();
    const responses = dbMod.collection(db, "form_responses");
    const [formSnap, joinSnap, enquirySnap, eventSnap, joinResponseSnap, enquiryResponseSnap] = await Promise.all([
      dbMod.getDocs(dbMod.collection(db, "forms")),
      dbMod.getDocs(dbMod.collection(db, "members_applications")),
      dbMod.getDocs(dbMod.collection(db, "contact_messages")),
      dbMod.getDocs(dbMod.collection(db, "events")),
      dbMod.getDocs(dbMod.query(responses, dbMod.where("formId", "==", "join"))),
      dbMod.getDocs(dbMod.query(responses, dbMod.where("formId", "==", "enquiry")))
    ]);
    const forms = formSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.title).localeCompare(String(b.title)));
    const legacyRows = (snapshot, collection) => snapshot.docs.map((d) => ({ id: d.id, ...d.data(), _collection: collection }));
    const answerSummary = (answers = {}) => Object.entries(answers).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
    const responseRows = (snapshot) => snapshot.docs.map((d) => {
      const row = { id: d.id, ...d.data(), _collection: "form_responses" };
      const answers = row.answers || {};
      return { ...row, name: row.name || answers.full_name || answers.name || "", email: row.email || answers.email || "", message: row.message || answerSummary(answers), createdAt: row.submittedAt || row.createdAt || "" };
    });
    const recentRows = (legacy, modern) => [...legacy, ...modern].sort((a, b) => String(b.createdAt || b.submittedAt || "").localeCompare(String(a.createdAt || a.submittedAt || ""))).slice(0, 5);
    const allJoin = [...legacyRows(joinSnap, "members_applications").filter((d) => d.formId === "join" || !d.formId), ...responseRows(joinResponseSnap)];
    const allEnquiry = [...legacyRows(enquirySnap, "contact_messages").filter((d) => d.formId === "enquiry" || !d.formId), ...responseRows(enquiryResponseSnap)];
    const lastJoin = recentRows(legacyRows(joinSnap, "members_applications").filter((d) => d.formId === "join" || !d.formId), responseRows(joinResponseSnap));
    const lastEnquiry = recentRows(legacyRows(enquirySnap, "contact_messages").filter((d) => d.formId === "enquiry" || !d.formId), responseRows(enquiryResponseSnap));
    const events = eventSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)));
    const assignedFormId = (event) => event.registrationFormId || "";
    const hasExternalRegistration = (event) => /^https:\/\//i.test(String(event.registrationLink || "")) && safeHttpsUrl(event.registrationLink);
    const unassignedEventCount = events.filter((event) => !assignedFormId(event) && !hasExternalRegistration(event)).length;
    const eventAssignmentRows = events.map((event) => {
      const formId = assignedFormId(event);
      const form = forms.find((item) => item.id === formId);
      const externalRegistration = hasExternalRegistration(event);
      const label = form ? `${form.title || form.id} · ${form.status || "draft"}` : formId ? `Missing form · ${formId}` : externalRegistration ? "External registration link" : "Unassigned";
      const stateClass = formId ? (form ? "chip-accent" : "chip-warning") : externalRegistration ? "" : "chip-warning";
      return `<article class="admin-event-assignment-row"><div><strong>${esc(event.title || event.id)}</strong><span class="muted">${esc(event.date || "")}</span></div><span class="chip ${stateClass}">${esc(label)}</span></article>`;
    }).join("");
    const formAssignmentText = (formId) => {
      const attached = events.filter((event) => assignedFormId(event) === formId).map((event) => event.title || event.id);
      return attached.length ? `Assigned to: ${attached.slice(0, 3).join(", ")}${attached.length > 3 ? ` and ${attached.length - 3} more` : ""}` : "Not assigned to any event";
    };
    if (PAGE !== "forms" || !region.isConnected) return;
    region.innerHTML = `
      <section class="admin-event-assignment card"><div class="admin-event-assignment-head"><div><h2>Event registration forms</h2><p class="muted">${unassignedEventCount} event(s) have no registration form. Assign a form in Events → Edit; unassigned events do not open a registration form.</p></div><a class="btn btn-ghost btn-sm" href="/admin/events">Manage events</a></div><div class="admin-event-assignment-list">${eventAssignmentRows || `<p class="muted">No events are published yet.</p>`}</div></section>
      <section class="admin-form-toolbar"><div><h2>Managed forms</h2><p class="muted">Edit built-in or custom form questions, open/close intake, review responses, or export them as CSV. Responses are stored in Firestore.</p></div><div class="admin-form-toolbar-actions"><button class="btn btn-ghost btn-sm" id="refreshForms">Refresh</button>${can("forms") ? `<button class="btn btn-primary btn-sm" id="newManagedForm">+ Create form</button>` : ""}</div></section>
      <div class="admin-managed-forms">${forms.length ? forms.map((form) => `
        <article class="admin-managed-form card">
          <div class="admin-managed-form-copy"><div class="admin-form-title-line"><strong>${esc(form.title || form.id)}</strong><span class="chip ${form.status === "open" ? "chip-accent" : ""}">${esc(form.status || "draft")}</span>${form.builtin ? `<span class="chip">Built in</span>` : ""}</div><p class="muted">${esc(form.description || "")}</p><small>${(form.fields || []).length} question(s) · ${esc(form.kind || "custom")}</small><p class="muted form-assignment-note">${esc(formAssignmentText(form.id))}</p><label class="admin-form-share"><span>Share link</span><input type="url" readonly aria-label="Public link for ${esc(form.title || form.id)}" value="${esc(managedFormUrl(form.id, form))}" data-form-share-link="${esc(form.id)}"><button class="btn btn-ghost btn-sm" type="button" data-form-copy="${esc(form.id)}">Copy link</button></label>${form.status === "open" ? "" : `<small class="muted">Open this form before accepting responses.</small>`}</div>
          <div class="admin-row-actions">
            <button class="btn btn-ghost btn-sm" data-form-responses="${esc(form.id)}">View responses</button>
            ${can("forms") ? `<button class="btn btn-ghost btn-sm" data-form-edit="${esc(form.id)}">Edit form</button><button class="btn btn-ghost btn-sm" data-form-toggle="${esc(form.id)}">${form.status === "open" ? "Close" : "Open"}</button>${!form.builtin ? `<button class="btn btn-danger btn-sm" data-form-delete="${esc(form.id)}">Delete</button>` : ""}` : ""}
            <button class="btn btn-ghost btn-sm" data-form-open="${esc(form.id)}">Open public form</button>
          </div>
        </article>`).join("") : `<p class="muted">No forms yet. Standard forms are created automatically when the owner opens Admin.</p>`}</div>
      <section class="admin-legacy-submissions"><div class="admin-form-toolbar"><div><h2>Recent join applications</h2><p class="muted">${allJoin.length} total · newest first</p></div><button class="btn btn-ghost btn-sm" id="exportJoin">Export CSV</button></div>${renderLegacyPreview(lastJoin, "members_applications")}</section>
      <section class="admin-legacy-submissions"><div class="admin-form-toolbar"><div><h2>Recent enquiries</h2><p class="muted">${allEnquiry.length} total · newest first</p></div><button class="btn btn-ghost btn-sm" id="exportEnquiries">Export CSV</button></div>${renderLegacyPreview(lastEnquiry, "contact_messages")}</section>
      <div id="formEditorMount"></div><div id="formResponseMount"></div>`;
    region.querySelector("#refreshForms")?.addEventListener("click", () => renderForms());
    region.querySelector("#newManagedForm")?.addEventListener("click", () => showManagedFormEditor(null));
    region.querySelectorAll("[data-form-edit]").forEach((b) => b.addEventListener("click", () => showManagedFormEditor(forms.find((f) => f.id === b.dataset.formEdit))));
    region.querySelectorAll("[data-form-toggle]").forEach((b) => b.addEventListener("click", () => toggleManagedForm(forms.find((f) => f.id === b.dataset.formToggle))));
    region.querySelectorAll("[data-form-delete]").forEach((b) => b.addEventListener("click", () => deleteManagedForm(b.dataset.formDelete)));
    region.querySelectorAll("[data-form-responses]").forEach((b) => b.addEventListener("click", () => showManagedResponses(forms.find((f) => f.id === b.dataset.formResponses))));
    region.querySelectorAll("[data-form-open]").forEach((b) => b.addEventListener("click", () => openManagedFormLink(b.dataset.formOpen, forms.find((f) => f.id === b.dataset.formOpen))));
    region.querySelectorAll("[data-form-copy]").forEach((b) => b.addEventListener("click", () => copyManagedFormLink(b.dataset.formCopy, forms.find((f) => f.id === b.dataset.formCopy))));
    region.querySelectorAll("[data-delete-legacy]").forEach((b) => b.addEventListener("click", () => deleteLegacyResponse(b.dataset.collection, b.dataset.deleteLegacy)));
    region.querySelector("#exportJoin")?.addEventListener("click", () => exportCsv("embedx-join-applications.csv", allJoin));
    region.querySelector("#exportEnquiries")?.addEventListener("click", () => exportCsv("embedx-enquiries.csv", allEnquiry));
    formsRefreshTimer = setInterval(() => {
      if (PAGE === "forms" && !$("#formEditorMount")?.childElementCount && !$("#formResponseMount")?.childElementCount) renderForms();
    }, 30000);
  } catch (err) {
    console.error("Forms dashboard failed", err);
    region.innerHTML = `<p class="muted">Could not load form controls or responses: ${esc(err.message)}</p>`;
  }
}

function renderLegacyPreview(rows, collectionName) {
  if (!rows.length) return `<p class="muted">No responses received yet.</p>`;
  return `<div class="admin-response-list">${rows.map((row) => `<article class="admin-response-card card"><div><strong>${esc(row.name || "Unnamed")}</strong><span class="muted">${esc(row.email || "")} · ${esc((row.createdAt || "").slice(0, 19).replace("T", " "))}</span><p>${esc(row.message || row.interest || row.subject || "")}</p></div><button class="btn btn-danger btn-sm" data-collection="${esc(row._collection || collectionName)}" data-delete-legacy="${esc(row.id)}">Delete</button></article>`).join("")}</div>`;
}


function showManagedFormEditor(form) {
  if (!can("forms")) return;
  const mount = $("#formEditorMount");
  if (!mount) return;
  const isBuiltin = !!form?.builtin;
  mount.innerHTML = `<section class="admin-form-editor card"><div class="admin-form-toolbar"><div><h2>${form ? "Edit form" : "Create a form"}</h2><p class="muted">Edit the title, description, availability, and questions. Changes to built-in questions appear on the public application and enquiry forms.</p></div><button class="btn btn-ghost btn-sm" id="cancelFormEdit">Close</button></div>
    <div class="form-grid"><div class="field"><label for="managedFormTitle">Form title</label><input id="managedFormTitle" maxlength="120" value="${esc(form?.title || "")}" /></div><div class="field"><label for="managedFormStatus">Response status</label><select id="managedFormStatus"><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option></select></div><div class="field full"><label for="managedFormDescription">Description</label><textarea id="managedFormDescription" maxlength="600">${esc(form?.description || "")}</textarea></div></div>
    <h3>Questions</h3><div id="managedFieldRows">${(form?.fields || []).map(managedFieldRow).join("")}</div><button class="btn btn-ghost btn-sm" id="addManagedField">+ Add question</button>
    <div class="admin-form-editor-actions"><button class="btn btn-primary" id="saveManagedForm">Save form</button></div></section>`;
  $("#managedFormStatus").value = form?.status || "draft";
  mount.querySelector("#cancelFormEdit").addEventListener("click", () => { mount.innerHTML = ""; });
  mount.querySelector("#addManagedField")?.addEventListener("click", () => { $("#managedFieldRows").insertAdjacentHTML("beforeend", managedFieldRow({ label: "New question", type: "text", required: false, options: [] })); bindFieldRow(mount.querySelector("#managedFieldRows").lastElementChild); });
  mount.querySelectorAll("[data-remove-question]").forEach((b) => b.addEventListener("click", () => b.closest("[data-field-row]").remove()));
  mount.querySelectorAll("[data-field-type]").forEach((el) => el.addEventListener("change", () => { const row = el.closest("[data-field-row]"); row.querySelector("[data-field-options]").closest(".field").hidden = !["select", "checkboxes"].includes(el.value); }));
  mount.querySelector("#saveManagedForm").addEventListener("click", () => saveManagedForm(form, isBuiltin));
}

function managedFieldRow(field = {}) {
  const types = ["text", "textarea", "email", "tel", "url", "date", "select", "checkbox", "checkboxes", "stars"];
  return `<div class="admin-managed-field" data-field-row data-key="${esc(field.key || "")}"><div class="field"><label>Question label</label><input data-field-label maxlength="120" value="${esc(field.label || "")}" /></div><div class="field"><label>Answer type</label><select data-field-type>${types.map((type) => `<option value="${type}" ${field.type === type ? "selected" : ""}>${type === "stars" ? "Star rating (1–5)" : type}</option>`).join("")}</select></div><label class="check-row"><input data-field-required type="checkbox" ${field.required ? "checked" : ""}/> Required</label><div class="field" ${["select", "checkboxes"].includes(field.type) ? "" : "hidden"}><label>Options (one per line)</label><textarea data-field-options>${esc((field.options || []).join("\n"))}</textarea></div><button type="button" class="btn btn-danger btn-sm" data-remove-question>Remove</button></div>`;
}
function bindFieldRow(row) {
  row.querySelector("[data-remove-question]")?.addEventListener("click", () => row.remove());
  row.querySelector("[data-field-type]")?.addEventListener("change", (event) => { row.querySelector("[data-field-options]").closest(".field").hidden = !["select", "checkboxes"].includes(event.target.value); });
}

async function saveManagedForm(form, isBuiltin) {
  const title = $("#managedFormTitle").value.trim();
  const description = $("#managedFormDescription").value.trim();
  const status = $("#managedFormStatus").value;
  if (!title || title.length > 120) { toast("Add a form title of 1–120 characters.", "err"); return; }
  const fields = [...document.querySelectorAll("#managedFieldRows [data-field-row]")].map((row) => {
    const label = row.querySelector("[data-field-label]").value.trim();
    const key = row.dataset.key || label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const type = row.querySelector("[data-field-type]").value;
    const options = row.querySelector("[data-field-options]").value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 30);
    return { key, label, type, required: row.querySelector("[data-field-required]").checked, ...(options.length ? { options } : {}) };
  });
  const reservedKeys = new Set(["__proto__", "constructor", "prototype"]);
  if (!fields.length || fields.length > 25 || fields.some((f) => !f.label || !/^[a-z0-9_]{1,60}$/i.test(f.key) || reservedKeys.has(f.key)) || new Set(fields.map((f) => f.key)).size !== fields.length) { toast("Add 1–25 questions with unique, safe labels.", "err"); return; }
  if (fields.some((f) => ["select", "checkboxes"].includes(f.type) && (!f.options || !f.options.length))) { toast("Add answer options for every select or checkbox question.", "err"); return; }
  try {
    const { db } = await sdk();
    const formId = form?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Date.now().toString(36);
    const data = { title, description, status, kind: form?.kind || "custom", builtin: isBuiltin, fields, updatedAt: new Date().toISOString(), updatedBy: me };
    if (form) await dbMod.updateDoc(dbMod.doc(db, "forms", formId), data);
    else await dbMod.setDoc(dbMod.doc(db, "forms", formId), { ...data, createdAt: new Date().toISOString() });
    toast("Form saved.", "ok");
    await renderForms();
  } catch (err) { toast(`Could not save form: ${err.message}`, "err"); }
}

async function toggleManagedForm(form) {
  if (!form || !can("forms")) return;
  try {
    const { db } = await sdk();
    const status = form.status === "open" ? "closed" : "open";
    await dbMod.updateDoc(dbMod.doc(db, "forms", form.id), { status, updatedAt: new Date().toISOString(), updatedBy: me });
    toast(status === "open" ? "Form opened for responses." : "Form closed; new responses are blocked.", "ok");
    await renderForms();
  } catch (err) { toast(`Could not change form status: ${err.message}`, "err"); }
}

function managedFormUrl(id, form) {
  const path = form?.kind === "join" ? "/pages/join.html" : form?.kind === "enquiry" ? "/pages/contact.html" : `/pages/form.html?form=${encodeURIComponent(id)}`;
  return new URL(path, location.origin).href;
}

function openManagedFormLink(id, form) {
  window.open(managedFormUrl(id, form), "_blank", "noopener,noreferrer");
}

async function copyManagedFormLink(id, form) {
  const url = managedFormUrl(id, form);
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is not available in this browser.");
    await navigator.clipboard.writeText(url);
    toast("Public form link copied.", "ok");
  } catch (err) {
    const input = document.querySelector(`[data-form-share-link="${CSS.escape(id)}"]`);
    input?.focus(); input?.select(); input?.setSelectionRange(0, input.value.length);
    toast(input ? "Select and copy the public link shown on the form card." : "Could not copy the form link. Open the public form and copy its URL.", "err");
  }
}

async function deleteManagedForm(formId) {
  if (!can("forms")) return;
  try {
    const { db } = await sdk();
    const [responseSnap, eventSnap] = await Promise.all([
      dbMod.getDocs(dbMod.query(dbMod.collection(db, "form_responses"), dbMod.where("formId", "==", formId))),
      dbMod.getDocs(dbMod.query(dbMod.collection(db, "events"), dbMod.where("registrationFormId", "==", formId)))
    ]);
    if (eventSnap.size && !can("events")) { toast("This form is assigned to an event. Ask an Events admin to unassign it before deleting.", "err"); return; }
    const warning = `Delete this form, its ${responseSnap.size} response(s), and clear its assignment from ${eventSnap.size} event(s)? This cannot be undone.`;
    if (!confirm(warning)) return;
    for (let i = 0; i < eventSnap.docs.length; i += 400) {
      const batch = dbMod.writeBatch(db);
      eventSnap.docs.slice(i, i + 400).forEach((doc) => batch.update(doc.ref, { registrationFormId: "" }));
      await batch.commit();
    }
    for (let i = 0; i < responseSnap.docs.length; i += 400) {
      const batch = dbMod.writeBatch(db);
      responseSnap.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await dbMod.deleteDoc(dbMod.doc(db, "forms", formId));
    toast("Form deleted; event assignments cleared and responses removed.", "ok");
    await renderForms();
  } catch (err) { toast(`Could not delete form: ${err.message}`, "err"); }
}

async function showManagedResponses(form) {
  if (!form) return;
  const mount = $("#formResponseMount");
  mount.innerHTML = `<div class="skeleton" style="min-height:120px"></div>`;
  try {
    const { db } = await sdk();
    const responseQuery = dbMod.query(dbMod.collection(db, "form_responses"), dbMod.where("formId", "==", form.id));
    const responsePromise = dbMod.getDocs(responseQuery);
    const legacyPromise = form.kind === "join"
      ? dbMod.getDocs(dbMod.collection(db, "members_applications"))
      : form.kind === "enquiry" ? dbMod.getDocs(dbMod.collection(db, "contact_messages")) : Promise.resolve(null);
    const [responseSnap, legacySnap] = await Promise.all([responsePromise, legacyPromise]);
    const rows = responseSnap.docs.map((d) => ({ id: d.id, ...d.data(), _collection: "form_responses" }));
    if (legacySnap && form.kind === "join") rows.push(...legacySnap.docs.map((d) => ({ id: d.id, ...d.data(), _collection: "members_applications" })).filter((d) => d.formId === "join" || !d.formId));
    if (legacySnap && form.kind === "enquiry") rows.push(...legacySnap.docs.map((d) => ({ id: d.id, ...d.data(), _collection: "contact_messages" })).filter((d) => d.formId === "enquiry" || !d.formId));
    rows.sort((a, b) => String(b.submittedAt || b.createdAt || "").localeCompare(String(a.submittedAt || a.createdAt || "")));
    const ratingKeys = (form.fields || []).filter((field) => field.type === "stars").map((field) => field.key);
    const ratings = rows.flatMap((row) => ratingKeys.map((key) => Number((row.answers || {})[key])).filter((value) => Number.isFinite(value) && value >= 1 && value <= 5));
    const ratingSummary = ratings.length ? ` · Average rating ${(ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)}/5 (${ratings.length} ratings)` : "";
    const answerText = (answers) => Object.entries(answers || {}).map(([key, value]) => {
      const label = form.fields?.find((field) => field.key === key)?.label || key;
      return `${label}: ${Array.isArray(value) ? value.join(", ") : value}`;
    }).join(" · ");
    mount.innerHTML = `<section class="admin-form-responses card"><div class="admin-form-toolbar"><div><h2>Responses — ${esc(form.title || form.id)}</h2><p class="muted">${rows.length} response(s)${ratingSummary}. Export opens as CSV in spreadsheet software.</p></div><div><button class="btn btn-ghost btn-sm" id="exportFormResponses">Export CSV</button><button class="btn btn-ghost btn-sm" id="closeFormResponses">Close</button></div></div>${rows.length ? `<div class="admin-response-list">${rows.map((row) => { const answers = row.answers || {}; return `<article class="admin-response-card"><div><strong>${esc(row.name || answers.full_name || answers.name || row.email || answers.email || "Response")}</strong><span class="muted">${esc(row.email || answers.email || "")} · ${esc((row.submittedAt || row.createdAt || "").slice(0, 19).replace("T", " "))}</span><p>${esc(row.message || row.subject || answers.message || answerText(answers))}</p></div><button class="btn btn-danger btn-sm" data-response-delete="${esc(row.id)}" data-response-collection="${esc(row._collection || "form_responses")}">Delete</button></article>`; }).join("")}</div>` : `<p class="muted">No responses yet.</p>`}</section>`;
    mount.querySelector("#closeFormResponses").addEventListener("click", () => { mount.innerHTML = ""; });
    mount.querySelector("#exportFormResponses").addEventListener("click", () => exportCsv(`embedx-${form.id}-responses.csv`, rows));
    mount.querySelectorAll("[data-response-delete]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("Permanently delete this response?")) return;
      try { const { db } = await sdk(); await dbMod.deleteDoc(dbMod.doc(db, button.dataset.responseCollection, button.dataset.responseDelete)); toast("Response deleted.", "ok"); showManagedResponses(form); }
      catch (err) { toast(`Could not delete response: ${err.message}`, "err"); }
    }));
  } catch (err) { mount.innerHTML = `<p class="muted">Could not load responses: ${esc(err.message)}</p>`; }
}

async function deleteLegacyResponse(collectionName, id) {
  if (!can("forms") || !confirm("Permanently delete this submission?")) return;
  try { const { db } = await sdk(); await dbMod.deleteDoc(dbMod.doc(db, collectionName, id)); toast("Submission deleted.", "ok"); renderForms(); }
  catch (err) { toast(`Could not delete submission: ${err.message}`, "err"); }
}

function exportCsv(filename, rows) {
  if (!rows.length) { toast("There are no rows to export.", "err"); return; }
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const value = (item) => {
    const text = item && typeof item === "object" ? JSON.stringify(item) : String(item ?? "");
    return /^[=+@-]/.test(text) ? `'${text}` : text;
  };
  const csv = [headers, ...rows.map((row) => headers.map((h) => row[h]))].map((line) => line.map((cell) => `"${value(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

/* ---------------- generic collection pages ---------------- */
async function renderCollection(sec) {
  const schema = SCHEMAS[sec];
  if (!schema) { $("#pageRegion").innerHTML = `<p class="muted">Unknown section.</p>`; return; }
  if (!canView(sec) && sec !== "tasks") {
    $("#pageRegion").innerHTML = `<div class="card" style="padding:var(--sp-4)"><h2 style="margin:0 0 .4rem">No access</h2><p class="muted" style="margin:0">Your owner hasn't granted you this section. Ask them to tick it for you under <b>Admins &amp; roles → Permissions</b>.</p></div>`;
    return;
  }
  const add = $("#addItem");
  if (add) { add.hidden = !can(sec); add.onclick = () => openForm(null); }
  await loadList(sec);
  if (PAGE !== sec) return;
  loadStats();
}


async function loadList(sec) {
  if (PAGE !== sec) return;
  const requestId = ++listRequestId;
  const schema = SCHEMAS[sec];
  const region = $("#pageRegion");
  if (!region || !schema) return;
  region.innerHTML = `<div id="listRegion" class="admin-list"><div class="skeleton" style="min-height:160px"></div></div>`;
  if (!isConfigured) { region.innerHTML = `<p class="muted">Firebase config missing.</p>`; return; }
  try {
    const { db } = await sdk();
    const collectionRef = dbMod.collection(db, sec);
    let docs;
    if (sec === "tasks" && !can("tasks")) {
      const queries = [dbMod.query(collectionRef, dbMod.where("assigneeEmail", "==", me))];
      if (role) queries.push(dbMod.query(collectionRef, dbMod.where("assigneeRole", "==", role)));
      const snapshots = await Promise.all(queries.map((q) => dbMod.getDocs(q)));
      docs = [...new Map(snapshots.flatMap((snap) => snap.docs.map((d) => [d.id, d]))).values()];
    } else {
      docs = (await dbMod.getDocs(collectionRef)).docs;
    }
    if (requestId !== listRequestId || PAGE !== sec) return;
    const [field, dir] = schema.sort;
    items = docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const x = a[field], y = b[field], sign = dir === "desc" ? -1 : 1;
      if (x == null) return y == null ? 0 : 1;
      if (y == null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * sign;
    });
    renderList(sec);
  } catch (err) {
    console.error(err);
    if (requestId === listRequestId && PAGE === sec) region.innerHTML = `<p class="muted">Could not load ${sec}: ${esc(err.message)}</p>`;
  }
}

async function loadStats() {
  const strip = $("#statsStrip");
  if (!strip) return;
  if (!statsCache && isConfigured) {
    try {
      const { db } = await sdk();
      const names = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements"].filter(canView);
      statsCache = await Promise.all(names.map(async (n) => [n, await countCollection(db, n)]));
    } catch { return; }
  }
  if (statsCache) strip.innerHTML = statsCache.map(([n, c]) => `<a class="chip ${c ? "chip-accent" : ""}" style="text-decoration:none" href="/admin/${n}">${n}: ${c}</a>`).join("");
}

function renderList(sec) {
  const schema = SCHEMAS[sec];
  const region = $("#listRegion");
  if (!items.length) { region.innerHTML = `<p class="muted">${can(sec) ? `No ${schema.label}s yet — use “+ New” to add one.` : `No ${schema.label}s to display.`}</p>`; return; }
  region.innerHTML = items.map((d) => `
    <div class="admin-row card">
      ${schema.image && (d[schema.image] || (sec === "achievements" && d.imageUrl)) && !(sec === "gallery" && d.mediaType === "video") ? `<img src="${esc(asset(d[schema.image] || d.imageUrl))}" alt="" loading="lazy" decoding="async" />` : `<span class="admin-noimg">${sec === "gallery" && d.mediaType === "video" ? "▶" : "◈"}</span>`}
      <div class="admin-row-main">
        <strong>${esc(schema.title(d))}</strong>
        <span class="muted">${esc(schema.sub(d))}</span>
      </div>
      <div class="admin-row-actions">
        ${sec === "tasks" && d.status !== "done" && (d.assigneeEmail === me || d.assigneeRole === role) ? `<button class="btn btn-ghost btn-sm" data-done="${esc(d.id)}">Mark done</button>` : ""}
        ${can(sec) ? `<button class="btn btn-ghost btn-sm" data-edit="${esc(d.id)}">Edit</button>
        <button class="btn btn-ghost btn-sm" data-del="${esc(d.id)}" style="color:var(--err)">Delete</button>` : ""}
      </div>
    </div>`).join("");
  region.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(b.dataset.edit)));
  region.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => removeItem(b.dataset.del)));
  region.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      const { db } = await sdk();
      await dbMod.updateDoc(dbMod.doc(db, "tasks", b.dataset.done), { status: "done" });
      toast("Nice work — task closed ✔", "ok");
      loadList("tasks");
    } catch (err) {
      console.error(err);
      toast(`Could not update task: ${err.message}`, "err");
      b.disabled = false;
    }
  }));
}

/* ---------------- form (DOM-built: values can never break markup) ---------------- */
async function eventRegistrationFormOptions(selectedId = "") {
  let forms = [];
  try {
    const { db } = await sdk();
    const snap = await dbMod.getDocs(dbMod.collection(db, "forms"));
    forms = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)));
  } catch (err) { console.warn("Could not load registration form choices", err); }
  const options = [{ value: "", label: "Unassigned — no registration form" }, ...forms.map((form) => ({ value: form.id, label: `${form.title || form.id} · ${form.status || "draft"}` }))];
  if (selectedId && !forms.some((form) => form.id === selectedId)) options.push({ value: selectedId, label: `Missing form (${selectedId}) — choose another` });
  return options;
}

function normalizeEventMediaEntry(entry) {
  if (entry && typeof entry === "object") {
    const type = String(entry.type || entry.mediaType || "image").toLowerCase();
    return {
      type: type === "video" ? "video" : "image",
      url: String(entry.url || entry.mediaUrl || entry.imageUrl || "").trim(),
      caption: String(entry.caption || entry.description || "").trim()
    };
  }
  const [rawType = "", url = "", ...caption] = String(entry || "").split("|").map((part) => part.trim());
  const type = rawType.toLowerCase();
  return {
    type: type === "video" || /\.(mov|mp4|m4v|webm|ogv)(?:$|[?#])/i.test(url) ? "video" : "image",
    url: type === "image" || type === "photo" || type === "video" ? url : String(entry || "").trim(),
    caption: type === "image" || type === "photo" || type === "video" ? caption.join(" | ") : ""
  };
}

function buildEventMediaField(f, value) {
  const wrap = document.createElement("div");
  wrap.className = "field full event-media-field";
  wrap.dataset.eventMediaField = "";
  const label = document.createElement("label");
  label.textContent = f.label;
  wrap.appendChild(label);
  const rows = document.createElement("div");
  rows.className = "event-media-rows";
  const addRow = (entry = {}) => {
    const normalized = normalizeEventMediaEntry(entry);
    const row = document.createElement("div");
    row.className = "event-media-row";
    const type = document.createElement("select");
    type.setAttribute("aria-label", "Media type");
    [["image", "Photo"], ["video", "Video"]].forEach(([value, text]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = text; type.appendChild(option);
    });
    type.value = normalized.type;
    type.dataset.mediaPart = "type";
    const url = document.createElement("input");
    url.type = "text"; url.placeholder = "HTTPS media URL or site path"; url.value = normalized.url;
    url.setAttribute("aria-label", "Media URL"); url.dataset.mediaPart = "url";
    const caption = document.createElement("input");
    caption.type = "text"; caption.placeholder = "Caption / description"; caption.value = normalized.caption;
    caption.setAttribute("aria-label", "Media caption"); caption.dataset.mediaPart = "caption";
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "btn btn-ghost btn-sm event-media-remove";
    remove.textContent = "Remove"; remove.setAttribute("aria-label", "Remove this media item");
    remove.addEventListener("click", () => row.remove());
    row.append(type, url, caption, remove);
    rows.appendChild(row);
  };
  (Array.isArray(value) ? value : value ? [value] : []).map(normalizeEventMediaEntry).forEach(addRow);
  const controls = document.createElement("div"); controls.className = "event-media-controls";
  const add = document.createElement("button"); add.type = "button"; add.className = "btn btn-ghost btn-sm";
  add.textContent = "+ Add media"; add.addEventListener("click", () => { addRow(); rows.lastElementChild?.querySelector("select")?.focus(); });
  const upload = document.createElement("button"); upload.type = "button"; upload.className = "btn btn-ghost btn-sm";
  upload.textContent = "Upload event photos";
  const fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.multiple = true;
  fileInput.accept = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"; fileInput.hidden = true;
  const status = document.createElement("small"); status.className = "muted"; status.setAttribute("role", "status");
  upload.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const files = [...(fileInput.files || [])];
    if (!files.length) return;
    if (files.length > 10) { toast("Upload up to 10 event photos at a time.", "err"); fileInput.value = ""; return; }
    upload.disabled = true; status.textContent = "Uploading event photos…";
    let uploaded = 0;
    for (const file of files) {
      try {
        const url = await uploadOptimizedImage(file, "events", (progress) => {
          status.textContent = progress.phase === "upload" ? `Uploading ${file.name} — ${progress.percent}%` : `Preparing ${file.name}…`;
        });
        addRow({ type: "image", url, caption: file.name.replace(/\.[^.]+$/, "") });
        uploaded++;
      } catch (error) {
        console.error("Event photo upload failed", error);
        toast(`Could not upload ${file.name}: ${uploadErrorMessage(error)}`, "err");
      }
    }
    status.textContent = `${uploaded} photo${uploaded === 1 ? "" : "s"} added. Save the event to publish.`;
    upload.disabled = false; fileInput.value = "";
  });
  controls.append(add, upload, fileInput, status);
  const note = document.createElement("small"); note.className = "muted";
  note.textContent = "After saving an ended event, these photos and videos are added to the public home-page Gallery automatically—no separate Gallery entry is needed. Use a public HTTPS link; Drive videos need Anyone with the link · Viewer access.";
  wrap.append(rows, controls, note);
  return wrap;
}

function buildField(f, v) {
  if (f.t === "event-media") return buildEventMediaField(f, v);
  const wrap = document.createElement("div");
  const id = `f-${f.k}`;
  const full = f.full || ["textarea", "list", "check", "image"].includes(f.t);
  wrap.className = "field" + (full ? " full" : "");
  if (f.t === "check") {
    const label = document.createElement("label");
    label.className = "check-row"; label.htmlFor = id;
    const input = document.createElement("input");
    input.id = id; input.name = f.k; input.type = "checkbox"; input.checked = !!v;
    label.append(input, " " + f.label);
    wrap.appendChild(label);
    return wrap;
  }
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = f.label + (f.req ? " *" : "");
  wrap.appendChild(label);
  let input;
  if (f.t === "textarea" || f.t === "list") {
    input = document.createElement("textarea"); input.value = f.t === "list" && Array.isArray(v) ? v.join("\n") : (v ?? "");
    if (f.t === "list") input.placeholder = "Enter one item per line";
  } else if (f.t === "select" || f.t === "event-form") {
    input = document.createElement("select");
    (f.opts || []).forEach((o) => {
      const value = typeof o === "object" ? o.value : o;
      const text = typeof o === "object" ? o.label : o;
      const op = document.createElement("option");
      op.value = value; op.textContent = text;
      if (String(value) === String(v ?? "")) op.selected = true;
      input.appendChild(op);
    });
  } else if (f.t === "image") {
    input = document.createElement("input"); input.type = "hidden"; input.value = v ?? "";
    const picker = document.createElement("div"); picker.className = "img-picker";
    const prev = document.createElement("img"); prev.id = `prev-${f.k}`; prev.alt = "Current image preview";
    if (v) prev.src = asset(v); else prev.style.display = "none";
    prev.addEventListener("error", () => { prev.alt = "Image preview unavailable"; });
    const urlInput = document.createElement("input");
    urlInput.type = "text"; urlInput.id = `url-${f.k}`; urlInput.value = v ?? "";
    urlInput.placeholder = "/assets/images/photo.webp, HTTPS URL, or Google Drive share link";
    urlInput.setAttribute("aria-label", `${f.label} URL`);
    urlInput.addEventListener("input", () => {
      input.value = urlInput.value.trim();
      if (input.value) { prev.src = asset(input.value); prev.style.display = ""; }
      else { prev.removeAttribute("src"); prev.style.display = "none"; }
    });
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:.5rem;flex-wrap:wrap;align-items:center";
    const driveLink = document.createElement("a");
    driveLink.className = "btn btn-ghost btn-sm";
    driveLink.href = "https://drive.google.com/drive/my-drive";
    driveLink.target = "_blank"; driveLink.rel = "noopener noreferrer";
    driveLink.textContent = "Open Google Drive";
    const fileLabel = document.createElement("label");
    fileLabel.className = "btn btn-ghost btn-sm"; fileLabel.htmlFor = `file-${f.k}`;
    fileLabel.textContent = "Upload image file (HEIC supported)";
    const file = document.createElement("input");
    file.id = `file-${f.k}`; file.type = "file"; file.accept = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
    file.style.display = "none"; file.dataset.imgfield = f.k;
    row.append(driveLink, fileLabel, file);
    const galleryVideo = PAGE === "gallery" && document.querySelector("#f-mediaType")?.value === "video";
    if (v && !driveFileId(v) && !galleryVideo) {
      const editBtn = document.createElement("button");
      editBtn.type = "button"; editBtn.className = "btn btn-ghost btn-sm";
      editBtn.dataset.editimg = f.k; editBtn.textContent = "Edit current photo";
      row.appendChild(editBtn);
    }
    const driveNote = document.createElement("small");
    driveNote.className = "muted";
    driveNote.textContent = "Uploads are optimized to browser-friendly WebP before storage, including iPhone HEIC/HEIF photos. Drive images must be shared as Anyone with the link → Viewer; an admin-only preview can appear to work while public visitors see a broken image. We use the Drive thumbnail URL for public display.";
    picker.append(prev, urlInput, row, driveNote);
    wrap.append(picker);
  } else {
    input = document.createElement("input");
    input.type = f.t === "num" ? "number" : f.t === "email" ? "email" : f.t === "date" ? "date" : "text";
    input.value = v ?? "";
  }
  input.id = id; input.name = f.k;
  wrap.appendChild(input);
  return wrap;
}

async function openForm(id = null) {
  const sec = PAGE;
  const schema = SCHEMAS[sec];
  editingId = id;
  const source = id ? items.find((x) => x.id === id) : { ...schema.defaults };
  const data = { ...(source || schema.defaults) };
  if (sec === "projects") {
    data.category = data.category || data.domain || "";
    data.shortDesc = data.shortDesc || data.summary || data.description || "";
  } else if (sec === "resources") {
    data.desc = data.desc || data.description || "";
  } else if (sec === "achievements") {
    data.description = data.description || data.detail || "";
    data.image = data.image || data.imageUrl || "";
    data.team = data.team || data.member || "";
  }
  for (const field of schema.fields) {
    if (field.t === "list" && Array.isArray(data[field.k])) data[field.k] = data[field.k].join("\n");
  }
  if (schema.fields.some((field) => field.k === "order")) {
    if (!id) data.order = Math.max(0, ...items.map((row) => Number(row.order) || 0)) + 1;
    else if (data.order == null || data.order === "") data.order = Math.max(1, items.findIndex((row) => row.id === id) + 1);
  }
  let fields = schema.fields;
  if (sec === "events") {
    const choices = await eventRegistrationFormOptions(data.registrationFormId || "");
    if (PAGE !== sec) return;
    fields = schema.fields.map((field) => field.k === "registrationFormId" ? { ...field, opts: choices } : field);
  }
  $("#formModalTitle").textContent = (id ? "Edit " : "New ") + schema.label;
  const host = $("#entityFields");
  host.innerHTML = "";
  fields.forEach((f) => host.appendChild(buildField(f, data?.[f.k] ?? (f.t === "check" ? false : ""))));
  if (sec === "events") {
    const ended = host.querySelector("#f-eventEnded");
    const upcoming = host.querySelector("#f-isUpcoming");
    const mediaField = host.querySelector("[data-event-media-field]");
    const syncEventMediaVisibility = () => {
      if (mediaField) mediaField.hidden = !ended?.checked;
      if (ended?.checked && upcoming) upcoming.checked = false;
    };
    ended?.addEventListener("change", syncEventMediaVisibility);
    syncEventMediaVisibility();
    const help = document.createElement("p"); help.className = "muted full event-registration-help";
    help.innerHTML = `Choose <b>Unassigned</b> to hide registration, select a form for this event, or <a href="/admin/forms">create/edit forms in Forms &amp; responses</a>.`;
    host.appendChild(help);
  }

  $("#entityFields").querySelectorAll("input[type=file][data-imgfield]").forEach((inp) => {
    inp.addEventListener("change", async () => {
      const file = inp.files[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) { toast("Choose an image under 25 MB. It will be optimized before upload.", "err"); inp.value = ""; return; }
      pendingImageField = inp.dataset.imgfield;
      inp.disabled = true;
      try {
        const img = await loadEditorImage(file);
        openEditor(img);
      } catch (error) {
        console.error("Could not open selected image", error);
        toast(`Could not preview ${file.name}: ${error.message}`, "err");
      } finally { inp.disabled = false; inp.value = ""; }
    });
  });
  $("#entityFields").querySelectorAll("[data-editimg]").forEach((b) => {
    b.addEventListener("click", () => {
      pendingImageField = b.dataset.editimg;
      const url = document.getElementById(`f-${pendingImageField}`).value;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => openEditor(img);
      img.src = asset(url);
    });
  });

  modalReturnFocus = document.activeElement;
  $("#formModal").classList.add("open");
  document.body.style.overflow = "hidden";
  $("#formModal").querySelector("input,select,textarea,button")?.focus();
}

let modalReturnFocus = null;
function closeModals() {
  document.querySelectorAll(".modal-backdrop.open").forEach((m) => m.classList.remove("open"));
  document.body.style.overflow = "";
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
  modalReturnFocus = null;
}

function trapAdminModalTab(e) {
  if (e.key !== "Tab") return;
  const modals = [...document.querySelectorAll(".modal-backdrop.open")];
  const top = modals[modals.length - 1];
  if (!top) return;
  const focusable = [...top.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!focusable.length) { e.preventDefault(); return; }
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

async function saveForm(e) {
  e.preventDefault();
  const form = e.currentTarget;
  if (form.dataset.saving === "1") return;
  const submitButton = form.querySelector('[type="submit"]');
  const sec = PAGE;
  const schema = SCHEMAS[sec];
  if (!can(sec)) { toast("Your role can't edit this section.", "err"); return; }
  const data = {};
  for (const f of schema.fields) {
    const el = document.getElementById(`f-${f.k}`);
    if (f.t === "event-media") {
      data[f.k] = [...document.querySelectorAll("#entityFields .event-media-row")].map((row) => ({
        type: row.querySelector('[data-media-part="type"]').value,
        url: row.querySelector('[data-media-part="url"]').value.trim(),
        caption: row.querySelector('[data-media-part="caption"]').value.trim()
      })).filter((item) => item.url || item.caption);
    } else if (f.t === "check") data[f.k] = el.checked;
    else if (f.t === "num") data[f.k] = Number(el.value || 0);
    else if (f.t === "list") data[f.k] = String(el.value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    else data[f.k] = String(el.value).trim();
    if (f.req && (!data[f.k] || (Array.isArray(data[f.k]) && !data[f.k].length))) { toast(`“${f.label}” is required.`, "err"); return; }
  }
  if (sec === "team" && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    toast("Enter a valid email address or leave the field blank.", "err"); return;
  }
  for (const field of schema.fields.filter((f) => f.t === "image")) {
    if (!isSafeMediaReference(data[field.k])) { toast(`${field.label} must be a local site path or an HTTPS URL.`, "err"); return; }
  }
  if (Array.isArray(data.gallery) && !data.gallery.every(isSafeMediaReference)) {
    toast("Gallery entries must be local site paths or HTTPS URLs.", "err"); return;
  }
  if (sec === "events") {
    const invalidGlimpse = data.glimpses.some((entry) => !entry.url || !isSafeMediaReference(entry.url)
      || !["image", "video"].includes(entry.type));
    if (invalidGlimpse) {
      toast("Each event media row needs a valid Photo or Video type and an HTTPS URL or local site path.", "err"); return;
    }
  }
  if (sec === "gallery" && !isSafeMediaReference(data.imageUrl)) {
    toast("Media URL must be an HTTPS URL or local site path.", "err"); return;
  }
  for (const key of ["githubUrl", "demoUrl", "url", "linkedin"]) {
    if (data[key] && !safeHttpsUrl(data[key])) { toast(`${key} must be an HTTPS URL.`, "err"); return; }
  }
  if (sec === "tasks") {
    data.assigneeEmail = String(data.assigneeEmail || "").toLowerCase();
    data.assigneeRole = data.assigneeRole || "";
    if (data.assigneeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.assigneeEmail)) {
      toast("Enter a valid assignee email address.", "err"); return;
    }
    if (data.assigneeEmail && data.assigneeRole) {
      toast("Choose one assignee: enter an email or select a role, not both.", "err"); return;
    }
  }
  form.dataset.saving = "1";
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Saving…"; }
  try {
    const { db } = await sdk();
    if (editingId) {
      const previous = sec === "tasks" ? items.find((x) => x.id === editingId) : null;
      await dbMod.updateDoc(dbMod.doc(db, sec, editingId), data);
      if (sec === "tasks" && (previous?.assigneeEmail !== data.assigneeEmail || previous?.assigneeRole !== data.assigneeRole) && (data.assigneeEmail || data.assigneeRole)) {
        const state = await notifyTaskAssignee(editingId);
        toast(state === "requested" ? "Task updated. Assignment email request sent." : state === "unconfigured" ? "Task updated; email notifications are not configured." : "Task updated, but the email request could not be sent.", state === "failed" ? "err" : "ok");
      } else toast("Updated ✔ Public pages sync automatically.", "ok");
    } else {
      if (sec === "announcements" || sec === "tasks") data.createdAt = new Date().toISOString();
      if (sec === "tasks") data.createdBy = me;
      const ref = await dbMod.addDoc(dbMod.collection(db, sec), data);
      if (sec === "tasks" && (data.assigneeEmail || data.assigneeRole)) {
        const state = await notifyTaskAssignee(ref.id);
        toast(state === "requested" ? "Task created. Email notification request sent." : state === "unconfigured" ? "Task created; email notifications are not configured." : "Task created, but the email request could not be sent.", state === "failed" ? "err" : "ok");
      } else toast(sec === "tasks" ? "Task created. No assignee was selected." : "Published ✔ Public pages sync automatically.", "ok");
    }
    closeModals();
    statsCache = null;
    loadList(sec);
    loadStats();
  } catch (err) {
    console.error(err);
    const hint = err.code === "permission-denied"
      ? " — your role doesn't include this section, or the Firebase rules need redeploying (firebase deploy --only firestore:rules,firestore:indexes,storage)"
      : "";
    toast(`Save failed [${err.code || "error"}]: ${err.message}${hint}`, "err");
  } finally {
    form.dataset.saving = "0";
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = "Save"; }
  }
}

function addContentTombstone(batch, db, section, contentId) {
  const ref = dbMod.doc(dbMod.collection(db, "content_tombstones"));
  batch.set(ref, { section, contentId: String(contentId), deletedBy: me, deletedAt: dbMod.serverTimestamp() });
}

async function removeItem(id) {
  const sec = PAGE;
  if (!can(sec)) { toast("Your role can't delete here.", "err"); return; }
  const starterOwned = Boolean(STARTER_CONTENT[sec]?.some((row) => row.id === id));
  const warning = sec === "gallery"
    ? "Remove this photo from the public gallery?"
    : `Delete this ${SCHEMAS[sec].label}? This cannot be undone.`;
  if (!confirm(warning)) return;
  try {
    const { db } = await sdk();
    if (starterOwned) {
      const batch = dbMod.writeBatch(db);
      batch.delete(dbMod.doc(db, sec, id));
      addContentTombstone(batch, db, sec, id);
      await batch.commit();
      toast("Deleted from Firestore and the live website. It will not be restored from starter content.", "ok");
    } else {
      await dbMod.deleteDoc(dbMod.doc(db, sec, id));
      toast("Deleted. Open public pages update automatically.", "ok");
    }
    statsCache = null;
    if (sec === "gallery") await renderCollection(sec);
    else await loadList(sec);
    loadStats();
  } catch (err) {
    console.error(`Delete failed for ${sec}/${id}`, err);
    const permissionHint = err.code === "permission-denied"
      ? `Check that your Admin account has edit permission for ${SCHEMAS[sec]?.label || sec} and that the matching Firestore rules are deployed. No deletion was confirmed.`
      : "";
    toast(`Delete failed${err.code ? ` [${err.code}]` : ""}: ${err.message}${permissionHint ? ` — ${permissionHint}` : ""}`, "err");
  }
}

/* ---------------- task assignment email (Apps Script web app hook) ---------------- */
async function notifyTaskAssignee(taskId) {
  if (!taskMail?.url) return "unconfigured";
  try {
    const { auth } = await sdk();
    const user = auth.currentUser;
    if (!user) return "failed";
    const idToken = await user.getIdToken();
    await fetch(taskMail.url, {
      method: "POST",
      mode: "no-cors", // Apps Script web apps return an opaque response; request delivery is best-effort.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ idToken, taskId })
    });
    return "requested";
  } catch (err) {
    console.error("task notification request failed", err);
    return "failed";
  }
}

/* ---------------- image editor + upload ---------------- */
function openEditor(img) {
  editorState = { img, rot: 0 };
  if (!modalReturnFocus) modalReturnFocus = document.activeElement;
  const widthSelect = $("#widthSel");
  if (widthSelect) widthSelect.value = PAGE === "team" ? "600" : "800";
  drawEditor();
  $("#editorModal").classList.add("open");
  document.body.style.overflow = "hidden";
  $("#rotL")?.focus();
}
function drawEditor() {
  const { img, rot } = editorState;
  const canvas = $("#editorCanvas");
  const ctx = canvas.getContext("2d");
  const swapped = rot % 180 !== 0;
  const iw = swapped ? img.naturalHeight : img.naturalWidth;
  const ih = swapped ? img.naturalWidth : img.naturalHeight;
  const aspect = parseFloat($("#aspectSel").value) || (iw / ih);
  let cw = iw, ch = ih;
  if (iw / ih > aspect) cw = ih * aspect; else ch = iw / aspect;
  const maxW = parseInt($("#widthSel").value, 10);
  const scale = Math.min(1, maxW / cw);
  canvas.width = Math.round(cw * scale);
  canvas.height = Math.round(ch * scale);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
  ctx.restore();
}
async function applyEditor() {
  const button = $("#editorApply");
  const fieldKey = pendingImageField;
  const tools = button?.parentElement;
  let status = tools?.querySelector("#editorUploadStatus");
  if (!status && tools) {
    status = document.createElement("small");
    status.id = "editorUploadStatus";
    status.className = "muted";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    button.insertAdjacentElement("afterend", status);
  }
  if (button) { button.disabled = true; button.textContent = "Preparing…"; }
  if (status) status.textContent = "Optimizing image…";
  try {
    const canvas = $("#editorCanvas");
    const quality = PAGE === "team" ? 0.76 : 0.80;
    const blob = await withTimeout(new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality)), 30_000, "Image export timed out. Choose a smaller crop or output size.");
    if (!blob) throw new Error("The browser could not export the optimized image.");
    if (blob.size >= 5 * 1024 * 1024) throw new Error("The optimized image is over the 5 MB upload limit. Choose a smaller crop.");
    const { storage } = await withTimeout(sdk(), 30_000, "Could not connect to Firebase Storage. Check your connection and retry.");
    const path = `images/${PAGE}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
    const ref = stMod.ref(storage, path);
    if (button) button.textContent = "Uploading 0%";
    const uploadedRef = await uploadBlobWithProgress(ref, blob, (percent) => {
      if (button?.isConnected) button.textContent = `Uploading ${percent}%`;
      if (status) status.textContent = `Uploading optimized photo: ${percent}%`;
    });
    if (button?.isConnected) button.textContent = "Finishing…";
    if (status) status.textContent = "Upload complete. Getting the public image link…";
    const url = await stMod.getDownloadURL(uploadedRef);
    const input = document.getElementById(`f-${fieldKey}`);
    if (!input) throw new Error("The image field was closed before the upload completed.");
    input.value = url;
    const urlInput = document.getElementById(`url-${fieldKey}`);
    if (urlInput) urlInput.value = url;
    const prev = document.getElementById(`prev-${fieldKey}`);
    if (prev) { prev.src = url; prev.style.display = ""; }
    if (status) status.textContent = "Upload complete. Save the form to publish the photo.";
    closeModals();
    toast("Photo uploaded. Save the form to publish it.", "ok");
  } catch (err) {
    console.error("Image upload failed", err);
    const message = `Upload failed: ${uploadErrorMessage(err)}`;
    if (status) status.textContent = message;
    toast(message, "err");
  } finally {
    if (button?.isConnected) { button.disabled = false; button.textContent = "Use this image"; }
  }
}

/* ---------------- admins & roles (owner only) ---------------- */
async function renderAdmins() {
  const region = $("#pageRegion");
  if (role !== "owner") { region.innerHTML = `<p class="muted">Owner-only section.</p>`; return; }
  region.innerHTML = `
    <div class="card" style="padding:var(--sp-4);margin-bottom:1.2rem">
      <h2 style="margin:0 0 .4rem">Add an admin — one click</h2>
      <p class="muted" style="font-size:.88rem;margin:0 0 1rem">Fill the fields and hit <b>Add admin</b>: a verification link is emailed first, and portal access stays locked until they verify their college email. They then sign in with the temporary password and <b>must choose a new password</b>.</p>
      <form id="addAdminForm" class="form-grid">
        <div class="field"><label for="aa-email">Email *</label><input id="aa-email" type="email" required placeholder="name@trp.srmtrichy.edu.in" /></div>
        <div class="field"><label for="aa-name">Display name</label><input id="aa-name" placeholder="e.g. Keerthivasan A" /></div>
        <div class="field"><label for="aa-role">Role preset</label><select id="aa-role">${Object.entries(ROLES).filter(([r]) => r !== "owner").map(([r, m]) => `<option value="${r}">${m.label} — ${m.blurb}</option>`).join("")}</select></div>
        <div class="field"><label for="aa-pass">Temporary password *</label><div class="password-entry"><input id="aa-pass" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters" /><button class="btn btn-ghost btn-sm" id="aa-pass-toggle" type="button" aria-pressed="false">Show</button></div></div>
        <div class="field full"><label>Can see &amp; edit — tick their sections</label><div class="perm-grid" id="aa-perms">${SECTIONS.map((s) => `<label><input type="checkbox" value="${s}" /> ${esc(SECTION_LABELS[s] || s)}</label>`).join("")}</div></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Add admin</button></div>
      </form>
      <p class="muted" style="font-size:.82rem;margin:.9rem 0 0">
        Passwords are stored hashed by Firebase — <b>nobody can view them</b>, not even you. If someone forgets theirs: row button <b>“Send reset email”</b> below, the <b>“Forgot password?”</b> link on the login page, or (Git Bash, <code>embedx-backend/scripts</code>): <code>node reset-password.js email@x NewTemp123</code>.
      </p>
    </div>
    <div class="admin-directory-head">
      <div><h2 style="margin:0">Current admins</h2><p class="muted" style="margin:.2rem 0 0">Update display names, roles, password resets, access and section permissions. Sign-in email changes require the trusted owner tool and mailbox re-verification.</p></div>
      <div class="admin-directory-tools">
        <label class="sr-only" for="adminSearch">Search admins</label><input id="adminSearch" type="search" placeholder="Search by name or email" autocomplete="off" />
        <label class="sr-only" for="adminRoleFilter">Filter by role</label><select id="adminRoleFilter"><option value="">All roles</option>${Object.entries(ROLES).filter(([r]) => r !== "owner").map(([r, m]) => `<option value="${r}">${m.label}</option>`).join("")}</select>
      </div>
    </div>
    <p id="adminCount" class="muted admin-count" aria-live="polite"></p>
    <div id="adminList" class="admin-list"><div class="skeleton" style="min-height:120px"></div></div>`;
  const applyPreset = () => {
    const preset = LEGACY_PERMS[$("#aa-role").value] || [];
    document.querySelectorAll("#aa-perms input").forEach((c) => { c.checked = preset.includes(c.value); });
  };
  $("#aa-role").addEventListener("change", applyPreset);
  applyPreset();
  $("#aa-pass-toggle").addEventListener("click", (e) => {
    const input = $("#aa-pass");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    e.currentTarget.textContent = show ? "Hide" : "Show";
    e.currentTarget.setAttribute("aria-pressed", String(show));
  });
  $("#addAdminForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#aa-email").value.trim().toLowerCase();
    const name = $("#aa-name").value.trim();
    const r = $("#aa-role").value;
    const pass = $("#aa-pass").value;
    const chosen = [...document.querySelectorAll("#aa-perms input:checked")].map((c) => c.value);
    if (!/^[^\s@]+@trp\.srmtrichy\.edu\.in$/i.test(email)) { toast("Use a valid @trp.srmtrichy.edu.in college email.", "err"); return; }
    if (pass.length < 8) { toast("Temporary password needs 8+ characters.", "err"); return; }
    // Create only genuinely new Auth users. Never grant a role to an existing
    // unverified login: that enables account-squatting attacks on college emails.
    let signup;
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass, returnSecureToken: true })
      });
      signup = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (String(signup.error && signup.error.message).includes("EMAIL_EXISTS")) {
          toast("An Auth login already exists. No portal role was granted. Confirm ownership and use the trusted Firebase Admin setup process for verified existing accounts.", "err");
        } else toast(`Login create failed: ${(signup.error && signup.error.message) || res.status}`, "err");
        return;
      }
    } catch (err) { toast(`Network error: ${err.message}`, "err"); return; }

    // Verify that the intended user controls the mailbox before opening portal access.
    try {
      const verify = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "VERIFY_EMAIL", idToken: signup.idToken })
      });
      if (!verify.ok) throw new Error("Firebase could not send the verification email.");
    } catch (err) {
      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseConfig.apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: signup.idToken })
      }).catch(() => {});
      toast(`${err.message} No portal role was created.`, "err");
      return;
    }

    const { db } = await sdk();
    try {
      await dbMod.setDoc(dbMod.doc(db, "admin_roles", email), {
        role: r, name, addedBy: me, addedAt: new Date().toISOString(),
        mustChangePassword: true, emailVerificationRequired: true, perms: chosen
      }, { merge: true });
      toast(`Login created and verification email sent to ${email}. After verifying, they sign in with the temporary password and choose a new one.`, "ok");
      $("#addAdminForm").reset();
      loadAdmins();
    } catch (err) { toast(`Role save failed: ${err.message}. The new login has no portal access until the role is saved.`, "err"); }
  });
  loadAdmins();
}

async function loadAdmins() {
  const region = $("#adminList");
  if (!region) return;
  let rows = [];
  let ownerActivity = {};
  try {
    const { db } = await sdk();
    const snap = await dbMod.getDocs(dbMod.collection(db, "admin_roles"));
    rows = snap.docs.map((d) => ({ email: d.id, ...d.data() }));
    ownerActivity = rows.find((row) => row.email === OWNER_EMAIL) || {};
    rows = rows.filter((row) => row.email !== OWNER_EMAIL);
  } catch (err) { region.innerHTML = `<p class="muted">${esc(err.message)}</p>`; return; }
  region.innerHTML = `
    <section class="admin-user-card admin-owner-card card" data-owner="true" data-admin-email="${esc(OWNER_EMAIL)}" aria-label="Portal owner">
      <div class="admin-user-identity"><span class="admin-avatar" aria-hidden="true">O</span><div class="admin-user-copy"><strong title="${esc(OWNER_EMAIL)}">${esc(OWNER_EMAIL)}</strong><span class="muted">Full control · built-in account · cannot be revoked</span></div></div>
      <span class="chip chip-accent admin-owner-badge">Owner</span>
      <div class="admin-user-activity" data-admin-presence data-last-active="${activityMillis(ownerActivity.lastActiveAt)}" data-last-login="${activityMillis(ownerActivity.lastLoginAt)}"><span class="chip activity-status" data-presence-status></span><span data-last-active-label></span><span data-last-login-label></span></div>
    </section>
    ${rows.map((a) => `
    <section class="admin-user-card card" data-admin-email="${esc(a.email)}" data-search="${esc(`${a.email} ${a.name || ""}`.toLowerCase())}" data-role="${esc(a.role || "")}" data-added="${esc((a.addedAt || "").slice(0, 10))}">
      <div class="admin-user-identity">
        <span class="admin-avatar" aria-hidden="true">${esc((a.name || a.email).trim().charAt(0).toUpperCase())}</span>
        <div class="admin-user-copy"><strong class="admin-user-email" title="${esc(a.email)}">${esc(a.email)}</strong><span class="muted">${esc(a.name || "Name not set")}${a.addedAt ? ` · Added ${(a.addedAt || "").slice(0, 10)}` : ""}</span></div>
      </div>
      ${(a.emailVerificationRequired || a.mustChangePassword) ? `<div class="admin-user-status">
        ${a.emailVerificationRequired ? `<span class="chip admin-password-due" title="Email must be verified before portal access">✉ Verify email</span>` : ""}
        ${a.mustChangePassword ? `<span class="chip admin-password-due" title="Must change temporary password at next login">🔑 Change password due</span>` : ""}
      </div>` : ""}
      <div class="admin-user-activity" data-admin-presence data-last-active="${activityMillis(a.lastActiveAt)}" data-last-login="${activityMillis(a.lastLoginAt)}"><span class="chip activity-status" data-presence-status></span><span data-last-active-label></span><span data-last-login-label></span></div>
      <div class="admin-user-actions">
        <label class="admin-role-control"><span>Role</span><select data-rolefor="${esc(a.email)}">
          ${Object.entries(ROLES).filter(([r]) => r !== "owner").map(([r, m]) => `<option value="${r}" ${a.role === r ? "selected" : ""}>${m.label}</option>`).join("")}
        </select></label>
        <button class="btn btn-ghost btn-sm" data-reset="${esc(a.email)}">Send reset email</button>
        <button class="btn btn-danger btn-sm" data-revoke="${esc(a.email)}">Revoke access</button>
      </div>
      <details class="admin-profile-edit">
        <summary><span>Profile &amp; sign-in</span><span class="muted">Display name is editable here; sign-in email requires verification</span></summary>
        <div class="admin-profile-edit-content">
          <label class="admin-name-control">Display name<input type="text" data-admin-name maxlength="80" value="${esc(a.name || "")}" autocomplete="off" /></label>
          <button class="btn btn-ghost btn-sm" data-save-name="${esc(a.email)}">Save name</button>
          <p class="muted admin-email-help">To change sign-in email safely, run <code>node update-admin.js current@trp.srmtrichy.edu.in new@trp.srmtrichy.edu.in "New Name"</code> from the trusted <code>backend-bundle/scripts</code> directory. The user must verify the new mailbox before portal access.</p>
        </div>
      </details>
      <details class="perm-edit">
        <summary><span>Section permissions</span><span class="muted">Choose what this admin can view and edit</span></summary>
        <div class="perm-edit-content"><div class="perm-grid">${SECTIONS.map((s) => `<label><input type="checkbox" data-p="${s}" ${((Array.isArray(a.perms) ? a.perms : LEGACY_PERMS[a.role]) || []).includes(s) ? "checked" : ""} /> ${esc(SECTION_LABELS[s] || s)}</label>`).join("")}</div>
        <button class="btn btn-primary btn-sm" data-saveperms="${esc(a.email)}">Save permissions</button></div>
      </details>
    </section>`).join("")}`;
  region.querySelectorAll(".admin-user-card").forEach(paintPresenceCard);
  void startAdminPresenceWatch();
  const applyAdminFilters = () => {
    const query = $("#adminSearch").value.trim().toLowerCase();
    const selectedRole = $("#adminRoleFilter").value;
    let visible = 0;
    region.querySelectorAll(".admin-user-card:not([data-owner])").forEach((card) => {
      const show = card.dataset.search.includes(query) && (!selectedRole || card.dataset.role === selectedRole);
      card.hidden = !show;
      if (show) visible++;
    });
    $("#adminCount").textContent = `${visible} admin${visible === 1 ? "" : "s"}${query || selectedRole ? " match your filters" : ""}`;
  };
  $("#adminSearch").addEventListener("input", applyAdminFilters);
  $("#adminRoleFilter").addEventListener("change", applyAdminFilters);
  applyAdminFilters();
  region.querySelectorAll("[data-save-name]").forEach((button) => button.addEventListener("click", async () => {
    const card = button.closest(".admin-user-card");
    const input = card.querySelector("[data-admin-name]");
    const name = input.value.trim();
    if (name.length < 2 || name.length > 80) { toast("Display name must be 2–80 characters.", "err"); input.focus(); return; }
    button.disabled = true;
    try {
      const { db } = await sdk();
      await dbMod.updateDoc(dbMod.doc(db, "admin_roles", button.dataset.saveName), {
        name, nameUpdatedAt: new Date().toISOString(), nameUpdatedBy: me
      });
      card.dataset.search = `${button.dataset.saveName} ${name}`.toLowerCase();
      const copy = card.querySelector(".admin-user-copy .muted");
      if (copy) copy.textContent = `${name}${card.dataset.added ? ` · Added ${card.dataset.added}` : ""}`;
      const avatar = card.querySelector(".admin-avatar");
      if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
      applyAdminFilters();
      toast(`Display name updated for ${button.dataset.saveName}.`, "ok");
    } catch (err) { toast(`Name was not updated: ${err.message}`, "err"); }
    finally { button.disabled = false; }
  }));
  region.querySelectorAll("[data-saveperms]").forEach((b) => b.addEventListener("click", async () => {
    const chosen = [...b.parentElement.querySelectorAll("input[data-p]:checked")].map((c) => c.dataset.p);
    b.disabled = true;
    try {
      const { db } = await sdk();
      await dbMod.updateDoc(dbMod.doc(db, "admin_roles", b.dataset.saveperms), { perms: chosen });
      toast(`Permissions saved for ${b.dataset.saveperms} ✔ (applies on their next sign-in)`, "ok");
    } catch (err) { toast(`Permissions not saved: ${err.message}`, "err"); }
    finally { b.disabled = false; }
  }));
  region.querySelectorAll("[data-rolefor]").forEach((s) => s.addEventListener("change", async () => {
    const card = s.closest(".admin-user-card");
    const previous = card.dataset.role;
    s.disabled = true;
    try {
      const { db } = await sdk();
      await dbMod.updateDoc(dbMod.doc(db, "admin_roles", s.dataset.rolefor), { role: s.value });
      card.dataset.role = s.value;
      applyAdminFilters();
      toast("Role updated ✔", "ok");
    } catch (err) { s.value = previous; toast(`Role not updated: ${err.message}`, "err"); }
    finally { s.disabled = false; }
  }));
  region.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", async () => {
    try {
      const { auth } = await sdk();
      await authMod.sendPasswordResetEmail(auth, b.dataset.reset);
      toast(`Reset email sent to ${b.dataset.reset} ✔`, "ok");
    } catch (err) { toast(`Could not send: ${err.message}`, "err"); }
  }));
  region.querySelectorAll("[data-revoke]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm(`Remove portal access for ${b.dataset.revoke}? (Their login stays but can no longer enter the portal.)`)) return;
    b.disabled = true;
    try {
      const { db } = await sdk();
      await dbMod.deleteDoc(dbMod.doc(db, "admin_roles", b.dataset.revoke));
      toast("Access revoked.", "ok");
      loadAdmins();
    } catch (err) { b.disabled = false; toast(`Access was not revoked: ${err.message}`, "err"); }
  }));
}

/* ---------------- shared modals (injected on pages that don't ship them) ---------------- */
const MODALS_HTML = `
<div class="modal-backdrop" id="formModal" role="dialog" aria-modal="true" aria-labelledby="formModalTitle">
  <div class="modal" style="width:min(720px,100%)">
    <button class="icon-btn modal-close" data-modal-close aria-label="Close form"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    <h2 id="formModalTitle">New item</h2>
    <form id="entityForm" novalidate><div class="form-grid" id="entityFields"></div>
      <div style="display:flex;gap:.7rem;justify-content:flex-end;margin-top:1.2rem">
        <button type="button" class="btn btn-ghost" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  </div>
</div>
<div class="modal-backdrop" id="editorModal" role="dialog" aria-modal="true" aria-labelledby="editorTitle">
  <div class="modal" style="width:min(760px,100%)">
    <button class="icon-btn modal-close" data-modal-close aria-label="Close editor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    <h2 id="editorTitle">Edit photo</h2>
    <div class="editor-grid">
      <canvas id="editorCanvas" style="max-width:100%;border-radius:var(--r-sm);background:var(--bg-3)"></canvas>
      <div class="editor-tools">
        <p class="muted" style="font-size:.85rem">Rotate, pick a crop aspect and export size. Team portraits default to a smaller WebP to speed up uploads.</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost btn-sm" id="rotL">&#10554; Rotate</button>
          <button type="button" class="btn btn-ghost btn-sm" id="rotR">&#10555; Rotate</button>
        </div>
        <div class="field" style="margin-top:.8rem"><label for="aspectSel">Crop aspect</label>
          <select id="aspectSel"><option value="0">Original</option><option value="1">Square 1:1</option><option value="1.3333">4:3</option><option value="1.7778">16:9</option><option value="0.75">3:4 portrait</option></select></div>
        <div class="field"><label for="widthSel">Max width</label>
          <select id="widthSel"><option>400</option><option>600</option><option>800</option><option>1200</option><option>1600</option></select></div>
        <button type="button" class="btn btn-primary" id="editorApply" style="width:100%;margin-top:.6rem">Use this image</button>
      </div>
    </div>
  </div>
</div>`;
if (!document.getElementById("formModal")) document.body.insertAdjacentHTML("beforeend", MODALS_HTML);

/* ---------------- SPA navigation: sidebar/cards/chips switch instantly ---------------- */
document.addEventListener("click", (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href^="/admin"]');
  if (!a) return;
  const page = pageFromPath(new URL(a.href, location.origin).pathname);
  if (!page) return;
  e.preventDefault();
  navigate(page);
});
window.addEventListener("popstate", (e) => {
  navigate((e.state && e.state.page) || pageFromPath(location.pathname) || "overview", false);
});

/* ---------------- wiring (modals exist only on CRUD pages — guard every lookup) ---------------- */
$("#entityForm")?.addEventListener("submit", saveForm);
document.querySelectorAll(".modal-backdrop").forEach((bd) => {
  bd.addEventListener("click", (e) => { if (e.target === bd) closeModals(); });
  bd.querySelectorAll("[data-modal-close]").forEach((x) => x.addEventListener("click", closeModals));
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.querySelector(".modal-backdrop.open")) { closeModals(); return; }
  trapAdminModalTab(e);
});
$("#rotL")?.addEventListener("click", () => { editorState.rot = (editorState.rot + 270) % 360; drawEditor(); });
$("#rotR")?.addEventListener("click", () => { editorState.rot = (editorState.rot + 90) % 360; drawEditor(); });
$("#aspectSel")?.addEventListener("change", drawEditor);
$("#widthSel")?.addEventListener("change", drawEditor);
$("#editorApply")?.addEventListener("click", applyEditor);
boot().catch((err) => {
  console.error(err);
  const lv = document.getElementById("loginView");
  if (lv) { lv.hidden = false; lv.style.display = ""; }
  const le = document.getElementById("loginError");
  if (le) le.textContent = "Portal failed to start: " + err.message;
});
