import { useRef, ReactNode } from "react";
import { Animated, PanResponder, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const THRESHOLD = 72;
const ACTION_WIDTH = 80;

type Props = {
  children: ReactNode;
  onSettle: () => void;
  enabled?: boolean;
};

export function SwipeToSettle({ children, onSettle, enabled = true }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const settling = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        enabled && !settling.current && gs.dx < -8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) translateX.setValue(Math.max(gs.dx, -ACTION_WIDTH - 20));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -THRESHOLD) {
          settling.current = true;
          Animated.timing(translateX, { toValue: -ACTION_WIDTH, duration: 120, useNativeDriver: true }).start(() => {
            onSettle();
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start(() => {
              settling.current = false;
            });
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
      },
    })
  ).current;

  const actionOpacity = translateX.interpolate({
    inputRange: [-ACTION_WIDTH, -THRESHOLD / 2, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.action, { opacity: actionOpacity }]}>
        <Ionicons name="checkmark-circle" size={22} color="#fff" />
        <Text style={styles.actionText}>Paid</Text>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden" },
  action: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: ACTION_WIDTH, backgroundColor: "#22C55E",
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  actionText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
