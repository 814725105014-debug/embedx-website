#!/usr/bin/env node
// EMBEDX — create a portal login (Firebase Auth user) AND assign its role in one step.
// Usage:
//   cd scripts && npm install
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json   # NEVER commit
//   export FIREBASE_PROJECT_ID=embedx-club-eee
//   node create-admin.js <email> <password> <role> [display name...]
// Roles: president | hod | event_coordinator | social_media | technical | owner
// If the Auth user already exists, only the role is (re)assigned — the password is left untouched.
const admin = require("firebase-admin");
const ROLES = ["owner", "president", "hod", "event_coordinator", "social_media", "technical"];
async function main() {
  const [email, password, role, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(" ");
  if (!email || !email.includes("@") || !password || !role) {
    console.error('Usage: node create-admin.js <email> <password> <role> ["Display Name"]');
    process.exit(1);
  }
  if (!ROLES.includes(role)) { console.error(`Role must be one of: ${ROLES.join(", ")}`); process.exit(1); }
  if (password.length < 8) { console.error("Use a password of at least 8 characters (they can change it later)."); process.exit(1); }
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("Set FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS first.");
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
  const mail = email.toLowerCase();
  let uid;
  try {
    const u = await admin.auth().createUser({ email: mail, password, displayName: name || undefined });
    uid = u.uid;
    console.log(`Auth login created: ${mail}`);
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      uid = (await admin.auth().getUserByEmail(mail)).uid;
      console.log(`Auth login already existed: ${mail} (password unchanged)`);
    } else throw e;
  }
  await admin.firestore().collection("admin_roles").doc(mail).set(
    { role, name, addedBy: "create-admin.js", addedAt: new Date().toISOString() },
    { merge: true }
  );
  console.log(`Role "${role}" assigned to ${mail}. They can sign in at /admin now.`);
  console.log("Tip: ask them to change the temporary password after first login (Firebase Console → Authentication → user → reset email, or re-create).");
}
main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
