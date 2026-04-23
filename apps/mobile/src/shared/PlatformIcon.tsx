// apps/mobile/src/shared/PlatformIcon.tsx
import { Image, StyleSheet, View } from "react-native";

type Platform = "venmo" | "paypal" | "cashapp";

const ICONS: Record<Platform, ReturnType<typeof require>> = {
  venmo:   require("../../assets/icons/venmo.png"),
  paypal:  require("../../assets/icons/paypal.png"),
  cashapp: require("../../assets/icons/cashapp.png"),
};

type Props = {
  platform: Platform;
  size?: number;
};

export function PlatformIcon({ platform, size = 24 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Image
        source={ICONS[platform]}
        style={{ width: size, height: size, borderRadius: size * 0.28 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
});
