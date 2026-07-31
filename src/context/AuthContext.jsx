import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  isFirebaseConfigured,
  observeAuth,
  signInAnonymous,
  signInWithGoogle,
  signOutGoogle,
} from "../services/firebase";

const AuthContext = createContext(null);
const SYNC_CODE_STORAGE_KEY = "travel-map-sync-code";

function createSyncCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
}

function normalizeSyncCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
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
  const [syncCode, setSyncCodeState] = useState(() => {
    const savedCode = localStorage.getItem(SYNC_CODE_STORAGE_KEY);
    if (savedCode) return normalizeSyncCode(savedCode);
    const newCode = createSyncCode();
    localStorage.setItem(SYNC_CODE_STORAGE_KEY, newCode);
    return newCode;
  });
  const [syncSpaceId, setSyncSpaceId] = useState(null);

  useEffect(() => {
    let anonymousAttempted = false;
    return observeAuth(async (nextUser) => {
      if (!nextUser && isFirebaseConfigured && !anonymousAttempted) {
        anonymousAttempted = true;
        try {
          await signInAnonymous();
          return;
        } catch (error) {
          console.error("無法啟用匿名同步", error);
        }
      }
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    hashSyncCode(syncCode).then((spaceId) => {
      if (!cancelled) setSyncSpaceId(spaceId);
    });
    return () => {
      cancelled = true;
    };
  }, [syncCode]);

  const setSyncCode = (value) => {
    const nextCode = normalizeSyncCode(value);
    if (nextCode.length < 8) return false;
    localStorage.setItem(SYNC_CODE_STORAGE_KEY, nextCode);
    setSyncSpaceId(null);
    setSyncCodeState(nextCode);
    return true;
  };

  const value = useMemo(
    () => ({
      user,
      authReady,
      isFirebaseConfigured,
      syncCode,
      syncSpaceId,
      setSyncCode,
      signIn: signInWithGoogle,
      signOut: signOutGoogle,
    }),
    [user, authReady, syncCode, syncSpaceId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
