import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { StickerPicker } from "@/components/sticker-picker";
import { ImageViewerModal } from "@/components/image-viewer-modal";
import { SettingsModal } from "@/components/settings-modal";
import { useAuth } from "@/hooks/use-auth";
import {
  ChatMessage,
  deleteAllChatMessages,
  markChatMessageRead,
  sendChatMessage,
  sendChatSticker,
  setTyping,
  subscribeToMessages,
  subscribeToTyping,
} from "@/lib/firebase";
import { compressImageForFirestore } from "@/lib/image-compression";
import { notifyOtherDevice, registerPushToken } from "@/lib/push-notifications";
import { getStickerSource, StickerItem } from "@/constants/stickers";
import { useChatTheme } from "@/contexts/ChatThemeContext";

const REMOTE_QUOTE_URL = process.env.EXPO_PUBLIC_QUOTE_URL || "https://jasgues.com.tr";
const FALLBACK_QUOTE = "Bugün de seni seçerdim.";

export default function HomeScreen() {
  const { theme, wallpaper } = useChatTheme();
  const { user, loading: authLoading, isAuthenticated, login, logout } = useAuth();
  const [loginName, setLoginName] = useState<"Elzem" | "Jasgues">("Elzem");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [dailyQuote, setDailyQuote] = useState<string>(FALLBACK_QUOTE);
  const [viewingImage, setViewingImage] = useState<{
    source: any;
    senderName?: string;
    timestamp?: string;
    isSticker?: boolean;
    stickerItem?: StickerItem;
  } | null>(null);
  const knownMessageIds = useRef<Set<string> | null>(null);

  // Uzak günlük mesajı yükle
  useEffect(() => {
    fetch(REMOTE_QUOTE_URL)
      .then((r) => r.text())
      .then((text) => {
        const cleaned = text.trim();
        if (cleaned) setDailyQuote(cleaned);
      })
      .catch(() => {
        // Ağ yoksa fallback kullan
      });
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setTypingName(null);
      return;
    }
    knownMessageIds.current = null;
    const unsubscribeMessages = subscribeToMessages((nextMessages) => {
      const previousIds = knownMessageIds.current;
      if (previousIds && Platform.OS !== "web") {
        const newMessages = nextMessages.filter(
          (message) => !previousIds.has(message.id) && message.senderId !== user.id
        );
        newMessages.forEach((message) => {
          // Bildirim sesi (banner/popup _layout.tsx'te kapatıldı — ön planda açıkken sessizce çalar)
          Notifications.scheduleNotificationAsync({
            content: {
              title: message.senderName,
              body: message.body || "Sana bir görsel gönderdi",
              sound: "default",
              data: { type: "chat", messageId: message.id },
            },
            trigger: null,
          }).catch(() => undefined);
        });
        // Yeni mesaj varsa titreşim — kısa iki nabız (WhatsApp tarzı)
        if (newMessages.length > 0) {
          Vibration.vibrate([0, 80, 60, 80]);
        }
      }
      knownMessageIds.current = new Set(nextMessages.map((message) => message.id));
      setMessages(nextMessages);
    });
    const unsubscribeTyping = subscribeToTyping(user.id, setTypingName);
    registerPushToken(user).catch(() => undefined);
    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      knownMessageIds.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    messages
      .filter((message) => message.senderId !== user.id && !message.readBy.includes(user.id))
      .forEach((message) => {
        markChatMessageRead(message.id, user.id).catch(() => undefined);
      });
  }, [messages, user]);

  useEffect(() => {
    const unreadCount = user
      ? messages.filter((message) => message.senderId !== user.id && !message.readBy.includes(user.id)).length
      : 0;
    Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
  }, [messages, user]);

  const submitLogin = async () => {
    setLoginBusy(true);
    setLoginError("");
    try {
      await login(loginName, loginPassword);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Giriş yapılamadı.");
    } finally {
      setLoginBusy(false);
    }
  };

  const submitText = async () => {
    const body = draft.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setDraft("");
    try {
      await setTyping(user, false);
      await sendChatMessage(user, body);
      notifyOtherDevice(user, body, "text").catch(() => undefined);
    } catch {
      setDraft(body);
      Alert.alert("Gönderilemedi", "Firebase bağlantısını kontrol edip tekrar dene.");
    } finally {
      setSending(false);
    }
  };

  const chooseImage = async () => {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Görsel göndermek için fotoğraf erişimine izin vermelisin.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.65,
      base64: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setSending(true);
    try {
      const asset = result.assets[0];
      const compressed = await compressImageForFirestore(asset.uri, asset.width);
      await sendChatMessage(user, "", compressed.base64, compressed.mimeType);
      notifyOtherDevice(user, "Sana bir görsel gönderdi", "image").catch(() => undefined);
    } catch {
      Alert.alert("Görsel gönderilemedi", "Görsel otomatik olarak küçültülemedi. Daha küçük bir görsel seçip tekrar dene.");
    } finally {
      setSending(false);
    }
  };

  const handleSelectSticker = async (sticker: StickerItem) => {
    Keyboard.dismiss();
    setShowStickers(false);
    if (!user) {
      Alert.alert("Giriş Gerekli", "Çıkartma gönderebilmek için giriş yapmış olmalısınız.");
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      const payload = sticker.isCustom && sticker.url ? sticker.url : sticker.url || sticker.id;
      await sendChatSticker(user, payload);
      notifyOtherDevice(user, "Sana bir çıkartma gönderdi 🧸", "image").catch(() => undefined);
    } catch (err: any) {
      Alert.alert("Gönderilemedi", err?.message || "Çıkartma şu anda gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  const clearMessages = () => {
    Alert.alert("Mesajları temizle", "İkinizin tüm mesajları kalıcı olarak silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Tümünü sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAllChatMessages();
            await Notifications.setBadgeCountAsync(0);
          } catch {
            Alert.alert("Silinemedi", "Mesajlar şu an temizlenemedi. Tekrar dene.");
          }
        },
      },
    ]);
  };

  // Arka plan belirleme
  const chatBackground =
    wallpaper.type === "color"
      ? wallpaper.color
      : theme.background;

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center px-8" containerStyle={{ backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
        <Text style={{ color: theme.muted, marginTop: 16, textAlign: "center" }}>Özel sohbet hazırlanıyor…</Text>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <ScreenContainer
        edges={["top", "left", "right", "bottom"]}
        containerStyle={{ backgroundColor: theme.background }}
        className="items-center justify-center px-8"
      >
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
        <View style={{ height: 96, width: 96, alignItems: "center", justifyContent: "center", borderRadius: 48, backgroundColor: theme.primaryLight }}>
          <Text style={{ fontSize: 56, color: theme.primary }}>♡</Text>
        </View>
        <Text style={{ marginTop: 28, fontSize: 36, fontWeight: "bold", color: theme.foreground }}>Kalbim</Text>
        <Text style={{ marginTop: 8, textAlign: "center", fontSize: 16, lineHeight: 24, color: theme.muted }}>
          Sadece ikiniz için küçük, sıcak bir sohbet alanı.
        </Text>
        <View style={{ marginTop: 28, width: "100%", maxWidth: 320, flexDirection: "row", gap: 8 }}>
          {(["Elzem", "Jasgues"] as const).map((name) => (
            <Pressable
              key={name}
              onPress={() => setLoginName(name)}
              style={({ pressed }) => [{
                flex: 1, borderRadius: 22, paddingVertical: 12, alignItems: "center",
                backgroundColor: loginName === name ? theme.primary : theme.primaryLight,
              }, pressed && { opacity: 0.85 }]}
            >
              <Text style={{ fontWeight: "bold", color: loginName === name ? "white" : theme.primary }}>{name}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={loginPassword}
          onChangeText={setLoginPassword}
          onSubmitEditing={submitLogin}
          placeholder="Ortak şifre"
          placeholderTextColor={theme.muted}
          secureTextEntry
          style={{
            marginTop: 12, width: "100%", maxWidth: 320, borderRadius: 24,
            backgroundColor: theme.surface, paddingHorizontal: 20, paddingVertical: 16,
            textAlign: "center", fontSize: 15, color: theme.foreground,
          }}
        />
        <Pressable
          onPress={submitLogin}
          disabled={loginBusy || !loginPassword}
          style={({ pressed }) => [{
            marginTop: 14, width: "100%", maxWidth: 320, borderRadius: 28,
            backgroundColor: loginPassword ? theme.primary : theme.border,
            paddingVertical: 16, alignItems: "center",
          }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
        >
          <Text style={{ fontWeight: "bold", color: "white", fontSize: 16 }}>
            {loginBusy ? "Açılıyor…" : "Sohbete gir"}
          </Text>
        </Pressable>
        {loginError ? (
          <Text style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#d85c6e" }}>{loginError}</Text>
        ) : null}
        <Text style={{ marginTop: 20, textAlign: "center", fontSize: 12, lineHeight: 20, color: theme.muted }}>
          İki kişilik özel alanınıza hoş geldiniz.
        </Text>
      </ScreenContainer>
    );
  }

  const chatContent = (
    <ScreenContainer
      edges={["top", "left", "right", "bottom"]}
      containerStyle={{ backgroundColor: chatBackground }}
      className="px-4"
    >
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />
      <KeyboardAvoidingView className="flex-1" behavior={undefined}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 2, color: theme.muted }}>
              BİZİM KÜÇÜK DÜNYAMIZ
            </Text>
            <Text style={{ marginTop: 2, fontSize: 28, fontWeight: "bold", color: theme.foreground }}>
              Kalbim <Text style={{ color: theme.primary }}>♡</Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => setShowSettings(true)}
              style={({ pressed }) => [{
                height: 38, borderRadius: 19, backgroundColor: theme.primaryLight,
                paddingHorizontal: 12, justifyContent: "center",
              }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </Pressable>
            <Pressable
              onPress={clearMessages}
              style={({ pressed }) => [{
                height: 38, borderRadius: 19, backgroundColor: theme.primaryLight,
                paddingHorizontal: 12, justifyContent: "center",
              }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary }}>Temizle</Text>
            </Pressable>
            <Pressable
              onPress={logout}
              style={({ pressed }) => [{
                height: 38, borderRadius: 19, backgroundColor: theme.primaryLight,
                paddingHorizontal: 14, justifyContent: "center",
              }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary }}>Çıkış</Text>
            </Pressable>
          </View>
        </View>

        {/* Günlük mesaj kartı */}
        <View style={{
          marginBottom: 12, borderRadius: 20, backgroundColor: theme.primaryLight,
          paddingHorizontal: 16, paddingVertical: 14,
          borderLeftWidth: 4, borderLeftColor: theme.primary,
        }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, lineHeight: 22 }}>
            {dailyQuote}
          </Text>
        </View>

        {/* Yazıyor göstergesi */}
        {typingName ? (
          <View style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 }}>
            <View style={{ marginRight: 6, height: 8, width: 8, borderRadius: 4, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 12, fontStyle: "italic", color: theme.muted }}>{typingName} yazıyor…</Text>
          </View>
        ) : null}

        {/* Mesaj listesi */}
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingTop: 90, paddingBottom: showStickers ? 360 : 80 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 80 }}>
              <Text style={{ fontSize: 52, color: theme.primary }}>♡</Text>
              <Text style={{ marginTop: 16, textAlign: "center", fontSize: 16, color: theme.muted }}>
                İlk mesajı sen bırak…
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.senderId === user.id;
            const isSticker = item.isSticker === true;
            const image = item.imageData
              ? `data:${item.imageMimeType ?? "image/jpeg"};base64,${item.imageData}`
              : item.body?.startsWith("http")
              ? item.body
              : null;

            const stickerSource = isSticker
              ? getStickerSource(item.stickerUrl || item.body, item.imageData, item.imageMimeType)
              : null;

            // Build sticker item for "add to pack"
            const stickerItemForViewer: StickerItem | undefined = isSticker
              ? {
                  id: item.id,
                  url: item.stickerUrl || (item.imageData ? `data:${item.imageMimeType ?? "image/jpeg"};base64,${item.imageData}` : undefined),
                  title: "Alınan Çıkartma",
                  isCustom: false,
                }
              : undefined;

            if (isSticker && stickerSource) {
              return (
                <View style={{ marginVertical: 2, maxWidth: "75%", alignSelf: mine ? "flex-end" : "flex-start", alignItems: mine ? "flex-end" : "flex-start" }}>
                  {!mine && (
                    <Text style={{ marginBottom: 4, fontSize: 11, fontWeight: "600", color: theme.primary }}>
                      {item.senderName}
                    </Text>
                  )}
                  <View style={{ position: "relative" }}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setViewingImage({
                          source: stickerSource,
                          senderName: item.senderName,
                          timestamp: item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          isSticker: true,
                          stickerItem: stickerItemForViewer,
                        });
                      }}
                    >
                      <Image
                        source={stickerSource}
                        style={{ width: 140, height: 140 }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <View style={{
                      position: "absolute", bottom: 4, right: 4,
                      flexDirection: "row", alignItems: "center", gap: 3,
                      borderRadius: 10, backgroundColor: "rgba(0,0,0,0.4)",
                      paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 10, color: "white" }}>
                        {item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      {mine && (
                        <Text style={{ fontSize: 10, color: "#ffb6c1" }}>
                          {item.readBy.length > 1 ? "✓✓" : "✓"}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View style={{ maxWidth: "86%", alignSelf: mine ? "flex-end" : "flex-start" }}>
                <View style={{
                  borderRadius: 22,
                  borderBottomRightRadius: mine ? 6 : 22,
                  borderBottomLeftRadius: mine ? 22 : 6,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: mine ? theme.bubbleMine : theme.bubbleOther,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 2,
                }}>
                  {!mine && (
                    <Text style={{ marginBottom: 4, fontSize: 11, fontWeight: "700", color: theme.primary }}>
                      {item.senderName}
                    </Text>
                  )}
                  {image && (
                    <Pressable
                      onPress={() => {
                        setViewingImage({
                          source: { uri: image },
                          senderName: item.senderName,
                          timestamp: item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          isSticker: false,
                        });
                      }}
                      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                    >
                      <Image
                        source={{ uri: image }}
                        style={{ marginBottom: 6, height: 192, width: 220, borderRadius: 14 }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  )}
                  {item.body ? (
                    <Text style={{ fontSize: 15, lineHeight: 22, color: mine ? theme.bubbleMineText : theme.bubbleOtherText }}>
                      {item.body}
                    </Text>
                  ) : null}
                </View>
                <View style={{ marginTop: 3, flexDirection: "row", alignItems: "center", gap: 4, justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <Text style={{ fontSize: 10, color: theme.muted }}>
                    {item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {mine && (
                    <Text style={{ fontSize: 10, color: theme.primary }}>
                      {item.readBy.length > 1 ? "✓✓ Okundu" : "✓ Gönderildi"}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />

        {/* Alt Mesaj Çubuğu */}
        <View style={{ position: "absolute", left: -16, right: -16, bottom: keyboardHeight, zIndex: 999, elevation: 20 }}>
          <View style={{
            flexDirection: "row", alignItems: "flex-end", gap: 8,
            borderTopWidth: 1, borderTopColor: theme.inputBorder,
            backgroundColor: theme.headerBg, paddingHorizontal: 12, paddingVertical: 10,
          }}>
            {/* Fotoğraf */}
            <Pressable
              onPress={() => { setShowStickers(false); chooseImage(); }}
              disabled={sending}
              style={({ pressed }) => [{
                height: 46, width: 46, alignItems: "center", justifyContent: "center",
                borderRadius: 23, backgroundColor: theme.primaryLight,
              }, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="photo" size={22} color={theme.primary} />
            </Pressable>

            {/* Sticker */}
            <Pressable
              onPress={() => { Keyboard.dismiss(); setShowStickers((prev) => !prev); }}
              disabled={sending}
              style={({ pressed }) => [{
                height: 46, width: 46, alignItems: "center", justifyContent: "center",
                borderRadius: 23, backgroundColor: showStickers ? theme.primary : theme.primaryLight,
              }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 22 }}>{showStickers ? "⌨️" : "🧸"}</Text>
            </Pressable>

            {/* Mesaj girdi alanı */}
            <TextInput
              value={draft}
              onFocus={() => setShowStickers(false)}
              onChangeText={(value) => {
                setDraft(value);
                setTyping(user, Boolean(value.trim())).catch(() => undefined);
              }}
              onSubmitEditing={submitText}
              placeholder="Kalbine ne söylemek istersin?"
              placeholderTextColor={theme.muted}
              multiline
              style={{
                flex: 1, maxHeight: 112, borderRadius: 24,
                backgroundColor: theme.inputBackground, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 15, color: theme.foreground,
              }}
            />

            {/* Gönder */}
            <Pressable
              onPress={submitText}
              disabled={!draft.trim() || sending}
              style={({ pressed }) => [{
                height: 46, width: 46, alignItems: "center", justifyContent: "center",
                borderRadius: 23, backgroundColor: draft.trim() ? theme.primary : theme.border,
              }, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <IconSymbol name="paperplane.fill" size={20} color="white" />
            </Pressable>
          </View>

          {/* Sticker Paneli */}
          {showStickers && (
            <StickerPicker onSelectSticker={handleSelectSticker} onClose={() => setShowStickers(false)} />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Görseli büyük görüntüle */}
      <ImageViewerModal
        visible={Boolean(viewingImage)}
        imageSource={viewingImage?.source ?? null}
        senderName={viewingImage?.senderName}
        timestamp={viewingImage?.timestamp}
        isSticker={viewingImage?.isSticker}
        stickerItem={viewingImage?.stickerItem}
        onClose={() => setViewingImage(null)}
      />

      {/* Ayarlar modali */}
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </ScreenContainer>
  );

  // Duvar kağıdı görseli varsa ImageBackground ile sar
  if (wallpaper.type === "image") {
    return (
      <ImageBackground
        source={{ uri: wallpaper.uri }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {chatContent}
      </ImageBackground>
    );
  }

  return chatContent;
}
