import { useEffect, useState } from "react";
import {
  ActionSheetIOS, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useColors } from "../../theme/colors";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../store/DataContext";
import { ApiUser, ApiPaymentHandle } from "../../api/client";
import { PlatformIcon } from "../../shared/PlatformIcon";

type Platform_ = "paypal" | "venmo" | "cashapp";

const PLATFORMS: { key: Platform_; label: string; prefix: string; placeholder: string }[] = [
  { key: "venmo",   label: "Venmo",    prefix: "@",           placeholder: "username" },
  { key: "cashapp", label: "Cash App", prefix: "$",           placeholder: "cashtag" },
  { key: "paypal",  label: "PayPal",   prefix: "paypal.me/",  placeholder: "username" },
];

const COUNTRIES: { flag: string; name: string; code: string }[] = [
  { flag: "🇺🇸", name: "United States", code: "+1" },
  { flag: "🇬🇧", name: "United Kingdom", code: "+44" },
  { flag: "🇨🇦", name: "Canada", code: "+1" },
  { flag: "🇦🇺", name: "Australia", code: "+61" },
  { flag: "🇩🇪", name: "Germany", code: "+49" },
  { flag: "🇫🇷", name: "France", code: "+33" },
  { flag: "🇯🇵", name: "Japan", code: "+81" },
  { flag: "🇧🇷", name: "Brazil", code: "+55" },
  { flag: "🇮🇳", name: "India", code: "+91" },
  { flag: "🇲🇽", name: "Mexico", code: "+52" },
];

function formatPhone(raw: string, countryCode: string): string {
  const digits = raw.replace(/\D/g, "");
  if (countryCode === "+1") {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return digits;
}

function toE164(formatted: string, countryCode: string): string {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return "";
  return `${countryCode}${digits}`;
}

const PHONE_DISPLAY_KEY = "tabup_phone_display";
const PHONE_COUNTRY_KEY = "tabup_phone_country";

function stripPrefix(platform: Platform_, full: string): string {
  const cfg = PLATFORMS.find((p) => p.key === platform)!;
  return full.startsWith(cfg.prefix) ? full.slice(cfg.prefix.length) : full;
}


type Props = {
  profile: ApiUser;
  handles: ApiPaymentHandle[];
  onBack: () => void;
  onSaved: (profile: ApiUser, handles: ApiPaymentHandle[]) => void;
};

export function EditProfileScreen({ profile, handles: initialHandles, onBack, onSaved }: Props) {
  const { apiClient, user: firebaseUser, setAvatarUrl: setGlobalAvatarUrl } = useAuth();
  const { refreshProfile } = useData();
  const c = useColors();
  const styles = makeStyles(c);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [defaultPlatform, setDefaultPlatform] = useState<Platform_ | null>(profile.defaultPlatform ?? null);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    SecureStore.getItemAsync(PHONE_DISPLAY_KEY).then((v) => { if (v) setPhone(v); });
    SecureStore.getItemAsync(PHONE_COUNTRY_KEY).then((v) => {
      if (v) { const c = COUNTRIES.find((c) => c.code + c.name === v); if (c) setCountry(c); }
    });
  }, []);
  const [email, setEmail] = useState(profile.email ?? firebaseUser?.email ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(profile.avatarUrl ?? null);
  const [pendingAvatarKey, setPendingAvatarKey] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Store only the bare handle (no prefix) in state
  const [handleValues, setHandleValues] = useState<Record<Platform_, string>>(
    Object.fromEntries(
      PLATFORMS.map((p) => {
        const existing = initialHandles.find((h) => h.platform === p.key)?.handle ?? "";
        return [p.key, stripPrefix(p.key, existing)];
      })
    ) as Record<Platform_, string>
  );

  const [saving, setSaving] = useState(false);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mime = (asset.mimeType as "image/jpeg" | "image/png" | "image/webp") ?? "image/jpeg";
    const size = asset.fileSize ?? 500_000;

    setUploadingAvatar(true);
    try {
      const { uploadUrl, key } = await apiClient.post<{ uploadUrl: string; key: string; fileUrl: string | null }>(
        "/uploads/presign",
        { purpose: "avatar", mime, size }
      );
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: { uri: asset.uri, type: mime, name: "avatar" } as any,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
      setAvatarUri(asset.uri);
      setPendingAvatarKey(key);
      setGlobalAvatarUrl(asset.uri);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to upload photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function pickCountry() {
    const options = COUNTRIES.map((c) => `${c.flag} ${c.name} (${c.code})`);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, "Cancel"], cancelButtonIndex: options.length },
        (i) => { if (i < options.length) setCountry(COUNTRIES[i]); }
      );
    } else {
      Alert.alert("Select Country", undefined,
        COUNTRIES.map((c, i) => ({ text: `${c.flag} ${c.name} (${c.code})`, onPress: () => setCountry(COUNTRIES[i]) }))
      );
    }
  }

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert("Required", "Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const patchBody: Record<string, unknown> = { displayName: displayName.trim() };
      if (defaultPlatform) patchBody.defaultPlatform = defaultPlatform;
      const e164 = toE164(phone, country.code);
      if (e164) patchBody.phone = e164;
      if (email.trim()) patchBody.email = email.trim();
      if (pendingAvatarKey) patchBody.avatarKey = pendingAvatarKey;

      const updatedProfile = await apiClient.patch<ApiUser>("/users/me", patchBody);

      const updatedHandles = await Promise.all(
        PLATFORMS.map(async (pl) => {
          const bare = handleValues[pl.key].trim();
          const existing = initialHandles.find((h) => h.platform === pl.key);
          const existingBare = existing ? stripPrefix(pl.key, existing.handle) : "";
          if (bare && bare !== existingBare) {
            return apiClient.post<ApiPaymentHandle>("/payments/handles", { platform: pl.key, handle: bare });
          } else if (!bare && existing) {
            await apiClient.del(`/payments/handles/${pl.key}`);
            return null;
          }
          return existing ?? null;
        })
      ).then((results) => results.filter((h): h is ApiPaymentHandle => h !== null));

      if (phone.trim()) {
        await SecureStore.setItemAsync(PHONE_DISPLAY_KEY, phone.trim());
        await SecureStore.setItemAsync(PHONE_COUNTRY_KEY, country.code + country.name);
      } else {
        await SecureStore.deleteItemAsync(PHONE_DISPLAY_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(PHONE_COUNTRY_KEY).catch(() => {});
      }
      await refreshProfile();
      onSaved(updatedProfile, updatedHandles);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving
              ? <ActivityIndicator color={c.primary} size="small" />
              : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={pickAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {(profile.displayName ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </Text>
                  </View>
                )}
              <View style={styles.avatarBadge}>
                {uploadingAvatar
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.avatarBadgeText}>Edit</Text>}
              </View>
            </Pressable>
          </View>

          {/* Display name */}
          <Text style={styles.sectionLabel}>Name</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={c.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {/* Default platform */}
          <Text style={styles.sectionLabel}>Default Payment Platform</Text>
          <View style={styles.card}>
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
                    <Text style={[styles.platformLabel, active && styles.platformLabelActive]}>
                      {pl.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Payment handles */}
          <Text style={styles.sectionLabel}>Payment Handles</Text>
          <View style={styles.card}>
            {PLATFORMS.map((pl, i) => (
              <View key={pl.key} style={[styles.handleRow, i > 0 && styles.handleRowBorder]}>
                <PlatformIcon platform={pl.key} size={28} />
                <View style={styles.handleInputWrap}>
                  <Text style={styles.handleLabel}>{pl.label}</Text>
                  <View style={styles.prefixRow}>
                    <Text style={styles.prefix}>{pl.prefix}</Text>
                    <TextInput
                      style={styles.handleInput}
                      value={handleValues[pl.key]}
                      onChangeText={(v) => {
                        // Strip prefix if user pastes the full string
                        const bare = v.startsWith(pl.prefix) ? v.slice(pl.prefix.length) : v;
                        setHandleValues((prev) => ({ ...prev, [pl.key]: bare }));
                      }}
                      placeholder={pl.placeholder}
                      placeholderTextColor={c.textMuted}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Contact info */}
          <Text style={styles.sectionLabel}>Contact Info</Text>
          <Text style={styles.sectionHint}>Let friends find you by phone or email.</Text>
          <View style={styles.card}>
            <View style={styles.phoneRow}>
              <Pressable style={styles.countryBtn} onPress={pickCountry}>
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text style={styles.countryCode}>{country.code}</Text>
                <Text style={styles.countryChevron}>›</Text>
              </Pressable>
              <View style={styles.phoneDivider} />
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={phone}
                onChangeText={(v) => setPhone(formatPhone(v, country.code))}
                placeholder={country.code === "+1" ? "(555) 123-4567" : "Phone number"}
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={c.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: c.textPrimary },
    backBtn: { minWidth: 60 },
    backText: { fontSize: 16, color: c.textMuted, fontWeight: "500" },
    saveBtn: { minWidth: 60, alignItems: "flex-end" },
    saveText: { fontSize: 16, color: c.primary, fontWeight: "700" },
    content: { padding: 16, paddingBottom: 60, alignItems: "stretch" },
    avatarSection: { alignItems: "center", paddingVertical: 20 },
    avatarWrap: { position: "relative" },
    avatarImg: { width: 90, height: 90, borderRadius: 45 },
    avatarPlaceholder: {
      width: 90, height: 90, borderRadius: 45,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
    },
    avatarInitials: { fontSize: 32, fontWeight: "800", color: "#fff" },
    avatarBadge: {
      position: "absolute", bottom: 0, right: 0,
      backgroundColor: c.primaryDark, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 2, borderColor: c.background,
    },
    avatarBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
    sectionLabel: {
      fontSize: 13, fontWeight: "700", color: c.textMuted,
      textTransform: "uppercase", letterSpacing: 0.5,
      marginBottom: 8, marginTop: 20,
    },
    sectionHint: { fontSize: 13, color: c.textMuted, marginBottom: 8, marginTop: -4 },
    card: {
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      overflow: "hidden",
    },
    input: {
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: c.textPrimary,
    },
    inputDivider: { height: 1, backgroundColor: c.divider, marginHorizontal: 16 },
    phoneRow: { flexDirection: "row", alignItems: "center" },
    countryBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
    countryFlag: { fontSize: 18 },
    countryCode: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
    countryChevron: { fontSize: 16, color: c.textMuted, marginLeft: 2 },
    phoneDivider: { width: 1, height: 24, backgroundColor: c.divider },
    phoneInput: { flex: 1, paddingLeft: 12 },
    platformRow: { flexDirection: "row", gap: 8, padding: 12 },
    platformChip: {
      flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary,
      gap: 6,
    },
    platformChipActive: { backgroundColor: c.primaryLight, borderColor: c.primary },
    platformLabel: { fontSize: 11, fontWeight: "700", color: c.textMuted },
    platformLabelActive: { color: c.primaryDark },
    handleRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14,
    },
    handleRowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
    handleInputWrap: { flex: 1, marginLeft: 14 },
    handleLabel: {
      fontSize: 11, fontWeight: "700", color: c.textMuted,
      textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4,
    },
    prefixRow: { flexDirection: "row", alignItems: "center" },
    prefix: {
      fontSize: 15, fontWeight: "600", color: c.textSecondary,
      marginRight: 1,
    },
    handleInput: {
      flex: 1, fontSize: 15, color: c.textPrimary, paddingVertical: 0,
    },
  });
}
