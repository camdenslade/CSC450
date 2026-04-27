import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, ActivityIndicator, Linking, TextInput, Modal,
  Animated, Clipboard, Share,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiBill, ApiBillParticipant } from "../../api/client";
import { avatarColor } from "../../shared/avatarColor";
import { Toast } from "../../shared/Toast";
import { SwipeToSettle } from "../../shared/SwipeToSettle";

type TabDetailScreenProps = {
  tabId: string;
  onBack: () => void;
  joinedViaLink?: boolean;
};

const PLATFORM_LABELS: Record<string, string> = {
  paypal: "PayPal", venmo: "Venmo", cashapp: "Cash App",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function TabDetailScreen({ tabId, onBack, joinedViaLink }: TabDetailScreenProps) {
  const { apiClient, userId } = useAuth();
  const [bill, setBill] = useState<ApiBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addFriendBanner, setAddFriendBanner] = useState(joinedViaLink ?? false);

  // Split editing
  const [editingSplits, setEditingSplits] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [savingSplits, setSavingSplits] = useState(false);
  const [remindTarget, setRemindTarget] = useState<ApiBillParticipant | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 10);
  }

  function celebrate() {
    celebrateAnim.setValue(0);
    Animated.spring(celebrateAnim, {
      toValue: 1, useNativeDriver: true,
      damping: 8, stiffness: 120, mass: 0.8,
    }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function loadBill() {
    apiClient.get<ApiBill>(`/tabs/${tabId}`)
      .then((b) => {
        setBill(b);
        const initial: Record<string, string> = {};
        b.participants.forEach((p) => { initial[p.id] = (p.shareCents / 100).toFixed(2); });
        setSplitAmounts(initial);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadBill(); }, [tabId]);

  function handleSettle(participant: ApiBillParticipant) {
    const name = participant.user?.displayName ?? participant.contactName ?? "this person";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Mark as Paid", `Mark ${name} as paid?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Paid", onPress: async () => {
          try {
            await apiClient.post(`/tabs/${tabId}/settle`, { participantId: participant.id });
            const refreshed = await apiClient.get<ApiBill>(`/tabs/${tabId}`);
            setBill(refreshed);
            if (refreshed.status === "settled") celebrate();
          }
          catch (e: unknown) { Alert.alert("Error", e instanceof Error ? e.message : "Failed."); }
        },
      },
    ]);
  }

  function handleRequestPayment(participant: ApiBillParticipant) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (participant.paymentLink) {
      Linking.openURL(participant.paymentLink).catch(() => Alert.alert("Error", "Could not open payment app."));
      return;
    }
    if (!participant.userId) {
      Alert.alert("No Link", "This participant has no payment handle registered.");
      return;
    }
    apiClient.post<{ url: string }>("/payments/link", {
      payeeUserId: participant.userId,
      platform: participant.platform,
      amountCents: participant.shareCents - participant.paidCents,
      note: bill?.name ?? "Tab",
    })
      .then(({ url }) => Linking.openURL(url))
      .catch((e: Error) => Alert.alert("Error", e.message));
  }

  async function handleSaveSplits() {
    if (!bill) return;
    setSavingSplits(true);
    try {
      const splits = bill.participants.map((p) => ({
        participantId: p.id,
        shareCents: Math.round(parseFloat(splitAmounts[p.id] || "0") * 100),
      }));
      await apiClient.post(`/tabs/${tabId}/split`, { splits });
      setEditingSplits(false);
      loadBill();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update splits.");
    } finally { setSavingSplits(false); }
  }

  function handleRemind(participant: ApiBillParticipant) {
    setRemindTarget(participant);
  }

  async function sendRemind(participant: ApiBillParticipant, delayDays?: number) {
    setRemindTarget(null);
    try {
      await apiClient.post(`/tabs/${tabId}/remind`, {
        participantId: participant.id,
        ...(delayDays ? { delayDays } : {}),
      });
      const msg = delayDays
        ? `Reminder scheduled for ${delayDays} day${delayDays === 1 ? "" : "s"} from now.`
        : "Reminder sent!";
      Alert.alert("Done", msg);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to send reminder.");
    }
  }

  async function handleSelfSettle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Mark yourself as paid?", "The tab owner will get a notification to confirm.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "I paid", onPress: async () => {
          try {
            await apiClient.post(`/tabs/${tabId}/self-settle`);
            showToast("Owner notified!");
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed.");
          }
        },
      },
    ]);
  }

  function handleCopyLink(link: string) {
    Clipboard.setString(link);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast("Copied!");
  }

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { url } = await apiClient.post<{ url: string }>(`/tabs/${tabId}/share`, {});
      await Share.share({ message: `Join my tab on TabUp: ${url}`, url });
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not generate share link.");
    }
  }

  async function handleAddOwnerAsFriend() {
    if (!bill) return;
    setAddFriendBanner(false);
    try {
      await apiClient.post("/friends/invite-by-id", { targetUserId: bill.ownerId });
      showToast("Friend request sent!");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to send request.");
    }
  }

  function handleCancelTab() {
    Alert.alert("Cancel Tab", "Are you sure you want to cancel this tab?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Tab", style: "destructive", onPress: async () => {
          try { await apiClient.del(`/tabs/${tabId}`); onBack(); }
          catch (e: unknown) { Alert.alert("Error", e instanceof Error ? e.message : "Failed."); }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !bill) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error || "Tab not found."}</Text>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isOwner = bill.ownerId === userId;
  const isOpen = bill.status === "open";
  const myParticipant = bill.participants.find((p) => p.userId === userId && !isOwner);
  const pending = bill.participants.filter((p) => p.state !== "paid" && p.userId !== userId);
  const settled = bill.participants.filter((p) => p.state === "paid" && p.userId !== userId);
  const collected = bill.participants.filter((p) => p.state === "paid").reduce((s, p) => s + p.paidCents, 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <Toast message={toastMsg} visible={toastVisible} />

      {/* Settle celebration */}
      {bill?.status === "settled" && (
        <Animated.View pointerEvents="none" style={[
          StyleSheet.absoluteFillObject, styles.celebrationOverlay,
          { opacity: celebrateAnim, transform: [{ scale: celebrateAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.05, 1] }) }] },
        ]}>
          <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
          <Text style={styles.celebrationText}>All paid!</Text>
        </Animated.View>
      )}

      {/* Remind picker modal */}
      <Modal visible={!!remindTarget} transparent animationType="fade">
        <Pressable style={styles.remindBackdrop} onPress={() => setRemindTarget(null)}>
          <Pressable style={styles.remindSheet} onPress={() => {}}>
            <Text style={styles.remindTitle}>
              Remind {remindTarget?.user?.displayName ?? remindTarget?.contactName ?? "them"}
            </Text>
            <Text style={styles.remindSubtitle}>Send now or schedule for later</Text>
            {([
              { label: "Send now", days: 0 },
              { label: "In 1 day", days: 1 },
              { label: "In 3 days", days: 3 },
              { label: "In 1 week", days: 7 },
            ] as const).map(({ label, days }) => (
              <Pressable
                key={days}
                style={({ pressed }) => [styles.remindOption, pressed && { opacity: 0.7 }]}
                onPress={() => remindTarget && sendRemind(remindTarget, days || undefined)}
              >
                <Text style={styles.remindOptionText}>{label}</Text>
                {days === 0 && <Ionicons name="notifications" size={16} color={colors.primary} />}
                {days > 0 && <Ionicons name="time-outline" size={16} color={colors.textMuted} />}
              </Pressable>
            ))}
            <Pressable style={styles.remindCancel} onPress={() => setRemindTarget(null)}>
              <Text style={styles.remindCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        {/* Add friend banner — shown when user joined via a share link */}
        {addFriendBanner && bill && !isOwner && (
          <View style={styles.friendBanner}>
            <View style={styles.friendBannerLeft}>
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={styles.friendBannerText}>
                Add {bill.owner?.displayName ?? "the owner"} as a friend?
              </Text>
            </View>
            <View style={styles.friendBannerActions}>
              <Pressable onPress={handleAddOwnerAsFriend} style={styles.friendBannerBtn}>
                <Text style={styles.friendBannerBtnText}>Add</Text>
              </Pressable>
              <Pressable onPress={() => setAddFriendBanner(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{bill.name}</Text>
          <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusSettled]}>
            <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextSettled]}>
              {isOpen ? "Collecting" : "Settled"}
            </Text>
          </View>
          {isOwner && isOpen && (
            <Pressable onPress={handleShare} style={styles.shareBtn} hitSlop={8}>
              <Ionicons name="share-outline" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>
        {bill.location ? <Text style={styles.location}>{bill.location}</Text> : null}

        {/* Receipt photo */}
        {bill.receiptUrl ? (
          <ReceiptThumb uri={bill.receiptUrl} />
        ) : null}

        {/* Summary hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>Total</Text>
            <Text style={styles.heroAmount}>${(bill.totalCents / 100).toFixed(2)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{bill.participants.length}</Text>
              <Text style={styles.heroStatLabel}>People</Text>
            </View>
            {bill.taxCents > 0 && (
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>${(bill.taxCents / 100).toFixed(2)}</Text>
                <Text style={styles.heroStatLabel}>Tax</Text>
              </View>
            )}
            {bill.tipCents > 0 && (
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>${(bill.tipCents / 100).toFixed(2)}</Text>
                <Text style={styles.heroStatLabel}>Tip</Text>
              </View>
            )}
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: colors.success }]}>${(collected / 100).toFixed(2)}</Text>
              <Text style={styles.heroStatLabel}>Collected</Text>
            </View>
          </View>
        </View>

        {/* Split editor */}
        {isOwner && isOpen && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Splits</Text>
              {!editingSplits ? (
                <Pressable onPress={() => setEditingSplits(true)}>
                  <Text style={styles.cardAction}>Edit</Text>
                </Pressable>
              ) : (
                <View style={styles.splitActions}>
                  <Pressable
                    style={[styles.splitSaveBtn, savingSplits && styles.disabled]}
                    onPress={handleSaveSplits}
                    disabled={savingSplits}
                  >
                    {savingSplits
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.splitSaveBtnText}>Save</Text>}
                  </Pressable>
                  <Pressable onPress={() => setEditingSplits(false)}>
                    <Text style={styles.splitCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>
            {bill.participants.map((p, i) => {
              const name = p.user?.displayName ?? p.contactName ?? "?";
              const ac = avatarColor(name);
              return (
              <View key={p.id} style={[styles.splitRow, i > 0 && styles.rowBorder]}>
                <View style={[styles.participantAvatar, { backgroundColor: ac.bg }]}>
                  <Text style={[styles.participantAvatarText, { color: ac.text }]}>
                    {initials(name)}
                  </Text>
                </View>
                <Text style={styles.splitName}>{p.user?.displayName ?? p.contactName ?? "?"}</Text>
                {editingSplits ? (
                  <View style={styles.splitInputWrap}>
                    <Text style={styles.splitDollar}>$</Text>
                    <TextInput
                      style={styles.splitInput}
                      value={splitAmounts[p.id]}
                      onChangeText={(v) => setSplitAmounts((prev) => ({ ...prev, [p.id]: v }))}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                  </View>
                ) : (
                  <Text style={styles.splitAmount}>${(p.shareCents / 100).toFixed(2)}</Text>
                )}
              </View>
              );
            })}
          </View>
        )}

        {/* "I paid" card for non-owner participant */}
        {myParticipant && myParticipant.state !== "paid" && isOpen && (
          <View style={[styles.card, { borderColor: colors.primary + "40" }]}>
            <Text style={styles.cardTitle}>Your Share</Text>
            <View style={styles.participantRow}>
              {(() => { const ac = avatarColor(myParticipant.user?.displayName ?? myParticipant.contactName ?? "?"); return (
                <View style={[styles.participantAvatar, { backgroundColor: ac.bg }]}>
                  <Text style={[styles.participantAvatarText, { color: ac.text }]}>
                    {initials(myParticipant.user?.displayName ?? myParticipant.contactName ?? "?")}
                  </Text>
                </View>
              ); })()}
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{myParticipant.user?.displayName ?? myParticipant.contactName ?? "You"}</Text>
                <Text style={styles.participantMeta}>{myParticipant.state === "pending" ? "Pending" : "Requested"}</Text>
              </View>
              <View style={styles.participantRight}>
                <Text style={styles.participantAmount}>${(myParticipant.shareCents / 100).toFixed(2)}</Text>
                <Pressable style={styles.settleBtn} onPress={handleSelfSettle}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.settleBtnText}>I paid</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Awaiting payment */}
        {pending.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Awaiting Payment</Text>
            {pending.map((p, i) => {
              const name = p.user?.displayName ?? p.contactName ?? "?";
              const ac = avatarColor(name);
              return (
              <SwipeToSettle key={p.id} onSettle={() => handleSettle(p)} enabled={isOwner && isOpen}>
              <View style={[styles.participantRow, i > 0 && styles.rowBorder]}>
                <View style={[styles.participantAvatar, { backgroundColor: ac.bg }]}>
                  <Text style={[styles.participantAvatarText, { color: ac.text }]}>
                    {initials(name)}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{name === "?" ? "Unknown" : name}</Text>
                  <Text style={styles.participantMeta}>{PLATFORM_LABELS[p.platform]} · {p.state}</Text>
                </View>
                <View style={styles.participantRight}>
                  <Text style={styles.participantAmount}>${(p.shareCents / 100).toFixed(2)}</Text>
                  {isOwner && isOpen && (
                    <View style={styles.actionBtns}>
                      {p.userId && (
                        <Pressable style={styles.remindBtn} onPress={() => handleRemind(p)}>
                          <Ionicons name="notifications-outline" size={13} color={colors.warning} />
                          <Text style={styles.remindBtnText}>Remind</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={styles.requestBtn}
                        onPress={() => handleRequestPayment(p)}
                        onLongPress={() => p.paymentLink && handleCopyLink(p.paymentLink)}
                        delayLongPress={400}
                      >
                        <Text style={styles.requestBtnText}>Request</Text>
                      </Pressable>
                      <Pressable style={styles.settleBtn} onPress={() => handleSettle(p)}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Text style={styles.settleBtnText}>Paid</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
              </SwipeToSettle>
              );
            })}
          </View>
        )}

        {/* Settled */}
        {settled.length > 0 && (
          <View style={[styles.card, styles.cardMuted]}>
            <Text style={styles.cardTitle}>Settled</Text>
            {settled.map((p, i) => {
              const name = p.user?.displayName ?? p.contactName ?? "?";
              const ac = avatarColor(name);
              return (
              <View key={p.id} style={[styles.participantRow, i > 0 && styles.rowBorder, styles.rowMuted]}>
                <View style={[styles.participantAvatar, { backgroundColor: ac.bg + "80" }]}>
                  <Text style={[styles.participantAvatarText, { color: ac.text + "99" }]}>
                    {initials(name)}
                  </Text>
                </View>
                <Text style={[styles.participantName, styles.textMuted]}>{name === "?" ? "Unknown" : name}</Text>
                <Text style={[styles.participantAmount, { color: colors.success }]}>${(p.shareCents / 100).toFixed(2)}</Text>
              </View>
              );
            })}
          </View>
        )}

        {isOwner && isOpen && (
          <Pressable style={styles.cancelBtn} onPress={handleCancelTab}>
            <Text style={styles.cancelBtnText}>Cancel Tab</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReceiptThumb({ uri }: { uri: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <Pressable onPress={() => setExpanded(true)} style={styles.receiptThumb}>
        <Image source={{ uri }} style={styles.receiptThumbImg} contentFit="cover" />
        <View style={styles.receiptThumbOverlay}>
          <Ionicons name="expand-outline" size={18} color="#fff" />
          <Text style={styles.receiptThumbLabel}>View receipt</Text>
        </View>
      </Pressable>
      <Modal visible={expanded} animationType="fade" statusBarTranslucent transparent>
        <Pressable style={styles.receiptModal} onPress={() => setExpanded(false)}>
          <Image source={{ uri }} style={styles.receiptFull} contentFit="contain" />
          <Text style={styles.receiptModalHint}>Tap to close</Text>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 24 },
  content: { padding: 16, paddingBottom: 60 },
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "800", color: colors.textPrimary, flex: 1, letterSpacing: -0.5 },
  location: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
  shareBtn: { padding: 4 },
  friendBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: colors.primary + "40",
  },
  friendBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  friendBannerText: { fontSize: 13, fontWeight: "600", color: colors.primaryDark, flex: 1 },
  friendBannerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  friendBannerBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  friendBannerBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusOpen: { backgroundColor: colors.warning + "20" },
  statusSettled: { backgroundColor: colors.primaryLight },
  statusText: { fontSize: 12, fontWeight: "700" },
  statusTextOpen: { color: colors.warning },
  statusTextSettled: { color: colors.primaryDark },
  errorText: { color: colors.error, marginBottom: 16 },
  heroCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  heroMain: { marginBottom: 16 },
  heroLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  heroAmount: { fontSize: 44, fontWeight: "800", color: colors.textPrimary, letterSpacing: -1.5, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: colors.divider, marginBottom: 16 },
  heroStats: { flexDirection: "row", gap: 24 },
  heroStat: {},
  heroStatValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  heroStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  cardMuted: { opacity: 0.7 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  cardAction: { fontSize: 14, fontWeight: "600", color: colors.primary },
  splitActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  splitSaveBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  splitSaveBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  splitCancelText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  splitRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  splitName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  splitAmount: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  splitInputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  splitDollar: { fontSize: 15, fontWeight: "700", color: colors.textSecondary, marginRight: 2 },
  splitInput: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, minWidth: 60 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  rowMuted: { opacity: 0.6 },
  participantRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  participantAvatar: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  avatarMuted: { backgroundColor: colors.surfaceSecondary },
  participantAvatarText: { fontSize: 12, fontWeight: "800", color: colors.primaryDark },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  textMuted: { color: colors.textMuted },
  participantMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  participantRight: { alignItems: "flex-end", gap: 8 },
  participantAmount: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  actionBtns: { flexDirection: "row", gap: 6 },
  remindBtn: { backgroundColor: colors.warning + "18", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 3 },
  remindBtnText: { fontSize: 12, fontWeight: "700", color: colors.warning },
  remindBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  remindSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  remindTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginBottom: 2 },
  remindSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  remindOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: colors.surfaceSecondary, marginBottom: 4,
  },
  remindOptionText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  remindCancel: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  remindCancelText: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  requestBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  requestBtnText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  settleBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 },
  settleBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  celebrationOverlay: {
    alignItems: "center", justifyContent: "center", gap: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  celebrationText: { fontSize: 28, fontWeight: "800", color: colors.primary },
  cancelBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1.5, borderColor: colors.danger },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.danger },
  disabled: { opacity: 0.6 },
  receiptThumb: {
    marginBottom: 16, borderRadius: 14, overflow: "hidden",
    height: 120, borderWidth: 1, borderColor: colors.border,
  },
  receiptThumbImg: { width: "100%", height: "100%" },
  receiptThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end",
    padding: 10, gap: 4,
  },
  receiptThumbLabel: { color: "#fff", fontSize: 12, fontWeight: "600" },
  receiptModal: {
    flex: 1, backgroundColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  receiptFull: { width: "100%", height: "80%" },
  receiptModalHint: { color: "#aaa", fontSize: 13, marginTop: 16 },
});
