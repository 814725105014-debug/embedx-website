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
- `appsscript/task-mail.gs` + `appsscript/forms-sync.gs` + `appsscript/appsscript.json`: owner-authorized Sheets sync and a separate Firebase-token-verified task-email endpoint.
- `appsscript-mail/Code.gs` + `appsscript-mail/appsscript.json`: isolated, least-privilege, coordinator-authorized official-mail bridge.
- `scripts/process-image-deletion-requests.mjs`: validates Admin Gallery asset deletions and stages safe repository removals for a GitHub PR; `.github/workflows/gallery-image-deletions.yml` runs it with a private Firebase service-account secret.

## Seed content

The seeder adds missing docs in seven public content collections and the `forms`
configuration collection (`join`, `enquiry`, `embednova`, `feedback`). It never seeds
form responses, `admin_roles`, or tasks. Announcements are intentionally empty until
real notices are written. The gallery source refers to images already deployed under
`public/assets/images/`. On owner sign-in, the portal automatically adds missing
starter docs without overwriting existing edits or requiring Storage. Permanent
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

Task notifications remain a separate, optional Apps Script web-app deployment from the
coordinator mail bridge. Disable any older deployment that used an exposed shared
token, then deploy the checked-in project as a Web app that executes as the project
owner and is available to Anyone. The endpoint still verifies the Firebase ID token,
active Admin role, task permission, recipient and daily limits on every request. Set
only that deployment's `/exec` URL in `EMBEDX_TASK_MAIL_WEB_APP_URL`; no shared mail
token or service credential belongs in the website.

## Official mail workspace

The Admin → Official mail page supports To, CC and BCC, the coordinator directory,
additional addresses, and optional official file attachments. It sends through the
signed-in coordinator's own Google mailbox, with a branded EMBEDX / SRM TRP HTML
message. The Apps Script server independently verifies the Firebase ID token, active
Admin role, explicit/legacy `mail` permission, matching Google sender, recipient and
attachment limits, and daily quota. Google credentials and OAuth tokens are never
stored in Hosting or Firestore. HOD, President, and coordinator role presets include
`mail`; for older Admin records that already have an explicit `perms` array, the owner
must check **Official mail** in Admins & roles. Each coordinator must sign into their
college Google account and approve the Apps Script Gmail authorization once.

After the reviewed website and rules changes are published, run the dependency-free
mail security checks locally, then create the dedicated, least-privilege mail project
from `backend-bundle/scripts/`:

```bash
npm run test:mail
npm run apps-script:deploy-mail
```

On first run, `apps-script:deploy-mail` uses `clasp` to create a separate standalone
**EMBEDX Official Mail Workspace** Apps Script project, push only `appsscript-mail/`,
create a version, and deploy it. Sign in with a college-domain Google account and
enable the Apps Script API if prompted. The dedicated manifest requests only external
HTTP, Gmail send, mail quota, and user-email scopes; it does not expose the Forms/Sheets
project to coordinators. Confirm the generated deployment is a Web app, runs as **User
accessing the web app**, and is restricted to the college domain. Never change this
mail deployment to execute as the owner, because that would send coordinators' mail
from the owner's mailbox. Copy its generated `/exec` URL into
`EMBEDX_MAIL_WEB_APP_URL` in `public/js/config.js`, then publish the website update.

For later Apps Script source updates, pull the reviewed repository change, run
`npm run apps-script:mail-push`, then use Apps Script → Deploy → Manage deployments to
edit the existing mail deployment to a new version. Keep its execution/access settings
and URL so `public/js/config.js` does not need another change. Do not reuse that URL for
task notices: task mail remains a separate owner-executed deployment, configured only
through `EMBEDX_TASK_MAIL_WEB_APP_URL`.


Each coordinator opens Admin → Official mail → **Authorize Google mailbox**, signs in
with the same college email used for EMBEDX Admin, and approves Gmail access. The
workspace verifies the Google identity against their Firebase Admin email before
re-enabling Send. The Apps Script project owner separately continues to run
`setupEmbedxSheets()` once for Forms & responses; that owner-authorized time trigger
continues to run as its installer.
