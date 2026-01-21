// apps/mobile/src/home/components/BalanceCard.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export function BalanceCard() {
    const netBalance = 0; // mock value
    const label = netBalance === 0 ? "All settled" : netBalance > 0 ? "You are owed" : "You owe";

    return (
        <View style={styles.card}>
            <Text style={styles.label}>{label}</Text>
            {netBalance !== 0 && (
                <Text style={styles.amount}>
                    ${Math.abs(netBalance).toFixed(2)}
                </Text>
            )}
        </View>
    );    
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  amount: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});