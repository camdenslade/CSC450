// apps/mobile/src/screens/tabs/TabsListScreen.tsx
import { View, Text, StyleSheet, SectionList, Pressable } from "react-native";
import { Layout } from "../../shared/Layout";
import { colors } from "../../theme/colors";
import { TabKey } from "../../shared/NavBar";

type TabsListScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onViewTabDetail?: () => void;
};

type Tab = {
  id: string;
  name: string;
  location: string;
  date: string;
  total: number;
  yourShare: number;
  participants: number;
  status: "open" | "settled";
};

// Mock data
const mockTabs: Tab[] = [
  {
    id: "1",
    name: "Birthday Dinner",
    location: "Blue Harbor",
    date: "Today, 7:30 PM",
    total: 156.5,
    yourShare: 39.13,
    participants: 4,
    status: "open",
  },
  {
    id: "2",
    name: "Happy Hour",
    location: "The Brew House",
    date: "Yesterday",
    total: 84.0,
    yourShare: 28.0,
    participants: 3,
    status: "open",
  },
  {
    id: "3",
    name: "Weekend Brunch",
    location: "Sunny Side Cafe",
    date: "2 days ago",
    total: 67.2,
    yourShare: 22.4,
    participants: 3,
    status: "settled",
  },
  {
    id: "4",
    name: "Team Lunch",
    location: "Corner Bistro",
    date: "Last week",
    total: 215.75,
    yourShare: 43.15,
    participants: 5,
    status: "settled",
  },
];

const openTabs = mockTabs.filter((t) => t.status === "open");
const settledTabs = mockTabs.filter((t) => t.status === "settled");

const sections = [
  { title: "Open Tabs", data: openTabs },
  { title: "Settled", data: settledTabs },
];

export function TabsListScreen({ onTabPress, onViewTabDetail }: TabsListScreenProps) {
  const renderTab = ({ item }: { item: Tab }) => {
    const isOpen = item.status === "open";

    return (
      <Pressable style={styles.tabCard} onPress={onViewTabDetail}>
        <View style={styles.tabHeader}>
          <Text style={styles.tabName}>{item.name}</Text>
          {isOpen && <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>Open</Text>
          </View>}
        </View>

        <Text style={styles.location}>{item.location}</Text>
        <Text style={styles.date}>{item.date}</Text>

        <View style={styles.divider} />

        <View style={styles.tabFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerValue}>${item.total.toFixed(2)}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Your share</Text>
            <Text style={[styles.footerValue, styles.yourShare]}>
              ${item.yourShare.toFixed(2)}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>People</Text>
            <Text style={styles.footerValue}>{item.participants}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  return (
    <Layout activeTab="Tabs" onTabPress={onTabPress}>
      <View style={styles.container}>
        <Text style={styles.title}>Tabs</Text>

        <SectionList
          sections={sections}
          renderItem={renderTab}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000000",
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
  tabName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  openBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000",
  },
  location: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e9e6",
    marginVertical: 12,
  },
  tabFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  yourShare: {
    color: colors.primary,
  },
});
