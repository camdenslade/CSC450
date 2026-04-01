// apps/mobile/src/App.tsx
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./home/HomeScreen";
import { FriendsListScreen } from "./screens/friends/FriendsListScreen";
import { TabsListScreen } from "./screens/tabs/TabsListScreen";
import { ProfileScreen } from "./screens/profile/ProfileScreen";
import { TabDetailScreen } from "./screens/tabs/TabDetailScreen";
import { CreateTabFlow } from "./screens/create-tab/CreateTabFlow";
import { AddFriendScreen } from "./screens/friends/AddFriendScreen";
import { TabKey } from "./shared/NavBar";

type Screen =
  | { type: "main"; tab: TabKey }
  | { type: "tabDetail" }
  | { type: "createTab" }
  | { type: "addFriend" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: "main", tab: "Home" });

  const handleTabPress = (tab: TabKey) => {
    setScreen({ type: "main", tab });
  };

  const handleCreateTab = () => {
    setScreen({ type: "createTab" });
  };

  const handleViewTabDetail = () => {
    setScreen({ type: "tabDetail" });
  };

  const handleAddFriend = () => {
    setScreen({ type: "addFriend" });
  };

  const handleBackToMain = (tab: TabKey = "Home") => {
    setScreen({ type: "main", tab });
  };

  // Main screens with bottom navigation
  if (screen.type === "main") {
    return (
      <>
        <StatusBar style="light" />
        {screen.tab === "Home" && (
          <HomeScreen
            onTabPress={handleTabPress}
            onCreateTab={handleCreateTab}
            onViewTabs={() => handleTabPress("Tabs")}
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

  // Full-screen overlays (no bottom nav)
  return (
    <>
      <StatusBar style="light" />
      {screen.type === "tabDetail" && (
        <TabDetailScreen onBack={() => handleBackToMain("Tabs")} />
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
    </>
  );
}
