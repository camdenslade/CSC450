// apps/mobile/src/screens/tabs/TabDetailScreen.tsx
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { colors } from "../../theme/colors";

type Participant = {
  id: string;
  name: string;
  amount: number;
  status: "pending" | "paid" | "settled";
};

type TabDetailScreenProps = {
  onBack: () => void;
};

// Mock tab data
const mockTab = {
  id: "1",
  name: "Birthday Dinner",
  location: "Blue Harbor",
  date: "Friday, 7:30 PM",
  total: 156.5,
  status: "open" as const,
  yourShare: 39.13,
  isOwner: true,
  participants: [
    { id: "1", name: "You", amount: 39.13, status: "settled" as const },
    { id: "2", name: "Alex Rodriguez", amount: 39.13, status: "paid" as const },
    { id: "3", name: "Katie Davis", amount: 39.12, status: "pending" as const },
    { id: "4", name: "Mike Johnson", amount: 39.12, status: "pending" as const },
  ],
};

export function TabDetailScreen({ onBack }: TabDetailScreenProps) {
  const handleMarkPaid = (participantId: string, participantName: string) => {
    Alert.alert("Mark as Paid", `Mark ${participantName} as paid?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Paid",
        onPress: () => console.log(`Marked ${participantId} as paid`),
      },
    ]);
  };

  const handleRequestPayment = (participantName: string, amount: number) => {
    Alert.alert(
      "Request Payment",
      `Send payment request to ${participantName} for $${amount.toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Venmo",
          onPress: () => console.log(`Venmo request sent to ${participantName}`),
        },
        {
          text: "CashApp",
          onPress: () => console.log(`CashApp request sent to ${participantName}`),
        },
      ]
    );
  };

  const handleSettleTab = () => {
    Alert.alert("Settle Tab", "Mark this entire tab as settled?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Settle",
        style: "destructive",
        onPress: () => console.log("Tab settled"),
      },
    ]);
  };

  const handleDeleteTab = () => {
    Alert.alert("Delete Tab", "Are you sure you want to delete this tab?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          console.log("Tab deleted");
          onBack();
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "settled":
        return colors.success;
      case "paid":
        return colors.primary;
      case "pending":
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "settled":
        return "Settled";
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Tab Details</Text>
        </View>

        {/* Tab Info Card */}
        <View style={styles.tabCard}>
          <View style={styles.tabHeader}>
            <Text style={styles.tabName}>{mockTab.name}</Text>
            <View
              style={[
                styles.statusBadge,
                mockTab.status === "open"
                  ? styles.openBadge
                  : styles.settledBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {mockTab.status === "open" ? "Open" : "Settled"}
              </Text>
            </View>
          </View>

          <Text style={styles.location}>{mockTab.location}</Text>
          <Text style={styles.date}>{mockTab.date}</Text>

          <View style={styles.divider} />

          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total Bill</Text>
              <Text style={styles.totalValue}>${mockTab.total.toFixed(2)}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Your Share</Text>
              <Text style={[styles.totalValue, styles.yourShareValue]}>
                ${mockTab.yourShare.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Participants Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants ({mockTab.participants.length})</Text>

          {mockTab.participants.map((participant) => (
            <View key={participant.id} style={styles.participantCard}>
              <View style={styles.participantInfo}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {participant.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.participantDetails}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.participantAmount}>
                    ${participant.amount.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.participantActions}>
                <View
                  style={[
                    styles.participantStatus,
                    { backgroundColor: getStatusColor(participant.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.participantStatusText,
                      { color: getStatusColor(participant.status) },
                    ]}
                  >
                    {getStatusText(participant.status)}
                  </Text>
                </View>

                {participant.name !== "You" && participant.status === "pending" && (
                  <View style={styles.participantButtons}>
                    <Pressable
                      style={styles.smallButton}
                      onPress={() =>
                        handleRequestPayment(participant.name, participant.amount)
                      }
                    >
                      <Text style={styles.smallButtonText}>Request</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallButton, styles.markPaidButton]}
                      onPress={() => handleMarkPaid(participant.id, participant.name)}
                    >
                      <Text style={[styles.smallButtonText, styles.markPaidText]}>
                        Mark Paid
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        {mockTab.isOwner && mockTab.status === "open" && (
          <View style={styles.actions}>
            <Pressable style={styles.primaryButton} onPress={handleSettleTab}>
              <Text style={styles.primaryButtonText}>Settle Tab</Text>
            </Pressable>
            <Pressable style={styles.dangerButton} onPress={handleDeleteTab}>
              <Text style={styles.dangerButtonText}>Delete Tab</Text>
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
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  tabCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  tabHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tabName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  openBadge: {
    backgroundColor: colors.primary,
  },
  settledBadge: {
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  location: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e9e6",
    marginVertical: 14,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalItem: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  yourShareValue: {
    color: colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  participantAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  participantAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  participantActions: {
    alignItems: "flex-end",
  },
  participantStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  participantStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  participantButtons: {
    flexDirection: "row",
    gap: 6,
  },
  smallButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markPaidButton: {
    backgroundColor: colors.success,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  markPaidText: {
    color: "#fff",
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  dangerButton: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
