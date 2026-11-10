# EMBEDX Project Status

**Snapshot date:** 2026-11-05 (system date for this session). **Repository state inspected:** branch `arena/d7b0134a-embedx-website`, commit `ea8b596a1b772df48204f2e5fb8303b3e6401a17`. Facts below describe checked-in code/configuration and retrieved GitHub metadata; they are not a substitute for live functional/content verification. No API-key, password, token, or service-account values are included.

## PROJECT OVERVIEW

- **Purpose:** public website and content-management portal for EMBEDX, the Department of Electrical and Electronics Engineering club at SRM TRP Engineering College, Tiruchirappalli. Includes public information, project/event/team/achievement content, a verified-college-email Learning Hub, public forms and a role-based Admin portal.
- **Repository:** https://github.com/814725105014-debug/embedx-website
- **Current branch:** `arena/d7b0134a-embedx-website` (clean at last inspection; based at the merge of PR #62).
- **Last commit:** `ea8b596a1b772df48204f2e5fb8303b3e6401a17` — “Merge pull request #62 from 814725105014-debug/arena/673cb90d-embedx-website”. Git metadata reports 2026-11-11, later than the session date 2026-11-05; dates are reproduced as retrieved, not reconciled.
- **Live URL:** https://embedx-club-eee.web.app (configured project domain and URL used by canonical metadata). Firebase’s paired `*.firebaseapp.com` host is documented; exact working URL/status for that alias was not independently checked. Custom domain: **UNKNOWN**.
- **Deployment:** GitHub Actions run [42880775797](https://github.com/814725105014-debug/embedx-website/actions/runs/42880775797), conclusion **success**, head SHA matches the last commit, live Hosting deploy step completed. Retrieved run creation time: `2026-11-10T18:59:48Z`; job completed `2026-11-10T19:00:39Z`. **Date discrepancy:** both timestamps are later than the provided current date 2026-11-05. Preserve the GitHub-reported values; chronology cannot be independently resolved here. The run also reports Firestore rules deployment and a best-effort Storage-rules step. The workflow’s Storage step is allowed to fail without failing the run; a successful overall run alone does not prove Storage rules deployed.
- **System boundary:** this is a static browser app with Firebase services, not a conventional server-rendered application. There is no frontend build pipeline. Current Firebase Hosting source is `public/`. The root-level site is a preserved legacy Neocities-era version described by README, not the Firebase-published site. `backend-bundle/` is tooling/rules/source material and is not the Hosting root. Cloudflare files are secondary configuration; whether Cloudflare is deployed or authoritative is **UNKNOWN**.

## TECH STACK AND HOSTING

- **Frontend:** plain HTML, CSS, browser ES modules and JavaScript. Current public pages use module imports and dynamic rendering. No framework or frontend bundler/package manifest at repository root; `node_modules` is not committed.
- **Firebase:** Firebase Web SDK `10.12.5` loaded from `https://www.gstatic.com/firebasejs/10.12.5`; Firebase Authentication and Firestore are used in the browser. Project ID `embedx-club-eee`. Firestore Admin SDK tooling specifies `firebase-admin` `^12.7.0`.
- **Hosting config (`firebase.json`):** Hosting `public: "public"`; excludes `firebase.json`, dotfiles and `node_modules`; `cleanUrls: true`; cache/security headers by asset, extension, HTML, root, manifest and `/admin/**`. It configures root `firestore.rules`, `firestore.indexes.json` and `storage.rules`. No Hosting rewrites or Cloud Functions are configured. Root `/` serves `public/index.html`; page URLs support extensionless clean URLs while links often include `.html`.
- **Firebase project selection:** `.firebaserc` defaults to `embedx-club-eee`.
- **Deploy workflow:** `.github/workflows/firebase-hosting-merge.yml` runs on pushes to `main`, uses Ubuntu and Node 20; deploys Firestore rules, attempts Storage rules with `continue-on-error`, then deploys Firebase Hosting to the live channel via `FirebaseExtended/action-hosting-deploy@v0`. It reads GitHub secret name `FIREBASE_SERVICE_ACCOUNT_EMBEDX_CLUB_EEE`; **secret value intentionally omitted**. The YAML has stale-looking TODO comments saying to replace project/initialize GitHub integration even though configured project ID matches and queried run deployed successfully. `.github/workflows/firebase-hosting-pull-request.yml` runs on PRs from same-repository branches and deploys Firebase Hosting previews; it has read/checks/PR-write permissions.
- **Cloudflare secondary config:** `wrangler.jsonc` names Worker `embedx-website`, entry point `./_worker.js`, compatibility date `2026-09-26`, static asset directory `./` (repository root), binding `ASSETS`, and sends `/api/*` through Worker first. `_worker.js` routes POST `/api/join` and `/api/inquiry`; all other requests go to `ASSETS`. Actual Cloudflare deployment, custom domain, environment configuration and whether root assets are exposed: **UNKNOWN**. If deployed as configured, static assets come from root rather than Firebase’s `public/`; that is a source-of-truth/deployment risk.
- **Backend services:** Firestore Security Rules and indexes, browser Firebase Auth, optional Apps Script task-email source/deployment and optional Cloudflare Functions handlers. README says no Cloud Functions are required. Firebase Storage is not currently set up according to `backend-bundle/README.md`; static assets do not rely on a bucket. Storage config exists and workflow attempts its rules best-effort; deployed bucket/rules status **UNKNOWN**.
- **Runtime/configuration names (values withheld):** Firebase browser config properties `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId` in `public/js/config.js`; the browser `apiKey` is intentionally public project configuration, not a credential. `EMBEDX_TASK_MAIL_WEB_APP_URL` is the optional task-mail URL setting in that file and is currently an empty string. `APPS_SCRIPT_URL` is expected as Cloudflare Worker environment configuration for the two legacy route handlers; whether set: **UNKNOWN**. `ASSETS` is Wrangler’s static-assets binding. `FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS` are consumed by trusted seed/admin scripts. `FIREBASE_SERVICE_ACCOUNT_JSON` is the workflow environment variable populated from the named GitHub secret. `FIREBASE_SERVICE_ACCOUNT_EMBEDX_CLUB_EEE` is the GitHub Actions secret name, not its value. `FIREBASE_API_KEY` is read from Apps Script Project Properties by `backend-bundle/appsscript/task-mail.gs`; its configured value is **UNKNOWN**. The Firebase key restriction/App Check recommendations in README are recommendations, not verified deployed settings.
- **Apps Script:** `backend-bundle/appsscript/` contains a task-mail endpoint and form-sync cleanup source. Task mail is separate/optional; URL setting is blank in browser config. Apps Script project deployment status is **UNKNOWN**. README directs owners to remove any old Forms-to-Sheets trigger and retire the former coordinator-mail deployment; completion is **UNKNOWN**.
- **Build/test/deploy commands:** `node scripts/check-site.mjs` is the repository’s static QA script; `scripts/seed.js` seeds Firebase via Admin SDK using `FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS`. `backend-bundle/scripts/package.json` documents Firebase rules/index deployment and Apps Script helper commands. Hosting deployment is through GitHub Actions; local deploy instructions are in README. No full browser E2E suite or frontend build step was identified.
- **SEO/crawl:** page titles/descriptions/canonical/Open Graph/Twitter metadata, `public/robots.txt`, `public/sitemap.xml`, and `public/manifest.webmanifest` exist. Resources, forms and Admin pages include noindex directives as applicable. No JSON-LD structured data was found in public HTML at inspection.

## FULL FILE TREE

Inventory below is generated from tracked repository files plus this status document. Each path has a short purpose. `.git/`, ignored local files, transient build outputs and dependencies are not part of the committed project inventory. Some old assets may be unused; absence of a text reference does not establish that they are safe to remove.

- `.assetsignore` — Cloudflare assets ignore patterns.
- `.firebaserc` — Default Firebase project alias.
- `.github/` — GitHub Actions and repository automation configuration.
- `.github/workflows/` — Firebase live deploy and PR preview workflow definitions.
- `.github/workflows/firebase-hosting-merge.yml` — GitHub Actions workflow/configuration.
- `.github/workflows/firebase-hosting-pull-request.yml` — GitHub Actions workflow/configuration.
- `.gitignore` — Git exclusions for local credentials, dependencies and generated files.
- `_worker.js` — Cloudflare Worker API routing and static asset fallback.
- `about.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `achievers.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `assets/` — Legacy image assets, split into branding, images, posters and projects.
- `assets/branding/` — Legacy brand/college logos and test marks.
- `assets/branding/college-header-banner.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/embedx-club-logo.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/embedx-full-logo.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/embedx-logo-emblem.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/embedx-vertical-logo.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/embedx-wordmark.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/HARIHARAN_V_PHOTO.jpg` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/ieee-student-branch.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/naac-a-plus-badge.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/srm-trp-college-logo.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/srm-trp-logo-full.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/srm-trp-logo-official.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/srm-trp-logo.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/test-emblem.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/test-emblem2.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/branding/test-emblem3.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/` — Legacy root-site illustration and people assets.
- `assets/images/club-president.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/cropped_circle_image (5).png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/domain-header-robot.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/event-automation-arena.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/event-circuit-wizard.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/event-tech-challenge.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/event.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/faculty-coordinator.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/hod.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/industrial-automation-factory.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/industry-ecosystem-strip.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/joint-secretary.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/media.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/microchip-circuit.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/raspberry-pi-board.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/robotic-arm-banner.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/sdg-goals-strip.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/secretary.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/images/vice-president.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/posters/` — Legacy EMBEDX poster artwork.
- `assets/posters/embedded-domain-poster.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/posters/embedx-club-poster.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/projects/` — Legacy root-site project imagery.
- `assets/projects/autonomous-mobile-robot.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/projects/gesture-recognition.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/projects/medibot.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `assets/projects/smart-dustbin.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `backend-bundle/` — Mirrored Firebase rules, seed/admin tools, Apps Script source and fallback data.
- `backend-bundle/.firebaserc` — Project source/configuration or static asset; detailed purpose follows from its path and filename.
- `backend-bundle/.github/` — Backend bundle workflow definitions.
- `backend-bundle/.github/workflows/` — Admin-account and Firestore workflow files.
- `backend-bundle/.github/workflows/create-admin.yml` — GitHub Actions workflow/configuration.
- `backend-bundle/.github/workflows/deploy-firestore.yml` — GitHub Actions workflow/configuration.
- `backend-bundle/.gitignore` — Project source/configuration or static asset; detailed purpose follows from its path and filename.
- `backend-bundle/appsscript/` — Apps Script task-mail and Sheets-trigger cleanup source.
- `backend-bundle/appsscript/appsscript.json` — Project/tooling configuration or structured data file.
- `backend-bundle/appsscript/forms-sync.gs` — Google Apps Script source; external deployment state unknown.
- `backend-bundle/appsscript/task-mail.gs` — Google Apps Script source; external deployment state unknown.
- `backend-bundle/data/` — Mirrored Firestore seed/fallback content modules.
- `backend-bundle/data/achievements.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/data/announcements.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/data/events.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/data/forms.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/data/gallery.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/data/projects.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/data/resources.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/data/team.js` — Backend bundle copy of fallback/seed content data.
- `backend-bundle/firebase.json` — Project/tooling configuration or structured data file.
- `backend-bundle/firestore.indexes.json` — Project/tooling configuration or structured data file.
- `backend-bundle/firestore.rules` — Firebase security rules source or mirrored rules copy.
- `backend-bundle/README.md` — Project documentation or license/usage guidance.
- `backend-bundle/scripts/` — Trusted Firebase Admin and Apps Script utility scripts.
- `backend-bundle/scripts/apps-script.mjs` — Node.js module used by repository QA or operational tooling.
- `backend-bundle/scripts/create-admin.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `backend-bundle/scripts/grant-admin.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `backend-bundle/scripts/package.json` — Project/tooling configuration or structured data file.
- `backend-bundle/scripts/reset-password.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `backend-bundle/scripts/seed.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `backend-bundle/scripts/update-admin.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `backend-bundle/storage.rules` — Firebase security rules source or mirrored rules copy.
- `contact.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `css/` — Legacy root-site stylesheets.
- `css/animations.css` — Stylesheet for the corresponding current or legacy site area.
- `css/components.css` — Stylesheet for the corresponding current or legacy site area.
- `css/main.css` — Stylesheet for the corresponding current or legacy site area.
- `css/responsive.css` — Stylesheet for the corresponding current or legacy site area.
- `domains.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `EMBEDX_PROJECT_STATUS.md` — This project-status inventory (the requested deliverable).
- `event-detail.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `events.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `firebase.json` — Firebase config snapshot for backend bundle (not current Hosting root).
- `firestore.indexes.json` — Firestore composite index definitions.
- `firestore.rules` — Firestore authorization and data validation rules.
- `function/` — Cloudflare Pages-style API function handlers.
- `function/api/` — Join and inquiry proxy route handlers.
- `function/api/inquiry.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `function/api/join.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `index.html` — Legacy root-site homepage; not Firebase Hosting source.
- `join.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `js/` — Legacy root-site browser scripts and fallback data.
- `js/app.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/circuit-canvas.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/data/` — Legacy root-site bundled data modules.
- `js/data/achievements.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/data/domains.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/data/events.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/data/projects.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/data/resources.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/data/team.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/forms.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `js/router.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `neocities.png` — Legacy root-site/hosting-era image asset.
- `not_found.html` — Legacy root-site 404 page.
- `project-detail.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `projects.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `public/` — Current Firebase Hosting static site root.
- `public/404.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `public/admin/` — Current Admin portal HTML shells.
- `public/admin/achievers.html` — Current Admin portal HTML shell for the achievers management module.
- `public/admin/admins.html` — Current Admin portal HTML shell for the admins management module.
- `public/admin/announcements.html` — Current Admin portal HTML shell for the announcements management module.
- `public/admin/events.html` — Current Admin portal HTML shell for the events management module.
- `public/admin/forms.html` — Current Admin portal HTML shell for the forms management module.
- `public/admin/gallery.html` — Current Admin portal HTML shell for the gallery management module.
- `public/admin/index.html` — Current Admin portal HTML shell for the index management module.
- `public/admin/projects.html` — Current Admin portal HTML shell for the projects management module.
- `public/admin/resources.html` — Current Admin portal HTML shell for the resources management module.
- `public/admin/site.html` — Current Admin portal HTML shell for the site management module.
- `public/admin/tasks.html` — Current Admin portal HTML shell for the tasks management module.
- `public/admin/team.html` — Current Admin portal HTML shell for the team management module.
- `public/assets/` — Current public-site static image and cursor assets.
- `public/assets/cursors/` — Light/dark custom cursor SVG assets.
- `public/assets/cursors/arrow-dark.svg` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/cursors/arrow-light.svg` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/cursors/hand-dark.svg` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/cursors/hand-light.svg` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/` — Current public site image/logo/photo assets.
- `public/assets/images/apple-touch-icon.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/domain-header-robot.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embednova-logo.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embednova-rover.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-circle-favicon.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-circle-logo-512.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-circle-logo.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-circle-logo.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-circle-touch.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-emblem.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-logo.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-logo.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/embedx-social-share.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/emblem.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/event-automation-arena.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/event-circuit-wizard.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/event-tech-challenge.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/favicon-64.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/ieee-badge.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/industrial-automation.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/industry-ecosystem-strip.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/microchip-circuit.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/naac-badge.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/poster-club.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/poster-embedded-domain.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/poster-embednova.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/project-amr.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/project-dustbin.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/project-gesture.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/project-medibot.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/raspberry-pi-board.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/robotic-arm-banner.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/robotics-hero.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/sdg-goals-strip.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/srm-logo.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/srm-trp-college-attached.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/srm-trp-college-wordmark.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-event.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-faculty-coordinator.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-hod.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-joint-secretary.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-media.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-president.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-secretary.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-technical.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/assets/images/team-vice-president.webp` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/css/` — Current public/Admin stylesheets.
- `public/css/admin-tuneups.css` — Stylesheet for the corresponding current or legacy site area.
- `public/css/corporate.css` — Stylesheet for the corresponding current or legacy site area.
- `public/css/forms.css` — Stylesheet for the corresponding current or legacy site area.
- `public/css/style.css` — Stylesheet for the corresponding current or legacy site area.
- `public/favicon.png` — Image/brand/UI asset; may be legacy or dynamically referenced, usage not fully verified.
- `public/index.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `public/js/` — Current browser application modules and fallback content.
- `public/js/access-gate.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/admin-app.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/config.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/data/` — Current public fallback content and settings modules.
- `public/js/data/achievements.js` — Current bundled fallback content/data module.
- `public/js/data/announcements.js` — Current bundled fallback content/data module.
- `public/js/data/domains.js` — Current bundled fallback content/data module.
- `public/js/data/events.js` — Current bundled fallback content/data module.
- `public/js/data/forms.js` — Current bundled fallback content/data module.
- `public/js/data/gallery.js` — Current bundled fallback content/data module.
- `public/js/data/page-content.js` — Current bundled fallback content/data module.
- `public/js/data/projects.js` — Current bundled fallback content/data module.
- `public/js/data/resources.js` — Current bundled fallback content/data module.
- `public/js/data/site-links.js` — Current bundled fallback content/data module.
- `public/js/data/team.js` — Current bundled fallback content/data module.
- `public/js/forms.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/icons.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/layout.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/main.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/render.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/search.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/site-guards.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/store.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/theme.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/ui.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/js/vendor/` — Vendored third-party browser code and license.
- `public/js/vendor/heic2any-LICENSE.md` — Project documentation or license/usage guidance.
- `public/js/vendor/heic2any.min.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `public/manifest.webmanifest` — Project source/configuration or static asset; detailed purpose follows from its path and filename.
- `public/pages/` — Current public page HTML shells.
- `public/pages/about.html` — Current public HTML shell for the about page.
- `public/pages/achievers.html` — Current public HTML shell for the achievers page.
- `public/pages/certificates.html` — Current public HTML shell for the certificates page.
- `public/pages/contact.html` — Current public HTML shell for the contact page.
- `public/pages/domains.html` — Current public HTML shell for the domains page.
- `public/pages/event-detail.html` — Current public HTML shell for the event-detail page.
- `public/pages/events.html` — Current public HTML shell for the events page.
- `public/pages/form.html` — Current public HTML shell for the form page.
- `public/pages/join.html` — Current public HTML shell for the join page.
- `public/pages/project-detail.html` — Current public HTML shell for the project-detail page.
- `public/pages/projects.html` — Current public HTML shell for the projects page.
- `public/pages/resources.html` — Current public HTML shell for the resources page.
- `public/pages/team.html` — Current public HTML shell for the team page.
- `public/robots.txt` — Project source/configuration or static asset; detailed purpose follows from its path and filename.
- `public/sitemap.xml` — Project source/configuration or static asset; detailed purpose follows from its path and filename.
- `README.md` — Project overview, setup/deploy, Firebase data/schema, security and operational guidance.
- `resources.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `robots.txt` — Crawler policy; root copy is legacy, public copy is current Firebase-served file.
- `scripts/` — Repository static QA and Firebase seed tools.
- `scripts/check-site.mjs` — Node.js module used by repository QA or operational tooling.
- `scripts/package.json` — Project/tooling configuration or structured data file.
- `scripts/seed.js` — JavaScript module/tooling source; inspect source for detailed behavior.
- `sms-send.html` — Standalone legacy SMS-launch utility; unrelated to current Firebase app.
- `storage.rules` — Firebase Storage access rules (deployment/bucket status uncertain).
- `style.css` — Current public base design system, components and responsive styling.
- `team.html` — Legacy root-site HTML page; not served by Firebase Hosting config.
- `vi.html` — Standalone legacy Vi-styled mock/sign-in page; unrelated to current Firebase app.
- `wrangler.jsonc` — Cloudflare Worker/asset deployment configuration (secondary/unknown status).

## PAGE-BY-PAGE INVENTORY

All current Firebase pages are under `public/`; many are static HTML shells hydrated by `public/js/main.js`, `layout.js`, `render.js` and `store.js`. Most content is read from Firestore with bundled fallback data; actual live collection contents may differ from fallback modules. Relative/internal links are same-site unless noted. The listed pages and their content are code/config inventory, not a live browser audit.

| Page / URL | Main sections and source | Links and behavior | Issues / status |
|---|---|---|---|
| Home `/` (`public/index.html`) | Hero and brand, stats, about/community, technical domains/tools/careers, featured projects, achievers, events/workshops, announcements/gallery/footer as mounted by JS; site-copy settings may override selected copy. | Navigation to public pages, Join, project/event details, contact, college/social destinations. | Bundled hero counters say 12 domains/2026/100%; domains fallback lists 12 items. Announcements/events fallbacks are empty. Counts/claims and live content need owner verification. Intro direction is inspired by `embedclub.org` per user correction; no claim of copied text. |
| About `/pages/about.html` | Club and department overview, mission, vision, six-stage journey, associated imagery/content. Static shell plus editable page copy and Firestore/fallback data. | Home breadcrumb, global nav/footer and contact/join paths. | Institutional statements and facilities/claims require owner confirmation; not externally verified. |
| Achievers `/pages/achievers.html` | Dynamic achievement cards and Join CTA. Fallback entries cover four claimed 2026 recognitions/projects. | Project detail links and Join. | Claims include national-level innovation, Niral Thiruvizha, HMI exposition and healthcare innovation; documentary evidence/status not independently verified. Do not treat listings as independently confirmed awards. |
| Certificates `/pages/certificates.html` | Public certificate information page. | Publicly reachable from Learning Hub certificate link and site navigation/footer where configured. | **Public**, as expressly required. No certificate listing or certificate issuance data is asserted here; actual listings/status **UNKNOWN**. |
| Contact `/pages/contact.html` | Department/contact/address, college logo and external college/social links; enquiry form. | `tel:` phone, college site, mailto and social links; form submission. | Uses current Firestore form path; the form UI itself does not display a sign-in control. College-auth rule dependency can block a visitor; verify end-to-end (see FORMS AND BACKEND). Contact details and social destinations require currentness verification. |
| Domains `/pages/domains.html` | Twelve technical domain descriptions, toolchain/platform cards, career paths. Data from bundled `domains.js`. | Global navigation; page anchors/search/filter behavior. | Primarily static/fallback; confirm department’s actual program/tools. |
| Events `/pages/events.html` | Current events/workshops grid; source is Firestore with fallback `events` currently empty. | Event-detail links and possible registration form links when content is populated. | Empty fallback means no bundled events; production Firestore may contain items. Do not infer current scheduled events. |
| Event detail `/pages/event-detail.html?id=…` | Selected event detail, schedule/content, registration link where event data provides one. | Back to events; event registration links to public form with event context. | Query-ID/content must exist; blank/missing event displays fallback/not-found state. Live IDs/data unverified. |
| Join `/pages/join.html` | Eligibility/process explanatory copy and membership application form (name, register number, department, year, email, phone, interests, skills, motivation, portfolio, agreement). | Form response; site navigation. | UI has no visible sign-in gate; Firestore rules require verified college identity for writes. Likely submission/access mismatch unless user already has valid Firebase auth state; not reproduced against live site. |
| Projects `/pages/projects.html` | Filterable project-card grid. Bundled fallback has six projects: Autonomous Mobile Robot; Smart Dustbin; Gesture Recognition Robotic System; MEDIBOT; IoT Smart Energy & Grid Monitor; PLC & SCADA Automated Conveyor Sorting Cell. | Project detail links; search/filter controls; links may include external code/demo URLs where data populated. | GitHub/demo URL values in fallback are empty. Project outcome/status claims are authored content, not independently validated. |
| Project detail `/pages/project-detail.html?id=…` | Project summary, image, technologies, hardware/software, working principle, outcomes/gallery from selected project record. | Back to projects; related project links and external links where configured. | Missing/invalid ID behavior and dynamic content should be checked on live page. Fallback currently includes six project records; not proof of live project state. |
| Resources / Learning Hub `/pages/resources.html` | Learning Hub, category filters, dynamic learning-resource cards and a link to Certificates. Resource fallback is bundled; resource records are college-restricted by rules. | Requires verified `@trp.srmtrichy.edu.in` access; certificate link remains public. | This is the **only access-gated public content page**. Resource media URLs/access semantics and account flow require live confirmation. Do not extend gate to Certificates. |
| Team `/pages/team.html` | Faculty and student executive-council grids from Firestore/fallback. Fallback contains two faculty and seven student entries. | Social profile links if populated, contact/Join. | Explicit design correction: email is a mail icon alongside social icons, not visible email text on team cards. Fallback LinkedIn/GitHub values are empty; verify names/roles/photos each term. |
| Public form `/pages/form.html?form=…` | Dynamic schema-driven form; definition from Firestore or fallback. Supports text/email/tel/url/date/select/textarea/checkboxes/star-rating and event context. | Success/error/closed states; optional return to event detail. | Available only when form definition is open/populated; verified-college submission rules apply. No live submission tested. |
| Custom 404 `/404.html` | Not-found shell and navigation back to site. | Home and site links. | Firebase Hosting serves it as 404 fallback page; behavior not independently probed live. |
| Admin overview `/admin/` (`index.html`) | Admin dashboard/overview and navigation. | Portal module routes; Firebase Auth. | Private portal content/actions gated by Auth and Firestore rules/roles; no public indexing intended. |
| Admin achievers `/admin/achievers.html` | Achievement management (`data-admin-page="achievements"`). | Admin navigation and CRUD actions. | Role permissions enforced by Firestore rules; production access not tested. |
| Admin admins `/admin/admins.html` | Admin accounts, roles and permissions. | Portal navigation; trusted owner scripts support account maintenance. | Sensitive administration. Auth account provisioning / external console policy details require owner verification. |
| Admin announcements `/admin/announcements.html` | Announcement management. | Portal navigation and CRUD. | Empty fallback is intentional; actual Firestore state unknown. |
| Admin events `/admin/events.html` | Event management. | Portal navigation; edit event content and related public links. | Live records unknown. |
| Admin forms `/admin/forms.html` | Form definitions, open/close, response review, CSV export and public form links (per README). | Links to public form routes. | Response workflow is Firestore, not active Google Sheets sync per project docs; confirm legacy trigger cleanup. |
| Admin gallery `/admin/gallery.html` | Gallery asset/record management. | Public gallery surfaces where enabled. | Storage bucket not currently configured according to backend README; external/static image URLs can still be used. |
| Admin projects `/admin/projects.html` | Project data/content management. | Public project cards/detail pages. | Live records unknown; validate links/images and claims before publication. |
| Admin resources `/admin/resources.html` | Learning Hub resource CRUD. | Gate-controlled public resources. | Keep resource gating separate from public Certificates. Storage rules/bucket status unknown. |
| Admin site `/admin/site.html` | Site settings, links and editable page copy. | Global public page content. | Validate changed URLs/content and publishing effect before relying on it. |
| Admin tasks `/admin/tasks.html` | Task management and assignments; optional task-email notification integration. | Admin users and optional Apps Script endpoint. | `EMBEDX_TASK_MAIL_WEB_APP_URL` is blank in checked-in config; email-notification integration should be treated as unconfigured until verified. |
| Admin team `/admin/team.html` | Faculty/student team directory management. | Public team cards; mail/social icon presentation. | Confirm role/name/email link correctness, avoiding visible email text on cards. |
| Legacy root pages (`/*.html`) | Older Neocities-era HTML pages for home/about/domains/projects/events/achievers/team/resources/contact/join/details/not-found. | Legacy relative links and old root CSS/JS/assets. | Not the current Firebase Hosting target. Retained in the repo; do not use as evidence of current live behavior. Also contains unrelated-looking `vi.html` and `sms-send.html` utilities; see risks. |

## FEATURES

| Feature | Implementation / status |
|---|---|
| Public navigation, responsive layout, breadcrumbs and footer | Implemented in current public HTML/JS/CSS. Static QA has previously passed; not a comprehensive device/browser matrix. |
| Theme | Dark default/light theme support; `theme.js` persists/toggles preference. |
| Dynamic content | Firestore reads with bundled static fallbacks for projects, events, team, achievements, gallery, resources, announcements, site links/settings and page-copy; actual production data is not represented by source alone. |
| Search/filter | Project/domain/resource and related UI modules provide filtering/search where mounted. |
| Admin portal | Firebase-authenticated portal with role/per-section permissions and modules for announcements, events, projects, team, achievements, gallery, resources, forms, site, tasks and administrators. Enforced by Firestore rules, not just hidden UI. |
| Learning Hub access | Verified college-email account (`@trp.srmtrichy.edu.in`) required. Google/password sign-in and email verification flow in `access-gate.js`; no self-service password-account UI per README. **Only Learning Hub is gated; Certificates remains public.** |
| Forms | Managed forms and submissions in Firestore, dynamic field types, validation/closed states, anti-honeypot UI, admin response review and CSV export per project documentation. Current visitor success depends on Firestore rules/Auth compatibility. |
| Search indexing/social share | Metadata, canonical URLs, Open Graph/Twitter cards, robots and sitemap files. Crawl results and custom-domain canonical policy not checked. |
| Visual effects | Reveal-on-scroll via IntersectionObserver, tilt, toast notifications, modal/lightbox, counters, brand intro/orbit and pointer ripple/hover effects; reduced-motion branches exist in styles/code. |
| Sign-out | PR #62 merged: Resources-only sign-out placement and Firebase completion/error handling/auth sync. **Done; not pending.** |
| Storage uploads | Optional/uncertain. `storage.rules` exists and workflow attempts deploy best-effort; backend README says no Firebase Storage bucket currently. Static `/assets/` and HTTPS media remain available. |
| Notifications | Optional Apps Script task email only; configured endpoint blank in current browser config. Forms email/Sheets synchronization is not active according to README. |
| PWA | Web manifest exists; install/offline service worker behavior was not identified, so offline support is **UNKNOWN / not established**. |

## FORMS AND BACKEND

- **Current public flow:** `public/js/forms.js` builds/renders managed form definitions and validates Join, enquiry and custom form submissions. `public/js/store.js` writes to Firestore using `members_applications`, `contact_messages` and `form_responses` helpers/collections; custom responses use `form_responses`. `public/js/data/forms.js` fallback has three definitions: `join` (membership), `enquiry`, and `feedback` (custom). Firestore `forms` documents may override definitions. Admin Forms page supports definitions/status and response management per README.
- **Join field schema:** full name (required), register number (optional), department, year, email, phone, interest areas, technical skills (optional), motivation, portfolio (optional), agreement. **Enquiry:** name, email, optional subject, message. **Feedback starter:** optional name/email, required 1–5 star rating, optional favorite part/improvement. Custom forms are limited/validated by the renderer (up to 25 fields; constrained key format). Do not assume these forms are presently open in production.
- **Security behavior:** Firestore rules say public content is visitor-readable except `resources`; Learning Hub resources are verified-college-only. Rules also require verified college account for application/contact/form submissions, with strict validation. README says any verified college-email user with an open form link can respond without an Admin account. Public Join/Contact markup does not visibly initiate sign-in. Therefore unauthenticated visitors may see forms but fail on submit; this is a **code/config mismatch and likely UX defect**, not a live-tested failure. Check `firestore.rules`, form submission path and current Auth session before changing access requirements.
- **Data and collections:** public-content collections include `events`, `projects`, `team`, `gallery`, `announcements`, `achievements`; `resources` is restricted. Admin/operational collections include `admin_roles`, `tasks`, `forms`, `form_responses`, page-content/site-link/settings records and deletion tombstones. Legacy `members_applications` and `contact_messages` data is retained per README. Exact live collection inventory/data volume: **UNKNOWN**. Firestore rules/indexes are root `firestore.rules` and `firestore.indexes.json`; duplicated backend bundle copies exist.
- **Other services:** no required Firebase Cloud Functions. Root `function/api/join.js` and `function/api/inquiry.js` are Cloudflare Pages-style POST handlers that forward payloads to `APPS_SCRIPT_URL`; Wrangler config points at `_worker.js`. These handlers are **not** the current public forms’ Firestore path. Their deployed status and endpoint configuration are unknown. `backend-bundle/appsscript/forms-sync.gs` is legacy Sheets-sync cleanup source; task mail is separate and Firebase-ID-token-verified per README. Apps Script deployments/triggers are outside repository and **UNKNOWN**.
- **Environment/config names only:** `APPS_SCRIPT_URL` (Cloudflare functions); `ASSETS` (Wrangler static assets binding); `FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS` (trusted Admin SDK scripts); `FIREBASE_SERVICE_ACCOUNT_JSON` (CI job env populated from secret); `FIREBASE_SERVICE_ACCOUNT_EMBEDX_CLUB_EEE` (GitHub secret name); Firebase browser config field/property names in `public/js/config.js`; `EMBEDX_TASK_MAIL_WEB_APP_URL` (optional endpoint, checked-in value empty); `FIREBASE_API_KEY` (Apps Script Project Properties key name). **No values are reproduced.**
- **Security caveats:** Firebase browser config includes project identifiers and a browser API key by design; no secret values are copied into this status file. Keep service-account JSON/private credentials outside public assets and Git. README recommends restricting the web key by referrer/API and enabling App Check; actual Google Cloud/App Check enforcement is **UNKNOWN**. Static Hosting cannot make public files private; if Learning Hub files are in the static asset tree, Firestore gating alone does not protect direct file URLs. Current Resource asset storage/access design needs review.
- **Database setup/seed:** `scripts/seed.js` and duplicate `backend-bundle/scripts/seed.js` are trusted Admin SDK tools, non-destructive per README; do not run without approved credentials and explicit environment configuration. Some current content is also in bundled modules under `public/js/data/` and `backend-bundle/data/`.

## DESIGN SYSTEM

- **Brand:** EMBEDX circular logo/emblem is the intended mark. User correction requires a circular EMBEDX logo and standardized official SRM TRP college logo, not inconsistent legacy marks. Current public shell references `embedx-circle-logo.webp`/circle favicon and `srm-trp-college-attached.png`; actual official-logo asset provenance/approval should be verified with the college.
- **Color tokens (from `public/css/style.css`):** dark background `#08060c`; layered backgrounds `#0e0b15`, `#171226`; light background `#f7f5fa`; purple accents `#a855f7`, `#8b5cf6`; gold accents `#d4af37`; light-mode accent variants `#7c3aed`, `#a16207`. Semantic text/border/surface variables also exist in CSS. These are source defaults, not verified contrast audit results.
- **Typography:** Google Fonts-loaded Sora and Inter; CSS fallback families include Space Grotesk and system fonts. HTML links current Google fonts for Sora/Inter. External font availability/network behavior was not tested.
- **Spacing:** CSS custom-property scale called out in source: `0.5rem`, `0.9rem`, `1.4rem`, `2.2rem`, `3.4rem`, `5rem` (named `--sp-*`); page layouts also use fluid/clamp values and some inline spacing.
- **Shape:** common radii 10px, 16px, 24px and pill/full-round controls. Glass/dark cards, gradients, borders and shadows form the visual style.
- **Responsive/accessibility:** responsive grids and nav layouts; skip links, labels, focus/support semantics and reduced-motion handling are present in current pages/modules. A full keyboard, contrast, screen-reader or device audit is **NOT DONE**.
- **Animation/interaction:** CSS keyframes include `toast-in`, `brandIntroRise`, `brandOrbit`, `cursorRipple`; JS/CSS add scroll reveal, hover/tilt, animated counters, toast, modal/lightbox. Reduced-motion branches exist. Performance and motion preferences should be manually audited.

## CHRONOLOGICAL CHANGE LOG

| Date / reference | Change or evidence | Status / caveat |
|---|---|---|
| Earlier work on branch `arena/673cb90d-embedx-website` (exact commit date not established here) | Adjusted Resources-only sign-out placement, Firebase sign-out completion/error handling and auth sync; updated asset cache-busting references and static checks. | Committed as `c6c550f` (“Fix Resources sign-out and auth sync”), pushed, PR #62 opened. Static QA previously passed for 27 HTML pages and 25 JS modules; `git diff --check` passed. |
| 2026-11-10T18:59:45Z (GitHub PR metadata) | PR #62 merged. | Verified `MERGED`; branch from prior work no longer current session branch. |
| 2026-11-10T18:59:48Z created; job ended 19:00:39Z | GitHub Actions run `42880775797` deployed to Firebase Hosting live, head `ea8b596a1b772df48204f2e5fb8303b3e6401a17`; successful conclusion. | Run timestamp is after system date 2026-11-05; discrepancy retained. Run step reports deploy success, but optional Storage deploy may fail without failing job. |
| 2026-11-11 (Git commit metadata; exact timezone not established) | Current branch inspected at merge commit `ea8b596a1b772df48204f2e5fb8303b3e6401a17`, merging PR #62. | Current branch `arena/d7b0134a-embedx-website` was clean at inspection. Commit date is later than system date; do not infer a corrected date. |
| This status-document task (snapshot 2026-11-05) | Repository/config/page/data inspection and creation of this one Markdown inventory. | Work in this file only; facts represent repo/GitHub metadata inspected. Live content, Forms, Cloudflare and account configuration not functionally audited. |

No open PRs were returned by `gh pr list --state open` at query time. Older PR #60 Cloudflare Worker check failed while Firebase Hosting preview/live deploys succeeded; Cloudflare state remains unverified. The exact chronological dates for several older repository changes are **UNKNOWN** from this conversation context.

## USER INSTRUCTIONS AND CORRECTIONS

- Deliver exactly one downloadable Markdown file named `EMBEDX_PROJECT_STATUS.md`, with all 13 requested sections in this exact order.
- Be factual, detailed, complete and scannable; do not invent facts. Write `UNKNOWN` or `NOT DONE` when appropriate.
- Never include API-key, password, token or service-account values. Variable/secret names and their usage locations may be listed.
- Only the Learning Hub/Resources page is access-gated; Certificates remains public. Verified college email is required for Learning Hub access. Do not invent certificate listings.
- Preserve the circular EMBEDX logo and standardized official college logo direction.
- Homepage intro should be inspired by `embedclub.org`.
- Team-card email appears as a mail icon beside social icons; do not show email text on the card.
- PR #62 sign-out fix is merged and must not be described as unfinished.

Conversation/task history available for this document is limited to the recorded branch/PR/deploy work above; no earlier user-request chronology beyond those explicit corrections was available. Any omitted conversation changes are **UNKNOWN**, not assumed absent.

## KNOWN BUGS, RISKS AND TECH DEBT

1. **Form authorization/UX mismatch (likely):** Join/Contact forms appear available without authentication affordance, while Firestore rules require verified college-authenticated writes. End-to-end reproduction has **NOT BEEN DONE**. Clarify desired public access vs college-only submission and align UI/rules without weakening validation inadvertently.
2. **Cloudflare is ambiguous:** Wrangler asset directory points at repository root, unlike Firebase’s `public/` Hosting source; deployment status is unknown. If deployed, it may expose/serve legacy root files and behave differently from the documented live site. Confirm ownership, purpose, source directory, API env and custom routes; disable or correct only with owner approval.
3. **Storage uncertainty:** docs state no Firebase Storage bucket; workflow performs best-effort rule deployment. Actual bucket/rules status unknown. Never assume Storage upload/media access works. Public static files are not protected by Firestore rules.
4. **Task email not configured in checked-in browser config:** `EMBEDX_TASK_MAIL_WEB_APP_URL` is blank; Apps Script deployment/configuration unknown. Email task notifications should not be promised until verified.
5. **Legacy Apps Script artifacts:** README says remove old Sheets sync trigger and archive former standalone coordinator mail deployment; execution is not confirmed. Old external deployments can remain active even when source is removed.
6. **CI/documentation drift:** workflow comments retain TODOs about Firebase project/secret setup even though the retrieved live run succeeded. Workflow has a best-effort Storage step. Verify actual deployed service states rather than relying on the overall success badge.
7. **Content accuracy:** 2026 project/achievement claims, team roster, institutional title/address/phone and social links are unverified externally and can become stale. Project fallback has blank GitHub/demo links. Events/announcements fallbacks are intentionally empty; production Firestore content unknown. Avoid fabricating event or certificate listings.
8. **Date inconsistency:** current environment date is 2026-11-05, but queried PR/workflow/commit metadata reports Nov 10/11 2026. Treat retrieved dates as literal and flag mismatch; do not revise dates or assert temporal ordering beyond the source data.
9. **Repository sprawl/duplicate sources:** root legacy site, `backend-bundle/` mirror, root configs and `public/` coexist. Duplicated fallback data/rules can drift. Root files are not Firebase Hosting output. Remove/archive only after confirming external deploys and historical needs.
10. **Unrelated-looking legacy files:** root `vi.html`, `sms-send.html`, `neocities.png`, generic root `style.css`, `robots.txt`, and old root assets are not current Firebase public pages (Firebase serves `public/`). `sms-send.html` contains a prefilled SMS body with a third-party address; no sensitive credential value is reproduced here. Review provenance, privacy and intended accessibility before cleanup. Root `robots.txt` may not be served by Firebase Hosting; current crawl file is `public/robots.txt`.
11. **Potentially stale/orphan assets:** several public image files lack literal references in a static text scan (e.g., apple-touch icon, EmbedNova/emblem/poster assets, some badges/logos). Runtime/dynamic Firestore URLs may refer to them; absence of literal references does not prove unused. Inventory/check before removal.
12. **Validation gap:** earlier static check covered 27 HTML pages/25 JS modules, but no live browser journey, accessibility review, link/image integrity sweep against production content, security audit, E2E form test or mobile matrix is recorded for this snapshot. `NOT DONE` for those tests.
13. **SEO/content concerns:** sitemap lists specific project-detail IDs; ensure they exist and remain canonical. No JSON-LD found in HTML scan. Canonical URLs use Firebase domain; custom-domain policy unknown. Do not infer analytics/App Check configuration from CSP or metadata.
14. **Potential sensitive user data surfaces:** forms/admin records include personal/contact information; confirm role scopes, data retention, exports and privacy notice. Exact retention policy/notice status is **UNKNOWN**.
15. **Security configuration not independently verified:** Firebase web-key referrer restriction, App Check enforcement, Auth provider settings, owner allowlist/blocking policy and production Firestore rules deployment date need console verification. A visible browser Firebase config is not itself treated as a secret.

## CONTENT STATUS

- **Current authored fallback content:** 12 technical domain items; six project records (four marked achieved/active or prototype, two development/blueprint); four achievement entries; nine team entries; a Learning Hub resource list; and three form definitions. This describes repository fallback data only, not current Firestore production content.
- **Intentionally empty fallback:** `public/js/data/announcements.js` and `events.js` export empty arrays. README says announcements should remain empty until actual notices are created. Live records unknown.
- **Project/achievement claims:** titles, technical metrics, competition names and outcomes are in authored modules and may be shown publicly if fallbacks load. Accuracy/evidence is **NOT VERIFIED**. Some detailed figures such as latency/path adherence are claims in source; this report does not independently validate them.
- **Team details:** fallback names, roles and photos are present; current-term accuracy, consent and institutional approval are **UNKNOWN**. Social handles in fallback appear empty; contact/social links elsewhere can be site settings or hard-coded defaults.
- **Resources:** bundled fallback resources cover technical topics such as embedded C, MCU registers, debugging, RTOS, MQTT, PLC, PCB and career roadmaps. Their external links/accessibility and resource freshness should be checked. Resources remain gate-protected; Certificates does not.
- **Certificates:** page is public. Actual offerings/listings, issuance process and download links are **UNKNOWN**; no certificate records have been invented here.
- **Institutional content:** club identity, college/department details, address, phone, official logo, email and external links are present in page defaults/settings. Currentness and official approval are **NOT VERIFIED**.
- **Dynamic production content:** Firestore may override or supplement fallback data. Current production document values and publication state are **UNKNOWN**; this file does not claim to have fetched them.
- **User-mandated design/content corrections:** circular EMBEDX mark; standardized official college logo; homepage intro inspired by `embedclub.org`; team-card email only as an icon beside social icons. These are constraints to preserve, not statements that each has passed a visual audit.

## PENDING AND PLANNED WORK

The repository alone does not establish that the following work has been scheduled. These are verification/follow-up items, not commitments or features in progress:

- **NOT DONE:** reconcile Firebase live Hosting behavior with the potentially blocking Join/Contact/form-response Firestore rules; test as anonymous, verified college user, wrong-domain user and admin, then decide the intended submission audience.
- **NOT DONE:** verify the deployed Firebase project/URLs, public pages, custom domain, canonical host and the current content in Firestore.
- **NOT DONE:** verify Cloudflare is unused or intentionally deployed; if active, confirm the intended public root, private/legacy-file exposure, `APPS_SCRIPT_URL`, routing and parity with Firebase. Do not change deployment without authorization.
- **NOT DONE:** confirm Storage bucket and rules status in Firebase Console and whether any content depends on Storage. Avoid initializing a paid/billing-dependent service without approval.
- **NOT DONE:** confirm Apps Script task-mail deployment/Script Properties and, separately, old Sheets-sync-trigger cleanup and former mail-deployment retirement described in README.
- **NOT DONE:** owner review of 2026 achievement/project claims, current roster, institutional contact data, social links, official college-logo asset and homepage intro reference/presentation.
- **NOT DONE:** verify public Certificates content while keeping the page public; add no records without authoritative source data.
- **NOT DONE:** review stale workflow TODO comments and document Firebase deploy/storage behavior accurately.
- **DONE for this snapshot:** `node scripts/check-site.mjs` passed (27 HTML pages, 25 JS modules, local assets/imports, JSON, rules mirrors and sitemap); `git diff --check` passed. These are static checks only. **NOT DONE:** browser/E2E/accessibility and broken-link/image checks on representative desktop/mobile flows.
- **NOT DONE:** inventory legacy root files/unused assets and duplicate backend bundle before any cleanup. Check actual external deployment consumers first.
- **NOT DONE:** verify Firebase API key restrictions, App Check enforcement, Authentication provider/account policy, security-rule deployment, personal-data retention and privacy disclosures in the relevant consoles/legal process.

## QUESTIONS

1. Is Firebase Hosting at `https://embedx-club-eee.web.app` the sole supported production host, or is Cloudflare intentionally active? If active, which site root and custom domain are authoritative?
2. Should public Join and Contact submissions truly require a verified `@trp.srmtrichy.edu.in` Firebase account, or should those specific forms permit anonymous/public submission with separate abuse controls? Current rules/UI appear misaligned.
3. Is there a configured Firebase custom domain or `firebaseapp.com` alias expected to be canonical? **UNKNOWN** from repository inspection.
4. Is Firebase Storage enabled and are any live resources/images stored there? Backend documentation says no bucket; workflow attempts a best-effort rules deploy.
5. Are the optional Apps Script task-mail deployment and `FIREBASE_API_KEY` Script Property configured? Has the old Sheets sync trigger been removed and former coordinator mail deployment retired?
6. Who verifies/approves the 2026 project and achievement claims, current team roster, contact details and official college logo? Which source is authoritative?
7. What content, if any, should appear on the public Certificates page? No listings are asserted in this report.
8. Are the root legacy site, `vi.html`, `sms-send.html`, and older branding/poster assets intentionally retained or should they be reviewed for archival/removal? This requires deployment/provenance checks first.
9. What are the current Firebase Auth providers, App Check enforcement state, web-key restrictions and policy for preventing unapproved college-auth records? These console settings are **UNKNOWN**.
10. Should the static checker or CI add guardrails for the form-auth mismatch, stale deploy TODO comments, sitemap/detail IDs, asset reachability and required public-vs-private page rules?

