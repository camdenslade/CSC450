// apps/mobile/src/home/HomeScreen.tsx
import { StyleSheet, ScrollView } from "react-native";
import { Layout } from "../shared/Layout";
import { BalanceCard } from "./components/BalanceCard";
import { PrimaryActions } from "./components/PrimaryActions";
import { TabKey } from "../shared/NavBar";
import { BrandHeader } from "./components/BrandHeader";
import { MetricsRow, Metric } from "./components/MetricsRow";
import { NextTabCard, NextTab } from "./components/NextTabCard";
import { ActivityList, ActivityItem } from "./components/ActivityList";
import { Section } from "./components/Section";

// [START] Filler data to get a rough visual
const metrics: Metric[] = [
  { label: "Open tabs", value: "3", hint: "2 collecting" },
  { label: "Invites", value: "4", hint: "Responses due today" },
  { label: "Settled", value: "$182", hint: "This week" },
];

const nextTab: NextTab = {
  name: "Birthday dinner",
  location: "Blue Harbor",
  time: "Fri 7:30 PM",
  estimate: "$120 est.",
  guests: ["AR", "KD", "LS", "MJ"],
  status: "Awaiting 2 confirmations",
};

const activityItems: ActivityItem[] = [
  {
    title: "You settled Rooftop Drinks",
    detail: "Split with Alex and Priya",
    time: "2h ago",
    tone: "success",
    amount: "-$18.00",
  },
  {
    title: "New invite: Team Lunch",
    detail: "From Casey - Tomorrow",
    time: "4h ago",
    tone: "info",
  },
  {
    title: "Reminder sent to Jordan",
    detail: "Friday Night Tab",
    time: "Yesterday",
    tone: "muted",
  },
];
// [END] Filler data to get a rough visual

export function HomeScreen() {
  const handleTabPress = (tab: TabKey) => {
    // Hook up to navigation when available, log for now
    console.log("Tab pressed:", tab);
  };

  return (
    <Layout activeTab="Home" onTabPress={handleTabPress}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader
          badgeText="TU"
          title="TabUp"
          subtitle="Split restaurant and bar tabs."
        />
        <BalanceCard />
        <PrimaryActions />

        <MetricsRow metrics={metrics} />

        <Section title="Next tab" actionLabel="View calendar">
          <NextTabCard tab={nextTab} />
        </Section>

        <Section title="Activity" actionLabel="See all">
          <ActivityList items={activityItems} />
        </Section>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 120,
  },
});
