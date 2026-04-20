// apps/mobile/src/home/HomeScreen.tsx
import { useEffect, useState } from "react";
import { StyleSheet, ScrollView, ActivityIndicator, View, Pressable, Text } from "react-native";
import { Layout } from "../shared/Layout";
import { BalanceCard } from "./components/BalanceCard";
import { PrimaryActions } from "./components/PrimaryActions";
import { TabKey } from "../shared/NavBar";
import { BrandHeader } from "./components/BrandHeader";
import { MetricsRow, Metric } from "./components/MetricsRow";
import { NextTabCard, NextTab } from "./components/NextTabCard";
import { ActivityList, ActivityItem } from "./components/ActivityList";
import { Section } from "./components/Section";
import { useAuth } from "../auth/AuthContext";
import { ApiBill, ApiFriend, ApiLedgerPage } from "../api/client";
import { colors } from "../theme/colors";

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
  return `${days} days ago`;
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
        return parts.length >= 2
          ? parts[0][0] + parts[1][0]
          : name.slice(0, 2).toUpperCase();
      })
      .slice(0, 4),
    status: `${bill.participants.filter((p) => p.state === "pending").length} awaiting payment`,
  };
}

export function HomeScreen({ onTabPress, onCreateTab, onViewTabs, onViewTabDetail, onViewLedger, onViewGroups }: HomeScreenProps) {
  const { apiClient } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<ApiBill[]>([]);
  const [requests, setRequests] = useState<ApiFriend[]>([]);
  const [ledger, setLedger] = useState<ApiLedgerPage | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<ApiBill[]>("/tabs"),
      apiClient.get<ApiFriend[]>("/friends/requests"),
      apiClient.get<ApiLedgerPage>("/ledger?limit=10"),
    ])
      .then(([b, r, l]) => { setBills(b); setRequests(r); setLedger(l); })
      .catch(() => {/* show empty state gracefully */})
      .finally(() => setLoading(false));
  }, []);

  // Derived metrics
  const openBills = bills.filter((b) => b.status === "open");
  const nextOpenBill = openBills[0] ?? null;

  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const settledThisWeek = (ledger?.items ?? [])
    .filter((e) => e.settled && new Date(e.createdAt).getTime() > sevenDaysAgo)
    .reduce((sum, e) => sum + Math.abs(e.delta), 0);

  // Outstanding balance from unsettled ledger entries
  const balance = (ledger?.items ?? [])
    .filter((e) => !e.settled)
    .reduce((sum, e) => sum + e.delta, 0);

  const metrics: Metric[] = [
    { label: "Open tabs", value: String(openBills.length), hint: "active" },
    { label: "Invites", value: String(requests.length), hint: "pending" },
    { label: "Settled", value: centsToDisplay(settledThisWeek), hint: "This week" },
  ];

  // Map ledger entries to activity items using bill names where available
  const billMap = new Map(bills.map((b) => [b.id, b]));
  const activityItems: ActivityItem[] = (ledger?.items ?? []).slice(0, 5).map((e) => {
    const bill = billMap.get(e.tabId);
    const name = bill?.name ?? "A tab";
    const isPositive = e.delta > 0;
    return {
      title: e.settled
        ? (isPositive ? `${name} settled` : `You settled ${name}`)
        : (isPositive ? `New tab: ${name}` : `Added to ${name}`),
      detail: isPositive
        ? `You are owed ${centsToDisplay(e.delta)}`
        : `You owe ${centsToDisplay(e.delta)}`,
      time: relativeTime(e.createdAt),
      tone: e.settled ? "success" : isPositive ? "info" : "muted",
      amount: (isPositive ? "+" : "-") + centsToDisplay(e.delta),
    } as ActivityItem;
  });

  return (
    <Layout activeTab="Home" onTabPress={onTabPress}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader badgeText="TU" title="TabUp" subtitle="Split restaurant and bar tabs." />
        <BalanceCard balanceCents={balance} />
        <PrimaryActions onCreateTab={onCreateTab} onViewTabs={onViewTabs} />

        {loading ? (
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <MetricsRow metrics={metrics} />

            {nextOpenBill && (
              <Section title="Next tab" actionLabel="View all" onActionPress={onViewTabs}>
                <NextTabCard
                  tab={billToNextTab(nextOpenBill)}
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
              <Pressable style={styles.groupsTeaser} onPress={onViewGroups}>
                <Text style={styles.groupsTeaserText}>
                  Split tabs with recurring crews. Create or join a group to get started.
                </Text>
              </Pressable>
            </Section>
          </>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  spinnerWrapper: { marginTop: 40, alignItems: "center" },
  groupsTeaser: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  groupsTeaserText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
