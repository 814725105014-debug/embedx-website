// EMBEDX — Page controller. Dispatches renderers by body[data-page].
import "./layout.js?v=20261107-admin-controls";
import "./forms.js?v=20261107-admin-controls";
import { initAll } from "./ui.js?v=20261107-admin-controls";
import { icon } from "./icons.js";
import { esc, asset, externalUrl, drivePreviewUrl, skeletons, projectCard, eventCard, teamCard, domainCard, resourceCard, achievementCard, announcementCard, galleryButton } from "./render.js?v=20261107-admin-controls";
import { getProjects, getEvents, getTeam, getGallery, getAnnouncements, getResources, getAchievements, getPageContent, subscribePageContent, applyPageContent, getPageBlocks, subscribePageBlocks, subscribePublicCollection } from "./store.js?v=20261107-admin-controls";
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
  const an = $("#announcementsGrid");
  const gg = $("#galleryGrid");
  const pg = $("#projectsGrid");
  const eg = $("#eventsGrid");
  const ag = $("#achieversGrid");
  const dg = $("#domainsGrid");

  if (gg) skeletons(gg, 4, 170);
  if (ag) skeletons(ag, 2, 320);
  if (pg) skeletons(pg, 3);
  if (eg) skeletons(eg, 2, 320);
  if (dg) dg.innerHTML = domains.slice(0, 6).map(domainCard).join("") +
    `<div class="card center" style="display:grid;place-content:center;gap:.6rem">${icon("circuit")}<a class="btn btn-ghost btn-sm" href="/pages/domains.html">Explore All 12 Technical Domains</a></div>`;

  // Start independent Firestore reads together so a slow section never delays the rest.
  const jobs = [];
  if (an) jobs.push(getAnnouncements().then((list) => {
    if (list.length) {
      an.closest("section").hidden = false;
      an.innerHTML = list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 3).map(announcementCard).join("");
    }
  }));
  if (gg) jobs.push(getGallery().then((shots) => {
    gg.innerHTML = shots.length ? shots.map(galleryButton).join("") : '<p class="card center muted">Gallery photos will appear here soon.</p>';
  }));
  if (ag) jobs.push(getAchievements().then((rows) => {
    ag.innerHTML = rows.length ? rows.slice(0, 2).map(achievementCard).join("") : '<p class="card center muted">New achievements will appear here.</p>';
  }));
  if (pg) jobs.push(getProjects().then((rows) => {
    const featured = rows.filter((p) => p.featured).slice(0, 4);
    pg.innerHTML = featured.length ? featured.map(projectCard).join("") : '<p class="card center muted">Featured projects will appear here soon.</p>';
  }));
  if (eg) jobs.push(getEvents().then((rows) => {
    eg.innerHTML = rows.length ? rows.map(eventCard).join("") : '<p class="card center muted">There are no events to display right now.</p>';
  }));
  await Promise.all(jobs);
  initAll();
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
  if (!p) {
    c.innerHTML = '<div class="card center"><h1>Project not found</h1><p class="muted">This project may have been removed or is temporarily unavailable.</p><a class="btn btn-primary" href="/pages/projects.html">Browse projects</a></div>';
    return;
  }
  document.title = `${p.title} | EMBEDX Projects | SRM TRP Engineering College`;
  const githubUrl = externalUrl(p.githubUrl);
  const demoUrl = externalUrl(p.demoUrl);
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
        ${githubUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(githubUrl)}" target="_blank" rel="noopener noreferrer">${icon("github")} Source Code</a>` : ""}
        ${demoUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(demoUrl)}" target="_blank" rel="noopener noreferrer">${icon("external")} Live Demo</a>` : ""}
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
    <div class="gallery">${(p.gallery || []).map((g, i) => `<button data-lightbox="${esc(asset(g))}" data-caption="${esc(p.title)} — view ${i + 1}" aria-label="Enlarge ${esc(p.title)} image ${i + 1}"><img src="${esc(asset(g))}" alt="${esc(p.title)} gallery image ${i + 1}" loading="lazy" decoding="async" /></button>`).join("")}</div>
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
  const emRegistrationTarget = em ? eventRegistrationTarget(em) : null;
  if (!em) {
    if (feat) feat.innerHTML = '<p class="card center muted">Event information will be published here soon.</p>';
    if (tracks) tracks.innerHTML = "";
    if (grid) grid.innerHTML = '<p class="card center muted">There are no events to display right now.</p>';
    return;
  }
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
        ${emRegistrationTarget ? `<a class="btn btn-primary" href="${esc(emRegistrationTarget.href)}" ${emRegistrationTarget.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>Register Now ${icon("arrow-right")}</a>` : ""}
        <button class="btn btn-ghost" data-lightbox="${esc(asset(em.imageUrl))}" data-caption="EMBEDNOVA official poster">${icon("image")} View Event Poster</button>
      </div>
    </div>
    <div class="event-poster"><img src="${esc(asset(em.imageUrl))}" alt="EMBEDNOVA official event poster" loading="lazy" decoding="async" /></div>`;
  if (tracks) tracks.innerHTML = (em.tracks || []).map((t) => `
    <article class="card tilt" data-reveal>
      <span class="track-num">${esc(t.number)}</span>
      <h3>${esc(t.name)}</h3>
      <p class="card-sub">${esc(t.tagline)} — ${esc(t.motto)}</p>
      <img src="${esc(asset(t.image))}" alt="${esc(t.name)} track illustration" loading="lazy" decoding="async" style="border-radius:var(--r-sm);margin:.6rem 0" />
      <p class="muted" style="font-size:.92rem">${esc(t.description)}</p>
      <a class="card-link" href="/pages/event-detail.html?id=embednova#track-${esc(t.number)}">Track Rules &amp; Specs ${icon("arrow-right")}</a>
    </article>`).join("");
  if (grid) {
    grid.innerHTML = list.map(eventCard).join("");
    initAll();
  }
}

/* ---------- event registration target ---------- */
function eventRegistrationTarget(event) {
  const formId = String(event.registrationFormId || (event.id === "embednova" ? "embednova" : "")).trim();
  if (formId && /^[A-Za-z0-9_-]{1,120}$/.test(formId)) {
    const query = new URLSearchParams({ form: formId, event: String(event.id || ""), eventTitle: String(event.title || "Event") });
    return { href: `/pages/form.html?${query.toString()}`, external: false };
  }
  const external = externalUrl(event.registrationLink);
  return external ? { href: external, external: true } : null;
}

function eventGlimpseCard(entry, eventTitle) {
  const [rawType = "", rawUrl = "", ...captionParts] = String(entry || "").split("|").map((part) => part.trim());
  const type = rawType.toLowerCase();
  const caption = captionParts.join(" | ") || `${eventTitle} ${type === "video" ? "clip" : "photo"}`;
  if (type === "video") {
    const src = drivePreviewUrl(rawUrl);
    if (!src) return "";
    return `<article class="card event-glimpse-card"><div class="event-glimpse-video"><iframe src="${esc(src)}" title="${esc(caption)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="muted">${esc(caption)}</p></article>`;
  }
  if (type !== "image" && type !== "photo") return "";
  const src = asset(rawUrl);
  return `<figure class="card event-glimpse-card"><img src="${esc(src)}" alt="${esc(caption)}" loading="lazy" decoding="async" /><figcaption class="muted">${esc(caption)}</figcaption></figure>`;
}

/* ---------- event detail ---------- */
async function eventDetail() {
  const c = $("#eventDetailContainer");
  skeletons(c, 1, 420);
  const list = await getEvents();
  const id = new URLSearchParams(location.search).get("id");
  const e = list.find((x) => x.id === id) || list[0];
  if (!e) {
    c.innerHTML = '<div class="card center"><h1>Event not found</h1><p class="muted">This event may have ended or is temporarily unavailable.</p><a class="btn btn-primary" href="/pages/events.html">Browse events</a></div>';
    return;
  }
  document.title = `${e.title} | EMBEDX Events | SRM TRP Engineering College`;
  const registrationTarget = eventRegistrationTarget(e);
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
        ${registrationTarget ? `<div class="hero-cta"><a class="btn btn-primary" href="${esc(registrationTarget.href)}" ${registrationTarget.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>${registrationTarget.external ? "Official Registration" : "Register for this event"} ${icon("arrow-right")}</a></div>` : `<p class="muted event-registration-unassigned">Registration form not assigned yet. Please check back later.</p>`}
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
    ${(Array.isArray(e.glimpses) && e.glimpses.length) ? `<section class="event-glimpses" aria-labelledby="eventGlimpsesTitle"><h2 id="eventGlimpsesTitle">Event Glimpses</h2><p class="muted">Photos and clips from ${esc(e.title)}.</p><div class="grid grid-3">${e.glimpses.map((entry) => eventGlimpseCard(entry, e.title)).filter(Boolean).join("")}</div></section>` : ""}
    ${(e.tracks || []).length ? `
    <h2 style="margin-top:2.8rem">The ${e.tracks.length} ${esc(e.title)} Tracks</h2>
    <p class="muted">Choose your track or compete across multiple disciplines.</p>
    ${e.tracks.map((t) => `
      <section class="card" id="track-${esc(t.number)}" style="margin-bottom:1.4rem" data-reveal>
        <div style="display:flex;gap:1.2rem;flex-wrap:wrap;align-items:flex-start">
          <img src="${esc(asset(t.image))}" alt="${esc(t.name)} illustration" loading="lazy" decoding="async" style="width:180px;border-radius:var(--r-sm)" />
          <div style="flex:1;min-width:240px">
            <span class="track-num">${esc(t.number)}</span>
            <h3 style="display:inline-block;margin-left:.6rem">${esc(t.name)}</h3>
            <p class="card-sub">${esc(t.tagline)} ${esc(t.motto)}</p>
            <p class="muted">${esc(t.description)}</p>
            <h4>Covered Topics</h4>
            <ul class="spec-list">${(t.topics || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            <h4 style="margin-top:.9rem">Format</h4><p class="muted" style="font-size:.92rem">${esc(t.format)}</p>
            <h4 style="margin-top:.9rem">Rules</h4>
            <ul class="spec-list">${(t.rules || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </div>
        </div>
      </section>`).join("")}` : ""}
    ${(e.faqs || []).length ? `
    <h2 style="margin-top:2.4rem">Frequently Asked Questions</h2>
    <div class="faq">${e.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>` : ""}`;
  c.querySelectorAll(".event-poster img").forEach((img) => img.addEventListener("error", () => {
    const fallback = document.createElement("div"); fallback.className = "event-poster-fallback"; fallback.setAttribute("role", "img"); fallback.setAttribute("aria-label", `${e.title} poster unavailable`);
    const title = document.createElement("strong"); title.textContent = e.title;
    const caption = document.createElement("span"); caption.textContent = "Event poster unavailable — an admin can replace it in Events.";
    fallback.append(title, caption); img.replaceWith(fallback);
  }, { once: true }));
  initAll();
  if (location.hash === "#register" && registrationTarget) location.replace(registrationTarget.href);
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
  if (fg) fg.innerHTML = faculty.length ? faculty.map(teamCard).join("") : '<p class="card center muted">Faculty profiles will be added soon.</p>';
  if (sg) sg.innerHTML = students.length ? students.map(teamCard).join("") : '<p class="card center muted">Team profiles will be added soon.</p>';
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
  grid.innerHTML = list.length ? list.map(achievementCard).join("") : '<p class="card center muted">New achievements will be added here.</p>';
  initAll();
}

function renderPageBlocks(region, blocks) {
  if (!region) return;
  region.replaceChildren();
  for (const block of blocks) {
    const safeHref = (value) => {
      const href = String(value || "").trim();
      if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) return href;
      try { const url = new URL(href); return ["https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
    };
    let element;
    if (block.type === "heading") {
      element = document.createElement("section");
      const h = document.createElement("h2"); h.textContent = block.title; element.append(h);
      if (block.body) { const p = document.createElement("p"); p.className = "muted"; p.textContent = block.body; element.append(p); }
    } else if (block.type === "text") {
      element = document.createElement("section");
      if (block.title) { const h = document.createElement("h2"); h.textContent = block.title; element.append(h); }
      const p = document.createElement("p"); p.textContent = block.body; element.append(p);
    } else if (block.type === "feature") {
      element = document.createElement("article"); element.className = "card page-feature-block";
      if (block.title) { const h = document.createElement("h3"); h.textContent = block.title; element.append(h); }
      if (block.body) { const p = document.createElement("p"); p.textContent = block.body; element.append(p); }
    } else if (block.type === "link") {
      element = document.createElement("article"); element.className = "page-link-block";
      if (block.title) { const h = document.createElement("h3"); h.textContent = block.title; element.append(h); }
      if (block.body) { const p = document.createElement("p"); p.textContent = block.body; element.append(p); }
      const href = safeHref(block.url);
      if (href) { const a = document.createElement("a"); a.className = "btn btn-primary"; a.href = href; a.textContent = block.label || "Learn more"; if (/^https:/i.test(href) && new URL(href).origin !== location.origin) { a.target = "_blank"; a.rel = "noopener noreferrer"; } element.append(a); }
    } else if (block.type === "image") {
      const src = safeHref(block.url);
      if (!src) continue;
      element = document.createElement("figure"); element.className = "page-media-block";
      const img = document.createElement("img"); img.src = src; img.alt = block.caption || block.title || "Page image"; img.loading = "lazy"; img.decoding = "async"; element.append(img);
      if (block.caption || block.title) { const caption = document.createElement("figcaption"); caption.textContent = block.caption || block.title; element.append(caption); }
    } else if (block.type === "video") {
      const src = safeHref(block.url);
      if (!src || !/^https:/i.test(src)) continue;
      element = document.createElement("figure"); element.className = "page-media-block";
      const video = document.createElement("video"); video.src = src; video.controls = true; video.preload = "metadata"; video.playsInline = true; element.append(video);
      if (block.caption || block.title) { const caption = document.createElement("figcaption"); caption.textContent = block.caption || block.title; element.append(caption); }
    }
    if (element) region.append(element);
  }
  region.hidden = region.childElementCount === 0;
}

/* ---------- boot ---------- */
const page = document.body.dataset.page;
const pageBlockRegion = document.createElement("section");
pageBlockRegion.className = "wrap page-custom-blocks";
pageBlockRegion.hidden = true;
$("main")?.append(pageBlockRegion);
if (page) {
  getPageBlocks(page).then((blocks) => renderPageBlocks(pageBlockRegion, blocks));
  subscribePageBlocks(page, (blocks) => renderPageBlocks(pageBlockRegion, blocks));
}
const editableCopyPages = new Set(["home", "about", "domains", "projects", "events", "achievers", "team", "resources", "contact", "join"]);
if (editableCopyPages.has(page)) {
  getPageContent(page).then((content) => applyPageContent(page, content));
  subscribePageContent(page, (content) => applyPageContent(page, content));
}
const routes = {
  home, projects: projectsPage, "project-detail": projectDetail,
  events: eventsPage, "event-detail": eventDetail, team: teamPage,
  domains: domainsPage, resources: resourcesPage, achievers: achieversPage
};
initAll();
if (routes[page]) {
  const liveCollections = {
    home: ["announcements", "gallery", "achievements", "projects", "events"],
    projects: ["projects"],
    "project-detail": ["projects"],
    events: ["events"],
    "event-detail": ["events"],
    team: ["team"],
    resources: ["resources"],
    achievers: ["achievements"]
  };
  let refreshScheduled = false;
  let routeReady = false;
  const liveCollectionNames = new Set(liveCollections[page] || []);
  const scheduleLiveRefresh = () => {
    if (!routeReady || refreshScheduled) return;
    refreshScheduled = true;
    setTimeout(() => {
      refreshScheduled = false;
      if (routes[page]) routes[page]();
    }, 100);
  };
  window.addEventListener("embedx:public-collection-updated", (event) => {
    if (liveCollectionNames.has(event.detail?.name)) scheduleLiveRefresh();
  });
  Promise.resolve(routes[page]()).catch((error) => console.error(`Could not render ${page}`, error)).finally(() => {
    routeReady = true;
    for (const collection of liveCollections[page] || []) subscribePublicCollection(collection, scheduleLiveRefresh);
  });
}
