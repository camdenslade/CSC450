// apps/mobile/src/auth/OnboardingFlow.tsx
import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Background } from "../shared/Background";
import { colors } from "../theme/colors";
import { useAuth } from "./AuthContext";
import { useData } from "../store/DataContext";
import { PlatformIcon } from "../shared/PlatformIcon";

type Step = "profile" | "platforms" | "done";

type PlatformKey = "venmo" | "paypal" | "cashapp";
const PLATFORMS: { key: PlatformKey; label: string; prefix: string; placeholder: string }[] = [
  { key: "venmo",   label: "Venmo",    prefix: "@",          placeholder: "username" },
  { key: "cashapp", label: "Cash App", prefix: "$",          placeholder: "cashtag" },
  { key: "paypal",  label: "PayPal",   prefix: "paypal.me/", placeholder: "username" },
];

export function OnboardingFlow() {
  const { apiClient, completeOnboarding } = useAuth();
  const { refreshProfile } = useData();

  const [step, setStep] = useState<Step>("profile");

  // Step 1 — profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [defaultPlatform, setDefaultPlatform] = useState<PlatformKey | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Step 2 — platforms
  const [handles, setHandles] = useState<Record<PlatformKey, string>>({ venmo: "", paypal: "", cashapp: "" });
  const [savingHandles, setSavingHandles] = useState(false);

  async function handleSaveProfile() {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      Alert.alert("Required", "Please enter your first and last name.");
      return;
    }
    const name = `${first} ${last}`;
    setSavingProfile(true);
    try {
      await apiClient.patch("/users/me", {
        displayName: name,
        ...(defaultPlatform ? { defaultPlatform } : {}),
      });
      await refreshProfile();
      setStep("platforms");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveHandles() {
    setSavingHandles(true);
    try {
      const saves = PLATFORMS
        .filter((pl) => handles[pl.key].trim())
        .map((pl) =>
          apiClient.post("/payments/handles", { platform: pl.key, handle: handles[pl.key].trim() })
        );
      if (saves.length > 0) await Promise.all(saves);
      setStep("done");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save handles.");
    } finally {
      setSavingHandles(false);
    }
  }

  async function handleFinish() {
    await completeOnboarding();
  }

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>

            {/* Progress dots */}
            <View style={styles.progressRow}>
              {(["profile", "platforms", "done"] as Step[]).map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.dot,
                    step === s && styles.dotActive,
                    (step === "platforms" && i === 0) || (step === "done" && i < 2)
                      ? styles.dotDone
                      : null,
                  ]}
                />
              ))}
            </View>

            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Step 1: Profile */}
              {step === "profile" && (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>Welcome to TabUp</Text>
                  <Text style={styles.subtitle}>Let's set up your profile so your friends can find you.</Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>First name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Alex"
                      placeholderTextColor={colors.textMuted}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoFocus
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Last name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Johnson"
                      placeholderTextColor={colors.textMuted}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Default payment platform <Text style={styles.optional}>(optional)</Text></Text>
                    <Text style={styles.fieldHint}>This is how friends will send you money by default.</Text>
                    <View style={styles.platformRow}>
                      {PLATFORMS.map((pl) => {
                        const active = defaultPlatform === pl.key;
                        return (
                          <Pressable
                            key={pl.key}
                            style={[styles.platformChip, active && styles.platformChipActive]}
                            onPress={() => setDefaultPlatform(active ? null : pl.key)}
                          >
                            <PlatformIcon platform={pl.key} size={26} />
                            <Text style={[styles.platformLabel, active && styles.platformLabelActive]}>{pl.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                </View>
              )}

              {/* Step 2: Payment handles */}
              {step === "platforms" && (
                <View style={styles.stepWrap}>
                  <Text style={styles.title}>Link your payment accounts</Text>
                  <Text style={styles.subtitle}>Friends will use these handles to pay you back. You can skip any you don't use.</Text>

                  <View style={styles.handlesCard}>
                    {PLATFORMS.map((pl, i) => (
                      <View key={pl.key} style={[styles.handleRow, i > 0 && styles.handleRowBorder]}>
                        <PlatformIcon platform={pl.key} size={28} />
                        <View style={styles.handleRight}>
                          <Text style={styles.handleLabel}>{pl.label}</Text>
                          <View style={styles.prefixRow}>
                            <Text style={styles.prefix}>{pl.prefix}</Text>
                            <TextInput
                              style={styles.handleInput}
                              placeholder={pl.placeholder}
                              placeholderTextColor={colors.textMuted}
                              value={handles[pl.key]}
                              onChangeText={(v) => {
                                const bare = v.startsWith(pl.prefix) ? v.slice(pl.prefix.length) : v;
                                setHandles((prev) => ({ ...prev, [pl.key]: bare }));
                              }}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.skipHint}>You can always update these in Profile settings.</Text>
                </View>
              )}

              {/* Step 3: Done */}
              {step === "done" && (
                <View style={[styles.stepWrap, styles.doneWrap]}>
                  <Ionicons name="checkmark-circle" size={72} color={colors.primary} style={styles.doneIcon} />
                  <Text style={styles.title}>You're all set!</Text>
                  <Text style={styles.subtitle}>
                    Add friends from the Friends tab, then create your first tab together.
                  </Text>
                  <View style={styles.doneTips}>
                    <TipRow icon="people" text="Add friends by searching their name" />
                    <TipRow icon="add-circle" text="Tap the green button to create a new tab" />
                    <TipRow icon="cash" text="Mark participants as paid when they pay you" />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Fixed bottom CTA */}
            <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
              {step === "profile" && (
                <Pressable
                  style={[styles.cta, (!firstName.trim() || !lastName.trim() || savingProfile) && styles.ctaDisabled]}
                  onPress={handleSaveProfile}
                  disabled={!firstName.trim() || !lastName.trim() || savingProfile}
                >
                  {savingProfile
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.ctaText}>Continue</Text>}
                </Pressable>
              )}
              {step === "platforms" && (
                <View style={styles.ctaRow}>
                  <Pressable
                    style={[styles.ctaSecondary, savingHandles && styles.ctaDisabled]}
                    onPress={() => { setStep("done"); }}
                    disabled={savingHandles}
                  >
                    <Text style={styles.ctaSecondaryText}>Skip for now</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.cta, styles.flex1, savingHandles && styles.ctaDisabled]}
                    onPress={handleSaveHandles}
                    disabled={savingHandles}
                  >
                    {savingHandles
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.ctaText}>Save & Continue</Text>}
                  </Pressable>
                </View>
              )}
              {step === "done" && (
                <Pressable style={styles.cta} onPress={handleFinish}>
                  <Text style={styles.ctaText}>Get Started</Text>
                </Pressable>
              )}
            </SafeAreaView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Background>
    </SafeAreaProvider>
  );
}

function TipRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name={icon} size={22} color={colors.primary} style={styles.tipIcon} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  progressRow: { flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  dotDone: { backgroundColor: colors.primaryDark },

  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  stepWrap: { gap: 20 },

  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginTop: -8 },

  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  optional: { fontWeight: "400", color: colors.textMuted },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: -4 },
  input: {
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: colors.textPrimary,
    borderWidth: 1.5, borderColor: colors.border,
  },

  platformRow: { flexDirection: "row", gap: 10 },
  platformChip: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, gap: 4,
  },
  platformChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  platformLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  platformLabelActive: { color: colors.primaryDark },

  handlesCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  handleRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  handleRowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  handleRight: { flex: 1, gap: 4 },
  handleLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  prefixRow: { flexDirection: "row", alignItems: "center" },
  prefix: { fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginRight: 1 },
  handleInput: {
    flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary,
    paddingVertical: 2,
  },
  skipHint: { fontSize: 12, color: colors.textMuted, textAlign: "center" },

  doneWrap: { alignItems: "center", paddingTop: 20 },
  doneIcon: { marginBottom: 8 },
  doneTips: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    padding: 20, gap: 14, width: "100%",
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tipIcon: { width: 32, textAlign: "center" },
  tipText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary, flex: 1, lineHeight: 20 },

  bottomBar: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  ctaRow: { flexDirection: "row", gap: 10 },
  cta: {
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: "center",
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  ctaDisabled: { opacity: 0.45, shadowOpacity: 0 },
  ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  ctaSecondary: {
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border, alignItems: "center",
  },
  ctaSecondaryText: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  flex1: { flex: 1 },
});
