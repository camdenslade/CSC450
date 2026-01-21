// apps/mobile/src/home/components/BrandHeader.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

type BrandHeaderProps = {
  title: string;
  subtitle: string;
  badgeText: string;
};

// Hero brand marker for the home screen
export function BrandHeader({ title, subtitle, badgeText }: BrandHeaderProps) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandBadge}>
        <Text style={styles.brandBadgeText}>{badgeText}</Text>
      </View>
      <View style={styles.brandCopy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  brandBadgeText: {
    color: colors.textPrimary,
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 12,
  },
  brandCopy: {
    marginLeft: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
  },
});
