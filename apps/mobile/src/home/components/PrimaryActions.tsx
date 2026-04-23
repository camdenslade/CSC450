import { View, Text, StyleSheet } from "react-native";
import { useColors } from "../../theme/colors";
import { AnimatedPressable } from "../../shared/AnimatedPressable";

type PrimaryActionsProps = {
  onCreateTab?: () => void;
  onViewTabs?: () => void;
};

export function PrimaryActions({ onCreateTab, onViewTabs }: PrimaryActionsProps) {
  const c = useColors();
  return (
    <View style={styles.container}>
      <View style={styles.primaryWrap}>
        <AnimatedPressable
          style={[styles.primary, { backgroundColor: c.primary, shadowColor: c.primary }]}
          onPress={onCreateTab}
          scaleTo={0.97}
        >
          <Text style={styles.primaryIcon}>+</Text>
          <Text style={styles.primaryText}>New Tab</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.secondaryWrap}>
        <AnimatedPressable
          style={[styles.secondary, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={onViewTabs}
          scaleTo={0.97}
        >
          <Text style={[styles.secondaryText, { color: c.textSecondary }]}>View Tabs</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  primaryWrap: { flex: 2 },
  secondaryWrap: { flex: 1 },
  primary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  primaryIcon: { fontSize: 20, color: "#fff", fontWeight: "300", lineHeight: 22 },
  primaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  secondary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryText: { fontSize: 14, fontWeight: "600" },
});
