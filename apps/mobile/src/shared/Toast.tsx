import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type Props = { message: string; visible: boolean };

export function Toast({ message, visible }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", bottom: 100, alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, zIndex: 999,
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
