#!/usr/bin/env node
/**
 * EMBEDX backend — idempotent Firestore seed (events, projects, team, resources, achievements).
 * Usage:
 *   cd scripts && npm install
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json   # NEVER commit
 *   export FIREBASE_PROJECT_ID=embedx-club-eee
 *   node seed.js
 */
const path = require("path");
async function loadSiteData() {
  const base = path.join(__dirname, "..", "data");
  const [projects, events, team, resources, achievements] = await Promise.all([
    import(path.join(base, "projects.js")).then((m) => m.projects),
    import(path.join(base, "events.js")).then((m) => m.events),
    import(path.join(base, "team.js")).then((m) => m.team),
    import(path.join(base, "resources.js")).then((m) => m.resources),
    import(path.join(base, "achievements.js")).then((m) => m.achievements)
  ]);
  return { projects, events, team, resources, achievements };
}
async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) { console.error("Set FIREBASE_PROJECT_ID first."); process.exit(1); }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) { console.error("Set GOOGLE_APPLICATION_CREDENTIALS first."); process.exit(1); }
  const admin = require("firebase-admin");
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const db = admin.firestore();
  const data = await loadSiteData();
  for (const [name, rows] of Object.entries(data)) {
    const batch = db.batch();
    for (const row of rows) { const { id, ...doc } = row; batch.set(db.collection(name).doc(id), doc, { merge: true }); }
    await batch.commit();
    console.log(`ok ${name}: ${rows.length} docs`);
  }
  console.log("Seed complete. Form collections stay empty (create-only).");
}
main().catch((e) => { console.error("Seed failed:", e.message); process.exit(1); });
