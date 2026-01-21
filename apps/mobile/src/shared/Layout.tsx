// apps/mobile/src/shared/Layout.tsx
import { StyleSheet, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Background } from "./Background";
import { NavBar, TabKey } from "./NavBar";

type LayoutProps = {
    children: React.ReactNode;
    activeTab?: TabKey;
    onTabPress?: (tab: TabKey) => void;
    showNav?: boolean;
};

export function Layout({
    children,
    activeTab = "Home",
    onTabPress,
    showNav = true,
}: LayoutProps) {
    return (
        <SafeAreaProvider>
            <Background>
                <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
                    <View style={styles.main}>{children}</View>
                    {showNav ? (
                        // Shared bottom navigation; sits on top of the background
                        <View style={styles.navWrapper}>
                            <NavBar active={activeTab} onTabPress={onTabPress} />
                        </View>
                    ) : null}
                </SafeAreaView>
            </Background>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 0,
    },
    main: {
        flex: 1,
    },
    navWrapper: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
    },
});
