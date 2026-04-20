// apps/mobile/src/screens/ledger/LedgerScreen.tsx
import { useCallback, useEffect, useState } from "react";
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
import { colors } from "../../theme/colors";
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

export function LedgerScreen({ onBack }: Props) {
  const { apiClient } = useAuth();
  const [entries, setEntries] = useState<ApiLedgerEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
            Tab {item.tabId.slice(0, 8)}
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

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No ledger entries yet.</Text>
              <Text style={styles.emptySubtext}>
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
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  back: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
    minWidth: 48,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  headerSpacer: { minWidth: 48 },
  spinner: { marginTop: 60 },
  list: { paddingBottom: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flex: 1, gap: 4 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  tabId: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textMuted },
  delta: { fontSize: 18, fontWeight: "700" },
  deltaPositive: { color: colors.primary },
  deltaNegative: { color: colors.error },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeOpen: { backgroundColor: "rgba(255,107,107,0.15)" },
  badgeSettled: { backgroundColor: "rgba(138,233,193,0.15)" },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  footerSpinner: { marginVertical: 16 },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 16,
  },
  loadMoreText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
