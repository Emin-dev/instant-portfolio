# Instant Portfolio

A short guided form that generates a clean, accessible, mobile-first static
portfolio website — instantly, for free. Exporting the finished site as a
standalone HTML file is a one-time paid unlock.

**Live app:** https://emin-dev.github.io/instant-portfolio/

## What it does

1. A four-step guided form collects your name/role/tagline, 2–4 projects
   (title, description, link, optional image URL), a skills list, and contact
   links — one focused question at a time, with inline validation.
2. On finishing the form, you get a **real, live preview** of the generated
   portfolio site rendered in an iframe (with a desktop/mobile toggle) —
   exactly what you'd get, before paying anything.
3. Exporting the generated site as a downloadable `.html` file requires a
   one-time purchase (see Monetization below).

The generator (`js/generator.js`) is the actual product: a pure function
`generatePortfolioHTML(formData) -> htmlString` that produces a complete,
self-contained HTML document (inline CSS, no external requests, no build
step) with a restrained dark palette, real typography scale, and responsive
project grid. It:

- Escapes all user-provided text (name, role, tagline, project titles/
  descriptions, skill names, contact labels) to prevent HTML/script
  injection — verified with real XSS-style test inputs, not just eyeballed.
- Sanitizes URLs (project links, images, contact links), rejecting
  `javascript:`/`data:`/`vbscript:` pseudo-protocols.
- Omits entire sections (Projects / Skills / Contact) when no valid data was
  provided for them, rather than rendering empty headings.

## Monetization — BUY (one-time), sandbox only

- **Model:** BUY — a single one-time payment, no subscription.
- **Price:** $12 USD, paid once, unlocks the export/download for that
  session's portfolio.
- **What's free:** the entire guided form and the live preview are free,
  unlimited, and fully functional — you always see the real output before
  paying.
- **What's paid:** clicking "Export" while unpaid routes to a checkout view;
  after a successful sandbox payment, a "Download portfolio.html" button
  unlocks and produces the actual generated file via a client-side `Blob`
  download.
- **Sandbox status:** the checkout in `js/checkout.js` is a **fully simulated
  demo payment flow** — no real payment processor (Stripe, Gumroad, etal.) is
  integrated, and no money ever changes hands. It performs client-side Luhn/
  expiry/CVC format checks and a fake network delay, then resolves
  success/decline. A well-known test card number (`4000 0000 0000 0002`)
  always simulates a decline so the failure path is demonstrable, mirroring
  how real sandbox test cards work. The checkout view is labeled
  "SANDBOX CHECKOUT — demo mode, no real charge will occur."

## Tech

- Vanilla JS ES modules, no build step, no dependencies.
- `js/generator.js` — pure HTML-generation module (importable directly under
  Node for testing).
- `js/validation.js` — pure form-validation helpers.
- `js/checkout.js` — pure sandbox payment simulation (Luhn check, fake async
  charge).
- `js/state.js` — tiny state store + sessionStorage persistence.
- `js/app.js` — DOM rendering / router / event wiring for the multi-step form,
  preview, and checkout views.
- `css/app.css` — builder app chrome styling (separate from the portfolio
  template's own inline styles, which live inside `generator.js`).

## Tests

Run the real, assertion-based test suites directly with Node (no test
runner dependency needed — Node's `assert` + native ESM):

```bash
node test/generator.test.mjs
node test/validation.test.mjs
node test/checkout.test.mjs
```

All three suites assert genuine behavior: well-formed HTML output, presence
of every provided project/skill/link, proper escaping of HTML special
characters in user input (a real XSS-prevention check), correct omission of
empty sections, and correct sandbox payment validation/decline logic.

## Local development

```bash
node scripts/dev-server.mjs   # serves the app at http://localhost:8084
```

(`scripts/dev-server.mjs` is a local-only static file server, excluded from
git via `.gitignore` — it's a development convenience, not part of the
shipped product.)
