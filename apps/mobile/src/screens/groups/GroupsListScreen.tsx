// apps/mobile/src/screens/groups/GroupsListScreen.tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList,
  Pressable, RefreshControl, StyleSheet, Text, View,
} from "react-native";
import { AnimatedPressable } from "../../shared/AnimatedPressable";
import { EmptyIllustration } from "../../shared/EmptyIllustration";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Background } from "../../shared/Background";
import { colors, useColors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiGroup } from "../../api/client";

type Props = {
  onBack?: () => void;
  onViewGroup: (groupId: string) => void;
  onCreateGroup: () => void;
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function GroupsListScreen({ onBack, onViewGroup, onCreateGroup }: Props) {
  const { apiClient } = useAuth();
  const c = useColors();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await apiClient.get<ApiGroup[]>("/groups");
      setGroups(data);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load groups.");
    }
  }, [apiClient]);

  useEffect(() => {
    fetchGroups().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  function renderGroup({ item }: { item: ApiGroup }) {
    const memberPreview = item.members.slice(0, 3).map((m) => initials(m.user.displayName));
    return (
      <AnimatedPressable
        style={styles.card}
        onPress={() => onViewGroup(item.id)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardAvatar}>
            <Text style={styles.cardAvatarText}>{initials(item.name)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.members.length} {item.members.length === 1 ? "member" : "members"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        {memberPreview.length > 0 && (
          <View style={styles.cardFooter}>
            <View style={styles.avatarStack}>
              {memberPreview.map((init, i) => (
                <View key={i} style={[styles.stackAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: memberPreview.length - i }]}>
                  <Text style={styles.stackAvatarText}>{init}</Text>
                </View>
              ))}
              {item.members.length > 3 && (
                <View style={[styles.stackAvatar, styles.stackAvatarMore, { marginLeft: -8 }]}>
                  <Text style={styles.stackAvatarMoreText}>+{item.members.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={12}>
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>
            <Text style={styles.title}>Groups</Text>
            <Pressable style={styles.newBtn} onPress={onCreateGroup}>
              <Text style={styles.newBtnText}>+ New</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : groups.length === 0 ? (
            <View style={styles.empty}>
              <EmptyIllustration icon="people-outline" />
              <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No groups yet</Text>
              <Text style={[styles.emptySubtext, { color: c.textMuted }]}>Create one to split tabs with your usual crew.</Text>
              <Pressable style={styles.emptyButton} onPress={onCreateGroup}>
                <Text style={styles.emptyButtonText}>Create a group</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(g) => g.id}
              renderItem={renderGroup}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            />
          )}
        </SafeAreaView>
      </Background>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  header: {
    flexDirection: "row", alignItems: "center", marginBottom: 24,
    paddingHorizontal: 16,
  },
  back: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 64 },
  title: { flex: 1, fontSize: 22, fontWeight: "800", color: colors.textPrimary, textAlign: "center", letterSpacing: -0.5 },
  newBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  spinner: { marginTop: 60 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardAvatar: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  cardAvatarText: { fontSize: 16, fontWeight: "800", color: colors.primaryDark },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  cardMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardFooter: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  stackAvatar: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface,
  },
  stackAvatarText: { fontSize: 10, fontWeight: "800", color: colors.primaryDark },
  stackAvatarMore: { backgroundColor: colors.surfaceSecondary },
  stackAvatarMoreText: { fontSize: 9, fontWeight: "700", color: colors.textMuted },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIcon: { marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  emptyButton: {
    marginTop: 8, backgroundColor: colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
  },
  emptyButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
