// Global data store — fetched once at login, shared across all tabs.
// Split into four contexts so a change to bills doesn't re-render
// components that only consume profile or friends data.
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode, useMemo } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { ApiBill, ApiFriend, ApiLedgerPage, ApiUser, ApiPaymentHandle } from "../api/client";

interface ProfileStore {
  profile: ApiUser | null;
  handles: ApiPaymentHandle[];
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileStore | null>(null);

interface BillsStore {
  bills: ApiBill[];
  refreshBills: () => Promise<void>;
  updateBill: (bill: ApiBill) => void;
}

const BillsContext = createContext<BillsStore | null>(null);

interface FriendsStore {
  friends: ApiFriend[];
  friendRequests: ApiFriend[];
  refreshFriends: () => Promise<void>;
}

const FriendsContext = createContext<FriendsStore | null>(null);

interface LedgerStore {
  ledger: ApiLedgerPage | null;
  refreshLedger: () => Promise<void>;
}

const LedgerContext = createContext<LedgerStore | null>(null);

const ReadyContext = createContext<boolean>(false);

export function DataProvider({ children }: { children: ReactNode }) {
  const { apiClient, userId } = useAuth();

  const [profile, setProfile]               = useState<ApiUser | null>(null);
  const [handles, setHandles]               = useState<ApiPaymentHandle[]>([]);
  const [bills, setBills]                   = useState<ApiBill[]>([]);
  const [friends, setFriends]               = useState<ApiFriend[]>([]);
  const [friendRequests, setFriendRequests] = useState<ApiFriend[]>([]);
  const [ledger, setLedger]                 = useState<ApiLedgerPage | null>(null);
  const [ready, setReady]                   = useState(false);

  const refreshProfile = useCallback(async () => {
    const [p, h] = await Promise.all([
      apiClient.get<ApiUser>("/users/me"),
      apiClient.get<ApiPaymentHandle[]>("/payments/handles"),
    ]);
    setProfile(p);
    setHandles(h);
  }, [apiClient]);

  const refreshBills = useCallback(async () => {
    const data = await apiClient.get<ApiBill[]>("/tabs");
    setBills(data);
  }, [apiClient]);

  const updateBill = useCallback((updated: ApiBill) => {
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  const refreshFriends = useCallback(async () => {
    const [f, r] = await Promise.all([
      apiClient.get<ApiFriend[]>("/friends"),
      apiClient.get<ApiFriend[]>("/friends/requests"),
    ]);
    setFriends(f);
    setFriendRequests(r);
  }, [apiClient]);

  const refreshLedger = useCallback(async () => {
    const data = await apiClient.get<ApiLedgerPage>("/ledger?limit=10");
    setLedger(data);
  }, [apiClient]);

  useEffect(() => {
    if (!userId) return;
    setReady(false);
    Promise.all([
      apiClient.get<ApiUser>("/users/me").then(setProfile),
      apiClient.get<ApiPaymentHandle[]>("/payments/handles").then(setHandles),
      apiClient.get<ApiBill[]>("/tabs").then(setBills),
      apiClient.get<ApiFriend[]>("/friends").then(setFriends),
      apiClient.get<ApiFriend[]>("/friends/requests").then(setFriendRequests),
      apiClient.get<ApiLedgerPage>("/ledger?limit=10").then(setLedger),
    ])
      .catch(() => {})
      .finally(() => setReady(true));
  }, [userId]);

  // Refresh bills and ledger when app returns to foreground so new tabs appear without restarting.
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        Promise.all([
          apiClient.get<ApiBill[]>("/tabs").then(setBills),
          apiClient.get<ApiLedgerPage>("/ledger?limit=10").then(setLedger),
        ]).catch(() => {});
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [userId, apiClient]);

  const profileValue  = useMemo(() => ({ profile, handles, refreshProfile }),             [profile, handles, refreshProfile]);
  const billsValue    = useMemo(() => ({ bills, refreshBills, updateBill }),              [bills, refreshBills, updateBill]);
  const friendsValue  = useMemo(() => ({ friends, friendRequests, refreshFriends }),      [friends, friendRequests, refreshFriends]);
  const ledgerValue   = useMemo(() => ({ ledger, refreshLedger }),                        [ledger, refreshLedger]);

  return (
    <ReadyContext.Provider value={ready}>
      <ProfileContext.Provider value={profileValue}>
        <BillsContext.Provider value={billsValue}>
          <FriendsContext.Provider value={friendsValue}>
            <LedgerContext.Provider value={ledgerValue}>
              {children}
            </LedgerContext.Provider>
          </FriendsContext.Provider>
        </BillsContext.Provider>
      </ProfileContext.Provider>
    </ReadyContext.Provider>
  );
}



export function useData() {
  const profile  = useContext(ProfileContext);
  const bills    = useContext(BillsContext);
  const friends  = useContext(FriendsContext);
  const ledger   = useContext(LedgerContext);
  const ready    = useContext(ReadyContext);

  // Must be called unconditionally before any throw
  const refreshAll = useCallback(async () => {
    if (!profile || !bills || !friends || !ledger) return;
    await Promise.all([
      profile.refreshProfile(),
      bills.refreshBills(),
      friends.refreshFriends(),
      ledger.refreshLedger(),
    ]);
  }, [profile, bills, friends, ledger]);

  if (!profile || !bills || !friends || !ledger) {
    throw new Error("useData must be used within DataProvider");
  }
  return { ...profile, ...bills, ...friends, ...ledger, ready, refreshAll };
}

export function useProfile()  { const ctx = useContext(ProfileContext);  if (!ctx) throw new Error("useData must be used within DataProvider"); return ctx; }
export function useBills()    { const ctx = useContext(BillsContext);    if (!ctx) throw new Error("useData must be used within DataProvider"); return ctx; }
export function useFriends()  { const ctx = useContext(FriendsContext);  if (!ctx) throw new Error("useData must be used within DataProvider"); return ctx; }
export function useLedger()   { const ctx = useContext(LedgerContext);   if (!ctx) throw new Error("useData must be used within DataProvider"); return ctx; }
export function useReady()    { return useContext(ReadyContext); }
