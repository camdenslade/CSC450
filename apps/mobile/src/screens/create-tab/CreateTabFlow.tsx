// apps/mobile/src/screens/create-tab/CreateTabFlow.tsx
import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { Background } from "../../shared/Background";
import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { ApiFriend } from "../../api/client";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { formatAmountInput } from "../../shared/formatAmount";



type Platform_ = "paypal" | "venmo" | "cashapp";

const PLATFORMS: { key: Platform_; label: string }[] = [
  { key: "venmo", label: "Venmo" },
  { key: "paypal", label: "PayPal" },
  { key: "cashapp", label: "Cash App" },
];

type ParticipantRow = {
  userId: string;
  name: string;
  amountStr: string;
  platform: Platform_;
};

type CreateTabFlowProps = {
  onBack: () => void;
  onComplete: () => void;
};

function otherUser(friend: ApiFriend, myUserId: string) {
  return friend.requesterId === myUserId ? friend.recipient : friend.requester;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function CreateTabFlow({ onBack, onComplete }: CreateTabFlowProps) {
  const { apiClient, userId } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const stepAnim = useRef(new Animated.Value(1)).current;
  const animating = useRef(false);

  function animateStep(next: number) {
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

  // Step 1
  const [subtotal, setSubtotal] = useState("");
  const [tipPct, setTipPct] = useState<number | null>(null);
  const [tabName, setTabName] = useState("");
  const [location, setLocation] = useState("");
  const amountRef = useRef<TextInput>(null);

  const subtotalNum = parseFloat(subtotal) || 0;
  const tipAmount = tipPct !== null ? subtotalNum * tipPct : 0;
  const amount = subtotalNum > 0 ? (subtotalNum + tipAmount).toFixed(2) : "";

  function handleSubtotalChange(val: string) {
    setSubtotal((prev) => formatAmountInput(prev, val));
    setTipPct(null);
  }

  function handleTipPct(pct: number) {
    setTipPct((prev) => (prev === pct ? null : pct));
  }

  // Camera / OCR
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  async function handleOpenCamera() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Permission required", "Camera access is needed to scan your bill.");
        return;
      }
    }
    setCameraOpen(true);
  }

  async function handleCapture() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.base64) throw new Error("No photo captured");
      setPreview(photo.base64);
      setScanning(false); // preview ready — let user tap confirm
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Capture failed.");
      setScanning(false);
    }
  }

  async function handleConfirmPhoto() {
    if (!preview) return;
    setScanning(true);
    type OcrResponse = { amount: string | null; candidates: string[]; confidence: "high" | "low" | null; receiptKey: string };
    let result: OcrResponse | null = null;
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 20_000),
      );
      result = await Promise.race([
        apiClient.post<OcrResponse>("/uploads/ocr", { image: preview }),
        timeout,
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message === "timeout"
        ? "Scan timed out. Try again or enter the amount manually."
        : "Scan failed. Try again or enter the amount manually.";
      setPreview(null);
      setScanning(false);
      setCameraOpen(false);
      Alert.alert("Scan failed", msg);
      return;
    }

    // Always close camera before showing any UI (catch always returns, so result is non-null here)
    if (result!.receiptKey) setReceiptKey(result!.receiptKey);
    setPreview(null);
    setScanning(false);
    setCameraOpen(false);

    if (!result!.candidates.length) {
      Alert.alert(
        "No total found",
        "This doesn't look like a bill, or the total wasn't readable. Enter the amount manually.",
      );
      return;
    }

    if (result!.amount && result!.confidence === "high") {
      setSubtotal(result!.amount);
      setTipPct(null);
      return;
    }

    // Multiple candidates or low confidence — show picker
    setOcrCandidates(result!.candidates);
  }

  function handlePickCandidate(val: string) {
    setSubtotal(val);
    setTipPct(null);
    setOcrCandidates([]);
  }

  function handleRetake() {
    setPreview(null);
    setScanning(false);
  }

  // Step 2
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inviteViaLink] = useState(false);

  // Step 2 search (shown when no friends)
  type SearchResult = { user: { id: string; displayName: string }; matchedPlatform: string | null; matchedHandle: string | null };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runSearch(q: string) {
    if (q.length < 2) { setSearchResults([]); setSearched(false); return; }
    setSearching(true);
    try {
      const data = await apiClient.get<SearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data);
      setSearched(true);
    } catch { /* silent */ } finally { setSearching(false); }
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => runSearch(text.trim()), 350);
  }

  async function handleAddFromSearch(result: SearchResult) {
    const { user } = result;
    try {
      await apiClient.post("/friends/invite-by-id", { targetUserId: user.id });
      setSentRequestIds((prev) => new Set([...prev, user.id]));
      // Also select them for the tab
      setSelectedIds((prev) => new Set([...prev, user.id]));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed.";
      if (msg.includes("Already friends")) {
        setSelectedIds((prev) => new Set([...prev, user.id]));
      } else {
        Alert.alert("Error", msg);
      }
    }
  }

  // Step 3
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [splitType, setSplitType] = useState<"even" | "custom">("even");

  const billAmount = parseFloat(amount) || 0;

  useEffect(() => {
    if (step !== 2 || friends.length > 0) return;
    setFriendsLoading(true);
    apiClient
      .get<ApiFriend[]>("/friends")
      .then(setFriends)
      .catch((e: Error) => Alert.alert("Error", e.message))
      .finally(() => setFriendsLoading(false));
  }, [step]);

  function handleStep1Next() {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid bill amount.");
      return;
    }
    animateStep(2);
  }

  function handleStep2Next() {
    if (selectedIds.size === 0 && !inviteViaLink) {
      Alert.alert("Error", "Select at least one friend or enable Invite via link.");
      return;
    }
    const totalPeople = selectedIds.size + 1; // +1 for the tab creator
    const evenAmount = billAmount / totalPeople;
    const rows: ParticipantRow[] = [];
    for (const id of selectedIds) {
      const f = friends.find((fr) => otherUser(fr, userId!).id === id);
      if (!f) continue;
      const u = otherUser(f, userId!);
      rows.push({ userId: u.id, name: u.displayName, amountStr: evenAmount.toFixed(2), platform: "venmo" });
    }
    setParticipants(rows);
    animateStep(3);
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
    if (type === "even" && participants.length > 0) {
      const each = billAmount / (participants.length + 1); // +1 for the tab creator
      setParticipants(participants.map((p) => ({ ...p, amountStr: each.toFixed(2) })));
    }
  }

  function updateAmount(index: number, val: string) {
    setParticipants(participants.map((p, i) => i === index ? { ...p, amountStr: val } : p));
  }

  function updatePlatform(index: number, platform: Platform_) {
    setParticipants(participants.map((p, i) => i === index ? { ...p, platform } : p));
  }

  function handleStep3Next() {
    const total = participants.reduce((sum, p) => sum + (parseFloat(p.amountStr) || 0), 0);
    if (Math.abs(total - billAmount) > 0.01) {
      Alert.alert("Mismatch", `Split total ($${total.toFixed(2)}) must equal bill total ($${billAmount.toFixed(2)}).`);
      return;
    }
    animateStep(4);
  }

  async function handleCreateTab() {
    setSubmitting(true);
    try {
      const bill = await apiClient.post<{ id: string }>("/tabs", {
        name: tabName || "Tab",
        location: location || undefined,
        total: Math.round(billAmount * 100),
        ...(receiptKey ? { receiptKey } : {}),
        participants: participants.map((p) => ({
          userId: p.userId,
          platform: p.platform,
          share: Math.round((parseFloat(p.amountStr) || 0) * 100),
        })),
      });
      if (inviteViaLink) {
        try {
          const { url } = await apiClient.post<{ url: string }>(`/tabs/${bill.id}/share`, {});
          await Share.share({ message: `Join my tab on TabUp: ${url}`, url });
        } catch {}
      }
      onComplete();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create tab.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalSplit = participants.reduce((s, p) => s + (parseFloat(p.amountStr) || 0), 0);
  const remaining = billAmount - totalSplit;
  const step1Valid = subtotalNum > 0;
  const step2Valid = selectedIds.size > 0 || inviteViaLink;

  const STEPS = ["Details", "People", "Split", "Review"];

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={step === 1 ? onBack : () => animateStep(step - 1)} hitSlop={12}>
                <Text style={styles.backText}>{step === 1 ? "Cancel" : "‹ Back"}</Text>
              </Pressable>
              <Text style={styles.headerTitle}>New Tab</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepRow}>
              {STEPS.map((s, i) => (
                <View key={s} style={styles.stepItem}>
                  <View style={[styles.stepDot, i + 1 <= step && styles.stepDotActive, i + 1 < step && styles.stepDotDone]}>
                    {i + 1 < step
                      ? <Ionicons name="checkmark" size={12} color="#fff" />
                      : <Text style={[styles.stepDotNum, i + 1 === step && styles.stepDotNumActive]}>{i + 1}</Text>}
                  </View>
                  <Text style={[styles.stepLabel, i + 1 === step && styles.stepLabelActive]}>{s}</Text>
                  {i < STEPS.length - 1 && <View style={[styles.stepLine, i + 1 < step && styles.stepLineDone]} />}
                </View>
              ))}
            </View>

            <Animated.ScrollView
              style={[styles.flex, { opacity: stepAnim }]}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Step 1: Bill Details */}
              {step === 1 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Bill Details</Text>
                  <Text style={styles.stepSubtitle}>How much was the bill?</Text>

                  <View style={styles.amountCard}>
                    <Text style={styles.amountPrefix}>$</Text>
                    <TextInput
                      ref={amountRef}
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={subtotal}
                      onChangeText={handleSubtotalChange}
                      autoFocus
                    />
                    <Pressable onPress={handleOpenCamera} hitSlop={12} style={styles.cameraBtn}>
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    </Pressable>
                  </View>

                  {subtotalNum > 0 && (
                    <View style={styles.tipSection}>
                      <Text style={styles.tipLabel}>Add tip</Text>
                      <View style={styles.tipRow}>
                        {([0.18, 0.20, 0.22, 0.25] as const).map((pct) => {
                          const active = tipPct === pct;
                          const tipDollars = (subtotalNum * pct).toFixed(2);
                          return (
                            <Pressable
                              key={pct}
                              style={[styles.tipChip, active && styles.tipChipActive]}
                              onPress={() => handleTipPct(pct)}
                            >
                              <Text style={[styles.tipChipPct, active && styles.tipChipTextActive]}>
                                {Math.round(pct * 100)}%
                              </Text>
                              <Text style={[styles.tipChipAmt, active && styles.tipChipTextActive]}>
                                ${tipDollars}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {tipPct !== null && (
                        <View style={styles.tipTotal}>
                          <Text style={styles.tipTotalLabel}>Total with tip</Text>
                          <Text style={styles.tipTotalAmount}>${amount}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Tab Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Birthday Dinner"
                      placeholderTextColor={colors.textMuted}
                      value={tabName}
                      onChangeText={setTabName}
                      returnKeyType="next"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Location <Text style={styles.optional}>(optional)</Text></Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Blue Harbor"
                      placeholderTextColor={colors.textMuted}
                      value={location}
                      onChangeText={setLocation}
                    />
                  </View>
                </View>
              )}

              {/* Step 2: Select Friends */}
              {step === 2 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Select People</Text>
                  <Text style={styles.stepSubtitle}>{selectedIds.size} selected · splitting ${billAmount.toFixed(2)}</Text>

                  {friendsLoading ? (
                    <ActivityIndicator color={colors.primary} style={styles.spinner} />
                  ) : friends.length > 0 ? (
                    <View style={styles.friendsList}>
                      {friends.map((f) => {
                        const u = otherUser(f, userId!);
                        const selected = selectedIds.has(u.id);
                        return (
                          <Pressable
                            key={f.id}
                            style={[styles.friendRow, selected && styles.friendRowSelected]}
                            onPress={() => toggleFriend(u.id)}
                          >
                            <View style={[styles.avatarSmall, selected && styles.avatarSmallSelected]}>
                              <Text style={styles.avatarSmallText}>{initials(u.displayName)}</Text>
                            </View>
                            <Text style={styles.friendName} numberOfLines={1}>{u.displayName}</Text>
                            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                              {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <>
                      <View style={styles.searchRow}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search by name or handle..."
                          placeholderTextColor={colors.textMuted}
                          value={searchQuery}
                          onChangeText={handleSearchChange}
                          autoCorrect={false}
                          returnKeyType="search"
                        />
                        {searching && <ActivityIndicator color={colors.primary} style={{ position: "absolute", right: 14 }} />}
                      </View>
                      {searchResults.length > 0 ? (
                        <View style={styles.friendsList}>
                          {searchResults.map((r) => {
                            const added = selectedIds.has(r.user.id);
                            const sent = sentRequestIds.has(r.user.id);
                            return (
                              <View key={r.user.id} style={[styles.friendRow, added && styles.friendRowSelected]}>
                                <View style={[styles.avatarSmall, added && styles.avatarSmallSelected]}>
                                  <Text style={styles.avatarSmallText}>{initials(r.user.displayName)}</Text>
                                </View>
                                <Text style={styles.friendName} numberOfLines={1}>{r.user.displayName}</Text>
                                {added ? (
                                  <View style={[styles.checkbox, styles.checkboxSelected]}>
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                  </View>
                                ) : (
                                  <Pressable
                                    style={styles.addFromSearchBtn}
                                    onPress={() => handleAddFromSearch(r)}
                                  >
                                    <Text style={styles.addFromSearchBtnText}>{sent ? "Added" : "Add"}</Text>
                                  </Pressable>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ) : searched ? (
                        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>No users found.</Text>
                      ) : null}
                    </>
                  )}
                </View>
              )}

              {/* Step 3: Split */}
              {step === 3 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Configure Split</Text>
                  <Text style={styles.stepSubtitle}>${billAmount.toFixed(2)} among {participants.length} {participants.length === 1 ? "person" : "people"}</Text>

                  <View style={styles.segmentedControl}>
                    {(["even", "custom"] as const).map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.segmentBtn, splitType === t && styles.segmentBtnActive]}
                        onPress={() => handleSplitTypeChange(t)}
                      >
                        <Text style={[styles.segmentText, splitType === t && styles.segmentTextActive]}>
                          {t === "even" ? "Even Split" : "Custom"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.participantsList}>
                    {participants.map((p, i) => (
                      <View key={p.userId} style={[styles.participantCard, i > 0 && styles.participantBorder]}>
                        <View style={styles.participantLeft}>
                          <View style={styles.avatarSmall}>
                            <Text style={styles.avatarSmallText}>{initials(p.name)}</Text>
                          </View>
                          <Text style={styles.participantName}>{p.name}</Text>
                        </View>
                        <View style={styles.participantRight}>
                          <View style={styles.amountInputWrap}>
                            <Text style={styles.amountInputPrefix}>$</Text>
                            <TextInput
                              style={[styles.splitAmountInput, splitType === "even" && styles.splitAmountDisabled]}
                              value={p.amountStr}
                              onChangeText={(v) => updateAmount(i, v)}
                              keyboardType="decimal-pad"
                              editable={splitType === "custom"}
                            />
                          </View>
                          <View style={styles.platformRow}>
                            {PLATFORMS.map((pl) => (
                              <Pressable
                                key={pl.key}
                                style={[styles.platformChip, p.platform === pl.key && styles.platformChipActive]}
                                onPress={() => updatePlatform(i, pl.key)}
                              >
                                <PlatformIcon platform={pl.key} size={20} />
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {splitType === "custom" && (
                    <View style={[styles.splitSummary, Math.abs(remaining) > 0.005 && styles.splitSummaryError]}>
                      <Text style={styles.splitSummaryText}>
                        {Math.abs(remaining) <= 0.005
                          ? `Split balanced — $${billAmount.toFixed(2)}`
                          : remaining > 0
                            ? `$${remaining.toFixed(2)} unassigned`
                            : `$${Math.abs(remaining).toFixed(2)} over budget`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Review & Confirm</Text>
                  <Text style={styles.stepSubtitle}>Everything look good?</Text>

                  <View style={styles.reviewHero}>
                    <Text style={styles.reviewHeroAmount}>${billAmount.toFixed(2)}</Text>
                    <Text style={styles.reviewHeroName}>{tabName || "Tab"}</Text>
                    {location ? (
                      <View style={styles.reviewHeroLocationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.reviewHeroLocation}>{location}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.reviewCard}>
                    <Text style={styles.reviewCardLabel}>PARTICIPANTS</Text>
                    {participants.map((p, i) => {
                      const pl = PLATFORMS.find((x) => x.key === p.platform);
                      return (
                        <View key={p.userId} style={[styles.reviewRow, i > 0 && styles.reviewRowBorder]}>
                          <View style={styles.reviewRowLeft}>
                            <View style={styles.avatarTiny}>
                              <Text style={styles.avatarTinyText}>{initials(p.name)}</Text>
                            </View>
                            <View>
                              <Text style={styles.reviewName}>{p.name}</Text>
                              <View style={styles.reviewPlatformRow}>
                                <PlatformIcon platform={p.platform} size={14} />
                                <Text style={styles.reviewPlatform}>{pl?.label}</Text>
                              </View>
                            </View>
                          </View>
                          <Text style={styles.reviewAmount}>${parseFloat(p.amountStr).toFixed(2)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.ScrollView>

            {/* Fixed bottom CTA */}
            <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
              {step === 1 && (
                <Pressable
                  style={[styles.cta, !step1Valid && styles.ctaDisabled]}
                  onPress={handleStep1Next}
                  disabled={!step1Valid}
                >
                  <Text style={styles.ctaText}>Next: Add People</Text>
                </Pressable>
              )}
              {step === 2 && (
                <Pressable
                  style={[styles.cta, !step2Valid && styles.ctaDisabled]}
                  onPress={handleStep2Next}
                  disabled={!step2Valid}
                >
                  <Text style={styles.ctaText}>Next: Split</Text>
                </Pressable>
              )}
              {step === 3 && (
                <Pressable style={styles.cta} onPress={handleStep3Next}>
                  <Text style={styles.ctaText}>Review</Text>
                </Pressable>
              )}
              {step === 4 && (
                <Pressable
                  style={[styles.cta, submitting && styles.ctaDisabled]}
                  onPress={handleCreateTab}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.ctaText}>Create Tab</Text>}
                </Pressable>
              )}
            </SafeAreaView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Background>

      {/* OCR candidate picker */}
      <Modal visible={ocrCandidates.length > 0} transparent animationType="fade">
        <Pressable style={styles.ocrBackdrop} onPress={() => setOcrCandidates([])}>
          <Pressable style={styles.ocrSheet} onPress={() => {}}>
            <Text style={styles.ocrSheetTitle}>Which total is correct?</Text>
            <Text style={styles.ocrSheetSub}>We found a few amounts. Tap the right one.</Text>
            {ocrCandidates.map((val) => (
              <Pressable
                key={val}
                style={({ pressed }) => [styles.ocrOption, pressed && { opacity: 0.7 }]}
                onPress={() => handlePickCandidate(val)}
              >
                <Text style={styles.ocrOptionAmount}>${val}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
            <Pressable style={styles.ocrCancel} onPress={() => setOcrCandidates([])}>
              <Text style={styles.ocrCancelText}>Enter manually</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-screen camera modal */}
      <Modal visible={cameraOpen} animationType="slide" statusBarTranslucent>
        <View style={styles.cameraModal}>
          {preview ? (
            <>
              <Image
                source={{ uri: `data:image/jpeg;base64,${preview}` }}
                style={styles.camera}
                contentFit="cover"
              />
              <View style={styles.cameraControls}>
                <Pressable onPress={scanning ? undefined : handleRetake} style={styles.cameraCancel}>
                  <Text style={[styles.cameraCancelText, scanning && { opacity: 0.3 }]}>Retake</Text>
                </Pressable>
                <Pressable onPress={handleConfirmPhoto} style={styles.cameraShutter} disabled={scanning}>
                  {scanning
                    ? <ActivityIndicator color={colors.primary} size="large" />
                    : <Ionicons name="checkmark" size={32} color="#fff" />}
                </Pressable>
                <View style={styles.cameraSpacer} />
              </View>
              <Text style={styles.cameraHint}>{scanning ? "Scanning receipt..." : "Looks good? Tap ✓ to scan"}</Text>
            </>
          ) : (
            <>
              <CameraView ref={cameraRef} style={styles.camera} facing="back" />
              <View style={styles.cameraControls}>
                <Pressable onPress={() => setCameraOpen(false)} style={styles.cameraCancel}>
                  <Text style={styles.cameraCancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleCapture} style={styles.cameraShutter} disabled={scanning}>
                  {scanning
                    ? <ActivityIndicator color={colors.primary} size="large" />
                    : <View style={styles.cameraShutterInner} />}
                </Pressable>
                <View style={styles.cameraSpacer} />
              </View>
              <Text style={styles.cameraHint}>Point at the bill total and tap the shutter</Text>
            </>
          )}
        </View>
      </Modal>
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

  stepRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, marginBottom: 4 },
  stepItem: { flex: 1, alignItems: "center", position: "relative" },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.border, alignItems: "center", justifyContent: "center",
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotDone: { backgroundColor: colors.primaryDark },
  stepDotNum: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  stepDotNumActive: { color: "#fff" },
  stepDotCheckmark: { fontSize: 12, fontWeight: "700", color: "#fff" },
  stepLabel: { fontSize: 10, fontWeight: "600", color: colors.textMuted, marginTop: 4 },
  stepLabelActive: { color: colors.primaryDark },
  stepLine: {
    position: "absolute", top: 14, left: "50%", right: "-50%",
    height: 2, backgroundColor: colors.border, zIndex: -1,
  },
  stepLineDone: { backgroundColor: colors.primaryDark },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  stepContent: { gap: 16 },
  stepTitle: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: -8 },

  amountCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 4,
    borderWidth: 2, borderColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  amountPrefix: { fontSize: 36, fontWeight: "800", color: colors.textMuted },
  amountInput: { flex: 1, fontSize: 48, fontWeight: "800", color: colors.textPrimary, paddingVertical: 12 },

  formGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  optional: { fontWeight: "400", color: colors.textMuted },
  input: {
    backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },

  spinner: { marginTop: 40 },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyIcon: { marginBottom: 8 },
  reviewHeroLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: "center" },

  friendsList: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  friendRow: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  friendRowSelected: { backgroundColor: colors.primaryLight },
  friendName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { fontSize: 13, fontWeight: "700", color: "#fff" },

  avatarSmall: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  avatarSmallSelected: { backgroundColor: colors.primary },
  avatarSmallText: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },

  segmentedControl: {
    flexDirection: "row", backgroundColor: colors.surfaceSecondary,
    borderRadius: 12, padding: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  segmentBtnActive: { backgroundColor: colors.surface, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4 },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  segmentTextActive: { color: colors.textPrimary },

  participantsList: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  participantCard: { flexDirection: "row", alignItems: "center", padding: 14, justifyContent: "space-between" },
  participantBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  participantLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  participantRight: { alignItems: "flex-end", gap: 6 },
  participantName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  amountInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  amountInputPrefix: { fontSize: 14, fontWeight: "700", color: colors.textMuted, marginRight: 2 },
  splitAmountInput: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, minWidth: 60, textAlign: "right" },
  splitAmountDisabled: { color: colors.textMuted },
  platformRow: { flexDirection: "row", gap: 4 },
  platformChip: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  platformChipActive: { backgroundColor: colors.primaryLight },
  reviewPlatformRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },

  splitSummary: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, alignItems: "center" },
  splitSummaryError: { backgroundColor: colors.danger + "15" },
  splitSummaryText: { fontSize: 14, fontWeight: "600", color: colors.primaryDark },

  reviewHero: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 28,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border,
  },
  reviewHeroAmount: { fontSize: 44, fontWeight: "800", color: colors.textPrimary, letterSpacing: -1 },
  reviewHeroName: { fontSize: 18, fontWeight: "700", color: colors.textSecondary },
  reviewHeroLocation: { fontSize: 13, color: colors.textMuted },

  reviewCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  reviewCardLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, padding: 14, paddingBottom: 6 },
  reviewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  reviewRowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  reviewRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  reviewName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  reviewPlatform: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  reviewAmount: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },

  avatarTiny: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  avatarTinyText: { fontSize: 12, fontWeight: "800", color: colors.primaryDark },

  tipSection: { gap: 10 },
  tipLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tipRow: { flexDirection: "row", gap: 8 },
  tipChip: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  tipChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  tipChipPct: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  tipChipAmt: { fontSize: 11, fontWeight: "500", color: colors.textMuted, marginTop: 2 },
  tipChipTextActive: { color: colors.primaryDark },
  tipTotal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.primaryLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  tipTotalLabel: { fontSize: 14, fontWeight: "600", color: colors.primaryDark },
  tipTotalAmount: { fontSize: 18, fontWeight: "800", color: colors.primaryDark },

  ocrBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  ocrSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  ocrSheetTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginBottom: 2 },
  ocrSheetSub: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  ocrOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: colors.surfaceSecondary, marginBottom: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  ocrOptionAmount: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  ocrCancel: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  ocrCancelText: { fontSize: 15, fontWeight: "600", color: colors.textMuted },

  cameraBtn: { padding: 6 },
  cameraModal: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraControls: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 40, paddingVertical: 32, backgroundColor: "#000",
  },
  cameraCancel: { width: 64 },
  cameraCancelText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  cameraShutter: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  cameraShutterInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff",
  },
  cameraSpacer: { width: 64 },
  cameraHint: {
    color: "#aaa", fontSize: 13, textAlign: "center",
    paddingBottom: 24, backgroundColor: "#000",
  },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  inviteLinkRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, marginTop: 10,
  },
  inviteLinkRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  inviteLinkTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  inviteLinkSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: 14,
  },
  addFromSearchBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
  },
  addFromSearchBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  cta: {
    backgroundColor: colors.primary, paddingVertical: 16,
    borderRadius: 16, alignItems: "center",
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  ctaDisabled: { opacity: 0.45, shadowOpacity: 0 },
  ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
});
