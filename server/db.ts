import { and, desc, eq, isNull, ne, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertMessage, InsertUser, messages, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: user.lastSignedIn ?? new Date(), role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user") };
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn } });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0];
}

export async function listMessages(limit = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(messages).orderBy(desc(messages.createdAt)).limit(limit);
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data); return Number((result as unknown as { insertId: number }).insertId);
}

export async function markMessagesRead(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(messages).set({ readAt: new Date() }).where(and(ne(messages.senderId, userId), isNull(messages.readAt)));
}

export async function setTyping(userId: number, active: boolean) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ typingUntil: active ? new Date(Date.now() + 5000) : null }).where(eq(users.id, userId));
}

export async function getTypingUsers(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ id: users.id, name: users.name }).from(users).where(and(ne(users.id, userId), gt(users.typingUntil, new Date())));
}

export async function savePushToken(userId: number, pushToken: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ pushToken }).where(eq(users.id, userId));
}

export async function getOtherPushTokens(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ pushToken: users.pushToken }).from(users).where(and(ne(users.id, userId)));
}
