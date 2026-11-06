#!/usr/bin/env node
/**
 * Safely prepares GitHub PRs for bundled gallery files removed from Admin.
 * Runs only in trusted GitHub Actions with the Firebase service-account secret.
 */
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const projectId = process.env.FIREBASE_PROJECT_ID || "embedx-club-eee";
const credentialJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!credentialJson) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required.");
const credential = JSON.parse(credentialJson);
if (!getApps().length) initializeApp({ credential: cert(credential), projectId });
const db = getFirestore();
const imagePattern = /^\/assets\/images\/([A-Za-z0-9][A-Za-z0-9._-]*\.(?:webp|png|jpe?g|gif|svg))$/i;
const gallerySourceFiles = ["public/js/data/gallery.js", "backend-bundle/data/gallery.js"];
const contentCollections = ["events", "projects", "team", "gallery", "resources", "achievements", "site_settings"];
const textExtensions = new Set([".html", ".js", ".mjs", ".css", ".json", ".md", ".txt", ".xml", ".yml", ".yaml", ".gs"]);

function normalizeAsset(value) {
  let candidate = String(value || "").trim();
  if (/^https:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (!["embedx-club-eee.web.app", "embedx-club-eee.firebaseapp.com"].includes(url.hostname)) return "";
      candidate = url.pathname;
    } catch { return ""; }
  }
  if (!candidate.startsWith("/")) candidate = `/${candidate}`;
  return imagePattern.test(candidate) ? candidate : "";
}

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => collectStrings(entry, output));
  return output;
}

function docReferencesAsset(value, imageUrl) {
  return collectStrings(value).some((entry) => normalizeAsset(entry) === imageUrl || entry.includes(path.posix.basename(imageUrl)));
}

async function walk(dir, result = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".firebase", ".next"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, result);
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) result.push(full);
  }
  return result;
}

function dropStarterRow(source, galleryId, imageUrl) {
  const lines = source.split(/\r?\n/);
  const matching = lines.map((line, index) => ({ line, index })).filter(({ line }) =>
    line.includes(`id: "${galleryId}"`) && line.includes(`imageUrl: "${imageUrl}"`)
  );
  if (matching.length > 1) throw new Error(`Duplicate starter gallery entry ${galleryId}.`);
  if (!matching.length) return source;
  lines.splice(matching[0].index, 1);
  return lines.join("\n");
}

async function firestoreReferences(imageUrl, galleryId) {
  const basename = path.posix.basename(imageUrl);
  const refs = [];
  for (const collectionName of contentCollections) {
    const snapshot = await db.collection(collectionName).get();
    for (const doc of snapshot.docs) {
      if (collectionName === "gallery" && doc.id === galleryId) continue;
      if (docReferencesAsset(doc.data(), imageUrl)) refs.push(`${collectionName}/${doc.id}`);
    }
  }
  return refs;
}

async function sourceReferences(imageUrl, proposedSources) {
  const basename = path.posix.basename(imageUrl);
  const refs = [];
  const files = await walk(root);
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    const contents = proposedSources.has(rel) ? proposedSources.get(rel) : await readFile(file, "utf8");
    if (contents.includes(basename)) refs.push(rel);
  }
  return refs;
}

async function updateRequest(ref, fields) {
  await ref.set({ ...fields, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function prepareRequest(doc) {
  const ref = doc.ref;
  const request = doc.data();
  const galleryId = String(request.galleryId || "");
  const imageUrl = normalizeAsset(request.imageUrl);
  if (!/^[A-Za-z0-9_-]{1,150}$/.test(galleryId) || !imageUrl) {
    await updateRequest(ref, { status: "blocked", detail: "Only safe, bundled /assets/images files can be removed by this workflow." });
    return false;
  }

  const assetPath = path.resolve(root, "public", imageUrl.slice(1));
  const imagesRoot = path.resolve(root, "public/assets/images") + path.sep;
  if (!assetPath.startsWith(imagesRoot)) {
    await updateRequest(ref, { status: "blocked", detail: "The requested asset path is outside the public images folder." });
    return false;
  }
  if (!existsSync(assetPath)) {
    await updateRequest(ref, { status: "completed", detail: "The image file was already absent from the repository." });
    return false;
  }

  const dynamicRefs = await firestoreReferences(imageUrl, galleryId);
  if (dynamicRefs.length) {
    await updateRequest(ref, { status: "blocked", detail: `Image is still referenced by: ${dynamicRefs.slice(0, 8).join(", ")}` });
    return false;
  }

  const proposedSources = new Map();
  for (const rel of gallerySourceFiles) {
    const full = path.join(root, rel);
    const source = await readFile(full, "utf8");
    proposedSources.set(rel, dropStarterRow(source, galleryId, imageUrl));
  }
  const staticRefs = await sourceReferences(imageUrl, proposedSources);
  if (staticRefs.length) {
    await updateRequest(ref, { status: "blocked", detail: `Image is still referenced in: ${staticRefs.slice(0, 8).join(", ")}` });
    return false;
  }

  for (const [rel, source] of proposedSources) await writeFile(path.join(root, rel), source.endsWith("\n") ? source : `${source}\n`);
  await unlink(assetPath);
  await updateRequest(ref, { status: "queued_for_pr", detail: "A GitHub pull request is being prepared for review." });
  console.log(`Prepared deletion of ${imageUrl} (gallery/${galleryId}).`);
  return true;
}

async function prepare() {
  const snapshot = await db.collection("asset_delete_requests").get();
  let prepared = 0;
  for (const doc of snapshot.docs) {
    const status = doc.get("status") || "pending";
    if (status === "pr_open") {
      const imageUrl = normalizeAsset(doc.get("imageUrl"));
      const assetPath = imageUrl ? path.resolve(root, "public", imageUrl.slice(1)) : "";
      if (assetPath && !existsSync(assetPath)) {
        await updateRequest(doc.ref, { status: "completed", detail: "The reviewed pull request was merged; the repository file is removed." });
      }
      continue;
    }
    if (!["pending", "queued_for_pr"].includes(status)) continue;
    if (await prepareRequest(doc)) prepared++;
  }
  console.log(`Prepared ${prepared} image deletion(s).`);
}

async function markPullRequest() {
  const url = String(process.env.IMAGE_DELETE_PR_URL || "").trim();
  if (!url) {
    console.log("No pull request URL was returned; queued requests will be retried on the next scheduled run.");
    return;
  }
  const snapshot = await db.collection("asset_delete_requests").get();
  let marked = 0;
  for (const doc of snapshot.docs) {
    if (doc.get("status") !== "queued_for_pr") continue;
    await updateRequest(doc.ref, { status: "pr_open", prUrl: url, detail: "Review and merge the linked pull request to remove this file from GitHub." });
    marked++;
  }
  console.log(`Linked ${marked} request(s) to ${url}.`);
}

const mode = process.argv[2] || "prepare";
if (mode === "prepare") await prepare();
else if (mode === "mark-pr") await markPullRequest();
else throw new Error("Usage: node process-image-deletion-requests.mjs [prepare|mark-pr]");
