// EMBEDX — Admin portal: multi-page, role-based CMS.
// One page per section (/admin/, /admin/events, /admin/admins, …) sharing this module.
// Real security lives in firestore.rules / storage.rules (roles from `admin_roles` collection).
import { firebaseConfig, isConfigured, taskMail } from "./config.js?v=20261106-admin-controls";
import { toast } from "./ui.js?v=20261106-admin-controls";
import { esc, asset } from "./render.js?v=20261106-admin-controls";
import { announcements as starterAnnouncements } from "./data/announcements.js?v=20261106-admin-controls";
import { events as starterEvents } from "./data/events.js?v=20261106-admin-controls";
import { projects as starterProjects } from "./data/projects.js?v=20261106-admin-controls";
import { team as starterTeam } from "./data/team.js?v=20261106-admin-controls";
import { gallery as starterGallery } from "./data/gallery.js?v=20261106-admin-controls";
import { resources as starterResources } from "./data/resources.js?v=20261106-admin-controls";
import { achievements as starterAchievements } from "./data/achievements.js?v=20261106-admin-controls";
import { forms as starterForms } from "./data/forms.js?v=20261106-admin-controls";
import { DEFAULT_SITE_SETTINGS, getSiteSettings } from "./store.js?v=20261106-site-settings";

const STARTER_CONTENT = {
  announcements: starterAnnouncements,
  events: starterEvents,
  projects: starterProjects,
  team: starterTeam,
  gallery: starterGallery,
  resources: starterResources,
  achievements: starterAchievements,
  forms: starterForms
};

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
let PAGE = document.body.dataset.adminPage || "overview";
const OWNER_EMAIL = "814725105014@trp.srmtrichy.edu.in";

// page metadata — drives instant client-side navigation (SPA with real URLs)
const PAGES = {
  overview:      { h1: "Overview",       hint: "Live counts, your open tasks and access at a glance.", crud: false },
  announcements: { h1: "Announcements",  hint: "Published instantly to the home-page notice board (pinned first).", crud: true },
  events:        { h1: "Events",         hint: "Create and update upcoming events, posters and details.", crud: true },
  projects:      { h1: "Projects",       hint: "Featured projects appear on the home page grid.", crud: true },
  team:          { h1: "Team",           hint: "Executive council & faculty — swap photos and edit details any time.", crud: true },
  gallery:       { h1: "Gallery",        hint: "Upload, replace or edit photos for the home-page gallery.", crud: true },
  resources:     { h1: "Resources",      hint: "Learning Hub guides with category filters.", crud: true },
  achievements:  { h1: "Achievers",      hint: "Hall of Achievers cards.", crud: true },
  forms:         { h1: "Forms & responses", hint: "Design forms, close intake, review submissions, export records, and manage Google Sheets sync.", crud: false },
  site:          { h1: "Website settings", hint: "Update college contact information, social links, and the official college logo used across the site.", crud: false },
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
  technical: ["projects", "resources", "achievements"],
  hod: []
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
let items = [], editingId = null, pendingImageField = null, editorState = null;
let statsCache = null;
let listRequestId = 0;
let formsRefreshTimer = null;

async function sdk() {
  const { initializeApp, getApps, getApp } = await import(`${SDK}/firebase-app.js`);
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authMod = authMod || (await import(`${SDK}/firebase-auth.js`));
  dbMod = dbMod || (await import(`${SDK}/firebase-firestore.js`));
  stMod = stMod || (await import(`${SDK}/firebase-storage.js`));
  return { auth: authMod.getAuth(app), db: dbMod.getFirestore(app), storage: stMod.getStorage(app) };
}
const $ = (s) => document.querySelector(s);
const can = (sec) => role === "owner" || perms.includes(sec);
const canView = (sec) => can(sec) || (role === "hod" && sec !== "tasks" && sec !== "admins" && sec !== "forms");

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
      { k: "date", t: "text", label: "Date label" },
      { k: "venue", t: "text", label: "Venue" },
      { k: "registrationStatus", t: "text", label: "Registration status" },
      { k: "eligibility", t: "text", label: "Eligibility" },
      { k: "description", t: "textarea", label: "Description" },
      { k: "imageUrl", t: "image", label: "Poster image" },
      { k: "isUpcoming", t: "check", label: "Upcoming event" },
      { k: "featured", t: "check", label: "Featured" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { isUpcoming: true, featured: false, order: 1, type: "Technical Workshop" },
    image: "imageUrl",
    title: (d) => d.title,
    sub: (d) => `${d.type || ""} • ${d.date || ""} ${d.isUpcoming ? "• upcoming" : ""}`
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
      { k: "email", t: "text", label: "Email" },
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
    label: "photo",
    sort: ["order", "asc"],
    fields: [
      { k: "caption", t: "text", req: true, label: "Caption" },
      { k: "imageUrl", t: "image", req: true, label: "Photo URL or upload" },
      { k: "event", t: "text", label: "Event name (optional)" },
      { k: "order", t: "num", label: "Display order" }
    ],
    defaults: { order: 1 },
    image: "imageUrl",
    title: (d) => d.caption,
    sub: (d) => d.event || ""
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
    if (!user) { showView("out"); return; }
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
    showView("in");
    renderShell();
    renderMain();
    route();
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
function renderShell() {
  $("#adminTop").innerHTML = `
    <div class="wrap admin-top-inner">
      <a class="brand admin-brand" href="/" aria-label="EMBEDX — Department of EEE, SRM TRP Engineering College"><img src="/assets/images/embedx-emblem.webp" alt="" width="38" height="38" /><span class="brand-copy"><span class="brand-name">EMBED<span>X</span></span><span class="brand-sub">Department of EEE</span><span class="brand-institution">SRM TRP Engineering College · Admin</span></span><span class="admin-college-logo-frame"><img class="admin-college-mark" src="https://trp.srmtrichy.edu.in/wp-content/uploads/2026/03/TRP.png" alt="SRM TRP Engineering College logo" /></span></a>
      <div class="admin-top-actions">
        <span class="chip chip-accent" title="Signed in as">${esc(me)}</span>
        <span class="chip" title="Your role">${esc(ROLES[role].label)}</span>
        <a class="btn btn-ghost btn-sm" href="/">View site</a>
        <button class="btn btn-ghost btn-sm" id="signOut">Sign out</button>
      </div>
    </div>`;
  const adminCollegeLogo = $("#adminTop .admin-college-mark");
  getSiteSettings().then((settings) => {
    if (!adminCollegeLogo) return;
    const url = String(settings.collegeLogoUrl || "");
    if (url.startsWith("/assets/images/") && !url.split(/[?#]/, 1)[0].split("/").includes("..")) adminCollegeLogo.src = url;
    else { try { const parsed = new URL(url); if (parsed.protocol === "https:" && parsed.hostname === "trp.srmtrichy.edu.in") adminCollegeLogo.src = parsed.href; } catch { /* keep bundled default */ } }
  }).catch(() => {});
  $("#signOut").addEventListener("click", async () => { const { auth } = await sdk(); authMod.signOut(auth); location.href = "/admin/"; });
  $("#adminNav").innerHTML = NAV
    .filter(([id]) => id === "overview" || id === "tasks" || (id === "admins" ? role === "owner" : canView(id)))
    .map(([id, label, href]) => `<a href="${href}" class="${id === PAGE ? "active" : ""}">${esc(label)}</a>`).join("");
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
  if (!PAGES[page]) page = "overview";
  if (formsRefreshTimer) { clearInterval(formsRefreshTimer); formsRefreshTimer = null; }
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
  if (PAGE !== "overview" || !region.isConnected) return;
  region.innerHTML = `
    <p class="muted" style="margin:.2rem 0 1rem">${esc(ROLES[role].blurb)}.</p>
    <div class="admin-cards">
      ${counts.map(([n, c]) => `<a class="admin-card card" href="/admin/${n}"><b>${c}</b><span>${n}</span></a>`).join("")}
    </div>
    ${role === "owner" && isConfigured ? `<section class="admin-seed-toolbar card"><div><strong>Starter content</strong><p class="muted">Add missing bundled content across all public collections. Existing Firestore documents and admin edits are never overwritten.</p></div><button class="btn btn-ghost btn-sm" id="restoreStarterContent">Restore missing content</button></section>` : ""}
    <h2 style="margin:1.8rem 0 .6rem">My open tasks ${mine.length ? `(${mine.length})` : ""}</h2>
    ${mine.length ? mine.map(taskRow).join("") : `<p class="muted">Nothing assigned to you right now. ${role === "owner" || role === "president" ? "Assign work from the <a href='/admin/tasks'>Tasks</a> page." : ""}</p>`}
    <h2 style="margin:1.8rem 0 .6rem">Your access</h2>
    <div class="admin-list">
      ${NAV.filter(([id]) => id !== "overview" && id !== "tasks" && (id !== "admins" || role === "owner") && canView(id)).map(([id, label]) =>
        `<div class="admin-row card"><div class="admin-row-main"><strong>${esc(label)}</strong><span class="muted">${can(id) ? "read + write" : "read only"}</span></div></div>`).join("")}
      <div class="admin-row card"><div class="admin-row-main"><strong>Tasks</strong><span class="muted">${can("tasks") ? "assign + edit" : "your assigned tasks"}</span></div></div>
    </div>`;
  region.querySelector("#restoreStarterContent")?.addEventListener("click", (event) => restoreStarterContent(event.currentTarget));
}

async function restoreStarterContent(button) {
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "Restoring…";
  let added = 0;
  try {
    const { db } = await sdk();
    for (const [collectionName, rows] of Object.entries(STARTER_CONTENT)) {
      if (!rows.length) continue;
      let presentIds = new Set();
      let presentGalleryImages = new Set();
      if (collectionName === "gallery") {
        const currentGallery = await dbMod.getDocs(dbMod.collection(db, "gallery"));
        presentIds = new Set(currentGallery.docs.map((doc) => doc.id));
        presentGalleryImages = new Set(currentGallery.docs.map((doc) => doc.get("imageUrl")).filter(Boolean));
      }
      const candidates = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
        row.id && !presentIds.has(row.id) && !(collectionName === "gallery" && presentGalleryImages.has(row.imageUrl))
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
    toast(added ? `Restored ${added} missing starter record${added === 1 ? "" : "s"}. Existing content was preserved.` : "Starter content is already present; nothing was changed.", "ok");
    await renderOverview();
  } catch (err) {
    console.error("Starter content restore failed", err);
    toast(`Content restore stopped after ${added} addition(s): ${err.message}`, "err");
    await renderOverview();
  } finally {
    if (button.isConnected) { button.disabled = false; button.textContent = label; }
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
    const settings = snap.exists() ? { ...DEFAULT_SITE_SETTINGS, ...snap.data() } : { ...DEFAULT_SITE_SETTINGS };
    if (PAGE !== "site" || !region.isConnected) return;
    region.innerHTML = `<section class="admin-site-settings card"><div class="admin-form-toolbar"><div><h2>Public contact &amp; social links</h2><p class="muted">Edit these once here; the public footer and Contact page use the saved values after reload.</p></div></div>
      <div class="admin-site-logo-preview"><img id="siteLogoPreview" src="${esc(settings.collegeLogoUrl)}" alt="College logo preview" /><div><strong>College logo</strong><p class="muted">Transparent artwork displays on a white tile. Use an /assets/images/ path or an HTTPS URL on trp.srmtrichy.edu.in.</p></div></div>
      <div class="form-grid admin-site-grid">
        ${siteSettingField("collegeLogoUrl", "College logo image URL", settings.collegeLogoUrl, "https://trp.srmtrichy.edu.in/... or /assets/images/college.png", "url")}
        ${siteSettingField("collegeWebsiteUrl", "Official college website", settings.collegeWebsiteUrl, "https://www.example.edu", "url")}
        ${siteSettingField("contactEmail", "Public contact email", settings.contactEmail, "department@example.edu", "email")}
        ${siteSettingField("phoneDisplay", "Public phone number", settings.phoneDisplay, "+91 431 2908050", "tel")}
        ${siteSettingField("linkedinUrl", "LinkedIn URL", settings.linkedinUrl, "https://www.linkedin.com/...", "url")}
        ${siteSettingField("instagramUrl", "Instagram URL", settings.instagramUrl, "https://www.instagram.com/...", "url")}
        ${siteSettingField("facebookUrl", "Facebook URL", settings.facebookUrl, "https://www.facebook.com/...", "url")}
      </div>
      ${can("site") ? `<div class="admin-site-actions"><p class="muted" id="siteSettingsMessage" role="status"></p><button class="btn btn-primary" id="saveSiteSettings">Save website settings</button></div>` : `<p class="muted">Read only — ask the owner to grant Website settings permission.</p>`}
    </section>`;
    const logoInput = region.querySelector("[name=collegeLogoUrl]");
    logoInput?.addEventListener("input", () => { const preview = region.querySelector("#siteLogoPreview"); if (preview) preview.src = logoInput.value.trim(); });
    region.querySelector("#saveSiteSettings")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const message = region.querySelector("#siteSettingsMessage");
      const fieldValue = (key) => region.querySelector(`[name="${key}"]`).value.trim();
      const updated = {
        collegeLogoUrl: fieldValue("collegeLogoUrl"),
        collegeWebsiteUrl: fieldValue("collegeWebsiteUrl"),
        contactEmail: fieldValue("contactEmail"),
        phoneDisplay: fieldValue("phoneDisplay"),
        linkedinUrl: fieldValue("linkedinUrl"),
        instagramUrl: fieldValue("instagramUrl"),
        facebookUrl: fieldValue("facebookUrl")
      };
      const urlValid = (value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
      const logoPathValid = (value) => value.startsWith("/assets/images/") && !value.split(/[?#]/, 1)[0].split("/").includes("..")
        || (() => { try { const u = new URL(value); return u.protocol === "https:" && u.hostname === "trp.srmtrichy.edu.in"; } catch { return false; } })();
      if (!logoPathValid(updated.collegeLogoUrl)) { message.textContent = "Use a local /assets/images/ logo or an HTTPS logo hosted on trp.srmtrichy.edu.in."; return; }
      if (!urlValid(updated.collegeWebsiteUrl)) { message.textContent = "The official website must be a valid HTTPS URL."; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(updated.contactEmail) || updated.contactEmail.length > 120) { message.textContent = "Enter a valid contact email (up to 120 characters)."; return; }
      if (!/^[+0-9()\s-]{8,24}$/.test(updated.phoneDisplay) || updated.phoneDisplay.replace(/\D/g, "").length < 8) { message.textContent = "Enter a phone number with 8–15 digits."; return; }
      for (const key of ["linkedinUrl", "instagramUrl", "facebookUrl"]) if (updated[key] && !urlValid(updated[key])) { message.textContent = `${key.replace("Url", "")} must be an HTTPS URL or left blank.`; return; }
      updated.phoneHref = `tel:${updated.phoneDisplay.replace(/\D/g, "")}`;
      try { updated.collegeWebsiteLabel = new URL(updated.collegeWebsiteUrl).hostname.replace(/^www\./, ""); } catch { updated.collegeWebsiteLabel = updated.collegeWebsiteUrl; }
      button.disabled = true; button.textContent = "Saving…"; message.textContent = "";
      try {
        await dbMod.setDoc(dbMod.doc(db, "site_settings", "site"), { ...updated, updatedAt: new Date().toISOString() });
        toast("Website settings saved. Public pages will show them after reload.", "ok");
        message.textContent = "Saved successfully. Reload a public page to see the updated links.";
      } catch (err) { message.textContent = `Save failed: ${err.message}`; toast("Could not save website settings.", "err"); }
      finally { button.disabled = false; button.textContent = "Save website settings"; }
    });
  } catch (err) {
    console.error("Website settings failed", err);
    region.innerHTML = `<p class="muted">Could not load website settings: ${esc(err.message)}</p>`;
  }
}

function siteSettingField(name, label, value, placeholder, type) {
  return `<div class="field"><label for="site-${name}">${esc(label)}</label><input id="site-${name}" name="${name}" type="${type}" value="${esc(value || "")}" placeholder="${esc(placeholder)}" autocomplete="off" /></div>`;
}

/* ---------------- forms, responses, and sheet status ---------------- */
async function renderForms() {
  if (formsRefreshTimer) { clearInterval(formsRefreshTimer); formsRefreshTimer = null; }
  const region = $("#pageRegion");
  if (!canView("forms")) { region.innerHTML = `<p class="muted">Forms access is not assigned to your account.</p>`; return; }
  region.innerHTML = `<div class="skeleton" style="min-height:180px"></div>`;
  try {
    const { db } = await sdk();
    const [formSnap, settingSnap, joinSnap, enquirySnap] = await Promise.all([
      dbMod.getDocs(dbMod.collection(db, "forms")),
      dbMod.getDoc(dbMod.doc(db, "site_settings", "forms")).catch(() => null),
      dbMod.getDocs(dbMod.collection(db, "members_applications")),
      dbMod.getDocs(dbMod.collection(db, "contact_messages"))
    ]);
    const forms = formSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.title).localeCompare(String(b.title)));
    const setting = settingSnap?.exists() ? settingSnap.data() : {};
    const lastJoin = joinSnap.docs.map((d) => ({ id: d.id, ...d.data(), _collection: "members_applications" })).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 5);
    const lastEnquiry = enquirySnap.docs.map((d) => ({ id: d.id, ...d.data(), _collection: "contact_messages" })).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 5);
    if (PAGE !== "forms" || !region.isConnected) return;
    region.innerHTML = `
      <section class="admin-sheet-status card">
        <div><strong>Google Sheets response archive</strong><p class="muted">${setting.lastError ? `Last sync error: ${esc(setting.lastError)}` : setting.lastSyncedAt ? `Last synced ${esc(setting.lastSyncedAt)}` : "Set up the owner Apps Script once to auto-create a spreadsheet and sync every five minutes."}</p></div>
        ${setting.spreadsheetUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(setting.spreadsheetUrl)}" target="_blank" rel="noopener noreferrer">Open response sheet</a>` : `<span class="chip">Not connected yet</span>`}
      </section>
      <section class="admin-form-toolbar"><div><h2>Managed forms</h2><p class="muted">Open, close, seed, and share forms. Closed forms reject new responses. Custom forms support star ratings and exportable responses. Responses auto-refresh every 30 seconds.</p></div><div class="admin-form-toolbar-actions"><button class="btn btn-ghost btn-sm" id="refreshForms">Refresh</button>${can("forms") ? `<button class="btn btn-ghost btn-sm" id="seedForms">Seed standard forms</button><button class="btn btn-primary btn-sm" id="newManagedForm">+ Create form</button>` : ""}</div></section>
      <div class="admin-managed-forms">${forms.length ? forms.map((form) => `
        <article class="admin-managed-form card">
          <div class="admin-managed-form-copy"><div class="admin-form-title-line"><strong>${esc(form.title || form.id)}</strong><span class="chip ${form.status === "open" ? "chip-accent" : ""}">${esc(form.status || "draft")}</span>${form.builtin ? `<span class="chip">Built in</span>` : ""}</div><p class="muted">${esc(form.description || "")}</p><small>${(form.fields || []).length} field(s) · ${esc(form.kind || "custom")}</small></div>
          <div class="admin-row-actions">
            <button class="btn btn-ghost btn-sm" data-form-responses="${esc(form.id)}">View responses</button>
            ${can("forms") ? `<button class="btn btn-ghost btn-sm" data-form-edit="${esc(form.id)}">${form.builtin ? "Edit settings" : "Edit"}</button><button class="btn btn-ghost btn-sm" data-form-toggle="${esc(form.id)}">${form.status === "open" ? "Close" : "Open"}</button>${!form.builtin ? `<button class="btn btn-danger btn-sm" data-form-delete="${esc(form.id)}">Delete</button>` : ""}` : ""}
            <button class="btn btn-ghost btn-sm" data-form-copy="${esc(form.id)}">Copy link</button>
          </div>
        </article>`).join("") : `<p class="muted">No forms yet. Seed the standard forms or create a new one.</p>`}</div>
      <section class="admin-legacy-submissions"><div class="admin-form-toolbar"><div><h2>Recent join applications</h2><p class="muted">${joinSnap.size} total · newest first</p></div><button class="btn btn-ghost btn-sm" id="exportJoin">Export CSV</button></div>${renderLegacyPreview(lastJoin, "members_applications")}</section>
      <section class="admin-legacy-submissions"><div class="admin-form-toolbar"><div><h2>Recent enquiries</h2><p class="muted">${enquirySnap.size} total · newest first</p></div><button class="btn btn-ghost btn-sm" id="exportEnquiries">Export CSV</button></div>${renderLegacyPreview(lastEnquiry, "contact_messages")}</section>
      <div id="formEditorMount"></div><div id="formResponseMount"></div>`;
    region.querySelector("#refreshForms")?.addEventListener("click", () => renderForms());
    region.querySelector("#seedForms")?.addEventListener("click", () => seedStarterForms());
    region.querySelector("#newManagedForm")?.addEventListener("click", () => showManagedFormEditor(null));
    region.querySelectorAll("[data-form-edit]").forEach((b) => b.addEventListener("click", () => showManagedFormEditor(forms.find((f) => f.id === b.dataset.formEdit))));
    region.querySelectorAll("[data-form-toggle]").forEach((b) => b.addEventListener("click", () => toggleManagedForm(forms.find((f) => f.id === b.dataset.formToggle))));
    region.querySelectorAll("[data-form-delete]").forEach((b) => b.addEventListener("click", () => deleteManagedForm(b.dataset.formDelete)));
    region.querySelectorAll("[data-form-responses]").forEach((b) => b.addEventListener("click", () => showManagedResponses(forms.find((f) => f.id === b.dataset.formResponses))));
    region.querySelectorAll("[data-form-copy]").forEach((b) => b.addEventListener("click", () => copyManagedFormLink(b.dataset.formCopy, forms.find((f) => f.id === b.dataset.formCopy))));
    region.querySelectorAll("[data-delete-legacy]").forEach((b) => b.addEventListener("click", () => deleteLegacyResponse(b.dataset.collection, b.dataset.deleteLegacy)));
    region.querySelector("#exportJoin")?.addEventListener("click", () => exportCsv("embedx-join-applications.csv", joinSnap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    region.querySelector("#exportEnquiries")?.addEventListener("click", () => exportCsv("embedx-enquiries.csv", enquirySnap.docs.map((d) => ({ id: d.id, ...d.data() }))));
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
  return `<div class="admin-response-list">${rows.map((row) => `<article class="admin-response-card card"><div><strong>${esc(row.name || "Unnamed")}</strong><span class="muted">${esc(row.email || "")} · ${esc((row.createdAt || "").slice(0, 19).replace("T", " "))}</span><p>${esc(row.message || row.interest || row.subject || "")}</p></div><button class="btn btn-danger btn-sm" data-collection="${collectionName}" data-delete-legacy="${esc(row.id)}">Delete</button></article>`).join("")}</div>`;
}

async function seedStarterForms() {
  const button = $("#seedForms");
  if (button) { button.disabled = true; button.textContent = "Seeding…"; }
  try {
    const { db } = await sdk();
    let added = 0;
    for (const form of starterForms) {
      const created = await dbMod.runTransaction(db, async (transaction) => {
        const ref = dbMod.doc(db, "forms", form.id);
        const snap = await transaction.get(ref);
        if (snap.exists()) return false;
        const { id, ...data } = form;
        transaction.set(ref, data);
        return true;
      });
      if (created) added++;
    }
    toast(added ? `${added} standard form(s) added without overwriting existing settings.` : "Standard forms are already seeded; no settings changed.", "ok");
    await renderForms();
  } catch (err) { toast(`Could not seed forms: ${err.message}`, "err"); if (button) { button.disabled = false; button.textContent = "Seed standard forms"; } }
}

function showManagedFormEditor(form) {
  if (!can("forms")) return;
  const mount = $("#formEditorMount");
  if (!mount) return;
  const isBuiltin = !!form?.builtin;
  mount.innerHTML = `<section class="admin-form-editor card"><div class="admin-form-toolbar"><div><h2>${form ? "Edit form settings" : "Create a form"}</h2><p class="muted">Custom forms are published at a shareable public URL. Star ratings are available as a field type.</p></div><button class="btn btn-ghost btn-sm" id="cancelFormEdit">Close</button></div>
    <div class="form-grid"><div class="field"><label for="managedFormTitle">Form title</label><input id="managedFormTitle" maxlength="120" value="${esc(form?.title || "")}" /></div><div class="field"><label for="managedFormStatus">Response status</label><select id="managedFormStatus"><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option></select></div><div class="field full"><label for="managedFormDescription">Description</label><textarea id="managedFormDescription" maxlength="600">${esc(form?.description || "")}</textarea></div></div>
    ${isBuiltin ? `<p class="muted">The built-in fields are fixed to preserve the existing application and enquiry schema. You can update the title, description, and open/closed state.</p>` : `<h3>Questions</h3><div id="managedFieldRows">${(form?.fields || []).map(managedFieldRow).join("")}</div><button class="btn btn-ghost btn-sm" id="addManagedField">+ Add question</button>`}
    <div class="admin-form-editor-actions"><button class="btn btn-primary" id="saveManagedForm">Save form</button></div></section>`;
  $("#managedFormStatus").value = form?.status || "draft";
  mount.querySelector("#cancelFormEdit").addEventListener("click", () => { mount.innerHTML = ""; });
  mount.querySelector("#addManagedField")?.addEventListener("click", () => { $("#managedFieldRows").insertAdjacentHTML("beforeend", managedFieldRow({ label: "New question", type: "text", required: false, options: [] })); bindFieldRow(mount.querySelector("#managedFieldRows").lastElementChild); });
  mount.querySelectorAll("[data-remove-question]").forEach((b) => b.addEventListener("click", () => b.closest("[data-field-row]").remove()));
  mount.querySelectorAll("[data-field-type]").forEach((el) => el.addEventListener("change", () => { const row = el.closest("[data-field-row]"); row.querySelector("[data-field-options]").closest(".field").hidden = !["select", "checkboxes"].includes(el.value); }));
  mount.querySelector("#saveManagedForm").addEventListener("click", () => saveManagedForm(form, isBuiltin));
}

function managedFieldRow(field = {}) {
  const types = ["text", "textarea", "email", "tel", "url", "date", "select", "checkboxes", "stars"];
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
  let fields = form?.fields || [];
  if (!isBuiltin) {
    fields = [...document.querySelectorAll("#managedFieldRows [data-field-row]")].map((row) => {
      const label = row.querySelector("[data-field-label]").value.trim();
      const key = row.dataset.key || label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const type = row.querySelector("[data-field-type]").value;
      const options = row.querySelector("[data-field-options]").value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 30);
      return { key, label, type, required: row.querySelector("[data-field-required]").checked, ...(options.length ? { options } : {}) };
    });
    const reservedKeys = new Set(["__proto__", "constructor", "prototype"]);
    if (!fields.length || fields.length > 25 || fields.some((f) => !f.label || !f.key || reservedKeys.has(f.key)) || new Set(fields.map((f) => f.key)).size !== fields.length) { toast("Add 1–25 questions with unique, safe labels.", "err"); return; }
    if (fields.some((f) => ["select", "checkboxes"].includes(f.type) && (!f.options || !f.options.length))) { toast("Add answer options for every select or checkbox question.", "err"); return; }
  }
  try {
    const { db } = await sdk();
    const formId = form?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Date.now().toString(36);
    const data = { title, description, status, kind: form?.kind || "custom", builtin: isBuiltin, fields, updatedAt: new Date().toISOString(), updatedBy: me };
    if (form) await dbMod.updateDoc(dbMod.doc(db, "forms", formId), data);
    else await dbMod.setDoc(dbMod.doc(db, "forms", formId), { ...data, createdAt: new Date().toISOString() });
    toast("Form settings saved.", "ok");
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

function copyManagedFormLink(id, form) {
  const url = form?.kind === "join" ? `${location.origin}/pages/join.html` : form?.kind === "enquiry" ? `${location.origin}/pages/contact.html` : form?.kind === "registration" ? `${location.origin}/pages/event-detail.html?id=embednova#register` : `${location.origin}/pages/form.html?form=${encodeURIComponent(id)}`;
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => toast("Public form link copied.", "ok")).catch(() => window.prompt("Copy this public form link:", url));
  else window.prompt("Copy this public form link:", url);
}

async function deleteManagedForm(formId) {
  if (!can("forms") || !confirm("Delete this form and all of its stored responses? This cannot be undone.")) return;
  try {
    const { db } = await sdk();
    const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "form_responses"), dbMod.where("formId", "==", formId)));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = dbMod.writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await dbMod.deleteDoc(dbMod.doc(db, "forms", formId));
    toast("Form and its responses deleted.", "ok");
    await renderForms();
  } catch (err) { toast(`Could not delete form: ${err.message}`, "err"); }
}

async function showManagedResponses(form) {
  if (!form) return;
  const mount = $("#formResponseMount");
  mount.innerHTML = `<div class="skeleton" style="min-height:120px"></div>`;
  try {
    const { db } = await sdk();
    let rows = [];
    let collectionName = "form_responses";
    if (form.kind === "join" || form.kind === "registration") {
      collectionName = "members_applications";
      const snap = await dbMod.getDocs(dbMod.collection(db, collectionName));
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => form.kind === "registration" ? (d.formId === "embednova" || (!d.formId && String(d.interest || "").includes("EMBEDNOVA Registration"))) : (d.formId === "join" || (!d.formId && !String(d.interest || "").includes("EMBEDNOVA Registration"))));
    } else if (form.kind === "enquiry") {
      collectionName = "contact_messages";
      const snap = await dbMod.getDocs(dbMod.collection(db, collectionName));
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "form_responses"), dbMod.where("formId", "==", form.id)));
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    rows.sort((a, b) => String(b.submittedAt || b.createdAt || "").localeCompare(String(a.submittedAt || a.createdAt || "")));
    const ratingKeys = (form.fields || []).filter((field) => field.type === "stars").map((field) => field.key);
    const ratings = rows.flatMap((row) => ratingKeys.map((key) => Number((row.answers || {})[key])).filter((value) => Number.isFinite(value) && value >= 1 && value <= 5));
    const ratingSummary = ratings.length ? ` · Average rating ${ (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1) }/5 (${ratings.length} ratings)` : "";
    mount.innerHTML = `<section class="admin-form-responses card"><div class="admin-form-toolbar"><div><h2>Responses — ${esc(form.title || form.id)}</h2><p class="muted">${rows.length} response(s)${ratingSummary}. Export opens as CSV in spreadsheet software.</p></div><div><button class="btn btn-ghost btn-sm" id="exportFormResponses">Export CSV</button><button class="btn btn-ghost btn-sm" id="closeFormResponses">Close</button></div></div>${rows.length ? `<div class="admin-response-list">${rows.map((row) => { const answers = row.answers || {}; return `<article class="admin-response-card"><div><strong>${esc(row.name || answers.name || row.email || answers.email || "Response")}</strong><span class="muted">${esc(row.email || answers.email || "")} · ${esc((row.submittedAt || row.createdAt || "").slice(0, 19).replace("T", " "))}</span><p>${esc(row.message || row.subject || answers.message || JSON.stringify(answers))}</p></div><button class="btn btn-danger btn-sm" data-response-delete="${esc(row.id)}" data-response-collection="${collectionName}">Delete</button></article>`; }).join("")}</div>` : `<p class="muted">No responses yet.</p>`}</section>`;
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
function isStarterGalleryPresent(photo, currentItems = items) {
  return currentItems.some((item) => item.id === photo.id || item.imageUrl === photo.imageUrl);
}

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
  if (sec === "gallery" && can(sec) && $("#listRegion")) {
    const toolbar = document.createElement("section");
    toolbar.className = "admin-seed-toolbar admin-gallery-sync card";
    const missing = starterGallery.filter((item) => !isStarterGalleryPresent(item));
    toolbar.innerHTML = `<div class="admin-gallery-sync-copy"><strong>Bundled website gallery · ${starterGallery.length} starter photos</strong><p class="muted">These images are part of the public-site starter set. Import missing photos into Firestore to edit their captions, order, and image links here. Existing entries are preserved; local /assets/ paths and HTTPS image links are supported. File upload requires Firebase Storage.</p><div class="admin-starter-thumbs">${starterGallery.map((photo) => { const present = isStarterGalleryPresent(photo); return `<div class="admin-starter-thumb ${present ? "is-published" : "is-missing"}" title="${esc(photo.caption)}"><img src="${esc(asset(photo.imageUrl))}" alt="${esc(photo.caption)}" loading="lazy" /><span>${present ? "Published" : "Not in Firestore"}</span></div>`; }).join("")}</div></div><button class="btn btn-primary btn-sm" id="restoreGallery" ${missing.length ? "" : "disabled"}>${missing.length ? `Import ${missing.length} missing photo${missing.length === 1 ? "" : "s"}` : "All starter photos imported"}</button>`;
    $("#pageRegion").prepend(toolbar);
    $("#restoreGallery").addEventListener("click", (event) => restoreStarterGallery(event.currentTarget));
  }
  loadStats();
}

async function restoreStarterGallery(button) {
  button.disabled = true;
  try {
    const { db } = await sdk();
    const candidates = starterGallery.filter((item) => !isStarterGalleryPresent(item));
    if (!candidates.length) {
      toast("All starter photos are already in the gallery; nothing was changed.", "info");
      return;
    }
    const added = await dbMod.runTransaction(db, async (transaction) => {
      const refs = candidates.map((item) => dbMod.doc(db, "gallery", item.id));
      const snapshots = [];
      for (const ref of refs) snapshots.push(await transaction.get(ref));
      let count = 0;
      snapshots.forEach((snapshot, index) => {
        if (snapshot.exists()) return;
        const { id, ...data } = candidates[index];
        transaction.set(refs[index], data);
        count++;
      });
      return count;
    });
    toast(added ? `Restored ${added} missing starter photo${added === 1 ? "" : "s"}.` : "Starter photos already exist; nothing was changed.", "ok");
    await loadList("gallery");
    const thumbs = document.querySelectorAll(".admin-starter-thumb");
    starterGallery.forEach((photo, index) => {
      const thumb = thumbs[index]; if (!thumb) return;
      const present = isStarterGalleryPresent(photo);
      thumb.classList.toggle("is-published", present); thumb.classList.toggle("is-missing", !present);
      const badge = thumb.querySelector("span"); if (badge) badge.textContent = present ? "Published" : "Not in Firestore";
    });
    const stillMissing = starterGallery.filter((item) => !isStarterGalleryPresent(item));
    button.textContent = stillMissing.length ? `Import ${stillMissing.length} missing photo${stillMissing.length === 1 ? "" : "s"}` : "All starter photos imported";
    button.disabled = !stillMissing.length;
  } catch (err) {
    console.error("Gallery restore failed", err);
    toast(`Could not restore starter photos: ${err.message}`, "err");
  } finally {
    if (button.isConnected && button.textContent !== "All starter photos imported") button.disabled = false;
  }
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
      ${schema.image && (d[schema.image] || (sec === "achievements" && d.imageUrl)) ? `<img src="${esc(asset(d[schema.image] || d.imageUrl))}" alt="" loading="lazy" />` : '<span class="admin-noimg">◈</span>'}
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
function buildField(f, v) {
  const wrap = document.createElement("div");
  const id = `f-${f.k}`;
  const full = ["textarea", "list", "check", "image"].includes(f.t);
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
    input = document.createElement("textarea"); input.value = v ?? "";
    if (f.t === "list") input.placeholder = "Enter one item per line";
  } else if (f.t === "select") {
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
    urlInput.placeholder = "/assets/images/photo.webp or https://…";
    urlInput.setAttribute("aria-label", `${f.label} URL`);
    urlInput.addEventListener("input", () => {
      input.value = urlInput.value.trim();
      if (input.value) { prev.src = asset(input.value); prev.style.display = ""; }
      else { prev.removeAttribute("src"); prev.style.display = "none"; }
    });
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:.5rem;flex-wrap:wrap;align-items:center";
    const fileLabel = document.createElement("label");
    fileLabel.className = "btn btn-ghost btn-sm"; fileLabel.htmlFor = `file-${f.k}`;
    fileLabel.textContent = "Choose image file";
    const file = document.createElement("input");
    file.id = `file-${f.k}`; file.type = "file"; file.accept = "image/jpeg,image/png,image/webp";
    file.style.display = "none"; file.dataset.imgfield = f.k;
    row.append(fileLabel, file);
    if (v) {
      const editBtn = document.createElement("button");
      editBtn.type = "button"; editBtn.className = "btn btn-ghost btn-sm";
      editBtn.dataset.editimg = f.k; editBtn.textContent = "Edit current photo";
      row.appendChild(editBtn);
    }
    picker.append(prev, urlInput, row);
    wrap.append(picker);
  } else {
    input = document.createElement("input");
    input.type = f.t === "num" ? "number" : f.t === "email" ? "email" : "text";
    input.value = v ?? "";
  }
  input.id = id; input.name = f.k;
  wrap.appendChild(input);
  return wrap;
}

function openForm(id = null) {
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
  $("#formModalTitle").textContent = (id ? "Edit " : "New ") + schema.label;
  const host = $("#entityFields");
  host.innerHTML = "";
  schema.fields.forEach((f) => host.appendChild(buildField(f, data?.[f.k] ?? (f.t === "check" ? false : ""))));

  $("#entityFields").querySelectorAll("input[type=file][data-imgfield]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const file = inp.files[0];
      if (!file) return;
      pendingImageField = inp.dataset.imgfield;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { openEditor(img); URL.revokeObjectURL(url); };
      img.src = url;
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
    if (f.t === "check") data[f.k] = el.checked;
    else if (f.t === "num") data[f.k] = Number(el.value || 0);
    else if (f.t === "list") data[f.k] = String(el.value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    else data[f.k] = String(el.value).trim();
    if (f.req && (!data[f.k] || (Array.isArray(data[f.k]) && !data[f.k].length))) { toast(`“${f.label}” is required.`, "err"); return; }
  }
  for (const field of schema.fields.filter((f) => f.t === "image")) {
    if (!isSafeMediaReference(data[field.k])) { toast(`${field.label} must be a local site path or an HTTPS URL.`, "err"); return; }
  }
  if (Array.isArray(data.gallery) && !data.gallery.every(isSafeMediaReference)) {
    toast("Gallery entries must be local site paths or HTTPS URLs.", "err"); return;
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
      } else toast("Updated ✔", "ok");
    } else {
      if (sec === "announcements" || sec === "tasks") data.createdAt = new Date().toISOString();
      if (sec === "tasks") data.createdBy = me;
      const ref = await dbMod.addDoc(dbMod.collection(db, sec), data);
      if (sec === "tasks" && (data.assigneeEmail || data.assigneeRole)) {
        const state = await notifyTaskAssignee(ref.id);
        toast(state === "requested" ? "Task created. Email notification request sent." : state === "unconfigured" ? "Task created; email notifications are not configured." : "Task created, but the email request could not be sent.", state === "failed" ? "err" : "ok");
      } else toast(sec === "tasks" ? "Task created. No assignee was selected." : "Published ✔", "ok");
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

async function removeItem(id) {
  const sec = PAGE;
  if (!can(sec)) { toast("Your role can't delete here.", "err"); return; }
  if (!confirm(`Delete this ${SCHEMAS[sec].label}? This cannot be undone.`)) return;
  const { db } = await sdk();
  try {
    await dbMod.deleteDoc(dbMod.doc(db, sec, id));
    toast("Deleted.", "ok");
    statsCache = null;
    loadList(sec);
    loadStats();
  } catch (err) { toast(`Delete failed: ${err.message}`, "err"); }
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
  const canvas = $("#editorCanvas");
  const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) { toast("Could not export image.", "err"); return; }
  const { storage } = await sdk();
  const path = `images/${PAGE}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
  try {
    const ref = stMod.ref(storage, path);
    await stMod.uploadBytes(ref, blob, { contentType: "image/webp" });
    const url = await stMod.getDownloadURL(ref);
    const input = document.getElementById(`f-${pendingImageField}`);
    input.value = url;
    const urlInput = document.getElementById(`url-${pendingImageField}`);
    if (urlInput) urlInput.value = url;
    const prev = document.getElementById(`prev-${pendingImageField}`);
    prev.src = url; prev.style.display = "";
    closeModals();
    toast("Photo uploaded ✔", "ok");
  } catch (err) {
    console.error(err);
    toast(`Upload failed: ${err.message}. If Firebase Storage is not enabled, use a deployed /assets/ path or HTTPS image URL instead.`, "err");
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
  try {
    const { db } = await sdk();
    const snap = await dbMod.getDocs(dbMod.collection(db, "admin_roles"));
    rows = snap.docs.map((d) => ({ email: d.id, ...d.data() }));
  } catch (err) { region.innerHTML = `<p class="muted">${esc(err.message)}</p>`; return; }
  region.innerHTML = `
    <section class="admin-user-card admin-owner-card card" data-owner="true" aria-label="Portal owner">
      <div class="admin-user-identity"><span class="admin-avatar" aria-hidden="true">O</span><div class="admin-user-copy"><strong title="${esc(OWNER_EMAIL)}">${esc(OWNER_EMAIL)}</strong><span class="muted">Full control · built-in account · cannot be revoked</span></div></div>
      <span class="chip chip-accent admin-owner-badge">Owner</span>
    </section>
    ${rows.map((a) => `
    <section class="admin-user-card card" data-search="${esc(`${a.email} ${a.name || ""}`.toLowerCase())}" data-role="${esc(a.role || "")}" data-added="${esc((a.addedAt || "").slice(0, 10))}">
      <div class="admin-user-identity">
        <span class="admin-avatar" aria-hidden="true">${esc((a.name || a.email).trim().charAt(0).toUpperCase())}</span>
        <div class="admin-user-copy"><strong class="admin-user-email" title="${esc(a.email)}">${esc(a.email)}</strong><span class="muted">${esc(a.name || "Name not set")}${a.addedAt ? ` · Added ${(a.addedAt || "").slice(0, 10)}` : ""}</span></div>
      </div>
      ${(a.emailVerificationRequired || a.mustChangePassword) ? `<div class="admin-user-status">
        ${a.emailVerificationRequired ? `<span class="chip admin-password-due" title="Email must be verified before portal access">✉ Verify email</span>` : ""}
        ${a.mustChangePassword ? `<span class="chip admin-password-due" title="Must change temporary password at next login">🔑 Change password due</span>` : ""}
      </div>` : ""}
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
        <p class="muted" style="font-size:.85rem">Rotate, pick a crop aspect and export size. The result is uploaded as optimized WebP.</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost btn-sm" id="rotL">&#10554; Rotate</button>
          <button type="button" class="btn btn-ghost btn-sm" id="rotR">&#10555; Rotate</button>
        </div>
        <div class="field" style="margin-top:.8rem"><label for="aspectSel">Crop aspect</label>
          <select id="aspectSel"><option value="0">Original</option><option value="1">Square 1:1</option><option value="1.3333">4:3</option><option value="1.7778">16:9</option><option value="0.75">3:4 portrait</option></select></div>
        <div class="field"><label for="widthSel">Max width</label>
          <select id="widthSel"><option>800</option><option selected>1200</option><option>1600</option></select></div>
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
