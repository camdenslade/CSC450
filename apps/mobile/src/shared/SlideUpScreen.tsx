import { useEffect, useRef, ReactNode, useCallback } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet } from "react-native";
import { useColors } from "../theme/colors";
import { spring } from "../theme/animations";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 0.5;

type Props = {
  children: (animatedBack: () => void) => ReactNode;
  onBack: () => void;
};

export function SlideUpScreen({ children, onBack }: Props) {
  const c = useColors();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragging = useRef(false);

  useEffect(() => {
    spring.open(translateY).start();
  }, []);

  const animatedBack = useCallback(() => {
    spring.close(translateY, SCREEN_HEIGHT).start(() => onBack());
  }, [onBack]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        !dragging.current && gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderGrant: () => {
        dragging.current = true;
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        dragging.current = false;
        if (gs.dy > SWIPE_THRESHOLD || gs.vy > SWIPE_VELOCITY_THRESHOLD) {
          spring.close(translateY, SCREEN_HEIGHT).start(() => onBack());
        } else {
          spring.open(translateY).start();
        }
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        spring.open(translateY).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: c.background, transform: [{ translateY }] },
      ]}
      {...panResponder.panHandlers}
    >
      {children(animatedBack)}
    </Animated.View>
  );
}
