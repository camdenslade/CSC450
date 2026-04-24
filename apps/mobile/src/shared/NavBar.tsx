import { Fragment } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";

export type TabKey = "Home" | "Friends" | "Tabs" | "Profile";

type NavBarProps = {
  active?: TabKey;
  onTabPress?: (tab: TabKey) => void;
  onCreateTab?: () => void;
  tabsBadge?: number;
};

type TabConfig = { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap };

const TABS: TabConfig[] = [
  { key: "Home",    label: "Home",    icon: "home-outline",   iconActive: "home" },
  { key: "Friends", label: "Friends", icon: "people-outline", iconActive: "people" },
  { key: "Tabs",    label: "Tabs",    icon: "list-outline",   iconActive: "list" },
  { key: "Profile", label: "Profile", icon: "person-outline", iconActive: "person" },
];

export function NavBar({ active = "Home", onTabPress, onCreateTab, tabsBadge }: NavBarProps) {
  const { avatarUrl } = useAuth();
  const c = useColors();

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <View style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: c.surface, borderRadius: 24,
        paddingHorizontal: 8, paddingVertical: 8,
        shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16, elevation: 8,
        borderWidth: 1, borderColor: c.border,
      }}>
        {TABS.map((tab, i) => {
          const isActive = tab.key === active;
          const showFab = i === 2;
          return (
            <Fragment key={tab.key}>
              {showFab && (
                <Pressable
                  style={({ pressed }) => ({
                    width: 52, height: 52, borderRadius: 26,
                    backgroundColor: pressed ? c.primaryDark : c.primary,
                    alignItems: "center", justifyContent: "center",
                    shadowColor: c.primary, shadowOpacity: 0.4,
                    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
                    elevation: 8, marginHorizontal: 4, marginBottom: 8,
                  })}
                  onPress={onCreateTab}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => ({
                  flex: 1, alignItems: "center", paddingVertical: 4,
                  borderRadius: 16, position: "relative",
                  backgroundColor: pressed ? c.primaryLight : "transparent",
                })}
                onPress={() => onTabPress?.(tab.key)}
              >
                {tab.key === "Profile" && avatarUrl
                  ? <Image source={{ uri: avatarUrl }} style={{
                      width: 22, height: 22, borderRadius: 11, marginBottom: 2,
                      borderWidth: 1.5, borderColor: isActive ? c.primary : c.border,
                    }} />
                  : (
                    <View style={{ position: "relative" }}>
                      <Ionicons
                        name={isActive ? tab.iconActive : tab.icon}
                        size={22}
                        color={isActive ? c.primary : c.navMuted}
                        style={{ marginBottom: 2 }}
                      />
                      {tab.key === "Tabs" && !!tabsBadge && (
                        <View style={{
                          position: "absolute", top: -3, right: -6,
                          backgroundColor: "#EF4444", borderRadius: 8,
                          minWidth: 16, height: 16, paddingHorizontal: 3,
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                            {tabsBadge > 9 ? "9+" : tabsBadge}
                          </Text>
                        </View>
                      )}
                    </View>
                  )
                }
                <Text style={{ fontSize: 11, fontWeight: "600", color: isActive ? c.textPrimary : c.navMuted }}>
                  {tab.label}
                </Text>
                {isActive && (
                  <View style={{
                    position: "absolute", bottom: -2,
                    width: 4, height: 4, borderRadius: 2,
                    backgroundColor: c.primary,
                  }} />
                )}
              </Pressable>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}
