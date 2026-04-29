import { View, Text, StyleSheet, SectionList, Pressable, RefreshControl } from "react-native";
import { AnimatedPressable } from "../../shared/AnimatedPressable";
import { SkeletonCard } from "../../shared/SkeletonCard";
import { EmptyIllustration } from "../../shared/EmptyIllustration";
import { useState, useCallback, useEffect } from "react";
import { useColors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../shared/Layout";
import { colors } from "../../theme/colors";
import { TabKey } from "../../shared/NavBar";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../store/DataContext";
import { ApiBill } from "../../api/client";

type TabsListScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onViewTabDetail?: (tabId: string) => void;
  onCreateTab?: () => void;
  isVisible?: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TabsListScreen({ onTabPress, onViewTabDetail, onCreateTab, isVisible }: TabsListScreenProps) {
  const { userId } = useAuth();
  const { bills, refreshBills } = useData();
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshBills().catch(() => {});
    setRefreshing(false);
  }, [refreshBills]);

  useEffect(() => {
    if (isVisible) refreshBills().catch(() => {});
  }, [isVisible]);

  const openBills = bills.filter((b) => b.status === "open");
  const settledBills = bills.filter((b) => b.status === "settled");
  const cancelledBills = bills.filter((b) => b.status === "cancelled");
  const sections = [
    { title: "Open", data: openBills },
    { title: "Settled", data: settledBills },
    { title: "Cancelled", data: cancelledBills },
  ].filter((s) => s.data.length > 0);

  function myShare(bill: ApiBill): number {
    return bill.participants.find((x) => x.userId === userId)?.shareCents ?? 0;
  }

  const renderTab = ({ item }: { item: ApiBill }) => {
    const isOpen = item.status === "open";
    const share = myShare(item);
    const pendingCount = item.participants.filter((p) => p.state === "pending").length;

    return (
      <AnimatedPressable
        style={styles.card}
        onPress={() => onViewTabDetail?.(item.id)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            {item.location ? <Text style={styles.cardSub}>{item.location}</Text> : null}
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardTotal}>${(item.totalCents / 100).toFixed(2)}</Text>
            <View style={[
              styles.badge,
              item.status === "open" ? styles.badgeOpen :
              item.status === "cancelled" ? styles.badgeCancelled : styles.badgeSettled,
            ]}>
              <Text style={[
                styles.badgeText,
                item.status === "open" ? styles.badgeTextOpen :
                item.status === "cancelled" ? styles.badgeTextCancelled : styles.badgeTextSettled,
              ]}>
                {item.status === "open" ? "Open" : item.status === "cancelled" ? "Cancelled" : "Settled"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {share > 0 && (
            <View style={styles.footerChip}>
              <Text style={styles.footerChipLabel}>Your share</Text>
              <Text style={styles.footerChipValue}>${(share / 100).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.footerChip}>
            <Text style={styles.footerChipLabel}>People</Text>
            <Text style={styles.footerChipValue}>{item.participants.length}</Text>
          </View>
          {isOpen && pendingCount > 0 && (
            <View style={[styles.footerChip, styles.footerChipWarning]}>
              <Text style={styles.footerChipWarningText}>{pendingCount} awaiting</Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; data: ApiBill[] } }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>{section.title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{section.data.length}</Text>
      </View>
    </View>
  );

  return (
    <Layout activeTab="Tabs" onTabPress={onTabPress} onCreateTab={onCreateTab}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.textPrimary }]}>Tabs</Text>
          <AnimatedPressable style={styles.newBtn} onPress={onCreateTab} scaleTo={0.94}>
            <Text style={styles.newBtnText}>+ New</Text>
          </AnimatedPressable>
        </View>

        {refreshing && (
          <View style={styles.listContent}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </View>
        )}

        {!refreshing && bills.length === 0 && (
          <View style={styles.emptyState}>
            <EmptyIllustration icon="receipt-outline" />
            <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No tabs yet</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>Create one to start splitting with friends.</Text>
            <AnimatedPressable style={styles.emptyBtn} onPress={onCreateTab}>
              <Text style={styles.emptyBtnText}>Create tab</Text>
            </AnimatedPressable>
          </View>
        )}

        {!refreshing && sections.length > 0 && (
          <SectionList
            sections={sections}
            renderItem={renderTab}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          />
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  newBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  newBtnPressed: { backgroundColor: colors.primaryDark },
  newBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textSecondary },
  sectionCount: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionCountText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  cardPressed: { backgroundColor: colors.surfaceSecondary },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 12 },
  cardName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  cardTotal: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeOpen: { backgroundColor: colors.primaryLight },
  badgeSettled: { backgroundColor: colors.primaryLight },
  badgeCancelled: { backgroundColor: colors.surfaceSecondary },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextOpen: { color: colors.primary },
  badgeTextSettled: { color: colors.primaryDark },
  badgeTextCancelled: { color: colors.textMuted },
  cardFooter: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  footerChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  footerChipWarning: { backgroundColor: colors.primaryLight },
  footerChipLabel: { fontSize: 12, color: colors.textMuted },
  footerChipValue: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  footerChipWarningText: { fontSize: 12, fontWeight: "600", color: colors.primary },
});
