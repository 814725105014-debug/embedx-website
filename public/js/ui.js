// EMBEDX — Micro-interactions: scroll reveal, tilt, spotlight, toasts, modal, lightbox, counters.
import { icon } from "./icons.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initReveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("revealed"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el, i) => { el.style.setProperty("--d", `${Math.min(i % 6, 5) * 0.07}s`); io.observe(el); });
}

export function initTilt() {
  if (reduced) return;
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
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === "err" ? "alert" : type === "ok" ? "check" : "sparkles")}<span>${message}</span>`;
  region.append(el);
  setTimeout(() => { el.classList.add("hide"); setTimeout(() => el.remove(), 350); }, 4200);
}

export function initModal() {
  document.querySelectorAll("[data-modal-open]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const m = document.querySelector(btn.dataset.modalOpen);
      if (m) { m.classList.add("open"); m.querySelector("input,select,textarea,button")?.focus(); document.body.style.overflow = "hidden"; }
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach((bd) => {
    const close = () => { bd.classList.remove("open"); document.body.style.overflow = ""; };
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    bd.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", close));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && bd.classList.contains("open")) close(); });
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
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = target + suffix; return; }
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
