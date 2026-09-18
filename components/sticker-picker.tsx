import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BUILT_IN_STICKER_CATEGORIES,
  StickerItem,
  StickerPack,
  addStickerToPackFromGallery,
  createCustomStickerPack,
  deleteCustomStickerPack,
  deleteStickerFromPack,
  getCustomStickerPacks,
  renameCustomStickerPack,
} from "@/constants/stickers";
import { useChatTheme } from "@/contexts/ChatThemeContext";

interface StickerPickerProps {
  onSelectSticker: (sticker: StickerItem) => void;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_SIZE = (SCREEN_WIDTH - 32) / 4;

export function StickerPicker({ onSelectSticker, onClose }: StickerPickerProps) {
  const { theme } = useChatTheme();
  const [activeTab, setActiveTab] = useState<string>("bubu_dudu");
  const [customPacks, setCustomPacks] = useState<StickerPack[]>([]);
  const [addingSticker, setAddingSticker] = useState<string | null>(null); // packId being added to
  const [showCreatePackModal, setShowCreatePackModal] = useState(false);
  const [newPackName, setNewPackName] = useState("");
  const [renameTarget, setRenameTarget] = useState<StickerPack | null>(null);
  const [renameText, setRenameText] = useState("");

  const loadPacks = useCallback(async () => {
    const packs = await getCustomStickerPacks();
    setCustomPacks(packs);
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const handleAddStickerToActivePack = async () => {
    const activePack = customPacks.find((p) => p.id === activeTab);
    if (!activePack) {
      // Eğer hiç paket yoksa önce oluştur
      if (customPacks.length === 0) {
        setShowCreatePackModal(true);
        return;
      }
      return;
    }
    setAddingSticker(activePack.id);
    try {
      const added = await addStickerToPackFromGallery(activePack.id);
      if (added) {
        await loadPacks();
        Alert.alert("✨", "Çıkartma pakete eklendi.");
      }
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Çıkartma eklenemedi.");
    } finally {
      setAddingSticker(null);
    }
  };

  const handleCreatePack = async () => {
    const name = newPackName.trim();
    if (!name) return;
    await createCustomStickerPack(name);
    setNewPackName("");
    setShowCreatePackModal(false);
    await loadPacks();
    // Yeni oluşturulan paketi aktif yap
    const packs = await getCustomStickerPacks();
    if (packs.length > 0) setActiveTab(packs[packs.length - 1].id);
  };

  const handleDeletePack = (pack: StickerPack) => {
    Alert.alert("Paketi Sil", `"${pack.name}" paketi ve tüm çıkartmaları silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await deleteCustomStickerPack(pack.id);
          await loadPacks();
          setActiveTab("bubu_dudu");
        },
      },
    ]);
  };

  const handleLongPressTab = (pack: StickerPack) => {
    Alert.alert(pack.name, "Ne yapmak istiyorsun?", [
      { text: "Yeniden Adlandır", onPress: () => { setRenameTarget(pack); setRenameText(pack.name); } },
      { text: "Paketi Sil", style: "destructive", onPress: () => handleDeletePack(pack) },
      { text: "Vazgeç", style: "cancel" },
    ]);
  };

  const handleRenameConfirm = async () => {
    if (!renameTarget || !renameText.trim()) return;
    await renameCustomStickerPack(renameTarget.id, renameText.trim());
    setRenameTarget(null);
    await loadPacks();
  };

  const handleDeleteSticker = (pack: StickerPack, sticker: StickerItem) => {
    Alert.alert("Çıkartmayı Sil", "Bu çıkartmayı paketten kaldırmak istiyor musun?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await deleteStickerFromPack(pack.id, sticker.id);
          await loadPacks();
        },
      },
    ]);
  };

  const bubuCategory = BUILT_IN_STICKER_CATEGORIES[0];
  const currentBuiltIn = activeTab === "bubu_dudu" ? bubuCategory?.stickers ?? [] : [];
  const activePack = customPacks.find((p) => p.id === activeTab);
  const currentStickers: StickerItem[] = activeTab === "bubu_dudu" ? currentBuiltIn : activePack?.stickers ?? [];
  const isCustomTab = activeTab !== "bubu_dudu";

  return (
    <View style={{ height: 340, backgroundColor: theme.stickerBg, borderTopWidth: 1, borderTopColor: theme.border }}>
      {/* Üst sekme çubuğu */}
      <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 8, paddingVertical: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ flexDirection: "row", gap: 6, alignItems: "center" }}
        >
          {/* Bubu & Dudu sekmesi */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab("bubu_dudu")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: activeTab === "bubu_dudu" ? theme.tabActive : theme.tabInactive,
              elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16 }}>🐼</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: activeTab === "bubu_dudu" ? theme.tabActiveText : theme.tabInactiveText }}>
              Bubu & Dudu
            </Text>
          </TouchableOpacity>

          {/* Özel paket sekmeleri */}
          {customPacks.map((pack) => {
            const isActive = activeTab === pack.id;
            return (
              <TouchableOpacity
                key={pack.id}
                activeOpacity={0.7}
                onPress={() => setActiveTab(pack.id)}
                onLongPress={() => handleLongPressTab(pack)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: isActive ? theme.tabActive : theme.tabInactive,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 14 }}>⭐</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: isActive ? theme.tabActiveText : theme.tabInactiveText }}>
                  {pack.name} ({pack.stickers.length})
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Yeni Paket Oluştur */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowCreatePackModal(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: theme.primary,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "bold", color: theme.primary }}>＋ Paket</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Aktif custom pakete sticker ekle butonu */}
        {isCustomTab && activePack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleAddStickerToActivePack}
            disabled={addingSticker !== null}
            style={{ marginLeft: 6, borderRadius: 16, backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 6 }}
          >
            {addingSticker ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "white" }}>+ Ekle</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Kapat */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={{ marginLeft: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 13, fontWeight: "bold", color: theme.primary }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Sticker Izgarası */}
      <FlatList
        data={currentStickers}
        keyExtractor={(item) => item.id}
        numColumns={4}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ padding: 8, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isCustomTab ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 36 }}>🎨</Text>
              <Text style={{ marginTop: 8, textAlign: "center", fontSize: 14, fontWeight: "600", color: theme.foreground }}>
                Bu pakette henüz çıkartma yok
              </Text>
              <Text style={{ marginTop: 4, textAlign: "center", fontSize: 12, color: theme.muted }}>
                Yukarıdaki "+ Ekle" butonuna dokun
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => onSelectSticker(item)}
            onLongPress={() => {
              if (isCustomTab && activePack) {
                handleDeleteSticker(activePack, item);
              }
            }}
            style={{ width: ITEM_SIZE, height: ITEM_SIZE, alignItems: "center", justifyContent: "center", padding: 4 }}
          >
            <Image
              source={item.source ?? { uri: item.url }}
              style={{ width: ITEM_SIZE - 12, height: ITEM_SIZE - 12, borderRadius: 10 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      />

      {/* Paket Oluştur Modali */}
      <Modal visible={showCreatePackModal} transparent animationType="fade" onRequestClose={() => setShowCreatePackModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }} onPress={() => setShowCreatePackModal(false)}>
          <Pressable style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 24, width: 300 }} onPress={() => {}}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: theme.foreground, marginBottom: 16 }}>Yeni Paket Oluştur</Text>
            <TextInput
              value={newPackName}
              onChangeText={setNewPackName}
              placeholder="Paket adı (örn: Favorilerim)"
              placeholderTextColor={theme.muted}
              autoFocus
              style={{ borderRadius: 12, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: theme.foreground, marginBottom: 16 }}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setShowCreatePackModal(false); setNewPackName(""); }}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: theme.background }}
              >
                <Text style={{ fontWeight: "600", color: theme.muted }}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePack}
                disabled={!newPackName.trim()}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: newPackName.trim() ? theme.primary : theme.border }}
              >
                <Text style={{ fontWeight: "bold", color: "white" }}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Yeniden Adlandır Modali */}
      <Modal visible={!!renameTarget} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }} onPress={() => setRenameTarget(null)}>
          <Pressable style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 24, width: 300 }} onPress={() => {}}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: theme.foreground, marginBottom: 16 }}>Paketi Yeniden Adlandır</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Yeni paket adı"
              placeholderTextColor={theme.muted}
              autoFocus
              style={{ borderRadius: 12, backgroundColor: theme.background, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: theme.foreground, marginBottom: 16 }}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRenameTarget(null)}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: theme.background }}
              >
                <Text style={{ fontWeight: "600", color: theme.muted }}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRenameConfirm}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: theme.primary }}
              >
                <Text style={{ fontWeight: "bold", color: "white" }}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
