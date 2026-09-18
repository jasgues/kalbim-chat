import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useChatTheme, WallpaperConfig } from "@/contexts/ChatThemeContext";
import { ChatTheme } from "@/constants/chat-themes";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#fff7f8", "#f0f9ff", "#fffbf5", "#f0fdf4", "#fdf4ff",
  "#1a1a2e", "#0f172a", "#1c1917", "#14532d", "#312e81",
  "#fce4ec", "#e8f5e9", "#e3f2fd", "#fff3e0", "#f3e5f5",
];

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { theme, allThemes, setThemeById, wallpaper, setWallpaper } = useChatTheme();
  const [activeSection, setActiveSection] = useState<"theme" | "wallpaper">("theme");
  const [pickingImage, setPickingImage] = useState(false);

  const handlePickWallpaper = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin gerekli", "Duvar kağıdı seçmek için galeri erişimine izin vermelisin.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
        base64: false,
      });
      if (!result.canceled && result.assets[0]) {
        await setWallpaper({ type: "image", uri: result.assets[0].uri });
      }
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Görsel seçilemedi.");
    } finally {
      setPickingImage(false);
    }
  };

  const handleRemoveWallpaper = async () => {
    await setWallpaper({ type: "none" });
  };

  const handleSelectColor = async (color: string) => {
    await setWallpaper({ type: "color", color });
  };

  const renderThemeCard = (t: ChatTheme) => {
    const isActive = t.id === theme.id;
    return (
      <TouchableOpacity
        key={t.id}
        onPress={() => setThemeById(t.id)}
        style={{
          marginBottom: 10,
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: isActive ? 2.5 : 1,
          borderColor: isActive ? t.primary : theme.border,
        }}
      >
        {/* Preview bar */}
        <View style={{ height: 60, backgroundColor: t.background, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
          {/* Received bubble preview */}
          <View style={{ backgroundColor: t.bubbleOther, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 100 }}>
            <Text style={{ fontSize: 11, color: t.bubbleOtherText }}>Merhaba 💕</Text>
          </View>
          {/* Sent bubble preview */}
          <View style={{ backgroundColor: t.bubbleMine, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 100 }}>
            <Text style={{ fontSize: 11, color: t.bubbleMineText }}>Seni seviyorum</Text>
          </View>
        </View>
        {/* Label */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: t.surface, paddingHorizontal: 14, paddingVertical: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: t.foreground }}>{t.name}</Text>
          </View>
          {isActive && (
            <View style={{ backgroundColor: t.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: "white", fontSize: 11, fontWeight: "bold" }}>✓ Aktif</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        <StatusBar barStyle={theme.statusBarStyle} />
        <View style={{
          backgroundColor: theme.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: Platform.OS === "android" ? 24 : 34,
          maxHeight: "90%",
        }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: theme.foreground }}>⚙️ Ayarlar</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 14, color: theme.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Section tabs */}
          <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: theme.background, borderRadius: 14, padding: 4 }}>
            <TouchableOpacity
              onPress={() => setActiveSection("theme")}
              style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: activeSection === "theme" ? theme.primary : "transparent" }}
            >
              <Text style={{ fontWeight: "600", color: activeSection === "theme" ? "white" : theme.muted }}>🎨 Tema</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveSection("wallpaper")}
              style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: activeSection === "wallpaper" ? theme.primary : "transparent" }}
            >
              <Text style={{ fontWeight: "600", color: activeSection === "wallpaper" ? "white" : theme.muted }}>🖼️ Duvar Kağıdı</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            {activeSection === "theme" ? (
              <View style={{ paddingBottom: 20 }}>
                <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 12 }}>
                  Sohbet penceresinin renk temasını seç. Uzun bas veya buradan değiştir.
                </Text>
                {allThemes.map(renderThemeCard)}
              </View>
            ) : (
              <View style={{ paddingBottom: 20 }}>
                <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 16 }}>
                  Sohbet arka planını kişiselleştir.
                </Text>

                {/* Current status */}
                <View style={{ borderRadius: 14, backgroundColor: theme.background, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>Mevcut duvar kağıdı:</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
                    {wallpaper.type === "none" ? "📋 Düz renk (tema arka planı)"
                      : wallpaper.type === "color" ? `🎨 Renk: ${wallpaper.color}`
                      : "🖼️ Galeri resmi"}
                  </Text>
                </View>

                {/* Action buttons */}
                <TouchableOpacity
                  onPress={handlePickWallpaper}
                  disabled={pickingImage}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, backgroundColor: theme.primary, padding: 16, marginBottom: 10 }}
                >
                  {pickingImage ? <ActivityIndicator color="white" size="small" /> : <Text style={{ fontSize: 20 }}>🖼️</Text>}
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                    {pickingImage ? "Seçiliyor…" : "Galeriden Fotoğraf Seç"}
                  </Text>
                </TouchableOpacity>

                {wallpaper.type !== "none" && (
                  <TouchableOpacity
                    onPress={handleRemoveWallpaper}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, backgroundColor: theme.background, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border }}
                  >
                    <Text style={{ fontSize: 20 }}>🗑️</Text>
                    <Text style={{ color: theme.muted, fontWeight: "600", fontSize: 15 }}>Duvar Kağıdını Kaldır</Text>
                  </TouchableOpacity>
                )}

                {/* Preset colors */}
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground, marginBottom: 10 }}>Düz Renk Seç</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                  {PRESET_COLORS.map((color) => {
                    const isSelected = wallpaper.type === "color" && wallpaper.color === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        onPress={() => handleSelectColor(color)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: color,
                          borderWidth: isSelected ? 3 : 1.5,
                          borderColor: isSelected ? theme.primary : theme.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && <Text style={{ fontSize: 16 }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
