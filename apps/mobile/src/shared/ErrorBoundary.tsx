import { Component, ReactNode, ErrorInfo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable style={styles.btn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    alignItems: "center", justifyContent: "center", padding: 32, gap: 12,
  },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, textAlign: "center" },
  message: { fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  btn: {
    marginTop: 16, backgroundColor: colors.primary,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14,
  },
  btnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
