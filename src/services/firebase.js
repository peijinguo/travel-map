import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const observeAuth = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const signInWithGoogle = () => {
  if (!auth) throw new Error("firebase-not-configured");
  return signInWithPopup(auth, new GoogleAuthProvider());
};

export const signInAnonymous = () => {
  if (!auth) throw new Error("firebase-not-configured");
  return signInAnonymously(auth);
};

export const signOutGoogle = () => (auth ? signOut(auth) : Promise.resolve());

const withSyncTimeout = (promise, timeoutMs = 6000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(
        () => reject(new Error("cloud-sync-timeout")),
        timeoutMs,
      );
    }),
  ]);

export async function loadPlannerCloud(syncSpaceId) {
  if (!db) return null;
  const snapshot = await withSyncTimeout(
    getDoc(doc(db, "syncSpaces", syncSpaceId, "appData", "planner")),
  );
  return snapshot.exists() ? snapshot.data() : null;
}

export async function savePlannerCloud(syncSpaceId, data) {
  if (!db) return;
  const sanitizedData = JSON.parse(JSON.stringify(data));
  await setDoc(
    doc(db, "syncSpaces", syncSpaceId, "appData", "planner"),
    { ...sanitizedData, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function subscribePlannerCloud(syncSpaceId, onData, onError) {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "syncSpaces", syncSpaceId, "appData", "planner"),
    (snapshot) => onData(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

// Store menus live in their own document, keyed by itinerary item id, so a
// menu saved on one device reaches everyone in the space at once and a stale
// itinerary save elsewhere can never overwrite it.
const menusDoc = (syncSpaceId) =>
  doc(db, "syncSpaces", syncSpaceId, "appData", "menus");

export async function saveMenuCloud(syncSpaceId, itemId, menu) {
  if (!db) return;
  await setDoc(
    menusDoc(syncSpaceId),
    {
      items: { [itemId]: JSON.parse(JSON.stringify(menu ?? [])) },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeMenusCloud(syncSpaceId, onData, onError) {
  if (!db) return () => {};
  return onSnapshot(
    menusDoc(syncSpaceId),
    (snapshot) => onData(snapshot.exists() ? snapshot.data().items ?? {} : {}),
    onError,
  );
}

export async function loadResortNoteCloud(syncSpaceId, noteId) {
  if (!db) return null;
  const snapshot = await withSyncTimeout(
    getDoc(
      doc(db, "syncSpaces", syncSpaceId, "notes", encodeURIComponent(noteId)),
    ),
  );
  return snapshot.exists() ? snapshot.data().text ?? "" : null;
}

export async function saveResortNoteCloud(syncSpaceId, noteId, text) {
  if (!db) return;
  await setDoc(
    doc(db, "syncSpaces", syncSpaceId, "notes", encodeURIComponent(noteId)),
    {
      text,
      updatedAt: serverTimestamp(),
    },
  );
}

export function subscribeResortNoteCloud(
  syncSpaceId,
  noteId,
  onData,
  onError,
) {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "syncSpaces", syncSpaceId, "notes", encodeURIComponent(noteId)),
    (snapshot) =>
      onData(snapshot.exists() ? snapshot.data().text ?? "" : null),
    onError,
  );
}
