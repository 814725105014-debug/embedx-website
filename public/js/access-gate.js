// Site-wide sign-in gate for verified SRM TRP Engineering College addresses.
import { firebaseConfig, isConfigured } from "./config.js?v=20261110-domain-access";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
const COLLEGE_EMAIL = /^[^\s@]+@trp\.srmtrichy\.edu\.in$/i;
let firebasePromise;

function collegeEmail(email) { return COLLEGE_EMAIL.test(String(email || "").trim()); }

async function firebaseAuth() {
  if (!firebasePromise) firebasePromise = (async () => {
    const [appMod, authMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`)
    ]);
    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
    return { auth: authMod.getAuth(app), authMod };
  })();
  return firebasePromise;
}

export async function requireCollegeAccess() {
  document.body.classList.add("site-access-pending");
  const gate = document.createElement("main");
  gate.id = "collegeAccessGate";
  gate.className = "college-access-gate";
  gate.setAttribute("aria-labelledby", "collegeAccessTitle");
  gate.innerHTML = `
    <section class="card glass college-access-card">
      <img src="/assets/images/embedx-emblem.webp" alt="EMBEDX emblem" width="64" height="64" />
      <p class="eyebrow">SRM TRP Engineering College</p>
      <h1 id="collegeAccessTitle">College sign-in required</h1>
      <p class="muted">This website is for verified <strong>@trp.srmtrichy.edu.in</strong> accounts. Sign in, or create an account with your college email and verify it to continue.</p>
      <form id="collegeAccessLogin" novalidate>
        <div class="field"><label for="collegeAccessEmail">College email</label><input id="collegeAccessEmail" type="email" autocomplete="username" placeholder="name@trp.srmtrichy.edu.in" required /></div>
        <div class="field"><label for="collegeAccessPassword">Password</label><input id="collegeAccessPassword" type="password" autocomplete="current-password" minlength="8" required /></div>
        <p id="collegeAccessError" class="error-msg" role="alert" aria-live="assertive"></p>
        <p id="collegeAccessNotice" class="muted college-access-notice" role="status" aria-live="polite"></p>
        <div class="college-access-actions">
          <button id="collegeAccessSignIn" class="btn btn-primary" type="submit">Sign in</button>
          <button id="collegeAccessSignUp" class="btn btn-ghost" type="button">Create account</button>
        </div>
        <button id="collegeAccessForgot" class="btn btn-ghost btn-sm college-access-forgot" type="button">Forgot password?</button>
      </form>
      <section id="collegeAccessVerify" class="college-access-verify" hidden>
        <h2>Verify your college email</h2>
        <p id="collegeAccessVerifyText" class="muted"></p>
        <div class="college-access-actions">
          <button id="collegeAccessCheck" class="btn btn-primary" type="button">I verified — continue</button>
          <button id="collegeAccessResend" class="btn btn-ghost" type="button">Resend verification email</button>
        </div>
        <button id="collegeAccessSignOut" class="btn btn-ghost btn-sm college-access-forgot" type="button">Use another email</button>
      </section>
      <p class="college-access-footnote">The site app requires a verified Firebase account. Only @trp.srmtrichy.edu.in addresses are accepted.</p>
    </section>`;
  document.body.append(gate);

  const $ = (selector) => gate.querySelector(selector);
  const errorNode = $("#collegeAccessError");
  const noticeNode = $("#collegeAccessNotice");
  const loginForm = $("#collegeAccessLogin");
  const emailInput = $("#collegeAccessEmail");
  const passwordInput = $("#collegeAccessPassword");
  const verifyPanel = $("#collegeAccessVerify");
  const setError = (message = "") => { errorNode.textContent = message; };
  const setNotice = (message = "") => { noticeNode.textContent = message; };
  const showLogin = (message = "") => {
    loginForm.hidden = false;
    verifyPanel.hidden = true;
    setError(message);
  };
  const showVerification = (user) => {
    loginForm.hidden = true;
    verifyPanel.hidden = false;
    setError("");
    $("#collegeAccessVerifyText").textContent = `A verification link was sent to ${user.email}. Verify that address, then return here and continue.`;
  };
  const errorMessage = (error) => ({
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists for this address. Sign in or reset the password.",
    "auth/weak-password": "Choose a password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled for this Firebase project. Contact the site administrator."
  })[error?.code] || error?.message || "Authentication failed. Please try again.";

  if (!isConfigured) {
    showLogin("The sign-in service is not configured. Access remains locked; contact the site administrator.");
    return new Promise(() => {});
  }

  let auth, authMod;
  try { ({ auth, authMod } = await firebaseAuth()); }
  catch (error) {
    showLogin(`Could not connect to the sign-in service: ${error.message}`);
    return new Promise(() => {});
  }

  let granted = false;
  let checkingUser = false;
  let resolveAccess;
  const access = new Promise((resolve) => { resolveAccess = resolve; });
  const checkUser = async (candidate) => {
    if (checkingUser) return;
    checkingUser = true;
    try {
      if (!candidate) {
        if (granted) { location.reload(); return; }
        showLogin();
        setNotice("");
        return;
      }
      await candidate.reload().catch(() => {});
      const user = auth.currentUser || candidate;
      const email = String(user.email || "").trim().toLowerCase();
      if (!collegeEmail(email)) {
        await authMod.signOut(auth).catch(() => {});
        if (granted) { location.reload(); return; }
        showLogin("Only verified @trp.srmtrichy.edu.in email addresses can use this website.");
        return;
      }
      if (!user.emailVerified) {
        if (granted) { await authMod.signOut(auth).catch(() => {}); location.reload(); return; }
        showVerification(user);
        return;
      }
      // Refresh claims so Firestore rules can confirm email_verified on every request.
      await user.getIdToken(true);
      if (granted) return;
      granted = true;
      gate.remove();
      document.body.classList.remove("site-access-pending");
      resolveAccess(user);
    } catch (error) {
      showLogin(`Could not verify account access: ${error.message}`);
    } finally { checkingUser = false; }
  };

  authMod.onAuthStateChanged(auth, (user) => { void checkUser(user); });
  window.addEventListener("embedx:college-signout", async () => {
    await authMod.signOut(auth).catch(() => {});
    location.reload();
  });
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError(""); setNotice("");
    const email = emailInput.value.trim().toLowerCase();
    if (!collegeEmail(email)) { setError("Use your @trp.srmtrichy.edu.in college email."); return; }
    const button = $("#collegeAccessSignIn");
    button.disabled = true; button.textContent = "Signing in…";
    try { await authMod.signInWithEmailAndPassword(auth, email, passwordInput.value); }
    catch (error) { setError(errorMessage(error)); }
    finally { button.disabled = false; button.textContent = "Sign in"; }
  });
  $("#collegeAccessSignUp").addEventListener("click", async () => {
    setError(""); setNotice("");
    const email = emailInput.value.trim().toLowerCase();
    if (!collegeEmail(email)) { setError("Use your @trp.srmtrichy.edu.in college email."); return; }
    if (passwordInput.value.length < 8) { setError("Choose a password with at least 8 characters."); return; }
    const button = $("#collegeAccessSignUp");
    button.disabled = true; button.textContent = "Creating account…";
    try {
      const credential = await authMod.createUserWithEmailAndPassword(auth, email, passwordInput.value);
      await authMod.sendEmailVerification(credential.user);
      showVerification(credential.user);
      setNotice("Account created. Check your inbox for the verification link.");
    } catch (error) { setError(errorMessage(error)); }
    finally { button.disabled = false; button.textContent = "Create account"; }
  });
  $("#collegeAccessForgot").addEventListener("click", async () => {
    setError(""); setNotice("");
    const email = emailInput.value.trim().toLowerCase();
    if (!collegeEmail(email)) { setError("Enter your @trp.srmtrichy.edu.in email first."); return; }
    try {
      await authMod.sendPasswordResetEmail(auth, email);
      setNotice("If an account exists, a password reset email has been sent.");
    } catch (error) { setError(errorMessage(error)); }
  });
  $("#collegeAccessCheck").addEventListener("click", () => {
    setError(""); setNotice("");
    if (auth.currentUser) void checkUser(auth.currentUser);
    else showLogin("Sign in again after verifying your email.");
  });
  $("#collegeAccessResend").addEventListener("click", async () => {
    setError(""); setNotice("");
    try {
      if (!auth.currentUser) throw new Error("Sign in again to resend the verification link.");
      await authMod.sendEmailVerification(auth.currentUser);
      setNotice(`A new verification link was sent to ${auth.currentUser.email}.`);
    } catch (error) { setError(errorMessage(error)); }
  });
  $("#collegeAccessSignOut").addEventListener("click", async () => {
    await authMod.signOut(auth).catch(() => {});
    showLogin("Signed out. Sign in with a verified college account.");
    setNotice("");
  });
  return access;
}
