// EMBEDX — Page controller. Dispatches renderers by body[data-page].
import "./layout.js?v=20261114";
import "./forms.js";
import { initAll } from "./ui.js";
import { icon } from "./icons.js";
import { esc, asset, skeletons, projectCard, eventCard, teamCard, domainCard, resourceCard, achievementCard, announcementCard, galleryButton } from "./render.js";
import { getProjects, getEvents, getTeam, getGallery, getAnnouncements, getResources, getAchievements } from "./store.js";
import { domains, tools, careers } from "./data/domains.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ---------- shared bits ---------- */
function filterBar(el, labels, onPick) {
  el.innerHTML = labels.map((l, i) => `<button class="filter-btn ${i === 0 ? "active" : ""}" data-f="${esc(l)}">${esc(l)}</button>`).join("");
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".filter-btn");
    if (!b) return;
    el.querySelectorAll(".filter-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    onPick(b.dataset.f);
  });
}

/* ---------- home ---------- */
async function home() {
  // notice board (announcements) — pinned first
  const an = $("#announcementsGrid");
  if (an) {
    const list = await getAnnouncements();
    if (list.length) {
      an.closest("section").hidden = false;
      an.innerHTML = list
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
        .slice(0, 3)
        .map(announcementCard).join("");
    }
  }
  // gallery — Firestore first, static fallback
  const gg = $("#galleryGrid");
  if (gg) {
    gg.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton" style="min-height:170px"></div>').join("");
    const shots = await getGallery();
    gg.innerHTML = shots.map(galleryButton).join("");
    initAll();
  }
  const pg = $("#projectsGrid");
  const eg = $("#eventsGrid");
  const ag = $("#achieversGrid");
  const dg = $("#domainsGrid");
  if (dg) dg.innerHTML = domains.slice(0, 6).map(domainCard).join("") +
    `<div class="card center" style="display:grid;place-content:center;gap:.6rem">${icon("circuit")}<a class="btn btn-ghost btn-sm" href="/pages/domains.html">Explore All 12 Technical Domains</a></div>`;
  if (ag) {
    const ach = await getAchievements();
    ag.innerHTML = ach.slice(0, 2).map(achievementCard).join("");
    initAll();
  }
  if (pg) {
    skeletons(pg, 4);
    const list = await getProjects();
    pg.innerHTML = list.filter((p) => p.featured).slice(0, 4).map(projectCard).join("");
    initAll();
  }
  if (eg) {
    skeletons(eg, 3, 320);
    const list = await getEvents();
    eg.innerHTML = list.map(eventCard).join("");
    initAll();
  }
}

/* ---------- projects ---------- */
async function projectsPage() {
  const grid = $("#projectsGrid");
  skeletons(grid, 6);
  const list = await getProjects();
  const cats = ["All Projects", ...new Set(list.map((p) => p.category))];
  const paint = (cat) => {
    const rows = list.filter((p) => cat === "All Projects" || p.category === cat);
    grid.innerHTML = rows.length ? rows.map(projectCard).join("") :
      `<div class="card center muted">No projects match your search criteria.<br />Try refining your search terms or selecting a different category filter.</div>`;
    initAll();
  };
  paint("All Projects");
  filterBar($("#projectFilters"), cats, paint);
}

/* ---------- project detail ---------- */
async function projectDetail() {
  const c = $("#projectDetailContainer");
  skeletons(c, 1, 420);
  const list = await getProjects();
  const id = new URLSearchParams(location.search).get("id");
  const p = list.find((x) => x.id === id) || list[0];
  document.title = `${p.title} | EMBEDX Projects | SRM TRP Engineering College`;
  c.innerHTML = `
    <div class="detail-hero">
      <div>
        <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/pages/projects.html">Projects</a> / ${esc(p.title)}</nav>
        <span class="chip chip-accent">${esc(p.category)}</span> <span class="badge-status">${esc(p.status)}</span>
        <h1 style="margin-top:.8rem">${esc(p.title)}</h1>
        <p class="muted">${esc(p.highlight)}</p>
        <p>${esc(p.shortDesc)}</p>
        <h3 style="margin-top:1.4rem">Problem Statement</h3><p class="muted">${esc(p.problemStatement)}</p>
        <h3>Proposed Solution</h3><p class="muted">${esc(p.proposedSolution)}</p>
        <h3>Working Principle</h3><p class="muted">${esc(p.workingPrinciple)}</p>
        <div class="card-tags">${(p.technologies || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
        ${p.githubUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(p.githubUrl)}" rel="noopener">${icon("github")} Source Code</a>` : ""}
        ${p.demoUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(p.demoUrl)}" rel="noopener">${icon("external")} Live Demo</a>` : ""}
      </div>
      <div>
        <div class="event-poster"><img src="${esc(asset(p.imageUrl))}" alt="${esc(p.title)} prototype" /></div>
        <div class="card" style="margin-top:1.2rem">
          <h3>${icon("cpu")} Hardware Bill of Materials</h3>
          <ul class="spec-list">${(p.hardware || []).map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          <h3 style="margin-top:1rem">${icon("code")} Software Stack</h3>
          <ul class="spec-list">${(p.software || []).map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          <h3 style="margin-top:1rem">${icon("trophy")} Outcomes</h3>
          <ul class="spec-list">${(p.outcomes || []).map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          <p style="margin-top:1rem;font-size:.88rem" class="muted">Built by <strong>${esc(p.team)}</strong></p>
        </div>
      </div>
    </div>
    <h2 style="margin-top:2.6rem">Project Gallery</h2>
    <div class="gallery">${(p.gallery || []).map((g, i) => `<button data-lightbox="${esc(asset(g))}" data-caption="${esc(p.title)} — view ${i + 1}" aria-label="Enlarge ${esc(p.title)} image ${i + 1}"><img src="${esc(asset(g))}" alt="${esc(p.title)} gallery image ${i + 1}" loading="lazy" /></button>`).join("")}</div>
    <h2 style="margin-top:2.6rem">More Projects</h2>
    <div class="grid grid-3">${list.filter((x) => x.id !== p.id).slice(0, 3).map(projectCard).join("")}</div>`;
  initAll();
}

/* ---------- events ---------- */
async function eventsPage() {
  const feat = $("#embednovaFeature");
  const tracks = $("#tracksGrid");
  const grid = $("#eventsGrid");
  skeletons(grid, 3, 320);
  const list = await getEvents();
  const em = list.find((e) => e.id === "embednova") || list[0];
  if (feat) feat.innerHTML = `
    <div>
      <span class="chip chip-accent">${esc(em.type)}</span>
      <h1 style="margin:.7rem 0 .3rem">${esc(em.title)}</h1>
      <p class="grad-text" style="font-weight:700;letter-spacing:.12em">${esc(em.tagline)}</p>
      <p class="muted">${esc(em.description)}</p>
      <ul class="event-meta">
        <li>${icon("calendar")}<span>${esc(em.date)}</span></li>
        <li>${icon("map-pin")}<span>${esc(em.venue)}</span></li>
        <li>${icon("users")}<span>${esc(em.eligibility)}</span></li>
        <li>${icon("shield")}<span>${esc(em.registrationStatus)}</span></li>
      </ul>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/pages/event-detail.html?id=embednova#register">Register Now ${icon("arrow-right")}</a>
        <button class="btn btn-ghost" data-lightbox="${esc(asset(em.imageUrl))}" data-caption="EMBEDNOVA official poster">${icon("image")} View Event Poster</button>
      </div>
    </div>
    <div class="event-poster"><img src="${esc(asset(em.imageUrl))}" alt="EMBEDNOVA official event poster" loading="lazy" /></div>`;
  if (tracks) tracks.innerHTML = (em.tracks || []).map((t) => `
    <article class="card tilt" data-reveal>
      <span class="track-num">${esc(t.number)}</span>
      <h3>${esc(t.name)}</h3>
      <p class="card-sub">${esc(t.tagline)} — ${esc(t.motto)}</p>
      <img src="${esc(asset(t.image))}" alt="${esc(t.name)} track illustration" loading="lazy" style="border-radius:var(--r-sm);margin:.6rem 0" />
      <p class="muted" style="font-size:.92rem">${esc(t.description)}</p>
      <a class="card-link" href="/pages/event-detail.html?id=embednova#track-${esc(t.number)}">Track Rules &amp; Specs ${icon("arrow-right")}</a>
    </article>`).join("");
  if (grid) {
    grid.innerHTML = list.map(eventCard).join("");
    initAll();
  }
}

/* ---------- event detail ---------- */
async function eventDetail() {
  const c = $("#eventDetailContainer");
  skeletons(c, 1, 420);
  const list = await getEvents();
  const id = new URLSearchParams(location.search).get("id");
  const e = list.find((x) => x.id === id) || list[0];
  document.title = `${e.title} | EMBEDX Events | SRM TRP Engineering College`;
  c.innerHTML = `
    <div class="detail-hero">
      <div>
        <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/pages/events.html">Events</a> / ${esc(e.title)}</nav>
        <span class="chip chip-accent">${esc(e.type)}</span>
        <h1 style="margin:.8rem 0 .3rem">${esc(e.title)}</h1>
        <p class="grad-text" style="font-weight:700;letter-spacing:.1em">${esc(e.tagline || "")}</p>
        <p class="muted">${esc(e.subtitle || "")}</p>
        <ul class="event-meta">
          <li>${icon("calendar")}<span>${esc(e.date)}</span></li>
          <li>${icon("map-pin")}<span>${esc(e.venue)}</span></li>
          <li>${icon("users")}<span>${esc(e.eligibility || "")}</span></li>
          <li>${icon("shield")}<span>${esc(e.registrationStatus || "")}</span></li>
        </ul>
        <h3>Overview</h3><p class="muted">${esc(e.description)}</p>
        ${(e.whyParticipate || []).length ? `<h3 style="margin-top:1.2rem">Why Participate</h3>
        <div class="grid grid-2">${e.whyParticipate.map((w) => `<div class="card"><div class="icon-tile">${icon(w.icon || "sparkles")}</div><h4 style="margin-bottom:.3rem">${esc(w.title)}</h4><p class="muted" style="font-size:.88rem;margin:0">${esc(w.desc)}</p></div>`).join("")}</div>` : ""}
        ${(e.skillsDeveloped || []).length ? `<h3 style="margin-top:1.4rem">Skills Developed</h3><div class="card-tags">${e.skillsDeveloped.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}
        ${e.registrationLink !== "" || e.id === "embednova" ? `<div class="hero-cta"><button class="btn btn-primary" data-modal-open="#registerModal">Official Registration ${icon("arrow-right")}</button></div>` : ""}
      </div>
      <div>
        <div class="event-poster"><img src="${esc(asset(e.imageUrl))}" alt="${esc(e.title)} poster" /></div>
        ${(e.contactInfo) ? `<div class="card" style="margin-top:1.2rem"><h3>${icon("phone")} Contact</h3>
          <ul class="spec-list">
            <li>${esc(e.contactInfo.department)}</li><li>${esc(e.contactInfo.institution)}</li>
            <li>${esc(e.contactInfo.location)}</li><li>Tel: ${esc(e.contactInfo.phone)}</li>
            <li>${esc(e.contactInfo.email)}</li><li>${esc(e.contactInfo.website)}</li>
          </ul></div>` : ""}
      </div>
    </div>
    ${(e.tracks || []).length ? `
    <h2 style="margin-top:2.8rem">The ${e.tracks.length} ${esc(e.title)} Tracks</h2>
    <p class="muted">Choose your track or compete across multiple disciplines.</p>
    ${e.tracks.map((t) => `
      <section class="card" id="track-${esc(t.number)}" style="margin-bottom:1.4rem" data-reveal>
        <div style="display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-start">
          <img src="${esc(asset(t.image))}" alt="${esc(t.name)} illustration" loading="lazy" style="width:180px;border-radius:var(--r-sm)" />
          <div style="flex:1;min-width:240px">
            <span class="track-num">${esc(t.number)}</span>
            <h3 style="display:inline-block;margin-left:.6rem">${esc(t.name)}</h3>
            <p class="card-sub">${esc(t.tagline)} ${esc(t.motto)}</p>
            <p class="muted">${esc(t.description)}</p>
            <h4>Covered Topics</h4>
            <ul class="spec-list">${t.topics.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            <h4 style="margin-top:.9rem">Format</h4><p class="muted" style="font-size:.92rem">${esc(t.format)}</p>
            <h4 style="margin-top:.9rem">Rules</h4>
            <ul class="spec-list">${t.rules.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </div>
        </div>
      </section>`).join("")}` : ""}
    ${(e.faqs || []).length ? `
    <h2 style="margin-top:2.4rem">Frequently Asked Questions</h2>
    <div class="faq">${e.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>` : ""}`;
  initAll();
  if (location.hash === "#register") document.querySelector('[data-modal-open="#registerModal"]')?.click();
}

/* ---------- team ---------- */
async function teamPage() {
  const fg = $("#facultyGrid");
  const sg = $("#studentGrid");
  skeletons($("#studentGrid") || fg, 4, 300);
  if (fg) skeletons(fg, 2, 300);
  const list = await getTeam();
  const faculty = list.filter((m) => m.group === "faculty");
  const students = list.filter((m) => m.group !== "faculty");
  if (fg) fg.innerHTML = faculty.map(teamCard).join("");
  if (sg) sg.innerHTML = students.map(teamCard).join("");
  initAll();
}

/* ---------- domains ---------- */
function domainsPage() {
  $("#domainsGrid").innerHTML = domains.map(domainCard).join("");
  $("#toolsGrid").innerHTML = tools.map((t) => `
    <div class="card tilt" data-reveal><div class="icon-tile">${icon("wrench")}</div><h3 style="font-size:1.05rem">${esc(t.name)}</h3><p class="muted" style="font-size:.9rem;margin:0">${esc(t.desc)}</p></div>`).join("");
  $("#careersGrid").innerHTML = careers.map((t) => `
    <div class="card tilt" data-reveal><div class="icon-tile">${icon("briefcase")}</div><h3 style="font-size:1.05rem">${esc(t.title)}</h3><p class="muted" style="font-size:.9rem;margin:0">${esc(t.desc)}</p></div>`).join("");
  initAll();
}

/* ---------- resources ---------- */
async function resourcesPage() {
  const grid = $("#resourcesGrid");
  skeletons(grid, 6, 220);
  const all = await getResources();
  const cats = ["All Resources", ...new Set(all.map((r) => r.category))];
  const paint = (cat) => {
    const rows = all.filter((r) => cat === "All Resources" || r.category === cat);
    grid.innerHTML = rows.length ? rows.map(resourceCard).join("") : `<div class="card center muted">No resources in this category yet.</div>`;
    initAll();
  };
  paint("All Resources");
  filterBar($("#resourceFilters"), cats, paint);
}

/* ---------- achievers ---------- */
async function achieversPage() {
  const grid = $("#achieversGrid");
  skeletons(grid, 4, 320);
  const list = await getAchievements();
  grid.innerHTML = list.map(achievementCard).join("");
  initAll();
}

/* ---------- boot ---------- */
const page = document.body.dataset.page;
const routes = {
  home, projects: projectsPage, "project-detail": projectDetail,
  events: eventsPage, "event-detail": eventDetail, team: teamPage,
  domains: domainsPage, resources: resourcesPage, achievers: achieversPage
};
initAll();
if (routes[page]) routes[page]();
