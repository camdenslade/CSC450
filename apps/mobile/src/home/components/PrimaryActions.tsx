// app/mobile/src/home/components/PrimaryActions.tsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors } from "../../theme/colors";

export function PrimaryActions() {
    return (
        <View style={styles.container}>
            {/* These serve as our main two buttons on the home screen */}
            <Pressable style={[styles.button, styles.primary]}>
                <Text style={styles.primaryText}>Start New Tab</Text>
            </Pressable>

            <Pressable style={[styles.button, styles.secondary]}>
                <Text style={styles.secondaryText}>View Existing Tabs</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  primaryText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontWeight: "500",
    fontSize: 15,
  },
});