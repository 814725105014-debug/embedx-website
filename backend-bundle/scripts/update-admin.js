#!/usr/bin/env node
// EMBEDX owner tool — rename a portal admin and move their verified login to a new college email.
// This must run on a trusted owner machine with Firebase Admin SDK credentials; never from the browser.
// Usage: node update-admin.js <currentEmail> <newEmail> ["New Display Name"]
const admin = require("firebase-admin");
const COLLEGE_EMAIL = /^[^\s@]+@trp\.srmtrichy\.edu\.in$/i;
const OWNER_EMAIL = "814725105014@trp.srmtrichy.edu.in";

async function main() {
  const [currentArg, nextArg, ...nameParts] = process.argv.slice(2);
  const currentEmail = String(currentArg || "").trim().toLowerCase();
  const nextEmail = String(nextArg || "").trim().toLowerCase();
  const nextName = nameParts.join(" ").trim();
  if (!COLLEGE_EMAIL.test(currentEmail) || !COLLEGE_EMAIL.test(nextEmail) || currentEmail === nextEmail) {
    throw new Error('Usage: node update-admin.js <current@trp.srmtrichy.edu.in> <new@trp.srmtrichy.edu.in> ["New Display Name"]');
  }
  if (currentEmail === OWNER_EMAIL) throw new Error("The allowlisted owner login cannot be renamed by this tool.");
  if (nextName && (nextName.length < 2 || nextName.length > 80)) throw new Error("Display name must be 2–80 characters.");
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (projectId !== "embedx-club-eee" || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Set FIREBASE_PROJECT_ID=embedx-club-eee and GOOGLE_APPLICATION_CREDENTIALS on a trusted owner machine.");
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const auth = admin.auth();
  const db = admin.firestore();
  const oldRef = db.collection("admin_roles").doc(currentEmail);
  const nextRef = db.collection("admin_roles").doc(nextEmail);
  const [user, oldRole, nextRole] = await Promise.all([
    auth.getUserByEmail(currentEmail), oldRef.get(), nextRef.get()
  ]);
  if (!oldRole.exists) throw new Error(`No portal role exists for ${currentEmail}. Nothing was changed.`);
  const roleData = oldRole.data();
  if (!user.emailVerified && roleData.emailVerificationRequired !== true) {
    throw new Error("Refusing to move an unverified account. Only the account holder or a previously pending email change may be updated.");
  }
  if (nextRole.exists) throw new Error(`A portal role already exists for ${nextEmail}. Nothing was changed.`);
  try {
    await auth.getUserByEmail(nextEmail);
    throw new Error(`A Firebase Auth login already exists for ${nextEmail}. Nothing was changed.`);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  const oldAuth = { email: user.email, emailVerified: user.emailVerified, displayName: user.displayName || "" };
  const newName = nextName || roleData.name || user.displayName || "";
  let authChanged = false;
  try {
    await auth.updateUser(user.uid, { email: nextEmail, emailVerified: false, ...(newName ? { displayName: newName } : {}) });
    authChanged = true;
    const verificationLink = await auth.generateEmailVerificationLink(nextEmail);
    const tasksMoved = await db.runTransaction(async (tx) => {
      const tasksQuery = db.collection("tasks").where("assigneeEmail", "==", currentEmail);
      const [freshOld, freshNext, taskSnap] = await Promise.all([
        tx.get(oldRef), tx.get(nextRef), tx.get(tasksQuery)
      ]);
      if (!freshOld.exists) throw new Error("The current role changed during this operation. Contact the Firebase owner before retrying.");
      if (freshNext.exists) throw new Error(`A role was just created for ${nextEmail}; refusing to overwrite it.`);
      if (taskSnap.size > 498) throw new Error("This admin has more than 498 individually assigned tasks; migrate task assignments in smaller reviewed batches before changing email.");
      const migrated = {
        ...freshOld.data(),
        name: newName,
        emailVerificationRequired: true,
        emailUpdatedAt: new Date().toISOString()
      };
      tx.create(nextRef, migrated);
      tx.delete(oldRef);
      taskSnap.docs.forEach((task) => tx.update(task.ref, { assigneeEmail: nextEmail }));
      return taskSnap.size;
    });
    console.log(`Auth email and portal role moved from ${currentEmail} to ${nextEmail}; ${tasksMoved} task assignment(s) carried over.`);
    console.log("Send this verification link to the new address using a private channel; never post it publicly:");
    console.log(verificationLink);
    console.log("The account remains locked out of the portal until the new mailbox is verified.");
  } catch (err) {
    if (authChanged) {
      try {
        await auth.updateUser(user.uid, {
          email: oldAuth.email,
          emailVerified: oldAuth.emailVerified,
          displayName: oldAuth.displayName
        });
      } catch (rollbackError) {
        throw new Error(`${err.message}. Auth rollback also failed (${rollbackError.message}); inspect Firebase Auth and admin_roles before retrying.`);
      }
    }
    throw err;
  }
}

main().catch((err) => {
  console.error("Admin update failed:", err.message);
  process.exit(1);
});
