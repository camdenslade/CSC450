// apps/mobile/src/screens/ledger/LedgerScreen.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Background } from "../../shared/Background";
import { colors, useColors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiLedgerEntry } from "../../api/client";

type Props = {
  onBack: () => void;
};

// Positive delta = user is owed money; negative = user owes money.
function formatDelta(cents: number): string {
  const sign = cents >= 0 ? "+" : "-";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildInsights(entries: ApiLedgerEntry[]) {
  const now = new Date();
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });

  const sum = (arr: ApiLedgerEntry[]) => arr.reduce((s, e) => s + Math.abs(e.delta), 0);
  const tabCount = (arr: ApiLedgerEntry[]) => new Set(arr.map((e) => e.tabId)).size;

  return {
    thisMonthTotal: sum(thisMonth),
    thisMonthTabs: tabCount(thisMonth),
    lastMonthTotal: sum(lastMonth),
    monthName: now.toLocaleString("default", { month: "long" }),
  };
}

export function LedgerScreen({ onBack }: Props) {
  const { apiClient } = useAuth();
  const c = useColors();
  const [entries, setEntries] = useState<ApiLedgerEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const insights = useMemo(() => buildInsights(entries), [entries]);

  async function load(cursor?: string) {
    try {
      const path = cursor
        ? `/ledger?limit=20&cursor=${encodeURIComponent(cursor)}`
        : "/ledger?limit=20";
      const page = await apiClient.get<{ items: ApiLedgerEntry[]; nextCursor: string | null }>(path);
      if (cursor) {
        setEntries((prev) => [...prev, ...page.items]);
      } else {
        setEntries(page.items);
      }
      setNextCursor(page.nextCursor);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load ledger.");
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await load(nextCursor);
    setLoadingMore(false);
  }, [nextCursor, loadingMore]);

  function renderItem({ item }: { item: ApiLedgerEntry }) {
    const positive = item.delta >= 0;
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.tabId} numberOfLines={1}>
            {item.tabName}
          </Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.delta, positive ? styles.deltaPositive : styles.deltaNegative]}>
            {formatDelta(item.delta)}
          </Text>
          <View style={[styles.badge, item.settled ? styles.badgeSettled : styles.badgeOpen]}>
            <Text style={styles.badgeText}>{item.settled ? "Settled" : "Open"}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={12}>
              <Text style={styles.back}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Ledger</Text>
            <View style={styles.headerSpacer} />
          </View>

          {!loading && entries.length > 0 && (
            <View style={styles.insightsCard}>
              <View style={styles.insightsMain}>
                <Text style={styles.insightsMonth}>{insights.monthName}</Text>
                <Text style={styles.insightsAmount}>
                  ${(insights.thisMonthTotal / 100).toFixed(2)}
                </Text>
                <Text style={styles.insightsSub}>
                  across {insights.thisMonthTabs} {insights.thisMonthTabs === 1 ? "tab" : "tabs"}
                </Text>
              </View>
              {insights.lastMonthTotal > 0 && (
                <View style={styles.insightsPrev}>
                  <Text style={styles.insightsPrevLabel}>Last month</Text>
                  <Text style={styles.insightsPrevAmount}>
                    ${(insights.lastMonthTotal / 100).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: c.textPrimary }]}>No ledger entries yet.</Text>
              <Text style={[styles.emptySubtext, { color: c.textMuted }]}>
                Create a tab to see activity here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => item.tabId + item.createdAt}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingMore
                  ? <ActivityIndicator color={colors.primary} style={styles.footerSpinner} />
                  : nextCursor
                    ? (
                      <Pressable onPress={handleLoadMore} style={styles.loadMoreButton}>
                        <Text style={styles.loadMoreText}>Load more</Text>
                      </Pressable>
                    )
                    : null
              }
            />
          )}
        </SafeAreaView>
      </Background>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 0 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  back: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 48 },
  title: { flex: 1, fontSize: 22, fontWeight: "800", color: colors.textPrimary, textAlign: "center", letterSpacing: -0.5 },
  headerSpacer: { minWidth: 48 },
  spinner: { marginTop: 60 },
  list: { paddingBottom: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  insightsCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  insightsMain: { flex: 1 },
  insightsMonth: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  insightsAmount: { fontSize: 36, fontWeight: "800", color: colors.textPrimary, letterSpacing: -1, marginTop: 4 },
  insightsSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  insightsPrev: { alignItems: "flex-end", gap: 4 },
  insightsPrevLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  insightsPrevAmount: { fontSize: 18, fontWeight: "700", color: colors.textSecondary },

  row: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  rowLeft: { flex: 1, gap: 4 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  tabId: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textMuted },
  delta: { fontSize: 18, fontWeight: "800" },
  deltaPositive: { color: colors.amountPositive },
  deltaNegative: { color: colors.amountNegative },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeOpen: { backgroundColor: colors.warning + "20" },
  badgeSettled: { backgroundColor: colors.primaryLight },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  footerSpinner: { marginVertical: 16 },
  loadMoreButton: { alignItems: "center", paddingVertical: 14, marginBottom: 16 },
  loadMoreText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
