// apps/mobile/src/screens/tabs/TabsListScreen.tsx
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, SectionList, Pressable, ActivityIndicator } from "react-native";
import { Layout } from "../../shared/Layout";
import { colors } from "../../theme/colors";
import { TabKey } from "../../shared/NavBar";
import { useAuth } from "../../auth/AuthContext";
import { ApiBill } from "../../api/client";

type TabsListScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onViewTabDetail?: (tabId: string) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TabsListScreen({ onTabPress, onViewTabDetail }: TabsListScreenProps) {
  const { apiClient, userId } = useAuth();
  const [bills, setBills] = useState<ApiBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<ApiBill[]>("/tabs")
      .then(setBills)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openBills = bills.filter((b) => b.status === "open");
  const settledBills = bills.filter((b) => b.status !== "open");
  const sections = [
    { title: "Open Tabs", data: openBills },
    { title: "Settled", data: settledBills },
  ].filter((s) => s.data.length > 0);

  function myShare(bill: ApiBill): number {
    const p = bill.participants.find((x) => x.userId === userId);
    return p ? p.shareCents : 0;
  }

  const renderTab = ({ item }: { item: ApiBill }) => {
    const isOpen = item.status === "open";
    const share = myShare(item);
    return (
      <Pressable style={styles.tabCard} onPress={() => onViewTabDetail?.(item.id)}>
        <View style={styles.tabHeader}>
          <Text style={styles.tabName}>{item.name}</Text>
          {isOpen && (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>Open</Text>
            </View>
          )}
        </View>
        {item.location && <Text style={styles.location}>{item.location}</Text>}
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        <View style={styles.divider} />
        <View style={styles.tabFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerValue}>${(item.totalCents / 100).toFixed(2)}</Text>
          </View>
          {share > 0 && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Your share</Text>
              <Text style={[styles.footerValue, styles.yourShare]}>
                ${(share / 100).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>People</Text>
            <Text style={styles.footerValue}>{item.participants.length}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; data: ApiBill[] } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  return (
    <Layout activeTab="Tabs" onTabPress={onTabPress}>
      <View style={styles.container}>
        <Text style={styles.title}>Tabs</Text>
        {loading && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!loading && !error && bills.length === 0 && (
          <Text style={styles.emptyText}>No tabs yet. Create one to get started.</Text>
        )}
        {!loading && sections.length > 0 && (
          <SectionList
            sections={sections}
            renderItem={renderTab}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  spinner: { marginTop: 40 },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: 60 },
  errorText: { color: colors.error, textAlign: "center", marginTop: 40 },
  listContent: { paddingTop: 12, paddingBottom: 120 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  sectionCount: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  tabCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  tabHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tabName: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  openBadge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  openBadgeText: { fontSize: 11, fontWeight: "700", color: "#000" },
  location: { fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 2 },
  date: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
  divider: { height: 1, backgroundColor: "#e5e9e6", marginVertical: 12 },
  tabFooter: { flexDirection: "row", justifyContent: "space-between" },
  footerItem: { flex: 1 },
  footerLabel: {
    fontSize: 11, fontWeight: "600", color: colors.textMuted,
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  footerValue: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  yourShare: { color: colors.primary },
});
