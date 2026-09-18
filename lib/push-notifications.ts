import * as Notifications from "expo-notifications";
import { NativeModules, Platform } from "react-native";
import type { ChatUser } from "@/lib/firebase";

export async function registerPushToken(user: ChatUser) {
  if (Platform.OS === "web") return;
  if (Platform.OS === "android") {
    try {
      NativeModules.KalbimService?.setCurrentUser?.(user.name);
    } catch {}

    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Mesajlar",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      });
    } catch {}

    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    } catch {}
  }
}

export async function notifyOtherDevice(user: ChatUser, body: string, kind: "text" | "image") {
  // Arka plan Android servisi doğrudan Firestore'u dinlediği için yerel servis otomatik yakalar
}

