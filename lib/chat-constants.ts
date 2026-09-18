export const CHAT_PASSWORD = process.env.EXPO_PUBLIC_CHAT_PASSWORD || "your_chat_password_here";
export const MAX_IMAGE_BASE64_LENGTH = 700000;

export function isChatName(value: unknown): value is "Elzem" | "Jasgues" {
  return value === "Elzem" || value === "Jasgues";
}
