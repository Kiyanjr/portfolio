// projects.js — loading, rendering and filtering project data.
// Depends on fetchJSON/dataPath from main.js (loaded first).

const ICON_GITHUB = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.64 0 8.13c0 3.6 2.29 6.65 5.47 7.72.4.08.55-.17.55-.39 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.5-2.69-.96-.09-.23-.48-.96-.82-1.15-.28-.15-.68-.53-.01-.54.63-.01 1.08.59 1.23.83.72 1.22 1.87.88 2.33.67.07-.53.28-.88.51-1.08-1.78-.2-3.64-.9-3.64-3.98 0-.88.31-1.6.82-2.16-.08-.2-.36-1.03.08-2.14 0 0 .67-.22 2.2.83a7.5 7.5 0 0 1 4 0c1.53-1.05 2.2-.83 2.2-.83.44 1.11.16 1.94.08 2.14.51.56.82 1.27.82 2.16 0 3.09-1.87 3.78-3.65 3.98.29.25.54.75.54 1.51 0 1.09-.01 1.97-.01 2.24 0 .22.15.48.55.39A8.14 8.14 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z"/></svg>';
const ICON_EXTERNAL = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6.5 3.5h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3M9.5 2.5h4v4M13 3 7 9"/></svg>';
const ICON_ARROW_LEFT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4"/></svg>';

async function loadProjects() {
  try {
    const data = await fetchJSON(dataPath("projects.json"));
    return data.slice().sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error(err);
    return [];
  }
}

function projectCardHTML(p) {
  const techTags = p.technologies
    .slice(0, 4)
    .map((t) => `<span class="tech-tag">${t}</span>`)
    .join("");
  return `
    <a class="project-card" data-status="${p.status}" data-category="${p.category}" href="project.html?id=${p.id}" data-reveal>
      <div class="project-card-media">
        <img src="${p.image}" alt="${p.name} app screenshot" loading="lazy" width="640" height="400"
             onerror="this.closest('.project-card-media').style.display='none'">
      </div>
      <div class="project-card-body">
        <div class="project-card-top">
          <h3>${p.name}</h3>
          <span class="status-badge" data-status="${p.status}">${p.status}</span>
        </div>
        <p>${p.shortDescription}</p>
        <div class="tech-tags">${techTags}${p.featured ? '<span class="featured-flag">★ featured</span>' : ""}</div>
      </div>
    </a>`;
}

function renderProjectGrid(container, projects) {
  if (!container) return;
  if (!projects.length) {
    container.innerHTML = `<div class="empty-state">No projects match this filter yet.</div>`;
    return;
  }
  container.innerHTML = projects.map(projectCardHTML).join("");
  if (window.initRevealAnimations) window.initRevealAnimations();
}

// Home page: featured projects only -----------------------------------
async function initFeaturedProjects() {
  const container = document.querySelector("[data-featured-projects]");
  if (!container) return;
  const projects = await loadProjects();
  renderProjectGrid(container, projects.filter((p) => p.featured));
}

// Projects page: full grid with category + status filters ---------------
async function initProjectsPage() {
  const container = document.querySelector("[data-project-grid]");
  const filterRow = document.querySelector("[data-filter-row]");
  if (!container) return;

  const projects = await loadProjects();
  const categories = ["All", ...new Set(projects.map((p) => p.category))];
  let activeCategory = "All";

  function draw() {
    const filtered =
      activeCategory === "All" ? projects : projects.filter((p) => p.category === activeCategory);
    renderProjectGrid(container, filtered);
  }

  if (filterRow) {
    filterRow.innerHTML = categories
      .map(
        (cat, i) =>
          `<button class="filter-btn" type="button" aria-pressed="${i === 0}" data-cat="${cat}">${cat}</button>`
      )
      .join("");
    filterRow.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      activeCategory = btn.dataset.cat;
      filterRow
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      draw();
    });
  }

  draw();
}

// Project detail page ----------------------------------------------------
function setMeta(name, content, attr = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

async function initProjectDetail() {
  const root = document.querySelector("[data-project-detail]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const projects = await loadProjects();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    root.innerHTML = `
      <div class="empty-state">
        Couldn't find that project. <a href="projects.html">Back to all projects</a>.
      </div>`;
    return;
  }

  // SEO: per-project title, description, canonical, Open Graph, Twitter card.
  document.title = `${project.name} — Kiyan Johari`;
  setMeta("description", project.shortDescription);
  setCanonical(`${window.location.origin}${window.location.pathname}?id=${project.id}`);
  setMeta("og:title", `${project.name} — Kiyan Johari`, "property");
  setMeta("og:description", project.shortDescription, "property");
  setMeta("og:image", `${window.location.origin}/${project.image}`, "property");
  setMeta("og:type", "article", "property");
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", `${project.name} — Kiyan Johari`);
  setMeta("twitter:description", project.shortDescription);

  const screenshots = (project.screenshots || [])
    .map(
      (src) =>
        `<img src="${src}" alt="${project.name} screenshot" loading="lazy" width="480" height="300" onerror="this.remove()">`
    )
    .join("");

  const techTags = project.technologies.map((t) => `<span class="tech-tag">${t}</span>`).join("");

  root.innerHTML = `
    <a class="back-link" href="projects.html">${ICON_ARROW_LEFT} All projects</a>
    <header class="project-hero" data-reveal>
      <div>
        <span class="status-badge" data-status="${project.status}">${project.status}</span>
        <h1 style="margin-top:0.75rem">${project.name}</h1>
        <p style="font-size:var(--step-1);max-width:60ch">${project.fullDescription}</p>
      </div>
      <div class="project-hero-media">
        <img src="${project.image}" alt="${project.name} cover" width="1200" height="600"
             onerror="this.closest('.project-hero-media').style.display='none'">
      </div>
      <div class="project-meta-row">
        <div class="meta-block"><span class="label">Category</span>${project.category}</div>
        <div class="meta-block"><span class="label">Date</span>${project.date}</div>
        <div class="meta-block"><span class="label">Status</span>${project.status}</div>
        <div class="meta-block">
          <span class="label">Links</span>
          <div class="btn-row" style="margin-top:0.3rem">
            ${project.githubUrl ? `<a class="btn" href="${project.githubUrl}" target="_blank" rel="noopener">${ICON_GITHUB} Source</a>` : ""}
            ${project.liveUrl ? `<a class="btn btn-primary" href="${project.liveUrl}" target="_blank" rel="noopener">${ICON_EXTERNAL} Live</a>` : ""}
          </div>
        </div>
      </div>
      <div class="tech-tags">${techTags}</div>
    </header>
    ${screenshots ? `<div class="screenshot-grid" data-reveal>${screenshots}</div>` : ""}
  `;
  if (window.initRevealAnimations) window.initRevealAnimations();
}

document.addEventListener("DOMContentLoaded", () => {
  initFeaturedProjects();
  initProjectsPage();
  initProjectDetail();
});
