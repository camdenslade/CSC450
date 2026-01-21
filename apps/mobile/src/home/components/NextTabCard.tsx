// apps/mobile/src/home/components/NextTabCard.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export type NextTab = {
  name: string;
  location: string;
  time: string;
  estimate: string;
  guests: string[];
  status: string;
};

// Preview of the upcoming tab
export function NextTabCard({ tab }: { tab: NextTab }) {
  return (
    <View style={styles.nextTabCard}>
      <View style={styles.nextTabTop}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>Fri</Text>
        </View>
        <View style={styles.tabCopy}>
          <Text style={styles.tabName}>{tab.name}</Text>
          <Text style={styles.tabMeta}>
            {tab.location} | {tab.time}
          </Text>
        </View>
        <Text style={styles.tabEstimate}>{tab.estimate}</Text>
      </View>

      <View style={styles.avatarRow}>
        {tab.guests.map((guest) => (
          <View key={guest} style={styles.avatar}>
            <Text style={styles.avatarText}>{guest}</Text>
          </View>
        ))}
        <Text style={styles.tabStatus}>{tab.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nextTabCard: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  nextTabTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadgeText: {
    fontWeight: "800",
    color: "#000",
    fontSize: 14,
  },
  tabCopy: {
    flex: 1,
    marginLeft: 12,
  },
  tabName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  tabMeta: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  tabEstimate: {
    marginLeft: 8,
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "700",
    color: "#0f2c1c",
    fontSize: 12,
  },
  tabStatus: {
    marginLeft: 6,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
