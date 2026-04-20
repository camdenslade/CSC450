// apps/mobile/src/screens/create-tab/CreateTabFlow.tsx
import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiFriend } from "../../api/client";

type Platform = "paypal" | "venmo" | "cashapp";

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "venmo", label: "Venmo" },
  { key: "paypal", label: "PayPal" },
  { key: "cashapp", label: "Cash App" },
];

type ParticipantRow = {
  userId: string;
  name: string;
  amountStr: string;
  platform: Platform;
};

type CreateTabFlowProps = {
  onBack: () => void;
  onComplete: () => void;
};

/** Extract the "other" user from a friendship relative to the caller. */
function otherUser(friend: ApiFriend, myUserId: string) {
  return friend.requesterId === myUserId ? friend.recipient : friend.requester;
}

export function CreateTabFlow({ onBack, onComplete }: CreateTabFlowProps) {
  const { apiClient, userId } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [amount, setAmount] = useState("");
  const [tabName, setTabName] = useState("");
  const [location, setLocation] = useState("");

  // Step 2
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 3
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [splitType, setSplitType] = useState<"even" | "custom">("even");

  const billAmount = parseFloat(amount) || 0;

  // Load friends when the user reaches step 2
  useEffect(() => {
    if (step !== 2 || friends.length > 0) return;
    setFriendsLoading(true);
    apiClient
      .get<ApiFriend[]>("/friends")
      .then(setFriends)
      .catch((e: Error) => Alert.alert("Error", e.message))
      .finally(() => setFriendsLoading(false));
  }, [step]);

  // ---------------------------------------------------------
  // Step handlers
  // ---------------------------------------------------------
  function handleStep1Next() {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid bill amount.");
      return;
    }
    setStep(2);
  }

  function handleStep2Next() {
    if (selectedIds.size === 0) {
      Alert.alert("Error", "Please select at least one friend.");
      return;
    }
    const totalPeople = selectedIds.size + 1; // +1 for current user
    const evenAmount = billAmount / totalPeople;

    const rows: ParticipantRow[] = [];

    // Current user row
    rows.push({ userId: userId!, name: "You", amountStr: evenAmount.toFixed(2), platform: "venmo" });

    // Selected friends
    for (const id of selectedIds) {
      const f = friends.find((fr) => (otherUser(fr, userId!)).id === id);
      if (!f) continue;
      const u = otherUser(f, userId!);
      rows.push({ userId: u.id, name: u.displayName, amountStr: evenAmount.toFixed(2), platform: "venmo" });
    }

    setParticipants(rows);
    setStep(3);
  }

  function toggleFriend(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleSplitTypeChange(type: "even" | "custom") {
    setSplitType(type);
    if (type === "even") {
      const each = billAmount / participants.length;
      setParticipants(participants.map((p) => ({ ...p, amountStr: each.toFixed(2) })));
    }
  }

  function updateAmount(index: number, val: string) {
    setParticipants(participants.map((p, i) => i === index ? { ...p, amountStr: val } : p));
  }

  function updatePlatform(index: number, platform: Platform) {
    setParticipants(participants.map((p, i) => i === index ? { ...p, platform } : p));
  }

  function handleStep3Next() {
    const total = participants.reduce((sum, p) => sum + (parseFloat(p.amountStr) || 0), 0);
    const diff = Math.abs(total - billAmount);
    if (diff > 0.01) {
      Alert.alert(
        "Mismatch",
        `Split total ($${total.toFixed(2)}) must equal bill total ($${billAmount.toFixed(2)}).`,
      );
      return;
    }
    setStep(4);
  }

  async function handleCreateTab() {
    setSubmitting(true);
    try {
      const participantDtos = participants.map((p) => ({
        userId: p.userId,
        platform: p.platform,
        share: Math.round((parseFloat(p.amountStr) || 0) * 100),
      }));

      await apiClient.post("/tabs", {
        name: tabName || "Tab",
        location: location || undefined,
        total: Math.round(billAmount * 100),
        participants: participantDtos,
      });

      onComplete();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create tab.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalSplit = participants.reduce((s, p) => s + (parseFloat(p.amountStr) || 0), 0);
  const remaining = billAmount - totalSplit;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={step === 1 ? onBack : () => setStep(step - 1)} style={styles.backButton}>
            <Text style={styles.backText}>{step === 1 ? "Cancel" : "Back"}</Text>
          </Pressable>
          <Text style={styles.title}>Create New Tab</Text>
          <Text style={styles.stepIndicator}>Step {step} of 4</Text>
        </View>

        {/* Step 1: Bill Details */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Bill Details</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bill Amount *</Text>
              <TextInput
                style={styles.input} placeholder="0.00" keyboardType="decimal-pad"
                value={amount} onChangeText={setAmount}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tab Name (optional)</Text>
              <TextInput
                style={styles.input} placeholder="e.g. Birthday Dinner"
                value={tabName} onChangeText={setTabName}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location (optional)</Text>
              <TextInput
                style={styles.input} placeholder="e.g. Blue Harbor"
                value={location} onChangeText={setLocation}
              />
            </View>
            <Pressable style={styles.primaryButton} onPress={handleStep1Next}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Select Friends */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Select Participants</Text>
            <Text style={styles.subtitle}>{selectedIds.size} selected</Text>
            {friendsLoading && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
            {!friendsLoading && friends.length === 0 && (
              <Text style={styles.emptyText}>
                No friends yet. Add friends first from the Friends tab.
              </Text>
            )}
            {friends.map((f) => {
              const u = otherUser(f, userId!);
              const selected = selectedIds.has(u.id);
              return (
                <Pressable
                  key={f.id}
                  style={[styles.friendItem, selected && styles.friendItemSelected]}
                  onPress={() => toggleFriend(u.id)}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>{u.displayName.charAt(0)}</Text>
                  </View>
                  <Text style={styles.friendName}>{u.displayName}</Text>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}
            {friends.length > 0 && (
              <Pressable style={styles.primaryButton} onPress={handleStep2Next}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Step 3: Split */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Configure Split</Text>
            <Text style={styles.subtitle}>
              ${billAmount.toFixed(2)} among {participants.length} people
            </Text>

            <View style={styles.splitTypeToggle}>
              {(["even", "custom"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.toggleButton, splitType === t && styles.toggleButtonActive]}
                  onPress={() => handleSplitTypeChange(t)}
                >
                  <Text style={[styles.toggleText, splitType === t && styles.toggleTextActive]}>
                    {t === "even" ? "Even Split" : "Custom"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {participants.map((p, i) => (
              <View key={p.userId} style={styles.participantSplitItem}>
                <View style={styles.participantSplitLeft}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>{p.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.participantSplitName}>{p.name}</Text>
                </View>
                <View style={styles.participantSplitRight}>
                  <TextInput
                    style={[styles.amountInput, splitType === "even" && styles.amountInputDisabled]}
                    value={p.amountStr}
                    onChangeText={(v) => updateAmount(i, v)}
                    keyboardType="decimal-pad"
                    editable={splitType === "custom"}
                  />
                  {/* Platform selector */}
                  <View style={styles.platformRow}>
                    {PLATFORMS.map((pl) => (
                      <Pressable
                        key={pl.key}
                        style={[styles.platformChip, p.platform === pl.key && styles.platformChipActive]}
                        onPress={() => updatePlatform(i, pl.key)}
                      >
                        <Text style={[styles.platformChipText, p.platform === pl.key && styles.platformChipTextActive]}>
                          {pl.label[0]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ))}

            {splitType === "custom" && (
              <View style={styles.splitSummary}>
                <Text style={styles.splitSummaryText}>
                  Total: ${totalSplit.toFixed(2)} / ${billAmount.toFixed(2)}
                </Text>
                {Math.abs(remaining) > 0.005 && (
                  <Text style={[styles.splitSummaryText, styles.remainingText]}>
                    Remaining: ${remaining.toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            <Pressable style={styles.primaryButton} onPress={handleStep3Next}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          </View>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Review & Confirm</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Tab Details</Text>
              <Text style={styles.reviewValue}>{tabName || "Tab"}</Text>
              {location && <Text style={styles.reviewSubvalue}>{location}</Text>}
              <Text style={styles.reviewAmount}>${billAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Participants ({participants.length})</Text>
              {participants.map((p) => {
                const platformLabel = PLATFORMS.find((pl) => pl.key === p.platform)?.label ?? p.platform;
                return (
                  <View key={p.userId} style={styles.reviewParticipant}>
                    <View>
                      <Text style={styles.reviewParticipantName}>{p.name}</Text>
                      <Text style={styles.reviewParticipantPlatform}>{platformLabel}</Text>
                    </View>
                    <Text style={styles.reviewParticipantAmount}>
                      ${parseFloat(p.amountStr).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Pressable
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleCreateTab}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.primaryButtonText}>Create Tab</Text>}
            </Pressable>
          </View>
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
  title: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  stepIndicator: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
  stepTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
  spinner: { marginTop: 40 },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: 40, lineHeight: 22 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textPrimary },
  friendItem: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: "transparent",
  },
  friendItemSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "10" },
  friendAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  friendAvatarText: { fontSize: 16, fontWeight: "700", color: "#000" },
  friendName: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: colors.textMuted, alignItems: "center", justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { fontSize: 14, fontWeight: "700", color: "#000" },
  splitTypeToggle: {
    flexDirection: "row", backgroundColor: colors.surface,
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  toggleButtonActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  toggleTextActive: { color: "#000" },
  participantSplitItem: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 12,
    marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  participantSplitLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  participantSplitRight: { alignItems: "flex-end", gap: 6 },
  smallAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  smallAvatarText: { fontSize: 14, fontWeight: "700", color: "#000" },
  participantSplitName: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  amountInput: {
    backgroundColor: "#fff", borderRadius: 8, padding: 8,
    fontSize: 15, fontWeight: "600", color: colors.textPrimary,
    textAlign: "right", minWidth: 80,
  },
  amountInputDisabled: { backgroundColor: "#f0f3f0", color: colors.textMuted },
  platformRow: { flexDirection: "row", gap: 4 },
  platformChip: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.textMuted,
    alignItems: "center", justifyContent: "center",
  },
  platformChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  platformChipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  platformChipTextActive: { color: "#000" },
  splitSummary: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 20 },
  splitSummaryText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, textAlign: "center" },
  remainingText: { color: colors.error, marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary, paddingVertical: 14,
    borderRadius: 14, alignItems: "center", marginTop: 20,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#000" },
  reviewCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  reviewLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", marginBottom: 8 },
  reviewValue: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  reviewSubvalue: { fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 },
  reviewAmount: { fontSize: 24, fontWeight: "700", color: colors.primary },
  reviewParticipant: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#e5e9e6",
  },
  reviewParticipantName: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  reviewParticipantPlatform: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  reviewParticipantAmount: { fontSize: 15, fontWeight: "600", color: colors.primary },
});
