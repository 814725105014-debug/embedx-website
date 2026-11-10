// EMBEDX — Form handling: validation, honeypot, rate limiting, Firestore writes, toasts.
import { submitApplication, submitContact, getFormDefinition, submitFormResponse, isConfigured } from "./store.js?v=20261107-form-fix";
import { toast } from "./ui.js?v=20261107-admin-controls";
import { forms as bundledForms } from "./data/forms.js?v=20261108-editable-forms";

const RATE_KEY = "embedx_rate";
const RATE_MAX = 3;
const RATE_WINDOW = 10 * 60 * 1000;
const FORM_STATUS_TIMEOUT_MS = 8_000;

function getFormDefinitionWithin(formKey) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("Form status check timed out."), { code: "deadline-exceeded" })), FORM_STATUS_TIMEOUT_MS);
  });
  return Promise.race([getFormDefinition(formKey), timeout]).finally(() => clearTimeout(timer));
}

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
  min: (v, n, label) => (v.trim().length >= n ? "" : `${label} must be at least ${n} characters.`),
  email: (v) => (v.trim().length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email address (maximum 120 characters)."),
  phone: (v) => (/^[0-9+\-\s()]{8,15}$/.test(v.trim()) ? "" : "Enter a valid phone number."),
  max: (v, n) => (v.length <= n ? "" : `Keep this under ${n} characters.`)
};

function submissionFailureMessage(error) {
  const code = String(error?.code || "").replace("firestore/", "");
  if (!isConfigured) return "This form is temporarily unavailable. Please try again later or contact the department.";
  if (code === "permission-denied") return "The form service rejected this submission. Please contact the department and include the time of your attempt.";
  if (["unavailable", "deadline-exceeded", "network-request-failed", "cancelled"].includes(code)) return "Could not reach the form service. Check your connection and try again.";
  if (code === "resource-exhausted") return "The form service is temporarily busy. Please wait a few minutes and retry.";
  if (code === "invalid-argument") return "Some submission details were not accepted. Please review the fields and try again.";
  return "Submission could not be completed. Please retry, or contact the department if this continues.";
}

function readForm(form) {
  const data = {};
  new FormData(form).forEach((v, k) => {
    if (data[k] === undefined) data[k] = v;
    else if (Array.isArray(data[k])) data[k].push(v);
    else data[k] = [data[k], v];
  });
  return data;
}

function renderBuiltinFields(form, definition) {
  const grid = form.querySelector(".form-grid");
  if (!grid || !Array.isArray(definition?.fields)) return;
  const previous = readForm(form);
  const honey = grid.querySelector(".hp-field");
  const submitButton = form.querySelector("[type=submit]");
  const submitWrap = submitButton?.parentElement;
  grid.replaceChildren();
  definition.fields.slice(0, 25).forEach((field) => grid.appendChild(renderPublicField(field)));
  form.querySelectorAll("input,select,textarea").forEach((control) => {
    if (!control.name || control.name === "company_url" || previous[control.name] === undefined) return;
    const value = previous[control.name];
    if (control.type === "checkbox") control.checked = Array.isArray(value) ? value.includes(control.value) : Boolean(value);
    else if (control.type === "radio") control.checked = String(value) === control.value;
    else if (!Array.isArray(value)) control.value = value;
  });
  if (honey) grid.appendChild(honey);
  if (submitWrap) grid.appendChild(submitWrap);
}

function validateDefinitionFields(form, fields = []) {
  const errors = {};
  for (const field of fields.slice(0, 25)) {
    const controls = [...form.querySelectorAll(`[name="${CSS.escape(field.key)}"]`)];
    const label = field.label || "This field";
    const value = controls[0]?.type === "checkbox" && field.type === "checkbox"
      ? controls[0].checked
      : field.type === "checkboxes" ? controls.filter((control) => control.checked).map((control) => control.value)
        : field.type === "stars" ? controls.find((control) => control.checked)?.value || ""
          : String(controls[0]?.value || "").trim();
    if (field.required && (field.type === "checkboxes" ? !value.length : field.type === "checkbox" ? !value : !String(value).trim())) {
      errors[field.key] = field.type === "checkboxes" ? "Select at least one option." : field.type === "checkbox" ? "Please check this box." : `${label} is required.`;
      continue;
    }
    if (!value || (Array.isArray(value) && !value.length) || field.type === "checkbox") continue;
    const text = Array.isArray(value) ? value.join(", ") : String(value);
    const max = field.type === "email" ? 120 : field.type === "textarea" ? 2000 : field.type === "url" ? 300 : field.type === "tel" ? 40 : 500;
    if (text.length > max) { errors[field.key] = `${label} must be ${max} characters or fewer.`; continue; }
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) { errors[field.key] = "Enter a valid email address."; continue; }
    if (field.type === "tel" && !/^[0-9+\-\s()]{8,20}$/.test(text)) { errors[field.key] = "Enter a valid phone number."; continue; }
    if (field.type === "url") {
      try { const url = new URL(text); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
      catch { errors[field.key] = "Enter a valid HTTPS or HTTP link."; continue; }
    }
    if (field.type === "stars" && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5)) errors[field.key] = "Choose a rating from 1 to 5.";
  }
  return errors;
}

function answersFromForm(form, fields) {
  const answers = {};
  for (const field of fields.slice(0, 25)) {
    const controls = [...form.querySelectorAll(`[name="${CSS.escape(field.key)}"]`)];
    if (field.type === "checkboxes") answers[field.key] = controls.filter((control) => control.checked).map((control) => control.value);
    else if (field.type === "checkbox") answers[field.key] = !!controls[0]?.checked;
    else if (field.type === "stars") answers[field.key] = Number(controls.find((control) => control.checked)?.value || 0);
    else answers[field.key] = String(controls[0]?.value || "").trim().slice(0, field.type === "textarea" ? 2000 : 500);
  }
  return answers;
}

function wire(formId, { build, successMsg, draftKey, formKey }) {
  const form = document.getElementById(formId);
  if (!form) return;
  const fallbackDefinition = bundledForms.find((item) => item.id === formKey) || null;
  let activeDefinition = fallbackDefinition;
  let remoteDefinitionKnown = false;
  let hasRemoteDefinition = false;
  let formClosed = false;
  const applyDefinition = (definition) => {
    if (!definition) return;
    activeDefinition = definition;
    renderBuiltinFields(form, definition);
    const titleTarget = document.getElementById(formKey === "join" ? "joinFormTitle" : "enquiryFormTitle");
    const descriptionTarget = document.getElementById(formKey === "join" ? "joinFormDescription" : "enquiryFormDescription");
    if (titleTarget && definition.title) titleTarget.textContent = definition.title;
    if (descriptionTarget && definition.description) descriptionTarget.textContent = definition.description;
    if (definition.status !== "open") {
      formClosed = true;
      const notice = document.createElement("p");
      notice.className = "form-closed-notice";
      notice.setAttribute("role", "status");
      notice.textContent = "This form is currently closed and is not accepting responses.";
      if (!form.querySelector(".form-closed-notice")) form.prepend(notice);
      form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = true; });
    } else {
      formClosed = false;
      form.querySelector(".form-closed-notice")?.remove();
      form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = false; });
    }
  };
  if (formKey && fallbackDefinition) applyDefinition(fallbackDefinition);
  if (formKey && isConfigured) getFormDefinitionWithin(formKey).then((definition) => {
    remoteDefinitionKnown = true;
    hasRemoteDefinition = !!definition;
    if (definition) applyDefinition(definition);
  }).catch((err) => console.warn("Could not read form availability; submit will retry the status check", err));

  if (draftKey && storageGet("sessionStorage", "embedx_join_submitted") !== "1") {
    try {
      const draft = JSON.parse(storageGet("sessionStorage", draftKey, "{}"));
      form.querySelectorAll("input,select,textarea").forEach((el) => {
        if (el.type === "checkbox") el.checked = Array.isArray(draft[el.name]) ? draft[el.name].includes(el.value) : Boolean(draft[el.name]);
        else if (draft[el.name] !== undefined && !Array.isArray(draft[el.name])) el.value = draft[el.name];
      });
    } catch { /* ignore corrupt draft */ }
    form.addEventListener("input", () => storageSet("sessionStorage", draftKey, JSON.stringify(readForm(form))));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.dataset.sending === "1" || formClosed) return;
    if (readForm(form).company_url) return;

    // Lock before asynchronous status checks to prevent duplicate submissions.
    form.dataset.sending = "1";
    const btn = form.querySelector("[type=submit]");
    const label = btn?.innerHTML || "Submit";
    if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Checking form…"; }
    let status = form.querySelector("[data-form-status]");
    if (!status) {
      status = document.createElement("p"); status.dataset.formStatus = "";
      status.className = "form-submit-status"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); form.append(status);
    }
    status.textContent = "";
    try {
      if (formKey && isConfigured) {
        try {
          const latest = await getFormDefinitionWithin(formKey);
          remoteDefinitionKnown = true;
          hasRemoteDefinition = !!latest;
          if (latest) applyDefinition(latest);
        } catch (err) {
          if (!remoteDefinitionKnown) throw err;
          console.warn("Using the last loaded form definition after a status refresh failed", err);
        }
        if (hasRemoteDefinition && activeDefinition?.status !== "open") {
          formClosed = true;
          status.textContent = "This form is closed and is no longer accepting responses.";
          form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = true; });
          toast(status.textContent, "err");
          return;
        }
      }

      const data = readForm(form);
      const errors = formKey ? validateDefinitionFields(form, activeDefinition?.fields || []) : build.validate(data);
      if (!setErrors(form, errors)) { status.textContent = "Please fix the highlighted fields."; toast(status.textContent, "err"); return; }
      if (rateLimited(formId)) {
        status.textContent = "Too many submissions from this device. Please try again in a few minutes.";
        toast(status.textContent, "err");
        return;
      }

      if (btn) btn.textContent = "Sending…";
      if (formKey && hasRemoteDefinition) {
        const answers = answersFromForm(form, activeDefinition.fields || []);
        await submitFormResponse({ formId: formKey, formTitle: String(activeDefinition.title || formKey).slice(0, 160), answers, submittedAt: new Date().toISOString() });
      } else {
        const payload = build.payload(data);
        // A missing built-in definition uses the legacy, schema-validated collection path.
        if (formKey && !hasRemoteDefinition) delete payload.formId;
        await (formKey === "join" ? submitApplication(payload) : submitContact(payload));
      }
      status.textContent = successMsg;
      toast(successMsg, "ok");
      form.reset();
      if (draftKey) storageRemove("sessionStorage", draftKey);
      if (formId === "joinForm") storageSet("sessionStorage", "embedx_join_submitted", "1");
    } catch (err) {
      console.error("Public form submission failed", { code: err?.code || "unknown", message: err?.message || String(err) });
      const message = submissionFailureMessage(err);
      const errorCode = String(err?.code || "").replace(/^firestore\//, "");
      status.textContent = errorCode ? `${message} (Reference: ${errorCode})` : message;
      toast(message, "err");
    } finally {
      form.dataset.sending = "0";
      if (btn) { btn.disabled = formClosed; btn.removeAttribute("aria-busy"); btn.innerHTML = label; }
    }
  });
}

const req = (d, k, label, n = 120) => validators.required(d[k] || "", label) || validators.max(d[k] || "", n);

function initializeBuiltinForms() {
wire("joinForm", {
  formKey: "join",
  draftKey: "embedx_join_draft",
  build: {
    validate: (d) => {
      const e = {};
      const checks = {
        full_name: validators.required(d.full_name || "", "Full name") || validators.min(d.full_name || "", 2, "Full name") || validators.max(d.full_name || "", 80),
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
        name: validators.required(d.name || "", "Your name") || validators.min(d.name || "", 2, "Your name") || validators.max(d.name || "", 80),
        email: validators.required(d.email || "", "Email") || validators.email(d.email || ""),
        subject: validators.max(d.subject || "", 160),
        message: validators.required(d.message || "", "Message") || validators.min(d.message || "", 3, "Message") || validators.max(d.message || "", 2000)
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
}

function renderPublicField(field) {
  const wrapper = document.createElement(field.type === "checkboxes" || field.type === "stars" ? "fieldset" : "div");
  wrapper.className = "field";
  if (["checkboxes", "stars", "textarea", "checkbox"].includes(field.type)) wrapper.classList.add("full");
  if (field.type === "checkboxes" || field.type === "stars") {
    wrapper.classList.add(field.type === "stars" ? "public-rating-field" : "public-checks-field");
    wrapper.setAttribute("aria-required", String(!!field.required));
  }
  const label = document.createElement(field.type === "checkboxes" || field.type === "stars" ? "legend" : field.type === "checkbox" ? "span" : "label");
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
  } else if (field.type === "checkbox") {
    const row = document.createElement("label"); row.className = "check-row";
    const input = document.createElement("input"); input.type = "checkbox"; input.name = field.key; input.value = "true"; input.required = !!field.required;
    row.append(input, document.createTextNode(` ${field.label || "Question"}${field.required ? " *" : ""}`));
    wrapper.replaceChildren(row);
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
  const error = document.createElement("span"); error.className = "error-msg"; wrapper.appendChild(error);
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
    submitWrap.appendChild(submitButton); grid.append(honey, submitWrap); form.appendChild(grid);
    const submitStatus = document.createElement("p"); submitStatus.dataset.formStatus = ""; submitStatus.className = "form-submit-status"; submitStatus.setAttribute("role", "status"); submitStatus.setAttribute("aria-live", "polite"); form.appendChild(submitStatus);
    card.append(title, description);
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
        else if (field.type === "checkbox") answers[field.key] = !!selected[0]?.checked;
        else if (field.type === "stars") answers[field.key] = Number(selected.find((el) => el.checked)?.value || 0);
        else answers[field.key] = (new FormData(form).get(field.key) || "").toString().trim().slice(0, field.type === "textarea" ? 2000 : 500);
      });
      if (eventId) { answers._eventId = eventId; if (eventTitle) answers._eventTitle = eventTitle; }
      if (rateLimited(`custom-${formId}`)) { toast("Too many submissions from this device. Please try again later.", "err"); return; }
      form.dataset.sending = "1"; submitButton.disabled = true; submitButton.textContent = "Submitting…"; submitStatus.textContent = "";
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
      } catch (err) {
        console.error("Custom public form submission failed", { code: err?.code || "unknown", message: err?.message || String(err) });
        const message = submissionFailureMessage(err); submitStatus.textContent = message; toast(message, "err");
        submitButton.disabled = false; submitButton.textContent = "Submit response";
      }
      finally { form.dataset.sending = "0"; }
    });
  } catch (err) { console.error("Public form load failed", err); mount.innerHTML = `<div class="card"><h2>Form could not load</h2><p class="muted">Check your connection and try again later.</p></div>`; }
}

export function initializeForms() {
  initializeBuiltinForms();
  mountPublicForm();
}
