import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshMe: () => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "priceiq_token";
const USER_KEY  = "priceiq_user";
const BASE_URL  = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [token, setToken]             = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Persist helpers
  const persist = (tok: string, usr: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(USER_KEY, JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  };

  const clear = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  // On mount: restore from localStorage, validate with /me
  const refreshMe = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) { setAuthLoading(false); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (!res.ok) { clear(); setAuthLoading(false); return; }
      const { user: freshUser } = await res.json();
      setToken(storedToken);
      setUser(freshUser);
    } catch {
      clear();
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  // ── signUp ──────────────────────────────────────────────────────────────────
  const signUp = async (name: string, email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    persist(data.token, data.user);
  };

  // ── signIn ──────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    persist(data.token, data.user);
  };

  // ── loginWithToken (OAuth) ────────────────────────────────────────────────
  const loginWithToken = useCallback(async (newToken: string) => {
    // Just temporarily save the token to local storage without user object,
    // then call refreshMe which fetches the user and persists fully.
    localStorage.setItem(TOKEN_KEY, newToken);
    await refreshMe();
  }, [refreshMe]);

  // ── signOut ─────────────────────────────────────────────────────────────────
  const signOut = () => {
    clear();
    // Fire-and-forget logout endpoint (backend just ACKs)
    fetch(`${BASE_URL}/api/auth/logout`, { method: "POST" }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated: !!user, authLoading,
      signUp, signIn, signOut, refreshMe, loginWithToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
