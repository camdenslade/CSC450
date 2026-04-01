// apps/mobile/src/screens/friends/AddFriendScreen.tsx
import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { colors } from "../../theme/colors";

type SearchResult = {
  id: string;
  name: string;
  username: string;
  email: string;
  isFriend: boolean;
  requestSent: boolean;
};

type AddFriendScreenProps = {
  onBack: () => void;
};

// Mock search results
const mockSearchResults: SearchResult[] = [
  { id: "1", name: "Alice Johnson", username: "@alice", email: "alice@example.com", isFriend: false, requestSent: false },
  { id: "2", name: "Bob Smith", username: "@bobsmith", email: "bob@example.com", isFriend: false, requestSent: false },
  { id: "3", name: "Charlie Brown", username: "@charlie", email: "charlie@example.com", isFriend: true, requestSent: false },
  { id: "4", name: "Diana Prince", username: "@diana", email: "diana@example.com", isFriend: false, requestSent: false },
];

export function AddFriendScreen({ onBack }: AddFriendScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Mock search - filter results based on query
    const filtered = mockSearchResults.filter(
      (user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleSendRequest = (userId: string, userName: string) => {
    Alert.alert("Friend Request", `Send friend request to ${userName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () => {
          setSentRequests(new Set([...sentRequests, userId]));
          Alert.alert("Success", `Friend request sent to ${userName}`);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Add Friend</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, username, or email"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Search Results ({searchResults.length})</Text>

            {searchResults.map((user) => {
              const requestSent = sentRequests.has(user.id);
              return (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{user.name.charAt(0)}</Text>
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userUsername}>{user.username}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>

                  <View style={styles.userAction}>
                    {user.isFriend ? (
                      <View style={styles.friendBadge}>
                        <Text style={styles.friendBadgeText}>Friend</Text>
                      </View>
                    ) : requestSent ? (
                      <View style={styles.sentBadge}>
                        <Text style={styles.sentBadgeText}>Sent</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.addButton}
                        onPress={() => handleSendRequest(user.id, user.name)}
                      >
                        <Text style={styles.addButtonText}>Add</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {searchQuery && searchResults.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>Try searching with a different term</Text>
          </View>
        )}

        {/* Initial State */}
        {!searchQuery && searchResults.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Search for friends</Text>
            <Text style={styles.emptySubtext}>
              Enter a name, username, or email to find friends
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  resultsSection: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  userAction: {
    marginLeft: 10,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  friendBadge: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  friendBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
  sentBadge: {
    backgroundColor: colors.textMuted + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
});
