import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CHAT_THEMES, ChatTheme, DEFAULT_THEME_ID, THEME_STORAGE_KEY, WALLPAPER_STORAGE_KEY } from "@/constants/chat-themes";

export type WallpaperConfig =
  | { type: "none" }
  | { type: "color"; color: string }
  | { type: "image"; uri: string };

interface ChatThemeContextValue {
  theme: ChatTheme;
  setThemeById: (id: string) => Promise<void>;
  wallpaper: WallpaperConfig;
  setWallpaper: (w: WallpaperConfig) => Promise<void>;
  allThemes: ChatTheme[];
}

const ChatThemeContext = createContext<ChatThemeContextValue | null>(null);

export function ChatThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [wallpaper, setWallpaperState] = useState<WallpaperConfig>({ type: "none" });

  useEffect(() => {
    // Kayıtlı tema ve duvar kağıdını yükle
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(WALLPAPER_STORAGE_KEY),
    ]).then(([savedTheme, savedWallpaper]) => {
      if (savedTheme && CHAT_THEMES.find((t) => t.id === savedTheme)) {
        setThemeId(savedTheme);
      }
      if (savedWallpaper) {
        try {
          setWallpaperState(JSON.parse(savedWallpaper));
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  const setThemeById = useCallback(async (id: string) => {
    setThemeId(id);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  const setWallpaper = useCallback(async (w: WallpaperConfig) => {
    setWallpaperState(w);
    await AsyncStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(w));
  }, []);

  const theme = CHAT_THEMES.find((t) => t.id === themeId) ?? CHAT_THEMES[0];

  return (
    <ChatThemeContext.Provider
      value={{ theme, setThemeById, wallpaper, setWallpaper, allThemes: CHAT_THEMES }}
    >
      {children}
    </ChatThemeContext.Provider>
  );
}

export function useChatTheme(): ChatThemeContextValue {
  const ctx = useContext(ChatThemeContext);
  if (!ctx) throw new Error("useChatTheme must be used inside <ChatThemeProvider>");
  return ctx;
}
