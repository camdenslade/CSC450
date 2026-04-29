// apps/mobile/src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut as fbSignOut,
} from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
type User = FirebaseAuthTypes.User;
import * as SecureStore from "expo-secure-store";
import { makeApiClient, ApiClient } from "../api/client";
import { API_BASE } from "../api/config";
import { registerPushToken } from "../notifications/registerPushToken";

const USER_ID_KEY = "tabup_user_id";
const ONBOARDING_DONE_KEY = "tabup_onboarding_done";

// Cache the Firebase ID token for 58 minutes — tokens are valid for 1 hour.
// Avoids a Firebase SDK round-trip on every API call.
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) { cachedToken = null; tokenExpiresAt = 0; return null; }
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  cachedToken = await user.getIdToken();
  tokenExpiresAt = Date.now() + 58 * 60 * 1000;
  return cachedToken;
}

function invalidateToken() { cachedToken = null; tokenExpiresAt = 0; }

const sharedApiClient = makeApiClient(getToken);

interface AuthContextValue {
  user: User | null;
  userId: string | null;
  apiClient: ApiClient;
  loading: boolean;
  needsOnboarding: boolean;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  async function exchangeToken(fbUser: User): Promise<{ userId: string; isNew: boolean }> {
    const idToken = await fbUser.getIdToken();
    const res = await fetch(`${API_BASE}/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Token exchange failed");
    const data: { userId: string; isNew?: boolean } = await res.json();
    await SecureStore.setItemAsync(USER_ID_KEY, data.userId);
    return { userId: data.userId, isNew: data.isNew ?? false };
  }

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);

      if (fbUser) {
        try {
          const cached = await SecureStore.getItemAsync(USER_ID_KEY).catch((err) => {
            console.warn("[Auth] SecureStore read failed:", err);
            return null;
          });
          if (cached) {
            setUserId(cached);
            const onboardingDone = await SecureStore.getItemAsync(ONBOARDING_DONE_KEY);
            setNeedsOnboarding(!onboardingDone);
            if (onboardingDone) registerPushToken(sharedApiClient).catch(() => {});
          } else {
            const { userId: uid, isNew } = await exchangeToken(fbUser);
            setUserId(uid);
            setNeedsOnboarding(isNew);
            if (!isNew) registerPushToken(sharedApiClient).catch(() => {});
          }
        } catch {
          // Exchange failed — try once more before giving up
          try {
            const { userId: uid, isNew } = await exchangeToken(fbUser);
            setUserId(uid);
            setNeedsOnboarding(isNew);
          } catch {
            // Still failed — sign out so they get a clean login screen
            await fbSignOut(getAuth()).catch(() => {});
            setUserId(null);
            setNeedsOnboarding(false);
          }
        }
      } else {
        await SecureStore.deleteItemAsync(USER_ID_KEY).catch(() => {});
        setUserId(null);
        setNeedsOnboarding(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function completeOnboarding(): Promise<void> {
    await SecureStore.setItemAsync(ONBOARDING_DONE_KEY, "1");
    setNeedsOnboarding(false);
    registerPushToken(sharedApiClient).catch(() => {});
  }

  async function signOut(): Promise<void> {
    invalidateToken();
    await fbSignOut(getAuth());
    await SecureStore.deleteItemAsync(USER_ID_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(ONBOARDING_DONE_KEY).catch(() => {});
    setUserId(null);
    setNeedsOnboarding(false);
  }

  async function deleteAccount(): Promise<void> {
    invalidateToken();
    const fbUser = getAuth().currentUser;
    // Delete DB record first (still authenticated at this point)
    await sharedApiClient.del("/users/me");
    // Clear local storage before Firebase delete so the auth listener sees clean state
    await SecureStore.deleteItemAsync(USER_ID_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(ONBOARDING_DONE_KEY).catch(() => {});
    if (fbUser) {
      try {
        await fbUser.delete();
      } catch (err: unknown) {
        // Firebase requires recent login before account deletion.
        // DB is already deleted - sign them out so they land on login screen.
        // On next sign-in the exchange will create a fresh account.
        const code = (err as { code?: string }).code;
        if (code === "auth/requires-recent-login") {
          await fbSignOut(getAuth()).catch(() => {});
          setUserId(null);
          setNeedsOnboarding(false);
          return;
        }
        throw err;
      }
    }
    setUserId(null);
    setNeedsOnboarding(false);
  }

  return (
    <AuthContext.Provider value={{ user, userId, apiClient: sharedApiClient, loading, needsOnboarding, avatarUrl, setAvatarUrl, completeOnboarding, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
