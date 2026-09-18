import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { NativeModules, Platform } from "react-native";
import { loadChatUser, signInChatUser, signOutChatUser, type ChatUser } from "@/lib/firebase";
import { CHAT_PASSWORD } from "@/lib/chat-constants";

const PROFILE_KEY = "kalbim.firebase.profile";

function syncNativeUser(name: string) {
  if (Platform.OS === "android" && NativeModules.KalbimService?.setCurrentUser) {
    try {
      NativeModules.KalbimService.setCurrentUser(name);
    } catch {
      // Ignore if native module unavailable
    }
  }
}

export type User = ChatUser & {
  email: string | null;
  loginMethod: string;
  lastSignedIn: Date;
};

type UseAuthOptions = { autoFetch?: boolean };

function toUser(profile: ChatUser): User {
  return { ...profile, email: null, loginMethod: "firebase-anonymous", lastSignedIn: new Date() };
}

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }
    let active = true;
    AsyncStorage.getItem(PROFILE_KEY).then(async (stored) => {
      if (!active) return;
      if (stored) {
        try {
          const saved = JSON.parse(stored) as ChatUser;
          const profile = await signInChatUser(saved.name, CHAT_PASSWORD);
          await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
          syncNativeUser(profile.name);
          if (active) setUser(toUser(profile));
        } catch { await AsyncStorage.removeItem(PROFILE_KEY); }
      }
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err : new Error("Oturum yüklenemedi."));
      setLoading(false);
    });
    return () => { active = false; };
  }, [autoFetch]);

  const login = useCallback(async (name: ChatUser["name"], password: string) => {
    setError(null);
    const profile = await signInChatUser(name, password);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    syncNativeUser(profile.name);
    setUser(toUser(profile));
  }, []);

  const logout = useCallback(async () => {
    await signOutChatUser();
    await AsyncStorage.removeItem(PROFILE_KEY);
    setUser(null);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    const stored = await AsyncStorage.getItem(PROFILE_KEY);
    setUser(stored ? toUser(JSON.parse(stored) as ChatUser) : null);
  }, []);

  return { user, loading, error, isAuthenticated: Boolean(user), refresh, logout, login };
}
