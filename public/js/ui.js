// EMBEDX — Micro-interactions: scroll reveal, tilt, spotlight, toasts, modal, lightbox, counters.
import { icon } from "./icons.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// A small brand-colored click pulse provides feedback without changing layout or intercepting input.
if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !(event.target instanceof Element)) return;
    const target = event.target.closest("a,button,summary,label[for],input,select,[role=button],[data-lightbox]");
    if (!target || target.matches(":disabled") || target.closest("[data-no-ripple]")) return;
    const pulse = document.createElement("span");
    pulse.className = "cursor-click-ripple";
    pulse.style.left = `${event.clientX}px`;
    pulse.style.top = `${event.clientY}px`;
    pulse.addEventListener("animationend", () => pulse.remove(), { once: true });
    document.body.append(pulse);
  }, { passive: true });
}

export function initReveal() {
  const els = [...document.querySelectorAll("[data-reveal]")].filter((el) => !el.dataset.revealBound);
  if (!els.length) return;
  if (reduced || !("IntersectionObserver" in window)) {
    els.forEach((el) => { el.dataset.revealBound = "1"; el.classList.add("revealed"); });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el, i) => { el.dataset.revealBound = "1"; el.style.setProperty("--d", `${Math.min(i % 6, 5) * 0.07}s`); io.observe(el); });
}

export function initTilt() {
  if (reduced || !matchMedia("(pointer: fine)").matches) return;
  document.querySelectorAll(".tilt").forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = "1";
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
      card.style.transform = `translateY(-6px) rotateX(${(0.5 - py) * 5}deg) rotateY(${(px - 0.5) * 6}deg)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

export function toast(message, type = "info") {
  const region = document.querySelector(".toast-region");
  if (!region) return;
  const kind = ["err", "ok", "info"].includes(type) ? type : "info";
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  const mark = document.createElement("span");
  mark.innerHTML = icon(kind === "err" ? "alert" : kind === "ok" ? "check" : "sparkles");
  const text = document.createElement("span");
  text.textContent = String(message ?? "");
  el.append(mark, text);
  region.append(el);
  setTimeout(() => { el.classList.add("hide"); setTimeout(() => el.remove(), 350); }, 4200);
}

function syncScrollLock() {
  document.body.style.overflow = document.querySelector(".modal-backdrop.open, .lightbox.open") ? "hidden" : "";
}
let modalEscapeBound = false;
function bindModalEscape() {
  if (modalEscapeBound) return;
  modalEscapeBound = true;
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openModals = document.querySelectorAll(".modal-backdrop.open");
    const open = openModals[openModals.length - 1];
    if (open) { open.classList.remove("open"); syncScrollLock(); open._returnFocus?.focus(); }
    else document.querySelector(".lightbox.open")?.classList.remove("open");
  });
}

export function initModal() {
  bindModalEscape();
  document.querySelectorAll("[data-modal-open]").forEach((btn) => {
    if (btn.dataset.modalBound) return;
    btn.dataset.modalBound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const m = document.querySelector(btn.dataset.modalOpen);
      if (m) { m._returnFocus = btn; m.classList.add("open"); m.querySelector("input,select,textarea,button")?.focus(); syncScrollLock(); }
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach((bd) => {
    if (bd.dataset.modalBound) return;
    bd.dataset.modalBound = "1";
    const close = () => { bd.classList.remove("open"); syncScrollLock(); bd._returnFocus?.focus(); };
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    bd.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", close));
    bd.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusable = [...bd.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
}

export function initLightbox() {
  let lb = document.querySelector(".lightbox");
  if (!lb) {
    lb = document.createElement("figure");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-label", "Image preview");
    lb.innerHTML = `<div><img alt="" /><figcaption></figcaption></div>`;
    document.body.append(lb);
    lb.addEventListener("click", () => lb.classList.remove("open"));
    addEventListener("keydown", (e) => { if (e.key === "Escape") lb.classList.remove("open"); });
  }
  document.querySelectorAll("[data-lightbox]").forEach((btn) => {
    if (btn.dataset.lbBound) return;
    btn.dataset.lbBound = "1";
    btn.addEventListener("click", () => {
      const img = lb.querySelector("img");
      img.src = btn.dataset.lightbox;
      img.alt = btn.dataset.caption || btn.getAttribute("aria-label") || "Enlarged view";
      lb.querySelector("figcaption").textContent = btn.dataset.caption || "";
      lb.classList.add("open");
    });
  });
}

export function initCounters() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (el.dataset.counterBound) return;
    el.dataset.counterBound = "1";
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (!Number.isFinite(target)) { el.textContent = "0" + suffix; return; }
    if (reduced || !("IntersectionObserver" in window)) { el.textContent = target + suffix; return; }
    const io = new IntersectionObserver((en) => {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min((t - t0) / 1200, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(el);
  });
}

export function initAll() { initReveal(); initTilt(); initModal(); initLightbox(); initCounters(); }
