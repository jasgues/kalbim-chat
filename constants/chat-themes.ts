// Kalbim Chat — Tema Renk Paletleri
// Her temada: primary, background, surface, foreground, muted, border, bubble (mine), bubbleText (mine), bubbleOther, bubbleTextOther

export type ChatTheme = {
  id: string;
  name: string;
  emoji: string;
  // Ana renkler
  primary: string;
  primaryLight: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  // Mesaj kabarcıkları
  bubbleMine: string;
  bubbleMineText: string;
  bubbleOther: string;
  bubbleOtherText: string;
  // Girdi çubuğu
  inputBackground: string;
  inputBorder: string;
  // Header
  headerBg: string;
  // Sticker bölümü
  stickerBg: string;
  // Tab + button vurgu
  tabActive: string;
  tabActiveText: string;
  tabInactive: string;
  tabInactiveText: string;
  // Durum çubuğu rengi
  statusBarStyle: "light-content" | "dark-content";
};

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: "rose",
    name: "Gül Pembe",
    emoji: "🌸",
    primary: "#df6b83",
    primaryLight: "#f9e4e8",
    background: "#fff7f8",
    surface: "#ffffff",
    foreground: "#351b25",
    muted: "#9d5b6c",
    border: "#f1d9df",
    bubbleMine: "#df6b83",
    bubbleMineText: "#ffffff",
    bubbleOther: "#ffffff",
    bubbleOtherText: "#351b25",
    inputBackground: "#ffffff",
    inputBorder: "#f1d9df",
    headerBg: "#fff7f8",
    stickerBg: "#fffbfb",
    tabActive: "#df6b83",
    tabActiveText: "#ffffff",
    tabInactive: "#ffffff",
    tabInactiveText: "#7a4654",
    statusBarStyle: "dark-content",
  },
  {
    id: "midnight",
    name: "Gece Moru",
    emoji: "🌙",
    primary: "#a78bfa",
    primaryLight: "#2d1f4a",
    background: "#0f0a1a",
    surface: "#1e1530",
    foreground: "#ede9fe",
    muted: "#9278cc",
    border: "#3d2d60",
    bubbleMine: "#7c3aed",
    bubbleMineText: "#ffffff",
    bubbleOther: "#1e1530",
    bubbleOtherText: "#ede9fe",
    inputBackground: "#1e1530",
    inputBorder: "#3d2d60",
    headerBg: "#0f0a1a",
    stickerBg: "#1a1128",
    tabActive: "#7c3aed",
    tabActiveText: "#ffffff",
    tabInactive: "#1e1530",
    tabInactiveText: "#9278cc",
    statusBarStyle: "light-content",
  },
  {
    id: "ocean",
    name: "Okyanus",
    emoji: "🌊",
    primary: "#0ea5e9",
    primaryLight: "#e0f2fe",
    background: "#f0f9ff",
    surface: "#ffffff",
    foreground: "#0c2d48",
    muted: "#4b90b0",
    border: "#bae6fd",
    bubbleMine: "#0ea5e9",
    bubbleMineText: "#ffffff",
    bubbleOther: "#ffffff",
    bubbleOtherText: "#0c2d48",
    inputBackground: "#ffffff",
    inputBorder: "#bae6fd",
    headerBg: "#f0f9ff",
    stickerBg: "#f7fbff",
    tabActive: "#0ea5e9",
    tabActiveText: "#ffffff",
    tabInactive: "#ffffff",
    tabInactiveText: "#2a6f90",
    statusBarStyle: "dark-content",
  },
  {
    id: "forest",
    name: "Koyu Orman",
    emoji: "🌿",
    primary: "#22c55e",
    primaryLight: "#14532d",
    background: "#071a10",
    surface: "#0d2b1c",
    foreground: "#dcfce7",
    muted: "#4ade80",
    border: "#166534",
    bubbleMine: "#16a34a",
    bubbleMineText: "#ffffff",
    bubbleOther: "#0d2b1c",
    bubbleOtherText: "#dcfce7",
    inputBackground: "#0d2b1c",
    inputBorder: "#166534",
    headerBg: "#071a10",
    stickerBg: "#0a2015",
    tabActive: "#16a34a",
    tabActiveText: "#ffffff",
    tabInactive: "#0d2b1c",
    tabInactiveText: "#4ade80",
    statusBarStyle: "light-content",
  },
  {
    id: "sunrise",
    name: "Turuncu Güneş",
    emoji: "🌅",
    primary: "#f97316",
    primaryLight: "#fff7ed",
    background: "#fffbf5",
    surface: "#ffffff",
    foreground: "#431407",
    muted: "#9a3412",
    border: "#fed7aa",
    bubbleMine: "#f97316",
    bubbleMineText: "#ffffff",
    bubbleOther: "#ffffff",
    bubbleOtherText: "#431407",
    inputBackground: "#ffffff",
    inputBorder: "#fed7aa",
    headerBg: "#fffbf5",
    stickerBg: "#fffcf8",
    tabActive: "#f97316",
    tabActiveText: "#ffffff",
    tabInactive: "#ffffff",
    tabInactiveText: "#9a3412",
    statusBarStyle: "dark-content",
  },
];

export const DEFAULT_THEME_ID = "rose";
export const THEME_STORAGE_KEY = "kalbim_chat_theme_v1";
export const WALLPAPER_STORAGE_KEY = "kalbim_wallpaper_v1";
