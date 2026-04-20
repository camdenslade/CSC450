// apps/mobile/src/App.tsx
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./auth/LoginScreen";
import { HomeScreen } from "./home/HomeScreen";
import { FriendsListScreen } from "./screens/friends/FriendsListScreen";
import { TabsListScreen } from "./screens/tabs/TabsListScreen";
import { ProfileScreen } from "./screens/profile/ProfileScreen";
import { TabDetailScreen } from "./screens/tabs/TabDetailScreen";
import { CreateTabFlow } from "./screens/create-tab/CreateTabFlow";
import { AddFriendScreen } from "./screens/friends/AddFriendScreen";
import { LedgerScreen } from "./screens/ledger/LedgerScreen";
import { GroupsListScreen } from "./screens/groups/GroupsListScreen";
import { GroupDetailScreen } from "./screens/groups/GroupDetailScreen";
import { CreateGroupFlow } from "./screens/groups/CreateGroupFlow";
import { TabKey } from "./shared/NavBar";
import { colors } from "./theme/colors";
import { useState } from "react";

type Screen =
  | { type: "main"; tab: TabKey }
  | { type: "tabDetail"; tabId: string }
  | { type: "createTab" }
  | { type: "addFriend" }
  | { type: "ledger" }
  | { type: "groupList" }
  | { type: "groupDetail"; groupId: string }
  | { type: "createGroup" };

function AppNavigator() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ type: "main", tab: "Home" });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen />
      </>
    );
  }

  const handleTabPress = (tab: TabKey) => setScreen({ type: "main", tab });
  const handleCreateTab = () => setScreen({ type: "createTab" });
  const handleViewTabDetail = (tabId: string) => setScreen({ type: "tabDetail", tabId });
  const handleAddFriend = () => setScreen({ type: "addFriend" });
  const handleViewLedger = () => setScreen({ type: "ledger" });
  const handleViewGroups = () => setScreen({ type: "groupList" });
  const handleViewGroupDetail = (groupId: string) => setScreen({ type: "groupDetail", groupId });
  const handleCreateGroup = () => setScreen({ type: "createGroup" });
  const handleBackToMain = (tab: TabKey = "Home") => setScreen({ type: "main", tab });

  if (screen.type === "main") {
    return (
      <>
        <StatusBar style="light" />
        {screen.tab === "Home" && (
          <HomeScreen
            onTabPress={handleTabPress}
            onCreateTab={handleCreateTab}
            onViewTabs={() => handleTabPress("Tabs")}
            onViewTabDetail={handleViewTabDetail}
            onViewLedger={handleViewLedger}
            onViewGroups={handleViewGroups}
          />
        )}
        {screen.tab === "Friends" && (
          <FriendsListScreen
            onTabPress={handleTabPress}
            onAddFriend={handleAddFriend}
          />
        )}
        {screen.tab === "Tabs" && (
          <TabsListScreen
            onTabPress={handleTabPress}
            onViewTabDetail={handleViewTabDetail}
          />
        )}
        {screen.tab === "Profile" && (
          <ProfileScreen onTabPress={handleTabPress} />
        )}
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {screen.type === "tabDetail" && (
        <TabDetailScreen
          tabId={screen.tabId}
          onBack={() => handleBackToMain("Tabs")}
        />
      )}
      {screen.type === "createTab" && (
        <CreateTabFlow
          onBack={() => handleBackToMain("Home")}
          onComplete={() => handleBackToMain("Tabs")}
        />
      )}
      {screen.type === "addFriend" && (
        <AddFriendScreen onBack={() => handleBackToMain("Friends")} />
      )}
      {screen.type === "ledger" && (
        <LedgerScreen onBack={() => handleBackToMain("Home")} />
      )}
      {screen.type === "groupList" && (
        <GroupsListScreen
          onBack={() => handleBackToMain("Home")}
          onViewGroup={handleViewGroupDetail}
          onCreateGroup={handleCreateGroup}
        />
      )}
      {screen.type === "groupDetail" && (
        <GroupDetailScreen
          groupId={screen.groupId}
          onBack={() => handleBackToMain("Home")}
        />
      )}
      {screen.type === "createGroup" && (
        <CreateGroupFlow
          onBack={() => handleBackToMain("Home")}
          onComplete={(groupId) => setScreen({ type: "groupDetail", groupId })}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
