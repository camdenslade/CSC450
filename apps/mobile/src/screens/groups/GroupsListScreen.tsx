// apps/mobile/src/screens/groups/GroupsListScreen.tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Background } from "../../shared/Background";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiGroup } from "../../api/client";

type Props = {
  onBack?: () => void;
  onViewGroup: (groupId: string) => void;
  onCreateGroup: () => void;
};

export function GroupsListScreen({ onBack, onViewGroup, onCreateGroup }: Props) {
  const { apiClient } = useAuth();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ApiGroup[]>("/groups")
      .then(setGroups)
      .catch((e: Error) => Alert.alert("Error", e.message))
      .finally(() => setLoading(false));
  }, []);

  function renderGroup({ item }: { item: ApiGroup }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onViewGroup(item.id)}
      >
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.members.length} {item.members.length === 1 ? "member" : "members"}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={12}>
              <Text style={styles.back}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Groups</Text>
            <Pressable style={styles.createButton} onPress={onCreateGroup}>
              <Text style={styles.createButtonText}>+ New</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : groups.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No groups yet.</Text>
              <Text style={styles.emptySubtext}>Create one to split tabs with recurring crews.</Text>
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
            />
          )}
        </SafeAreaView>
      </Background>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  back: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 48 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createButtonText: { fontSize: 14, fontWeight: "700", color: "#000" },
  spinner: { marginTop: 60 },
  list: { paddingBottom: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  emptyButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyButtonText: { fontSize: 15, fontWeight: "700", color: "#000" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardPressed: { opacity: 0.75 },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: { fontSize: 20, fontWeight: "700", color: "#000" },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  cardMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textMuted },
});
