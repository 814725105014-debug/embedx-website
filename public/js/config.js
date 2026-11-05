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

// Task assignment emails (optional): deploy backend-bundle/appsscript/task-mail.gs as a
// Google Apps Script web app, then paste its /exec URL and the TOKEN you chose here.
// Leave url empty to skip emailing (tasks still work).
export const taskMail = {
  url: "https://script.google.com/macros/s/AKfycbwtjgkFIK5QJi50cgnC1ZbTwuyfBS2y7KPc9aCSNlMHzziFbfs3DNQMHcPzn7KMwEDppg/exec",
  token: "embedx-task-mail-2026-x7p9"
};
