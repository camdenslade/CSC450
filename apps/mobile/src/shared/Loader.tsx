// Branded loading indicator — pulsing AppIcon with a label
import { useEffect, useRef } from "react";
import { Animated, View, Text } from "react-native";
import { AppIcon } from "./AppIcon";
import { useColors } from "../theme/colors";

export function Loader({ label = "Loading…" }: { label?: string }) {
  const c = useColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Animated.View style={{ opacity: pulse }}>
        <AppIcon size={56} />
      </Animated.View>
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.textMuted }}>{label}</Text>
    </View>
  );
}
