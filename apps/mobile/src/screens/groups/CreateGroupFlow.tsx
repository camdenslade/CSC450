// apps/mobile/src/screens/groups/CreateGroupFlow.tsx
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Background } from "../../shared/Background";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";

type Props = {
  onBack: () => void;
  onComplete: (groupId: string) => void;
};

type Step = "name" | "members";

type SearchResult = {
  id: string;
  displayName: string;
};

export function CreateGroupFlow({ onBack, onComplete }: Props) {
  const { apiClient } = useAuth();

  const [step, setStep] = useState<Step>("name");
  const [groupName, setGroupName] = useState("");

  // Member search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<SearchResult[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------

  async function handleSearch() {
    const q = query.trim();
    if (q.length < 2) {
      Alert.alert("Too short", "Enter at least 2 characters to search.");
      return;
    }
    setSearching(true);
    try {
      const data = await apiClient.get<SearchResult[]>(
        `/users/search?q=${encodeURIComponent(q)}`
      );
      setResults(data);
      if (data.length === 0) Alert.alert("No results", "No TabUp users found with that name.");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function toggleMember(user: SearchResult) {
    setSelectedMembers((prev) => {
      const already = prev.some((m) => m.id === user.id);
      return already ? prev.filter((m) => m.id !== user.id) : [...prev, user];
    });
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

  // ---------------------------------------------------------

  function renderResult({ item }: { item: SearchResult }) {
    const selected = selectedMembers.some((m) => m.id === item.id);
    return (
      <Pressable
        style={[styles.resultCard, selected && styles.resultCardSelected]}
        onPress={() => toggleMember(item)}
      >
        <View style={styles.resultAvatar}>
          <Text style={styles.resultAvatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.resultName}>{item.displayName}</Text>
        <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
          {selected && <Text style={styles.checkMark}>&#10003;</Text>}
        </View>
      </Pressable>
    );
  }

  // ---------------------------------------------------------

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={step === "name" ? onBack : () => setStep("name")}
              hitSlop={12}
            >
              <Text style={styles.back}>{step === "name" ? "Cancel" : "Back"}</Text>
            </Pressable>
            <Text style={styles.title}>
              {step === "name" ? "New Group" : "Add Members"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Step 1 - name */}
          {step === "name" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepLabel}>Group Name</Text>
              <TextInput
                style={styles.nameInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g. Apartment, Road Trip..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (groupName.trim()) setStep("members");
                }}
              />
              <Pressable
                style={[styles.nextButton, !groupName.trim() && styles.buttonDisabled]}
                disabled={!groupName.trim()}
                onPress={() => setStep("members")}
              >
                <Text style={styles.nextButtonText}>Next: Add Members</Text>
              </Pressable>
            </View>
          )}

          {/* Step 2 - members */}
          {step === "members" && (
            <ScrollView
              contentContainerStyle={styles.stepContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Selected chips */}
              {selectedMembers.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                >
                  {selectedMembers.map((m) => (
                    <Pressable
                      key={m.id}
                      style={styles.chip}
                      onPress={() => toggleMember(m)}
                    >
                      <Text style={styles.chipText}>{m.displayName} x</Text>
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
                  style={[styles.searchButton, searching && styles.buttonDisabled]}
                  onPress={handleSearch}
                  disabled={searching}
                >
                  {searching
                    ? <ActivityIndicator color="#000" />
                    : <Text style={styles.searchButtonText}>Search</Text>}
                </Pressable>
              </View>

              {results.length > 0 && (
                <FlatList
                  data={results}
                  keyExtractor={(r) => r.id}
                  renderItem={renderResult}
                  scrollEnabled={false}
                  contentContainerStyle={styles.resultList}
                />
              )}

              {/* Create */}
              <Pressable
                style={[styles.createButton, submitting && styles.buttonDisabled]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#000" />
                  : (
                    <Text style={styles.createButtonText}>
                      Create Group
                      {selectedMembers.length > 0
                        ? ` (${selectedMembers.length + 1} members)`
                        : " (just you)"}
                    </Text>
                  )}
              </Pressable>
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
    marginBottom: 24,
  },
  back: { fontSize: 15, fontWeight: "600", color: colors.primary, minWidth: 60 },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  headerSpacer: { minWidth: 60 },
  stepContent: { paddingBottom: 40, gap: 14 },
  stepLabel: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  nextButtonText: { fontSize: 16, fontWeight: "700", color: "#000" },
  buttonDisabled: { opacity: 0.5 },
  chips: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#000" },
  searchRow: { flexDirection: "row", gap: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: { fontSize: 15, fontWeight: "600", color: "#000" },
  resultList: { gap: 8 },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  resultAvatarText: { fontSize: 16, fontWeight: "700", color: "#000" },
  resultName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { fontSize: 14, color: "#000", fontWeight: "700" },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  createButtonText: { fontSize: 16, fontWeight: "700", color: "#000" },
});
