// generator.js
// Pure module: formData -> complete, valid, escaped HTML string for the generated portfolio.
// No DOM dependency — importable directly under plain Node for unit testing.

/**
 * Escape a string for safe injection into HTML text content / attribute values.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape a string for safe use inside an HTML attribute value (href, src).
 * Also strips javascript: / data: pseudo-protocols to avoid script injection via links.
 * @param {string} url
 * @returns {string}
 */
export function sanitizeURL(url) {
  if (!url) return "";
  const trimmed = String(url).trim();
  // Block dangerous protocols; allow http(s), mailto, tel, and relative/anchor links.
  if (/^\s*(javascript|data|vbscript):/i.test(trimmed)) {
    return "";
  }
  return escapeHTML(trimmed);
}

/**
 * @typedef {Object} Project
 * @property {string} title
 * @property {string} description
 * @property {string} [link]
 * @property {string} [image]
 *
 * @typedef {Object} ContactLink
 * @property {string} label
 * @property {string} url
 *
 * @typedef {Object} PortfolioFormData
 * @property {string} name
 * @property {string} role
 * @property {string} tagline
 * @property {Project[]} projects
 * @property {string[]} skills
 * @property {ContactLink[]} contacts
 */

function initials(name) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function renderProjectCard(project) {
  const title = escapeHTML(project.title || "");
  const description = escapeHTML(project.description || "");
  const hasLink = project.link && project.link.trim();
  const hasImage = project.image && project.image.trim();

  const media = hasImage
    ? `<div class="project-media"><img src="${sanitizeURL(project.image)}" alt="${title} preview" loading="lazy" /></div>`
    : `<div class="project-media project-media--placeholder" aria-hidden="true">${escapeHTML((project.title || "?").slice(0, 1).toUpperCase())}</div>`;

  const linkHtml = hasLink
    ? `<a class="project-link" href="${sanitizeURL(project.link)}" target="_blank" rel="noopener noreferrer">View project <span aria-hidden="true">&rarr;</span></a>`
    : "";

  return `
        <article class="project-card">
          ${media}
          <div class="project-body">
            <h3 class="project-title">${title}</h3>
            <p class="project-description">${description}</p>
            ${linkHtml}
          </div>
        </article>`;
}

function renderSkills(skills) {
  if (!skills || skills.length === 0) return "";
  const items = skills
    .filter((s) => s && s.trim())
    .map((s) => `<li class="skill-pill">${escapeHTML(s.trim())}</li>`)
    .join("");
  if (!items) return "";
  return `
      <section class="section skills-section" aria-labelledby="skills-heading">
        <h2 id="skills-heading" class="section-heading">Skills</h2>
        <ul class="skills-list">${items}</ul>
      </section>`;
}

function renderProjects(projects) {
  if (!projects || projects.length === 0) return "";
  const valid = projects.filter((p) => p && p.title && p.title.trim());
  if (valid.length === 0) return "";
  const cards = valid.map(renderProjectCard).join("\n");
  return `
      <section class="section projects-section" aria-labelledby="projects-heading">
        <h2 id="projects-heading" class="section-heading">Projects</h2>
        <div class="projects-grid">${cards}
        </div>
      </section>`;
}

function renderContacts(contacts) {
  if (!contacts || contacts.length === 0) return "";
  const valid = contacts.filter((c) => c && c.url && c.url.trim());
  if (valid.length === 0) return "";
  const links = valid
    .map(
      (c) =>
        `<a class="contact-link" href="${sanitizeURL(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(c.label || c.url)}</a>`
    )
    .join("\n          ");
  return `
      <section class="section contact-section" aria-labelledby="contact-heading">
        <h2 id="contact-heading" class="section-heading">Contact</h2>
        <div class="contact-links">
          ${links}
        </div>
      </section>`;
}

const BASE_CSS = `
    :root {
      --bg: #0b0c0f;
      --surface: #14161b;
      --surface-2: #1b1e25;
      --text: #f1f2f4;
      --text-dim: #a6acb8;
      --accent: #6ee7b7;
      --accent-2: #7dd3fc;
      --border: #262a33;
      --radius: 14px;
      --maxw: 880px;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
    .hero {
      padding: 88px 0 56px;
      border-bottom: 1px solid var(--border);
    }
    .avatar {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #08120d;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 22px;
      margin-bottom: 24px;
    }
    .hero-name {
      font-size: clamp(28px, 5vw, 44px);
      font-weight: 700;
      margin: 0 0 6px;
      letter-spacing: -0.02em;
    }
    .hero-role {
      font-size: clamp(15px, 2.4vw, 18px);
      color: var(--accent);
      font-weight: 600;
      margin: 0 0 16px;
    }
    .hero-tagline {
      font-size: clamp(15px, 2.2vw, 18px);
      color: var(--text-dim);
      max-width: 60ch;
      margin: 0;
    }
    .section { padding: 56px 0; border-bottom: 1px solid var(--border); }
    .section:last-of-type { border-bottom: none; }
    .section-heading {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--text-dim);
      font-weight: 700;
      margin: 0 0 28px;
    }
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }
    .project-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .project-card:hover { transform: translateY(-2px); border-color: #34394a; }
    .project-media {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: var(--surface-2);
      overflow: hidden;
    }
    .project-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .project-media--placeholder {
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; font-weight: 700; color: var(--text-dim);
    }
    .project-body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
    .project-title { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
    .project-description { font-size: 14.5px; color: var(--text-dim); margin: 0 0 16px; flex: 1; }
    .project-link {
      font-size: 14px; font-weight: 600; color: var(--accent-2);
      text-decoration: none; align-self: flex-start;
    }
    .project-link:hover { text-decoration: underline; }
    .skills-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-wrap: wrap; gap: 10px;
    }
    .skill-pill {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13.5px;
      color: var(--text);
    }
    .contact-links { display: flex; flex-wrap: wrap; gap: 12px 24px; }
    .contact-link {
      color: var(--text);
      font-weight: 600;
      font-size: 15px;
      text-decoration: none;
      border-bottom: 2px solid var(--accent);
      padding-bottom: 2px;
    }
    .contact-link:hover { color: var(--accent); }
    .footer {
      padding: 32px 0 48px;
      color: var(--text-dim);
      font-size: 13px;
      text-align: center;
    }
    @media (max-width: 600px) {
      .hero { padding: 56px 0 40px; }
      .section { padding: 40px 0; }
    }
`;

/**
 * Generate a complete, valid, self-contained portfolio HTML document from form data.
 * @param {PortfolioFormData} data
 * @returns {string} full HTML document string
 */
export function generatePortfolioHTML(data) {
  const name = escapeHTML((data && data.name) || "Your Name");
  const role = escapeHTML((data && data.role) || "");
  const tagline = escapeHTML((data && data.tagline) || "");
  const av = escapeHTML(initials((data && data.name) || "") || "?");

  const roleHtml = role ? `<p class="hero-role">${role}</p>` : "";
  const taglineHtml = tagline ? `<p class="hero-tagline">${tagline}</p>` : "";

  const projectsHtml = renderProjects(data && data.projects);
  const skillsHtml = renderSkills(data && data.skills);
  const contactHtml = renderContacts(data && data.contacts);

  const titleText = `${(data && data.name) || "Portfolio"} — ${(data && data.role) || "Portfolio"}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHTML(titleText)}</title>
<meta name="description" content="${escapeHTML(tagline || `${(data && data.name) || "Portfolio"}'s portfolio`)}" />
<style>${BASE_CSS}</style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <div class="avatar">${av}</div>
      <h1 class="hero-name">${name}</h1>
      ${roleHtml}
      ${taglineHtml}
    </header>
    <main>${projectsHtml}${skillsHtml}${contactHtml}
    </main>
    <footer class="footer">Built with Instant Portfolio</footer>
  </div>
</body>
</html>
`;
}
