import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createMessage, getOtherPushTokens, getTypingUsers, listMessages, markMessagesRead, savePushToken, setTyping } from "./db";
import { storagePut } from "./storage";
import { sendPushNotification } from "./push";
import { createSimpleToken, signInSimple } from "./_core/simpleAuth";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure.input(z.object({ name: z.enum(["Elzem", "Jasgues"]), password: z.string() })).mutation(async ({ input }) => {
      const user = await signInSimple(input.name, input.password);
      if (!user) throw new Error("Kullanıcı adı veya şifre hatalı.");
      return { sessionToken: createSimpleToken(input.name), user };
    }),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  chat: router({
    list: protectedProcedure.query(({ ctx }) => listMessages()),
    markRead: protectedProcedure.mutation(({ ctx }) => markMessagesRead(ctx.user.id)),
    typing: protectedProcedure.input(z.object({ active: z.boolean() })).mutation(({ ctx, input }) => setTyping(ctx.user.id, input.active)),
    presence: protectedProcedure.query(({ ctx }) => getTypingUsers(ctx.user.id)),
    registerPushToken: protectedProcedure.input(z.object({ token: z.string().min(20).max(512) })).mutation(({ ctx, input }) => savePushToken(ctx.user.id, input.token)),
    sendText: protectedProcedure.input(z.object({ body: z.string().trim().min(1).max(4000) })).mutation(async ({ ctx, input }) => {
      const id = await createMessage({ senderId: ctx.user.id, senderName: ctx.user.name ?? "Sevgilim", body: input.body, imageUrl: null, imageKey: null, readAt: null });
      const recipients = await getOtherPushTokens(ctx.user.id);
      await sendPushNotification(recipients.flatMap((row) => row.pushToken ? [row.pushToken] : []), ctx.user.name ?? "Kalbim", input.body.slice(0, 120), { messageId: String(id) });
      return { id };
    }),
    sendImage: protectedProcedure.input(z.object({ base64: z.string().min(20), fileName: z.string().max(120).default("photo.jpg"), contentType: z.string().default("image/jpeg"), caption: z.string().max(400).optional() })).mutation(async ({ ctx, input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const uploaded = await storagePut(`kalbim-chat/${ctx.user.id}/${Date.now()}-${safeName}`, Buffer.from(input.base64, "base64"), input.contentType);
      const id = await createMessage({ senderId: ctx.user.id, senderName: ctx.user.name ?? "Sevgilim", body: input.caption ?? null, imageUrl: uploaded.url, imageKey: uploaded.key, readAt: null });
      const recipients = await getOtherPushTokens(ctx.user.id);
      await sendPushNotification(recipients.flatMap((row) => row.pushToken ? [row.pushToken] : []), ctx.user.name ?? "Kalbim", "Sana bir görsel gönderdi", { messageId: String(id) });
      return { id, url: uploaded.url };
    }),
  }),
});

export type AppRouter = typeof appRouter;
