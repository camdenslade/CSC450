// apps/mobile/src/screens/friends/FriendsListScreen.tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { Layout } from "../../shared/Layout";
import { Section } from "../../home/components/Section";
import { colors } from "../../theme/colors";
import { TabKey } from "../../shared/NavBar";
import { useAuth } from "../../auth/AuthContext";
import { ApiFriend } from "../../api/client";

type FriendsListScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onAddFriend?: () => void;
};

/** Extract the "other" user from a friendship relative to the caller. */
function otherUser(friend: ApiFriend, myUserId: string) {
  return friend.requesterId === myUserId ? friend.recipient : friend.requester;
}

export function FriendsListScreen({ onTabPress, onAddFriend }: FriendsListScreenProps) {
  const { apiClient, userId } = useAuth();
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [requests, setRequests] = useState<ApiFriend[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.get<ApiFriend[]>("/friends"),
      apiClient.get<ApiFriend[]>("/friends/requests"),
    ])
      .then(([f, r]) => { setFriends(f); setRequests(r); })
      .catch((e: Error) => Alert.alert("Error", e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, []);

  function handleAccept(request: ApiFriend) {
    const u = otherUser(request, userId!);
    Alert.alert("Accept Request", `Accept friend request from ${u.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          try {
            await apiClient.post("/friends/accept", { friendId: request.id });
            loadData();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to accept.");
          }
        },
      },
    ]);
  }

  function handleDecline(request: ApiFriend) {
    const u = otherUser(request, userId!);
    Alert.alert("Decline Request", `Decline friend request from ${u.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.del(`/friends/${request.id}`);
            loadData();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to decline.");
          }
        },
      },
    ]);
  }

  function handleRemove(friend: ApiFriend) {
    const u = otherUser(friend, userId!);
    Alert.alert("Remove Friend", `Remove ${u.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.del(`/friends/${friend.id}`);
            loadData();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to remove.");
          }
        },
      },
    ]);
  }

  const renderFriend = ({ item }: { item: ApiFriend }) => {
    const u = otherUser(item, userId!);
    return (
      <Pressable style={styles.friendCard} onLongPress={() => handleRemove(item)}>
        <View style={styles.friendInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{u.displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.friendName}>{u.displayName}</Text>
        </View>
      </Pressable>
    );
  };

  const renderRequest = ({ item }: { item: ApiFriend }) => {
    const u = otherUser(item, userId!);
    return (
      <View style={styles.requestCard}>
        <View style={styles.friendInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{u.displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.friendName}>{u.displayName}</Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable style={styles.acceptButton} onPress={() => handleAccept(item)}>
            <Text style={styles.acceptButtonText}>Accept</Text>
          </Pressable>
          <Pressable style={styles.declineButton} onPress={() => handleDecline(item)}>
            <Text style={styles.declineButtonText}>Decline</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Layout activeTab="Friends" onTabPress={onTabPress}>
      <View style={styles.container}>
        <Text style={styles.title}>Friends</Text>
        {loading && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
        {!loading && (
          <>
            {requests.length > 0 && (
              <Section title="Friend Requests" actionLabel={`${requests.length} pending`}>
                <FlatList
                  data={requests}
                  renderItem={renderRequest}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </Section>
            )}
            <Section title="Friends" actionLabel="Add" onActionPress={onAddFriend}>
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>
                  No friends yet. Tap Add to invite someone.
                </Text>
              ) : (
                <FlatList
                  data={friends}
                  renderItem={renderFriend}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.listContent}
                />
              )}
            </Section>
          </>
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  spinner: { marginTop: 40 },
  emptyText: { color: colors.textMuted, marginTop: 12, lineHeight: 22 },
  listContent: { gap: 10, paddingTop: 12 },
  friendCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 2,
  },
  friendInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#000" },
  friendName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  requestCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 2,
  },
  requestActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  acceptButton: {
    flex: 1, backgroundColor: colors.primary, paddingVertical: 8,
    borderRadius: 10, alignItems: "center",
  },
  acceptButtonText: { fontSize: 14, fontWeight: "600", color: "#000" },
  declineButton: {
    flex: 1, backgroundColor: colors.error + "20", paddingVertical: 8,
    borderRadius: 10, alignItems: "center",
  },
  declineButtonText: { fontSize: 14, fontWeight: "600", color: colors.error },
});
