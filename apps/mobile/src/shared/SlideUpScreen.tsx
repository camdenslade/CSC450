// Wraps an overlay screen with slide-up-on-mount / slide-down-on-back animation.
import { useEffect, useRef, ReactNode, useCallback } from "react";
import { Animated, Dimensions, StyleSheet } from "react-native";
import { useColors } from "../theme/colors";
import { spring } from "../theme/animations";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  children: (animatedBack: () => void) => ReactNode;
  onBack: () => void;
};

export function SlideUpScreen({ children, onBack }: Props) {
  const c = useColors();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    spring.open(translateY).start();
  }, []);

  const animatedBack = useCallback(() => {
    spring.close(translateY, SCREEN_HEIGHT).start(() => onBack());
  }, [onBack]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: c.background, transform: [{ translateY }] },
      ]}
    >
      {children(animatedBack)}
    </Animated.View>
  );
}
