// Real unit-test-style verification for js/generator.js
// Run with: node test/generator.test.mjs
import assert from "node:assert/strict";
import { generatePortfolioHTML, escapeHTML, sanitizeURL } from "../js/generator.js";

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// --- Sample "good" form data -------------------------------------------------
const sample = {
  name: "Ada Lovelace",
  role: "Software Engineer",
  tagline: "I build analytical engines and write the first algorithms.",
  projects: [
    {
      title: "Analytical Engine Simulator",
      description: "A simulator for Babbage's analytical engine.",
      link: "https://example.com/engine",
      image: "https://example.com/engine.png",
    },
    {
      title: "Notes on the Engine",
      description: "Annotated translation with original algorithm notes.",
      link: "https://example.com/notes",
    },
  ],
  skills: ["Algorithms", "Mathematics", "Punch Cards"],
  contacts: [
    { label: "Email", url: "mailto:ada@example.com" },
    { label: "GitHub", url: "https://github.com/ada" },
  ],
};

check("generates a full HTML document with doctype and closing tags", () => {
  const html = generatePortfolioHTML(sample);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<\/html>\s*$/);
  assert.match(html, /<head>[\s\S]*<\/head>/);
  assert.match(html, /<body>[\s\S]*<\/body>/);
  // roughly balanced tags for key containers
  assert.equal((html.match(/<section /g) || []).length, (html.match(/<\/section>/g) || []).length);
  assert.equal((html.match(/<article /g) || []).length, (html.match(/<\/article>/g) || []).length);
});

check("includes name, role, tagline", () => {
  const html = generatePortfolioHTML(sample);
  assert.match(html, /Ada Lovelace/);
  assert.match(html, /Software Engineer/);
  assert.match(html, /I build analytical engines/);
});

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a regex that matches text as it will appear after HTML-escaping
// (so plain apostrophes/quotes in fixture text still match the escaped output).
function escapedTextRegex(str) {
  const escaped = escapeHTML(str);
  return new RegExp(escapeRegex(escaped));
}

check("includes every provided project title, description, and link", () => {
  const html = generatePortfolioHTML(sample);
  for (const p of sample.projects) {
    assert.match(html, escapedTextRegex(p.title));
    assert.match(html, escapedTextRegex(p.description));
    assert.match(html, new RegExp(escapeRegex(p.link)));
  }
});

check("includes every provided skill", () => {
  const html = generatePortfolioHTML(sample);
  for (const s of sample.skills) {
    assert.match(html, new RegExp(`>${s}<`));
  }
});

check("includes every provided contact link", () => {
  const html = generatePortfolioHTML(sample);
  for (const c of sample.contacts) {
    assert.match(html, new RegExp(escapeRegex(c.url)));
    assert.match(html, new RegExp(escapeRegex(c.label)));
  }
});

// --- XSS / escaping check ----------------------------------------------------
check("escapes HTML special characters in project title/description (XSS prevention)", () => {
  const malicious = {
    name: "Test <script>alert(1)</script> User",
    role: "Hacker & Tester",
    tagline: 'Breaking <b>things</b> since "day one"',
    projects: [
      {
        title: '<img src=x onerror=alert(1)> & "Quoted" <Title>',
        description: "Contains <script>alert('xss')</script> and & ampersands",
        link: "https://example.com/?a=1&b=2",
      },
    ],
    skills: ["<script>alert(1)</script>", "C++ & Java"],
    contacts: [{ label: '<b>Bold</b> & "Label"', url: "https://example.com/?x=1&y=2" }],
  };

  const html = generatePortfolioHTML(malicious);

  // The raw dangerous tags must never appear unescaped anywhere in the output.
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<script>alert\('xss'\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(html, /<b>Bold<\/b>/);
  assert.doesNotMatch(html, /<b>things<\/b>/);
  assert.doesNotMatch(html, /<Title>/);

  // The escaped versions must be present instead, proving text was rendered (not dropped).
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;b&gt;Bold&lt;\/b&gt;/);
  assert.match(html, /&amp;/); // ampersands escaped somewhere
  assert.match(html, /&quot;Quoted&quot;/);

  // Query-string ampersands in a legit URL are still escaped as &amp; in HTML attribute context
  assert.match(html, /https:\/\/example\.com\/\?a=1&amp;b=2/);
});

check("escapeHTML escapes all five special characters individually", () => {
  assert.equal(escapeHTML("<"), "&lt;");
  assert.equal(escapeHTML(">"), "&gt;");
  assert.equal(escapeHTML("&"), "&amp;");
  assert.equal(escapeHTML('"'), "&quot;");
  assert.equal(escapeHTML("'"), "&#39;");
  assert.equal(escapeHTML(null), "");
  assert.equal(escapeHTML(undefined), "");
});

check("sanitizeURL blocks javascript: and data: protocols", () => {
  assert.equal(sanitizeURL("javascript:alert(1)"), "");
  assert.equal(sanitizeURL("JAVASCRIPT:alert(1)"), "");
  assert.equal(sanitizeURL("data:text/html,<script>alert(1)</script>"), "");
  assert.equal(sanitizeURL("vbscript:msgbox(1)"), "");
  assert.equal(sanitizeURL("https://example.com"), "https://example.com");
  assert.equal(sanitizeURL("mailto:me@example.com"), "mailto:me@example.com");
});

// --- Omission of empty sections ---------------------------------------------
check("omits skills section entirely when no skills provided", () => {
  const data = { ...sample, skills: [] };
  const html = generatePortfolioHTML(data);
  assert.doesNotMatch(html, /skills-section/);
  assert.doesNotMatch(html, /id="skills-heading"/);
});

check("omits skills section when skills is undefined", () => {
  const data = { ...sample };
  delete data.skills;
  const html = generatePortfolioHTML(data);
  assert.doesNotMatch(html, /skills-section/);
});

check("omits skills section when skills contains only blank strings", () => {
  const data = { ...sample, skills: ["   ", ""] };
  const html = generatePortfolioHTML(data);
  assert.doesNotMatch(html, /skills-section/);
});

check("omits projects section entirely when no projects provided", () => {
  const data = { ...sample, projects: [] };
  const html = generatePortfolioHTML(data);
  assert.doesNotMatch(html, /projects-section/);
  assert.doesNotMatch(html, /id="projects-heading"/);
});

check("omits projects section when projects have no title", () => {
  const data = { ...sample, projects: [{ title: "", description: "x" }] };
  const html = generatePortfolioHTML(data);
  assert.doesNotMatch(html, /projects-section/);
});

check("omits contact section entirely when no contacts provided", () => {
  const data = { ...sample, contacts: [] };
  const html = generatePortfolioHTML(data);
  assert.doesNotMatch(html, /contact-section/);
  assert.doesNotMatch(html, /id="contact-heading"/);
});

check("omits role/tagline paragraphs when not provided, but still renders document", () => {
  const data = { name: "Solo Name", projects: [], skills: [], contacts: [] };
  const html = generatePortfolioHTML(data);
  assert.match(html, /Solo Name/);
  // CSS always defines .hero-role / .hero-tagline classes in <style>, so check the
  // actual rendered elements (opening tags), not mere substring presence.
  assert.doesNotMatch(html, /<p class="hero-role">/);
  assert.doesNotMatch(html, /<p class="hero-tagline">/);
  // still a valid document even with almost nothing filled in
  assert.match(html, /^<!DOCTYPE html>/);
});

check("renders placeholder media block for projects without an image (no broken <img>)", () => {
  const html = generatePortfolioHTML(sample);
  // second sample project has no image -> should get placeholder div, not an <img> with empty src
  assert.match(html, /project-media--placeholder/);
  assert.doesNotMatch(html, /<img src="" /);
});

console.log(`\n${passed} check group(s) passed.`);
if (process.exitCode) {
  console.error("\nSOME CHECKS FAILED");
  process.exit(1);
} else {
  console.log("\nALL CHECKS PASSED");
}
