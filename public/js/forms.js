// EMBEDX — Form handling: validation, honeypot, rate limiting, Firestore writes, toasts.
import { submitApplication, submitContact, getFormDefinition, submitFormResponse, isConfigured } from "./store.js?v=20261106-forms";
import { toast } from "./ui.js?v=20261106";

const RATE_KEY = "embedx_rate";
const RATE_MAX = 3;
const RATE_WINDOW = 10 * 60 * 1000;

function storageGet(storageName, key, fallback = null) {
  try { return window[storageName].getItem(key) ?? fallback; } catch { return fallback; }
}
function storageSet(storageName, key, value) {
  try { window[storageName].setItem(key, value); return true; } catch { return false; }
}
function storageRemove(storageName, key) {
  try { window[storageName].removeItem(key); } catch { /* storage may be disabled */ }
}

function rateLimited(formId) {
  const now = Date.now();
  let log = {};
  try {
    const raw = storageGet("localStorage", RATE_KEY, "{}");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) log = parsed;
  } catch { /* a corrupt client-side limiter must not break form submission */ }
  const hits = (Array.isArray(log[formId]) ? log[formId] : []).filter((t) => Number.isFinite(t) && now - t < RATE_WINDOW);
  if (hits.length >= RATE_MAX) return true;
  hits.push(now);
  log[formId] = hits;
  storageSet("localStorage", RATE_KEY, JSON.stringify(log));
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
  email: (v) => (v.trim().length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email address (maximum 120 characters)."),
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

function wire(formId, { build, submit, successMsg, draftKey, formKey }) {
  const form = document.getElementById(formId);
  if (!form) return;
  let activeDefinition = null;
  if (formKey && isConfigured) getFormDefinition(formKey).then((definition) => {
    activeDefinition = definition;
    if (!definition) return;
    const titleTarget = document.getElementById(formKey === "join" ? "joinFormTitle" : formKey === "enquiry" ? "enquiryFormTitle" : "");
    const descriptionTarget = document.getElementById(formKey === "join" ? "joinFormDescription" : formKey === "enquiry" ? "enquiryFormDescription" : "");
    if (titleTarget && definition.title) titleTarget.textContent = definition.title;
    if (descriptionTarget && definition.description) descriptionTarget.textContent = definition.description;
    if (definition.status !== "open") {
      const notice = document.createElement("p");
      notice.className = "form-closed-notice";
      notice.setAttribute("role", "status");
      notice.textContent = "This form is currently closed and is not accepting responses.";
      form.prepend(notice);
      form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = true; });
    }
  }).catch((err) => console.warn("Could not read form availability", err));

  if (draftKey && storageGet("sessionStorage", "embedx_join_submitted") !== "1") {
    try {
      const draft = JSON.parse(storageGet("sessionStorage", draftKey, "{}"));
      form.querySelectorAll("input,select,textarea").forEach((el) => {
        if (el.type === "checkbox") {
          el.checked = Array.isArray(draft[el.name]) ? draft[el.name].includes(el.value) : Boolean(draft[el.name]);
        } else if (draft[el.name] !== undefined) el.value = draft[el.name];
      });
    } catch { /* ignore corrupt draft */ }
    form.addEventListener("input", () => {
      const d = readForm(form);
      storageSet("sessionStorage", draftKey, JSON.stringify(d));
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.dataset.sending === "1") return;
    const d = readForm(form);

    // honeypot — bots fill this, humans never see it
    if (d.company_url) return;

    const errors = build.validate(d);
    if (!setErrors(form, errors)) { toast("Please fix the highlighted fields.", "err"); return; }
    if (formKey && isConfigured) {
      try { activeDefinition = await getFormDefinition(formKey); }
      catch (err) { console.warn("Could not refresh form status; Firestore still validates a seeded form ID", err); }
      if (activeDefinition && activeDefinition.status !== "open") {
        toast("This form is closed and is no longer accepting responses.", "err");
        return;
      }
    }

    if (rateLimited(formId)) {
      toast("Too many submissions from this device. Please try again in a few minutes.", "err");
      return;
    }

    const btn = form.querySelector("[type=submit]");
    form.dataset.sending = "1";
    if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); }
    const label = btn?.innerHTML || "Submit";
    if (btn) btn.textContent = "Sending…";
    try {
      const payload = build.payload(d);
      if (formKey && !activeDefinition) delete payload.formId;
      await submit(payload);
      toast(successMsg, "ok");
      form.reset();
      if (draftKey) storageRemove("sessionStorage", draftKey);
      if (formId === "joinForm") storageSet("sessionStorage", "embedx_join_submitted", "1");
    } catch (err) {
      console.error(err);
      toast(isConfigured
        ? "Submission failed. Please check your connection and retry."
        : "This form is temporarily unavailable. Please try again later or contact the department.", "err");
    } finally {
      form.dataset.sending = "0";
      if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.innerHTML = label; }
    }
  });
}

const req = (d, k, label, n = 120) => validators.required(d[k] || "", label) || validators.max(d[k] || "", n);

wire("joinForm", {
  formKey: "join",
  draftKey: "embedx_join_draft",
  build: {
    validate: (d) => {
      const e = {};
      const checks = {
        full_name: req(d, "full_name", "Full name", 80),
        regNo: validators.max(d.regNo || "", 40),
        department: validators.required(d.department || "", "Department") || validators.max(d.department || "", 120),
        year: validators.required(d.year || "", "Year of study") || validators.max(d.year || "", 40),
        email: validators.required(d.email || "", "Email") || validators.email(d.email || ""),
        phone: validators.required(d.phone || "", "Phone number") || validators.phone(d.phone || ""),
        technical_skills: validators.max(d.technical_skills || "", 300),
        motivation: req(d, "motivation", "Motivation", 1000),
        portfolio: validators.max(d.portfolio || "", 300)
      };
      if (!d.interests || (Array.isArray(d.interests) ? !d.interests.length : true)) e.interests = "Pick at least one area of interest.";
      if (!d.agree) e.agree = "Please confirm your participation commitment.";
      for (const [k, v] of Object.entries(checks)) if (v) e[k] = v;
      return e;
    },
    payload: (d) => ({
      formId: "join",
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
  formKey: "enquiry",
  build: {
    validate: (d) => {
      const e = {};
      const c = {
        name: req(d, "name", "Your name", 80),
        email: validators.required(d.email || "", "Email") || validators.email(d.email || ""),
        subject: validators.max(d.subject || "", 160),
        message: req(d, "message", "Message", 2000)
      };
      for (const [k, v] of Object.entries(c)) if (v) e[k] = v;
      return e;
    },
    payload: (d) => ({
      formId: "enquiry",
      name: d.name.trim(),
      email: d.email.trim(),
      subject: (d.subject || "").trim() || "General inquiry",
      message: d.message.trim(),
      createdAt: new Date().toISOString()
    })
  },
  successMsg: "Message sent! The EMBEDX team will get back to you soon."
});

function renderPublicField(field) {
  const wrapper = document.createElement(field.type === "checkboxes" || field.type === "stars" ? "fieldset" : "div");
  wrapper.className = "field";
  if (field.type === "checkboxes" || field.type === "stars") {
    wrapper.classList.add("full", field.type === "stars" ? "public-rating-field" : "public-checks-field");
    wrapper.setAttribute("aria-required", String(!!field.required));
  }
  const label = document.createElement(field.type === "checkboxes" || field.type === "stars" ? "legend" : "label");
  label.textContent = `${field.label || "Question"}${field.required ? " *" : ""}`;
  wrapper.appendChild(label);
  if (field.type === "stars") {
    const rating = document.createElement("div"); rating.className = "star-rating"; rating.setAttribute("role", "radiogroup"); rating.setAttribute("aria-label", field.label || "Star rating");
    const hint = document.createElement("span"); hint.className = "rating-guidance"; hint.id = `rating-help-${field.key}`; hint.textContent = "Choose 1–5 stars"; rating.setAttribute("aria-describedby", hint.id);
    const options = [];
    const paintRating = (value) => options.forEach((option) => option.classList.toggle("is-filled", Number(option.dataset.value) <= Number(value || 0)));
    for (let value = 1; value <= 5; value++) {
      const option = document.createElement("label"); option.className = "star-rating-option"; option.dataset.value = String(value); option.title = `${value} star${value === 1 ? "" : "s"}`;
      const input = document.createElement("input"); input.type = "radio"; input.name = field.key; input.value = String(value); input.required = !!field.required && value === 1; input.setAttribute("aria-label", option.title);
      const visual = document.createElement("span"); visual.textContent = "★"; visual.setAttribute("aria-hidden", "true");
      const sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = option.title;
      option.append(input, visual, sr); rating.appendChild(option); options.push(option);
    }
    rating.addEventListener("change", (event) => {
      if (event.target.matches("input[type=radio]")) { paintRating(event.target.value); hint.textContent = `${event.target.value} out of 5`; }
    });
    rating.addEventListener("pointerover", (event) => {
      const option = event.target.closest(".star-rating-option");
      if (option) { paintRating(option.dataset.value); hint.textContent = `${option.dataset.value} out of 5`; }
    });
    rating.addEventListener("pointerleave", () => {
      const selected = rating.querySelector("input:checked"); paintRating(selected?.value); hint.textContent = selected ? `${selected.value} out of 5` : "Choose 1–5 stars";
    });
    rating.addEventListener("focusin", (event) => {
      const option = event.target.closest(".star-rating-option");
      if (option) { paintRating(option.dataset.value); hint.textContent = `${option.dataset.value} out of 5`; }
    });
    rating.addEventListener("focusout", (event) => {
      if (rating.contains(event.relatedTarget)) return;
      const selected = rating.querySelector("input:checked"); paintRating(selected?.value); hint.textContent = selected ? `${selected.value} out of 5` : "Choose 1–5 stars";
    });
    const control = document.createElement("div"); control.className = "star-rating-control"; control.append(rating, hint); wrapper.appendChild(control);
  } else if (field.type === "checkboxes") {
    const choices = document.createElement("div"); choices.className = "checks";
    (field.options || []).forEach((choice, index) => {
      const choiceLabel = document.createElement("label"); choiceLabel.className = "check-row";
      const input = document.createElement("input"); input.type = "checkbox"; input.name = field.key; input.value = String(choice).slice(0, 160);
      choiceLabel.append(input, document.createTextNode(` ${choice}`)); choices.appendChild(choiceLabel);
    });
    wrapper.appendChild(choices);
  } else {
    let input;
    if (field.type === "textarea") { input = document.createElement("textarea"); input.maxLength = 2000; }
    else if (field.type === "select") {
      input = document.createElement("select");
      const blank = document.createElement("option"); blank.value = ""; blank.textContent = "Select an option"; input.appendChild(blank);
      (field.options || []).forEach((choice) => { const option = document.createElement("option"); option.value = String(choice); option.textContent = String(choice); input.appendChild(option); });
    } else {
      input = document.createElement("input"); input.type = ["text", "email", "tel", "url", "date"].includes(field.type) ? field.type : "text"; input.maxLength = field.type === "email" ? 120 : 500;
    }
    input.name = field.key; input.required = !!field.required; input.autocomplete = field.type === "email" ? "email" : "off";
    wrapper.appendChild(input);
  }
  return wrapper;
}

async function mountPublicForm() {
  const mount = document.getElementById("publicFormMount");
  if (!mount) return;
  const query = new URLSearchParams(location.search);
  const formId = query.get("form") || mount.dataset.formKey || "";
  const eventId = query.get("event") || "";
  const eventTitle = (query.get("eventTitle") || "").trim().slice(0, 100);
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(formId) || (eventId && !/^[A-Za-z0-9_-]{1,120}$/.test(eventId))) { mount.textContent = "This form link is invalid."; return; }
  mount.innerHTML = `<p class="muted">Loading form…</p>`;
  try {
    const definition = await getFormDefinition(formId);
    if (!definition) { mount.innerHTML = `<div class="card"><h2>Form unavailable</h2><p class="muted">This form may have been removed or is not published.</p></div>`; return; }
    document.title = `${eventTitle ? `${eventTitle} — ` : ""}${definition.title || "Form"} | EMBEDX`;
    if (definition.status !== "open") {
      const closed = document.createElement("div"); closed.className = "card form-closed-notice";
      const heading = document.createElement("h2"); heading.textContent = "This form is closed";
      const message = document.createElement("p"); message.className = "muted"; message.textContent = `${eventTitle ? `Registration for ${eventTitle} is currently closed. ` : "The response period has ended. "}Contact EMBEDX if you need assistance.`;
      closed.append(heading, message);
      if (eventId) { const back = document.createElement("a"); back.className = "btn btn-ghost"; back.href = `/pages/event-detail.html?id=${encodeURIComponent(eventId)}`; back.textContent = "Back to event"; closed.appendChild(back); }
      mount.replaceChildren(closed); return;
    }
    const fields = Array.isArray(definition.fields) ? definition.fields.slice(0, 25).filter((field) => field && /^[a-z0-9_]{1,60}$/i.test(field.key || "") && field.label) : [];
    if (!fields.length) { mount.innerHTML = `<div class="card"><h2>Form is not ready</h2><p class="muted">The administrator has not published any questions yet.</p></div>`; return; }
    const card = document.createElement("section"); card.className = "card public-custom-form";
    const title = document.createElement("h2"); title.textContent = definition.title || "EMBEDX Form";
    const description = document.createElement("p"); description.className = "muted"; description.textContent = definition.description || "";
    const form = document.createElement("form"); form.id = "dynamicPublicForm"; form.noValidate = true;
    const grid = document.createElement("div"); grid.className = "form-grid";
    fields.forEach((field) => grid.appendChild(renderPublicField(field)));
    const honey = document.createElement("div"); honey.className = "hp-field"; honey.setAttribute("aria-hidden", "true");
    const honeyLabel = document.createElement("label"); honeyLabel.textContent = "Leave this field empty";
    const honeyInput = document.createElement("input"); honeyInput.name = "company_url"; honeyInput.tabIndex = -1; honeyInput.autocomplete = "off";
    honey.append(honeyLabel, honeyInput);
    const submitWrap = document.createElement("div"); submitWrap.className = "full";
    const submitButton = document.createElement("button"); submitButton.type = "submit"; submitButton.className = "btn btn-primary"; submitButton.textContent = "Submit response";
    submitWrap.appendChild(submitButton); grid.append(honey, submitWrap); form.appendChild(grid); card.append(title, description);
    if (eventTitle) { const context = document.createElement("p"); context.className = "event-form-context"; context.textContent = `Registration for ${eventTitle}`; card.appendChild(context); }
    card.appendChild(form); mount.replaceChildren(card);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.sending === "1") return;
      if (honeyInput.value) return;
      fields.filter((field) => field.type === "checkboxes" && field.required).forEach((field) => {
        const inputs = [...form.querySelectorAll(`[name="${CSS.escape(field.key)}"]`)];
        if (inputs[0]) inputs[0].setCustomValidity(inputs.some((input) => input.checked) ? "" : "Select at least one option.");
      });
      if (!form.reportValidity()) { toast("Please complete the required fields.", "err"); return; }
      fields.filter((field) => field.type === "checkboxes").forEach((field) => form.querySelector(`[name="${CSS.escape(field.key)}"]`)?.setCustomValidity(""));
      const answers = {};
      fields.forEach((field) => {
        const selected = [...form.querySelectorAll(`[name="${CSS.escape(field.key)}"]`)];
        if (field.type === "checkboxes") answers[field.key] = selected.filter((el) => el.checked).map((el) => el.value);
        else if (field.type === "stars") answers[field.key] = Number(selected.find((el) => el.checked)?.value || 0);
        else answers[field.key] = (new FormData(form).get(field.key) || "").toString().trim().slice(0, field.type === "textarea" ? 2000 : 500);
      });
      if (eventId) { answers._eventId = eventId; if (eventTitle) answers._eventTitle = eventTitle; }
      if (rateLimited(`custom-${formId}`)) { toast("Too many submissions from this device. Please try again later.", "err"); return; }
      form.dataset.sending = "1"; submitButton.disabled = true; submitButton.textContent = "Submitting…";
      try {
        const responseTitle = `${eventTitle ? `${eventTitle} — ` : ""}${definition.title || "Form"}`.slice(0, 160);
        await submitFormResponse({ formId, formTitle: responseTitle, answers, submittedAt: new Date().toISOString() });
        toast("Your response was received. Thank you!", "ok");
        const success = document.createElement("div"); success.className = "success-state";
        const icon = document.createElement("span"); icon.className = "success-icon"; icon.setAttribute("aria-hidden", "true"); icon.textContent = "✓";
        const heading = document.createElement("h2"); heading.textContent = "Response received";
        const message = document.createElement("p"); message.className = "muted"; message.textContent = eventTitle ? `Your response for ${eventTitle} was received. Thank you!` : "Thank you for sharing your response with EMBEDX.";
        success.append(icon, heading, message);
        if (eventId) { const back = document.createElement("a"); back.className = "btn btn-ghost"; back.href = `/pages/event-detail.html?id=${encodeURIComponent(eventId)}`; back.textContent = "Back to event"; success.appendChild(back); }
        card.replaceChildren(success);
      } catch (err) { console.error(err); toast("We could not submit your response. Please retry or contact EMBEDX.", "err"); submitButton.disabled = false; submitButton.textContent = "Submit response"; }
      finally { form.dataset.sending = "0"; }
    });
  } catch (err) { console.error("Public form load failed", err); mount.innerHTML = `<div class="card"><h2>Form could not load</h2><p class="muted">Check your connection and try again later.</p></div>`; }
}

mountPublicForm();
