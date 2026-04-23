import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../theme/colors";

type BalanceCardProps = {
  balanceCents?: number;
};

export function BalanceCard({ balanceCents = 0 }: BalanceCardProps) {
  const c = useColors();
  const isZero = balanceCents === 0;
  const isPositive = balanceCents > 0;

  return (
    <View style={[
      styles.card,
      { backgroundColor: c.surface, borderColor: c.border },
      isZero && { backgroundColor: c.primaryLight, borderColor: c.primary },
    ]}>
      <Text style={[styles.label, { color: c.textMuted }]}>
        {isZero ? "All settled up" : isPositive ? "You are owed" : "You owe"}
      </Text>
      {!isZero && (
        <Text style={[styles.amount, { color: isPositive ? c.amountPositive : c.amountNegative }]}>
          ${(Math.abs(balanceCents) / 100).toFixed(2)}
        </Text>
      )}
      {isZero && (
        <Ionicons name="checkmark-circle" size={32} color={c.primary} style={styles.settledIcon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amount: {
    marginTop: 8,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  settledIcon: { marginTop: 6 },
});
