// Learning Hub sign-in gate for verified SRM TRP Engineering College addresses.
import { firebaseConfig, isConfigured } from "./config.js?v=20261110-domain-access";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
const COLLEGE_EMAIL = /^[^\s@]+@trp\.srmtrichy\.edu\.in$/i;
const VERIFIED_SESSION_KEY = "embedx.verified-college-session.v1";
let firebasePromise;

function collegeEmail(email) { return COLLEGE_EMAIL.test(String(email || "").trim()); }
function readVerifiedSession() {
  try {
    const value = JSON.parse(localStorage.getItem(VERIFIED_SESSION_KEY) || "null");
    return value && typeof value.uid === "string" && collegeEmail(value.email) ? value : null;
  } catch { return null; }
}
function clearVerifiedSession() {
  try { localStorage.removeItem(VERIFIED_SESSION_KEY); } catch { /* storage may be unavailable */ }
}
function rememberVerifiedSession(user) {
  try { localStorage.setItem(VERIFIED_SESSION_KEY, JSON.stringify({ uid: user.uid, email: user.email })); }
  catch { /* Firebase auth remains the source of truth if storage is unavailable */ }
}
function refreshIdTokenBriefly(user, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    Promise.resolve().then(() => user.getIdToken(true)).then(finish, finish);
  });
}
function waitForInitialUser(auth, authMod, timeoutMs = 10000) {
  return new Promise((resolve) => {
    let done = false;
    let unsubscribe = () => {};
    const finish = (user) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(user || null);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    const stop = authMod.onAuthStateChanged(auth, finish, () => finish(null));
    unsubscribe = stop;
    if (done) unsubscribe();
  });
}

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
  window.addEventListener("embedx:college-signout", async () => {
    clearVerifiedSession();
    try {
      const { auth, authMod } = await firebaseAuth();
      await authMod.signOut(auth).catch(() => {});
    } finally { location.reload(); }
  }, { once: true });
  window.addEventListener("storage", (event) => {
    if (event.key === VERIFIED_SESSION_KEY && !event.newValue) location.reload();
  });

  let existingAuth = null;
  const cachedSession = readVerifiedSession();
  if (cachedSession && isConfigured) {
    // Reuse Firebase's persisted local session without a full-screen gate or forced network refresh.
    document.body.classList.remove("site-access-pending");
    try {
      existingAuth = await firebaseAuth();
      const user = await waitForInitialUser(existingAuth.auth, existingAuth.authMod);
      const email = String(user?.email || "").trim().toLowerCase();
      if (user && user.uid === cachedSession.uid && email === cachedSession.email.toLowerCase() && user.emailVerified) {
        void user.getIdToken().catch(() => {});
        return user;
      }
    } catch { /* Re-enter the normal sign-in flow if cached auth cannot be restored. */ }
    clearVerifiedSession();
  }

  document.body.classList.add("site-access-pending");
  const gate = document.createElement("main");
  gate.id = "collegeAccessGate";
  gate.className = "college-access-gate";
  gate.setAttribute("aria-labelledby", "collegeAccessTitle");
  gate.innerHTML = `
    <section class="card glass college-access-card">
      <img src="/assets/images/embedx-circle-logo.webp" alt="EMBEDX emblem" width="64" height="64" />
      <p class="eyebrow">SRM TRP Engineering College</p>
      <h1 id="collegeAccessTitle">Checking your access</h1>
      <p id="collegeAccessIntro" class="muted">Verifying your college account…</p>
      <p id="collegeAccessLoading" class="muted college-access-loading" role="status" aria-live="polite">Please wait a moment.</p>
      <button id="collegeAccessGoogle" class="btn btn-primary college-access-google" type="button" hidden>Continue with Google</button>
      <p id="collegeAccessDivider" class="college-access-divider" hidden><span>or sign in with your assigned password</span></p>
      <form id="collegeAccessLogin" novalidate hidden>
        <div class="field"><label for="collegeAccessEmail">College email</label><input id="collegeAccessEmail" type="email" autocomplete="username" placeholder="name@trp.srmtrichy.edu.in" required /></div>
        <div class="field"><label for="collegeAccessPassword">Password</label><input id="collegeAccessPassword" type="password" autocomplete="current-password" minlength="8" required /></div>
        <p id="collegeAccessError" class="error-msg" role="alert" aria-live="assertive"></p>
        <p id="collegeAccessNotice" class="muted college-access-notice" role="status" aria-live="polite"></p>
        <div class="college-access-actions">
          <button id="collegeAccessSignIn" class="btn btn-primary" type="submit">Sign in</button>
        </div>
        <p class="college-access-help">Password accounts are created and managed by the site administrator. Contact them if you need an account or password reset.</p>
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
      <p class="college-access-footnote">Only verified @trp.srmtrichy.edu.in accounts are accepted. Google sign-in suggests the college domain, and the app rejects other domains after authentication.</p>
    </section>`;
  document.body.append(gate);

  const $ = (selector) => gate.querySelector(selector);
  const errorNode = $("#collegeAccessError");
  const noticeNode = $("#collegeAccessNotice");
  const loginForm = $("#collegeAccessLogin");
  const emailInput = $("#collegeAccessEmail");
  const passwordInput = $("#collegeAccessPassword");
  const verifyPanel = $("#collegeAccessVerify");
  const titleNode = $("#collegeAccessTitle");
  const introNode = $("#collegeAccessIntro");
  const loadingNode = $("#collegeAccessLoading");
  const googleButton = $("#collegeAccessGoogle");
  const divider = $("#collegeAccessDivider");
  const setError = (message = "") => { errorNode.textContent = message; };
  const setNotice = (message = "") => { noticeNode.textContent = message; };
  const showLogin = (message = "") => {
    clearVerifiedSession();
    titleNode.textContent = "College sign-in required";
    introNode.textContent = "Sign in with your @trp.srmtrichy.edu.in Google account, or use an email and password provided by the site administrator.";
    loadingNode.hidden = true;
    googleButton.hidden = false;
    divider.hidden = false;
    loginForm.hidden = false;
    verifyPanel.hidden = true;
    setError(message);
  };
  const showVerification = (user) => {
    clearVerifiedSession();
    titleNode.textContent = "Verify your college email";
    introNode.textContent = "Your account needs email verification before you can continue.";
    loadingNode.hidden = true;
    googleButton.hidden = true;
    divider.hidden = true;
    loginForm.hidden = true;
    verifyPanel.hidden = false;
    setError("");
    $("#collegeAccessVerifyText").textContent = `The account ${user.email} has not verified its email address. Verify it using the link in your inbox, or request a new link below.`;
  };
  const errorMessage = (error) => ({
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
    "auth/account-exists-with-different-credential": "This email already has a password account. Sign in with its assigned password or ask the administrator to link Google sign-in.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/operation-not-allowed": "The requested sign-in provider is not enabled in Firebase. Contact the site administrator.",
    "auth/unauthorized-domain": "This website domain is not authorized for Firebase sign-in. Contact the site administrator."
  })[error?.code] || error?.message || "Authentication failed. Please try again.";

  if (!isConfigured) {
    showLogin("The sign-in service is not configured. Access remains locked; contact the site administrator.");
    return new Promise(() => {});
  }

  let auth, authMod;
  try { ({ auth, authMod } = existingAuth || await firebaseAuth()); }
  catch (error) {
    showLogin(`Could not connect to the sign-in service: ${error.message}`);
    return new Promise(() => {});
  }

  let granted = false;
  let checkingUser = false;
  let resolveAccess;
  const access = new Promise((resolve) => { resolveAccess = resolve; });
  const checkUser = async (candidate, refreshProfile = false) => {
    if (checkingUser) return;
    checkingUser = true;
    try {
      if (!candidate) {
        if (granted) { location.reload(); return; }
        showLogin();
        setNotice("");
        return;
      }
      if (refreshProfile) await candidate.reload();
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
      // Refresh claims once for a new verified session, but never keep the page blocked indefinitely.
      if (refreshProfile) await refreshIdTokenBriefly(user, 5000);
      else await refreshIdTokenBriefly(user);
      rememberVerifiedSession(user);
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
  $("#collegeAccessGoogle").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    setError(""); setNotice("");
    button.disabled = true; button.textContent = "Opening Google sign-in…";
    try {
      const provider = new authMod.GoogleAuthProvider();
      // `hd` guides Google's account chooser; checkUser below independently enforces the domain.
      provider.setCustomParameters({ hd: "trp.srmtrichy.edu.in", prompt: "select_account" });
      const credential = await authMod.signInWithPopup(auth, provider);
      if (!collegeEmail(credential.user.email)) {
        await authMod.signOut(auth).catch(() => {});
        setError("Choose a Google account ending in @trp.srmtrichy.edu.in.");
      }
    } catch (error) { setError(errorMessage(error)); }
    finally { button.disabled = false; button.textContent = "Continue with Google"; }
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
  $("#collegeAccessCheck").addEventListener("click", () => {
    setError(""); setNotice("");
    if (auth.currentUser) void checkUser(auth.currentUser, true);
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
