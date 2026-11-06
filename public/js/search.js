// EMBEDX — Instant site search (Ctrl/⌘+K or nav button). Indexes Firestore-first content.
import { icon } from "./icons.js";
import { esc } from "./render.js?v=20261106-smooth-render";
import { getProjects, getEvents, getTeam, getResources, getAchievements } from "./store.js?v=20261106-smooth-render";

let index = null;
let indexPromise = null;

async function buildIndex() {
  if (index) return index;
  if (!indexPromise) indexPromise = (async () => {
  const [projects, events, team, resources, achievements] = await Promise.all([
    getProjects(), getEvents(), getTeam(), getResources(), getAchievements()
  ]);
  index = [
    ...projects.map((p) => ({ t: p.title, s: p.category + " project", u: `/pages/project-detail.html?id=${p.id}`, k: "Projects", hay: `${p.title} ${p.category} ${p.shortDesc || ""} ${(p.tags || []).join(" ")}` })),
    ...events.map((e) => ({ t: e.title, s: e.type + " • " + (e.date || ""), u: `/pages/event-detail.html?id=${e.id}`, k: "Events", hay: `${e.title} ${e.type} ${e.description || ""}` })),
    ...team.map((m) => ({ t: m.name, s: m.role, u: "/pages/team.html", k: "Team", hay: `${m.name} ${m.role} ${m.focus || ""}` })),
    ...resources.map((r) => ({ t: r.title, s: r.category + " guide", u: "/pages/resources.html", k: "Learning Hub", hay: `${r.title || ""} ${r.desc || ""} ${(Array.isArray(r.tags) ? r.tags : []).join(" ")}` })),
    ...achievements.map((a) => ({ t: a.title, s: a.badge, u: "/pages/achievers.html", k: "Achievers", hay: `${a.title} ${a.subtitle || ""} ${a.description || ""}` })),
    { t: "Join EMBEDX", s: "Membership application", u: "/pages/join.html", k: "Club", hay: "join apply membership recruitment eligibility" },
    { t: "Contact & Location", s: "Department of EEE", u: "/pages/contact.html", k: "Club", hay: "contact phone address inquiry trichy" },
    { t: "Technical Domains", s: "12 engineering verticals", u: "/pages/domains.html", k: "Club", hay: "domains embedded rtos iot robotics plc pcb tinyml" }
  ];
  return index;
  })().catch((err) => { indexPromise = null; throw err; });
  return indexPromise;
}

export function initSearch() {
  const btn = document.getElementById("searchOpen");
  if (!btn) return;
  let bd = document.getElementById("searchModal");
  if (!bd) {
    bd = document.createElement("div");
    bd.className = "modal-backdrop";
    bd.id = "searchModal";
    bd.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Search the EMBEDX website" style="width:min(640px,100%)">
        <div class="field" style="margin:0">
          <label for="searchInput" class="sr-only" style="position:absolute;left:-9999px">Search the site</label>
          <input id="searchInput" type="search" placeholder="Search projects, events, team, guides…" autocomplete="off" style="font-size:1.05rem;padding:1rem" />
        </div>
        <div id="searchResults" style="margin-top:.9rem;display:grid;gap:.5rem;max-height:52dvh;overflow-y:auto"></div>
      </div>`;
    document.body.append(bd);
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    bd.querySelector("#searchInput").addEventListener("input", (e) => run(e.target.value));
  }
  const open = async () => {
    bd._returnFocus = btn;
    bd.classList.add("open");
    document.body.style.overflow = "hidden";
    bd.querySelector("#searchInput").focus();
    bd.querySelector("#searchResults").textContent = "Loading search…";
    try { await buildIndex(); run(""); }
    catch (err) {
      console.error("search index failed", err);
      bd.querySelector("#searchResults").textContent = "Search is temporarily unavailable. Please try again.";
    }
  };
  const close = () => { bd.classList.remove("open"); document.body.style.overflow = ""; bd._returnFocus?.focus(); };
  btn.addEventListener("click", open);
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    if (e.key === "Escape" && bd.classList.contains("open")) close();
  });

  function run(q) {
    const out = bd.querySelector("#searchResults");
    if (!index) { out.textContent = "Loading search…"; return; }
    const query = q.trim().toLowerCase();
    const rows = !query ? index.slice(0, 6) : index.filter((r) => r.hay.toLowerCase().includes(query)).slice(0, 12);
    out.innerHTML = rows.length
      ? rows.map((r) => `<a class="card" style="padding:.8rem 1rem;display:flex;gap:.8rem;align-items:center" href="${esc(r.u)}">
           <span class="icon-tile" style="margin:0;width:38px;height:38px">${icon(r.k === "Projects" ? "cpu" : r.k === "Events" ? "calendar" : r.k === "Team" ? "users" : r.k === "Learning Hub" ? "book" : r.k === "Achievers" ? "trophy" : "sparkles")}</span>
           <span style="min-width:0"><strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.t)}</strong>
           <span class="muted" style="font-size:.8rem">${esc(r.k)} • ${esc(r.s)}</span></span></a>`).join("")
      : `<p class="muted center" style="padding:1rem">No matches for “${esc(q)}”.</p>`;
    out.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  }
}
