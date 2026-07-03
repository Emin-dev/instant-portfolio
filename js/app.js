// app.js — tiny hash-router + view renderer wiring the form, preview, and sandbox checkout together.
import { getState, setState, subscribe, resetAll, emptyProject } from "./state.js";
import {
  validateIdentity,
  validateProjects,
  validateSkillEntry,
  validateContacts,
  hasAnyError,
} from "./validation.js";
import { generatePortfolioHTML } from "./generator.js";
import { validateCard, submitSandboxPayment, getPriceUSD } from "./checkout.js";

const root = document.getElementById("view-root");

const STEP_COUNT = 4; // identity, projects, skills, contacts

function navigate(route, patch) {
  setState({ route, ...(patch || {}) });
  window.scrollTo({ top: 0, behavior: "instant" in window.scrollTo ? "instant" : "auto" });
}

// ---------------------------------------------------------------------------
// Rendering dispatch
// ---------------------------------------------------------------------------
function render() {
  const s = getState();
  root.innerHTML = "";
  let view;
  switch (s.route) {
    case "form":
      view = renderForm(s);
      break;
    case "preview":
      view = renderPreview(s);
      break;
    case "checkout":
      view = renderCheckout(s);
      break;
    case "success":
      view = renderSuccess(s);
      break;
    default:
      view = renderLanding(s);
  }
  root.appendChild(view);
}

subscribe(render);

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------
function renderLanding() {
  const el = document.createElement("div");
  el.className = "view";
  el.innerHTML = `
    <div class="landing-hero">
      <h1>Your portfolio, built in about 3 minutes.</h1>
      <p>Answer a few short prompts about your work. We generate a clean, modern, mobile-first
      portfolio site instantly. Preview it for free — pay once only when you're ready to export it.</p>
      <div class="cta-row">
        <button class="btn btn-primary" id="cta-start">Start building &rarr;</button>
      </div>
    </div>
    <div class="feature-grid">
      <div class="feature-card">
        <span class="icon">&#9998;&#65039;</span>
        <h3>Guided, not overwhelming</h3>
        <p>One focused question at a time — name, projects, skills, contact links.</p>
      </div>
      <div class="feature-card">
        <span class="icon">&#128064;</span>
        <h3>See it before you pay</h3>
        <p>A real, live preview of your generated site renders instantly as you go.</p>
      </div>
      <div class="feature-card">
        <span class="icon">&#128274;</span>
        <h3>Pay once, own it</h3>
        <p>A single $${getPriceUSD()} export unlocks a downloadable HTML file — no subscription.</p>
      </div>
    </div>
  `;
  el.querySelector("#cta-start").addEventListener("click", () => {
    setState({ step: 0 });
    navigate("form");
  });
  return el;
}

// ---------------------------------------------------------------------------
// Form (multi-step)
// ---------------------------------------------------------------------------
function renderForm(s) {
  const el = document.createElement("div");
  el.className = "view";

  const shell = document.createElement("div");
  shell.className = "form-shell";

  // progress bar
  const progress = document.createElement("div");
  progress.className = "progress-track";
  for (let i = 0; i < STEP_COUNT; i++) {
    const seg = document.createElement("div");
    seg.className = "progress-seg" + (i < s.step ? " is-done" : i === s.step ? " is-active" : "");
    progress.appendChild(seg);
  }
  shell.appendChild(progress);

  const stepBody = document.createElement("div");
  stepBody.id = "step-body";
  shell.appendChild(stepBody);

  el.appendChild(shell);

  const steps = [renderStepIdentity, renderStepProjects, renderStepSkills, renderStepContacts];
  stepBody.appendChild(steps[s.step](s));

  return el;
}

function stepHeader(kicker, title, hint) {
  const wrap = document.createElement("div");
  wrap.className = "step-header";
  wrap.innerHTML = `
    <p class="step-kicker">${kicker}</p>
    <h2 class="step-title">${title}</h2>
    <p class="step-hint">${hint}</p>
  `;
  return wrap;
}

function stepNav({ backLabel, nextLabel, onBack, onNext }) {
  const nav = document.createElement("div");
  nav.className = "step-nav";
  nav.innerHTML = `
    <button type="button" class="btn btn-ghost" id="nav-back">${backLabel}</button>
    <div class="step-nav-right">
      <button type="button" class="btn btn-primary" id="nav-next">${nextLabel}</button>
    </div>
  `;
  nav.querySelector("#nav-back").addEventListener("click", onBack);
  nav.querySelector("#nav-next").addEventListener("click", onNext);
  return nav;
}

// --- Step 1: identity --------------------------------------------------------
function renderStepIdentity(s) {
  const wrap = document.createElement("div");
  wrap.appendChild(
    stepHeader("Step 1 of 4", "Let's start with you", "Your name, role, and a one-line tagline.")
  );

  const form = document.createElement("form");
  form.noValidate = true;
  form.innerHTML = `
    <div class="field" data-field="name">
      <label for="f-name">Full name</label>
      <input type="text" id="f-name" maxlength="60" placeholder="Ada Lovelace" value="${escAttr(s.name)}" autocomplete="name" />
      <p class="field-error"></p>
    </div>
    <div class="field" data-field="role">
      <label for="f-role">Role / title</label>
      <input type="text" id="f-role" maxlength="80" placeholder="Software Engineer" value="${escAttr(s.role)}" />
      <p class="field-error"></p>
    </div>
    <div class="field" data-field="tagline">
      <label for="f-tagline">Tagline <span class="optional-tag">(optional)</span></label>
      <textarea id="f-tagline" maxlength="160" placeholder="I build fast, accessible web apps.">${escText(s.tagline)}</textarea>
      <p class="char-count"><span id="tagline-count">${(s.tagline || "").length}</span>/160</p>
      <p class="field-error"></p>
    </div>
  `;
  wrap.appendChild(form);

  const taglineEl = form.querySelector("#f-tagline");
  taglineEl.addEventListener("input", () => {
    form.querySelector("#tagline-count").textContent = taglineEl.value.length;
  });

  wrap.appendChild(
    stepNav({
      backLabel: "Cancel",
      nextLabel: "Continue",
      onBack: () => navigate("landing"),
      onNext: () => {
        const data = {
          name: form.querySelector("#f-name").value,
          role: form.querySelector("#f-role").value,
          tagline: form.querySelector("#f-tagline").value,
        };
        const errors = validateIdentity(data);
        clearFieldErrors(form);
        if (hasAnyError(errors)) {
          applyFieldErrors(form, errors);
          return;
        }
        setState({ ...data, step: 1 });
      },
    })
  );

  return wrap;
}

// --- Step 2: projects ---------------------------------------------------------
function renderStepProjects(s) {
  const wrap = document.createElement("div");
  wrap.appendChild(
    stepHeader("Step 2 of 4", "Show your work", "Add 2–4 projects. Only a title is required per project.")
  );

  const generalError = document.createElement("p");
  generalError.className = "field-error";
  generalError.style.marginBottom = "12px";

  const list = document.createElement("div");
  list.id = "project-list";

  let projects = s.projects.length ? s.projects.map((p) => ({ ...p })) : [emptyProject()];

  function renderList() {
    list.innerHTML = "";
    projects.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "repeat-card";
      card.dataset.index = String(i);
      card.innerHTML = `
        <div class="repeat-card-head">
          <h4>Project ${i + 1}</h4>
          ${projects.length > 1 ? `<button type="button" class="remove-btn" data-remove="${i}">Remove</button>` : ""}
        </div>
        <div class="field" data-field="title">
          <label>Title</label>
          <input type="text" maxlength="80" data-k="title" value="${escAttr(p.title)}" placeholder="Analytical Engine Simulator" />
          <p class="field-error"></p>
        </div>
        <div class="field" data-field="description">
          <label>Description <span class="optional-tag">(optional)</span></label>
          <textarea maxlength="240" data-k="description" placeholder="What it does and what you built.">${escText(p.description)}</textarea>
          <p class="field-error"></p>
        </div>
        <div class="field" data-field="link">
          <label>Link <span class="optional-tag">(optional)</span></label>
          <input type="url" data-k="link" value="${escAttr(p.link)}" placeholder="https://example.com/project" />
          <p class="field-error"></p>
        </div>
        <div class="field" data-field="image">
          <label>Image URL <span class="optional-tag">(optional)</span></label>
          <input type="url" data-k="image" value="${escAttr(p.image)}" placeholder="https://example.com/screenshot.png" />
          <p class="field-error"></p>
        </div>
      `;
      card.querySelectorAll("[data-k]").forEach((input) => {
        input.addEventListener("input", () => {
          projects[i][input.dataset.k] = input.value;
        });
      });
      const removeBtn = card.querySelector("[data-remove]");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          projects.splice(i, 1);
          renderList();
        });
      }
      list.appendChild(card);
    });
  }
  renderList();
  wrap.appendChild(generalError);
  wrap.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-btn";
  addBtn.textContent = "+ Add another project";
  addBtn.addEventListener("click", () => {
    if (projects.length >= 4) return;
    projects.push(emptyProject());
    renderList();
    if (projects.length >= 4) addBtn.disabled = true;
  });
  if (projects.length >= 4) addBtn.disabled = true;
  wrap.appendChild(addBtn);

  wrap.appendChild(
    stepNav({
      backLabel: "Back",
      nextLabel: "Continue",
      onBack: () => {
        setState({ projects, step: 0 });
      },
      onNext: () => {
        const errors = validateProjects(projects);
        list.querySelectorAll(".repeat-card").forEach((card) => clearFieldErrors(card));
        generalError.textContent = "";
        generalError.style.display = "none";

        if (errors._general) {
          generalError.textContent = errors._general;
          generalError.style.display = "block";
        }
        let rowHasError = false;
        Object.keys(errors).forEach((key) => {
          if (key === "_general") return;
          rowHasError = true;
          const card = list.querySelector(`.repeat-card[data-index="${key}"]`);
          if (card) applyFieldErrors(card, errors[key]);
        });
        if (errors._general || rowHasError) return;

        setState({ projects, step: 2 });
      },
    })
  );

  return wrap;
}

// --- Step 3: skills -----------------------------------------------------------
function renderStepSkills(s) {
  const wrap = document.createElement("div");
  wrap.appendChild(
    stepHeader("Step 3 of 4", "What are you good at?", "Add skills one at a time. This step is fully optional.")
  );

  let skills = [...(s.skills || [])];

  const row = document.createElement("div");
  row.className = "skills-input-row";
  row.innerHTML = `
    <input type="text" id="skill-input" maxlength="30" placeholder="e.g. TypeScript" />
    <button type="button" class="btn btn-secondary" id="skill-add">Add</button>
  `;
  const errorEl = document.createElement("p");
  errorEl.className = "field-error";
  errorEl.style.marginBottom = "14px";

  const chips = document.createElement("div");
  chips.className = "skills-chips";

  function renderChips() {
    chips.innerHTML = "";
    skills.forEach((sk, i) => {
      const chip = document.createElement("span");
      chip.className = "skill-chip";
      chip.innerHTML = `${escText(sk)} <button type="button" data-i="${i}" aria-label="Remove ${escAttr(sk)}">&times;</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        skills.splice(i, 1);
        renderChips();
      });
      chips.appendChild(chip);
    });
  }
  renderChips();

  const input = row.querySelector("#skill-input");
  const addSkill = () => {
    const val = input.value.trim();
    const err = validateSkillEntry(val, skills);
    if (err) {
      errorEl.textContent = err;
      errorEl.style.display = "block";
      return;
    }
    errorEl.style.display = "none";
    skills.push(val);
    input.value = "";
    renderChips();
    input.focus();
  };
  row.querySelector("#skill-add").addEventListener("click", addSkill);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  });

  wrap.appendChild(row);
  wrap.appendChild(errorEl);
  wrap.appendChild(chips);

  wrap.appendChild(
    stepNav({
      backLabel: "Back",
      nextLabel: "Continue",
      onBack: () => setState({ skills, step: 1 }),
      onNext: () => setState({ skills, step: 3 }),
    })
  );

  return wrap;
}

// --- Step 4: contacts ----------------------------------------------------------
function renderStepContacts(s) {
  const wrap = document.createElement("div");
  wrap.appendChild(
    stepHeader("Step 4 of 4", "How can people reach you?", "Add contact links such as email, GitHub, or LinkedIn.")
  );

  let contacts = s.contacts && s.contacts.length ? s.contacts.map((c) => ({ ...c })) : [{ label: "Email", url: "" }];

  const list = document.createElement("div");

  function renderList() {
    list.innerHTML = "";
    contacts.forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "repeat-card";
      card.dataset.index = String(i);
      card.innerHTML = `
        <div class="repeat-card-head">
          <h4>Link ${i + 1}</h4>
          ${contacts.length > 1 ? `<button type="button" class="remove-btn" data-remove="${i}">Remove</button>` : ""}
        </div>
        <div class="field" data-field="label">
          <label>Label</label>
          <input type="text" maxlength="30" data-k="label" value="${escAttr(c.label)}" placeholder="Email" />
        </div>
        <div class="field" data-field="url">
          <label>URL <span class="optional-tag">(leave blank to skip)</span></label>
          <input type="url" data-k="url" value="${escAttr(c.url)}" placeholder="mailto:you@example.com" />
          <p class="field-error"></p>
        </div>
      `;
      card.querySelectorAll("[data-k]").forEach((input) => {
        input.addEventListener("input", () => {
          contacts[i][input.dataset.k] = input.value;
        });
      });
      const removeBtn = card.querySelector("[data-remove]");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          contacts.splice(i, 1);
          renderList();
        });
      }
      list.appendChild(card);
    });
  }
  renderList();
  wrap.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-btn";
  addBtn.textContent = "+ Add another link";
  addBtn.addEventListener("click", () => {
    if (contacts.length >= 5) return;
    contacts.push({ label: "", url: "" });
    renderList();
    if (contacts.length >= 5) addBtn.disabled = true;
  });
  wrap.appendChild(addBtn);

  wrap.appendChild(
    stepNav({
      backLabel: "Back",
      nextLabel: "Generate preview →",
      onBack: () => setState({ contacts, step: 2 }),
      onNext: () => {
        const errors = validateContacts(contacts);
        list.querySelectorAll(".repeat-card").forEach((card) => clearFieldErrors(card));
        let rowHasError = false;
        Object.keys(errors).forEach((key) => {
          rowHasError = true;
          const card = list.querySelector(`.repeat-card[data-index="${key}"]`);
          if (card) {
            const field = card.querySelector('[data-field="url"]');
            field.classList.add("has-error");
            field.querySelector(".field-error").textContent = errors[key];
          }
        });
        if (rowHasError) return;
        setState({ contacts, step: 3 });
        navigate("preview");
      },
    })
  );

  return wrap;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------
function renderPreview(s) {
  const el = document.createElement("div");
  el.className = "view preview-shell";

  const html = generatePortfolioHTML(s);

  el.innerHTML = `
    <div class="preview-toolbar">
      <div>
        <h2>Your live preview</h2>
        <p class="subtext">This is exactly what you'll get. Nothing hidden, nothing watermarked.</p>
      </div>
      <div class="viewport-toggle" role="group" aria-label="Preview viewport size">
        <button type="button" data-viewport="desktop" class="is-active">Desktop</button>
        <button type="button" data-viewport="mobile">Mobile</button>
      </div>
    </div>
    <div class="preview-frame-wrap viewport-desktop" id="frame-wrap">
      <iframe id="preview-iframe" title="Portfolio preview" sandbox="allow-same-origin"></iframe>
    </div>
    <div class="preview-actions">
      <div class="preview-actions-copy">
        <strong>Happy with it?</strong>
        <span>Export unlocks the downloadable HTML file for a one-time $${getPriceUSD()}.</span>
      </div>
      <div class="preview-actions-buttons">
        <button class="btn btn-secondary" id="btn-edit">Edit answers</button>
        <button class="btn btn-primary" id="btn-export">Export for $${getPriceUSD()}</button>
      </div>
    </div>
  `;

  const iframe = el.querySelector("#preview-iframe");
  iframe.srcdoc = html;

  const frameWrap = el.querySelector("#frame-wrap");
  el.querySelectorAll("[data-viewport]").forEach((btn) => {
    btn.addEventListener("click", () => {
      el.querySelectorAll("[data-viewport]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      frameWrap.className = "preview-frame-wrap viewport-" + btn.dataset.viewport;
    });
  });

  el.querySelector("#btn-edit").addEventListener("click", () => {
    setState({ step: 0 });
    navigate("form");
  });
  el.querySelector("#btn-export").addEventListener("click", () => {
    if (getState().hasPaid) {
      downloadPortfolio();
    } else {
      navigate("checkout");
    }
  });

  return el;
}

// ---------------------------------------------------------------------------
// Checkout (sandbox)
// ---------------------------------------------------------------------------
function renderCheckout(s) {
  const el = document.createElement("div");
  el.className = "view checkout-shell";

  el.innerHTML = `
    <div class="sandbox-banner">SANDBOX CHECKOUT &mdash; demo mode, no real charge will occur</div>
    <div class="checkout-card">
      <div class="checkout-price-row">
        <span class="label">One-time export</span>
        <span class="price">$${getPriceUSD()} <small>USD</small></span>
      </div>
      <form id="pay-form" novalidate>
        <div class="field" data-field="number">
          <label for="pay-number">Card number</label>
          <input type="text" id="pay-number" placeholder="4242 4242 4242 4242" inputmode="numeric" autocomplete="cc-number" />
          <p class="field-error"></p>
        </div>
        <div class="card-field-row">
          <div class="field" data-field="expiry">
            <label for="pay-expiry">Expiry</label>
            <input type="text" id="pay-expiry" placeholder="MM/YY" autocomplete="cc-exp" />
            <p class="field-error"></p>
          </div>
          <div class="field" data-field="cvc">
            <label for="pay-cvc">CVC</label>
            <input type="text" id="pay-cvc" placeholder="123" inputmode="numeric" autocomplete="cc-csc" />
            <p class="field-error"></p>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="pay-submit">Pay $${getPriceUSD()} (sandbox)</button>
        <p class="pay-status" id="pay-status"></p>
      </form>
      <p style="font-size:12.5px;color:var(--ip-text-dim);margin-top:14px;text-align:center;">
        Try test card <strong>4000 0000 0000 0002</strong> to see the decline path, or any other
        Luhn-valid number (e.g. 4242 4242 4242 4242) to see success.
      </p>
      <button type="button" class="btn btn-ghost btn-block" id="pay-back" style="margin-top:6px;">&larr; Back to preview</button>
    </div>
  `;

  el.querySelector("#pay-back").addEventListener("click", () => navigate("preview"));

  const form = el.querySelector("#pay-form");
  const statusEl = el.querySelector("#pay-status");
  const submitBtn = el.querySelector("#pay-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    statusEl.textContent = "";
    statusEl.className = "pay-status";

    const cardData = {
      number: form.querySelector("#pay-number").value,
      expiry: form.querySelector("#pay-expiry").value,
      cvc: form.querySelector("#pay-cvc").value,
    };
    const { valid, errors } = validateCard(cardData);
    if (!valid) {
      applyFieldErrors(form, errors);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing (sandbox)…";
    const result = await submitSandboxPayment(cardData);
    submitBtn.disabled = false;
    submitBtn.textContent = `Pay $${getPriceUSD()} (sandbox)`;

    if (result.ok) {
      statusEl.textContent = result.message;
      statusEl.classList.add("is-success");
      setState({ hasPaid: true });
      setTimeout(() => navigate("success", { paymentReference: result.reference }), 500);
    } else {
      statusEl.textContent = result.message;
      statusEl.classList.add("is-error");
    }
  });

  return el;
}

// ---------------------------------------------------------------------------
// Success + download
// ---------------------------------------------------------------------------
function renderSuccess(s) {
  const el = document.createElement("div");
  el.className = "view checkout-shell";
  el.innerHTML = `
    <div class="checkout-card" style="text-align:center;">
      <div class="success-check">&#10003;</div>
      <h2 style="margin:0 0 8px;">You're all set</h2>
      <p style="color:var(--ip-text-dim);font-size:14.5px;margin:0 0 24px;">
        Your export is unlocked. Download the standalone HTML file below &mdash; it's
        entirely self-contained (HTML + inline CSS), so you can host it anywhere.
      </p>
      <button class="btn btn-primary btn-block" id="btn-download">Download portfolio.html</button>
      <button class="btn btn-ghost btn-block" id="btn-restart" style="margin-top:10px;">Start a new portfolio</button>
    </div>
  `;
  el.querySelector("#btn-download").addEventListener("click", downloadPortfolio);
  el.querySelector("#btn-restart").addEventListener("click", () => {
    resetAll();
    navigate("landing");
  });
  return el;
}

function downloadPortfolio() {
  const s = getState();
  const html = generatePortfolioHTML(s);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filenameBase = (s.name || "portfolio").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "portfolio";
  a.href = url;
  a.download = `${filenameBase}-portfolio.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Small DOM/escaping helpers for the form (attribute/text safety in templates)
// ---------------------------------------------------------------------------
function escAttr(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escText(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clearFieldErrors(scope) {
  scope.querySelectorAll(".field").forEach((f) => {
    f.classList.remove("has-error");
    const err = f.querySelector(".field-error");
    if (err) err.textContent = "";
  });
}

function applyFieldErrors(scope, errors) {
  Object.keys(errors).forEach((key) => {
    const field = scope.querySelector(`[data-field="${key}"]`);
    if (!field) return;
    field.classList.add("has-error");
    const err = field.querySelector(".field-error");
    if (err) err.textContent = errors[key];
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
render();
