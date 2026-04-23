import { View, Text } from "react-native";
import { useColors } from "../../theme/colors";
import { AppIcon } from "../../shared/AppIcon";

type BrandHeaderProps = {
  title: string;
  subtitle: string;
  badgeText: string;
};

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 }}>
      <AppIcon size={44} />
      <View style={{ marginLeft: 14 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 1 }}>{subtitle}</Text>
      </View>
    </View>
  );
}
