// EMBEDX — Card renderers + skeleton loaders.
import { icon } from "./icons.js";

export const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Data files store root-relative-without-slash paths; make them absolute so /pages/* resolve.
export const asset = (u = "") => (u.startsWith("/") || u.startsWith("http") ? u : "/" + u);

export function skeletons(el, n = 3, h = 280) {
  el.innerHTML = Array.from({ length: n }, () => `<div class="skeleton" style="min-height:${h}px" aria-hidden="true"></div>`).join("");
}

export function projectCard(p) {
  const status = /Achieved/i.test(p.status || "") ? "" : "proto";
  return `
  <article class="card tilt" data-reveal>
    <div class="card-img"><img src="${esc(asset(p.imageUrl))}" alt="${esc(p.title)} project photo" loading="lazy" width="1000" height="620" /></div>
    <div style="display:flex;gap:.5rem;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <span class="chip chip-accent">${esc(p.category)}</span>
      <span class="badge-status ${status}">${esc(p.status || "Active")}</span>
    </div>
    <h3 style="margin-top:.7rem">${esc(p.title)}</h3>
    <p class="muted" style="font-size:.92rem">${esc(p.highlight ? p.highlight + " — " : "")}${esc(p.cardDesc || p.shortDesc || p.description || "")}</p>
    <div class="card-tags">${(p.tags || []).slice(0, 4).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
    <a class="card-link" href="/pages/project-detail.html?id=${encodeURIComponent(p.id)}">View Project ${icon("arrow-right")}</a>
  </article>`;
}

export function eventCard(e) {
  return `
  <article class="card tilt" data-reveal>
    <span class="chip chip-accent">${esc(e.type || "Event")}</span>
    <h3 style="margin-top:.7rem">${esc(e.title)}</h3>
    <p class="muted" style="font-size:.9rem">${esc(e.subtitle || "")}</p>
    <ul class="event-meta">
      <li>${icon("calendar")}<span>${esc(e.date || "")}</span></li>
      <li>${icon("map-pin")}<span>${esc(e.venue || "")}</span></li>
      <li>${icon("shield")}<span>${esc(e.registrationStatus || "")}</span></li>
    </ul>
    <p class="muted" style="font-size:.92rem">${esc(e.description || "")}</p>
    <a class="card-link" href="/pages/event-detail.html?id=${encodeURIComponent(e.id)}">Full Event Details ${icon("arrow-right")}</a>
  </article>`;
}

export function teamCard(m) {
  const socials = [
    m.linkedin ? `<a class="icon-btn" href="${esc(m.linkedin)}" rel="noopener" aria-label="LinkedIn of ${esc(m.name)}">${icon("linkedin")}</a>` : "",
    m.github ? `<a class="icon-btn" href="${esc(m.github)}" rel="noopener" aria-label="GitHub of ${esc(m.name)}">${icon("github")}</a>` : ""
  ].join("");
  return `
  <article class="card team-card tilt" data-reveal>
    <img src="${esc(asset(m.photoUrl))}" alt="Portrait of ${esc(m.name)}" loading="lazy" width="108" height="108" />
    <h3 style="margin-bottom:.15rem">${esc(m.name)}</h3>
    <p class="role">${esc(m.role)}</p>
    <p class="meta">${esc(m.focus || "")} • ${esc(m.department || "EEE")}${m.year && m.year !== "Faculty" ? " • " + esc(m.year) : ""}</p>
    <p class="bio">${esc(m.bio || "")}</p>
    ${socials ? `<div class="team-socials">${socials}</div>` : ""}
  </article>`;
}

export function domainCard(d) {
  return `
  <article class="card tilt" data-reveal>
    <span class="card-sub">${esc(d.kicker)}</span>
    <h3>${esc(d.title)}</h3>
    <p class="muted" style="font-size:.92rem">${esc(d.desc)}</p>
    <p style="font-size:.85rem"><strong>Core Focus:</strong> <span class="muted">${esc(d.focus)}</span></p>
    <div class="card-tags">${d.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
  </article>`;
}

export function resourceCard(r) {
  return `
  <article class="card tilt" data-reveal>
    <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:center">
      <span class="chip chip-accent">${esc(r.level)}</span><span class="icon-tile" style="margin:0;width:38px;height:38px">${icon("book")}</span>
    </div>
    <h3 style="margin-top:.7rem">${esc(r.title)}</h3>
    <p class="muted" style="font-size:.92rem">${esc(r.desc)}</p>
    <div class="card-tags">${r.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
    <p class="card-link" style="cursor:default">${icon("check")} Curated Guide — available at club sessions</p>
  </article>`;
}

export function achievementCard(a) {
  return `
  <article class="card tilt" data-reveal>
    <div class="card-img"><img src="${esc(asset(a.image))}" alt="${esc(a.title)}" loading="lazy" width="1000" height="620" /></div>
    <span class="badge-status">${esc(a.badge)}</span>
    <h3 style="margin-top:.7rem">${esc(a.title)}</h3>
    <p class="card-sub">${esc(a.subtitle)}</p>
    <p class="muted" style="font-size:.92rem">${esc(a.description)}</p>
    <p style="font-size:.85rem"><strong>Team:</strong> <span class="muted">${esc(a.team)} • ${esc(a.institution)}</span></p>
    <ul class="spec-list" style="margin-top:.6rem">${a.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    <a class="card-link" href="/pages/project-detail.html?id=${encodeURIComponent(a.projectId)}">Read Project Specs ${icon("arrow-right")}</a>
  </article>`;
}
