// EMBEDX — Card renderers + skeleton loaders.
import { icon } from "./icons.js";

export const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Google Drive share links work on public pages when the file is shared as "Anyone with the link".
export function driveFileId(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    if (!/^(?:www\.)?drive\.google\.com$/i.test(url.hostname)) return "";
    const match = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/);
    const id = match?.[1] || url.searchParams.get("id") || "";
    return /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : "";
  } catch { return ""; }
}
export function drivePreviewUrl(value = "") {
  const id = driveFileId(value);
  return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : "";
}

// Data files store root-relative-without-slash paths; Drive links become embeddable image URLs.
export const asset = (value = "") => {
  const u = String(value || "").trim();
  const driveId = driveFileId(u);
  if (driveId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w2000`;
  if (/^https:\/\//i.test(u)) return u;
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  return "/" + u.replace(/^\/+/, "");
};

export const externalUrl = (value = "") => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch { return ""; }
};

export function skeletons(el, n = 3, h = 280) {
  el.innerHTML = Array.from({ length: n }, () => `<div class="skeleton" style="min-height:${h}px" aria-hidden="true"></div>`).join("");
}

export function projectCard(p) {
  const status = /Achieved/i.test(p.status || "") ? "" : "proto";
  return `
  <article class="card tilt" data-reveal>
    <div class="card-img"><img src="${esc(asset(p.imageUrl))}" alt="${esc(p.title)} project photo" loading="lazy" decoding="async" width="1000" height="620" /></div>
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

export function eventDateLabel(event = {}) {
  const iso = String(event.eventDate || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
    }
  }
  return String(event.date || "");
}

export function eventCard(e) {
  return `
  <article class="card tilt" data-reveal>
    <span class="chip chip-accent">${esc(e.type || "Event")}</span>
    <h3 style="margin-top:.7rem">${esc(e.title)}</h3>
    <p class="muted" style="font-size:.9rem">${esc(e.subtitle || "")}</p>
    <ul class="event-meta">
      <li>${icon("calendar")}<span>${esc(eventDateLabel(e))}</span></li>
      <li>${icon("map-pin")}<span>${esc(e.venue || "")}</span></li>
      <li>${icon("shield")}<span>${esc(e.registrationStatus || "")}</span></li>
    </ul>
    <p class="muted" style="font-size:.92rem">${esc(e.description || "")}</p>
    <a class="card-link" href="/pages/event-detail.html?id=${encodeURIComponent(e.id)}">Full Event Details ${icon("arrow-right")}</a>
  </article>`;
}

export function teamCard(m) {
  const linkedin = externalUrl(m.linkedin);
  const github = externalUrl(m.github);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(m.email || "").trim()) ? String(m.email).trim() : "";
  const socials = [
    linkedin ? `<a class="icon-btn" href="${esc(linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn of ${esc(m.name)}">${icon("linkedin")}</a>` : "",
    github ? `<a class="icon-btn" href="${esc(github)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub of ${esc(m.name)}">${icon("github")}</a>` : "",
    email ? `<a class="icon-btn" href="mailto:${esc(email)}" aria-label="Email ${esc(m.name)}" title="Email ${esc(m.name)}">${icon("mail")}</a>` : ""
  ].join("");
  return `
  <article class="card team-card tilt" data-reveal>
    <img src="${esc(asset(m.photoUrl))}" alt="Portrait of ${esc(m.name)}" loading="lazy" decoding="async" width="108" height="108" />
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
  const link = externalUrl(r.url);
  return `
  <article class="card tilt" data-reveal>
    <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:center">
      <span class="chip chip-accent">${esc(r.level)}</span><span class="icon-tile" style="margin:0;width:38px;height:38px">${icon("book")}</span>
    </div>
    <h3 style="margin-top:.7rem">${esc(r.title)}</h3>
    <p class="muted" style="font-size:.92rem">${esc(r.desc)}</p>
    <div class="card-tags">${(Array.isArray(r.tags) ? r.tags : []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
    ${link ? `<a class="card-link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open resource ${icon("external")}</a>` : `<p class="card-link" style="cursor:default">${icon("check")} Curated Guide — available at club sessions</p>`}
  </article>`;
}

export function achievementCard(a) {
  const image = a.image || a.imageUrl || "";
  const description = a.description || a.detail || "";
  const team = a.team || a.member || "";
  const projectId = a.projectId || "";
  return `
  <article class="card tilt" data-reveal>
    ${image ? `<div class="card-img"><img src="${esc(asset(image))}" alt="${esc(a.title)}" loading="lazy" decoding="async" width="1000" height="620" /></div>` : ""}
    <span class="badge-status">${esc(a.badge || a.date || "Achievement")}</span>
    <h3 style="margin-top:.7rem">${esc(a.title)}</h3>
    <p class="card-sub">${esc(a.subtitle || "")}</p>
    <p class="muted" style="font-size:.92rem">${esc(description)}</p>
    <p style="font-size:.85rem"><strong>Team:</strong> <span class="muted">${esc(team)}${a.institution ? ` • ${esc(a.institution)}` : ""}</span></p>
    <ul class="spec-list" style="margin-top:.6rem">${(Array.isArray(a.highlights) ? a.highlights : []).map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    ${projectId ? `<a class="card-link" href="/pages/project-detail.html?id=${encodeURIComponent(projectId)}">Read Project Specs ${icon("arrow-right")}</a>` : ""}
  </article>`;
}

export function announcementCard(a) {
  const date = (a.createdAt || "").slice(0, 10);
  return `
  <article class="card tilt" data-reveal>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap">
      <span class="chip chip-accent">${esc(a.kind || "notice")}</span>
      ${a.pinned ? '<span class="badge-status">Pinned</span>' : ""}
    </div>
    <h3 style="margin-top:.7rem">${esc(a.title)}</h3>
    <p class="muted" style="font-size:.92rem;white-space:pre-line">${esc(a.body)}</p>
    ${date ? `<p class="meta" style="color:var(--text-faint);font-size:.78rem;margin:.4rem 0 0">${icon("clock")} ${date}</p>` : ""}
  </article>`;
}

export function galleryButton(g) {
  const raw = g.imageUrl || g.mediaUrl || g.videoUrl || g.url || "";
  const src = asset(raw);
  const caption = g.caption || g.event || "EMBEDX media";
  const type = String(g.mediaType || g.type || (g.videoUrl ? "video" : "image")).toLowerCase();
  if (type === "video") {
    const poster = driveFileId(raw) ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" />` : `<video src="${esc(src)}" muted playsinline preload="metadata" aria-hidden="true"></video>`;
    return `<button class="gallery-video" data-lightbox="${esc(src)}" data-lightbox-type="video" data-caption="${esc(caption)}" aria-label="Play video: ${esc(caption)}"><span class="gallery-video-poster">${poster}<span class="gallery-video-play" aria-hidden="true">▶</span></span></button>`;
  }
  return `<button data-lightbox="${esc(src)}" data-lightbox-type="image" data-caption="${esc(caption)}" aria-label="Enlarge: ${esc(caption)}"><img src="${esc(src)}" alt="${esc(caption)}" loading="lazy" decoding="async" /></button>`;
}
