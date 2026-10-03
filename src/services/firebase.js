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
import { getFunctions, httpsCallable } from "firebase/functions";

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
const functions = app ? getFunctions(app, "asia-northeast1") : null;
const transitRouteCallable = functions
  ? httpsCallable(functions, "getTransitRoute", { timeout: 15000 })
  : null;

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

export async function loadTransitDurationCloud(
  origin,
  destination,
  departureTime,
) {
  if (!transitRouteCallable || !auth?.currentUser) return null;
  const result = await transitRouteCallable({
    origin,
    destination,
    departureTime: departureTime?.toISOString?.() ?? null,
  });
  const duration = result.data?.duration;
  if (duration) return duration;
  const seconds = Number(result.data?.durationSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours
    ? `${hours} 小時${remainder ? ` ${remainder} 分鐘` : ""}`
    : `${minutes} 分鐘`;
}

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
