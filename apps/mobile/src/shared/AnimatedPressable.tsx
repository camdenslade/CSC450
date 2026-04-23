import { useRef, useCallback, ReactNode } from "react";
import { Animated, Pressable, StyleProp, ViewStyle, GestureResponderEvent } from "react-native";

type Props = {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number;
  scaleTo?: number;
  children: ReactNode;
};

export function AnimatedPressable({
  onPress,
  onLongPress,
  style,
  disabled,
  hitSlop,
  scaleTo = 0.96,
  children,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
      mass: 0.6,
    }).start();
  }, [scaleTo]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
      mass: 0.6,
    }).start();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
