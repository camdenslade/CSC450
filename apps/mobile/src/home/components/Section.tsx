// apps/mobile/src/home/components/Section.tsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors } from "../../theme/colors";

type SectionProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
};

// Standard section wrapper with optional action link
export function Section({
  title,
  actionLabel,
  onActionPress,
  children,
}: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel ? (
          <Pressable onPress={onActionPress} hitSlop={8}>
            <Text style={styles.sectionAction}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionAction: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
});
