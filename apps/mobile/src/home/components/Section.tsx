import { ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "../../theme/colors";

type SectionProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
};

export function Section({ title, actionLabel, onActionPress, children }: SectionProps) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
        {actionLabel && (
          <Pressable onPress={onActionPress} hitSlop={10}>
            <Text style={[styles.action, { color: c.primary }]}>{actionLabel} →</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  action: {
    fontSize: 13,
    fontWeight: "600",
  },
});
