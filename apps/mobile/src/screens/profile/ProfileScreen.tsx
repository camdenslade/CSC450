import { useEffect } from "react";
import {
  Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../shared/Layout";
import { useColors } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import { TabKey } from "../../shared/NavBar";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../store/DataContext";
import { ApiUser, ApiPaymentHandle } from "../../api/client";
import { PlatformIcon } from "../../shared/PlatformIcon";

type Platform = "paypal" | "venmo" | "cashapp";

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "venmo",   label: "Venmo" },
  { key: "paypal",  label: "PayPal" },
  { key: "cashapp", label: "Cash App" },
];

type ProfileScreenProps = {
  onTabPress?: (tab: TabKey) => void;
  onEditProfile?: (profile: ApiUser, handles: ApiPaymentHandle[]) => void;
};

export function ProfileScreen({ onTabPress, onEditProfile }: ProfileScreenProps) {
  const { signOut, deleteAccount } = useAuth();
  const { profile, handles, refreshProfile } = useData();
  const { mode, setMode } = useTheme();
  const c = useColors();
  const s = makeStyles(c);

  useEffect(() => { refreshProfile(); }, []);

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert("Are you sure?", "Your account will be gone forever.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Yes, Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteAccount();
                  } catch (e: unknown) {
                    Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete account.");
                  }
                },
              },
            ]),
        },
      ],
    );
  }

  const initials = (profile?.displayName ?? "?").split(" ")
    .map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Layout activeTab="Profile" onTabPress={onTabPress}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Profile</Text>

        {/* Hero card */}
        <View style={s.heroCard}>
          {profile?.avatarUrl
            ? <Image source={{ uri: profile.avatarUrl }} style={s.avatarImg} />
            : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}

          <Text style={s.name}>{profile?.displayName ?? ""}</Text>
          <Text style={s.nameSub}>TabUp member</Text>
          {profile?.defaultPlatform && (
            <View style={s.defaultPlatformBadge}>
              <PlatformIcon platform={profile.defaultPlatform as Platform} size={14} />
              <Text style={s.defaultPlatformText}>
                {PLATFORMS.find((p) => p.key === profile.defaultPlatform)?.label ?? profile.defaultPlatform}
              </Text>
            </View>
          )}
        </View>

        <Pressable style={s.editBtn} onPress={() => profile && onEditProfile?.(profile, handles)}>
          <Text style={s.editBtnText}>Edit Profile</Text>
        </Pressable>

        {/* Payment handles */}
        <Text style={s.sectionTitle}>Payment Handles</Text>
        <Text style={s.sectionHint}>Friends use these to pay you back.</Text>
        <View style={s.card}>
          {PLATFORMS.map((pl, i) => {
            const existing = handles.find((h) => h.platform === pl.key);
            return (
              <View key={pl.key} style={[s.handleRow, i > 0 && s.handleRowBorder]}>
                <PlatformIcon platform={pl.key} size={28} />
                <View style={s.handleInfo}>
                  <Text style={s.handlePlatform}>{pl.label}</Text>
                  <Text style={existing ? s.handleValue : s.handleEmpty}>
                    {existing ? existing.handle : "Not set"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Appearance */}
        <Text style={s.sectionTitle}>Appearance</Text>
        <View style={s.card}>
          {(["light", "dark", "system"] as const).map((m, i) => {
            const icon = m === "light" ? "sunny-outline" : m === "dark" ? "moon-outline" : "phone-portrait-outline";
            const label = m === "light" ? "Light" : m === "dark" ? "Dark" : "System";
            return (
              <Pressable
                key={m}
                style={[s.themeRow, i > 0 && s.handleRowBorder]}
                onPress={() => setMode(m)}
              >
                <Ionicons name={icon} size={20} color={c.textSecondary} style={{ marginRight: 14 }} />
                <Text style={s.themeLabel}>{label}</Text>
                {mode === m && <Ionicons name="checkmark" size={18} color={c.primary} />}
              </Pressable>
            );
          })}
        </View>

        {/* Support */}
        <Text style={s.sectionTitle}>Support</Text>
        <View style={s.card}>
          {[
            { label: "Contact Support", icon: "mail-outline" as const, onPress: () => Linking.openURL("mailto:csladedev@outlook.com") },
            { label: "Privacy Policy",  icon: "shield-checkmark-outline" as const, onPress: () => Linking.openURL("https://tabup.cslade.space/privacy") },
            { label: "Terms of Service", icon: "document-text-outline" as const, onPress: () => Linking.openURL("https://tabup.cslade.space/terms") },
          ].map((item, i) => (
            <Pressable key={item.label} style={[s.themeRow, i > 0 && s.handleRowBorder]} onPress={item.onPress}>
              <Ionicons name={item.icon} size={20} color={c.textSecondary} style={{ marginRight: 14 }} />
              <Text style={s.themeLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </Pressable>

        <Pressable style={s.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={s.deleteText}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </Layout>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 100 },
    pageTitle: {
      fontSize: 28, fontWeight: "800", color: c.textPrimary,
      letterSpacing: -0.5, marginBottom: 20,
    },
    heroCard: {
      backgroundColor: c.surface, borderRadius: 20, padding: 24,
      alignItems: "center", marginBottom: 12,
      borderWidth: 1, borderColor: c.border,
      shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
    },
    avatarImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
    avatar: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: c.primary,
      alignItems: "center", justifyContent: "center", marginBottom: 12,
    },
    avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
    name: { fontSize: 22, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.3 },
    nameSub: { fontSize: 13, color: c.textMuted, marginTop: 4 },
    defaultPlatformBadge: {
      flexDirection: "row", alignItems: "center", gap: 5,
      marginTop: 10, backgroundColor: c.primaryLight,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    defaultPlatformText: { fontSize: 12, fontWeight: "700", color: c.primaryDark },
    editBtn: {
      backgroundColor: c.surface, paddingVertical: 14, borderRadius: 14,
      alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: c.border,
    },
    editBtnText: { fontSize: 15, fontWeight: "600", color: c.primary },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: c.textPrimary, marginBottom: 4 },
    sectionHint: { fontSize: 13, color: c.textMuted, marginBottom: 12, lineHeight: 18 },
    card: {
      backgroundColor: c.surface, borderRadius: 16, padding: 0,
      marginBottom: 24, borderWidth: 1, borderColor: c.border,
      overflow: "hidden",
      shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
    },
    handleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
    handleRowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
    handleInfo: { flex: 1, marginLeft: 14 },
    handlePlatform: { fontSize: 12, fontWeight: "600", color: c.textMuted },
    handleValue: { fontSize: 15, fontWeight: "600", color: c.textPrimary, marginTop: 2 },
    handleEmpty: { fontSize: 14, color: c.textMuted, fontStyle: "italic", marginTop: 2 },
    themeRow: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 14, paddingHorizontal: 16,
    },
    themeLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: c.textPrimary },
    logoutBtn: {
      marginTop: 8, paddingVertical: 14, borderRadius: 14,
      alignItems: "center", borderWidth: 1.5, borderColor: c.danger,
    },
    logoutText: { fontSize: 15, fontWeight: "600", color: c.danger },
    deleteBtn: {
      marginTop: 12, paddingVertical: 14, borderRadius: 14,
      alignItems: "center",
    },
    deleteText: { fontSize: 14, fontWeight: "500", color: c.textMuted },
  });
}
