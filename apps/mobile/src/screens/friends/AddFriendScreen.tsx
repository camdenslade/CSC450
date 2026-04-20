// apps/mobile/src/screens/friends/AddFriendScreen.tsx
import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Alert, ActivityIndicator, FlatList,
} from "react-native";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";

type AddFriendScreenProps = {
  onBack: () => void;
};

type SearchResult = {
  id: string;
  displayName: string;
};

export function AddFriendScreen({ onBack }: AddFriendScreenProps) {
  const { apiClient } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  async function handleSearch() {
    const q = query.trim();
    if (q.length < 2) {
      Alert.alert("Too short", "Enter at least 2 characters to search.");
      return;
    }
    setSearching(true);
    try {
      const data = await apiClient.get<SearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(data);
      if (data.length === 0) Alert.alert("No results", "No TabUp users found with that name.");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(user: SearchResult) {
    Alert.alert("Friend Request", `Send friend request to ${user.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: async () => {
          try {
            // Invite by userId directly via the accept flow would need a new endpoint.
            // Use the invite-by-name approach: we pass the display name as a known user ID.
            // Actually, we directly call accept is wrong since we're the initiator.
            // The backend invite endpoint expects email/phone, but we have a userId.
            // We need a direct "send request by userId" capability - use the friendId.
            // For now, send via a direct post. We'll add a by-userId route.
            await apiClient.post("/friends/invite-by-id", { targetUserId: user.id });
            setSentIds((prev) => new Set([...prev, user.id]));
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to send request.";
            if (msg.includes("Already friends")) {
              Alert.alert("Already Friends", `You are already friends with ${user.displayName}.`);
            } else if (msg.includes("request already exists")) {
              Alert.alert("Already Sent", `You already have a pending request with ${user.displayName}.`);
            } else {
              Alert.alert("Error", msg);
            }
          }
        },
      },
    ]);
  }

  const renderResult = ({ item }: { item: SearchResult }) => {
    const isSent = sentIds.has(item.id);
    return (
      <View style={styles.resultCard}>
        <View style={styles.resultInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.resultName}>{item.displayName}</Text>
        </View>
        {isSent ? (
          <View style={styles.sentBadge}>
            <Text style={styles.sentBadgeText}>Sent</Text>
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => handleSendRequest(item)}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Add Friend</Text>
          <Text style={styles.subtitle}>Search for a TabUp user by name.</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search by name..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.searchButton, searching && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.searchButtonText}>Search</Text>}
          </Pressable>
        </View>

        {/* Results */}
        {results.length > 0 && (
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.resultsList}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textMuted },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  input: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, fontSize: 16, color: colors.textPrimary,
  },
  searchButton: {
    backgroundColor: colors.primary, paddingHorizontal: 20,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  searchButtonDisabled: { opacity: 0.6 },
  searchButtonText: { fontSize: 15, fontWeight: "600", color: "#000" },
  resultsList: { gap: 10 },
  resultCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  resultInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#000" },
  resultName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  addButton: {
    backgroundColor: colors.primary, paddingHorizontal: 18,
    paddingVertical: 8, borderRadius: 10,
  },
  addButtonText: { fontSize: 14, fontWeight: "600", color: "#000" },
  sentBadge: {
    backgroundColor: colors.textMuted + "20", paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 10,
  },
  sentBadgeText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
});
