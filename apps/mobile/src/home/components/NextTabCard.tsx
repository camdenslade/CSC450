import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "../../theme/colors";

export type NextTab = {
  name: string;
  location: string;
  time: string;
  estimate: string;
  guests: string[];
  status: string;
};

export function NextTabCard({ tab, onPress }: { tab: NextTab; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.surfaceSecondary : c.surface, borderColor: c.border }]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: c.textPrimary }]}>{tab.name}</Text>
          {tab.location ? <Text style={[styles.meta, { color: c.textMuted }]}>{tab.location} · {tab.time}</Text> : null}
        </View>
        <Text style={[styles.amount, { color: c.textPrimary }]}>{tab.estimate}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.avatars}>
          {tab.guests.map((g, i) => (
            <View key={i} style={[styles.avatar, { marginLeft: i > 0 ? -8 : 0, backgroundColor: c.primaryLight, borderColor: c.surface }]}>
              <Text style={[styles.avatarText, { color: c.primaryDark }]}>{g}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.statusPill, { backgroundColor: c.warning + "20" }]}>
          <Text style={[styles.statusText, { color: c.warning }]}>{tab.status}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  info: { flex: 1, marginRight: 12 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, marginTop: 3 },
  amount: { fontSize: 18, fontWeight: "800" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatars: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarText: { fontSize: 10, fontWeight: "700" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
});
