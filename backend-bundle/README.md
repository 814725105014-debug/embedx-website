# EMBEDX Backend — Firestore + Storage (project `embedx-club-eee`)

Server-side source of truth for the [EMBEDX club website](https://github.com/814725105014-debug/embedx-website)
(Embedded Systems & Automation Club, Dept. of EEE, SRM TRP Engineering College).

```
firestore.rules            ← public read on content; admin-claim/owner-email writes; create-only forms
storage.rules              ← admin image upload/replace (≤5 MB, image/*), public read
firestore.indexes.json     ← composites (events, projects, announcements, gallery)
firebase.json / .firebaserc← project embedx-club-eee
data/                      ← canonical seed content (projects, events, team, resources, achievements)
scripts/seed.js            ← idempotent Admin-SDK seeder (stable doc IDs)
scripts/grant-admin.js     ← grant/revoke the `admin` custom claim
.github/workflows/         ← deploy rules+indexes+storage on merge to main
```

## Collections

| Collection | Write | Read | Notes |
|---|---|---|---|
| `events`, `projects`, `team`, `gallery`, `announcements`, `resources`, `achievements` | admin portal / seed | public | rendered by the site with static fallbacks |
| `members_applications`, `contact_messages` | website forms (create-only, validated) | Console export only | never readable from clients |

`isAdmin()` = Firebase Auth + (`admin` custom claim **or** bootstrap owner email
`814725105014@trp.srmtrichy.edu.in` allowlisted in both rules files).

## Setup / deploy

```bash
npm i -g firebase-tools && firebase login
firebase use embedx-club-eee
firebase deploy --only firestore:rules,firestore:indexes,storage
cd scripts && npm install
export GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json FIREBASE_PROJECT_ID=embedx-club-eee
node seed.js                       # idempotent — safe to re-run after data edits
node grant-admin.js <email>        # optional: extra admins beyond the allowlisted owner
```

CI: add repo secret `FIREBASE_SERVICE_ACCOUNT_EMBEDX_CLUB_EEE` (service-account JSON
with Firebase Admin role) in the repo's GitHub Settings → Secrets; merges to `main`
then deploy rules automatically.

## Rollback

Rules are versioned in Console → Firestore → Rules; or redeploy an older commit:
`git checkout <commit> -- firestore.rules && firebase deploy --only firestore:rules`.
