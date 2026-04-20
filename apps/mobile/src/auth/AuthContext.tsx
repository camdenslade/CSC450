// apps/mobile/src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import * as SecureStore from "expo-secure-store";
import { makeApiClient, ApiClient } from "../api/client";
import { API_BASE } from "../api/config";

const USER_ID_KEY = "tabup_user_id";

// -----------------------------------------------
// Token getter - always fetches a fresh-enough
// token from Firebase SDK (auto-refreshes).
// -----------------------------------------------
async function getToken(): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

const sharedApiClient = makeApiClient(getToken);

// -----------------------------------------------
// Context value
// -----------------------------------------------
interface AuthContextValue {
  user: FirebaseAuthTypes.User | null;
  /** Our Postgres user UUID (not the Firebase UID). */
  userId: string | null;
  apiClient: ApiClient;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// -----------------------------------------------
// AuthProvider
// -----------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /** Exchange Firebase ID token for our DB user ID and cache it. */
  async function exchangeToken(fbUser: FirebaseAuthTypes.User): Promise<void> {
    const idToken = await fbUser.getIdToken();
    const res = await fetch(`${API_BASE}/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Token exchange failed");
    const data: { userId: string } = await res.json();
    await SecureStore.setItemAsync(USER_ID_KEY, data.userId);
    setUserId(data.userId);
  }

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (fbUser) => {
      setUser(fbUser);

      if (fbUser) {
        try {
          // Prefer the cached DB user ID to avoid an extra round-trip on
          // every app open - exchange only when the cache is empty.
          const cached = await SecureStore.getItemAsync(USER_ID_KEY);
          if (cached) {
            setUserId(cached);
          } else {
            await exchangeToken(fbUser);
          }
        } catch {
          // If exchange fails, proceed anyway - API calls will 401 gracefully.
        }
      } else {
        await SecureStore.deleteItemAsync(USER_ID_KEY).catch(() => {});
        setUserId(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signOut(): Promise<void> {
    await auth().signOut();
    await SecureStore.deleteItemAsync(USER_ID_KEY).catch(() => {});
    setUserId(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, userId, apiClient: sharedApiClient, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// -----------------------------------------------
// Hook
// -----------------------------------------------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
