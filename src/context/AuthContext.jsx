import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addTripCode,
  deleteTripCloud,
  isFirebaseConfigured,
  observeAuth,
  removeTripCode,
  signInAnonymous,
  subscribeTripCodes,
} from "../services/firebase";

const AuthContext = createContext(null);
const SYNC_CODE_STORAGE_KEY = "travel-map-sync-code";
const SYNC_CODE_HISTORY_STORAGE_KEY = "travel-map-sync-code-history";
const TRIP_DIRECTORY_KEY = "__trip-directory__";

function createSyncCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
}

function normalizeSyncCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

function getSavedSyncCodes(currentCode) {
  try {
    const savedCodes = JSON.parse(
      localStorage.getItem(SYNC_CODE_HISTORY_STORAGE_KEY) ?? "[]",
    );
    const normalizedCodes = Array.isArray(savedCodes)
      ? savedCodes.map(normalizeSyncCode).filter((code) => code.length >= 8)
      : [];
    return [...new Set([currentCode, ...normalizedCodes])].slice(0, 8);
  } catch {
    return [currentCode];
  }
}

async function hashSyncCode(code) {
  const data = new TextEncoder().encode(`travel-map:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [syncCode, setSyncCodeState] = useState(() => {
    const saved = normalizeSyncCode(
      localStorage.getItem(SYNC_CODE_STORAGE_KEY) ?? "",
    );
    if (saved.length >= 8) return saved;
    const next = createSyncCode();
    localStorage.setItem(SYNC_CODE_STORAGE_KEY, next);
    return next;
  });
  const [localSyncCodes, setSyncCodes] = useState(() => getSavedSyncCodes(syncCode));
  const [sharedSyncCodes, setSharedSyncCodes] = useState([]);
  const [tripDirectoryId, setTripDirectoryId] = useState(null);
  // Trips added on any device are listed everywhere, after this device's own.
  const syncCodes = useMemo(
    () => [
      ...new Set([
        ...localSyncCodes,
        ...sharedSyncCodes.map(normalizeSyncCode).filter((code) => code.length >= 8),
      ]),
    ],
    [localSyncCodes, sharedSyncCodes],
  );
  const [syncSpaceId, setSyncSpaceId] = useState(null);
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    let attempted = false;
    return observeAuth(async (nextUser) => {
      if (!nextUser && isFirebaseConfigured && !attempted) {
        attempted = true;
        try {
          await signInAnonymous();
          return;
        } catch (error) {
          console.error("匿名同步驗證失敗", error);
          setAuthError("請在 Firebase Authentication 啟用「匿名」登入");
        }
      }
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    hashSyncCode(TRIP_DIRECTORY_KEY).then(setTripDirectoryId);
  }, []);

  useEffect(() => {
    if (!user || !tripDirectoryId) return undefined;
    return subscribeTripCodes(
      tripDirectoryId,
      (codes) => setSharedSyncCodes(Array.isArray(codes) ? codes : []),
      (error) => console.error("無法讀取共用的行程清單", error),
    );
  }, [user, tripDirectoryId]);

  const shareTripCode = (code) => {
    if (!user || !tripDirectoryId) return;
    addTripCode(tripDirectoryId, code).catch((error) =>
      console.error("無法共用行程代號", error),
    );
  };

  useEffect(() => {
    let cancelled = false;
    setSyncSpaceId(null);
    hashSyncCode(syncCode).then((spaceId) => {
      if (!cancelled) setSyncSpaceId(spaceId);
    });
    return () => {
      cancelled = true;
    };
  }, [syncCode]);

  const setSyncCode = (value) => {
    const next = normalizeSyncCode(value);
    if (next.length < 8) return false;
    localStorage.setItem(SYNC_CODE_STORAGE_KEY, next);
    setSyncCodes((codes) => {
      const updatedCodes = [...new Set([next, ...codes])].slice(0, 8);
      localStorage.setItem(
        SYNC_CODE_HISTORY_STORAGE_KEY,
        JSON.stringify(updatedCodes),
      );
      return updatedCodes;
    });
    setSyncSpaceId(null);
    setSyncCodeState(next);
    setSyncVersion((version) => version + 1);
    hashSyncCode(next).then(setSyncSpaceId);
    shareTripCode(next);
    return true;
  };

  const removeSyncCode = (value) => {
    const codeToRemove = normalizeSyncCode(value);
    const remainingCodes = syncCodes.filter((code) => code !== codeToRemove);
    if (remainingCodes.length === 0) return false;

    localStorage.setItem(
      SYNC_CODE_HISTORY_STORAGE_KEY,
      JSON.stringify(localSyncCodes.filter((code) => code !== codeToRemove)),
    );
    setSyncCodes((codes) => codes.filter((code) => code !== codeToRemove));

    setSharedSyncCodes((codes) => codes.filter((code) => code !== codeToRemove));
    if (user && tripDirectoryId) {
      removeTripCode(tripDirectoryId, codeToRemove).catch((error) =>
        console.error("無法從共用清單移除行程", error),
      );
    }

    if (codeToRemove === syncCode) {
      const nextCode = remainingCodes[0];
      localStorage.setItem(SYNC_CODE_STORAGE_KEY, nextCode);
      setSyncSpaceId(null);
      setSyncCodeState(nextCode);
      setSyncVersion((version) => version + 1);
    }
    return true;
  };

  // Deletes the trip's cloud content, then drops it from every list.
  const deleteTrip = async (value) => {
    const code = normalizeSyncCode(value);
    if (!user) throw new Error("not-connected");
    if (!syncCodes.some((savedCode) => savedCode !== code)) {
      throw new Error("last-trip");
    }
    await deleteTripCloud(await hashSyncCode(code));
    removeSyncCode(code);
  };

  const value = useMemo(
    () => ({
      user,
      authReady,
      authError,
      isFirebaseConfigured,
      syncCode,
      syncCodes,
      syncSpaceId,
      syncVersion,
      setSyncCode,
      removeSyncCode,
      deleteTrip,
    }),
    // The setters read these too, so a new list or directory id must reach them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, authReady, authError, syncCode, syncCodes, localSyncCodes, tripDirectoryId, syncSpaceId, syncVersion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
