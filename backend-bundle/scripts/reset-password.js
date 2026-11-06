#!/usr/bin/env node
// EMBEDX owner tool — set a new TEMPORARY password for a portal login and force change at next login.
// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//   export FIREBASE_PROJECT_ID=embedx-club-eee
//   node reset-password.js <email> <newTempPassword>
const admin = require("firebase-admin");
async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !email.includes("@") || !password) { console.error("Usage: node reset-password.js <email> <newTempPassword>"); process.exit(1); }
  if (password.length < 8) { console.error("Use a temporary password of at least 8 characters."); process.exit(1); }
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("Set FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS first."); process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
  const mail = email.toLowerCase();
  const u = await admin.auth().getUserByEmail(mail);
  const roleDoc = await admin.firestore().collection("admin_roles").doc(mail).get();
  const isOwner = mail === "814725105014@trp.srmtrichy.edu.in";
  if (!isOwner && (!roleDoc.exists || !u.emailVerified)) {
    throw new Error("Refusing reset: target must be an email-verified portal admin.");
  }
  await admin.auth().updateUser(u.uid, { password });
  if (!isOwner) await admin.firestore().collection("admin_roles").doc(mail).set({ mustChangePassword: true }, { merge: true });
  console.log(`Temporary password set for ${mail} — they must change it at next login.`);
}
main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
