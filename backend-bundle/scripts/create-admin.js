#!/usr/bin/env node
// EMBEDX — create a portal login (Firebase Auth user) AND assign its role in one step.
// Usage:
//   cd scripts && npm install
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json   # NEVER commit
//   export FIREBASE_PROJECT_ID=embedx-club-eee
//   node create-admin.js <email> <password> <role> [display name...]
// Roles: president | hod | event_coordinator | social_media | technical (owner is allowlisted separately)
// Existing accounts are granted access only if Firebase marks the email as verified.
// New accounts require the owner to share the generated verification link privately.
const admin = require("firebase-admin");
const ROLES = ["president", "hod", "event_coordinator", "social_media", "technical"];
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
  if (!/^[^\s@]+@trp\.srmtrichy\.edu\.in$/i.test(mail)) throw new Error("Admins must use a @trp.srmtrichy.edu.in college email.");
  let user, isNew = false;
  try {
    user = await admin.auth().createUser({ email: mail, password, displayName: name || undefined, emailVerified: false });
    isNew = true;
    console.log(`Auth login created: ${mail}`);
  } catch (e) {
    if (e.code !== "auth/email-already-exists") throw e;
    user = await admin.auth().getUserByEmail(mail);
    if (!user.emailVerified) {
      throw new Error(`Refusing to grant portal access: ${mail} already exists but is not email-verified. Verify mailbox ownership first.`);
    }
    console.log(`Verified Auth login found: ${mail} (password unchanged)`);
  }

  const roleData = {
    role, name, addedBy: "create-admin.js", addedAt: new Date().toISOString(),
    emailVerificationRequired: isNew
  };
  if (isNew) roleData.mustChangePassword = true;
  await admin.firestore().collection("admin_roles").doc(mail).set(roleData, { merge: true });
  console.log(`Role "${role}" assigned to ${mail}.`);
  if (isNew) {
    const link = await admin.auth().generateEmailVerificationLink(mail);
    console.log("Send this verification link to the intended user using a private channel (do not post it publicly):");
    console.log(link);
    console.log("After they verify, they sign in with the temporary password and choose a new one.");
  } else {
    console.log("The verified existing account can sign in at /admin with its existing password.");
  }
}
main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
