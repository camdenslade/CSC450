import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useColors } from "../../theme/colors";

export type ActivityItem = {
  title: string;
  detail: string;
  time: string;
  tone: "success" | "info" | "muted" | "danger";
  amount?: string;
};

const TONE_ICONS: Record<ActivityItem["tone"], string> = {
  success: "✓",
  info: "↑",
  danger: "↓",
  muted: "·",
};

function ActivityRow({ item, index, c, bubbleColor, iconColor, amountColor }: {
  item: ActivityItem;
  index: number;
  c: ReturnType<typeof useColors>;
  bubbleColor: Record<ActivityItem["tone"], string>;
  iconColor: Record<ActivityItem["tone"], string>;
  amountColor: (tone: ActivityItem["tone"]) => string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, delay: index * 55, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, delay: index * 55, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: c.divider }]}>
        <View style={[styles.iconBubble, { backgroundColor: bubbleColor[item.tone] }]}>
          <Text style={[styles.iconText, { color: iconColor[item.tone] }]}>
            {TONE_ICONS[item.tone]}
          </Text>
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: c.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.detail, { color: c.textMuted }]}>{item.detail}</Text>
        </View>
        <View style={styles.meta}>
          {item.amount && (
            <Text style={[styles.amount, { color: amountColor(item.tone) }]}>
              {item.amount}
            </Text>
          )}
          <Text style={[styles.time, { color: c.textMuted }]}>{item.time}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function ActivityList({ items }: { items: ActivityItem[] }) {
  const c = useColors();
  const bubbleColor: Record<ActivityItem["tone"], string> = {
    success: c.primaryLight,
    info: "#eff6ff",
    danger: "#fef2f2",
    muted: c.surfaceSecondary,
  };
  const iconColor: Record<ActivityItem["tone"], string> = {
    success: c.success,
    info: "#3b82f6",
    danger: c.danger,
    muted: c.textMuted,
  };
  const amountColor = (tone: ActivityItem["tone"]) =>
    tone === "success" ? c.amountPositive : tone === "danger" ? c.amountNegative : c.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.border }]}>
      {items.map((item, i) => (
        <ActivityRow
          key={i}
          item={item}
          index={i}
          c={c}
          bubbleColor={bubbleColor}
          iconColor={iconColor}
          amountColor={amountColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: { fontSize: 14, fontWeight: "700" },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600" },
  detail: { fontSize: 12, marginTop: 2 },
  meta: { alignItems: "flex-end" },
  amount: { fontSize: 14, fontWeight: "700" },
  time: { fontSize: 11, marginTop: 2 },
});
