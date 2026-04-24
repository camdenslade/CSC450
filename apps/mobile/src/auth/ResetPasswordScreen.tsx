import { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, confirmPasswordReset } from "@react-native-firebase/auth";
import { useColors } from "../theme/colors";

type Props = { oobCode: string; onDone: () => void };

export function ResetPasswordScreen({ oobCode, onDone }: Props) {
  const c = useColors();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (password.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Mismatch", "Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(getAuth(), oobCode, password);
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("expired") || msg.includes("invalid")) {
        Alert.alert("Link expired", "This reset link has expired. Please request a new one.");
        onDone();
      } else {
        Alert.alert("Error", msg);
      }
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
          <Text style={{ fontSize: 26, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5, marginBottom: 8 }}>
            Set new password
          </Text>
          <Text style={{ fontSize: 15, color: c.textMuted, marginBottom: 32, lineHeight: 22 }}>
            Choose a new password for your account.
          </Text>

          {done ? (
            <View style={{
              backgroundColor: c.surface, borderRadius: 20, padding: 24,
              borderWidth: 1, borderColor: c.border, alignItems: "center", gap: 12,
            }}>
              <Text style={{ fontSize: 40 }}>✅</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: c.textPrimary, textAlign: "center" }}>
                Password updated!
              </Text>
              <Text style={{ fontSize: 14, color: c.textMuted, textAlign: "center" }}>
                You can now sign in with your new password.
              </Text>
              <Pressable
                style={{ marginTop: 8, backgroundColor: c.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 }}
                onPress={onDone}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Sign in</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{
              backgroundColor: c.surface, borderRadius: 24, padding: 24,
              borderWidth: 1, borderColor: c.border,
            }}>
              <TextInput
                style={inputStyle}
                placeholder="New password"
                placeholderTextColor={c.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={inputStyle}
                placeholder="Confirm password"
                placeholderTextColor={c.textMuted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleReset}
              />
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? c.primaryDark : c.primary,
                  paddingVertical: 15, borderRadius: 14, alignItems: "center",
                })}
                onPress={handleReset}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Update password</Text>}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
