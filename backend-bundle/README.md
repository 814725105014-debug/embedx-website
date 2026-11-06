# EMBEDX Backend bundle — Firestore + owner tooling

This folder mirrors the Firebase rules and trusted owner scripts used by the website
project `embedx-club-eee`. The published Firebase Hosting site is in `../public/`.
No Cloud Functions are required.

## Contents

- `firestore.rules`: public content reads, per-admin writes, scoped task access, and validated forms.
- `storage.rules`: section-scoped image uploads, for projects where Firebase Storage is initialized.
- `firestore.indexes.json`: indexes used by the site.
- `data/`: seed-source modules (kept in sync with `public/js/data/`).
- `scripts/seed.js`: adds missing starter documents in seven public content collections plus standard form definitions; never overwrites existing documents.
- `scripts/create-admin.js`, `grant-admin.js`, `reset-password.js`, `update-admin.js`: trusted Admin SDK owner tools.
- `appsscript/task-mail.gs`: optional, token-verified task-email web app source.
- `appsscript/forms-sync.gs` + `appsscript/appsscript.json`: owner-authorized Firestore-to-Sheets sync, spreadsheet creation, response notifications, and applicant confirmations.
- `scripts/process-image-deletion-requests.mjs`: validates Admin Gallery asset deletions and stages safe repository removals for a GitHub PR; `.github/workflows/gallery-image-deletions.yml` runs it with a private Firebase service-account secret.

## Seed content

The seeder adds missing docs in seven public content collections and the `forms`
configuration collection (`join`, `enquiry`, `embednova`, `feedback`). It never seeds
form responses, `admin_roles`, or tasks. Announcements are intentionally empty until
real notices are written. The gallery source refers to images already deployed under
`public/assets/images/`. The Admin → Overview restore action adds missing starter
docs without overwriting existing edits or requiring Storage.

To seed from a trusted machine (Admin SDK bypasses Firestore rules):

```bash
cd backend-bundle/scripts && npm install
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export FIREBASE_PROJECT_ID=embedx-club-eee
node seed.js
```

The seed is non-destructive: existing documents, including owner edits, are skipped.
Do not commit service-account files or paste them into chat.

## Admin accounts

The owner portal supports role/permission changes, display-name editing, password
reset emails, and access revocation. Firebase Auth sign-in emails cannot safely be
changed for another person from browser code. Use the trusted owner script instead:

```bash
cd backend-bundle/scripts && npm install
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export FIREBASE_PROJECT_ID=embedx-club-eee
node update-admin.js old@trp.srmtrichy.edu.in new@trp.srmtrichy.edu.in "New Display Name"
```

It migrates the role document and directly assigned tasks, prints a verification
link for the owner to send privately, and requires that address to be verified before
portal access. The owner allowlisted account cannot be renamed by this tool.

Other script usage:

```bash
node create-admin.js email@trp.srmtrichy.edu.in TempPass123 president "Display Name"
node reset-password.js email@trp.srmtrichy.edu.in NewTempPass123
node grant-admin.js email@trp.srmtrichy.edu.in --revoke
```

## Firebase setup and deploy

This project is intended to stay on Firebase Spark. Deploy Firestore rules/indexes
and Hosting independently of Storage:

```bash
npm i -g firebase-tools
firebase login
firebase use embedx-club-eee
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
```

The project currently has no Firebase Storage bucket. Do not initialize Storage if
Firebase Console asks you to enable billing; static `/assets/` files and HTTPS image
URLs work without it. If a bucket is later initialized on an approved plan, deploy
Storage rules with `firebase deploy --only storage`.

## Forms and Google Sheets

Admin → Forms & responses supports standard seeded forms, custom form creation,
star ratings, open/close controls, response monitoring, CSV export, and deletion.
Public forms write directly to Firestore; the portal reflects those records and
public clients cannot read them. The join and enquiry forms remain on their existing
validated collections so existing workflows are preserved.

To create and update the Apps Script project without copying source files by hand,
run this from `backend-bundle/scripts/`:

```bash
npm run apps-script:setup
```

On first run, the helper authenticates with Google, links the source folder to the
provided **EMBEDX CLUB NEW WEBSITE** project, and uploads all checked-in `.gs` files
and the manifest with `clasp`. Enable the Apps Script API in Google account settings
if prompted. Future code updates use `npm run apps-script:push`; that command
force-syncs the repo's source over the online project, so keep the repository as the
source of truth. The generated
`appsscript/.clasp.json` only links your local folder to your Apps Script project and
is intentionally git-ignored.

Deploy Firestore rules first. Then open the created project, run `setupEmbedxSheets()`
once as the allowlisted owner, and approve the requested Google Sheets, Firestore
REST, email, and time-trigger scopes. This owner-authorized step creates the
spreadsheet, installs a five-minute sync trigger, and publishes the sheet URL and
health to `site_settings/forms` for the admin portal. No Web App endpoint, shared
secret, Cloud Function, or paid Firebase service is involved. Share the generated
sheet only with trusted reviewers.

## Task-email source

Task notifications are disabled in `public/js/config.js` until the current Apps Script
source is deployed. Disable the older deployment that used the exposed shared token,
then publish `appsscript/task-mail.gs` as a web app. Configure the replacement URL
only after confirming the new deployment. Never place a shared token or service
credential in the website.
