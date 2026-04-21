// apps/mobile/src/home/components/BrandHeader.tsx
import { View, Text, Image, StyleSheet } from "react-native";
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
        <Image source={require("../../../assets/logo.png")} style={styles.brandBadgeImage} resizeMode="contain" />
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
  brandBadgeImage: {
    width: 30,
    height: 30,
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
