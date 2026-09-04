# Kiyan Johari — Developer Portfolio

A dependency-free portfolio: HTML5, modern CSS, and vanilla JavaScript. No framework,
no backend, no database. Content lives in `/data/*.json`; pages fetch it at load time.
Deployed as a static site via GitHub Actions → GitHub Pages.

## Folder structure

```
portfolio/
├── index.html          Home — hero, featured projects, skills overview
├── about.html           About, full skills grid, experience timeline, contact
├── projects.html        Full project grid with category filters
├── project.html         Project case-study template (reads ?id=<slug>)
│
├── css/
│   ├── main.css          Design tokens, reset, typography, nav, footer
│   ├── components.css     Hero, buttons, cards, phone mockup, skills, timeline
│   └── responsive.css     Breakpoints only
│
├── js/
│   ├── main.js            Theme toggle, nav, JSON fetch helpers, profile/skills/experience rendering
│   ├── projects.js        Project cards, grid filtering, project detail rendering + per-page SEO tags
│   └── animations.js      IntersectionObserver scroll reveals, respects prefers-reduced-motion
│
├── data/
│   ├── profile.json       Name, bio, links, achievements
│   ├── projects.json      All project entries (see schema below)
│   ├── skills.json        Skill categories
│   └── experience.json    Timeline entries
│
├── assets/
│   ├── images/            Project covers, screenshots, avatar, OG cover
│   └── icons/              favicon.svg
│
├── editor/                Local visual JSON editor — not deployed to the live site
│   ├── index.html
│   ├── editor.js
│   └── editor.css
│
├── sitemap.xml, robots.txt
└── .github/workflows/deploy.yml
```

**Why this structure:** every page is static HTML that fetches its content from `/data/`
at runtime, so adding a project never means touching HTML. `css/` and `js/` are split by
responsibility, not by page, so nothing is duplicated across `index.html` / `about.html` /
`projects.html`. The `editor/` folder is deliberately separate and excluded from deploys —
it's a tool you run against your own repo checkout, not a public admin panel (there's no
server here to protect one).

## Run it locally

Because pages `fetch()` JSON, you need a local static server (not `file://`):

```bash
# from the portfolio/ root
python3 -m http.server 8000
# or: npx serve .
```

Then open `http://localhost:8000`.

## Content workflow (no HTML editing required)

All content lives in four JSON files under `data/`. Edit them directly, or use the
visual editor at `editor/index.html` (see below) and export the updated file.

### Add a project

1. Add an object to `data/projects.json` following this shape:

    ```json
    {
      "id": "my-app",
      "name": "My App",
      "shortDescription": "One line for the card.",
      "fullDescription": "A few sentences for the case-study page.",
      "image": "assets/images/projects/my-app/cover.jpg",
      "screenshots": ["assets/images/projects/my-app/1.jpg"],
      "technologies": ["Flutter", "Dart"],
      "category": "Mobile",
      "githubUrl": "https://github.com/you/my-app",
      "liveUrl": "",
      "date": "2026",
      "status": "In Progress",
      "featured": false,
      "order": 11
    }
    ```

2. `id` becomes the URL: `project.html?id=my-app`. `order` controls position in the grid
   (lower = earlier). `status` must be `Completed`, `In Progress`, or `Archived` — the UI
   colors the status badge based on this value. Set `featured: true` to show it on the
   home page.

### Edit or delete a project

Find its object in `projects.json` by `id`, change the fields, or remove the object
entirely. Nothing else needs to change — the grid, filters, and detail page all read
from this file at runtime.

### Add project images

Drop images into `assets/images/projects/<project-id>/` and reference them by path in
`image` / `screenshots`. Keep them reasonably sized (the CSS renders covers at a 16:10
box and screenshots in a responsive grid) — aim for ~1200px wide covers and WebP where
you can, since the browser will otherwise download more than it displays. If an image
path 404s, the card/hero gracefully hides that image block instead of showing a broken
icon.

### Change profile information

Edit `data/profile.json` — name, title, tagline, bio text, social links, achievements.
`index.html`, `about.html`, and the footer on every page pull from this file via
`data-profile` / `data-profile-href` attributes (see `applyProfileToDom` in `js/main.js`).

### Edit skills

Edit `data/skills.json` — an array of `{ name, skills: [...] }` categories. Shown in
full on `about.html` and as an overview on `index.html`.

### Edit experience

Edit `data/experience.json` — an ordered array of `{ position, organization, startDate,
endDate, description, technologies }`. Rendered as the timeline on `about.html`.

### How the editor works

`editor/index.html` is a small, local-only page — form fields bound to the same JSON
shapes described above. It fetches the current files from `../data/`, lets you add,
edit, delete, and reorder entries visually, and each tab has an **Export** button that
downloads the updated JSON file from your browser. Move the downloaded file into
`/data/`, replacing the old one, and commit it. There's no server-side save because
there's no server — this is the entire "CMS" for a static, database-free site.

## Performance & SEO notes

- Images use explicit `width`/`height` to avoid layout shift, and `loading="lazy"` on
  everything below the fold.
- Animations use `transform`/`opacity` only, scroll reveals run on `IntersectionObserver`
  (no scroll listeners), and everything respects `prefers-reduced-motion`.
- `project.html` is a shared template: `js/projects.js` rewrites the `<title>`, meta
  description, canonical URL, and Open Graph/Twitter tags per project as soon as the
  JSON loads. This works well for crawlers that execute JavaScript (including Google),
  but a social-media unfurler that doesn't run JS will see the template's default tags.
  If you need guaranteed no-JS previews later, the clean next step is a small Node build
  script in CI that pre-renders one static HTML file per project from the same
  `projects.json` — deliberately left out here to avoid adding a build system this
  project doesn't otherwise need.
- `sitemap.xml` is checked in rather than generated at build time, to keep the workflow
  dependency-free. Regenerate it by hand (or a short script) when you add projects.

## GitHub Actions

`.github/workflows/deploy.yml` runs on every push to `main`:

1. Checks out the repo.
2. Validates every file in `data/` is well-formed JSON (fails the build on a typo before
   it ever reaches production).
3. Copies the site into `dist/`, excluding `.github/`, `editor/`, and markdown files.
4. Uploads `dist/` as a Pages artifact and deploys it.

No build tools, no `npm install` — it's a copy-and-deploy job plus a content sanity check.

## Enable GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab) — the site
   deploys automatically.

## Add a custom domain

1. In **Settings → Pages**, enter your domain under **Custom domain** — this creates a
   `CNAME` file in the deployed output automatically.
2. At your DNS provider, add either:
   - an `A` record pointing your apex domain to GitHub's Pages IPs, or
   - a `CNAME` record pointing a subdomain (e.g. `www`) to `<username>.github.io`.
3. Update the hard-coded `https://kiyanjohari.dev/...` URLs in the `<meta>` tags,
   `sitemap.xml`, and `robots.txt` to your actual domain — nothing else in the codebase
   assumes a specific host, so this is the only place domain changes need to happen.
