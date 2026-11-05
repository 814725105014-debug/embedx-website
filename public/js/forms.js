// EMBEDX — Form handling: validation, honeypot, rate limiting, Firestore writes, toasts.
import { submitApplication, submitContact, isConfigured } from "./store.js";
import { toast } from "./ui.js";

const RATE_KEY = "embedx_rate";
const RATE_MAX = 3;
const RATE_WINDOW = 10 * 60 * 1000;

function rateLimited(formId) {
  const now = Date.now();
  const log = JSON.parse(localStorage.getItem(RATE_KEY) || "{}");
  const hits = (log[formId] || []).filter((t) => now - t < RATE_WINDOW);
  if (hits.length >= RATE_MAX) return true;
  hits.push(now);
  log[formId] = hits;
  localStorage.setItem(RATE_KEY, JSON.stringify(log));
  return false;
}

function setErrors(form, errors) {
  let ok = true;
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));
  form.querySelectorAll(".error-msg").forEach((e) => (e.textContent = ""));
  for (const [name, msg] of Object.entries(errors)) {
    ok = false;
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) continue;
    const field = input.closest(".field");
    field?.classList.add("invalid");
    const slot = field?.querySelector(".error-msg");
    if (slot) slot.textContent = msg;
  }
  return ok;
}

const validators = {
  required: (v, label) => (v.trim() ? "" : `${label} is required.`),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email address."),
  phone: (v) => (/^[0-9+\-\s()]{8,15}$/.test(v.trim()) ? "" : "Enter a valid phone number."),
  max: (v, n) => (v.length <= n ? "" : `Keep this under ${n} characters.`)
};

function readForm(form) {
  const data = {};
  new FormData(form).forEach((v, k) => {
    if (data[k] === undefined) data[k] = v;
    else if (Array.isArray(data[k])) data[k].push(v);
    else data[k] = [data[k], v];
  });
  return data;
}

function wire(formId, { build, submit, successMsg, draftKey }) {
  const form = document.getElementById(formId);
  if (!form) return;

  if (draftKey && sessionStorage.getItem("embedx_join_submitted") !== "1") {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "{}");
      form.querySelectorAll("input,select,textarea").forEach((el) => {
        if (el.type === "checkbox") {
          el.checked = Array.isArray(draft[el.name]) ? draft[el.name].includes(el.value) : Boolean(draft[el.name]);
        } else if (draft[el.name] !== undefined) el.value = draft[el.name];
      });
    } catch { /* ignore corrupt draft */ }
    form.addEventListener("input", () => {
      const d = readForm(form);
      localStorage.setItem(draftKey, JSON.stringify(d));
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = readForm(form);

    // honeypot — bots fill this, humans never see it
    if (d.company_url) return;

    const errors = build.validate(d);
    if (!setErrors(form, errors)) { toast("Please fix the highlighted fields.", "err"); return; }

    if (rateLimited(formId)) {
      toast("Too many submissions from this device. Please try again in a few minutes.", "err");
      return;
    }

    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.innerHTML = "Sending…";
    try {
      await submit(build.payload(d));
      toast(successMsg, "ok");
      form.reset();
      if (draftKey) localStorage.removeItem(draftKey);
      if (formId === "joinForm") sessionStorage.setItem("embedx_join_submitted", "1");
    } catch (err) {
      console.error(err);
      toast(isConfigured
        ? "Submission failed. Please check your connection and retry."
        : "Backend not connected yet — your details are safe locally; forms activate once Firebase config is added.", "err");
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });
}

const req = (d, k, label, n = 120) => validators.required(d[k] || "", label) || validators.max(d[k] || "", n);

wire("joinForm", {
  draftKey: "embedx_join_draft",
  build: {
    validate: (d) => {
      const e = {};
      const checks = {
        full_name: req(d, "full_name", "Full name", 80),
        department: validators.required(d.department || "", "Department"),
        year: validators.required(d.year || "", "Year of study"),
        email: validators.required(d.email || "", "Email") || validators.email(d.email || ""),
        phone: validators.required(d.phone || "", "Phone number") || validators.phone(d.phone || ""),
        motivation: req(d, "motivation", "Motivation", 1000)
      };
      if (!d.interests || (Array.isArray(d.interests) ? !d.interests.length : true)) e.interests = "Pick at least one area of interest.";
      if (!d.agree) e.agree = "Please confirm your participation commitment.";
      for (const [k, v] of Object.entries(checks)) if (v) e[k] = v;
      return e;
    },
    payload: (d) => ({
      name: d.full_name.trim(),
      email: d.email.trim(),
      regNo: (d.regNo || "").trim(),
      department: d.department,
      year: d.year,
      interest: [].concat(d.interests || []).join(", "),
      message: `Phone: ${d.phone} | Skills: ${d.technical_skills || "—"} | Motivation: ${d.motivation} | Portfolio: ${d.portfolio || "—"}`,
      createdAt: new Date().toISOString()
    })
  },
  successMsg: "Application received! Our team will reach out after review. 🎉"
});

wire("contactForm", {
  build: {
    validate: (d) => {
      const e = {};
      const c = {
        name: req(d, "name", "Your name", 80),
        email: validators.required(d.email || "", "Email") || validators.email(d.email || ""),
        message: req(d, "message", "Message", 1000)
      };
      for (const [k, v] of Object.entries(c)) if (v) e[k] = v;
      return e;
    },
    payload: (d) => ({
      name: d.name.trim(),
      email: d.email.trim(),
      subject: (d.subject || "").trim() || "General inquiry",
      message: d.message.trim(),
      createdAt: new Date().toISOString()
    })
  },
  successMsg: "Message sent! The EMBEDX team will get back to you soon."
});

wire("registerForm", {
  build: {
    validate: (d) => {
      const e = {};
      const c = {
        name: req(d, "name", "Participant name", 80),
        institution: req(d, "institution", "Institution name", 120),
        dept_year: req(d, "dept_year", "Department & year", 120),
        email: validators.required(d.email || "", "Email") || validators.email(d.email || ""),
        mobile: validators.required(d.mobile || "", "Mobile number") || validators.phone(d.mobile || "")
      };
      if (!d.tracks || (Array.isArray(d.tracks) ? !d.tracks.length : true)) e.tracks = "Select at least one challenge track.";
      for (const [k, v] of Object.entries(c)) if (v) e[k] = v;
      return e;
    },
    payload: (d) => ({
      name: d.name.trim(),
      email: d.email.trim(),
      regNo: "",
      department: d.dept_year.trim(),
      year: "",
      interest: `EMBEDNOVA Registration: ${[].concat(d.tracks || []).join(", ")}`,
      message: `Institution: ${d.institution} | Mobile: ${d.mobile}`,
      createdAt: new Date().toISOString()
    })
  },
  successMsg: "Registration submitted! Watch your email for track schedules. 🏆"
});
