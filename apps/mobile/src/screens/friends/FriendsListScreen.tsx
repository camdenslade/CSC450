// apps/mobile/src/screens/friends/FriendsListScreen.tsx
import { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { Layout } from "../../shared/Layout";
import { Section } from "../../home/components/Section";
import { colors } from "../../theme/colors";
import { TabKey } from "../../shared/NavBar";

type FriendsListScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onAddFriend?: () => void;
};

type Friend = {
  id: string;
  name: string;
  balance: number;
};

type FriendRequest = {
  id: string;
  name: string;
  email: string;
};

// Mock data for now
const mockFriends: Friend[] = [
  { id: "1", name: "Alex Johnson", balance: 12.5 },
  { id: "2", name: "Sarah Chen", balance: -8.0 },
  { id: "3", name: "Mike Rodriguez", balance: 0 },
  { id: "4", name: "Emma Davis", balance: 15.75 },
];

const mockRequests: FriendRequest[] = [
  { id: "1", name: "Jordan Taylor", email: "jordan@example.com" },
  { id: "2", name: "Casey Martinez", email: "casey@example.com" },
];

export function FriendsListScreen({ onTabPress, onAddFriend }: FriendsListScreenProps) {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(mockRequests);

  const handleAcceptRequest = (requestId: string, name: string) => {
    Alert.alert("Accept Request", `Accept friend request from ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: () => {
          setFriendRequests(friendRequests.filter(r => r.id !== requestId));
          Alert.alert("Success", `You are now friends with ${name}`);
        },
      },
    ]);
  };

  const handleDeclineRequest = (requestId: string, name: string) => {
    Alert.alert("Decline Request", `Decline friend request from ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: () => {
          setFriendRequests(friendRequests.filter(r => r.id !== requestId));
          Alert.alert("Declined", `Friend request from ${name} declined`);
        },
      },
    ]);
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const isOwed = item.balance > 0;
    const isOwe = item.balance < 0;
    const balanceText =
      item.balance === 0
        ? "Settled up"
        : isOwed
        ? `Owes you $${item.balance.toFixed(2)}`
        : `You owe $${Math.abs(item.balance).toFixed(2)}`;

    return (
      <Pressable style={styles.friendCard}>
        <View style={styles.friendInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text
              style={[
                styles.balanceText,
                isOwed && styles.balancePositive,
                isOwe && styles.balanceNegative,
              ]}
            >
              {balanceText}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderRequest = ({ item }: { item: FriendRequest }) => {
    return (
      <View style={styles.requestCard}>
        <View style={styles.friendInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={styles.requestEmail}>{item.email}</Text>
          </View>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(item.id, item.name)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </Pressable>
          <Pressable
            style={styles.declineButton}
            onPress={() => handleDeclineRequest(item.id, item.name)}
          >
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

        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <Section title="Friend Requests" actionLabel={`${friendRequests.length} pending`}>
            <FlatList
              data={friendRequests}
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          </Section>
        )}

        {/* All Friends Section */}
        <Section title="All Friends" actionLabel="Add Friend" onActionPress={onAddFriend}>
          <FlatList
            data={mockFriends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        </Section>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  listContent: {
    gap: 10,
    paddingTop: 12,
  },
  friendCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  friendDetails: {
    marginLeft: 12,
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  balancePositive: {
    color: colors.success,
  },
  balanceNegative: {
    color: colors.error,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  requestEmail: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  declineButton: {
    flex: 1,
    backgroundColor: colors.error + "20",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.error,
  },
});
