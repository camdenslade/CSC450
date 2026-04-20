// apps/mobile/src/screens/groups/GroupDetailScreen.tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Background } from "../../shared/Background";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiGroup, ApiGroupMember } from "../../api/client";

type Props = {
  groupId: string;
  onBack: () => void;
};

function MemberRow({ member }: { member: ApiGroupMember }) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {(member.user.displayName ?? "?").charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.memberName}>{member.user.displayName}</Text>
    </View>
  );
}

export function GroupDetailScreen({ groupId, onBack }: Props) {
  const { apiClient, userId } = useAuth();
  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ApiGroup>(`/groups/${groupId}`)
      .then(setGroup)
      .catch((e: Error) => Alert.alert("Error", e.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={12}>
              <Text style={styles.back}>Back</Text>
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              {group?.name ?? "Group"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : !group ? null : (
            <ScrollView contentContainerStyle={styles.content}>
              {/* Group avatar + name */}
              <View style={styles.groupCard}>
                <View style={styles.groupAvatar}>
                  <Text style={styles.groupAvatarText}>
                    {group.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.ownerId === userId && (
                  <Text style={styles.ownerBadge}>You own this group</Text>
                )}
              </View>

              {/* Members */}
              <Text style={styles.sectionTitle}>
                Members ({group.members.length})
              </Text>
              <View style={styles.membersList}>
                {group.members.map((m) => (
                  <MemberRow key={m.userId} member={m} />
                ))}
              </View>
            </ScrollView>
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
  },
  back: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 48 },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  headerSpacer: { minWidth: 48 },
  spinner: { marginTop: 60 },
  content: { paddingBottom: 40 },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  groupAvatarText: { fontSize: 30, fontWeight: "700", color: "#000" },
  groupName: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  ownerBadge: { fontSize: 13, color: colors.textMuted },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  membersList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { fontSize: 16, fontWeight: "700", color: "#000" },
  memberName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
});
