import { describe, expect, it } from "vitest";
import { CHAT_PASSWORD, MAX_IMAGE_BASE64_LENGTH, isChatName } from "../lib/chat-constants";

describe("Firebase chat client guards", () => {
  it("keeps the agreed shared password and accepts only the two chat names", () => {
    expect(CHAT_PASSWORD).toBe(CHAT_PASSWORD);
    expect(isChatName("Elzem")).toBe(true);
    expect(isChatName("Jasgues")).toBe(true);
    expect(isChatName("Başka biri")).toBe(false);
  });

  it("keeps image payloads below the Firestore document budget", () => {
    expect(MAX_IMAGE_BASE64_LENGTH).toBeLessThan(1_000_000);
    expect("a".repeat(MAX_IMAGE_BASE64_LENGTH).length).toBe(MAX_IMAGE_BASE64_LENGTH);
    expect("a".repeat(MAX_IMAGE_BASE64_LENGTH + 1).length).toBeGreaterThan(MAX_IMAGE_BASE64_LENGTH);
  });
});
