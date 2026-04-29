// Register the device's Expo push token with the API.
// Called once after auth resolves. Silently no-ops on simulators or if
// permission is denied — push is a nice-to-have, not a hard dependency.
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { ApiClient } from "../api/client";
import { EAS_PROJECT_ID } from "../api/config";

export async function registerPushToken(apiClient: ApiClient): Promise<void> {
  if (!Device.isDevice) return; // simulators can't receive push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  // Android needs a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
  const platform  = Platform.OS === "ios" ? "ios" : "android";

  await apiClient.post("/users/device", { pushToken: tokenData.data, platform }).catch(() => {});
}
