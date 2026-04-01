// apps/mobile/src/screens/create-tab/CreateTabFlow.tsx
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { colors } from "../../theme/colors";

type Friend = {
  id: string;
  name: string;
  selected: boolean;
};

type Participant = {
  id: string;
  name: string;
  amount: number;
};

type CreateTabFlowProps = {
  onBack: () => void;
  onComplete: () => void;
};

// Mock friends data
const mockFriends: Friend[] = [
  { id: "1", name: "Alex Rodriguez", selected: false },
  { id: "2", name: "Sarah Chen", selected: false },
  { id: "3", name: "Mike Johnson", selected: false },
  { id: "4", name: "Katie Davis", selected: false },
  { id: "5", name: "Emma Wilson", selected: false },
  { id: "6", name: "Jordan Lee", selected: false },
];

export function CreateTabFlow({ onBack, onComplete }: CreateTabFlowProps) {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [amount, setAmount] = useState("");
  const [tabName, setTabName] = useState("");
  const [location, setLocation] = useState("");

  // Step 2 state
  const [friends, setFriends] = useState<Friend[]>(mockFriends);

  // Step 3 state
  const [splitType, setSplitType] = useState<"even" | "custom">("even");
  const [participants, setParticipants] = useState<Participant[]>([]);

  const selectedFriends = friends.filter(f => f.selected);
  const totalParticipants = selectedFriends.length + 1; // +1 for current user
  const billAmount = parseFloat(amount) || 0;

  const handleStep1Next = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid bill amount");
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (selectedFriends.length === 0) {
      Alert.alert("Error", "Please select at least one friend");
      return;
    }

    // Initialize participants with yourself + selected friends
    const initialParticipants: Participant[] = [
      { id: "me", name: "You", amount: billAmount / totalParticipants },
      ...selectedFriends.map(f => ({
        id: f.id,
        name: f.name,
        amount: billAmount / totalParticipants,
      })),
    ];
    setParticipants(initialParticipants);
    setStep(3);
  };

  const handleToggleFriend = (friendId: string) => {
    setFriends(friends.map(f =>
      f.id === friendId ? { ...f, selected: !f.selected } : f
    ));
  };

  const handleSelectAll = () => {
    const allSelected = friends.every(f => f.selected);
    setFriends(friends.map(f => ({ ...f, selected: !allSelected })));
  };

  const handleSplitTypeChange = (type: "even" | "custom") => {
    setSplitType(type);
    if (type === "even") {
      const evenAmount = billAmount / totalParticipants;
      setParticipants(participants.map(p => ({ ...p, amount: evenAmount })));
    }
  };

  const handleParticipantAmountChange = (id: string, value: string) => {
    const newAmount = parseFloat(value) || 0;
    setParticipants(participants.map(p =>
      p.id === id ? { ...p, amount: newAmount } : p
    ));
  };

  const handleStep3Next = () => {
    const total = participants.reduce((sum, p) => sum + p.amount, 0);
    const difference = Math.abs(total - billAmount);

    if (difference > 0.01) {
      Alert.alert(
        "Error",
        `Split amounts ($${total.toFixed(2)}) don't match bill total ($${billAmount.toFixed(2)})`
      );
      return;
    }
    setStep(4);
  };

  const handleCreateTab = () => {
    Alert.alert("Success", "Tab created successfully!", [
      { text: "OK", onPress: onComplete },
    ]);
  };

  const totalSplit = participants.reduce((sum, p) => sum + p.amount, 0);
  const remaining = billAmount - totalSplit;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={step === 1 ? onBack : () => setStep(step - 1)} style={styles.backButton}>
            <Text style={styles.backText}>‹ {step === 1 ? "Cancel" : "Back"}</Text>
          </Pressable>
          <Text style={styles.title}>Create New Tab</Text>
          <Text style={styles.stepIndicator}>Step {step} of 4</Text>
        </View>

        {/* Step 1: Enter Bill Details */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Enter Bill Details</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bill Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tab Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Birthday Dinner"
                value={tabName}
                onChangeText={setTabName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Blue Harbor Restaurant"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <Pressable style={styles.primaryButton} onPress={handleStep1Next}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Select Participants */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Select Participants</Text>
            <Text style={styles.subtitle}>
              Choose friends to split this tab with ({selectedFriends.length} selected)
            </Text>

            <Pressable style={styles.selectAllButton} onPress={handleSelectAll}>
              <Text style={styles.selectAllText}>
                {friends.every(f => f.selected) ? "Deselect All" : "Select All"}
              </Text>
            </Pressable>

            {friends.map(friend => (
              <Pressable
                key={friend.id}
                style={[styles.friendItem, friend.selected && styles.friendItemSelected]}
                onPress={() => handleToggleFriend(friend.id)}
              >
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendAvatarText}>{friend.name.charAt(0)}</Text>
                </View>
                <Text style={styles.friendName}>{friend.name}</Text>
                <View style={[styles.checkbox, friend.selected && styles.checkboxSelected]}>
                  {friend.selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            ))}

            <Pressable style={styles.primaryButton} onPress={handleStep2Next}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          </View>
        )}

        {/* Step 3: Configure Split */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Configure Split</Text>
            <Text style={styles.subtitle}>
              Bill: ${billAmount.toFixed(2)} • {totalParticipants} people
            </Text>

            <View style={styles.splitTypeToggle}>
              <Pressable
                style={[styles.toggleButton, splitType === "even" && styles.toggleButtonActive]}
                onPress={() => handleSplitTypeChange("even")}
              >
                <Text style={[styles.toggleText, splitType === "even" && styles.toggleTextActive]}>
                  Even Split
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, splitType === "custom" && styles.toggleButtonActive]}
                onPress={() => handleSplitTypeChange("custom")}
              >
                <Text style={[styles.toggleText, splitType === "custom" && styles.toggleTextActive]}>
                  Custom Split
                </Text>
              </Pressable>
            </View>

            {splitType === "even" && (
              <View style={styles.evenSplitInfo}>
                <Text style={styles.evenSplitText}>
                  Each person pays: ${(billAmount / totalParticipants).toFixed(2)}
                </Text>
              </View>
            )}

            {participants.map(participant => (
              <View key={participant.id} style={styles.participantSplitItem}>
                <View style={styles.participantSplitInfo}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>{participant.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.participantSplitName}>{participant.name}</Text>
                </View>
                <TextInput
                  style={[styles.amountInput, splitType === "even" && styles.amountInputDisabled]}
                  value={participant.amount.toFixed(2)}
                  onChangeText={(val) => handleParticipantAmountChange(participant.id, val)}
                  keyboardType="decimal-pad"
                  editable={splitType === "custom"}
                />
              </View>
            ))}

            {splitType === "custom" && (
              <View style={styles.splitSummary}>
                <Text style={styles.splitSummaryText}>
                  Total: ${totalSplit.toFixed(2)} / ${billAmount.toFixed(2)}
                </Text>
                {remaining !== 0 && (
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

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Review & Confirm</Text>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Tab Details</Text>
              {tabName && <Text style={styles.reviewValue}>{tabName}</Text>}
              {location && <Text style={styles.reviewSubvalue}>{location}</Text>}
              <Text style={styles.reviewAmount}>${billAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Participants ({totalParticipants})</Text>
              {participants.map(p => (
                <View key={p.id} style={styles.reviewParticipant}>
                  <Text style={styles.reviewParticipantName}>{p.name}</Text>
                  <Text style={styles.reviewParticipantAmount}>${p.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryButton} onPress={handleCreateTab}>
              <Text style={styles.primaryButtonText}>Create Tab</Text>
            </Pressable>
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
    marginBottom: 24,
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
    marginBottom: 4,
  },
  stepIndicator: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  selectAllButton: {
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  friendItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  friendItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  splitTypeToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: "#000",
  },
  evenSplitInfo: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  evenSplitText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  participantSplitItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  participantSplitInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  smallAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  participantSplitName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  amountInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "right",
    minWidth: 80,
  },
  amountInputDisabled: {
    backgroundColor: "#f0f3f0",
    color: colors.textMuted,
  },
  splitSummary: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  splitSummaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  remainingText: {
    color: colors.error,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  reviewValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reviewSubvalue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  reviewAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  reviewParticipant: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e9e6",
  },
  reviewParticipantName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  reviewParticipantAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
