// apps/mobile/src/screens/tabs/TabDetailScreen.tsx
import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, ActivityIndicator, Linking,
} from "react-native";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiBill, ApiBillParticipant } from "../../api/client";

type TabDetailScreenProps = {
  tabId: string;
  onBack: () => void;
};

const PLATFORM_LABELS: Record<string, string> = {
  paypal: "PayPal",
  venmo: "Venmo",
  cashapp: "Cash App",
};

const STATE_LABELS: Record<string, string> = {
  pending: "Pending",
  reminded: "Reminded",
  paid: "Paid",
};

export function TabDetailScreen({ tabId, onBack }: TabDetailScreenProps) {
  const { apiClient, userId } = useAuth();
  const [bill, setBill] = useState<ApiBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadBill() {
    apiClient
      .get<ApiBill>(`/tabs/${tabId}`)
      .then(setBill)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadBill(); }, [tabId]);

  function handleSettle(participant: ApiBillParticipant) {
    const name = participant.user?.displayName ?? participant.contactName ?? "this person";
    Alert.alert("Mark as Paid", `Mark ${name} as paid?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Paid",
        onPress: async () => {
          try {
            await apiClient.post(`/tabs/${tabId}/settle`, { participantId: participant.id });
            loadBill();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to settle.");
          }
        },
      },
    ]);
  }

  function handleRequestPayment(participant: ApiBillParticipant) {
    if (participant.paymentLink) {
      Linking.openURL(participant.paymentLink).catch(() =>
        Alert.alert("Error", "Could not open payment app."),
      );
      return;
    }

    if (!participant.userId) {
      Alert.alert("No Link", "This participant has not registered a payment handle.");
      return;
    }

    apiClient
      .post<{ url: string }>("/payments/link", {
        payeeUserId: participant.userId,
        platform: participant.platform,
        amountCents: participant.shareCents - participant.paidCents,
        note: bill?.name ?? "Tab",
      })
      .then(({ url }) => Linking.openURL(url))
      .catch((e: Error) => Alert.alert("Error", e.message));
  }

  function handleCancelTab() {
    Alert.alert("Cancel Tab", "Are you sure you want to cancel this tab?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Tab",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.del(`/tabs/${tabId}`);
            onBack();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to cancel.");
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !bill) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Tab not found."}</Text>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = bill.ownerId === userId;
  const pendingParticipants = bill.participants.filter(
    (p) => p.state !== "paid" && p.userId !== userId,
  );
  const settledParticipants = bill.participants.filter(
    (p) => p.state === "paid" || p.userId === userId,
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{bill.name}</Text>
            <View style={[styles.statusBadge, bill.status !== "open" && styles.statusBadgeSettled]}>
              <Text style={styles.statusBadgeText}>
                {bill.status === "open" ? "Open" : "Settled"}
              </Text>
            </View>
          </View>
          {bill.location && <Text style={styles.location}>{bill.location}</Text>}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total</Text>
          <Text style={styles.totalAmount}>${(bill.totalCents / 100).toFixed(2)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Participants</Text>
              <Text style={styles.summaryValue}>{bill.participants.length}</Text>
            </View>
            {bill.taxCents > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>${(bill.taxCents / 100).toFixed(2)}</Text>
              </View>
            )}
            {bill.tipCents > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Tip</Text>
                <Text style={styles.summaryValue}>${(bill.tipCents / 100).toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Awaiting payment */}
        {pendingParticipants.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Awaiting Payment</Text>
            {pendingParticipants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <View style={styles.participantInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(p.user?.displayName ?? p.contactName ?? "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.participantName}>
                      {p.user?.displayName ?? p.contactName ?? "Unknown"}
                    </Text>
                    <Text style={styles.participantMeta}>
                      {PLATFORM_LABELS[p.platform]} · {STATE_LABELS[p.state]}
                    </Text>
                  </View>
                </View>
                <View style={styles.participantRight}>
                  <Text style={styles.participantAmount}>
                    ${(p.shareCents / 100).toFixed(2)}
                  </Text>
                  {isOwner && bill.status === "open" && (
                    <View style={styles.actionButtons}>
                      <Pressable style={styles.requestButton} onPress={() => handleRequestPayment(p)}>
                        <Text style={styles.requestButtonText}>Request</Text>
                      </Pressable>
                      <Pressable style={styles.settleButton} onPress={() => handleSettle(p)}>
                        <Text style={styles.settleButtonText}>Paid</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Settled */}
        {settledParticipants.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Settled</Text>
            {settledParticipants.map((p) => (
              <View key={p.id} style={[styles.participantRow, styles.participantRowSettled]}>
                <View style={styles.participantInfo}>
                  <View style={[styles.avatar, styles.avatarSettled]}>
                    <Text style={styles.avatarText}>
                      {(p.user?.displayName ?? p.contactName ?? "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.participantNameMuted}>
                    {p.user?.displayName ?? p.contactName ?? "Unknown"}
                  </Text>
                </View>
                <Text style={styles.participantAmount}>
                  ${(p.shareCents / 100).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {isOwner && bill.status === "open" && (
          <Pressable style={styles.cancelButton} onPress={handleCancelTab}>
            <Text style={styles.cancelButtonText}>Cancel Tab</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.background, padding: 24,
  },
  header: { marginBottom: 20 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "700", color: colors.textPrimary, flex: 1 },
  location: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  statusBadge: {
    backgroundColor: colors.primary, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10,
  },
  statusBadgeSettled: { backgroundColor: colors.surface },
  statusBadgeText: { fontSize: 12, fontWeight: "700", color: "#000" },
  errorText: { color: colors.error, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, marginBottom: 14,
  },
  cardLabel: {
    fontSize: 11, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },
  totalAmount: { fontSize: 32, fontWeight: "800", color: colors.primary, marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 20 },
  summaryItem: {},
  summaryLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  participantRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#e5e9e6",
  },
  participantRowSettled: { opacity: 0.55 },
  participantInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  avatarSettled: { backgroundColor: colors.textMuted },
  avatarText: { fontSize: 14, fontWeight: "700", color: "#000" },
  participantName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  participantNameMuted: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  participantMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  participantRight: { alignItems: "flex-end", gap: 6 },
  participantAmount: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  actionButtons: { flexDirection: "row", gap: 6 },
  requestButton: {
    backgroundColor: colors.primary, paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 8,
  },
  requestButtonText: { fontSize: 12, fontWeight: "600", color: "#000" },
  settleButton: {
    borderWidth: 1, borderColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  settleButtonText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  cancelButton: {
    marginTop: 10, paddingVertical: 14, borderRadius: 14,
    alignItems: "center", borderWidth: 1.5, borderColor: colors.error,
  },
  cancelButtonText: { fontSize: 15, fontWeight: "600", color: colors.error },
});
