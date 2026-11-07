// EMBEDX — Firebase web configuration (project: embedx-club-eee).
// Firebase web API keys are public identifiers, not credentials; never put service-account
// keys or private API tokens here. Restrict this key to the production host and Firebase
// APIs in Google Cloud Console, enforce Firebase App Check, and keep access in Security Rules.
export const firebaseConfig = {
  apiKey: "AIzaSyBwNaduceEdAcJX0uCRv2nLNVZca2OWSgA",
  authDomain: "embedx-club-eee.firebaseapp.com",
  projectId: "embedx-club-eee",
  storageBucket: "embedx-club-eee.firebasestorage.app",
  messagingSenderId: "366131139755",
  appId: "1:366131139755:web:c2e4176e31f72c0af853ee",
  measurementId: "G-Q9M6515T3M"
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Task notifications use their own owner-executed endpoint, protected by Firebase ID-token checks.
const EMBEDX_TASK_MAIL_WEB_APP_URL = "";
export const taskMail = { url: EMBEDX_TASK_MAIL_WEB_APP_URL };
