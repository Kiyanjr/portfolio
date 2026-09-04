// main.js — shared behavior across all pages: theme, nav, data helpers

const THEME_KEY = "portfolio-theme";

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = stored || (prefersLight ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", theme);

  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  });
}

function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const links = document.querySelector("[data-nav-links]");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const open = links.getAttribute("data-open") === "true";
    links.setAttribute("data-open", String(!open));
    toggle.setAttribute("aria-expanded", String(!open));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setFooterYear() {
  const el = document.querySelector("[data-year]");
  if (el) el.textContent = new Date().getFullYear();
}

// Resolve data file paths relative to the page's depth so this works
// whether the page lives at the site root or in a subfolder.
function dataPath(file) {
  const base = document.body.dataset.base || "";
  return `${base}data/${file}`;
}

async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function loadProfile() {
  try {
    return await fetchJSON(dataPath("profile.json"));
  } catch (err) {
    console.error(err);
    return null;
  }
}

function applyProfileToDom(profile) {
  if (!profile) return;
  document.querySelectorAll("[data-profile]").forEach((el) => {
    const key = el.dataset.profile;
    const value = profile[key];
    if (value == null) return;
    if (el.tagName === "A" && el.dataset.profileHref) {
      el.href = value;
    } else {
      el.textContent = value;
    }
  });
  document.querySelectorAll("[data-profile-href]").forEach((el) => {
    const key = el.dataset.profileHref;
    if (!profile[key]) return;
    el.href = el.hasAttribute("data-profile-mailto") ? `mailto:${profile[key]}` : profile[key];
  });
  document.querySelectorAll("[data-profile-src]").forEach((el) => {
    const key = el.dataset.profileSrc;
    if (profile[key]) el.src = profile[key];
  });
}

// About page: bio blocks, skills grid, experience timeline, achievements ---
async function initAboutContent() {
  const root = document.querySelector("[data-about-content]");
  if (!root) return;
  const profile = await loadProfile();
  if (!profile) return;

  const enjoy = (profile.technologiesIEnjoy || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const target = document.querySelector("[data-about-background]");
  if (target) target.textContent = profile.background;
  const whatIBuild = document.querySelector("[data-about-whatibuild]");
  if (whatIBuild) whatIBuild.textContent = profile.whatIBuild;
  const goals = document.querySelector("[data-about-goals]");
  if (goals) goals.textContent = profile.goals;

  const enjoyList = document.querySelector("[data-about-enjoy]");
  if (enjoyList && enjoy.length) {
    enjoyList.innerHTML = enjoy.map((t) => `<span class="tech-tag">${t}</span>`).join("");
  }

  const achievementsList = document.querySelector("[data-achievements]");
  if (achievementsList && profile.achievements) {
    achievementsList.innerHTML = profile.achievements.map((a) => `<li>${a}</li>`).join("");
  }
}

async function initSkills() {
  const container = document.querySelector("[data-skills-grid]");
  if (!container) return;
  try {
    const data = await fetchJSON(dataPath("skills.json"));
    container.innerHTML = data.categories
      .map(
        (cat) => `
        <div class="skill-category" data-reveal>
          <h3>${cat.name}</h3>
          <ul class="skill-list">${cat.skills.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>`
      )
      .join("");
    if (window.initRevealAnimations) window.initRevealAnimations();
  } catch (err) {
    console.error(err);
  }
}

async function initExperience() {
  const container = document.querySelector("[data-timeline]");
  if (!container) return;
  try {
    const items = await fetchJSON(dataPath("experience.json"));
    container.innerHTML = items
      .map(
        (item) => `
        <div class="timeline-item" data-reveal>
          <div class="timeline-date">${item.startDate} — ${item.endDate}</div>
          <div class="timeline-role">
            <h3>${item.position}</h3>
            <span class="timeline-org">${item.organization}</span>
            <p>${item.description}</p>
            ${
              item.technologies && item.technologies.length
                ? `<div class="timeline-tech">${item.technologies
                    .map((t) => `<span class="tech-tag">${t}</span>`)
                    .join("")}</div>`
                : ""
            }
          </div>
        </div>`
      )
      .join("");
    if (window.initRevealAnimations) window.initRevealAnimations();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNav();
  setFooterYear();
  loadProfile().then(applyProfileToDom);
  initAboutContent();
  initSkills();
  initExperience();
});
