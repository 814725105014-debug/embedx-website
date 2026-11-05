// EMBEDX — Firebase configuration.
// PASTE your Firebase web app config object here (Firebase Console → Project settings → Your apps).
// Until a real config is pasted, the site runs in static-fallback mode (no Firestore).
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
