// EMBEDX — Shared chrome: navbar, mobile menu, footer, theme toggle.
import { icon } from "./icons.js";
import { initSearch } from "./search.js?v=20261107-admin-controls";
import { getSiteSettings, subscribeSiteSettings, getPageContent, subscribePageContent, applyPageContent, getSiteLinks, subscribeSiteLinks } from "./store.js?v=20261107-admin-controls";
import { DEFAULT_SITE_LINKS } from "./data/site-links.js?v=20261107-editor";

function safeNavigationHref(value) {
  const href = String(value || "").trim();
  if (!href || href.startsWith("//") || href.includes("\\")) return "";
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try { const url = new URL(href); return ["https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
}
function makeNavigationLink(item, { button = false, current = false } = {}) {
  const href = safeNavigationHref(item.href);
  if (!href || !item.label) return null;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.textContent = item.label;
  if (button) anchor.className = "btn btn-primary btn-sm nav-join";
  if (current && !/^https:/i.test(href) && normalize(new URL(href, location.origin).pathname) === currentPage()) anchor.setAttribute("aria-current", "page");
  if (/^https:/i.test(href) && new URL(href).origin !== location.origin) { anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; }
  return anchor;
}
function renderSiteLinks(links) {
  const nav = document.querySelector("#primaryNavLinks");
  const mobile = document.querySelector("#mobileNavLinks");
  const footerNav = document.querySelector("#footerNavigationLinks");
  const footerCommunity = document.querySelector("#footerCommunityLinks");
  const join = document.querySelector("#headerJoinLink");
  if (!nav || !mobile || !footerNav || !footerCommunity || !join) return;
  const fill = (region, rows, options = {}) => {
    region.replaceChildren(...rows.map((row) => makeNavigationLink(row, options)).filter(Boolean));
  };
  fill(nav, links.primary, { current: true });
  fill(mobile, links.primary, { current: true });
  fill(footerNav, links.footerNavigation);
  fill(footerCommunity, links.footerCommunity);
  const joinLink = makeNavigationLink(links.headerJoin[0] || {}, { button: true });
  if (joinLink) { joinLink.id = "headerJoinLink"; join.replaceWith(joinLink); }
  else { join.hidden = true; join.removeAttribute("href"); join.textContent = ""; }
  const mobileJoin = makeNavigationLink(links.headerJoin[0] || {}, { button: true });
  if (mobileJoin) mobileJoin.className = "btn btn-primary mobile-join";
  const mobileMenu = document.querySelector("#mobileMenu");
  if (mobileMenu) {
    const previous = mobileMenu.querySelector(".mobile-join");
    if (previous) previous.remove();
    if (mobileJoin) mobileMenu.append(mobileJoin);
  }
}

// Normalize a path so "/pages/about", "/pages/about.html" and "/" compare equal.
function normalize(p) {
  let n = p.replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/+$/, "");
  return n === "" ? "/" : n;
}

export function currentPage() {
  return normalize(location.pathname);
}

function injectChrome() {
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
      <nav class="nav-links" id="primaryNavLinks" aria-label="Primary"></nav>
      <div class="nav-actions">
        <button class="icon-btn" id="searchOpen" aria-label="Search the site (Ctrl+K)" title="Search (Ctrl+K)">${icon("search")}</button>
        <button class="icon-btn" id="themeToggle" aria-label="Toggle light / dark theme">${icon("moon")}</button>
        <a class="btn btn-primary btn-sm nav-join" id="headerJoinLink" href="/pages/join.html">Join EMBEDX</a>
        <button class="icon-btn nav-burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">${icon("menu")}</button>
      </div>
    </div>`;
  document.body.prepend(header);

  const mobile = document.createElement("nav");
  mobile.className = "mobile-menu";
  mobile.id = "mobileMenu";
  mobile.setAttribute("aria-label", "Mobile");
  mobile.setAttribute("aria-hidden", "true");
  mobile.inert = true;
  mobile.innerHTML = `<div id="mobileNavLinks"></div>`;
  header.after(mobile);

  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="footer-brand-lockup">
            <img src="/assets/images/embedx-emblem.webp" alt="" width="48" height="48" loading="lazy" decoding="async" />
            <div><strong>EMBEDX</strong><span>Embedded Systems &amp; Automation Club</span></div>
          </div>
          <div class="college-mark-lockup"><span class="college-logo-frame"><img class="college-mark" data-site-src="collegeLogoUrl" src="/assets/images/srm-trp-college-attached.png" alt="SRM TRP Engineering College logo" loading="lazy" decoding="async" /></span><span>SRM TRP Engineering College</span></div>
          <p class="muted footer-institution">Department of Electrical and Electronics Engineering (EEE)<br />SRM TRP Engineering College (Autonomous)<br />SRM Nagar, Samayapuram, Tiruchirappalli – 621 105.</p>
          <p class="chip chip-accent" style="margin-top:.4rem" data-page-copy="global:footerTagline">INNOVATE • INTEGRATE • INSPIRE</p>
        </div>
        <div>
          <h4 data-page-copy="global:footerNavHeading">Navigation</h4>
          <div id="footerNavigationLinks" class="footer-link-list"></div>
        </div>
        <div>
          <h4 data-page-copy="global:footerCommunityHeading">Community</h4>
          <div id="footerCommunityLinks" class="footer-link-list"></div>
        </div>
        <div>
          <h4 data-page-copy="global:footerConnectHeading">Connect With Us</h4>
          <p class="muted" style="font-size:.9rem" data-page-copy="global:footerConnectDescription">Follow departmental technical initiatives, competition updates, and workshop announcements.</p>
          <p style="font-size:.9rem">${icon("phone", "i")} Tel: <a data-site-href="phoneHref" href="tel:04312908050" data-site-text="phoneDisplay">0431-2908050</a><br />${icon("globe", "i")} Portal: <a data-site-href="collegeWebsiteUrl" href="https://trp.srmtrichy.edu.in" rel="noopener noreferrer" target="_blank" data-site-text="collegeWebsiteLabel">trp.srmtrichy.edu.in</a><br />${icon("mail", "i")} Email: <a data-site-email href="mailto:hod.eee@trp.srmtrichy.edu.in">hod.eee@trp.srmtrichy.edu.in</a></p>
          <div class="socials">
            <a class="icon-btn" data-site-href="linkedinUrl" href="https://www.linkedin.com/school/srm-trp-engineering-college" rel="noopener noreferrer" target="_blank" aria-label="LinkedIn">${icon("linkedin")}</a>
            <a class="icon-btn" data-site-href="instagramUrl" href="https://www.instagram.com/trpengineeringcollege" rel="noopener noreferrer" target="_blank" aria-label="Instagram">${icon("instagram")}</a>
            <a class="icon-btn" data-site-href="facebookUrl" href="https://www.facebook.com/SRMTRPEngg" rel="noopener noreferrer" target="_blank" aria-label="Facebook">${icon("facebook")}</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span data-page-copy="global:footerCopyright">© 2026 EMBEDX – Embedded Systems and Automation Club • Department of EEE.</span>
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

  // Keep the mobile menu in sync visually, for keyboard users and assistive technology.
  const burger = header.querySelector("#burger");
  const setMobileMenu = (open) => {
    mobile.classList.toggle("open", open);
    mobile.setAttribute("aria-hidden", String(!open));
    mobile.inert = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    burger.innerHTML = icon(open ? "x" : "menu");
  };
  burger.addEventListener("click", () => setMobileMenu(!mobile.classList.contains("open")));
  mobile.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMobileMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobile.classList.contains("open")) {
      setMobileMenu(false);
      burger.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (mobile.classList.contains("open") && !header.contains(e.target) && !mobile.contains(e.target)) setMobileMenu(false);
  });
  let scrollFrame = 0;
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      header.classList.toggle("scrolled", scrollY > 30);
      const max = document.documentElement.scrollHeight - innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      prog.style.transform = `scaleX(${progress})`;
      toTop.classList.toggle("show", scrollY > 600);
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
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
renderSiteLinks(DEFAULT_SITE_LINKS);
getSiteLinks().then(renderSiteLinks);
subscribeSiteLinks(renderSiteLinks);
getPageContent("global").then((content) => applyPageContent("global", content));
subscribePageContent("global", (content) => applyPageContent("global", content));

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
    const isHero = element.dataset.siteSrc === "heroImageUrl";
    const fallback = isHero ? "/assets/images/robotics-hero.webp" : "/assets/images/srm-trp-college-attached.png";
    element.addEventListener("error", () => { element.src = fallback; }, { once: true });
    const value = String(settings[element.dataset.siteSrc] || "").trim();
    if (value.startsWith("/assets/images/") && !value.split(/[?#]/, 1)[0].split("/").includes("..")) { element.src = value; }
    else {
      try {
        const url = new URL(value);
        if (url.protocol === "https:" && (isHero || url.hostname === "trp.srmtrichy.edu.in")) element.src = url.href;
      } catch { /* keep the safe bundled default */ }
    }
    const altKey = element.dataset.siteAlt;
    if (altKey && typeof settings[altKey] === "string") element.alt = settings[altKey];
    if (element.dataset.siteFit) element.style.objectFit = ["cover", "contain"].includes(settings[element.dataset.siteFit]) ? settings[element.dataset.siteFit] : "cover";
    if (element.dataset.sitePositionX || element.dataset.sitePositionY) {
      const x = Math.min(100, Math.max(0, Number(settings[element.dataset.sitePositionX]) || 0));
      const y = Math.min(100, Math.max(0, Number(settings[element.dataset.sitePositionY]) || 0));
      element.style.objectPosition = `${x}% ${y}%`;
    }
  });
  const heroCaption = document.querySelector("[data-site-hero-caption]");
  if (heroCaption) heroCaption.hidden = !String(settings.heroImageCaption || "").trim() && !String(settings.heroImageSubcaption || "").trim();
}

getSiteSettings()
  .then(applySiteSettings)
  .catch((err) => console.warn("Could not apply public website settings", err))
  .finally(() => subscribeSiteSettings(applySiteSettings));
