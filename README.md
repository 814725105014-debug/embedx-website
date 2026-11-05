# EMBEDX — Embedded Systems & Automation Club Website

Official website of **EMBEDX**, the technical club of the Department of Electrical and
Electronics Engineering (EEE), SRM TRP Engineering College, Tiruchirappalli.

Dark glassmorphism redesign (2026) of the legacy static site, rebuilt as **vanilla
HTML/CSS/JS with ES modules — no build step** — hosted on **Firebase Hosting** with
**Cloud Firestore** as the backend for events, projects, team and form submissions.

> The legacy Neocities-era source is preserved untouched at the repository root
> (`index.html`, `about.html`, `assets/`, `css/`, `js/`, `_worker.js`, …).
> The new site lives entirely in `public/` + the Firebase config files below.

---

## 1. Repository layout

```
public/                  ← Firebase Hosting root (the new site)
  index.html             ← home (hero, about, domains, projects, events, gallery, join, contact)
  404.html               ← custom Firebase 404 ("Circuit Disconnected")
  pages/                 ← about, domains, projects, project-detail, events,
                           event-detail, achievers, team, resources, join, contact
  css/style.css          ← entire design system (tokens, glass, motion, responsive)
  js/
    config.js            ← ⭐ paste your Firebase web config here
    store.js             ← Firestore-first data layer with static fallback
    layout.js            ← navbar / mobile menu / footer / theme toggle
    ui.js                ← reveal, tilt, toasts, modal, lightbox, counters
    render.js            ← card renderers + skeleton loaders
    forms.js             ← validation, honeypot, rate limit, Firestore writes
    main.js              ← per-page router/renderer
    data/*.js            ← static fallback content (also the seed source)
  assets/images/         ← WebP-optimized images, logos, favicon
  sitemap.xml, robots.txt
firebase.json            ← hosting + cache headers + clean URLs + firestore pointers
.firebaserc              ← default project id (replace placeholder!)
firestore.rules          ← security rules
firestore.indexes.json   ← composite indexes
scripts/seed.js          ← one-time Firestore seed (firebase-admin)
.github/workflows/       ← auto-deploy: live on merge to main, preview per PR
```

## 2. Local development (no build step)

```bash
cd public && python3 -m http.server 8080
# open http://localhost:8080
```

Any static server works. ES modules load natively; the Firebase SDK v10 is imported
from the official CDN (`https://www.gstatic.com/firebasejs/10.12.5/`) **only when a
config is present**.

## 3. Connect Firebase (one-time setup)

1. Create a Firebase project (Spark/free plan is enough) → add a **Web app**.
2. Paste the `firebaseConfig` object into **`public/js/config.js`**.
3. Put your project id in **`.firebaserc`** (`projects.default`) — or run `firebase use --add`.
4. Replace `REPLACE_WITH_FIREBASE_PROJECT_ID` in `public/sitemap.xml` and `public/robots.txt`.
5. Enable **Cloud Firestore** (production mode) in the console.

Until step 2 is done the site runs in *static fallback mode*: every section renders
from `public/js/data/*.js` and forms show a friendly "backend not connected" toast.

## 4. Deploy

```bash
npm i -g firebase-tools
firebase login
firebase use <PROJECT_ID>
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
```

Live URL: **https://<PROJECT_ID>.web.app** (plus *.firebaseapp.com).

### Seed the database (once)

```bash
cd scripts && npm install          # firebase-admin, gitignored
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json   # never commit
export FIREBASE_PROJECT_ID=<PROJECT_ID>
node seed.js
```

Writes `events`, `projects`, `team` with stable document IDs (idempotent — safe to
re-run after editing `public/js/data/*.js`). Form collections stay empty by design.

> Alternative: add/edit documents manually in **Firebase Console → Firestore**.

## 5. Managing content via Firestore Console

| Collection | Fields | Notes |
|---|---|---|
| `events` | `title, date, venue, description, imageUrl, registrationLink, isUpcoming, type, subtitle, tagline, order, featured, tracks[], faqs[], …` | `order` = sort order. Rich fields (`tracks`, `faqs`, `skillsDeveloped`, `contactInfo`) power the detail page. |
| `projects` | `title, description/shortDesc, tags[], imageUrl, githubUrl, demoUrl, order, category, status, featured, highlight, hardware[], software[], outcomes[], gallery[]` | `featured: true` shows on the home page. |
| `team` | `name, role, year, photoUrl, linkedin, github, order, group ("faculty" / "student"), focus, bio, department` | `group` splits the team page sections. |
| `gallery` | `imageUrl, caption, order` | written by the admin portal; home-page gallery + lightbox |
| `resources` | `title, category, level, tags[], desc` | written by the admin portal; Learning Hub |
| `achievements` | `badge, title, subtitle, description, image, team, institution, projectId` | written by the admin portal; Hall of Achievers |
| `announcements` | `title, kind, body, pinned, createdAt` | written by the admin portal; home notice board (pinned first) |
| `members_applications` | written by the Join + EMBEDNOVA forms | create-only; read via Console export |
| `contact_messages` | written by the Contact form | create-only |

Image URLs in Firestore should be **root-absolute** (`/assets/images/foo.webp`).
If Firestore is unreachable or a collection is empty, the site silently falls back
to the static data modules — the site never breaks.

## 5b. Admin portal (`/admin`)

A built-in CMS at **`https://<PROJECT_ID>.web.app/admin/`** (link in the site footer).
Club admins can publish and edit, with instant effect on the live site:

* **Announcements** — notice board on the home page (pinned first)
* **Events** — create/edit/delete, upcoming & featured flags, poster upload
* **Projects** — full card + detail content, tags, cover upload
* **Team** — faculty/student members, photos, roles
* **Gallery** — add/replace/delete photos with captions and ordering
* **Resources & Achievers** — Learning Hub guides and Hall-of-Achievers cards
* Live **content counters** per collection at the top of the dashboard

Photo workflow: pick a file → in-browser editor (rotate, crop aspect 1:1 / 4:3 /
16:9 / 3:4, max-width resize) → exported as optimized **WebP** → uploaded to
Firebase Storage (`images/<collection>/…`) → URL saved on the document.

### Creating an admin (one-time, per person)

1. Firebase Console → **Authentication → Users → Add user** (email + password).
   Keep the Email/Password provider enabled; no other providers needed.
2. Grant the custom claim (backend repo):
   ```bash
   cd ../embedx-backend/scripts && npm install
   export GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json
   export FIREBASE_PROJECT_ID=<PROJECT_ID>
   node grant-admin.js admin@yourcollege.edu
   ```
3. The admin signs in at `/admin`. Security is enforced server-side:
   `firestore.rules` and `storage.rules` require `request.auth.token.admin == true`
   for every write — the portal UI is only a convenience layer.

Form submissions (`members_applications`, `contact_messages`) remain create-only
and are **not** readable from the portal; export them from the Firebase Console.

### Security hardening shipped with the portal

* **Content-Security-Policy** meta on every page (no inline scripts — the theme
  bootstrap lives in `js/theme.js`; SDK only from `www.gstatic.com`).
* Admin = Firebase Auth **plus** either the `admin` custom claim or the
  bootstrap owner email allowlisted in `firestore.rules` / `storage.rules`
  (`814725105014@trp.srmtrichy.edu.in`). Rotate that password regularly and
  never share it — anyone with it + the email can publish content.
* Storage writes: admin-only, images ≤5 MB; form collections create-only.
* Site-wide search (Ctrl/⌘+K), scroll progress and back-to-top respect
  `prefers-reduced-motion`.

## 6. GitHub auto-deploy

`.github/workflows/firebase-hosting-merge.yml` deploys the **live channel** on every
merge to `main`; `firebase-hosting-pull-request.yml` posts a **preview URL** on each PR.

Finish the wiring (creates the service-account secret automatically):

```bash
firebase init hosting:github     # pick your project; accepts existing files
```

or manually: Google Cloud Console → IAM → create a service account with
`Firebase Admin` role → download JSON → GitHub repo → Settings → Secrets →
`FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` (paste the whole JSON), then replace the
placeholder strings in both workflow files.

## 7. Custom domain + migrating from Neocities

1. Firebase Console → Hosting → **Add custom domain** (e.g. `embedx.club`) →
   add the shown TXT record (ownership) and A/AAAA records (`151.101.1.195` /
   `151.101.1.195` via `@` and `www` CNAME to `<PROJECT_ID>.web.app`) at your DNS
   provider. SSL cert auto-provisions in ~1 h.
2. Keep the old Neocities site live for a while with a banner:
   *"EMBEDX has moved to https://your-domain — update your bookmarks!"* plus a
   `<meta http-equiv="refresh" content="6; url=https://your-domain">` in its
   `index.html` so old links forward visitors.
3. Neocities cannot 301-redirect per-path; the meta-refresh + banner is the
   standard approach there. After a semester, retire the Neocities site.

## 8. Rollback

* Hosting keeps every release: `firebase hosting:channel:list` / console → Hosting →
  **Roll back** to any previous version (instant).
* Or CLI: `firebase hosting:clone <PROJECT_ID>:<old-version> <PROJECT_ID>:live`.
* Rules/indexes: redeploy an older commit with `firebase deploy --only firestore:rules`.

## 9. Design system cheatsheet

All tokens live at the top of `public/css/style.css` (`:root` and `[data-theme="light"]`):
colors (`--cyan`, `--violet`, `--grad`), spacing (`--sp-1…6`), radii, shadows, fluid
type scale (`clamp()`), fonts (Sora + Inter). Theme preference persists in
`localStorage["embedx-theme"]`. Motion respects `prefers-reduced-motion`.

## 10. Security notes

* `firestore.rules`: public **read** on `events/projects/team`; **create-only** with
  strict type/length validation on `members_applications` and `contact_messages`;
  everything else denied. Admin/seed writes use the Admin SDK (bypasses rules).
* Forms add a honeypot field, client validation, and a localStorage rate limit
  (3 submissions / 10 min / device).
* **Never commit** service-account JSON or `.env` files — both are gitignored.
