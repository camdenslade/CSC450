import { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, sendPasswordResetEmail } from "@react-native-firebase/auth";
import { useColors } from "../theme/colors";

type Props = { onBack: () => void };

export function ForgotPasswordScreen({ onBack }: Props) {
  const c = useColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Error", friendlyError(msg));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: c.surfaceSecondary, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: c.textPrimary,
    marginBottom: 12, borderWidth: 1, borderColor: c.border,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Pressable onPress={onBack} style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 16, color: c.primary, fontWeight: "600" }}>← Back</Text>
          </Pressable>

          <Text style={{ fontSize: 26, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5, marginBottom: 8 }}>
            Reset password
          </Text>
          <Text style={{ fontSize: 15, color: c.textMuted, marginBottom: 32, lineHeight: 22 }}>
            Enter the email you signed up with and we'll send you a reset link.
          </Text>

          {sent ? (
            <View style={{
              backgroundColor: c.surface, borderRadius: 20, padding: 24,
              borderWidth: 1, borderColor: c.border, alignItems: "center", gap: 12,
            }}>
              <Text style={{ fontSize: 40 }}>📬</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: c.textPrimary, textAlign: "center" }}>
                Check your inbox
              </Text>
              <Text style={{ fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 }}>
                We sent a password reset link to {email.trim()}. Tap it to set a new password.
              </Text>
              <Pressable
                style={{ marginTop: 8 }}
                onPress={() => { setSent(false); setEmail(""); }}
              >
                <Text style={{ fontSize: 14, color: c.primary, fontWeight: "600" }}>Send to a different address</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{
              backgroundColor: c.surface, borderRadius: 24, padding: 24,
              borderWidth: 1, borderColor: c.border,
              shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 4,
            }}>
              <TextInput
                style={inputStyle}
                placeholder="Email address"
                placeholderTextColor={c.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleSend}
                autoFocus
              />
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? c.primaryDark : c.primary,
                  paddingVertical: 15, borderRadius: 14, alignItems: "center",
                  shadowColor: c.primary, shadowOpacity: pressed ? 0 : 0.3,
                  shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
                })}
                onPress={handleSend}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Send reset link</Text>}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function friendlyError(msg: string): string {
  if (msg.includes("user-not-found") || msg.includes("invalid-email")) return "No account found with that email.";
  if (msg.includes("too-many-requests")) return "Too many attempts. Please try again later.";
  return msg;
}
