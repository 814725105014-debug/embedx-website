// EMBEDX — Data store: Firestore first, graceful static fallback.
import { firebaseConfig, isConfigured } from "./config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps, getApp: existing } = await import(`${SDK}/firebase-app.js`);
      return getApps().length ? existing() : initializeApp(firebaseConfig);
    })();
  }
  return appPromise;
}

async function loadCollection(name, orderField = "order") {
  if (!isConfigured) throw new Error("Firestore not configured");
  const app = await getApp();
  const { getFirestore, collection, getDocs, query, orderBy } = await import(`${SDK}/firebase-firestore.js`);
  const snap = await getDocs(query(collection(getFirestore(app), name), orderBy(orderField, "asc")));
  if (snap.empty) throw new Error(`collection ${name} is empty`);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function addDocument(name, data) {
  if (!isConfigured) throw new Error("Firestore not configured");
  const app = await getApp();
  const { getFirestore, collection, addDoc } = await import(`${SDK}/firebase-firestore.js`);
  return addDoc(collection(getFirestore(app), name), data);
}

// --- public read API with fallbacks ---
export async function getProjects() {
  try { return await loadCollection("projects"); }
  catch { const m = await import("./data/projects.js"); return m.projects; }
}
export async function getEvents() {
  try { return await loadCollection("events"); }
  catch { const m = await import("./data/events.js"); return m.events; }
}
export async function getTeam() {
  try { return await loadCollection("team"); }
  catch { const m = await import("./data/team.js"); return m.team; }
}

// --- writes (forms) ---
export async function submitApplication(data) { return addDocument("members_applications", data); }
export async function submitContact(data) { return addDocument("contact_messages", data); }
export { isConfigured };
