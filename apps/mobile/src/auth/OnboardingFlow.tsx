// apps/mobile/src/api/OnboardingFlow.tsx
import { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Background } from "../shared/Background";
import { useColors } from "../theme/colors";
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
  const c = useColors();

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

  const steps: Step[] = ["profile", "platforms", "done"];
  const stepIndex = steps.indexOf(step);

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

            {/* Progress dots */}
            <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 16 }}>
              {steps.map((s, i) => (
                <View
                  key={s}
                  style={{
                    width: step === s ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i < stepIndex ? c.primaryDark : step === s ? c.primary : c.border,
                  }}
                />
              ))}
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Step 1: Profile */}
              {step === "profile" && (
                <View style={{ gap: 20 }}>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5, lineHeight: 34 }}>
                    Welcome to TabUp
                  </Text>
                  <Text style={{ fontSize: 15, color: c.textMuted, lineHeight: 22, marginTop: -8 }}>
                    Let's set up your profile so your friends can find you.
                  </Text>

                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary }}>First name</Text>
                    <TextInput
                      style={{
                        backgroundColor: c.surface, borderRadius: 14,
                        paddingHorizontal: 16, paddingVertical: 14,
                        fontSize: 17, color: c.textPrimary,
                        borderWidth: 1.5, borderColor: c.border,
                      }}
                      placeholder="Alex"
                      placeholderTextColor={c.textMuted}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoFocus
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary }}>Last name</Text>
                    <TextInput
                      style={{
                        backgroundColor: c.surface, borderRadius: 14,
                        paddingHorizontal: 16, paddingVertical: 14,
                        fontSize: 17, color: c.textPrimary,
                        borderWidth: 1.5, borderColor: c.border,
                      }}
                      placeholder="Johnson"
                      placeholderTextColor={c.textMuted}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary }}>
                      Default payment platform{" "}
                      <Text style={{ fontWeight: "400", color: c.textMuted }}>(optional)</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: c.textMuted, marginTop: -4 }}>
                      This is how friends will send you money by default.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {PLATFORMS.map((pl) => {
                        const active = defaultPlatform === pl.key;
                        return (
                          <Pressable
                            key={pl.key}
                            style={{
                              flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14,
                              borderWidth: 1.5, gap: 4,
                              borderColor: active ? c.primary : c.border,
                              backgroundColor: active ? c.primaryLight : c.surface,
                            }}
                            onPress={() => setDefaultPlatform(active ? null : pl.key)}
                          >
                            <PlatformIcon platform={pl.key} size={26} />
                            <Text style={{ fontSize: 12, fontWeight: "700", color: active ? c.primaryDark : c.textMuted }}>
                              {pl.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {/* Step 2: Payment handles */}
              {step === "platforms" && (
                <View style={{ gap: 20 }}>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5, lineHeight: 34 }}>
                    Link your payment accounts
                  </Text>
                  <Text style={{ fontSize: 15, color: c.textMuted, lineHeight: 22, marginTop: -8 }}>
                    Friends will use these handles to pay you back. You can skip any you don't use.
                  </Text>

                  <View style={{
                    backgroundColor: c.surface, borderRadius: 16,
                    borderWidth: 1, borderColor: c.border, overflow: "hidden",
                  }}>
                    {PLATFORMS.map((pl, i) => (
                      <View key={pl.key} style={{
                        flexDirection: "row", alignItems: "center", padding: 16, gap: 12,
                        ...(i > 0 ? { borderTopWidth: 1, borderTopColor: c.divider } : {}),
                      }}>
                        <PlatformIcon platform={pl.key} size={28} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{pl.label}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: c.textSecondary, marginRight: 1 }}>
                              {pl.prefix}
                            </Text>
                            <TextInput
                              style={{ flex: 1, fontSize: 15, fontWeight: "600", color: c.textPrimary, paddingVertical: 2 }}
                              placeholder={pl.placeholder}
                              placeholderTextColor={c.textMuted}
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

                  <Text style={{ fontSize: 12, color: c.textMuted, textAlign: "center" }}>
                    You can always update these in Profile settings.
                  </Text>
                </View>
              )}

              {/* Step 3: Done */}
              {step === "done" && (
                <View style={{ gap: 20, alignItems: "center", paddingTop: 20 }}>
                  <Ionicons name="checkmark-circle" size={72} color={c.primary} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 28, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5, lineHeight: 34 }}>
                    You're all set!
                  </Text>
                  <Text style={{ fontSize: 15, color: c.textMuted, lineHeight: 22, marginTop: -8 }}>
                    Add friends from the Friends tab, then create your first tab together.
                  </Text>
                  <View style={{
                    backgroundColor: c.surface, borderRadius: 16,
                    borderWidth: 1, borderColor: c.border,
                    padding: 20, gap: 14, width: "100%",
                  }}>
                    <TipRow icon="people" text="Add friends by searching their name" c={c} />
                    <TipRow icon="add-circle" text="Tap the green button to create a new tab" c={c} />
                    <TipRow icon="cash" text="Mark participants as paid when they pay you" c={c} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Fixed bottom CTA */}
            <SafeAreaView edges={["bottom"]} style={{
              paddingHorizontal: 20, paddingTop: 12,
              borderTopWidth: 1, borderTopColor: c.border,
              backgroundColor: c.background,
            }}>
              {step === "profile" && (
                <Pressable
                  style={{
                    backgroundColor: c.primary, paddingVertical: 16, borderRadius: 16, alignItems: "center",
                    shadowColor: c.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
                    opacity: (!firstName.trim() || !lastName.trim() || savingProfile) ? 0.45 : 1,
                  }}
                  onPress={handleSaveProfile}
                  disabled={!firstName.trim() || !lastName.trim() || savingProfile}
                >
                  {savingProfile
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>Continue</Text>}
                </Pressable>
              )}
              {step === "platforms" && (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    style={{
                      paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16,
                      borderWidth: 1.5, borderColor: c.border, alignItems: "center",
                      opacity: savingHandles ? 0.45 : 1,
                    }}
                    onPress={() => { setStep("done"); }}
                    disabled={savingHandles}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: c.textMuted }}>Skip for now</Text>
                  </Pressable>
                  <Pressable
                    style={{
                      flex: 1, backgroundColor: c.primary, paddingVertical: 16, borderRadius: 16, alignItems: "center",
                      shadowColor: c.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
                      opacity: savingHandles ? 0.45 : 1,
                    }}
                    onPress={handleSaveHandles}
                    disabled={savingHandles}
                  >
                    {savingHandles
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>Save & Continue</Text>}
                  </Pressable>
                </View>
              )}
              {step === "done" && (
                <Pressable
                  style={{
                    backgroundColor: c.primary, paddingVertical: 16, borderRadius: 16, alignItems: "center",
                    shadowColor: c.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
                  }}
                  onPress={handleFinish}
                >
                  <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>Get Started</Text>
                </Pressable>
              )}
            </SafeAreaView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Background>
    </SafeAreaProvider>
  );
}

function TipRow({ icon, text, c }: { icon: keyof typeof Ionicons.glyphMap; text: string; c: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Ionicons name={icon} size={22} color={c.primary} style={{ width: 32, textAlign: "center" }} />
      <Text style={{ fontSize: 14, fontWeight: "500", color: c.textSecondary, flex: 1, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}
