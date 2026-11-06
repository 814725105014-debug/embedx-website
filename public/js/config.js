// EMBEDX — Firebase configuration (project: embedx-club-eee).
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

// Set only the /exec URL from the restricted, user-executed official-mail deployment.
// OAuth tokens and Google credentials never belong in website config.
const EMBEDX_MAIL_WEB_APP_URL = "";
// Task notices retain a separate owner-executed endpoint, protected by Firebase ID-token checks.
const EMBEDX_TASK_MAIL_WEB_APP_URL = "";
export const mailWorkspace = { url: EMBEDX_MAIL_WEB_APP_URL };
export const taskMail = { url: EMBEDX_TASK_MAIL_WEB_APP_URL };
