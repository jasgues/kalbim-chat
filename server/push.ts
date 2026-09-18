type PushMessage = { to: string; title: string; body: string; data?: Record<string, string> };

export async function sendPushNotification(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
  const validTokens = tokens.filter((token) => token.startsWith("ExponentPushToken["));
  if (!validTokens.length) return;
  const messages: PushMessage[] = validTokens.map((to) => ({ to, title, body, data }));
  try {
    await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(messages) });
  } catch (error) {
    console.warn("[Push] Notification delivery failed:", error);
  }
}
