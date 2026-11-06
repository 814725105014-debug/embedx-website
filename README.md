# EMBEDX — Embedded Systems & Automation Club Website

Official website of **EMBEDX**, the technical club of the Department of Electrical and
Electronics Engineering (EEE), SRM TRP Engineering College, Tiruchirappalli.

A responsive, motion-rich dark glassmorphism website for EMBEDX, rebuilt as **vanilla
HTML/CSS/JS with ES modules — no build step** — hosted on **Firebase Hosting** with
**Cloud Firestore** as the backend for events, projects, team and form submissions.
The design keeps the club's signature black, white, purple and gold palette, with
accessible light/dark themes, glossy surfaces, smoother transitions and mobile-first layouts.

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
  css/style.css          ← base design system and responsive components
  css/corporate.css      ← motion, glossy interaction and mobile-responsive polish
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
.firebaserc              ← default Firebase project ID (`embedx-club-eee`)
firestore.rules          ← security rules
firestore.indexes.json   ← composite indexes
scripts/seed.js          ← add-missing-only seed for public content and form definitions
scripts/check-site.mjs   ← no-dependency HTML/link/module/config QA
backend-bundle/          ← deployable rules + owner scripts + Apps Script mailer
.github/workflows/       ← GitHub Hosting deploy workflows (need a configured service-account secret)
```

## 2. Local development (no build step)

```bash
cd public && python3 -m http.server 8080
# open http://localhost:8080
```

Any static server works. ES modules load natively; the Firebase SDK v10 is imported
from the official CDN (`https://www.gstatic.com/firebasejs/10.12.5/`).

Run the built-in static QA check (Node.js only; no install/build step):

```bash
node scripts/check-site.mjs
```

## 3. Connect Firebase (one-time setup)

> Already wired for the club project **`embedx-club-eee`** (config, `.firebaserc`,
> sitemap and robots). When cloning for another project, update the Firebase web
> config, project ID, and canonical domain together.

1. Create a Firebase project (Spark/free plan is enough) → add a **Web app**.
2. Paste the `firebaseConfig` object into **`public/js/config.js`**.
3. Put the project id in **`.firebaserc`** (`projects.default`) and update the production URLs in the sitemap, robots file, canonical links, and task-mail script.
4. Enable **Cloud Firestore** and **Firebase Authentication → Email/Password** in the console.
5. Deploy the checked Firestore rules before enabling production forms/admin. Firebase Storage is optional for this Spark deployment; do not enable billing just to create a bucket. The admin supports static or HTTPS image URLs while Storage is unavailable.

Until step 2 is done the site runs in *static fallback mode*: every section renders
from `public/js/data/*.js` and forms show a friendly "backend not connected" toast.

## 4. Deploy

```bash
npm i -g firebase-tools
firebase login
firebase use <PROJECT_ID>
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
# Only after Firebase Storage is initialized on the chosen plan:
# firebase deploy --only storage
```

Live URL: **https://<PROJECT_ID>.web.app** (plus *.firebaseapp.com).

### Seed the database (once)

```bash
cd scripts && npm install          # firebase-admin, gitignored
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json   # never commit
export FIREBASE_PROJECT_ID=<PROJECT_ID>
node seed.js
```

Seeds seven public content collections (`announcements`, `events`, `projects`,
`team`, `gallery`, `resources`, `achievements`) plus starter form definitions using
stable document IDs. It only creates missing IDs and preserves existing Firestore
documents, so rerunning it will not overwrite admin edits. `announcements` is
intentionally empty until real notices are written. Form responses, admin roles, and
tasks are never seeded. Owner-only **Restore missing content** and **Seed standard
forms** controls can initialize content from the admin portal without a service
account. Gallery images use bundled assets, not Firebase Storage.

> Alternative: add/edit documents manually in **Firebase Console → Firestore**.

## 5. Managing content via Firestore Console

| Collection | Fields | Notes |
|---|---|---|
| `events` | `title, date, venue, description, imageUrl, registrationLink, isUpcoming, type, subtitle, tagline, order, featured, tracks[], faqs[], …` | `order` = sort order. Rich fields (`tracks`, `faqs`, `skillsDeveloped`, `contactInfo`) power the detail page. |
| `projects` | `title, description/shortDesc, tags[], imageUrl, githubUrl, demoUrl, order, category, status, featured, highlight, hardware[], software[], outcomes[], gallery[]` | `featured: true` shows on the home page. |
| `team` | `name, role, year, photoUrl, linkedin, github, order, group ("faculty" / "student"), focus, bio, department` | `group` splits the team page sections. |
| `gallery` | `imageUrl, caption, order` | written by the admin portal; home-page gallery + lightbox |
| `resources` | `title, category, level, tags[], desc, url, order` | written by the admin portal; Learning Hub; optional HTTPS resource links |
| `achievements` | `badge, title, subtitle, description, image, team, institution, projectId, highlights[], order` | written by the admin portal; Hall of Achievers |
| `announcements` | `title, kind, body, pinned, createdAt` | written by the admin portal; home notice board (pinned first) |
| `forms` | owner-managed form definitions, seeded with join/enquiry/EMBEDNOVA/feedback starters | public can read open/closed definitions; role-scoped admin writes |
| `form_responses` | custom registrations, surveys, and feedback (including 1–5 star ratings) | public create only while a form is open; assigned Forms admins monitor/export/delete |
| `members_applications` | written by Join + EMBEDNOVA forms | public create; assigned Forms admins monitor/export/delete |
| `contact_messages` | written by Contact form | public create; assigned Forms admins monitor/export/delete |
| `site_settings/forms` | Google Sheets sync URL and last-run health | Forms admins can read; owner/Apps Script owner writes |
| `site_settings/site` | Public logo, official portal, phone, email, and social links | Public read; assigned `site` admins write through Website settings |

Image URLs should be **root-absolute local paths** (`/assets/images/foo.webp`) or
HTTPS URLs. The admin image editor accepts either; file upload/crop is available
only when a Firebase Storage bucket exists and the project can use it. Keep this
Spark setup on static/HTTPS image references until then. If Firestore is unreachable,
the site falls back to bundled static data; an intentionally empty collection stays
empty rather than resurrecting deleted content.

## 5b. Admin portal (`/admin`)

A built-in CMS at **`https://<PROJECT_ID>.web.app/admin/`** (linked in the site footer).
It includes content editing, task assignment, media editing, and owner-managed
per-admin section permissions. Navigation and URLs work without a full page reload. The Gallery page previews the bundled public-site photos and clearly shows which are already in Firestore; **Import missing photos** copies only absent starter entries so they can be captioned and reordered in Admin. Deleting a bundled gallery photo removes its Firestore entry immediately and queues a guarded GitHub pull request; the repository file is removed only after an authorized reviewer merges that PR.

Owners can also open **Website settings** in Admin to edit the public college logo, official portal URL, phone, email, and LinkedIn/Instagram/Facebook links. These values are read publicly by the shared footer, home-page portal card, and Contact page; updates appear after a page reload. Assign the `site` permission to a trusted admin if they should be able to edit these values.

Event registrations are assigned per event under **Events → Edit → Registration form**. Choose an existing form or leave the event unassigned; create custom event-specific forms under **Forms & responses → Create form**. The Forms page shows both events without an assigned form and forms not assigned to any event. Deleting a custom form clears its event assignments and removes its stored responses. Built-in Join/Enquiry schemas remain protected; use custom forms for event-specific questions.

Gallery deletion requests are processed by `.github/workflows/gallery-image-deletions.yml` on a schedule (or via **Actions → Review gallery image deletions → Run workflow**). The workflow validates that a local image file has no remaining Firestore or source-code references, removes its fallback entry, and opens or updates a GitHub PR. The GitHub-hosted file remains until that PR is reviewed and merged. This uses the existing `FIREBASE_SERVICE_ACCOUNT_EMBEDX_CLUB_EEE` GitHub secret plus the built-in Actions token; the service account must have Firestore read/write access. No GitHub token is exposed to the public Admin page.

### Creating an admin (one click)

1. Owner opens **Admins & roles**, enters the college email, name, role preset,
   temporary password, and checks the sections the new admin may access.
2. Firebase creates a new login and sends an email-verification link. No portal
   access is granted until the recipient verifies that mailbox.
3. After verification, the user signs in with the temporary password and must
   choose a new password. They only see the sections the owner granted.

An existing Auth login is **never automatically granted a role**: this prevents
an attacker from pre-creating an unverified account for someone else’s college
address. For verified existing accounts or recovery, use the trusted Admin SDK
scripts in `backend-bundle/scripts/` from a machine holding the service account.
Those scripts reject unverified accounts when granting privileges.

### Managing an assigned admin

The owner can change an admin's display name, role, section permissions, and password
reset or revoke access from **Admins & roles**. A sign-in email is the Firebase Auth
account key, so the browser intentionally cannot rewrite another user's credential.
Use the trusted Admin SDK tool from an owner machine to move an existing account:

```bash
cd backend-bundle/scripts && npm install
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export FIREBASE_PROJECT_ID=embedx-club-eee
node update-admin.js old@trp.srmtrichy.edu.in new@trp.srmtrichy.edu.in "New Display Name"
```

It preserves the role/permissions, carries over tasks assigned directly to the old
email, generates a verification link for the owner to send privately, and keeps portal
access locked until that address is verified. Keep the service-account file and
verification link private; never commit or paste them into chat.

### Task email setup

The optional Apps Script source is `backend-bundle/appsscript/task-mail.gs`.
Task email is intentionally disabled in the current website config until the old
public-token deployment is replaced. Deploy this source as a web app (Execute as
Me, access Anyone), disable the old deployment, then set the new `/exec` URL in
`public/js/config.js`. The browser sends a short-lived Firebase ID token and task
ID—not a shared secret. Apps Script verifies identity, Tasks permission, task
assignment, college-domain recipients, and duplicate/daily limits. The previously
published token must be treated as exposed.

### Security and behavior

* Firestore rules are the authority: roles and per-user `perms` are checked on
  each write. When Storage is initialized, uploads are limited to JPEG/PNG/WebP
  images under 5 MB and further scoped to the admin's section.
* Hosting adds `no-store` for `/admin/**`, frame/content-type/referrer/permissions
  headers; the admin HTML also has a restrictive Content Security Policy.
* Public join/contact writes are schema-validated and create-only. Client-side
  rate limits are a usability measure, **not** server-side abuse protection.
* The Firebase web API key is public by design; never put service-account keys,
  passwords, Apps Script credentials, or other private values in `public/`.
* Optional production hardening still requires Firebase Console configuration:
  restrict the API key to approved website referrers and configure/enforce Firebase
  App Check for the web app before relying on client-side public form writes.

### Forms, registrations, and Google Sheets

The Admin → **Forms & responses** page seeds and manages the built-in Join,
Enquiry, EMBEDNOVA registration, and Feedback forms, plus custom forms. Owners and
admins explicitly assigned the `forms` permission can edit custom questions,
open/close intake, review submissions, export CSV, and delete custom forms or
responses. Feedback forms support accessible 1–5 star rating questions. Join and
enquiry submissions stay in their existing Firestore collections and are now
visible to authorized Forms admins; public users cannot read submissions.

Create and sync the Apps Script project without manually copying any files:

```bash
cd backend-bundle/scripts
npm run apps-script:setup
```

On first run, the helper opens Google sign-in once, links to the provided standalone
project **EMBEDX CLUB NEW WEBSITE**, and uploads every checked-in `.gs` source plus
`appsscript.json` using the official `clasp` CLI. Enable the Apps Script API in your
Google account settings if prompted. For later code updates, run
`npm run apps-script:push`; this syncs the repo source as a batch (the checked-in files
are the source of truth, so online-only edits are replaced).

The one-time Google authorization still requires the project owner: open the new
project in Apps Script, run `setupEmbedxSheets()` once, and approve the requested
Firestore, Sheets, mail, and trigger scopes. It creates the spreadsheet and response
tabs, syncs every five minutes, and publishes the sheet URL and sync health to Admin
→ Forms & responses.

Deploy Firestore rules first. The Apps Script reads Firestore as the allowlisted
owner and stores only the response archive; Firestore remains the live source for
portal monitoring. Notifications and applicant confirmations are sent by the
script when a new response is synchronized. This requires no web-app URL, shared
token, Cloud Function, or Firebase billing upgrade. Share the generated sheet only
with trusted reviewers.

## 6. GitHub auto-deploy

The repository contains live and PR-preview workflows, but they need the GitHub
secret `FIREBASE_SERVICE_ACCOUNT_EMBEDX_CLUB_EEE` configured to deploy. Until that
secret is set in GitHub, deploy manually from a trusted machine:

```bash
cd ~/embedx-website-main
git pull
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
# Storage rules only after a bucket exists and plan requirements are confirmed:
# firebase deploy --only storage
```

Never paste service-account JSON into chat or commit it. Configure the secret only
through GitHub repository settings after creating/confirming the Firebase service
account and limiting its permissions appropriately.

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

* `firestore.rules` makes public content read-only to the public, applies
  per-admin write permissions, and validates create-only form payloads. Admin SDK
  tools bypass rules and must stay on trusted owner machines.
* The browser localStorage rate limit is per-device and can be bypassed; use App
  Check enforcement (Firebase Console) for stronger public-write abuse controls.
* Treat the previously published Apps Script token as compromised; the updated
  source no longer uses it. Replace the deployed Apps Script code before turning
  task notifications back on.
* **Never commit** service-account JSON, private keys, passwords, or `.env` files.
  The Firebase web config and project API key are public client configuration.
