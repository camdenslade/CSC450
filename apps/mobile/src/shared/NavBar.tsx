import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export type TabKey = "Home" | "Friends" | "Tabs" | "Profile";

type NavBarProps = {
  active?: TabKey;
  onTabPress?: (tab: TabKey) => void;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "Home", label: "Home" },
  { key: "Friends", label: "Friends" },
  { key: "Tabs", label: "Tabs" },
  { key: "Profile", label: "Profile" },
];

export function NavBar({ active = "Home", onTabPress }: NavBarProps) {
  // Simple text-only tabs until icons/navigation are wired up
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
              isActive && styles.itemActive,
            ]}
            onPress={() => onTabPress?.(tab.key)}
          >
            <View style={[styles.dot, isActive && styles.dotActive]} />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.navSurface,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#d7e0d9",
    marginTop: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemPressed: {
    backgroundColor: "#f0f3f0",
  },
  itemActive: {
    backgroundColor: "#eef7f1",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: colors.navMuted,
    marginBottom: 6,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    opacity: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navMuted,
  },
  labelActive: {
    color: colors.navText,
  },
});
