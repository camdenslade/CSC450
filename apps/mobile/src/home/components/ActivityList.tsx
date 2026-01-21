// apps/mobile/src/home/components/ActivityList.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export type ActivityItem = {
  title: string;
  detail: string;
  time: string;
  tone: "success" | "info" | "muted";
  amount?: string;
};

// Feed of recent activity items
export function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <>
      {items.map((item) => {
        const toneStyle =
          item.tone === "success"
            ? styles.activityDotSuccess
            : item.tone === "info"
            ? styles.activityDotInfo
            : styles.activityDotMuted;

        return (
          <View key={item.title} style={styles.activityRow}>
            <View style={[styles.activityDot, toneStyle]} />
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityDetail}>{item.detail}</Text>
            </View>
            <View style={styles.activityMeta}>
              {item.amount ? (
                <Text style={styles.activityAmount}>{item.amount}</Text>
              ) : null}
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  activityRow: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textMuted,
    flexDirection: "row",
    alignItems: "center",
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
  },
  activityDotSuccess: {
    backgroundColor: colors.primary,
  },
  activityDotInfo: {
    backgroundColor: colors.textSecondary,
  },
  activityDotMuted: {
    backgroundColor: colors.textMuted,
  },
  activityCopy: {
    flex: 1,
    marginLeft: 10,
  },
  activityTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  activityDetail: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  activityMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  activityAmount: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  activityTime: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 11,
  },
});
