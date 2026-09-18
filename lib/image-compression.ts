import * as ImageManipulator from "expo-image-manipulator";
import { MAX_IMAGE_BASE64_LENGTH } from "@/lib/chat-constants";

const MAX_WIDTHS = [1600, 1280, 1024, 800, 640, 480];
const QUALITIES = [0.78, 0.65, 0.52, 0.4, 0.3];

export async function compressImageForFirestore(uri: string, originalWidth?: number) {
  for (const maxWidth of MAX_WIDTHS) {
    const width = originalWidth ? Math.min(originalWidth, maxWidth) : maxWidth;
    for (const compress of QUALITIES) {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width } }],
        { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (result.base64 && result.base64.length <= MAX_IMAGE_BASE64_LENGTH) {
        return { base64: result.base64, mimeType: "image/jpeg", width: result.width, height: result.height };
      }
    }
  }
  throw new Error("Görsel ücretsiz Firebase sınırına sığdırılamadı");
}
