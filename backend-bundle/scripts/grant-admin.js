#!/usr/bin/env node
// Grant/revoke the `admin` custom claim. (Owner email is already allowlisted in rules.)
// Usage: node grant-admin.js <email> [--revoke]
const admin = require("firebase-admin");
async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!email || !email.includes("@")) { console.error("Usage: node grant-admin.js <email> [--revoke]"); process.exit(1); }
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS) { console.error("Set FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS first."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, revoke ? { admin: false } : { admin: true });
  console.log(`${email}: admin claim ${revoke ? "revoked" : "granted"}. Sign in again to apply.`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
