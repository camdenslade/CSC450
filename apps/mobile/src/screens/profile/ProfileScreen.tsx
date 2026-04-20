// apps/mobile/src/screens/profile/ProfileScreen.tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Layout } from "../../shared/Layout";
import { colors } from "../../theme/colors";
import { TabKey } from "../../shared/NavBar";
import { useAuth } from "../../auth/AuthContext";
import { ApiUser, ApiPaymentHandle } from "../../api/client";

type Platform = "paypal" | "venmo" | "cashapp";

const PLATFORMS: { key: Platform; label: string; placeholder: string }[] = [
  { key: "venmo", label: "Venmo", placeholder: "@handle" },
  { key: "paypal", label: "PayPal", placeholder: "paypal.me/handle" },
  { key: "cashapp", label: "Cash App", placeholder: "$cashtag" },
];

type ProfileScreenProps = {
  onTabPress?: (tab: TabKey) => void;
};

export function ProfileScreen({ onTabPress }: ProfileScreenProps) {
  const { apiClient, signOut } = useAuth();

  // Profile
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [defaultPlatform, setDefaultPlatform] = useState<Platform | null>(null);
  const [saving, setSaving] = useState(false);

  // Payment handles
  const [handles, setHandles] = useState<ApiPaymentHandle[]>([]);
  const [editingHandle, setEditingHandle] = useState<Platform | null>(null);
  const [handleValue, setHandleValue] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);

  // Contact info
  const [editingContact, setEditingContact] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  // ---------------------------------------------------------

  useEffect(() => {
    Promise.all([
      apiClient.get<ApiUser>("/users/me"),
      apiClient.get<ApiPaymentHandle[]>("/payments/handles"),
    ])
      .then(([user, h]) => {
        setProfile(user);
        setDisplayName(user.displayName);
        setDefaultPlatform(user.defaultPlatform);
        setHandles(h);
      })
      .catch((e: Error) => Alert.alert("Error", e.message))
      .finally(() => setLoading(false));
  }, []);

  // ---------------------------------------------------------

  async function handleSaveProfile() {
    if (!displayName.trim()) {
      Alert.alert("Required", "Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const updated = await apiClient.patch<ApiUser>("/users/me", {
        displayName: displayName.trim(),
        ...(defaultPlatform ? { defaultPlatform } : {}),
      });
      setProfile(updated);
      setEditing(false);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function openEditHandle(platform: Platform) {
    const existing = handles.find((h) => h.platform === platform);
    setHandleValue(existing?.handle ?? "");
    setEditingHandle(platform);
  }

  async function handleSaveHandle() {
    if (!editingHandle) return;
    const value = handleValue.trim();
    if (!value) {
      // Delete the handle
      await handleDeleteHandle(editingHandle);
      return;
    }
    setSavingHandle(true);
    try {
      const updated = await apiClient.post<ApiPaymentHandle>("/payments/handles", {
        platform: editingHandle,
        handle: value,
      });
      setHandles((prev) => {
        const filtered = prev.filter((h) => h.platform !== editingHandle);
        return [...filtered, updated];
      });
      setEditingHandle(null);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save handle.");
    } finally {
      setSavingHandle(false);
    }
  }

  async function handleDeleteHandle(platform: Platform) {
    setSavingHandle(true);
    try {
      await apiClient.del(`/payments/handles/${platform}`);
      setHandles((prev) => prev.filter((h) => h.platform !== platform));
      setEditingHandle(null);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to remove handle.");
    } finally {
      setSavingHandle(false);
    }
  }

  async function handleSaveContact() {
    const p = phone.trim();
    const em = email.trim();
    if (!p && !em) {
      Alert.alert("Required", "Enter a phone number or email to register.");
      return;
    }
    setSavingContact(true);
    try {
      await apiClient.patch("/users/me", {
        ...(p ? { phone: p } : {}),
        ...(em ? { email: em } : {}),
      });
      setPhone("");
      setEmail("");
      setEditingContact(false);
      Alert.alert("Saved", "Contact info registered. Friends can now find you by phone or email.");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save contact info.");
    } finally {
      setSavingContact(false);
    }
  }

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  // ---------------------------------------------------------

  if (loading) {
    return (
      <Layout activeTab="Profile" onTabPress={onTabPress}>
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </Layout>
    );
  }

  return (
    <Layout activeTab="Profile" onTabPress={onTabPress}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.displayName ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          {editing ? (
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              placeholder="Display name"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <Text style={styles.name}>{profile?.displayName ?? ""}</Text>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {/* Default payment platform */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Default Payment Platform</Text>
            <View style={styles.platformRow}>
              {PLATFORMS.map((pl) => (
                <Pressable
                  key={pl.key}
                  style={[
                    styles.platformChip,
                    (editing ? defaultPlatform : profile?.defaultPlatform) === pl.key &&
                      styles.platformChipActive,
                  ]}
                  onPress={() => editing && setDefaultPlatform(pl.key)}
                >
                  <Text
                    style={[
                      styles.platformChipText,
                      (editing ? defaultPlatform : profile?.defaultPlatform) === pl.key &&
                        styles.platformChipTextActive,
                    ]}
                  >
                    {pl.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Edit / Save / Cancel */}
        {editing ? (
          <View style={styles.editActions}>
            <Pressable
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.saveButtonText}>Save</Text>}
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setDisplayName(profile?.displayName ?? "");
                setDefaultPlatform(profile?.defaultPlatform ?? null);
                setEditing(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        )}

        {/* Payment Handles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Handles</Text>
          <Text style={styles.sectionHint}>
            Friends use these to send you money through PayPal, Venmo, and Cash App.
          </Text>
          {PLATFORMS.map((pl) => {
            const existing = handles.find((h) => h.platform === pl.key);
            const isEditing = editingHandle === pl.key;
            return (
              <View key={pl.key} style={styles.handleRow}>
                <View style={styles.handleInfo}>
                  <Text style={styles.handlePlatform}>{pl.label}</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.handleInput}
                      value={handleValue}
                      onChangeText={setHandleValue}
                      placeholder={pl.placeholder}
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                  ) : (
                    <Text style={existing ? styles.handleValue : styles.handleEmpty}>
                      {existing ? existing.handle : "Not set"}
                    </Text>
                  )}
                </View>
                {isEditing ? (
                  <View style={styles.handleActions}>
                    <Pressable
                      style={[styles.handleSaveBtn, savingHandle && styles.buttonDisabled]}
                      onPress={handleSaveHandle}
                      disabled={savingHandle}
                    >
                      {savingHandle
                        ? <ActivityIndicator color="#000" size="small" />
                        : <Text style={styles.handleSaveBtnText}>Save</Text>}
                    </Pressable>
                    <Pressable
                      style={styles.handleCancelBtn}
                      onPress={() => setEditingHandle(null)}
                    >
                      <Text style={styles.handleCancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.handleEditBtn}
                    onPress={() => openEditHandle(pl.key)}
                  >
                    <Text style={styles.handleEditBtnText}>
                      {existing ? "Edit" : "Add"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Info</Text>
          <Text style={styles.sectionHint}>
            Register your phone or email so friends can find you. Stored as a private hash -- your raw info is never saved.
          </Text>
          {editingContact ? (
            <View style={styles.contactForm}>
              <TextInput
                style={styles.contactInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone (e.g. +15551234567)"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.contactInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.editActions}>
                <Pressable
                  style={[styles.saveButton, savingContact && styles.buttonDisabled]}
                  onPress={handleSaveContact}
                  disabled={savingContact}
                >
                  {savingContact
                    ? <ActivityIndicator color="#000" />
                    : <Text style={styles.saveButtonText}>Save</Text>}
                </Pressable>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setPhone("");
                    setEmail("");
                    setEditingContact(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.editButton} onPress={() => setEditingContact(true)}>
              <Text style={styles.editButtonText}>Update Contact Info</Text>
            </Pressable>
          )}
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 60 },
  content: { paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, marginBottom: 20 },
  profileCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    alignItems: "center", marginBottom: 20,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: "700", color: "#000" },
  name: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  nameInput: {
    fontSize: 20, fontWeight: "700", color: colors.textPrimary,
    borderBottomWidth: 2, borderBottomColor: colors.primary,
    paddingVertical: 4, minWidth: 200, textAlign: "center",
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  sectionHint: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  settingItem: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
  },
  settingLabel: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: 10 },
  platformRow: { flexDirection: "row", gap: 8 },
  platformChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: colors.textMuted,
  },
  platformChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  platformChipText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  platformChipTextActive: { color: "#000" },
  editActions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  saveButton: {
    flex: 1, backgroundColor: colors.primary, paddingVertical: 13,
    borderRadius: 14, alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 15, fontWeight: "600", color: "#000" },
  cancelButton: {
    flex: 1, backgroundColor: colors.surface, paddingVertical: 13,
    borderRadius: 14, alignItems: "center",
  },
  cancelButtonText: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  editButton: {
    backgroundColor: colors.surface, paddingVertical: 13, borderRadius: 14,
    alignItems: "center", marginBottom: 12,
  },
  editButtonText: { fontSize: 15, fontWeight: "600", color: colors.primary },

  // Handles
  handleRow: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12,
  },
  handleInfo: { flex: 1, gap: 4 },
  handlePlatform: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  handleValue: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  handleEmpty: { fontSize: 15, color: colors.textMuted, fontStyle: "italic" },
  handleInput: {
    fontSize: 15, fontWeight: "600", color: colors.textPrimary,
    borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingVertical: 2,
  },
  handleActions: { flexDirection: "row", gap: 8 },
  handleSaveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  handleSaveBtnText: { fontSize: 13, fontWeight: "600", color: "#000" },
  handleCancelBtn: {
    backgroundColor: "transparent", paddingHorizontal: 10, paddingVertical: 8,
  },
  handleCancelBtnText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  handleEditBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.primary,
  },
  handleEditBtnText: { fontSize: 13, fontWeight: "600", color: colors.primary },

  // Contact form
  contactForm: { gap: 10 },
  contactInput: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    fontSize: 15, color: colors.textPrimary,
  },

  // Logout
  logoutButton: {
    borderWidth: 1.5, borderColor: colors.error, paddingVertical: 13,
    borderRadius: 14, alignItems: "center",
  },
  logoutButtonText: { fontSize: 15, fontWeight: "600", color: colors.error },
});
