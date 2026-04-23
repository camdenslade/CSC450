// apps/mobile/src/auth/LoginScreen.tsx
import { useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "@react-native-firebase/auth";
import { useColors } from "../theme/colors";
import { AppIcon } from "../shared/AppIcon";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";

export function LoginScreen() {
  const c = useColors();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [forgotPassword, setForgotPassword] = useState(false);

  if (forgotPassword) {
    return <ForgotPasswordScreen onBack={() => setForgotPassword(false)} />;
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please make sure both passwords are the same.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Error", friendlyFirebaseError(msg));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 40, gap: 8 }}>
            <AppIcon size={100} />
            <Text style={{ fontSize: 28, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5 }}>TabUp</Text>
            <Text style={{ fontSize: 15, color: c.textMuted, fontWeight: "500" }}>Split restaurant and bar tabs.</Text>
          </View>

          {/* Card */}
          <View style={{
            backgroundColor: c.surface, borderRadius: 24, padding: 24,
            shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 },
            shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: c.border,
          }}>
            {/* Mode toggle */}
            <View style={{
              flexDirection: "row", backgroundColor: c.surfaceSecondary,
              borderRadius: 14, padding: 4, marginBottom: 24,
            }}>
              {(["signin", "signup"] as const).map((m) => (
                <Pressable
                  key={m}
                  style={{
                    flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10,
                    ...(mode === m ? {
                      backgroundColor: c.surface,
                      shadowColor: "#000", shadowOpacity: 0.06,
                      shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
                    } : {}),
                  }}
                  onPress={() => switchMode(m)}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: mode === m ? c.textPrimary : c.textMuted }}>
                    {m === "signin" ? "Sign In" : "Create Account"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextInput
              ref={passwordRef}
              style={inputStyle}
              placeholder="Password"
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              returnKeyType={mode === "signup" ? "next" : "done"}
              onSubmitEditing={() => mode === "signup" ? confirmRef.current?.focus() : handleSubmit()}
            />

            {mode === "signin" && (
              <Pressable
                style={{ alignSelf: "flex-end", marginBottom: 8, marginTop: -4 }}
                onPress={() => setForgotPassword(true)}
              >
                <Text style={{ fontSize: 13, color: c.primary, fontWeight: "600" }}>Forgot password?</Text>
              </Pressable>
            )}

            {mode === "signup" && (
              <TextInput
                ref={confirmRef}
                style={inputStyle}
                placeholder="Confirm password"
                placeholderTextColor={c.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            )}

            <Pressable
              style={({ pressed }) => ({
                backgroundColor: pressed ? c.primaryDark : c.primary,
                paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8,
                shadowColor: c.primary, shadowOpacity: pressed ? 0 : 0.3,
                shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
              })}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                    {mode === "signin" ? "Sign In" : "Create Account"}
                  </Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function friendlyFirebaseError(msg: string): string {
  if (msg.includes("email-already-in-use")) return "An account with that email already exists.";
  if (msg.includes("wrong-password") || msg.includes("invalid-credential")) return "Incorrect email or password.";
  if (msg.includes("user-not-found")) return "No account found with that email.";
  if (msg.includes("weak-password")) return "Password must be at least 6 characters.";
  if (msg.includes("invalid-email")) return "Please enter a valid email address.";
  return msg;
}
