# EMBEDX Backend bundle — Firestore + owner tooling

This folder mirrors the Firebase rules and trusted owner scripts used by the website
project `embedx-club-eee`. The published Firebase Hosting site is in `../public/`.
No Cloud Functions are required.

## Contents

- `firestore.rules`: public content reads, per-admin writes, scoped task access, and validated forms.
- `storage.rules`: section-scoped image uploads, for projects where Firebase Storage is initialized.
- `firestore.indexes.json`: indexes used by the site.
- `data/`: seed-source modules (kept in sync with `public/js/data/`).
- `scripts/seed.js`: adds missing starter documents in six public content collections plus standard form definitions; never overwrites existing documents or seeds gallery photos.
- `scripts/create-admin.js`, `grant-admin.js`, `reset-password.js`, `update-admin.js`: trusted Admin SDK owner tools.
- `appsscript/task-mail.gs`: separate Firebase-token-verified task-email endpoint. `appsscript/forms-sync.gs` only removes any old Sheets sync trigger; it no longer copies responses.

## Seed content

The seeder adds missing docs in six public content collections and the `forms`
configuration collection (`join`, `enquiry`, `feedback`). It never seeds
gallery photos, form responses, `admin_roles`, or tasks. Announcements are intentionally
empty until real notices are written. On owner sign-in, the portal automatically adds
missing starter docs without overwriting existing edits or requiring Storage. Permanent
Firestore deletion tombstones keep intentionally deleted starter items from being
resurrected by portal sync or the trusted CLI seeder.

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
and Hosting independently of Storage. Firestore reads now require a verified
`@trp.srmtrichy.edu.in` email. The public UI supports Email/Password account
creation and email verification; enable the Email/Password provider in Firebase Auth:

```bash
npm i -g firebase-tools
firebase login
firebase use embedx-club-eee
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
# If a Storage bucket is enabled, also deploy its college-only read rules:
# firebase deploy --only storage
```

The project currently has no Firebase Storage bucket. Do not initialize Storage if
Firebase Console asks you to enable billing; static `/assets/` files and HTTPS image
URLs work without it. If a bucket is later initialized on an approved plan, deploy
the college-domain restrictions with `firebase deploy --only storage` as well.
Firebase Hosting serves static files directly, so server-side/edge access control is
still required if those files themselves must be private.

## Forms and responses

Admin → Forms & responses manages built-in and custom forms, editable questions,
open/close controls, response review, CSV export, and visible copyable public links.
Any verified college-email user with an open form link can respond without an Admin
account. Responses are stored in Firestore. Existing `members_applications`, `contact_messages`, and
`form_responses` data is retained and remains available in the admin portal. No
Google Sheets response sync runs.

The old Apps Script project may still have an installed one-minute trigger. Push the
updated sources with `npm run apps-script:push`, then open that project as the owner
and run `removeEmbedxSheetsSync()` once to delete the old trigger and its local sheet
ID property. If the old trigger fires first, the compatibility callback performs the
same cleanup without syncing or emailing form responses. Existing spreadsheet files
and Firestore records are not deleted. The separate `task-mail.gs` endpoint remains
unchanged; keep its web-app deployment and configuration in place.

## Firebase API key and browser security

The Firebase web `apiKey` in `public/js/config.js` is necessarily visible in browser
DevTools; it identifies the Firebase project and is not an authorization secret. Never
put service-account JSON, private keys, OAuth refresh tokens, or shared mail passwords
in public code. Restrict the web key in Google Cloud Console to the production website
HTTP referrers and only the Firebase APIs this app uses (use a separate key for local
development). Configure Firebase App Check for the web app and enable enforcement for
Authentication, Firestore, and Storage after validating the production site. Firestore
and Storage Security Rules remain the authorization boundary; a visible web key must
never grant data access by itself.

The optional task-mail Apps Script now reads its Firebase web key from the project's
Script Properties (`FIREBASE_API_KEY`), not from checked-in source. Set it in Apps
Script → Project Settings → Script Properties before redeploying that endpoint.

## Task-email source

Task notifications remain a separate, optional Apps Script web-app deployment.
Disable any older deployment that used an exposed shared token, then deploy the
checked-in project as a Web app that executes as the project owner and is available
to Anyone. The endpoint still verifies the Firebase ID token,
active Admin role, task permission, recipient and daily limits on every request. Set
only that deployment's `/exec` URL in `EMBEDX_TASK_MAIL_WEB_APP_URL`; no shared mail
token or service credential belongs in the website.

## Retire the former coordinator mail deployment

The owner must archive the old standalone Official Mail Apps Script web-app deployment
in Apps Script → Deploy → Manage deployments after the website removal is published.
Removing its source from this repository does not disable an already deployed web app.
Leave the separate `task-mail.gs` deployment untouched. The retired Forms-to-Sheets trigger is cleaned up by `removeEmbedxSheetsSync()`.
