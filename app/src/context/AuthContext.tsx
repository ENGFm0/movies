import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, loadToken } from "@/api/client";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthResponse {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On boot, restore the session if a token is stored.
  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        try {
          const { user } = await api<{ user: User }>("/api/auth/me");
          setUser(user);
        } catch {
          await setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    await setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api<AuthResponse>("/api/auth/register", {
        method: "POST",
        auth: false,
        body: { name, email, password },
      });
      await setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
