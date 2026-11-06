// EMBEDX — Shared chrome: navbar, mobile menu, footer, theme toggle.
import { icon } from "./icons.js";
import { initSearch } from "./search.js?v=20261106";
import { getSiteSettings } from "./store.js?v=20261106-site-settings";

const NAV = [
  ["Home", "/"],
  ["About", "/pages/about.html"],
  ["Domains", "/pages/domains.html"],
  ["Projects", "/pages/projects.html"],
  ["Events", "/pages/events.html"],
  ["Achievers", "/pages/achievers.html"],
  ["Team", "/pages/team.html"],
  ["Resources", "/pages/resources.html"],
  ["Contact", "/pages/contact.html"]
];

// Normalize a path so "/pages/about", "/pages/about.html" and "/" compare equal.
function normalize(p) {
  let n = p.replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/+$/, "");
  return n === "" ? "/" : n;
}

export function currentPage() {
  return normalize(location.pathname);
}

function injectChrome() {
  const here = currentPage();
  const cur = (href) => (normalize(href) === here ? 'aria-current="page"' : "");
  const links = NAV.map(([label, href]) => `<a href="${href}" ${cur(href)}>${label}</a>`).join("");
  const mlinks = NAV.map(([label, href]) => `<a href="${href}" ${cur(href)}>${label}</a>`).join("") +
    `<a href="/pages/join.html" class="btn btn-primary">Join EMBEDX</a>`;

  const header = document.createElement("header");
  header.className = "nav";
  header.innerHTML = `
    <div class="wrap nav-inner">
      <a class="brand" href="/" aria-label="EMBEDX — Department of EEE, SRM TRP Engineering College">
        <img src="/assets/images/embedx-emblem.webp" alt="" width="40" height="40" />
        <span class="brand-copy">
          <span class="brand-name">EMBED<span>X</span></span>
          <span class="brand-sub">Department of EEE</span>
          <span class="brand-institution">SRM TRP Engineering College</span>
        </span>
      </a>
      <nav class="nav-links" aria-label="Primary">${links}</nav>
      <div class="nav-actions">
        <button class="icon-btn" id="searchOpen" aria-label="Search the site (Ctrl+K)" title="Search (Ctrl+K)">${icon("search")}</button>
        <button class="icon-btn" id="themeToggle" aria-label="Toggle light / dark theme">${icon("moon")}</button>
        <a class="btn btn-primary btn-sm nav-join" href="/pages/join.html">Join EMBEDX</a>
        <button class="icon-btn nav-burger" id="burger" aria-label="Open menu" aria-expanded="false">${icon("menu")}</button>
      </div>
    </div>`;
  document.body.prepend(header);

  const mobile = document.createElement("nav");
  mobile.className = "mobile-menu";
  mobile.id = "mobileMenu";
  mobile.setAttribute("aria-label", "Mobile");
  mobile.innerHTML = mlinks;
  header.after(mobile);

  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="footer-brand-lockup">
            <img src="/assets/images/embedx-emblem.webp" alt="" width="48" height="48" loading="lazy" />
            <div><strong>EMBEDX</strong><span>Embedded Systems &amp; Automation Club</span></div>
          </div>
          <div class="college-mark-lockup"><img class="college-mark" data-site-src="collegeLogoUrl" src="https://trp.srmtrichy.edu.in/wp-content/uploads/2026/03/TRP.png" alt="SRM TRP Engineering College logo" loading="lazy" /><span>SRM TRP Engineering College</span></div>
          <p class="muted footer-institution">Department of Electrical and Electronics Engineering (EEE)<br />SRM TRP Engineering College (Autonomous)<br />SRM Nagar, Samayapuram, Tiruchirappalli – 621 105.</p>
          <p class="chip chip-accent" style="margin-top:.4rem">INNOVATE • INTEGRATE • INSPIRE</p>
        </div>
        <div>
          <h4>Navigation</h4>
          <a href="/">Home</a><br /><a href="/pages/about.html">About Us</a><br /><a href="/pages/domains.html">Technical Domains</a><br /><a href="/pages/projects.html">Projects Showcase</a><br /><a href="/pages/events.html">Events &amp; EmbedNova</a><br /><a href="/pages/achievers.html">Hall of Achievers</a>
        </div>
        <div>
          <h4>Community</h4>
          <a href="/pages/team.html">Meet the Team</a><br /><a href="/pages/resources.html">Learning Hub</a><br /><a href="/pages/join.html">Join EMBEDX</a><br /><a href="/pages/contact.html">Contact Department</a><br /><a href="/pages/event-detail.html?id=embednova#register">EMBEDNOVA Registration</a>
        </div>
        <div>
          <h4>Connect With Us</h4>
          <p class="muted" style="font-size:.9rem">Follow departmental technical initiatives, competition updates, and workshop announcements.</p>
          <p style="font-size:.9rem">${icon("phone", "i")} Tel: <a data-site-href="phoneHref" href="tel:04312908050" data-site-text="phoneDisplay">0431-2908050</a><br />${icon("globe", "i")} Portal: <a data-site-href="collegeWebsiteUrl" href="https://www.trpengg.ac.in" rel="noopener noreferrer" target="_blank" data-site-text="collegeWebsiteLabel">www.trpengg.ac.in</a><br />${icon("mail", "i")} Email: <a data-site-email href="mailto:eee@srmtrpr.edu.in">eee@srmtrpr.edu.in</a></p>
          <div class="socials">
            <a class="icon-btn" data-site-href="linkedinUrl" href="https://www.linkedin.com/school/srm-trp-engineering-college" rel="noopener noreferrer" target="_blank" aria-label="LinkedIn">${icon("linkedin")}</a>
            <a class="icon-btn" data-site-href="instagramUrl" href="https://www.instagram.com/trpengineeringcollege" rel="noopener noreferrer" target="_blank" aria-label="Instagram">${icon("instagram")}</a>
            <a class="icon-btn" data-site-href="facebookUrl" href="https://www.facebook.com/SRMTRPEngg" rel="noopener noreferrer" target="_blank" aria-label="Facebook">${icon("facebook")}</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 EMBEDX – Embedded Systems and Automation Club • Department of EEE.</span>
        <span>SRM TRP Engineering College (An Autonomous Institution, Affiliated to Anna University) · <a href="/admin/" style="display:inline">Admin Portal</a></span>
      </div>
    </div>`;
  document.body.append(footer);

  const toasts = document.createElement("div");
  toasts.className = "toast-region";
  toasts.setAttribute("role", "status");
  toasts.setAttribute("aria-live", "polite");
  document.body.append(toasts);

  // scroll progress + back-to-top
  const prog = document.createElement("div");
  prog.id = "scrollProgress";
  prog.setAttribute("aria-hidden", "true");
  document.body.prepend(prog);
  const toTop = document.createElement("button");
  toTop.id = "toTop";
  toTop.className = "icon-btn";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;
  document.body.append(toTop);
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));

  // nav behaviour
  const burger = header.querySelector("#burger");
  burger.addEventListener("click", () => {
    const open = mobile.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    burger.innerHTML = icon(open ? "x" : "menu");
  });
  mobile.addEventListener("click", (e) => {
    if (e.target.closest("a")) { mobile.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); burger.innerHTML = icon("menu"); }
  });
  const onScroll = () => {
    header.classList.toggle("scrolled", scrollY > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
    toTop.classList.toggle("show", scrollY > 600);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  initSearch();

  // theme toggle
  const tBtn = header.querySelector("#themeToggle");
  const paint = () => { tBtn.innerHTML = icon(document.documentElement.dataset.theme === "light" ? "sun" : "moon"); };
  tBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("embedx-theme", next); } catch { /* private browsing may disable storage */ }
    paint();
  });
  paint();
}

injectChrome();

function validSiteHref(key, value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (key === "phoneHref") return /^tel:\+?[0-9().\s-]{8,28}$/i.test(text) ? text : "";
  try { const url = new URL(text); return url.protocol === "https:" ? url.href : ""; }
  catch { return ""; }
}

function applySiteSettings(settings) {
  document.querySelectorAll("[data-site-href]").forEach((element) => {
    const key = element.dataset.siteHref;
    const href = validSiteHref(key, settings[key]);
    if (!href) { element.hidden = true; element.style.display = "none"; return; }
    element.hidden = false; element.style.removeProperty("display"); element.href = href;
  });
  document.querySelectorAll("[data-site-email]").forEach((element) => {
    const email = String(settings.contactEmail || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { element.hidden = true; element.style.display = "none"; return; }
    element.hidden = false; element.style.removeProperty("display"); element.href = `mailto:${email}`; element.textContent = email;
  });
  document.querySelectorAll("[data-site-text]").forEach((element) => {
    const value = settings[element.dataset.siteText];
    if (value != null) element.textContent = String(value);
  });
  document.querySelectorAll("[data-site-src]").forEach((element) => {
    const value = String(settings[element.dataset.siteSrc] || "").trim();
    if (value.startsWith("/assets/images/") && !value.split(/[?#]/, 1)[0].split("/").includes("..")) { element.src = value; return; }
    try { const url = new URL(value); if (url.protocol === "https:" && url.hostname === "trp.srmtrichy.edu.in") element.src = url.href; }
    catch { /* keep the safe bundled default */ }
  });
}

getSiteSettings().then(applySiteSettings).catch((err) => console.warn("Could not apply public website settings", err));
