// apps/mobile/src/home/components/MetricsRow.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export type Metric = { label: string; value: string; hint: string };

// Horizontal trio of key stats
export function MetricsRow({ metrics }: { metrics: Metric[] }) {
  return (
    <View style={styles.metricsRow}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCard}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
          <Text style={styles.metricHint}>{metric.hint}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  metricValue: {
    marginTop: 6,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  metricHint: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
});
