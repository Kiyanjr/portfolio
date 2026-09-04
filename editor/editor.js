// editor.js — a small local admin tool. No backend: it fetches the
// current JSON from ../data/, lets you edit it visually in memory, and
// gives you an "Export" button per tab that downloads the updated file.
// You then move that file into /data/ and commit it — that's the whole
// publishing workflow for a static, database-free site.

const state = { profile: null, projects: [], skills: [], experience: [] };

function toast(msg) {
  const el = document.querySelector("[data-toast]");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 2200);
}

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${filename} — replace it in /data/ and commit.`);
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function csvToArray(str) {
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

/* ---------------- Tabs ---------------- */
function initTabs() {
  const tabs = document.querySelectorAll(".ed-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      document.querySelectorAll(".ed-panel").forEach((p) => {
        p.hidden = p.dataset.panel !== tab.dataset.tab;
      });
    });
  });
}

/* ---------------- Profile tab ---------------- */
function renderProfile() {
  const panel = document.querySelector("#panel-profile");
  const p = state.profile || {};
  const simpleFields = [
    ["name", "Name"], ["title", "Title"], ["tagline", "Tagline"],
    ["location", "Location"], ["avatar", "Avatar path"],
    ["email", "Email"], ["github", "GitHub URL"], ["linkedin", "LinkedIn URL"],
    ["resumeUrl", "Resume path"],
  ];
  const textFields = [
    ["summary", "Summary"], ["background", "Background"],
    ["whatIBuild", "What I build"], ["technologiesIEnjoy", "Technologies I enjoy (comma-separated)"],
    ["goals", "Goals"],
  ];

  panel.innerHTML = `
    <div class="ed-grid-2">
      ${simpleFields.map(([key, label]) => `
        <div class="ed-field">
          <label for="f-${key}">${label}</label>
          <input id="f-${key}" data-key="${key}" value="${(p[key] || "").replace(/"/g, "&quot;")}" />
        </div>`).join("")}
    </div>
    ${textFields.map(([key, label]) => `
      <div class="ed-field">
        <label for="f-${key}">${label}</label>
        <textarea id="f-${key}" data-key="${key}">${p[key] || ""}</textarea>
      </div>`).join("")}
    <div class="ed-field">
      <label>Achievements (one per line)</label>
      <textarea data-key="achievements">${(p.achievements || []).join("\n")}</textarea>
    </div>
    <div class="ed-btn-row">
      <button class="ed-btn ed-btn-primary" data-action="export-profile">Export profile.json</button>
    </div>
  `;

  panel.querySelectorAll("[data-key]").forEach((el) => {
    el.addEventListener("input", () => {
      const key = el.dataset.key;
      state.profile[key] = key === "achievements" ? el.value.split("\n").map((s) => s.trim()).filter(Boolean) : el.value;
    });
  });
  panel.querySelector("[data-action='export-profile']").addEventListener("click", () => download("profile.json", state.profile));
}

/* ---------------- Projects tab ---------------- */
function renderProjects() {
  const panel = document.querySelector("#panel-projects");
  const sorted = state.projects.slice().sort((a, b) => a.order - b.order);

  panel.innerHTML = `
    <div class="ed-btn-row">
      <button class="ed-btn ed-btn-primary" data-action="add-project">+ Add project</button>
      <button class="ed-btn" data-action="export-projects">Export projects.json</button>
    </div>
    ${sorted.map((proj, i) => projectCardHTML(proj, i, sorted.length)).join("")}
  `;

  panel.querySelector("[data-action='add-project']").addEventListener("click", () => {
    const id = `new-project-${state.projects.length + 1}`;
    state.projects.push({
      id, name: "New Project", shortDescription: "", fullDescription: "",
      image: "assets/images/projects/placeholder/cover.jpg", screenshots: [],
      technologies: [], category: "Mobile", githubUrl: "", liveUrl: "",
      date: String(new Date().getFullYear()), status: "In Progress",
      featured: false, order: state.projects.length + 1,
    });
    renderProjects();
  });
  panel.querySelector("[data-action='export-projects']").addEventListener("click", () => {
    state.projects.forEach((p, i) => (p.order = i + 1));
    download("projects.json", state.projects.slice().sort((a, b) => a.order - b.order));
  });

  panel.querySelectorAll("[data-project-index]").forEach((card) => {
    const idx = Number(card.dataset.projectIndex);
    const proj = sorted[idx];
    const realIndex = state.projects.indexOf(proj);

    card.querySelectorAll("[data-key]").forEach((el) => {
      el.addEventListener("input", () => {
        const key = el.dataset.key;
        if (key === "featured") proj.featured = el.checked;
        else if (key === "technologies" || key === "screenshots") proj[key] = csvToArray(el.value);
        else proj[key] = el.value;
        if (key === "name" && !proj._idTouched) {
          proj.id = slugify(el.value);
        }
      });
    });
    card.querySelector("[data-action='delete']").addEventListener("click", () => {
      state.projects.splice(realIndex, 1);
      renderProjects();
    });
    card.querySelector("[data-action='up']")?.addEventListener("click", () => {
      [sorted[idx - 1].order, sorted[idx].order] = [sorted[idx].order, sorted[idx - 1].order];
      renderProjects();
    });
    card.querySelector("[data-action='down']")?.addEventListener("click", () => {
      [sorted[idx + 1].order, sorted[idx].order] = [sorted[idx].order, sorted[idx + 1].order];
      renderProjects();
    });
  });
}

function projectCardHTML(proj, i, total) {
  return `
    <div class="ed-card" data-project-index="${i}">
      <div class="ed-card-head">
        <h3>${proj.name || "Untitled"} <span class="mono" style="color:var(--text-faint,#545D70)">#${proj.id}</span></h3>
        <div class="ed-card-actions">
          <button data-action="up" ${i === 0 ? "disabled" : ""} title="Move up">↑</button>
          <button data-action="down" ${i === total - 1 ? "disabled" : ""} title="Move down">↓</button>
          <button data-action="delete" class="ed-btn-danger" title="Delete">✕</button>
        </div>
      </div>
      <div class="ed-grid-2">
        <div class="ed-field"><label>Name</label><input data-key="name" value="${(proj.name || "").replace(/"/g, "&quot;")}" /></div>
        <div class="ed-field"><label>Category</label>
          <select data-key="category">
            ${["Mobile", "Web", "Tool", "Other"].map((c) => `<option ${proj.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="ed-field"><label>Short description</label><input data-key="shortDescription" value="${(proj.shortDescription || "").replace(/"/g, "&quot;")}" /></div>
      <div class="ed-field"><label>Full description</label><textarea data-key="fullDescription">${proj.fullDescription || ""}</textarea></div>
      <div class="ed-grid-2">
        <div class="ed-field"><label>Cover image path</label><input data-key="image" value="${proj.image || ""}" /></div>
        <div class="ed-field"><label>Screenshots (comma-separated paths)</label><input data-key="screenshots" value="${(proj.screenshots || []).join(", ")}" /></div>
      </div>
      <div class="ed-field"><label>Technologies (comma-separated)</label><input data-key="technologies" value="${(proj.technologies || []).join(", ")}" /></div>
      <div class="ed-grid-2">
        <div class="ed-field"><label>GitHub URL</label><input data-key="githubUrl" value="${proj.githubUrl || ""}" /></div>
        <div class="ed-field"><label>Live URL</label><input data-key="liveUrl" value="${proj.liveUrl || ""}" /></div>
      </div>
      <div class="ed-grid-2">
        <div class="ed-field"><label>Date</label><input data-key="date" value="${proj.date || ""}" /></div>
        <div class="ed-field"><label>Status</label>
          <select data-key="status">
            ${["Completed", "In Progress", "Archived"].map((s) => `<option ${proj.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
      </div>
      <label class="ed-checkbox"><input type="checkbox" data-key="featured" ${proj.featured ? "checked" : ""} /> Featured on home page</label>
    </div>`;
}

/* ---------------- Skills tab ---------------- */
function renderSkills() {
  const panel = document.querySelector("#panel-skills");
  const cats = state.skills.categories || [];

  panel.innerHTML = `
    <div class="ed-btn-row">
      <button class="ed-btn ed-btn-primary" data-action="add-category">+ Add category</button>
      <button class="ed-btn" data-action="export-skills">Export skills.json</button>
    </div>
    ${cats.map((cat, i) => `
      <div class="ed-card" data-cat-index="${i}">
        <div class="ed-card-head">
          <input data-key="name" value="${(cat.name || "").replace(/"/g, "&quot;")}" style="background:none;border:none;font-family:var(--font-display,sans-serif);font-size:1rem;color:var(--text,#ECEFF4);padding:0" />
          <div class="ed-card-actions"><button data-action="delete" class="ed-btn-danger" title="Delete">✕</button></div>
        </div>
        <div class="ed-field"><label>Skills (comma-separated)</label><input data-key="skills" value="${(cat.skills || []).join(", ")}" /></div>
      </div>`).join("")}
  `;

  panel.querySelector("[data-action='add-category']").addEventListener("click", () => {
    (state.skills.categories ||= []).push({ name: "New Category", skills: [] });
    renderSkills();
  });
  panel.querySelector("[data-action='export-skills']").addEventListener("click", () => download("skills.json", state.skills));

  panel.querySelectorAll("[data-cat-index]").forEach((card) => {
    const idx = Number(card.dataset.catIndex);
    const cat = cats[idx];
    card.querySelectorAll("[data-key]").forEach((el) => {
      el.addEventListener("input", () => {
        if (el.dataset.key === "skills") cat.skills = csvToArray(el.value);
        else cat.name = el.value;
      });
    });
    card.querySelector("[data-action='delete']").addEventListener("click", () => {
      state.skills.categories.splice(idx, 1);
      renderSkills();
    });
  });
}

/* ---------------- Experience tab ---------------- */
function renderExperience() {
  const panel = document.querySelector("#panel-experience");

  panel.innerHTML = `
    <div class="ed-btn-row">
      <button class="ed-btn ed-btn-primary" data-action="add-exp">+ Add entry</button>
      <button class="ed-btn" data-action="export-exp">Export experience.json</button>
    </div>
    ${state.experience.map((item, i) => `
      <div class="ed-card" data-exp-index="${i}">
        <div class="ed-card-head">
          <h3>${item.position || "Untitled"}</h3>
          <div class="ed-card-actions">
            <button data-action="up" ${i === 0 ? "disabled" : ""} title="Move up">↑</button>
            <button data-action="down" ${i === state.experience.length - 1 ? "disabled" : ""} title="Move down">↓</button>
            <button data-action="delete" class="ed-btn-danger" title="Delete">✕</button>
          </div>
        </div>
        <div class="ed-grid-2">
          <div class="ed-field"><label>Position</label><input data-key="position" value="${(item.position || "").replace(/"/g, "&quot;")}" /></div>
          <div class="ed-field"><label>Organization</label><input data-key="organization" value="${(item.organization || "").replace(/"/g, "&quot;")}" /></div>
        </div>
        <div class="ed-grid-2">
          <div class="ed-field"><label>Start date</label><input data-key="startDate" value="${item.startDate || ""}" /></div>
          <div class="ed-field"><label>End date</label><input data-key="endDate" value="${item.endDate || ""}" /></div>
        </div>
        <div class="ed-field"><label>Description</label><textarea data-key="description">${item.description || ""}</textarea></div>
        <div class="ed-field"><label>Technologies (comma-separated)</label><input data-key="technologies" value="${(item.technologies || []).join(", ")}" /></div>
      </div>`).join("")}
  `;

  panel.querySelector("[data-action='add-exp']").addEventListener("click", () => {
    state.experience.push({ id: `entry-${state.experience.length + 1}`, position: "New role", organization: "", startDate: "", endDate: "Present", description: "", technologies: [] });
    renderExperience();
  });
  panel.querySelector("[data-action='export-exp']").addEventListener("click", () => download("experience.json", state.experience));

  panel.querySelectorAll("[data-exp-index]").forEach((card) => {
    const idx = Number(card.dataset.expIndex);
    const item = state.experience[idx];
    card.querySelectorAll("[data-key]").forEach((el) => {
      el.addEventListener("input", () => {
        item[el.dataset.key] = el.dataset.key === "technologies" ? csvToArray(el.value) : el.value;
      });
    });
    card.querySelector("[data-action='delete']").addEventListener("click", () => {
      state.experience.splice(idx, 1);
      renderExperience();
    });
    card.querySelector("[data-action='up']")?.addEventListener("click", () => {
      [state.experience[idx - 1], state.experience[idx]] = [state.experience[idx], state.experience[idx - 1]];
      renderExperience();
    });
    card.querySelector("[data-action='down']")?.addEventListener("click", () => {
      [state.experience[idx + 1], state.experience[idx]] = [state.experience[idx], state.experience[idx + 1]];
      renderExperience();
    });
  });
}

/* ---------------- Boot ---------------- */
async function loadAll() {
  try {
    const [profile, projects, skills, experience] = await Promise.all([
      fetch("../data/profile.json").then((r) => r.json()),
      fetch("../data/projects.json").then((r) => r.json()),
      fetch("../data/skills.json").then((r) => r.json()),
      fetch("../data/experience.json").then((r) => r.json()),
    ]);
    state.profile = profile;
    state.projects = projects;
    state.skills = skills;
    state.experience = experience;
    renderProfile();
    renderProjects();
    renderSkills();
    renderExperience();
  } catch (err) {
    document.querySelector("#panel-profile").innerHTML = `
      <div class="ed-note" style="border-left-color:var(--danger,#E8776B)">
        Couldn't load the JSON files from <code>../data/</code>. Make sure you're running this through a local
        static server (not opening the file directly), e.g. from the project root: <code>python3 -m http.server</code>,
        then open <code>http://localhost:8000/editor/</code>.
      </div>`;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  loadAll();
});
