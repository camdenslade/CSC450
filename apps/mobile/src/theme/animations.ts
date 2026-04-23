import { Animated, Easing } from "react-native";

export const spring = {
  open: (value: Animated.Value, toValue = 0) =>
    Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      damping: 32,
      stiffness: 280,
      mass: 0.75,
    }),
  close: (value: Animated.Value, toValue: number, duration = 240) =>
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }),
};

export const fade = {
  in: (value: Animated.Value, duration = 200, delay = 0) =>
    Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
  out: (value: Animated.Value, duration = 160) =>
    Animated.timing(value, {
      toValue: 0,
      duration,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }),
};

export const slideUp = {
  in: (value: Animated.Value, distance = 24, duration = 260, delay = 0) =>
    Animated.timing(value, {
      toValue: 0,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
};
