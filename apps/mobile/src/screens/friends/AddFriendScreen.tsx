// apps/mobile/src/screens/friends/AddFriendScreen.tsx
import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Background } from "../../shared/Background";
import { colors, useColors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";

type AddFriendScreenProps = {
  onBack: () => void;
};

type SearchUser = { id: string; displayName: string; avatarUrl?: string | null };

type SearchResult = {
  user: SearchUser;
  matchedPlatform: "venmo" | "cashapp" | "paypal" | null;
  matchedHandle: string | null;
};

// Ionicons names for each platform
const PLATFORM_ICON: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  venmo:   { name: "logo-venmo", color: "#3D95CE" },
  cashapp: { name: "cash-outline", color: "#00C244" },
  paypal:  { name: "logo-paypal", color: "#003087" },
};

function platformPrefix(platform: string): string {
  if (platform === "venmo") return "@";
  if (platform === "cashapp") return "$";
  if (platform === "paypal") return "paypal.me/";
  return "";
}

function platformLabel(platform: string): string {
  if (platform === "cashapp") return "Cash App";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function AddFriendScreen({ onBack }: AddFriendScreenProps) {
  const { apiClient } = useAuth();
  const c = useColors();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runSearch(q: string) {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    try {
      const data = await apiClient.get<SearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(data);
      setSearched(true);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text.trim()), 350);
  }

  async function handleSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query.trim());
  }

  async function handleSendRequest(result: SearchResult) {
    const { user } = result;
    Alert.alert("Send Request", `Add ${user.displayName} as a friend?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send Request",
        onPress: async () => {
          try {
            await apiClient.post("/friends/invite-by-id", { targetUserId: user.id });
            setSentIds((prev) => new Set([...prev, user.id]));
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to send request.";
            if (msg.includes("Already friends")) {
              Alert.alert("Already Friends", `You and ${user.displayName} are already friends.`);
            } else if (msg.includes("request already exists")) {
              Alert.alert("Already Sent", `A request with ${user.displayName} already exists.`);
            } else {
              Alert.alert("Error", msg);
            }
          }
        },
      },
    ]);
  }

  function renderResult(item: SearchResult) {
    const { user, matchedPlatform, matchedHandle } = item;
    const isSent = sentIds.has(user.id);
    const icon = matchedPlatform ? PLATFORM_ICON[matchedPlatform] : null;
    return (
      <View key={user.id} style={styles.resultCard}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initials(user.displayName)}</Text>
          )}
        </View>

        {/* Name + matched handle */}
        <View style={styles.resultBody}>
          <Text style={styles.resultName}>{user.displayName}</Text>
          {matchedPlatform && matchedHandle && icon ? (
            <View style={styles.handleRow}>
              <Ionicons name={icon.name} size={13} color={icon.color} />
              <Text style={styles.platformLabel}>{platformLabel(matchedPlatform)}</Text>
              <Text style={styles.handleText}>
                {platformPrefix(matchedPlatform)}{matchedHandle}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action */}
        {isSent ? (
          <View style={styles.sentBadge}>
            <Ionicons name="checkmark" size={13} color={colors.primary} />
            <Text style={styles.sentText}>Sent</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
            onPress={() => handleSendRequest(item)}
          >
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={onBack} hitSlop={12}>
                <Text style={styles.backText}>‹ Back</Text>
              </Pressable>
              <Text style={styles.headerTitle}>Add Friend</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.content}>
              <Text style={styles.hint}>Search for a TabUp user by name or handle.</Text>

              {/* Search bar */}
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Name or handle..."
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={handleQueryChange}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                <Pressable
                  style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
                  onPress={handleSearch}
                  disabled={searching}
                >
                  {searching
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.searchBtnText}>Search</Text>}
                </Pressable>
              </View>

              {/* Results */}
              {results.length > 0 ? (
                <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {results.map(renderResult)}
                </ScrollView>
              ) : searched ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="search-outline" size={40} color={c.textMuted} style={styles.emptyIcon} />
                  <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No users found</Text>
                  <Text style={[styles.emptySub, { color: c.textMuted }]}>Try a different name or check the spelling.</Text>
                </View>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Background>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
  },
  backText: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 64 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.textPrimary, textAlign: "center" },
  headerSpacer: { minWidth: 64 },
  content: { flex: 1, paddingHorizontal: 16, gap: 16 },
  hint: { fontSize: 14, color: colors.textMuted },

  searchRow: { flexDirection: "row", gap: 10 },
  searchInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  searchBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 20,
    borderRadius: 14, alignItems: "center", justifyContent: "center",
    shadowColor: colors.primary, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8,
  },
  searchBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  searchBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  resultsList: { flex: 1 },
  resultCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    marginBottom: 8,
  },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  avatarImg: { width: 44, height: 44, borderRadius: 14 },
  avatarText: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  resultBody: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  handleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  platformLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  handleText: { fontSize: 12, color: colors.textMuted },
  addBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  sentBadge: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 14,
    paddingVertical: 9, borderRadius: 12,
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  sentText: { fontSize: 13, fontWeight: "600", color: colors.primaryDark },

  emptyBox: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
