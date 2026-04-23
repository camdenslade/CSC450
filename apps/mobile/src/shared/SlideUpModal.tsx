import { useEffect, useRef, ReactNode } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { useColors } from "../theme/colors";
import { spring, fade } from "../theme/animations";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onHidden?: () => void;
  children: ReactNode;
};

export function SlideUpModal({ visible, onHidden, children }: Props) {
  const c = useColors();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        spring.open(translateY),
        fade.in(backdropOpacity, 220),
      ]).start();
    } else {
      Animated.parallel([
        spring.close(translateY, SCREEN_HEIGHT),
        fade.out(backdropOpacity, 200),
      ]).start(() => onHidden?.());
    }
  }, [visible]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: c.background, transform: [{ translateY }] },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.35)" },
});
