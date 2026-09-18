import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { NativeModules } from "react-native";
import { StickerItem, StickerPack, addStickerItemToPack, createCustomStickerPack, getCustomStickerPacks } from "@/constants/stickers";

interface ImageViewerModalProps {
  visible: boolean;
  imageSource: any;
  senderName?: string;
  timestamp?: string;
  onClose: () => void;
  /** Eğer bu bir sticker ise, "Galeriye Kaydet" yerine "Çıkartmayı Ekle" göster */
  isSticker?: boolean;
  /** Eklenecek sticker verisi */
  stickerItem?: StickerItem;
}

export function ImageViewerModal({
  visible,
  imageSource,
  senderName,
  timestamp,
  onClose,
  isSticker = false,
  stickerItem,
}: ImageViewerModalProps) {
  const [saving, setSaving] = useState(false);
  const [addingSticker, setAddingSticker] = useState(false);
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const { width, height } = Dimensions.get("window");

  if (!visible || !imageSource) return null;

  const resolvedSource = typeof imageSource === "string" ? { uri: imageSource } : imageSource;

  const handleSaveToGallery = async () => {
    setSaving(true);
    try {
      let targetUri: string | null = null;

      if (typeof imageSource === "string") {
        targetUri = imageSource;
      } else if (imageSource?.uri) {
        targetUri = imageSource.uri;
      } else {
        const resolved = Image.resolveAssetSource(imageSource);
        if (resolved?.uri) {
          targetUri = resolved.uri;
        }
      }

      if (!targetUri) {
        throw new Error("Görsel adresi çözümlenemedi.");
      }

      if (Platform.OS === "android" && NativeModules.KalbimService?.saveImageToGallery) {
        await NativeModules.KalbimService.saveImageToGallery(targetUri);
        Alert.alert("Başarılı 💖", "Görsel telefonun galerisine kaydedildi!");
      } else if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = targetUri;
        link.download = `kalbim_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert("İndirildi", "Görsel cihazınıza indirildi.");
      } else {
        Alert.alert("Bilgi", "Galeriye kaydetme özelliği şu an Android cihazlarda desteklenmektedir.");
      }
    } catch (error: any) {
      Alert.alert("Kaydedilemedi", error?.message || "Görsel galeriye kaydedilirken bir sorun oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleShowPackPicker = async () => {
    setAddingSticker(true);
    try {
      const loadedPacks = await getCustomStickerPacks();
      if (loadedPacks.length === 0) {
        // Paket yoksa otomatik olarak "Favorilerim" paketi oluştur ve sticker'ı ekle
        const newPack = await createCustomStickerPack("Favorilerim");
        if (stickerItem) {
          await addStickerItemToPack(newPack.id, stickerItem);
        }
        Alert.alert("✨ Eklendi!", "\"Favorilerim\" paketi oluşturuldu ve çıkartma eklendi.");
        onClose();
      } else if (loadedPacks.length === 1) {
        // Tek paket varsa direkt ekle
        if (stickerItem) {
          await addStickerItemToPack(loadedPacks[0].id, stickerItem);
        }
        Alert.alert("✨ Eklendi!", `Çıkartma "${loadedPacks[0].name}" paketine eklendi.`);
        onClose();
      } else {
        // Birden fazla paket varsa seçim sun
        setPacks(loadedPacks);
        setShowPackPicker(true);
      }
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Çıkartma eklenemedi.");
    } finally {
      setAddingSticker(false);
    }
  };

  const handleAddToPack = async (packId: string, packName: string) => {
    if (!stickerItem) return;
    try {
      await addStickerItemToPack(packId, stickerItem);
      setShowPackPicker(false);
      Alert.alert("✨ Eklendi!", `Çıkartma "${packName}" paketine eklendi.`);
      onClose();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Çıkartma eklenemedi.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.94)" }}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }}>
          {/* Top Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: Platform.OS === "android" ? 40 : 16,
              paddingBottom: 16,
            }}
          >
            <View>
              {senderName ? (
                <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
                  {senderName}
                </Text>
              ) : null}
              {timestamp ? (
                <Text style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
                  {timestamp}
                </Text>
              ) : null}
              {isSticker && (
                <Text style={{ color: "#f9a8d4", fontSize: 12, marginTop: 2 }}>
                  🧸 Çıkartma
                </Text>
              )}
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={15}
              style={({ pressed }) => [
                {
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialIcons name="close" size={26} color="white" />
            </Pressable>
          </View>

          {/* Center Image */}
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 10,
            }}
          >
            <Image
              source={resolvedSource}
              style={{ width: width - 24, height: height * 0.65 }}
              resizeMode="contain"
            />
          </View>

          {/* Bottom Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              paddingHorizontal: 20,
              paddingBottom: Platform.OS === "android" ? 30 : 20,
              paddingTop: 16,
            }}
          >
            {isSticker ? (
              /* Çıkartmayı Ekle butonu */
              <Pressable
                onPress={handleShowPackPicker}
                disabled={addingSticker}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#7c3aed",
                    paddingVertical: 14,
                    paddingHorizontal: 28,
                    borderRadius: 30,
                    elevation: 5,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                {addingSticker ? (
                  <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
                ) : (
                  <Text style={{ fontSize: 18, marginRight: 8 }}>⭐</Text>
                )}
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>
                  {addingSticker ? "Ekleniyor…" : "Çıkartmayı Ekle"}
                </Text>
              </Pressable>
            ) : (
              /* Galeriye Kaydet butonu */
              <Pressable
                onPress={handleSaveToGallery}
                disabled={saving}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#df6b83",
                    paddingVertical: 14,
                    paddingHorizontal: 28,
                    borderRadius: 30,
                    elevation: 5,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
                ) : (
                  <MaterialIcons name="file-download" size={22} color="white" style={{ marginRight: 8 }} />
                )}
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>
                  {saving ? "Kaydediliyor…" : "Galeriye Kaydet"}
                </Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Paket Seçici Alt Modal */}
      <Modal
        visible={showPackPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPackPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
          onPress={() => setShowPackPicker(false)}
        >
          <Pressable style={{ backgroundColor: "#1a1a2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }} onPress={() => {}}>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 16, textAlign: "center" }}>
              Paketi Seç
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {packs.map((pack) => (
                <TouchableOpacity
                  key={pack.id}
                  onPress={() => handleAddToPack(pack.id, pack.name)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    marginBottom: 8,
                    backgroundColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>⭐</Text>
                  <View>
                    <Text style={{ color: "white", fontWeight: "600", fontSize: 15 }}>{pack.name}</Text>
                    <Text style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{pack.stickers.length} çıkartma</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowPackPicker(false)}
              style={{ marginTop: 8, alignItems: "center", paddingVertical: 14 }}
            >
              <Text style={{ color: "#aaa", fontWeight: "600" }}>Vazgeç</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
