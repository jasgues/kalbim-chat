import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

const CUSTOM_STICKER_PACKS_KEY = "kalbim_custom_sticker_packs_v1";

export type StickerItem = {
  id: string;
  url?: string; // Base64 veya doğrudan görsel URL'si
  source?: any; // Yerel require(...) animasyonlu GIF varlığı
  title: string;
  isCustom?: boolean;
};

export type StickerPack = {
  id: string;
  name: string;
  stickers: StickerItem[];
};

export type StickerCategory = {
  id: string;
  name: string;
  icon: string;
  stickers: StickerItem[];
};

// Doğrudan uygulama içerisine gömülü gerçek hareketli Bubu & Dudu GIF çıkartmaları
export const BUBU_DUDU_ANIMATED_ASSETS: Record<string, any> = {
  bd_1: require("@/assets/stickers/bubu_dudu/bd_1.gif"),
  bd_2: require("@/assets/stickers/bubu_dudu/bd_2.gif"),
  bd_3: require("@/assets/stickers/bubu_dudu/bd_3.gif"),
  bd_4: require("@/assets/stickers/bubu_dudu/bd_4.gif"),
  bd_5: require("@/assets/stickers/bubu_dudu/bd_5.gif"),
  bd_6: require("@/assets/stickers/bubu_dudu/bd_6.gif"),
  bd_7: require("@/assets/stickers/bubu_dudu/bd_7.gif"),
  bd_8: require("@/assets/stickers/bubu_dudu/bd_8.gif"),
  bd_9: require("@/assets/stickers/bubu_dudu/bd_9.gif"),
  bd_10: require("@/assets/stickers/bubu_dudu/bd_10.gif"),
  bd_11: require("@/assets/stickers/bubu_dudu/bd_11.gif"),
  bd_12: require("@/assets/stickers/bubu_dudu/bd_12.gif"),
  bd_13: require("@/assets/stickers/bubu_dudu/bd_13.gif"),
  bd_14: require("@/assets/stickers/bubu_dudu/bd_14.gif"),
  bd_15: require("@/assets/stickers/bubu_dudu/bd_15.gif"),
  bd_16: require("@/assets/stickers/bubu_dudu/bd_16.gif"),
  bd_17: require("@/assets/stickers/bubu_dudu/bd_17.gif"),
  bd_18: require("@/assets/stickers/bubu_dudu/bd_18.gif"),
  bd_19: require("@/assets/stickers/bubu_dudu/bd_19.gif"),
  bd_20: require("@/assets/stickers/bubu_dudu/bd_20.gif"),
  bd_21: require("@/assets/stickers/bubu_dudu/bd_21.gif"),
  bd_22: require("@/assets/stickers/bubu_dudu/bd_22.gif"),
  bd_23: require("@/assets/stickers/bubu_dudu/bd_23.gif"),
  bd_24: require("@/assets/stickers/bubu_dudu/bd_24.gif"),
};

// Bubududu ikinci paket — statik çıkartmalar (CDN'den indirilen GIF/PNG)
export const BUBU_DUDU2_ASSETS: Record<string, any> = {
  bd2_1: require("@/assets/stickers/bubu_dudu2/bd2_1.gif"),
  bd2_2: require("@/assets/stickers/bubu_dudu2/bd2_2.gif"),
  bd2_3: require("@/assets/stickers/bubu_dudu2/bd2_3.gif"),
  bd2_4: require("@/assets/stickers/bubu_dudu2/bd2_4.gif"),
  bd2_5: require("@/assets/stickers/bubu_dudu2/bd2_5.gif"),
  bd2_6: require("@/assets/stickers/bubu_dudu2/bd2_6.gif"),
  bd2_7: require("@/assets/stickers/bubu_dudu2/bd2_7.gif"),
  bd2_8: require("@/assets/stickers/bubu_dudu2/bd2_8.gif"),
  bd2_9: require("@/assets/stickers/bubu_dudu2/bd2_9.gif"),
  bd2_10: require("@/assets/stickers/bubu_dudu2/bd2_10.gif"),
  bd2_11: require("@/assets/stickers/bubu_dudu2/bd2_11.png"),
  bd2_12: require("@/assets/stickers/bubu_dudu2/bd2_12.png"),
  bd2_13: require("@/assets/stickers/bubu_dudu2/bd2_13.gif"),
  bd2_14: require("@/assets/stickers/bubu_dudu2/bd2_14.gif"),
};

export function getStickerSource(idOrUrl?: string | null, base64?: string, mimeType?: string): any {
  if (base64) {
    return { uri: `data:${mimeType ?? "image/jpeg"};base64,${base64}` };
  }
  if (!idOrUrl) return null;
  const cleanId = idOrUrl.startsWith("[sticker]:") ? idOrUrl.replace("[sticker]:", "") : idOrUrl;
  if (cleanId in BUBU_DUDU_ANIMATED_ASSETS) {
    return BUBU_DUDU_ANIMATED_ASSETS[cleanId];
  }
  if (cleanId in BUBU_DUDU2_ASSETS) {
    return BUBU_DUDU2_ASSETS[cleanId];
  }
  if (cleanId.startsWith("http://") || cleanId.startsWith("https://") || cleanId.startsWith("data:")) {
    return { uri: cleanId };
  }
  return null;
}

// Sadece Bubu & Dudu paketi (diğer kategoriler kaldırıldı)
export const BUILT_IN_STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: "bubu_dudu",
    name: "Bubu & Dudu",
    icon: "🐼",
    stickers: [
      { id: "bd_1", title: "Bubu Dudu Kalp", source: BUBU_DUDU_ANIMATED_ASSETS.bd_1 },
      { id: "bd_2", title: "Bubu Dudu Sarılma", source: BUBU_DUDU_ANIMATED_ASSETS.bd_2 },
      { id: "bd_3", title: "Bubu Dudu Öpücük", source: BUBU_DUDU_ANIMATED_ASSETS.bd_3 },
      { id: "bd_4", title: "Bubu Dudu Dans", source: BUBU_DUDU_ANIMATED_ASSETS.bd_4 },
      { id: "bd_5", title: "Bubu Dudu Mutlu", source: BUBU_DUDU_ANIMATED_ASSETS.bd_5 },
      { id: "bd_6", title: "Bubu Dudu Sevimli", source: BUBU_DUDU_ANIMATED_ASSETS.bd_6 },
      { id: "bd_7", title: "Bubu Dudu Uykulu", source: BUBU_DUDU_ANIMATED_ASSETS.bd_7 },
      { id: "bd_8", title: "Bubu Dudu Kızgın", source: BUBU_DUDU_ANIMATED_ASSETS.bd_8 },
      { id: "bd_9", title: "Bubu Dudu Ağlama", source: BUBU_DUDU_ANIMATED_ASSETS.bd_9 },
      { id: "bd_10", title: "Bubu Dudu Şaşkın", source: BUBU_DUDU_ANIMATED_ASSETS.bd_10 },
      { id: "bd_11", title: "Bubu Dudu Utangaç", source: BUBU_DUDU_ANIMATED_ASSETS.bd_11 },
      { id: "bd_12", title: "Bubu Dudu Yemek", source: BUBU_DUDU_ANIMATED_ASSETS.bd_12 },
      { id: "bd_13", title: "Bubu Dudu Masaj", source: BUBU_DUDU_ANIMATED_ASSETS.bd_13 },
      { id: "bd_14", title: "Bubu Dudu Pıt Pıt", source: BUBU_DUDU_ANIMATED_ASSETS.bd_14 },
      { id: "bd_15", title: "Bubu Dudu Kucak", source: BUBU_DUDU_ANIMATED_ASSETS.bd_15 },
      { id: "bd_16", title: "Bubu Dudu Heyecan", source: BUBU_DUDU_ANIMATED_ASSETS.bd_16 },
      { id: "bd_17", title: "Bubu Dudu Seviyor", source: BUBU_DUDU_ANIMATED_ASSETS.bd_17 },
      { id: "bd_18", title: "Bubu Dudu Yanak", source: BUBU_DUDU_ANIMATED_ASSETS.bd_18 },
      { id: "bd_19", title: "Bubu Dudu Aşk", source: BUBU_DUDU_ANIMATED_ASSETS.bd_19 },
      { id: "bd_20", title: "Bubu Dudu Barış", source: BUBU_DUDU_ANIMATED_ASSETS.bd_20 },
      { id: "bd_21", title: "Bubu Dudu Şımartma", source: BUBU_DUDU_ANIMATED_ASSETS.bd_21 },
      { id: "bd_22", title: "Bubu Dudu Eğlence", source: BUBU_DUDU_ANIMATED_ASSETS.bd_22 },
      { id: "bd_23", title: "Bubu Dudu Minik Kalp", source: BUBU_DUDU_ANIMATED_ASSETS.bd_23 },
      { id: "bd_24", title: "Bubu Dudu Gülücük", source: BUBU_DUDU_ANIMATED_ASSETS.bd_24 },
      // Bubududu ikinci paket (14 statik PNG)
      { id: "bd2_1", title: "Bubududu 1", source: BUBU_DUDU2_ASSETS.bd2_1 },
      { id: "bd2_2", title: "Bubududu 2", source: BUBU_DUDU2_ASSETS.bd2_2 },
      { id: "bd2_3", title: "Bubududu 3", source: BUBU_DUDU2_ASSETS.bd2_3 },
      { id: "bd2_4", title: "Bubududu 4", source: BUBU_DUDU2_ASSETS.bd2_4 },
      { id: "bd2_5", title: "Bubududu 5", source: BUBU_DUDU2_ASSETS.bd2_5 },
      { id: "bd2_6", title: "Bubududu 6", source: BUBU_DUDU2_ASSETS.bd2_6 },
      { id: "bd2_7", title: "Bubududu 7", source: BUBU_DUDU2_ASSETS.bd2_7 },
      { id: "bd2_8", title: "Bubududu 8", source: BUBU_DUDU2_ASSETS.bd2_8 },
      { id: "bd2_9", title: "Bubududu 9", source: BUBU_DUDU2_ASSETS.bd2_9 },
      { id: "bd2_10", title: "Bubududu 10", source: BUBU_DUDU2_ASSETS.bd2_10 },
      { id: "bd2_11", title: "Bubududu 11", source: BUBU_DUDU2_ASSETS.bd2_11 },
      { id: "bd2_12", title: "Bubududu 12", source: BUBU_DUDU2_ASSETS.bd2_12 },
      { id: "bd2_13", title: "Bubududu 13", source: BUBU_DUDU2_ASSETS.bd2_13 },
      { id: "bd2_14", title: "Bubududu 14", source: BUBU_DUDU2_ASSETS.bd2_14 },
    ],
  },
];

// --- Çıkartma Paketi CRUD ---

export async function getCustomStickerPacks(): Promise<StickerPack[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_STICKER_PACKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveCustomStickerPacks(packs: StickerPack[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_STICKER_PACKS_KEY, JSON.stringify(packs));
}

export async function createCustomStickerPack(name: string): Promise<StickerPack> {
  const packs = await getCustomStickerPacks();
  const newPack: StickerPack = {
    id: `pack_${Date.now()}`,
    name,
    stickers: [],
  };
  await saveCustomStickerPacks([...packs, newPack]);
  return newPack;
}

export async function renameCustomStickerPack(packId: string, newName: string): Promise<void> {
  const packs = await getCustomStickerPacks();
  const updated = packs.map((p) => (p.id === packId ? { ...p, name: newName } : p));
  await saveCustomStickerPacks(updated);
}

export async function deleteCustomStickerPack(packId: string): Promise<void> {
  const packs = await getCustomStickerPacks();
  await saveCustomStickerPacks(packs.filter((p) => p.id !== packId));
}

export async function addStickerToPackFromGallery(packId: string): Promise<StickerItem | null> {
  // Galeri izni
  try {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  } catch {
    // ignore
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: false,
    base64: false,
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 260, height: 260 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (!manipulated.base64) {
    throw new Error("Görsel çıkartmaya dönüştürülemedi.");
  }

  const newSticker: StickerItem = {
    id: `custom_${Date.now()}`,
    url: `data:image/jpeg;base64,${manipulated.base64}`,
    title: "Özel Çıkartma",
    isCustom: true,
  };

  const packs = await getCustomStickerPacks();
  const updated = packs.map((p) =>
    p.id === packId ? { ...p, stickers: [newSticker, ...p.stickers] } : p
  );
  await saveCustomStickerPacks(updated);

  return newSticker;
}

export async function addStickerItemToPack(packId: string, sticker: StickerItem): Promise<void> {
  // Alınan bir çıkartmayı pakete ekle (url veya source ile)
  const newSticker: StickerItem = {
    ...sticker,
    id: `custom_${Date.now()}_${sticker.id}`,
    isCustom: true,
  };
  const packs = await getCustomStickerPacks();
  // Eğer hiç paket yoksa otomatik oluştur
  if (packs.length === 0) {
    const defaultPack: StickerPack = {
      id: `pack_${Date.now()}`,
      name: "Favorilerim",
      stickers: [newSticker],
    };
    await saveCustomStickerPacks([defaultPack]);
    return;
  }
  const updated = packs.map((p, idx) =>
    p.id === packId || (packId === "__first__" && idx === 0)
      ? { ...p, stickers: [newSticker, ...p.stickers] }
      : p
  );
  await saveCustomStickerPacks(updated);
}

export async function deleteStickerFromPack(packId: string, stickerId: string): Promise<void> {
  const packs = await getCustomStickerPacks();
  const updated = packs.map((p) =>
    p.id === packId ? { ...p, stickers: p.stickers.filter((s) => s.id !== stickerId) } : p
  );
  await saveCustomStickerPacks(updated);
}

// Geriye dönük uyumluluk için eski custom sticker fonksiyonları
export async function getCustomStickers(): Promise<StickerItem[]> {
  const packs = await getCustomStickerPacks();
  return packs.flatMap((p) => p.stickers);
}

export async function addCustomStickerFromGallery(): Promise<StickerItem | null> {
  const packs = await getCustomStickerPacks();
  let packId: string;
  if (packs.length === 0) {
    const p = await createCustomStickerPack("Favorilerim");
    packId = p.id;
  } else {
    packId = packs[0].id;
  }
  return addStickerToPackFromGallery(packId);
}

export async function deleteCustomSticker(id: string): Promise<void> {
  const packs = await getCustomStickerPacks();
  const updated = packs.map((p) => ({ ...p, stickers: p.stickers.filter((s) => s.id !== id) }));
  await saveCustomStickerPacks(updated);
}
