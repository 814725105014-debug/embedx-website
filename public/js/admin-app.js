// EMBEDX — Admin portal: multi-page, role-based CMS.
// One page per section (/admin/, /admin/events, /admin/admins, …) sharing this module.
// Real security lives in firestore.rules / storage.rules (roles from `admin_roles` collection).
import { firebaseConfig, isConfigured } from "./config.js";
import { toast } from "./ui.js";
import { esc, asset } from "./render.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
const PAGE = document.body.dataset.adminPage || "overview";
const OWNER_EMAIL = "814725105014@trp.srmtrichy.edu.in";

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
  tasks:         ["owner", "president"],
  admins:        ["owner"]
};
// per-admin custom permissions: the owner ticks exactly these per person.
const SECTIONS = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements", "tasks"];
// fallback for role docs created before custom perms existed (mirrors firestore.rules legacyPerms)
const LEGACY_PERMS = {
  president: ["announcements", "team", "achievements", "tasks"],
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
  ["tasks", "Tasks", "/admin/tasks"],
  ["admins", "Admins & roles", "/admin/admins"]
];

let authMod = null, dbMod = null, stMod = null, app = null;
let role = null, me = "", perms = [];
let items = [], editingId = null, pendingImageField = null, editorState = null;

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
      { k: "domain", t: "text", label: "Domain" },
      { k: "summary", t: "textarea", label: "Summary" },
      { k: "imageUrl", t: "image", label: "Cover image" },
      { k: "featured", t: "check", label: "Featured on home page" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { featured: false, order: 1 },
    image: "imageUrl",
    title: (d) => d.title,
    sub: (d) => d.domain || ""
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
    sort: ["createdAt", "desc"],
    fields: [
      { k: "caption", t: "text", req: true, label: "Caption" },
      { k: "imageUrl", t: "image", req: true, label: "Photo" },
      { k: "event", t: "text", label: "Event name (optional)" }
    ],
    defaults: {},
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
      { k: "description", t: "textarea", label: "Description" },
      { k: "url", t: "text", label: "Link URL" },
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
      { k: "title", t: "text", req: true, label: "Title" },
      { k: "member", t: "text", label: "Member / team name" },
      { k: "detail", t: "textarea", label: "Detail" },
      { k: "date", t: "text", label: "Date label" },
      { k: "imageUrl", t: "image", label: "Image" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { order: 1 },
    image: "imageUrl",
    title: (d) => d.title,
    sub: (d) => `${d.member || ""} • ${d.date || ""}`
  },
  tasks: {
    label: "task",
    sort: ["createdAt", "desc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Task" },
      { k: "detail", t: "textarea", label: "Details" },
      { k: "assigneeEmail", t: "text", label: "Assignee email" },
      { k: "assigneeRole", t: "select", opts: Object.keys(ROLES).filter((r) => r !== "owner"), label: "…or assign to a whole role" },
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
    if (snap.exists() && snap.data().role && ROLES[snap.data().role]) {
      const d = snap.data();
      return {
        role: d.role,
        mustChange: d.mustChangePassword === true,
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
    if (rr.mustChange) { showView("change"); return; }
    showView("in");
    renderShell();
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
      <a class="brand" href="/"><img src="/assets/images/embedx-emblem.webp" alt="" width="38" height="38" /><span><span class="brand-name">EMBED<span>X</span></span><span class="brand-sub">Admin</span></span></a>
      <div class="admin-top-actions">
        <span class="chip chip-accent" title="Signed in as">${esc(me)}</span>
        <span class="chip" title="Your role">${esc(ROLES[role].label)}</span>
        <a class="btn btn-ghost btn-sm" href="/">View site</a>
        <button class="btn btn-ghost btn-sm" id="signOut">Sign out</button>
      </div>
    </div>`;
  $("#signOut").addEventListener("click", async () => { const { auth } = await sdk(); authMod.signOut(auth); location.href = "/admin/"; });
  $("#adminNav").innerHTML = NAV
    .filter(([id]) => id === "overview" || id === "tasks" || (id === "admins" ? role === "owner" : can(id)))
    .map(([id, label, href]) => `<a href="${href}" class="${id === PAGE ? "active" : ""}">${esc(label)}</a>`).join("");
}

function noteReadOnly() {
  const n = $("#roleNote");
  if (n && !can(PAGE)) n.innerHTML = `<span class="chip">👁 View-only — your role (${esc(ROLES[role].label)}) can read but not edit this section.</span>`;
}

function route() {
  if (PAGE === "overview") return renderOverview();
  if (PAGE === "admins") return renderAdmins();
  return renderCollection(PAGE);
}

/* ---------------- overview ---------------- */
async function renderOverview() {
  const region = $("#pageRegion");
  region.innerHTML = `<div class="skeleton" style="min-height:200px"></div>`;
  const names = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements"];
  let counts = [];
  if (isConfigured) {
    try {
      const { db } = await sdk();
      counts = await Promise.all(names.map(async (n) => [n, (await dbMod.getDocs(dbMod.collection(db, n))).size]));
    } catch { counts = []; }
  }
  const mine = await myTasks();
  region.innerHTML = `
    <p class="muted" style="margin:.2rem 0 1rem">${esc(ROLES[role].blurb)}.</p>
    <div class="admin-cards">
      ${counts.map(([n, c]) => `<a class="admin-card card" href="/admin/${n}"><b>${c}</b><span>${n}</span></a>`).join("")}
    </div>
    <h2 style="margin:1.8rem 0 .6rem">My open tasks ${mine.length ? `(${mine.length})` : ""}</h2>
    ${mine.length ? mine.map(taskRow).join("") : `<p class="muted">Nothing assigned to you right now. ${role === "owner" || role === "president" ? "Assign work from the <a href='/admin/tasks'>Tasks</a> page." : ""}</p>`}
    <h2 style="margin:1.8rem 0 .6rem">Your access</h2>
    <div class="admin-list">
      ${NAV.filter(([id]) => id !== "overview" && id !== "tasks" && (id !== "admins" || role === "owner") && can(id)).map(([id, label]) =>
        `<div class="admin-row card"><div class="admin-row-main"><strong>${esc(label)}</strong><span class="muted">read + write</span></div></div>`).join("")}
      <div class="admin-row card"><div class="admin-row-main"><strong>Tasks</strong><span class="muted">${can("tasks") ? "assign + edit" : "your assigned tasks"}</span></div></div>
    </div>`;
}

async function myTasks() {
  if (!isConfigured) return [];
  try {
    const { db } = await sdk();
    const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "tasks"), dbMod.orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((t) => t.status !== "done" && (t.assigneeEmail === me || (t.assigneeRole && t.assigneeRole === role)));
  } catch { return []; }
}
const taskRow = (t) => `
  <div class="admin-row card ${t.status === "done" ? "task-done" : ""}">
    <div class="admin-row-main">
      <strong>${esc(t.title)}</strong>
      <span class="muted">${esc(t.detail || "")}</span>
      <span class="muted">${t.status} • ${esc(t.assigneeEmail || t.assigneeRole || "unassigned")}${t.due ? ` • due ${esc(t.due)}` : ""}</span>
    </div>
  </div>`;

/* ---------------- generic collection pages ---------------- */
async function renderCollection(sec) {
  const schema = SCHEMAS[sec];
  if (!schema) { $("#pageRegion").innerHTML = `<p class="muted">Unknown section.</p>`; return; }
  if (!can(sec)) {
    $("#pageRegion").innerHTML = `<div class="card" style="padding:var(--sp-4)"><h2 style="margin:0 0 .4rem">No access</h2><p class="muted" style="margin:0">Your owner hasn't granted you this section. Ask them to tick it for you under <b>Admins &amp; roles → Permissions</b>.</p></div>`;
    return;
  }
  const add = $("#addItem");
  if (add) { add.hidden = false; add.onclick = () => openForm(null); }
  await loadList(sec);
  loadStats();
}

async function loadList(sec) {
  const schema = SCHEMAS[sec];
  const region = $("#pageRegion");
  region.innerHTML = `<div id="listRegion" class="admin-list"><div class="skeleton" style="min-height:160px"></div></div>`;
  if (!isConfigured) { region.innerHTML = `<p class="muted">Firebase config missing.</p>`; return; }
  try {
    const { db } = await sdk();
    const [field, dir] = schema.sort;
    const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, sec), dbMod.orderBy(field, dir)));
    items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderList(sec);
  } catch (err) {
    console.error(err);
    region.innerHTML = `<p class="muted">Could not load ${sec}: ${esc(err.message)}</p>`;
  }
}

async function loadStats() {
  const strip = $("#statsStrip");
  if (!strip || !isConfigured) return;
  try {
    const { db } = await sdk();
    const names = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements"];
    const counts = await Promise.all(names.map(async (n) => [n, (await dbMod.getDocs(dbMod.collection(db, n))).size]));
    strip.innerHTML = counts.map(([n, c]) => `<a class="chip ${c ? "chip-accent" : ""}" style="text-decoration:none" href="/admin/${n}">${n}: ${c}</a>`).join("");
  } catch { /* best-effort */ }
}

function renderList(sec) {
  const schema = SCHEMAS[sec];
  const region = $("#listRegion");
  if (!items.length) { region.innerHTML = `<p class="muted">No ${schema.label}s yet — hit “+ New”.</p>`; return; }
  region.innerHTML = items.map((d) => `
    <div class="admin-row card">
      ${schema.image && d[schema.image] ? `<img src="${esc(asset(d[schema.image]))}" alt="" loading="lazy" />` : '<span class="admin-noimg">◈</span>'}
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
    const { db } = await sdk();
    await dbMod.updateDoc(dbMod.doc(db, "tasks", b.dataset.done), { status: "done" });
    toast("Nice work — task closed ✔", "ok");
    loadList("tasks");
  }));
}

/* ---------------- form (DOM-built: values can never break markup) ---------------- */
function buildField(f, v) {
  const wrap = document.createElement("div");
  const id = `f-${f.k}`;
  const full = ["textarea", "check", "image"].includes(f.t);
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
  if (f.t === "textarea") {
    input = document.createElement("textarea"); input.value = v ?? "";
  } else if (f.t === "select") {
    input = document.createElement("select");
    (f.opts || []).forEach((o) => { const op = document.createElement("option"); op.textContent = o; if (o === v) op.selected = true; input.appendChild(op); });
  } else if (f.t === "image") {
    input = document.createElement("input"); input.type = "hidden"; input.value = v ?? "";
    const picker = document.createElement("div"); picker.className = "img-picker";
    const prev = document.createElement("img"); prev.id = `prev-${f.k}`; prev.alt = "Current image preview";
    if (v) prev.src = asset(v); else prev.style.display = "none";
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:.5rem;flex-wrap:wrap;align-items:center";
    const fileLabel = document.createElement("label");
    fileLabel.className = "btn btn-ghost btn-sm"; fileLabel.htmlFor = `file-${f.k}`;
    fileLabel.textContent = "Upload / replace photo";
    const file = document.createElement("input");
    file.id = `file-${f.k}`; file.type = "file"; file.accept = "image/*";
    file.style.display = "none"; file.dataset.imgfield = f.k;
    row.append(fileLabel, file);
    if (v) {
      const editBtn = document.createElement("button");
      editBtn.type = "button"; editBtn.className = "btn btn-ghost btn-sm";
      editBtn.dataset.editimg = f.k; editBtn.textContent = "Edit current photo";
      row.appendChild(editBtn);
    }
    picker.append(prev, row);
    wrap.append(picker);
  } else {
    input = document.createElement("input");
    input.type = f.t === "num" ? "number" : "text";
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
  const data = id ? items.find((x) => x.id === id) : { ...schema.defaults };
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

  $("#formModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModals() {
  document.querySelectorAll(".modal-backdrop.open").forEach((m) => m.classList.remove("open"));
  document.body.style.overflow = "";
}

async function saveForm(e) {
  e.preventDefault();
  const sec = PAGE;
  const schema = SCHEMAS[sec];
  if (!can(sec)) { toast("Your role can't edit this section.", "err"); return; }
  const data = {};
  for (const f of schema.fields) {
    const el = document.getElementById(`f-${f.k}`);
    if (f.t === "check") data[f.k] = el.checked;
    else if (f.t === "num") data[f.k] = Number(el.value || 0);
    else data[f.k] = String(el.value).trim();
    if (f.req && !data[f.k]) { toast(`“${f.label}” is required.`, "err"); return; }
  }
  const { db } = await sdk();
  try {
    if (editingId) {
      await dbMod.updateDoc(dbMod.doc(db, sec, editingId), data);
      toast("Updated ✔", "ok");
    } else {
      if (sec === "announcements" || sec === "tasks") data.createdAt = new Date().toISOString();
      if (sec === "tasks") data.createdBy = me;
      await dbMod.addDoc(dbMod.collection(db, sec), data);
      toast("Published ✔", "ok");
    }
    closeModals();
    loadList(sec);
    loadStats();
  } catch (err) {
    console.error(err);
    const hint = err.code === "permission-denied"
      ? " — your role doesn't include this section, or the Firebase rules need redeploying (firebase deploy --only firestore:rules,firestore:indexes,storage)"
      : "";
    toast(`Save failed [${esc(err.code || "error")}]: ${esc(err.message)}${hint}`, "err");
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
    loadList(sec);
    loadStats();
  } catch (err) { toast(`Delete failed: ${esc(err.message)}`, "err"); }
}

/* ---------------- image editor + upload ---------------- */
function openEditor(img) {
  editorState = { img, rot: 0 };
  drawEditor();
  $("#editorModal").classList.add("open");
  document.body.style.overflow = "hidden";
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
    const prev = document.getElementById(`prev-${pendingImageField}`);
    prev.src = url; prev.style.display = "";
    closeModals();
    toast("Photo uploaded ✔", "ok");
  } catch (err) {
    console.error(err);
    toast(`Upload failed: ${esc(err.message)}`, "err");
  }
}

/* ---------------- admins & roles (owner only) ---------------- */
async function renderAdmins() {
  const region = $("#pageRegion");
  if (role !== "owner") { region.innerHTML = `<p class="muted">Owner-only section.</p>`; return; }
  region.innerHTML = `
    <div class="card" style="padding:var(--sp-4);margin-bottom:1.2rem">
      <h2 style="margin:0 0 .4rem">Add an admin — one click</h2>
      <p class="muted" style="font-size:.88rem;margin:0 0 1rem">Fill the four fields and hit <b>Add admin</b>: the login is created instantly and the role is saved. They sign in with the temporary password and <b>must change it at first login</b>.</p>
      <form id="addAdminForm" class="form-grid">
        <div class="field"><label for="aa-email">Email *</label><input id="aa-email" type="email" required placeholder="name@trp.srmtrichy.edu.in" /></div>
        <div class="field"><label for="aa-name">Display name</label><input id="aa-name" placeholder="e.g. Keerthivasan A" /></div>
        <div class="field"><label for="aa-role">Role preset</label><select id="aa-role">${Object.entries(ROLES).filter(([r]) => r !== "owner").map(([r, m]) => `<option value="${r}">${m.label} — ${m.blurb}</option>`).join("")}</select></div>
        <div class="field"><label for="aa-pass">Temporary password *</label><input id="aa-pass" type="text" minlength="8" required placeholder="8+ chars, share privately" /></div>
        <div class="field full"><label>Can see &amp; edit — tick their sections</label><div class="perm-grid" id="aa-perms">${SECTIONS.map((s) => `<label><input type="checkbox" value="${s}" /> ${s}</label>`).join("")}</div></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Add admin</button></div>
      </form>
      <p class="muted" style="font-size:.82rem;margin:.9rem 0 0">
        Passwords are stored hashed by Firebase — <b>nobody can view them</b>, not even you. If someone forgets theirs: row button <b>“Send reset email”</b> below, the <b>“Forgot password?”</b> link on the login page, or (Git Bash, <code>embedx-backend/scripts</code>): <code>node reset-password.js email@x NewTemp123</code>.
      </p>
    </div>
    <h2 style="margin:0 0 .6rem">Current admins</h2>
    <div id="adminList" class="admin-list"><div class="skeleton" style="min-height:120px"></div></div>`;
  const applyPreset = () => {
    const preset = LEGACY_PERMS[$("#aa-role").value] || [];
    document.querySelectorAll("#aa-perms input").forEach((c) => { c.checked = preset.includes(c.value); });
  };
  $("#aa-role").addEventListener("change", applyPreset);
  applyPreset();
  $("#addAdminForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#aa-email").value.trim().toLowerCase();
    const name = $("#aa-name").value.trim();
    const r = $("#aa-role").value;
    const pass = $("#aa-pass").value;
    const chosen = [...document.querySelectorAll("#aa-perms input:checked")].map((c) => c.value);
    if (!email.includes("@")) { toast("Enter a valid email.", "err"); return; }
    if (pass.length < 8) { toast("Temporary password needs 8+ characters.", "err"); return; }
    // 1) create the Auth login from the browser (public sign-up endpoint; portal access still gated by admin_roles)
    let created = false, existed = false;
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass, returnSecureToken: true })
      });
      const js = await res.json().catch(() => ({}));
      if (res.ok) created = true;
      else if (String(js.error && js.error.message).includes("EMAIL_EXISTS")) existed = true;
      else { toast(`Login create failed: ${esc((js.error && js.error.message) || res.status)}`, "err"); return; }
    } catch (err) { toast(`Network error: ${esc(err.message)}`, "err"); return; }
    // 2) save the role (+ force password change for brand-new logins)
    const { db } = await sdk();
    try {
      await dbMod.setDoc(dbMod.doc(db, "admin_roles", email), { role: r, name, addedBy: me, addedAt: new Date().toISOString(), mustChangePassword: created, perms: chosen }, { merge: true });
      toast(created ? `Done ✔ ${email} can sign in now and will be asked to change the temporary password.` : `Login already existed for ${email} — role saved. Use “Send reset email” if they forgot their password.`, "ok");
      $("#addAdminForm").reset();
      loadAdmins();
    } catch (err) { toast(`Role save failed: ${esc(err.message)}`, "err"); }
  });
  loadAdmins();
}

async function loadAdmins() {
  const region = $("#adminList");
  const { db } = await sdk();
  let rows = [];
  try {
    const snap = await dbMod.getDocs(dbMod.collection(db, "admin_roles"));
    rows = snap.docs.map((d) => ({ email: d.id, ...d.data() }));
  } catch (err) { region.innerHTML = `<p class="muted">${esc(err.message)}</p>`; return; }
  region.innerHTML = `
    <div class="admin-row card"><div class="admin-row-main"><strong>${esc(OWNER_EMAIL)}</strong><span class="muted">Owner — full control (built-in, cannot be revoked)</span></div><span class="chip chip-accent">owner</span></div>
    ${rows.map((a) => `
    <div class="admin-row card">
      <div class="admin-row-main">
        <strong>${esc(a.email)}</strong>
        <span class="muted">${esc(a.name || "")}${a.addedAt ? ` • added ${(a.addedAt || "").slice(0, 10)}` : ""}</span>
      </div>
      ${a.mustChangePassword ? `<span class="chip" title="Must change temporary password at next login">🔑 change due</span>` : ""}
      <select data-rolefor="${esc(a.email)}" class="btn btn-ghost btn-sm">
        ${Object.entries(ROLES).filter(([r]) => r !== "owner").map(([r, m]) => `<option value="${r}" ${a.role === r ? "selected" : ""}>${m.label}</option>`).join("")}
      </select>
      <button class="btn btn-ghost btn-sm" data-reset="${esc(a.email)}">Send reset email</button>
      <button class="btn btn-ghost btn-sm" data-revoke="${esc(a.email)}" style="color:var(--err)">Revoke</button>
      <details class="perm-edit">
        <summary>Permissions — what they can see &amp; edit</summary>
        <div class="perm-grid">${SECTIONS.map((s) => `<label><input type="checkbox" data-p="${s}" ${((Array.isArray(a.perms) ? a.perms : LEGACY_PERMS[a.role]) || []).includes(s) ? "checked" : ""} /> ${s}</label>`).join("")}</div>
        <button class="btn btn-ghost btn-sm" data-saveperms="${esc(a.email)}">Save permissions</button>
      </details>
    </div>`).join("")}`;
  region.querySelectorAll("[data-saveperms]").forEach((b) => b.addEventListener("click", async () => {
    const chosen = [...b.parentElement.querySelectorAll("input[data-p]:checked")].map((c) => c.dataset.p);
    const { db } = await sdk();
    await dbMod.updateDoc(dbMod.doc(db, "admin_roles", b.dataset.saveperms), { perms: chosen });
    toast(`Permissions saved for ${b.dataset.saveperms} ✔ (applies on their next sign-in)`, "ok");
  }));
  region.querySelectorAll("[data-rolefor]").forEach((s) => s.addEventListener("change", async () => {
    const { db } = await sdk();
    await dbMod.updateDoc(dbMod.doc(db, "admin_roles", s.dataset.rolefor), { role: s.value });
    toast("Role updated ✔", "ok");
  }));
  region.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", async () => {
    try {
      const { auth } = await sdk();
      await authMod.sendPasswordResetEmail(auth, b.dataset.reset);
      toast(`Reset email sent to ${b.dataset.reset} ✔`, "ok");
    } catch (err) { toast(`Could not send: ${esc(err.message)}`, "err"); }
  }));
  region.querySelectorAll("[data-revoke]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm(`Remove portal access for ${b.dataset.revoke}? (Their login stays but can no longer enter the portal.)`)) return;
    const { db } = await sdk();
    await dbMod.deleteDoc(dbMod.doc(db, "admin_roles", b.dataset.revoke));
    toast("Access revoked.", "ok");
    loadAdmins();
  }));
}

/* ---------------- wiring (modals exist only on CRUD pages — guard every lookup) ---------------- */
$("#entityForm")?.addEventListener("submit", saveForm);
document.querySelectorAll(".modal-backdrop").forEach((bd) => {
  bd.addEventListener("click", (e) => { if (e.target === bd) closeModals(); });
  bd.querySelectorAll("[data-modal-close]").forEach((x) => x.addEventListener("click", closeModals));
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
