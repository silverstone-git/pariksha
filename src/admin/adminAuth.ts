// Admin sign-in for the deployed site: Google via Supabase (PKCE), then outsie's POST /admin/session
// checks the verified email against its allow-list (OUTSIE_ADMIN_EMAILS) and returns a 2-hour admin
// token. Nothing secret is typed into or shipped with this page; the token lives in sessionStorage,
// so it is gone when the tab closes.
import { API_BASE_URL } from "../utils";

const PKCE_KEY = "pariksha_admin_pkce";
const SESSION_KEY = "pariksha_admin_session";

export type AdminSession = { token: string; email: string; expires_at: string };

export const isAdminRoute = () => new URLSearchParams(window.location.search).has("admin");

export function getSession(): AdminSession | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as AdminSession | null;
    if (s && new Date(s.expires_at).getTime() > Date.now() + 30_000) return s;
  } catch { /* corrupt */ }
  sessionStorage.removeItem(SESSION_KEY);
  return null;
}

export function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function authHeaders(): Record<string, string> {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function startGoogleSignIn(): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/auth/providers`);
  const { supabase_url } = (await r.json()) as { supabase_url: string | null };
  if (!supabase_url) throw new Error("Google sign-in is not configured on the server");
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  sessionStorage.setItem(PKCE_KEY, verifier);
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: `${window.location.origin}/?admin=1`,
    code_challenge: challenge,
    code_challenge_method: "s256",
  });
  window.location.assign(`${supabase_url}/auth/v1/authorize?${params}`);
}

/** On return from Google: exchange ?code= for an admin session. Null when this isn't a callback. */
export async function completeSignIn(): Promise<AdminSession | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (!code && !providerError) return null;
  for (const k of ["code", "error", "error_code", "error_description", "state"]) url.searchParams.delete(k);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  const verifier = sessionStorage.getItem(PKCE_KEY);
  sessionStorage.removeItem(PKCE_KEY);
  if (providerError) throw new Error(providerError);
  if (!verifier) throw new Error("Sign-in session expired, please try again");
  const r = await fetch(`${API_BASE_URL}/admin/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });
  if (!r.ok) {
    let detail = r.status === 403 ? "This Google account is not an admin" : "Sign-in failed, please try again";
    try { const j = await r.json(); if (typeof j.detail === "string") detail = j.detail; } catch { /* not JSON */ }
    throw new Error(detail);
  }
  const s = (await r.json()) as AdminSession;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

/** fetch() to outsie with the admin token; a 401 drops the session so the UI asks to sign in again. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...authHeaders(), ...(init.headers || {}) },
  });
  if (r.status === 401) {
    signOut();
    window.dispatchEvent(new Event("pariksha-admin-signed-out"));
  }
  return r;
}
