import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "../theme/colors";

export function SkeletonCard() {
  const c = useColors();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, opacity: pulse }]}>
      <View style={[styles.line, styles.lineLong, { backgroundColor: c.divider }]} />
      <View style={[styles.line, styles.lineShort, { backgroundColor: c.divider }]} />
      <View style={styles.footer}>
        <View style={[styles.chip, { backgroundColor: c.divider }]} />
        <View style={[styles.chip, { backgroundColor: c.divider }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1,
  },
  line: { height: 14, borderRadius: 7, marginBottom: 10 },
  lineLong: { width: "60%" },
  lineShort: { width: "35%" },
  footer: { flexDirection: "row", gap: 8, marginTop: 4 },
  chip: { height: 26, width: 80, borderRadius: 20 },
});
