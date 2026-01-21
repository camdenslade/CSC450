import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { colors } from "../theme/colors";

type BackgroundProps = {
  children: React.ReactNode;
};

// Provides a reusable, themed background with soft floating shapes.
export function Background({ children }: BackgroundProps) {
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const floatC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easing = Easing.inOut(Easing.quad);
    const animate = (
      value: Animated.Value,
      duration: number,
      delay: number
    ) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            delay,
            easing,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: -1,
            duration,
            easing,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    };

    const loops = [
      animate(floatA, 7000, 0),
      animate(floatB, 9000, 300),
      animate(floatC, 8000, 600),
    ];

    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [floatA, floatB, floatC]);

  return (
    <View style={styles.root}>
      <View style={styles.shapes} pointerEvents="none">
        <Animated.View
          style={[
            styles.shape,
            styles.shapeOne,
            {
              transform: [
                {
                  translateX: floatA.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-12, 12],
                  }),
                },
                {
                  translateY: floatA.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [8, -8],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.shape,
            styles.shapeTwo,
            {
              transform: [
                {
                  translateX: floatB.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [10, -10],
                  }),
                },
                {
                  translateY: floatB.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-10, 10],
                  }),
                },
                {
                  scale: floatB.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [0.98, 1.04],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.shape,
            styles.shapeThree,
            {
              transform: [
                {
                  translateX: floatC.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-8, 8],
                  }),
                },
                {
                  translateY: floatC.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [10, -10],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  shapes: {
    ...StyleSheet.absoluteFillObject,
  },
  shape: {
    position: "absolute",
  },
  shapeOne: {
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    left: -60,
    backgroundColor: colors.surface,
    opacity: 0.35,
  },
  shapeTwo: {
    width: 320,
    height: 320,
    borderRadius: 180,
    top: 180,
    right: -120,
    backgroundColor: colors.success,
    opacity: 0.24,
  },
  shapeThree: {
    width: 260,
    height: 260,
    borderRadius: 140,
    bottom: -80,
    left: 40,
    backgroundColor: colors.surface,
    opacity: 0.28,
  },
});
