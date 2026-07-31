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

export async function loadPlannerCloud(syncSpaceId) {
  if (!db) return null;
  const snapshot = await getDoc(
    doc(db, "syncSpaces", syncSpaceId, "appData", "planner"),
  );
  return snapshot.exists() ? snapshot.data() : null;
}

export async function savePlannerCloud(syncSpaceId, data) {
  if (!db) return;
  await setDoc(
    doc(db, "syncSpaces", syncSpaceId, "appData", "planner"),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function loadResortNoteCloud(syncSpaceId, noteId) {
  if (!db) return null;
  const snapshot = await getDoc(
    doc(db, "syncSpaces", syncSpaceId, "notes", encodeURIComponent(noteId)),
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
