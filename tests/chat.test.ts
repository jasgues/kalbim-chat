import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("chat router", () => {
  it("rejects unauthenticated message history access", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.chat.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects empty text before touching storage", async () => {
    const user: NonNullable<TrpcContext["user"]> = { id: 1, openId: "test", name: "Test", email: null, loginMethod: "test", role: "user", pushToken: null, typingUntil: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    const caller = appRouter.createCaller(context(user));
    await expect(caller.chat.sendText({ body: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
