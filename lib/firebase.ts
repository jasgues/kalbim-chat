import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, signInAnonymously, signOut, type User as FirebaseUser } from "firebase/auth";
import { addDoc, arrayUnion, collection, doc, getDocs, getDoc, getFirestore, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { CHAT_PASSWORD } from "@/lib/chat-constants";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = Platform.OS === "web" ? getAuth(app) : (() => {
  const { getReactNativePersistence } = require("@firebase/auth/dist/rn/index.js") as { getReactNativePersistence: (storage: unknown) => any };
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
})();
export const firestore = getFirestore(app);

export type ChatUser = {
  id: string;
  name: "Elzem" | "Jasgues";
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  imageData?: string;
  imageMimeType?: string;
  stickerUrl?: string;
  isSticker?: boolean;
  createdAt: Date;
  readBy: string[];
  deleted?: boolean;
};

const usersCollection = collection(firestore, "kalbim_users");
const messagesCollection = collection(firestore, "kalbim_messages");
const presenceCollection = collection(firestore, "kalbim_presence");

export async function signInChatUser(name: ChatUser["name"], password: string): Promise<ChatUser> {
  if (password !== CHAT_PASSWORD) throw new Error("Ortak şifre hatalı.");
  const credential = auth.currentUser ?? (await signInAnonymously(auth)).user;
  await Promise.race([
    setDoc(doc(usersCollection, credential.uid), { name, updatedAt: serverTimestamp() }, { merge: true }),
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]).catch(() => undefined);
  return { id: credential.uid, name };
}

export async function loadChatUser(firebaseUser: FirebaseUser | null): Promise<ChatUser | null> {
  if (!firebaseUser) return null;
  const snapshot = await getDoc(doc(usersCollection, firebaseUser.uid));
  const name = snapshot.data()?.name;
  return name === "Elzem" || name === "Jasgues" ? { id: firebaseUser.uid, name } : null;
}

export async function signOutChatUser() {
  await signOut(auth);
}

function mapMessage(snapshot: { id: string; data: () => DocumentData }): ChatMessage {
  const data = snapshot.data();
  const timestamp = data.createdAt?.toDate?.() ?? new Date();
  const rawBody = data.body ?? "";
  const isSticker = data.isSticker === true || (typeof rawBody === "string" && rawBody.startsWith("[sticker]"));
  let cleanBody = rawBody;
  let stickerUrlFromRemote: string | undefined = undefined;

  if (typeof rawBody === "string" && rawBody.startsWith("[sticker]:")) {
    stickerUrlFromRemote = rawBody.replace("[sticker]:", "");
    cleanBody = "";
  } else if (rawBody === "[sticker]") {
    cleanBody = "";
  }

  return {
    id: snapshot.id,
    senderId: data.senderId ?? "",
    senderName: data.senderName ?? "Sevgilim",
    body: cleanBody,
    imageData: data.imageData,
    imageMimeType: data.imageMimeType,
    stickerUrl: stickerUrlFromRemote,
    isSticker,
    createdAt: timestamp,
    readBy: Array.isArray(data.readBy) ? data.readBy : [],
    deleted: data.deleted === true,
  };
}

export function subscribeToMessages(onChange: (messages: ChatMessage[]) => void): Unsubscribe {
  const messagesQuery = query(messagesCollection, orderBy("createdAt", "desc"));
  return onSnapshot(messagesQuery, (snapshot) => onChange(snapshot.docs.map(mapMessage).filter((message) => !message.deleted)));
}

export async function sendChatMessage(user: ChatUser, body: string, imageData?: string, imageMimeType?: string) {
  await addDoc(messagesCollection, {
    senderId: user.id,
    senderName: user.name,
    body,
    ...(imageData ? { imageData, imageMimeType } : {}),
    createdAt: serverTimestamp(),
    readBy: [user.id],
  });
}

export async function sendChatSticker(user: ChatUser, stickerUrl: string) {
  const isBase64 = stickerUrl.startsWith("data:");
  let imageData: string | undefined = undefined;
  let imageMimeType: string | undefined = undefined;
  let body = "[sticker]";

  if (isBase64) {
    const parts = stickerUrl.split(",");
    const match = parts[0].match(/:(.*?);/);
    imageMimeType = match ? match[1] : "image/jpeg";
    imageData = parts[1];
  } else {
    body = `[sticker]:${stickerUrl}`;
  }

  await addDoc(messagesCollection, {
    senderId: user.id,
    senderName: user.name,
    body,
    ...(imageData ? { imageData, imageMimeType } : {}),
    createdAt: serverTimestamp(),
    readBy: [user.id],
  });
}

export async function markChatMessageRead(messageId: string, userId: string) {
  await updateDoc(doc(messagesCollection, messageId), { readBy: arrayUnion(userId) });
}

export async function deleteAllChatMessages() {
  const snapshot = await getDocs(messagesCollection);
  await Promise.all(snapshot.docs.map((item) => updateDoc(item.ref, { deleted: true })));
}

export async function setTyping(user: ChatUser, active: boolean) {
  await setDoc(doc(presenceCollection, user.id), { name: user.name, active, updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeToTyping(currentUserId: string, onChange: (name: string | null) => void): Unsubscribe {
  const presenceQuery = query(presenceCollection, where("active", "==", true));
  return onSnapshot(presenceQuery, (snapshot) => {
    const partner = snapshot.docs.find((item) => item.id !== currentUserId);
    onChange(partner?.data().name ?? null);
  });
}
