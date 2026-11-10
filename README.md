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
backend-bundle/          ← deployable rules + owner scripts + task/forms Apps Script automation
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
4. Enable **Cloud Firestore** and Firebase Authentication sign-in providers **Google** and **Email/Password**. The site offers Google sign-in (with the college domain sent as an account-chooser hint and checked after sign-in) or an administrator-provisioned email/password login. There is no self-service password-account creation or password reset in the site UI.
5. Deploy the checked Firestore rules before enabling the site: all content reads and form writes require a verified college-domain account. Deploy Storage rules too if a bucket is enabled. Firebase Storage is optional for this Spark deployment; do not enable billing just to create a bucket. The admin supports static or HTTPS image URLs while Storage is unavailable.

Until step 2 is done the access gate remains locked because Firebase Authentication is required; configure the web app before testing the site. Bundled data remains the content fallback after an authorized sign-in.

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

Seeds six public content collections (`announcements`, `events`, `projects`,
`team`, `resources`, `achievements`) plus starter form definitions using stable
document IDs. It does not seed the Gallery. The seeder only creates missing IDs and
preserves existing Firestore documents, so rerunning it will not overwrite admin
edits. `announcements` is intentionally empty until real notices are written. Form responses, admin roles, and
tasks are never seeded. On owner sign-in, the Admin portal automatically syncs missing
starter records without a service account. Permanent Firestore tombstones prevent
intentionally deleted starter records from being re-added by that sync or the trusted
CLI seeder. Use the Admin delete action for permanent removal; deleting a starter
document directly in Firebase Console is treated as missing content and will be
repaired at the next owner sign-in. Gallery images use bundled assets, not Firebase
Storage.

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
| `forms` | owner-managed form definitions, seeded with Join, Enquiry, and Feedback forms | verified college-email users can read definitions; role-scoped admin writes |
| `form_responses` | new built-in/custom submissions, registrations, surveys, and feedback (including ratings) | public create only while the matching form is open; assigned Forms admins monitor/export/delete |
| `members_applications` | legacy Join submissions and fallback writes when no managed definition exists | public create; assigned Forms admins monitor/export/delete |
| `contact_messages` | legacy Contact submissions and fallback writes when no managed definition exists | public create; assigned Forms admins monitor/export/delete |
| `site_settings/site` | Website logo, official portal, phone, email, and social links | Verified college-email read; assigned `site` admins write through Website settings |

Image URLs should be **root-absolute local paths** (`/assets/images/foo.webp`) or
HTTPS URLs. The admin image editor accepts either; file upload/crop is available
only when a Firebase Storage bucket exists and the project can use it. Keep this
Spark setup on static/HTTPS image references until then. If Firestore is unreachable,
the site falls back to bundled data for supported sections; the Gallery has no bundled
starter-photo fallback. Admin deletions create Firestore tombstones so automatic starter
sync cannot resurrect seeded content.

## 5b. Admin portal (`/admin`)

A built-in CMS at **`https://<PROJECT_ID>.web.app/admin/`** (linked in the site footer).
It includes content editing, task assignment, media editing, and owner-managed
per-admin section permissions. Navigation and URLs work without a full page reload.
On owner sign-in, missing bundled starter records are synced automatically for
supported content sections; existing Firestore edits are preserved, and tombstones
protect Admin-deleted starter records. The Gallery is upload-only and has no bundled
starter-photo status panel or GitHub deletion queue. Deleting a gallery entry removes
its public Firestore record; repository images are left untouched.

Owners can also open **Website settings** in Admin to edit the public college logo, official portal URL, phone, email, and LinkedIn/Instagram/Facebook links. These values are read publicly by the shared footer, home-page portal card, and Contact page; updates appear after a page reload. Assign the `site` permission to a trusted admin if they should be able to edit these values.

Event registrations are assigned per event under **Events → Edit → Registration form**. Choose an existing form or leave the event unassigned; create custom event-specific forms under **Forms & responses → Create form**. The Forms page shows both events without an assigned form and forms not assigned to any event. Deleting a custom form clears its event assignments and removes its stored responses. Built-in Join/Enquiry schemas remain protected; use custom forms for event-specific questions.

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

### College-only website access

The public pages accept Google sign-in or an administrator-provisioned email/password account. Google sign-in sends `hd=trp.srmtrichy.edu.in` to Google's account chooser as a hint; the app then checks the returned address, and Firestore/Storage rules enforce a verified `@trp.srmtrichy.edu.in` address. The site has no self-service password-account creation or reset UI; provision password users through trusted admin tooling. However, enabling Firebase Email/Password also leaves Firebase's account-creation API available outside this UI. Firebase also automatically creates an Auth user record the first time a person signs in with Google. Preventing new Auth records and restricting sign-in to accounts you provision requires an Auth blocking function and an admin-managed allowlist (Identity Platform); the chooser hint and hidden UI alone are not an access-control boundary. Public pages are marked `noindex`.

In Firebase Console, enable **Google** and **Email/Password** under Authentication → Sign-in method, and add the production custom domain under Authentication → Settings → Authorized domains. Google sign-in must also be configured for the Firebase project.

Firebase Hosting still serves static HTML, JavaScript, and bundled assets directly
by URL; the sign-in gate protects the rendered app and Firestore/Storage data, but it
is not a server-side lock on static files. For strict file-level privacy, the hosting
origin must also be put behind an authenticated edge such as Cloudflare Access or
another server-side identity proxy.

### Forms and responses

Admin → **Forms & responses** manages the built-in Join and Enquiry forms as well
as custom forms. Forms admins can edit built-in questions, add or remove questions,
open/close intake, review submissions, export CSV, and delete custom forms or
responses. Each form shows its public URL, a one-click **Copy link** action, and an
open/preview link. Any verified college-email user with the link can fill an open
form without an Admin account. Built-in forms render their current Firestore definition and save
new submissions in Firestore; the previous `members_applications` and
`contact_messages` records remain readable alongside the newer responses. Public
clients cannot read submissions. No response-to-Google-Sheets sync runs; CSV export
is available from the admin portal.

The former Apps Script Sheets sync has been retired. After publishing the updated
Apps Script sources, the owner should open the existing Apps Script project and run
`removeEmbedxSheetsSync()` once to remove its old one-minute trigger. The compatibility
callback also removes the trigger without copying or emailing responses the next time
it fires. This cleanup leaves existing Firestore responses and any already-created
spreadsheet file untouched. The separate task-email Apps Script endpoint is unchanged.

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
