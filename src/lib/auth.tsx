import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthUser } from "./types";
import { startHeartbeat, stopHeartbeat } from "./presence";
import { v2api } from "./v2api";

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string, role: "admin" | "player" | "management" | "team") => Promise<boolean>;
  logout: () => void;
  updateAdminProfile: (updates: { aliasName?: string }) => void;
  getAdminAlias: () => string;
  isAdmin: boolean;
  isPlayer: boolean;
  isManagement: boolean;
  isTeam: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  updateAdminProfile: () => {},
  getAdminAlias: () => "Administrator",
  isAdmin: false,
  isPlayer: false,
  isManagement: false,
  isTeam: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const SESSION_KEY = 'cricketUser';
  const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
  const IDLE_TIMEOUT_MS = 1000 * 60 * 30;
  const ADMIN_USERNAME = 'admin';
  const getAdminAlias = () => localStorage.getItem('adminAlias') || 'Administrator';

  const persistSession = (nextUser: AuthUser) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: nextUser,
      issuedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      lastActivityAt: Date.now(),
    }));
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
  };

  const createAdminSession = (displayName?: string) => {
    const u: AuthUser = { type: "admin", username: ADMIN_USERNAME, name: getAdminAlias() || displayName || 'Administrator' };
    setUser(u);
    persistSession(u);
    startHeartbeat("admin");
    return true;
  };

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const storedUser: AuthUser = parsed?.user || parsed;
        const expiresAt = Number(parsed?.expiresAt || 0);
        const lastActivityAt = Number(parsed?.lastActivityAt || 0);
        const now = Date.now();
        const isExpired = !!expiresAt && now > expiresAt;
        const isIdleExpired = !!lastActivityAt && now - lastActivityAt > IDLE_TIMEOUT_MS;
        if (isExpired || isIdleExpired) {
          clearSession();
          stopHeartbeat();
          return;
        }
        setUser(storedUser);
        persistSession(storedUser);
        const userId = storedUser.type === "admin" ? "admin" : storedUser.player_id || storedUser.management_id;
        if (userId) startHeartbeat(userId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const onActivity = () => {
      persistSession(user);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity));

    const timer = window.setInterval(() => {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored);
        const expiresAt = Number(parsed?.expiresAt || 0);
        const lastActivityAt = Number(parsed?.lastActivityAt || 0);
        const now = Date.now();
        if ((expiresAt && now > expiresAt) || (lastActivityAt && now - lastActivityAt > IDLE_TIMEOUT_MS)) {
          logout();
        }
      } catch {
        logout();
      }
    }, 30000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      window.clearInterval(timer);
    };
  }, [user]);

  const login = async (username: string, password: string, role: "admin" | "player" | "management" | "team"): Promise<boolean> => {
    const response = await v2api.login(username, password, role);
    if (!response.success || !response.user) {
      return false;
    }
    const resolvedType = response.user.type || role;
    if (resolvedType === 'admin') {
      return createAdminSession(response.user.name);
    }

    const u: AuthUser = {
      type: resolvedType,
      username: response.user.username,
      player_id: response.user.player_id,
      management_id: response.user.management_id,
      team_id: response.user.team_id,
      team_name: response.user.team_name,
      name: response.user.name,
      designation: response.user.designation,
      role: response.user.role,
      authority_level: Number(response.user.authority_level || 0),
    };
    setUser(u);
    persistSession(u);
    const heartbeatUserId = u.player_id || u.management_id || u.team_id || u.username;
    startHeartbeat(heartbeatUserId);
    return true;
  };

  const logout = () => {
    stopHeartbeat();
    setUser(null);
    clearSession();
  };

  const updateAdminProfile = (updates: { aliasName?: string }) => {
    if (updates.aliasName !== undefined) {
      localStorage.setItem('adminAlias', updates.aliasName.trim() || 'Administrator');
    }
    setUser((prev) => {
      if (!prev || prev.type !== 'admin') return prev;
      const updated: AuthUser = { ...prev, name: getAdminAlias() };
      persistSession(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateAdminProfile,
        getAdminAlias,
        isAdmin: user?.type === "admin",
        isPlayer: user?.type === "player",
        isManagement: user?.type === "management",
        isTeam: user?.type === "team",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
