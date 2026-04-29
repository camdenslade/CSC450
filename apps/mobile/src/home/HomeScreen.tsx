import { StyleSheet, ScrollView, RefreshControl, View, Text, Pressable } from "react-native";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Layout } from "../shared/Layout";
import { BalanceCard } from "./components/BalanceCard";
import { PrimaryActions } from "./components/PrimaryActions";
import { TabKey } from "../shared/NavBar";
import { BrandHeader } from "./components/BrandHeader";
import { MetricsRow, Metric } from "./components/MetricsRow";
import { NextTabCard, NextTab } from "./components/NextTabCard";
import { ActivityList, ActivityItem } from "./components/ActivityList";
import { Section } from "./components/Section";
import { ApiBill, ApiGroup } from "../api/client";
import { useColors } from "../theme/colors";
import { useBills, useFriends, useLedger } from "../store/DataContext";
import { useAuth } from "../auth/AuthContext";

type HomeScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onCreateTab?: () => void;
  onViewTabs?: () => void;
  onViewTabDetail?: (tabId: string) => void;
  onViewLedger?: () => void;
  onViewGroups?: () => void;
};

function centsToDisplay(cents: number): string {
  return "$" + (Math.abs(cents) / 100).toFixed(2);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / 3_600_000;
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function billToNextTab(bill: ApiBill): NextTab {
  return {
    name: bill.name,
    location: bill.location ?? "",
    time: new Date(bill.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    estimate: "$" + (bill.totalCents / 100).toFixed(2),
    guests: bill.participants
      .filter((p) => p.user)
      .map((p) => {
        const name = p.user!.displayName;
        const parts = name.split(" ");
        return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2).toUpperCase();
      })
      .slice(0, 4),
    status: `${bill.participants.filter((p) => p.state === "pending").length} awaiting`,
  };
}

function groupInitials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function HomeScreen({ onTabPress, onCreateTab, onViewTabs, onViewTabDetail, onViewLedger, onViewGroups }: HomeScreenProps) {
  const { bills, refreshBills } = useBills();
  const { friendRequests, refreshFriends } = useFriends();
  const { ledger, refreshLedger } = useLedger();
  const { apiClient } = useAuth();
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<ApiGroup[]>([]);

  useEffect(() => {
    apiClient.get<ApiGroup[]>("/groups").then(setGroups).catch(() => {});
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshBills(), refreshFriends(), refreshLedger(),
      apiClient.get<ApiGroup[]>("/groups").then(setGroups).catch(() => {}),
    ]);
    setRefreshing(false);
  }, [refreshBills, refreshFriends, refreshLedger]);

  const openBills = useMemo(() => bills.filter((b) => b.status === "open"), [bills]);
  const nextOpenBill = openBills[0] ?? null;

  const sevenDaysAgo = useMemo(() => Date.now() - 7 * 86_400_000, []);

  const { balance, settledThisWeek } = useMemo(() => {
    const items = ledger?.items ?? [];
    return {
      balance: items.filter((e) => !e.settled).reduce((sum, e) => sum + e.delta, 0),
      settledThisWeek: items
        .filter((e) => e.settled && new Date(e.createdAt).getTime() > sevenDaysAgo)
        .reduce((sum, e) => sum + Math.abs(e.delta), 0),
    };
  }, [ledger, sevenDaysAgo]);

  const metrics: Metric[] = useMemo(() => [
    { label: "Open tabs", value: String(openBills.length), hint: "active" },
    { label: "Invites", value: String(friendRequests.length), hint: "pending" },
    { label: "Settled", value: centsToDisplay(settledThisWeek), hint: "this week" },
  ], [openBills.length, friendRequests.length, settledThisWeek]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const billMap = new Map(bills.map((b) => [b.id, b]));
    return (ledger?.items ?? []).slice(0, 5).map((e) => {
      const bill = billMap.get(e.tabId);
      const name = bill?.name ?? "A tab";
      const isPositive = e.delta > 0;
      return {
        title: e.settled
          ? (isPositive ? `${name} settled` : `You settled ${name}`)
          : (isPositive ? `New tab: ${name}` : `Added to ${name}`),
        detail: isPositive ? `Owed ${centsToDisplay(e.delta)}` : `Owe ${centsToDisplay(e.delta)}`,
        time: relativeTime(e.createdAt),
        tone: e.settled ? "success" : isPositive ? "info" : "danger",
        amount: (isPositive ? "+" : "-") + centsToDisplay(e.delta),
      } as ActivityItem;
    });
  }, [bills, ledger]);

  const nextTab = useMemo(() => nextOpenBill ? billToNextTab(nextOpenBill) : null, [nextOpenBill]);

  return (
    <Layout activeTab="Home" onTabPress={onTabPress} onCreateTab={onCreateTab}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <BrandHeader badgeText="TU" title="TabUp" subtitle="Split tabs with friends." />

        <View style={styles.padded}>
          <BalanceCard balanceCents={balance} />
          <PrimaryActions onCreateTab={onCreateTab} onViewTabs={onViewTabs} />
        </View>

        <View style={styles.padded}>
          <MetricsRow metrics={metrics} />

          {nextOpenBill && nextTab && (
            <Section title="Next open tab" actionLabel="All tabs" onActionPress={onViewTabs}>
              <NextTabCard
                tab={nextTab}
                onPress={() => onViewTabDetail?.(nextOpenBill.id)}
              />
            </Section>
          )}

          {activityItems.length > 0 && (
            <Section title="Activity" actionLabel="Ledger" onActionPress={onViewLedger}>
              <ActivityList items={activityItems} />
            </Section>
          )}

          <Section title="Groups" actionLabel="View all" onActionPress={onViewGroups}>
            {groups.length === 0 ? (
              <Pressable
                style={({ pressed }) => [styles.groupsTeaser, { backgroundColor: pressed ? c.surfaceSecondary : c.surface, borderColor: c.border }]}
                onPress={onViewGroups}
              >
                <Text style={[styles.groupsTeaserTitle, { color: c.textPrimary }]}>Split with your crew</Text>
                <Text style={[styles.groupsTeaserSub, { color: c.textMuted }]}>Create a group to split tabs with recurring friends.</Text>
              </Pressable>
            ) : (
              <View style={{ gap: 8 }}>
                {groups.slice(0, 3).map((g) => (
                  <Pressable
                    key={g.id}
                    style={({ pressed }) => [styles.groupCard, { backgroundColor: pressed ? c.surfaceSecondary : c.surface, borderColor: c.border }]}
                    onPress={() => onViewGroups?.()}
                  >
                    <View style={[styles.groupCardAvatar, { backgroundColor: c.primaryLight }]}>
                      <Text style={[styles.groupCardAvatarText, { color: c.primaryDark }]}>{groupInitials(g.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.groupCardName, { color: c.textPrimary }]}>{g.name}</Text>
                      <Text style={[styles.groupCardMeta, { color: c.textMuted }]}>
                        {g.members.length} {g.members.length === 1 ? "member" : "members"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {groups.length > 3 && (
                  <Pressable onPress={onViewGroups} style={styles.groupsSeeMore}>
                    <Text style={[styles.groupsSeeMoreText, { color: c.primary }]}>See all {groups.length} groups →</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Section>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  padded: { paddingHorizontal: 16 },
  groupsTeaser: { borderRadius: 16, padding: 16, borderWidth: 1 },
  groupsTeaserTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  groupsTeaserSub: { fontSize: 13, lineHeight: 19 },
  groupCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  groupCardAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  groupCardAvatarText: { fontSize: 14, fontWeight: "800" },
  groupCardName: { fontSize: 15, fontWeight: "700" },
  groupCardMeta: { fontSize: 12, marginTop: 1 },
  groupsSeeMore: { paddingVertical: 4 },
  groupsSeeMoreText: { fontSize: 13, fontWeight: "600" },
});
