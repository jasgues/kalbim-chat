import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

type ApiResponse<T> = { data?: T; error?: string };

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((options.headers as Record<string, string>) || {}) };
  const sessionToken = await Auth.getSessionToken();
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;
  const response = await fetch(url, { ...options, headers, credentials: "include" });
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try { const json = JSON.parse(text); message = json.error || json.message || text; } catch { /* plain text */ }
    throw new Error(message || `API call failed: ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type");
  return contentType?.includes("application/json") ? await response.json() as T : ({} as T);
}

export async function login(name: string, password: string): Promise<{ sessionToken: string; user: any }> {
  return apiCall("/api/auth/login", { method: "POST", body: JSON.stringify({ name, password }) });
}

export async function logout(): Promise<void> { await apiCall<void>("/api/auth/logout", { method: "POST" }); }

export async function getMe(): Promise<{ id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; lastSignedIn: string } | null> {
  try { const result = await apiCall<{ user: any }>("/api/auth/me"); return result.user || null; } catch { return null; }
}

export async function exchangeOAuthCode(code: string, state: string): Promise<{ sessionToken: string; user: any }> {
  const params = new URLSearchParams({ code, state });
  const result = await apiCall<{ app_session_id: string; user: any }>(`/api/oauth/mobile?${params.toString()}`);
  return { sessionToken: result.app_session_id, user: result.user };
}

export async function establishSession(token: string): Promise<boolean> {
  try { await apiCall("/api/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); return true; } catch { return false; }
}
