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
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
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

// The trip codes anyone has added, shared so every device lists the same
// trips. It lives in its own sync space, whose id is a hash like any other.
const tripCodesDoc = (directoryId) =>
  doc(db, "syncSpaces", directoryId, "appData", "tripCodes");

export function subscribeTripCodes(directoryId, onData, onError) {
  if (!db) return () => {};
  return onSnapshot(
    tripCodesDoc(directoryId),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      onData({ codes: data.codes ?? [], names: data.names ?? {} });
    },
    onError,
  );
}

// A trip's display name, shared like its code; an empty name clears it.
export async function setTripName(directoryId, code, name) {
  if (!db) return;
  await setDoc(
    tripCodesDoc(directoryId),
    { names: { [code]: name || deleteField() }, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function addTripCode(directoryId, code) {
  if (!db) return;
  await setDoc(
    tripCodesDoc(directoryId),
    { codes: arrayUnion(code), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function removeTripCode(directoryId, code) {
  if (!db) return;
  await setDoc(
    tripCodesDoc(directoryId),
    { codes: arrayRemove(code), names: { [code]: deleteField() }, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// Deletes everything a trip keeps in the cloud: the itinerary, store menus,
// resort notes and the 想吃清單 photos. It cannot be undone.
export async function deleteTripCloud(syncSpaceId) {
  if (!db) throw new Error("firebase-not-configured");
  const [notes, wishes] = await withSyncTimeout(
    Promise.all([
      getDocs(collection(db, "syncSpaces", syncSpaceId, "notes")),
      getDocs(collection(db, "syncSpaces", syncSpaceId, "wishes")),
    ]),
  );
  await withSyncTimeout(
    Promise.all([
      deleteDoc(doc(db, "syncSpaces", syncSpaceId, "appData", "planner")),
      deleteDoc(doc(db, "syncSpaces", syncSpaceId, "appData", "menus")),
      deleteDoc(doc(db, "syncSpaces", syncSpaceId, "appData", "prep")),
      ...notes.docs.map((note) => deleteDoc(note.ref)),
      ...wishes.docs.map((wish) => deleteDoc(wish.ref)),
    ]),
    10000,
  );
}

// One backup per calendar day, keyed 「YYYY-MM-DD」: pressing 儲存 again the
// same day replaces that day's copy, so the history keeps each day's last save.
// Only the latest few days are kept; older ones are removed after each save.
const backupsCollection = (syncSpaceId) =>
  collection(db, "syncSpaces", syncSpaceId, "backups");
const BACKUP_DAYS_KEPT = 3;

export async function saveDailyBackupCloud(syncSpaceId, dateKey, data) {
  if (!db) return;
  await setDoc(doc(backupsCollection(syncSpaceId), dateKey), {
    ...JSON.parse(JSON.stringify(data)),
    savedAt: serverTimestamp(),
  });
  const snapshot = await withSyncTimeout(getDocs(backupsCollection(syncSpaceId)), 10000);
  const stale = snapshot.docs
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(BACKUP_DAYS_KEPT);
  await Promise.all(stale.map((backup) => deleteDoc(backup.ref)));
}

export async function listBackupsCloud(syncSpaceId) {
  if (!db) return [];
  const snapshot = await withSyncTimeout(getDocs(backupsCollection(syncSpaceId)), 10000);
  return snapshot.docs
    .map((backup) => {
      const data = backup.data();
      return { ...data, id: backup.id, savedAt: data.savedAt?.toDate?.() ?? null };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

// Replaces every store menu at once, for restoring a backup.
export async function replaceMenusCloud(syncSpaceId, items) {
  if (!db) return;
  await setDoc(menusDoc(syncSpaceId), {
    items: JSON.parse(JSON.stringify(items ?? {})),
    updatedAt: serverTimestamp(),
  });
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

// Stops the free maps could not find are queued here, in the shared trip
// directory's space, for the scheduled job that looks up their coordinates
// and adds them to the built-in places. Keyed by a hash of the name, so the
// same name is queued once however often it is retried.
const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export async function reportUnlocatedPlace(query, fullText = query) {
  if (!db || !auth?.currentUser || !query) return;
  const directoryId = await sha256Hex("travel-map:__trip-directory__");
  const key = (await sha256Hex(query)).slice(0, 16);
  await setDoc(
    doc(db, "syncSpaces", directoryId, "appData", "unlocatedPlaces"),
    {
      places: { [key]: { query, text: fullText.slice(0, 300), reportedAt: serverTimestamp() } },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// The trip's flights (code and date), for the flight sync job
// (scripts/sync-flight-status.mjs), which fetches Taoyuan Airport's live
// status for exactly these flights. Keyed "BR132|2026-11-24".
export async function reportTrackedFlights(flights) {
  if (!db || !auth?.currentUser || !flights.length) return;
  const directoryId = await sha256Hex("travel-map:__trip-directory__");
  await setDoc(
    doc(db, "syncSpaces", directoryId, "appData", "trackedFlights"),
    {
      flights: Object.fromEntries(
        flights.map(({ flight, date }) => [`${flight}|${date}`, { flight, date, reportedAt: serverTimestamp() }]),
      ),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// Places in the queue the lookup job has found carry their coordinates
// (latitude, longitude, name, displayName); the planner applies them live.
export function subscribeUnlocatedPlaces(onData, onError) {
  if (!db) return () => {};
  let unsubscribe = () => {};
  let stopped = false;
  sha256Hex("travel-map:__trip-directory__").then((directoryId) => {
    if (stopped) return;
    unsubscribe = onSnapshot(
      doc(db, "syncSpaces", directoryId, "appData", "unlocatedPlaces"),
      (snapshot) => onData(snapshot.exists() ? snapshot.data().places ?? {} : {}),
      onError,
    );
  });
  return () => {
    stopped = true;
    unsubscribe();
  };
}

// Things the traveller wants to eat that aren't on a stop's menu: a name, an
// optional note and a small JPEG (as a data URL), one document each so a
// trip can hold many photos without hitting the document size limit.
const wishesCollection = (syncSpaceId) =>
  collection(db, "syncSpaces", syncSpaceId, "wishes");

export function subscribeWishesCloud(syncSpaceId, onData, onError) {
  if (!db) return () => {};
  return onSnapshot(
    wishesCollection(syncSpaceId),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((wish) => {
            const data = wish.data();
            return { ...data, id: wish.id, createdAt: data.createdAt?.toMillis?.() ?? Date.now() };
          })
          .sort((first, second) => second.createdAt - first.createdAt),
      ),
    onError,
  );
}

export async function addWishCloud(syncSpaceId, wish) {
  if (!db) throw new Error("firebase-not-configured");
  await withSyncTimeout(
    setDoc(doc(wishesCollection(syncSpaceId)), { ...wish, createdAt: serverTimestamp() }),
    15000,
  );
}

export async function deleteWishCloud(syncSpaceId, wishId) {
  if (!db) return;
  await deleteDoc(doc(wishesCollection(syncSpaceId), wishId));
}

// Edits a wish's name or note in place.
export async function updateWishCloud(syncSpaceId, wishId, changes) {
  if (!db) throw new Error("firebase-not-configured");
  await withSyncTimeout(
    setDoc(doc(wishesCollection(syncSpaceId), wishId), changes, { merge: true }),
  );
}

// The 行前準備 checklist: one document per trip holding every item and
// whether it is done.
const prepDoc = (syncSpaceId) => doc(db, "syncSpaces", syncSpaceId, "appData", "prep");

export function subscribePrepCloud(syncSpaceId, onData, onError) {
  if (!db) return () => {};
  return onSnapshot(
    prepDoc(syncSpaceId),
    (snapshot) => onData(snapshot.exists() ? snapshot.data().items ?? null : null),
    onError,
  );
}

export async function savePrepCloud(syncSpaceId, items) {
  if (!db) return;
  await withSyncTimeout(
    setDoc(prepDoc(syncSpaceId), {
      items: JSON.parse(JSON.stringify(items)),
      updatedAt: serverTimestamp(),
    }),
  );
}
