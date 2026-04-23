// apps/mobile/src/App.tsx
import { useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { DataProvider, useData } from "./store/DataContext";
import { LoginScreen } from "./auth/LoginScreen";
import { OnboardingFlow } from "./auth/OnboardingFlow";
import { HomeScreen } from "./home/HomeScreen";
import { FriendsListScreen } from "./screens/friends/FriendsListScreen";
import { TabsListScreen } from "./screens/tabs/TabsListScreen";
import { ProfileScreen } from "./screens/profile/ProfileScreen";
import { EditProfileScreen } from "./screens/profile/EditProfileScreen";
import { TabDetailScreen } from "./screens/tabs/TabDetailScreen";
import { CreateTabFlow } from "./screens/create-tab/CreateTabFlow";
import { AddFriendScreen } from "./screens/friends/AddFriendScreen";
import { LedgerScreen } from "./screens/ledger/LedgerScreen";
import { GroupsListScreen } from "./screens/groups/GroupsListScreen";
import { GroupDetailScreen } from "./screens/groups/GroupDetailScreen";
import { CreateGroupFlow } from "./screens/groups/CreateGroupFlow";
import { TabKey } from "./shared/NavBar";
import { Loader } from "./shared/Loader";
import { SlideUpModal } from "./shared/SlideUpModal";
import { SlideUpScreen } from "./shared/SlideUpScreen";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { useColors } from "./theme/colors";
import { ErrorBoundary } from "./shared/ErrorBoundary";
import { ApiUser, ApiPaymentHandle } from "./api/client";

type OverlayScreen =
  | { type: "none" }
  | { type: "tabDetail"; tabId: string }
  | { type: "createTab" }
  | { type: "addFriend" }
  | { type: "ledger" }
  | { type: "groupList" }
  | { type: "groupDetail"; groupId: string }
  | { type: "createGroup" };

function MainApp() {
  const { user, loading, needsOnboarding } = useAuth();
  const { ready } = useData();
  const c = useColors();
  const { resolvedScheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>("Home");
  const [overlay, setOverlay] = useState<OverlayScreen>({ type: "none" });
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editProfileData, setEditProfileData] = useState<{ profile: ApiUser; handles: ApiPaymentHandle[] } | null>(null);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Loader />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
        <LoginScreen />
      </>
    );
  }

  if (needsOnboarding) {
    return (
      <>
        <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
        <OnboardingFlow />
      </>
    );
  }

  // Show branded loader until initial data fetch completes
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Loader label="Getting your tabs…" />
      </View>
    );
  }

  const closeEditProfile = () => {
    setEditProfileVisible(false);
    // editProfileData cleared after animation in onHidden
  };

  const goBack = (tab: TabKey = "Home") => { setOverlay({ type: "none" }); setActiveTab(tab); };
  const handleTabPress = (tab: TabKey) => { setOverlay({ type: "none" }); setActiveTab(tab); };
  const handleCreateTab = () => setOverlay({ type: "createTab" });
  const handleViewTabDetail = (tabId: string) => setOverlay({ type: "tabDetail", tabId });
  const handleAddFriend = () => setOverlay({ type: "addFriend" });
  const handleViewLedger = () => setOverlay({ type: "ledger" });
  const handleViewGroups = () => setOverlay({ type: "groupList" });
  const handleViewGroupDetail = (groupId: string) => setOverlay({ type: "groupDetail", groupId });
  const handleCreateGroup = () => setOverlay({ type: "createGroup" });

  return (
    <>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />

      {/* All 4 tabs mounted simultaneously — toggled by opacity so data stays alive */}
      <View style={{ flex: 1, display: overlay.type === "none" ? "flex" : "none" }}>
        <View style={{ flex: 1, opacity: activeTab === "Home" ? 1 : 0, position: "absolute", width: "100%", height: "100%", pointerEvents: activeTab === "Home" ? "auto" : "none" }}>
          <HomeScreen
            onTabPress={handleTabPress}
            onCreateTab={handleCreateTab}
            onViewTabs={() => handleTabPress("Tabs")}
            onViewTabDetail={handleViewTabDetail}
            onViewLedger={handleViewLedger}
            onViewGroups={handleViewGroups}
          />
        </View>
        <View style={{ flex: 1, opacity: activeTab === "Friends" ? 1 : 0, position: "absolute", width: "100%", height: "100%", pointerEvents: activeTab === "Friends" ? "auto" : "none" }}>
          <FriendsListScreen
            onTabPress={handleTabPress}
            onAddFriend={handleAddFriend}
            onCreateTab={handleCreateTab}
          />
        </View>
        <View style={{ flex: 1, opacity: activeTab === "Tabs" ? 1 : 0, position: "absolute", width: "100%", height: "100%", pointerEvents: activeTab === "Tabs" ? "auto" : "none" }}>
          <TabsListScreen
            onTabPress={handleTabPress}
            onViewTabDetail={handleViewTabDetail}
            onCreateTab={handleCreateTab}
          />
        </View>
        <View style={{ flex: 1, opacity: activeTab === "Profile" ? 1 : 0, position: "absolute", width: "100%", height: "100%", pointerEvents: activeTab === "Profile" ? "auto" : "none" }}>
          <ProfileScreen
            onTabPress={handleTabPress}
            onEditProfile={(profile, handles) => {
              setEditProfileData({ profile, handles });
              setEditProfileVisible(true);
            }}
          />
        </View>
      </View>

      {/* Overlay screens — slide up on open, slide down on back */}
      {overlay.type === "tabDetail" && (
        <SlideUpScreen onBack={() => goBack("Tabs")}>
          {(back) => <TabDetailScreen tabId={overlay.tabId} onBack={back} />}
        </SlideUpScreen>
      )}
      {overlay.type === "createTab" && (
        <SlideUpScreen onBack={() => goBack("Home")}>
          {(back) => <CreateTabFlow onBack={back} onComplete={() => goBack("Tabs")} />}
        </SlideUpScreen>
      )}
      {overlay.type === "addFriend" && (
        <SlideUpScreen onBack={() => goBack("Friends")}>
          {(back) => <AddFriendScreen onBack={back} />}
        </SlideUpScreen>
      )}
      {overlay.type === "ledger" && (
        <SlideUpScreen onBack={() => goBack("Home")}>
          {(back) => <LedgerScreen onBack={back} />}
        </SlideUpScreen>
      )}
      {overlay.type === "groupList" && (
        <SlideUpScreen onBack={() => goBack("Home")}>
          {(back) => (
            <GroupsListScreen
              onBack={back}
              onViewGroup={handleViewGroupDetail}
              onCreateGroup={handleCreateGroup}
            />
          )}
        </SlideUpScreen>
      )}
      {overlay.type === "groupDetail" && (
        <SlideUpScreen onBack={() => goBack("Home")}>
          {(back) => <GroupDetailScreen groupId={overlay.groupId} onBack={back} />}
        </SlideUpScreen>
      )}
      {overlay.type === "createGroup" && (
        <SlideUpScreen onBack={() => goBack("Home")}>
          {(back) => (
            <CreateGroupFlow
              onBack={back}
              onComplete={(groupId) => setOverlay({ type: "groupDetail", groupId })}
            />
          )}
        </SlideUpScreen>
      )}
      <SlideUpModal
        visible={editProfileVisible}
        onHidden={() => setEditProfileData(null)}
      >
        {editProfileData && (
          <EditProfileScreen
            profile={editProfileData.profile}
            handles={editProfileData.handles}
            onBack={closeEditProfile}
            onSaved={closeEditProfile}
          />
        )}
      </SlideUpModal>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <ErrorBoundary>
              <MainApp />
            </ErrorBoundary>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
