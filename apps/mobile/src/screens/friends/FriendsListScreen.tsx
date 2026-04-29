import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, RefreshControl, Modal } from "react-native";
import { SkeletonCard } from "../../shared/SkeletonCard";
import { EmptyIllustration } from "../../shared/EmptyIllustration";
import { useColors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../shared/Layout";
import { colors } from "../../theme/colors";
import { TabKey } from "../../shared/NavBar";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../store/DataContext";
import { ApiFriend } from "../../api/client";
import { PlatformIcon } from "../../shared/PlatformIcon";

type FriendsListScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onAddFriend?: () => void;
  onCreateTab?: () => void;
};

function otherUser(friend: ApiFriend, myUserId: string) {
  return friend.requesterId === myUserId ? friend.recipient : friend.requester;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const PLATFORM_LABELS: Record<string, string> = { paypal: "PayPal", venmo: "Venmo", cashapp: "Cash App" };
const ALL_PLATFORMS = ["venmo", "cashapp", "paypal"] as const;

export function FriendsListScreen({ onTabPress, onAddFriend, onCreateTab }: FriendsListScreenProps) {
  const { apiClient, userId } = useAuth();
  const { friends, friendRequests, refreshFriends } = useData();
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<ApiFriend | null>(null);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFriends().catch(() => {});
    setRefreshing(false);
  }, [refreshFriends]);

  function handleAccept(request: ApiFriend) {
    const u = otherUser(request, userId!);
    Alert.alert("Accept Request", `Accept from ${u.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept", onPress: async () => {
          try { await apiClient.post("/friends/accept", { friendId: request.id }); refreshFriends(); }
          catch (e: unknown) { Alert.alert("Error", e instanceof Error ? e.message : "Failed."); }
        },
      },
    ]);
  }

  function handleDecline(request: ApiFriend) {
    const u = otherUser(request, userId!);
    Alert.alert("Decline", `Decline request from ${u.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline", style: "destructive", onPress: async () => {
          try { await apiClient.del(`/friends/${request.id}`); refreshFriends(); }
          catch (e: unknown) { Alert.alert("Error", e instanceof Error ? e.message : "Failed."); }
        },
      },
    ]);
  }

  function handleRemove(friend: ApiFriend) {
    const u = otherUser(friend, userId!);
    Alert.alert("Remove Friend", `Remove ${u.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try { await apiClient.del(`/friends/${friend.id}`); refreshFriends(); }
          catch (e: unknown) { Alert.alert("Error", e instanceof Error ? e.message : "Failed."); }
        },
      },
    ]);
  }

  return (
    <Layout activeTab="Friends" onTabPress={onTabPress} onCreateTab={onCreateTab}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.textPrimary }]}>Friends</Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={onAddFriend}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>
        <View style={styles.headerSpacer} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >

            {/* Pending requests */}
            {friendRequests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Requests</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{friendRequests.length}</Text>
                  </View>
                </View>
                <View style={styles.card}>
                  {friendRequests.map((req, i) => {
                    const u = otherUser(req, userId!);
                    return (
                      <View key={req.id} style={[styles.requestRow, i > 0 && styles.rowBorder]}>
                        <View style={styles.avatarWrap}>
                          <Text style={styles.avatarText}>{initials(u.displayName)}</Text>
                        </View>
                        <Text style={[styles.friendName, { flex: 1 }]} numberOfLines={1}>{u.displayName}</Text>
                        <View style={styles.requestBtns}>
                          <Pressable
                            style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.8 }]}
                            onPress={() => handleAccept(req)}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.acceptBtnLabel}>Accept</Text>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.8 }]}
                            onPress={() => handleDecline(req)}
                          >
                            <Ionicons name="close" size={16} color={colors.danger} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Friends list */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Friends · {friends.length}</Text>
              {refreshing ? (
                <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
              ) : friends.length === 0 ? (
                <View style={styles.emptyState}>
                  <EmptyIllustration icon="people-outline" />
                  <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No friends yet</Text>
                  <Text style={[styles.emptySub, { color: c.textMuted }]}>Add friends to split tabs with them.</Text>
                  <Pressable style={styles.emptyBtn} onPress={onAddFriend}>
                    <Text style={styles.emptyBtnText}>Add a friend</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.card}>
                  {friends.map((friend, i) => {
                    const u = otherUser(friend, userId!);
                    return (
                      <Pressable
                        key={friend.id}
                        style={[styles.friendRow, i > 0 && styles.rowBorder]}
                        onPress={() => setSelectedFriend(friend)}
                      >
                        <View style={styles.avatarWrap}>
                          <Text style={styles.avatarText}>{initials(u.displayName)}</Text>
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName} numberOfLines={1}>{u.displayName}</Text>
                          {u.defaultPlatform ? (
                            <View style={styles.preferredRow}>
                              <PlatformIcon platform={u.defaultPlatform as "venmo" | "paypal" | "cashapp"} size={14} />
                              <Text style={styles.friendSub}>{PLATFORM_LABELS[u.defaultPlatform]}</Text>
                            </View>
                          ) : (
                            <Text style={styles.friendSub}>No preferred platform</Text>
                          )}
                        </View>
                        {(u.paymentHandles ?? []).length > 0 && (
                          <View style={styles.platformIcons}>
                            {(u.paymentHandles ?? []).map((h) => (
                              <PlatformIcon key={h.platform} platform={h.platform} size={22} />
                            ))}
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
        </ScrollView>
      </View>
      {/* Friend profile sheet */}
      <Modal visible={!!selectedFriend} transparent animationType="slide">
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedFriend(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            {selectedFriend && (() => {
              const u = otherUser(selectedFriend, userId!);
              return (
                <>
                  <View style={styles.sheetHandle} />
                  <View style={styles.sheetAvatar}>
                    <Text style={styles.sheetAvatarText}>{initials(u.displayName)}</Text>
                  </View>
                  <Text style={[styles.sheetName, { color: c.textPrimary }]}>{u.displayName}</Text>
                  {u.defaultPlatform ? (
                    <View style={styles.sheetPlatformRow}>
                      <PlatformIcon platform={u.defaultPlatform as "venmo" | "paypal" | "cashapp"} size={26} />
                      <Text style={[styles.sheetPlatform, { color: c.textPrimary }]}>
                        {PLATFORM_LABELS[u.defaultPlatform]}
                      </Text>
                    </View>
                  ) : null}
                  {u.email ? <Text style={[styles.sheetMeta, { color: c.textMuted }]}>{u.email}</Text> : null}
                  {u.phone ? <Text style={[styles.sheetMeta, { color: c.textMuted }]}>{u.phone}</Text> : null}
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => { setSelectedFriend(null); handleRemove(selectedFriend); }}
                  >
                    <Text style={styles.removeBtnText}>Remove Friend</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerSpacer: { height: 20 },
  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnPressed: { backgroundColor: colors.primaryDark },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  spinner: { marginTop: 60 },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textSecondary },
  badge: { backgroundColor: colors.warning + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "700", color: colors.warning },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  requestRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  friendRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  friendSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  preferredRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  platformIcons: { flexDirection: "row", gap: 4, marginRight: 8 },
  requestBtns: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: colors.primary,
  },
  acceptBtnLabel: { fontSize: 13, fontWeight: "700", color: "#fff" },
  acceptBtnText: { fontSize: 16, color: colors.primaryDark, fontWeight: "700" },
  declineBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: colors.danger + "15",
    alignItems: "center", justifyContent: "center",
  },
  declineBtnText: { fontSize: 14, color: colors.danger, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: 20 },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  sheetAvatar: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  sheetAvatarText: { fontSize: 24, fontWeight: "800", color: colors.primaryDark },
  sheetName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  sheetPlatformRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  sheetPlatform: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  sheetMeta: { fontSize: 13 },
  removeBtn: {
    marginTop: 16, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.danger, alignItems: "center", width: "100%",
  },
  removeBtnText: { fontSize: 15, fontWeight: "600", color: colors.danger },
});
