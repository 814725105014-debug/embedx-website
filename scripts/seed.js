#!/usr/bin/env node
/**
 * EMBEDX — one-time Firestore seed script.
 *
 * Populates `events`, `projects` and `team` from the same ES-module data that
 * powers the site's static fallback (public/js/data/*.js), i.e. from the
 * content of the legacy embedx site.
 *
 * Usage:
 *   cd scripts && npm install          # installs firebase-admin (gitignored)
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json   # NEVER commit this file
 *   export FIREBASE_PROJECT_ID=<your-project-id>
 *   node seed.js
 *
 * The service account bypasses security rules (admin SDK), so this works with
 * the shipped create-only/public-read rules. Idempotent: documents are written
 * with stable IDs (set/merge), so re-running updates rather than duplicates.
 */
const path = require("path");

async function loadSiteData() {
  const base = path.join(__dirname, "..", "public", "js", "data");
  const [projects, events, team] = await Promise.all([
    import(path.join(base, "projects.js")).then((m) => m.projects),
    import(path.join(base, "events.js")).then((m) => m.events),
    import(path.join(base, "team.js")).then((m) => m.team)
  ]);
  return { projects, events, team };
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("✗ Set FIREBASE_PROJECT_ID env var first.");
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("✗ Set GOOGLE_APPLICATION_CREDENTIALS to your (gitignored) service-account.json.");
    process.exit(1);
  }

  const admin = require("firebase-admin");
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const db = admin.firestore();

  const { projects, events, team } = await loadSiteData();

  const writeAll = async (collection, rows) => {
    const batch = db.batch();
    for (const row of rows) {
      const { id, ...data } = row;
      batch.set(db.collection(collection).doc(id), data, { merge: true });
    }
    await batch.commit();
    console.log(`✓ ${collection}: ${rows.length} documents written`);
  };

  await writeAll("projects", projects);
  await writeAll("events", events);
  await writeAll("team", team);
  console.log("✓ Seed complete. members_applications / contact_messages are left empty (form writes only).");
}

main().catch((err) => {
  console.error("✗ Seed failed:", err.message);
  process.exit(1);
});
