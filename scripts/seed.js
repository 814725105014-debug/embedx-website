#!/usr/bin/env node
/**
 * EMBEDX — idempotent, non-destructive Firestore content seeder.
 * Sources mirror the public static fallback modules. Existing Firestore documents
 * are left untouched; only missing documents with stable IDs are created.
 *
 * Usage:
 *   cd scripts && npm install
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json # never commit
 *   export FIREBASE_PROJECT_ID=embedx-club-eee
 *   node seed.js
 *
 * Content collections: seven public site collections plus managed form definitions.
 * Form responses, admin roles and tasks are never seeded.
 */
const path = require("path");
const { pathToFileURL } = require("url");

const COLLECTIONS = ["announcements", "events", "projects", "team", "gallery", "resources", "achievements", "forms"];

async function loadSiteData() {
  const base = path.join(__dirname, "..", "public", "js", "data");
  const modules = await Promise.all(COLLECTIONS.map(async (name) => {
    const mod = await import(pathToFileURL(path.join(base, `${name}.js`)).href);
    return [name, mod[name]];
  }));
  return Object.fromEntries(modules);
}

function validateRows(collection, rows) {
  if (!Array.isArray(rows)) throw new Error(`${collection}: data source must export an array`);
  const seen = new Set();
  return rows.map((row, index) => {
    if (!row || typeof row !== "object" || typeof row.id !== "string" || !/^[A-Za-z0-9_-]{1,150}$/.test(row.id)) {
      throw new Error(`${collection}[${index}]: missing or invalid stable document id`);
    }
    if (seen.has(row.id)) throw new Error(`${collection}: duplicate document id "${row.id}"`);
    seen.add(row.id);
    const { id, ...data } = row;
    if ((collection === "resources" || collection === "achievements") && !Number.isFinite(data.order)) data.order = index + 1;
    return { id, data };
  });
}

async function seedMissing(db, collection, rows) {
  const records = validateRows(collection, rows);
  if (!records.length) {
    console.log(`• ${collection}: no starter documents (left empty intentionally)`);
    return { created: 0, skipped: 0 };
  }
  const existing = await db.collection(collection).get();
  const existingIds = new Set(existing.docs.map((doc) => doc.id));
  const existingGalleryImages = collection === "gallery"
    ? new Set(existing.docs.map((doc) => doc.get("imageUrl")).filter(Boolean))
    : new Set();
  const missing = records.filter(({ id, data }) =>
    !existingIds.has(id) && !(collection === "gallery" && existingGalleryImages.has(data.imageUrl))
  );
  const skipped = records.length - missing.length;
  for (let offset = 0; offset < missing.length; offset += 450) {
    const batch = db.batch();
    for (const { id, data } of missing.slice(offset, offset + 450)) {
      batch.create(db.collection(collection).doc(id), data);
    }
    await batch.commit();
  }
  console.log(`✓ ${collection}: ${missing.length} starter document(s) added; ${skipped} existing document(s) preserved`);
  return { created: missing.length, skipped };
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Set FIREBASE_PROJECT_ID=embedx-club-eee first.");
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS to a trusted, gitignored service-account file.");
  }
  if (projectId !== "embedx-club-eee") {
    throw new Error(`Refusing to seed unexpected project "${projectId}". This site is configured for embedx-club-eee.`);
  }
  const admin = require("firebase-admin");
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const data = await loadSiteData();
  const db = admin.firestore();
  const totals = { created: 0, skipped: 0 };
  for (const name of COLLECTIONS) {
    const result = await seedMissing(db, name, data[name]);
    totals.created += result.created;
    totals.skipped += result.skipped;
  }
  console.log(`Seed complete for ${projectId}: ${totals.created} added, ${totals.skipped} preserved.`);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err.message);
  process.exit(1);
});
