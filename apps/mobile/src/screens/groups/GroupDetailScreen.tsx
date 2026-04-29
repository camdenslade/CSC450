// apps/mobile/src/screens/groups/GroupDetailScreen.tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, Modal,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Background } from "../../shared/Background";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiGroup, ApiGroupMember } from "../../api/client";
import { avatarColor } from "../../shared/avatarColor";

type Props = {
  groupId: string;
  onBack: () => void;
};

type SearchResult = { id: string; displayName: string };

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function MemberAvatar({ name, avatarUrl }: { name: string | null | undefined; avatarUrl?: string | null }) {
  const safeName = name ?? "?";
  const ac = avatarColor(safeName);
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: 42, height: 42, borderRadius: 13, marginRight: 12 }} contentFit="cover" />;
  }
  return (
    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: ac.bg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: "800", color: ac.text }}>{initials(safeName)}</Text>
    </View>
  );
}

export function GroupDetailScreen({ groupId, onBack }: Props) {
  const { apiClient, userId } = useAuth();
  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [loading, setLoading] = useState(true);

  // Rename modal
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Add member modal
  const [addVisible, setAddVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // Delete
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isOwner = group?.ownerId === userId;

  function loadGroup() {
    return apiClient
      .get<ApiGroup>(`/groups/${groupId}`)
      .then(setGroup)
      .catch((e: Error) => Alert.alert("Error", e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadGroup(); }, [groupId]);

  async function handleRename() {
    if (!renameValue.trim()) return;
    setRenaming(true);
    try {
      const updated = await apiClient.patch<ApiGroup>(`/groups/${groupId}`, { name: renameValue.trim() });
      setGroup(updated);
      setRenameVisible(false);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to rename group.");
    } finally {
      setRenaming(false);
    }
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const data = await apiClient.get<SearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
      // Filter out existing members
      const memberIds = new Set(group?.members.map((m) => m.userId) ?? []);
      setSearchResults(data.filter((u) => !memberIds.has(u.id)));
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleAddMember(targetUserId: string) {
    setAdding(targetUserId);
    try {
      const updated = await apiClient.post<ApiGroup>(`/groups/${groupId}/members`, { userId: targetUserId });
      setGroup(updated);
      setSearchResults((prev) => prev.filter((u) => u.id !== targetUserId));
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add member.");
    } finally {
      setAdding(null);
    }
  }

  function confirmRemoveMember(member: ApiGroupMember) {
    Alert.alert(
      "Remove Member",
      `Remove ${member.user.displayName} from ${group?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await apiClient.del<ApiGroup>(`/groups/${groupId}/members/${member.userId}`);
              setGroup(updated);
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Failed to remove member.");
            }
          },
        },
      ]
    );
  }

  async function handlePickGroupAvatar() {
    if (!isOwner) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mime = (asset.mimeType as "image/jpeg" | "image/png" | "image/webp") ?? "image/jpeg";
    setUploadingAvatar(true);
    try {
      const { uploadUrl, key } = await apiClient.post<{ uploadUrl: string; key: string }>("/uploads/presign", {
        purpose: "avatar", mime, size: asset.fileSize ?? 500_000,
      });
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: { uri: asset.uri, type: mime, name: "avatar" } as any,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const updated = await apiClient.patch<ApiGroup>(`/groups/${groupId}`, { avatarS3Key: key });
      setGroup(updated);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to upload image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete Group",
      `Delete "${group?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await apiClient.del(`/groups/${groupId}`);
              onBack();
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete group.");
              setDeleting(false);
            }
          },
        },
      ]
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
            <Text style={styles.title} numberOfLines={1}>
              {group?.name ?? "Group"}
            </Text>
            <View style={styles.headerRight}>
              {isOwner && (
                <Pressable hitSlop={12} onPress={() => { setRenameValue(group?.name ?? ""); setRenameVisible(true); }}>
                  <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          {loading || deleting ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : !group ? null : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {/* Hero card */}
              <View style={styles.heroCard}>
                <Pressable style={styles.heroAvatarWrap} onPress={handlePickGroupAvatar} disabled={!isOwner || uploadingAvatar}>
                  {group.avatarUrl ? (
                    <Image source={{ uri: group.avatarUrl }} style={styles.heroAvatarImg} contentFit="cover" />
                  ) : (
                    <View style={styles.heroAvatar}>
                      <Text style={styles.heroAvatarText}>{initials(group.name)}</Text>
                    </View>
                  )}
                  {isOwner && (
                    <View style={styles.heroAvatarOverlay}>
                      {uploadingAvatar
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Ionicons name="camera" size={16} color="#fff" />}
                    </View>
                  )}
                </Pressable>
                <Text style={styles.heroName}>{group.name}</Text>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>
                      {group.members.length} {group.members.length === 1 ? "member" : "members"}
                    </Text>
                  </View>
                  {isOwner && (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>Owner</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Members section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Members</Text>
                  {isOwner && (
                    <Pressable style={styles.addBtn} onPress={() => { setSearchQuery(""); setSearchResults([]); setAddVisible(true); }}>
                      <Ionicons name="person-add-outline" size={15} color={colors.primary} />
                      <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.membersList}>
                  {group.members.map((m, i) => (
                    <View key={m.userId} style={[styles.memberRow, i < group.members.length - 1 && styles.memberRowBorder]}>
                      <MemberAvatar name={m.user.displayName} avatarUrl={m.user.avatarUrl} />
                      <Text style={styles.memberName}>{m.user.displayName}</Text>
                      {m.userId === group.ownerId && (
                        <Text style={styles.ownerTag}>Owner</Text>
                      )}
                      {isOwner && m.userId !== userId && (
                        <Pressable hitSlop={10} onPress={() => confirmRemoveMember(m)}>
                          <Ionicons name="remove-circle-outline" size={20} color={colors.danger} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Danger zone */}
              {isOwner && (
                <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
                  <Text style={styles.deleteBtnText}>Delete Group</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Background>

      {/* Rename modal */}
      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Group</Text>
            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleRename}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRenameVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirm, renaming && styles.btnDisabled]} onPress={handleRename} disabled={renaming}>
                {renaming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add member modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.addModalCard]}>
            <View style={styles.addModalHeader}>
              <Text style={styles.modalTitle}>Add Member</Text>
              <Pressable hitSlop={10} onPress={() => setAddVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCorrect={false}
                autoFocus
              />
              <Pressable style={[styles.searchBtn, searching && styles.btnDisabled]} onPress={handleSearch} disabled={searching}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>Search</Text>}
              </Pressable>
            </View>
            {searchResults.map((u) => (
              <View key={u.id} style={styles.resultRow}>
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultAvatarText}>{initials(u.displayName)}</Text>
                </View>
                <Text style={styles.resultName}>{u.displayName}</Text>
                <Pressable
                  style={[styles.addMemberBtn, adding === u.id && styles.btnDisabled]}
                  onPress={() => handleAddMember(u.id)}
                  disabled={adding === u.id}
                >
                  {adding === u.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.addMemberBtnText}>Add</Text>}
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  back: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 64 },
  title: { flex: 1, fontSize: 22, fontWeight: "800", color: colors.textPrimary, textAlign: "center", letterSpacing: -0.5 },
  headerSpacer: { minWidth: 64 },
  headerRight: { minWidth: 64, alignItems: "flex-end" },
  spinner: { marginTop: 60 },
  content: { paddingBottom: 40, gap: 24 },

  heroCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 28,
    alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10,
  },
  heroAvatarWrap: { width: 80, height: 80, marginBottom: 4 },
  heroAvatarImg: { width: 80, height: 80, borderRadius: 24 },
  heroAvatar: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  heroAvatarText: { fontSize: 30, fontWeight: "800", color: colors.primaryDark },
  heroAvatarOverlay: {
    position: "absolute", bottom: -4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface,
  },
  heroName: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  heroBadge: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  heroBadgeText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  ownerBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  ownerBadgeText: { fontSize: 13, fontWeight: "600", color: colors.primaryDark },

  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontWeight: "700", color: colors.primary },

  membersList: { backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  memberAvatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  memberName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  ownerTag: { fontSize: 11, fontWeight: "700", color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6 },

  deleteBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1.5, borderColor: colors.danger },
  deleteBtnText: { fontSize: 15, fontWeight: "600", color: colors.danger },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 16 },
  addModalCard: { gap: 14 },
  addModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  modalInput: {
    backgroundColor: colors.surfaceSecondary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", backgroundColor: colors.primary },
  modalConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  searchBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  searchBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  resultAvatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  resultAvatarText: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },
  resultName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  addMemberBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addMemberBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
});
