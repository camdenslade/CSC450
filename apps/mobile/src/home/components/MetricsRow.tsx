import { View, Text, StyleSheet } from "react-native";
import { useColors } from "../../theme/colors";

export type Metric = { label: string; value: string; hint: string };

export function MetricsRow({ metrics }: { metrics: Metric[] }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      {metrics.map((m) => (
        <View key={m.label} style={[styles.pill, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.value, { color: c.textPrimary }]}>{m.value}</Text>
          <Text style={[styles.label, { color: c.textSecondary }]}>{m.label}</Text>
          <Text style={[styles.hint, { color: c.textMuted }]}>{m.hint}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  pill: {
    flex: 1, borderRadius: 16, padding: 14,
    borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  value: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: "600", marginTop: 4 },
  hint: { fontSize: 11, marginTop: 2 },
});
