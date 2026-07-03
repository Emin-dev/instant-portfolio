// Real verification for js/validation.js
import assert from "node:assert/strict";
import {
  isBlank,
  isValidURL,
  validateIdentity,
  validateProjects,
  validateSkillEntry,
  validateContacts,
  hasAnyError,
} from "../js/validation.js";

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

check("isBlank detects empty/whitespace-only strings", () => {
  assert.equal(isBlank(""), true);
  assert.equal(isBlank("   "), true);
  assert.equal(isBlank(null), true);
  assert.equal(isBlank(undefined), true);
  assert.equal(isBlank("x"), false);
});

check("isValidURL accepts http(s)/mailto/tel, rejects garbage and javascript:", () => {
  assert.equal(isValidURL("https://example.com"), true);
  assert.equal(isValidURL("http://example.com"), true);
  assert.equal(isValidURL("mailto:a@b.com"), true);
  assert.equal(isValidURL("tel:+15551234567"), true);
  assert.equal(isValidURL("not a url"), false);
  assert.equal(isValidURL("javascript:alert(1)"), false);
  assert.equal(isValidURL(""), false);
});

check("validateIdentity requires name and role, allows missing tagline", () => {
  const errs = validateIdentity({ name: "", role: "", tagline: "" });
  assert.equal(hasAnyError(errs), true);
  assert.ok(errs.name);
  assert.ok(errs.role);

  const ok = validateIdentity({ name: "Ada", role: "Engineer", tagline: "" });
  assert.equal(hasAnyError(ok), false);
});

check("validateIdentity flags overlong fields", () => {
  const errs = validateIdentity({ name: "a".repeat(61), role: "Engineer", tagline: "" });
  assert.ok(errs.name);
});

check("validateProjects requires at least one titled project", () => {
  const errs = validateProjects([{ title: "", description: "" }]);
  assert.ok(errs._general);

  const ok = validateProjects([{ title: "Thing", description: "" }]);
  assert.equal(hasAnyError(ok), false);
});

check("validateProjects flags invalid link/image URLs per row", () => {
  const errs = validateProjects([{ title: "Thing", link: "not-a-url" }, { title: "Other", image: "javascript:x" }]);
  assert.ok(errs[0].link);
  assert.ok(errs[1].image);
});

check("validateSkillEntry rejects blank, dup, overlong, and over-cap", () => {
  assert.ok(validateSkillEntry("", []));
  assert.ok(validateSkillEntry("JavaScript", ["JavaScript"])); // dup, case-insensitive
  assert.ok(validateSkillEntry("a".repeat(31), []));
  assert.equal(validateSkillEntry("Rust", ["A", "B"]), null);
  const full = Array.from({ length: 16 }, (_, i) => `s${i}`);
  assert.ok(validateSkillEntry("new-skill", full));
});

check("validateContacts only flags rows where url is present but invalid", () => {
  const errs = validateContacts([{ label: "Email", url: "" }, { label: "Site", url: "bad" }]);
  assert.equal(errs[0], undefined);
  assert.ok(errs[1]);
});

console.log(`\n${passed} check group(s) passed.`);
if (process.exitCode) {
  console.error("\nSOME CHECKS FAILED");
  process.exit(1);
} else {
  console.log("\nALL CHECKS PASSED");
}
