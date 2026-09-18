import { getUserByOpenId, upsertUser } from "../db";

const ACCOUNTS = {
  Elzem: { openId: "simple-elzem", email: "elzem@kalbim.local" },
  Jasgues: { openId: "simple-jasgues", email: "jasgues@kalbim.local" },
} as const;
const SHARED_PASSWORD = process.env.CHAT_PASSWORD || "your_chat_password_here";

type AccountName = keyof typeof ACCOUNTS;

export function isAccountName(value: string): value is AccountName {
  return value in ACCOUNTS;
}

export async function signInSimple(name: string, password: string) {
  if (!isAccountName(name) || password !== SHARED_PASSWORD) return null;
  const account = ACCOUNTS[name];
  await upsertUser({ openId: account.openId, name, email: account.email, loginMethod: "simple" });
  return getUserByOpenId(account.openId);
}

export function createSimpleToken(name: AccountName) {
  return `kalbim-simple-${name.toLowerCase()}`;
}

export async function authenticateSimpleToken(token: string) {
  const match = /^kalbim-simple-(elzem|jasgues)$/.exec(token);
  if (!match) return null;
  const name = match[1] === "elzem" ? "Elzem" : "Jasgues";
  const account = ACCOUNTS[name as AccountName];
  return getUserByOpenId(account.openId);
}
