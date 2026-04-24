import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Background } from "./Background";
import { NavBar, TabKey } from "./NavBar";
import { useData } from "../store/DataContext";

type LayoutProps = {
  children: ReactNode;
  activeTab?: TabKey;
  onTabPress?: (tab: TabKey) => void;
  onCreateTab?: () => void;
  showNav?: boolean;
};

export function Layout({ children, activeTab = "Home", onTabPress, onCreateTab, showNav = true }: LayoutProps) {
  const { bills } = useData();
  const openCount = bills.filter((b) => b.status === "open").length;

  return (
    <SafeAreaProvider>
      <Background>
        <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.main}>{children}</View>
          {showNav && (
            <View style={styles.navWrapper}>
              <NavBar
                active={activeTab}
                onTabPress={onTabPress}
                onCreateTab={onCreateTab}
                tabsBadge={openCount > 0 ? openCount : undefined}
              />
            </View>
          )}
        </SafeAreaView>
      </Background>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  main: {
    flex: 1,
  },
  navWrapper: {
    paddingBottom: 4,
  },
});
