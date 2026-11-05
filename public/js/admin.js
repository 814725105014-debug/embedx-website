// EMBEDX — Admin portal: auth-gated CMS for announcements, events, projects, team, gallery.
// Security lives in firestore.rules / storage.rules (custom claim admin=true).
import { firebaseConfig, isConfigured } from "./config.js";
import { toast } from "./ui.js";
import { esc, asset } from "./render.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
let authMod = null, dbMod = null, stMod = null, app = null;

async function sdk() {
  const { initializeApp, getApps, getApp } = await import(`${SDK}/firebase-app.js`);
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authMod = authMod || (await import(`${SDK}/firebase-auth.js`));
  dbMod = dbMod || (await import(`${SDK}/firebase-firestore.js`));
  stMod = stMod || (await import(`${SDK}/firebase-storage.js`));
  return { auth: authMod.getAuth(app), db: dbMod.getFirestore(app), storage: stMod.getStorage(app) };
}

const $ = (s) => document.querySelector(s);

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
      { k: "category", t: "text", label: "Category (Robotics, Smart Systems, Healthcare, IoT & Energy, Automation)" },
      { k: "status", t: "text", label: "Status (Achieved / Active Prototype / In Development…)" },
      { k: "highlight", t: "text", label: "Highlight line" },
      { k: "shortDesc", t: "textarea", label: "Short description" },
      { k: "tags", t: "text", label: "Tags (comma separated)" },
      { k: "githubUrl", t: "text", label: "GitHub URL" },
      { k: "demoUrl", t: "text", label: "Demo URL" },
      { k: "imageUrl", t: "image", label: "Cover image" },
      { k: "featured", t: "check", label: "Featured on home page" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { category: "Robotics", status: "Active Prototype", featured: false, order: 1 },
    image: "imageUrl",
    title: (d) => d.title,
    sub: (d) => `${d.category || ""} • ${d.status || ""}`
  },
  team: {
    label: "team member",
    sort: ["order", "asc"],
    fields: [
      { k: "name", t: "text", req: true, label: "Full name" },
      { k: "role", t: "text", req: true, label: "Role" },
      { k: "focus", t: "text", label: "Focus area" },
      { k: "group", t: "select", opts: ["student", "faculty"], label: "Group" },
      { k: "year", t: "text", label: "Year (e.g. III Year / Faculty)" },
      { k: "department", t: "text", label: "Department" },
      { k: "bio", t: "textarea", label: "Bio" },
      { k: "linkedin", t: "text", label: "LinkedIn URL" },
      { k: "github", t: "text", label: "GitHub URL" },
      { k: "photoUrl", t: "image", label: "Photo" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { group: "student", department: "EEE", order: 1 },
    image: "photoUrl",
    title: (d) => d.name,
    sub: (d) => `${d.role || ""} • ${d.group || ""} ${d.year || ""}`
  },
  resources: {
    label: "resource",
    sort: ["title", "asc"],
    fields: [
      { k: "title", t: "text", req: true, label: "Title" },
      { k: "category", t: "select", opts: ["Programming", "Embedded Systems", "Electronics & PCB", "IoT & Telemetry", "PLC Automation", "Career Roadmap"], label: "Category" },
      { k: "level", t: "select", opts: ["Beginner", "Beginner to Intermediate", "Intermediate", "Advanced", "All Levels"], label: "Level" },
      { k: "tags", t: "text", label: "Tags (comma separated)" },
      { k: "desc", t: "textarea", req: true, label: "Summary" }
    ],
    defaults: { category: "Embedded Systems", level: "Intermediate" },
    title: (d) => d.title,
    sub: (d) => `${d.category || ""} • ${d.level || ""}`
  },
  achievements: {
    label: "achievement",
    sort: ["title", "asc"],
    fields: [
      { k: "badge", t: "text", label: "Badge (e.g. National Representation • 2026)" },
      { k: "title", t: "text", req: true, label: "Title" },
      { k: "subtitle", t: "text", label: "Subtitle" },
      { k: "description", t: "textarea", label: "Description" },
      { k: "image", t: "image", label: "Image" },
      { k: "team", t: "text", label: "Team" },
      { k: "institution", t: "text", label: "Institution" },
      { k: "projectId", t: "text", label: "Linked project id (for “Read Project Specs”)" }
    ],
    defaults: { institution: "Department of EEE, SRM TRP Engineering College" },
    image: "image",
    title: (d) => d.title,
    sub: (d) => d.badge || ""
  },
  gallery: {
    label: "gallery photo",
    sort: ["order", "asc"],
    fields: [
      { k: "caption", t: "text", label: "Caption" },
      { k: "imageUrl", t: "image", req: true, label: "Photo" },
      { k: "order", t: "num", label: "Sort order" }
    ],
    defaults: { order: 1 },
    image: "imageUrl",
    title: (d) => d.caption || "(untitled photo)",
    sub: (d) => `order ${d.order ?? "—"}`
  }
};

/* ---------------- state ---------------- */
let current = "announcements";
let items = [];
let editingId = null;
let pendingImageField = null;   // schema field key awaiting editor result
let editorState = null;         // { img, rot }

/* ---------------- auth ---------------- */
async function boot() {
  if (!isConfigured) {
    $("#loginView").hidden = false;
    $("#loginError").textContent = "Firebase config missing: paste your web config into public/js/config.js first.";
    return;
  }
  const { auth } = await sdk();
  authMod.onAuthStateChanged(auth, async (user) => {
    if (!user) { $("#loginView").hidden = false; $("#dashView").hidden = true; return; }
    const token = await user.getIdTokenResult();
    if (!token.claims.admin) {
      await authMod.signOut(auth);
      $("#loginView").hidden = false;
      $("#loginError").textContent = "Signed-in account lacks the admin claim. Ask an owner to run scripts/grant-admin.js for this email, then retry.";
      return;
    }
    $("#whoami").textContent = user.email;
    $("#loginView").hidden = true;
    $("#dashView").hidden = false;
    loadList();
  });

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#loginError").textContent = "";
    try {
      await authMod.signInWithEmailAndPassword(auth, $("#li-email").value.trim(), $("#li-pass").value);
    } catch (err) {
      $("#loginError").textContent = err.code === "auth/invalid-credential" ? "Invalid email or password." : err.message;
    }
  });
  $("#signOut").addEventListener("click", () => authMod.signOut(auth));
}

/* ---------------- list ---------------- */
async function loadList() {
  const schema = SCHEMAS[current];
  const region = $("#listRegion");
  $("#panelTitle").textContent = schema.label[0].toUpperCase() + schema.label.slice(1) + "s";
  $("#panelHint").textContent = hints[current] || "";
  region.innerHTML = '<div class="skeleton" style="min-height:160px"></div>';
  if (!isConfigured) {
    $("#configWarn").style.display = "flex";
    $("#configWarn").textContent = "Firebase config missing — add it to public/js/config.js to publish content.";
    region.innerHTML = "";
    return;
  }
  try {
    const { db } = await sdk();
    const [field, dir] = schema.sort;
    const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, current), dbMod.orderBy(field, dir)));
    items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderList();
    loadStats();
  } catch (err) {
    console.error(err);
    region.innerHTML = `<p class="muted">Could not load ${current}: ${esc(err.message)}</p>`;
  }
}

const hints = {
  announcements: "Published instantly to the home-page notice board (pinned first).",
  events: "Full event pages read these documents; rich fields like tracks/FAQs seeded earlier are preserved on edit.",
  projects: "Featured projects appear on the home page grid.",
  team: "group=faculty shows in the Faculty Mentorship section, students in the Executive Council.",
  gallery: "Photos appear in the home-page gallery with lightbox. Upload replaces or adds new shots.",
  resources: "Learning Hub guides shown on the Resources page with category filters.",
  achievements: "Hall of Achievers cards; link each to a project id for the specs button."
};

async function loadStats() {
  const strip = document.getElementById("statsStrip");
  if (!strip || !isConfigured) return;
  try {
    const { db } = await sdk();
    const names = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements"];
    const counts = await Promise.all(names.map(async (n) => [n, (await dbMod.getDocs(dbMod.collection(db, n))).size]));
    strip.innerHTML = counts.map(([n, c]) => `<span class="chip ${c ? "chip-accent" : ""}">${n}: ${c}</span>`).join("");
  } catch { /* stats are best-effort */ }
}

function renderList() {
  const schema = SCHEMAS[current];
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
        <button class="btn btn-ghost btn-sm" data-edit="${esc(d.id)}">Edit</button>
        <button class="btn btn-ghost btn-sm" data-del="${esc(d.id)}" style="color:var(--err)">Delete</button>
      </div>
    </div>`).join("");
  region.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(b.dataset.edit)));
  region.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => removeItem(b.dataset.del)));
}

/* ---------------- form ---------------- */
function openForm(id = null) {
  const schema = SCHEMAS[current];
  editingId = id;
  const data = id ? items.find((x) => x.id === id) : { ...schema.defaults };
  $("#formModalTitle").textContent = (id ? "Edit " : "New ") + schema.label;
  $("#entityFields").innerHTML = schema.fields.map((f) => {
    const v = data?.[f.k] ?? "";
    if (f.t === "textarea") return `<div class="field full"><label for="f-${f.k}">${f.label}${f.req ? ' <span class="req">*</span>' : ""}</label><textarea id="f-${f.k}" name="${f.k}">${esc(v)}</textarea></div>`;
    if (f.t === "select") return `<div class="field"><label for="f-${f.k}">${f.label}</label><select id="f-${f.k}" name="${f.k}">${f.opts.map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;
    if (f.t === "check") return `<div class="field full"><label class="check-row" for="f-${f.k}"><input id="f-${f.k}" name="${f.k}" type="checkbox" ${v ? "checked" : ""} /> ${f.label}</label></div>`;
    if (f.t === "num") return `<div class="field"><label for="f-${f.k}">${f.label}</label><input id="f-${f.k}" name="${f.k}" type="number" value="${esc(v)}" /></div>`;
    if (f.t === "image") return `
      <div class="field full">
        <label for="f-${f.k}">${f.label}${f.req ? ' <span class="req">*</span>' : ""}</label>
        <div class="img-picker">
          <img id="prev-${f.k}" src="${v ? esc(asset(v)) : ""}" alt="Current image preview" style="${v ? "" : "display:none"}" />
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
            <input id="f-${f.k}" name="${f.k}" type="hidden" value="${esc(v)}" />
            <label class="btn btn-ghost btn-sm" for="file-${f.k}">Upload / replace photo</label>
            <input id="file-${f.k}" type="file" accept="image/*" style="display:none" data-imgfield="${f.k}" />
            ${v ? `<button type="button" class="btn btn-ghost btn-sm" data-editimg="${f.k}">Edit current photo</button>` : ""}
          </div>
        </div>
      </div>`;
    return `<div class="field"><label for="f-${f.k}">${f.label}${f.req ? ' <span class="req">*</span>' : ""}</label><input id="f-${f.k}" name="${f.k}" value="${esc(v)}" /></div>`;
  }).join("");

  // image pickers → editor
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
  const schema = SCHEMAS[current];
  const data = {};
  for (const f of schema.fields) {
    const el = document.getElementById(`f-${f.k}`);
    if (f.t === "check") data[f.k] = el.checked;
    else if (f.t === "num") data[f.k] = Number(el.value || 0);
    else if (f.k === "tags") data[f.k] = el.value.split(",").map((s) => s.trim()).filter(Boolean);
    else data[f.k] = String(el.value).trim();
    if (f.req && !data[f.k]) { toast(`“${f.label}” is required.`, "err"); return; }
  }
  const { db } = await sdk();
  try {
    if (editingId) {
      await dbMod.updateDoc(dbMod.doc(db, current, editingId), data);
      toast("Updated ✔", "ok");
    } else {
      if (current === "announcements") data.createdAt = new Date().toISOString();
      await dbMod.addDoc(dbMod.collection(db, current), data);
      toast("Published ✔", "ok");
    }
    closeModals();
    loadList();
  } catch (err) {
    console.error(err);
    toast(`Save failed: ${esc(err.message)}`, "err");
  }
}

async function removeItem(id) {
  if (!confirm(`Delete this ${SCHEMAS[current].label}? This cannot be undone.`)) return;
  const { db } = await sdk();
  try {
    await dbMod.deleteDoc(dbMod.doc(db, current, id));
    toast("Deleted.", "ok");
    loadList();
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
  // centered crop with chosen aspect
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
  const path = `images/${current}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
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

/* ---------------- boot & wiring ---------------- */
document.querySelectorAll(".admin-tabs .filter-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs .filter-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    current = b.dataset.tab;
    loadList();
  });
});
$("#addItem").addEventListener("click", () => openForm(null));
$("#entityForm").addEventListener("submit", saveForm);
document.querySelectorAll(".modal-backdrop").forEach((bd) => {
  bd.addEventListener("click", (e) => { if (e.target === bd) closeModals(); });
  bd.querySelectorAll("[data-modal-close]").forEach((x) => x.addEventListener("click", closeModals));
});
$("#rotL").addEventListener("click", () => { editorState.rot = (editorState.rot + 270) % 360; drawEditor(); });
$("#rotR").addEventListener("click", () => { editorState.rot = (editorState.rot + 90) % 360; drawEditor(); });
$("#aspectSel").addEventListener("change", drawEditor);
$("#widthSel").addEventListener("change", drawEditor);
$("#editorApply").addEventListener("click", applyEditor);
boot();
