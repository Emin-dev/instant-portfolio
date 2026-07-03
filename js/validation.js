// validation.js — small, dependency-free field validators shared by the form steps.

export function isBlank(str) {
  return !str || !String(str).trim();
}

export function isValidURL(str) {
  if (isBlank(str)) return false;
  try {
    const u = new URL(str.trim());
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:" || u.protocol === "tel:";
  } catch {
    return false;
  }
}

// Step 1: identity
export function validateIdentity(data) {
  const errors = {};
  if (isBlank(data.name)) errors.name = "Please enter your name.";
  else if (data.name.trim().length > 60) errors.name = "Keep it under 60 characters.";

  if (isBlank(data.role)) errors.role = "Please enter your role or title.";
  else if (data.role.trim().length > 80) errors.role = "Keep it under 80 characters.";

  if (data.tagline && data.tagline.trim().length > 160) {
    errors.tagline = "Keep your tagline under 160 characters.";
  }
  return errors;
}

// Step 2: projects — at least one project with a title is required.
export function validateProjects(projects) {
  const errors = {};
  const list = projects || [];
  const filled = list.filter((p) => !isBlank(p.title));
  if (filled.length === 0) {
    errors._general = "Add at least one project with a title.";
  }
  list.forEach((p, i) => {
    const rowErrors = {};
    if (!isBlank(p.title) && p.title.trim().length > 80) {
      rowErrors.title = "Keep titles under 80 characters.";
    }
    if (!isBlank(p.description) && p.description.trim().length > 240) {
      rowErrors.description = "Keep descriptions under 240 characters.";
    }
    if (!isBlank(p.link) && !isValidURL(p.link)) {
      rowErrors.link = "Enter a full URL, e.g. https://example.com";
    }
    if (!isBlank(p.image) && !isValidURL(p.image)) {
      rowErrors.image = "Enter a full image URL, e.g. https://example.com/img.png";
    }
    if (Object.keys(rowErrors).length) errors[i] = rowErrors;
  });
  return errors;
}

// Step 3: skills — optional, but cap length/count.
export function validateSkillEntry(skill, existing) {
  if (isBlank(skill)) return "Enter a skill first.";
  if (skill.trim().length > 30) return "Keep each skill under 30 characters.";
  if ((existing || []).some((s) => s.toLowerCase() === skill.trim().toLowerCase())) {
    return "You already added that skill.";
  }
  if ((existing || []).length >= 16) return "That's plenty of skills — 16 max.";
  return null;
}

// Step 4: contacts — optional, but any filled-in row must have a valid URL.
export function validateContacts(contacts) {
  const errors = {};
  (contacts || []).forEach((c, i) => {
    if (!isBlank(c.url) && !isValidURL(c.url)) {
      errors[i] = "Enter a valid link (https://, mailto:, or tel:).";
    }
  });
  return errors;
}

export function hasAnyError(errorsObj) {
  return Object.keys(errorsObj || {}).length > 0;
}
