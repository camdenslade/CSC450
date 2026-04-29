// apps/mobile/src/screens/groups/CreateGroupFlow.tsx
import { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator, Alert, Animated, FlatList, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Background } from "../../shared/Background";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../store/DataContext";
import { ApiFriend } from "../../api/client";

type Props = {
  onBack: () => void;
  onComplete: (groupId: string) => void;
};

type SearchResult = {
  id: string;
  displayName: string;
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function otherUser(friend: ApiFriend, myUserId: string) {
  return friend.requesterId === myUserId ? friend.recipient : friend.requester;
}

export function CreateGroupFlow({ onBack, onComplete }: Props) {
  const { apiClient, userId } = useAuth();
  const { friends } = useData();

  const [step, setStep] = useState<"name" | "members">("name");
  const stepAnim = useRef(new Animated.Value(1)).current;
  const animating = useRef(false);

  function animateStep(next: "name" | "members") {
    if (animating.current) return;
    animating.current = true;
    Animated.timing(stepAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(next);
      stepAnim.setValue(0);
      Animated.timing(stepAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        animating.current = false;
      });
    });
  }
  const [groupName, setGroupName] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<SearchResult[]>([]);

  const [submitting, setSubmitting] = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (q.length < 2) {
      Alert.alert("Too short", "Enter at least 2 characters to search.");
      return;
    }
    setSearching(true);
    setSearched(false);
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

  function toggleMember(user: SearchResult) {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === user.id)
        ? prev.filter((m) => m.id !== user.id)
        : [...prev, user]
    );
  }

  async function handleCreate() {
    const name = groupName.trim();
    if (!name) {
      Alert.alert("Required", "Group name cannot be empty.");
      return;
    }
    setSubmitting(true);
    try {
      const group = await apiClient.post<{ id: string }>("/groups", {
        name,
        memberIds: selectedMembers.map((m) => m.id),
      });
      onComplete(group.id);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create group.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderResult({ item }: { item: SearchResult }) {
    const selected = selectedMembers.some((m) => m.id === item.id);
    return (
      <Pressable
        style={[styles.resultCard, selected && styles.resultCardSelected]}
        onPress={() => toggleMember(item)}
      >
        <View style={[styles.avatarSmall, selected && styles.avatarSmallSelected]}>
          <Text style={styles.avatarSmallText}>{initials(item.displayName)}</Text>
        </View>
        <Text style={styles.resultName}>{item.displayName}</Text>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={step === "name" ? onBack : () => animateStep("name")} hitSlop={12}>
                <Text style={styles.backText}>{step === "name" ? "Cancel" : "‹ Back"}</Text>
              </Pressable>
              <Text style={styles.headerTitle}>
                {step === "name" ? "New Group" : "Add Members"}
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepRow}>
              {(["name", "members"] as const).map((s, i) => (
                <View key={s} style={styles.stepItem}>
                  <View style={[styles.stepDot, step === s && styles.stepDotActive, (step === "members" && s === "name") && styles.stepDotDone]}>
                    {step === "members" && s === "name"
                      ? <Text style={styles.stepCheck}>✓</Text>
                      : <Text style={[styles.stepNum, step === s && styles.stepNumActive]}>{i + 1}</Text>}
                  </View>
                  <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
                    {s === "name" ? "Name" : "Members"}
                  </Text>
                  {i === 0 && <View style={[styles.stepLine, step === "members" && styles.stepLineDone]} />}
                </View>
              ))}
            </View>

            {/* Step 1 - name */}
            {step === "name" && (
              <Animated.View style={[styles.stepContent, { opacity: stepAnim }]}>
                <Text style={styles.stepTitle}>Name your group</Text>
                <TextInput
                  style={styles.nameInput}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="e.g. Apartment, Road Trip..."
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  maxLength={80}
                  returnKeyType="next"
                  onSubmitEditing={() => { if (groupName.trim()) animateStep("members"); }}
                />
              </Animated.View>
            )}

            {/* Step 2 - members */}
            {step === "members" && (
              <Animated.ScrollView
                style={[styles.flex, { opacity: stepAnim }]}
                contentContainerStyle={styles.membersContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.stepTitle}>Add members</Text>
                <Text style={styles.stepSubtitle}>Add friends or search for other users</Text>

                {/* Friends list */}
                {friends.length > 0 && (
                  <View style={styles.resultsList}>
                    {friends.map((f) => {
                      const u = otherUser(f, userId!);
                      const sr: SearchResult = { id: u.id, displayName: u.displayName };
                      const selected = selectedMembers.some((m) => m.id === u.id);
                      return (
                        <Pressable
                          key={f.id}
                          style={[styles.resultCard, selected && styles.resultCardSelected]}
                          onPress={() => toggleMember(sr)}
                        >
                          <View style={[styles.avatarSmall, selected && styles.avatarSmallSelected]}>
                            <Text style={styles.avatarSmallText}>{initials(u.displayName)}</Text>
                          </View>
                          <Text style={styles.resultName} numberOfLines={1}>{u.displayName}</Text>
                          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                            {selected && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <Text style={[styles.stepSubtitle, { marginTop: 4 }]}>Search for more users</Text>

                {/* Selected chips */}
                {selectedMembers.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                  >
                    {selectedMembers.map((m) => (
                      <Pressable key={m.id} style={styles.chip} onPress={() => toggleMember(m)}>
                        <Text style={styles.chipText}>{m.displayName}</Text>
                        <Text style={styles.chipX}>  ×</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {/* Search */}
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name..."
                    placeholderTextColor={colors.textMuted}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={[styles.searchBtn, searching && styles.btnDisabled]}
                    onPress={handleSearch}
                    disabled={searching}
                  >
                    {searching
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.searchBtnText}>Search</Text>}
                  </Pressable>
                </View>

                {results.length > 0 ? (
                  <FlatList
                    data={results}
                    keyExtractor={(r) => r.id}
                    renderItem={renderResult}
                    scrollEnabled={false}
                    contentContainerStyle={styles.resultsList}
                  />
                ) : searched ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>No users found. Try a different name.</Text>
                  </View>
                ) : null}
              </Animated.ScrollView>
            )}

            {/* Fixed bottom CTA */}
            <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
              {step === "name" && (
                <Pressable
                  style={[styles.cta, !groupName.trim() && styles.ctaDisabled]}
                  disabled={!groupName.trim()}
                  onPress={() => animateStep("members")}
                >
                  <Text style={styles.ctaText}>Next: Add Members</Text>
                </Pressable>
              )}
              {step === "members" && (
                <Pressable
                  style={[styles.cta, submitting && styles.ctaDisabled]}
                  onPress={handleCreate}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : (
                      <Text style={styles.ctaText}>
                        Create Group{selectedMembers.length > 0 ? ` · ${selectedMembers.length + 1} members` : ""}
                      </Text>
                    )}
                </Pressable>
              )}
            </SafeAreaView>
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
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  backText: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 64 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.textPrimary, textAlign: "center" },
  headerSpacer: { minWidth: 64 },

  stepRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 40, marginBottom: 8, justifyContent: "center" },
  stepItem: { alignItems: "center", position: "relative", flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.border, alignItems: "center", justifyContent: "center",
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotDone: { backgroundColor: colors.primaryDark },
  stepNum: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  stepNumActive: { color: "#fff" },
  stepCheck: { fontSize: 12, fontWeight: "700", color: "#fff" },
  stepLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 4 },
  stepLabelActive: { color: colors.primaryDark },
  stepLine: {
    position: "absolute", top: 14, left: "50%", right: "-50%",
    height: 2, backgroundColor: colors.border, zIndex: -1,
  },
  stepLineDone: { backgroundColor: colors.primaryDark },

  stepContent: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  stepTitle: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: -6 },
  nameInput: {
    backgroundColor: colors.surface, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 18,
    fontSize: 20, fontWeight: "700", color: colors.textPrimary,
    borderWidth: 2, borderColor: colors.primary,
  },

  membersContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 14 },
  chips: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: "row", backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, alignItems: "center",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  chipX: { fontSize: 14, fontWeight: "700", color: "#fff", opacity: 0.7 },

  searchRow: { flexDirection: "row", gap: 10 },
  searchInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  searchBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 18,
    borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.5 },
  searchBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  resultsList: { gap: 8 },
  resultCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  resultCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  avatarSmall: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  avatarSmallSelected: { backgroundColor: colors.primary },
  avatarSmallText: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  resultName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { fontSize: 12, fontWeight: "700", color: "#fff" },

  noResults: { paddingVertical: 20, alignItems: "center" },
  noResultsText: { fontSize: 14, color: colors.textMuted },

  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  cta: {
    backgroundColor: colors.primary, paddingVertical: 16,
    borderRadius: 16, alignItems: "center",
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  ctaDisabled: { opacity: 0.45, shadowOpacity: 0 },
  ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
});
