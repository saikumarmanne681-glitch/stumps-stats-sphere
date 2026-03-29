import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthUser } from "./types";
import { api } from "./googleSheets";
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

type AdminCredentialRow = {
  admin_id?: string;
  username?: string;
  password?: string;
  name?: string;
  status?: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const ADMIN_USERNAME = 'admin';
  const getAdminAlias = () => localStorage.getItem('adminAlias') || 'Administrator';

  const isActiveStatus = (status?: string) => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === '' || normalized === 'active';
  };

  const createAdminSession = (displayName?: string) => {
    const u: AuthUser = { type: "admin", username: ADMIN_USERNAME, name: getAdminAlias() || displayName || 'Administrator' };
    setUser(u);
    localStorage.setItem("cricketUser", JSON.stringify(u));
    startHeartbeat("admin");
    return true;
  };

  useEffect(() => {
    const stored = localStorage.getItem("cricketUser");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        const userId = parsed.type === "admin" ? "admin" : parsed.player_id || parsed.management_id;
        if (userId) startHeartbeat(userId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const login = async (username: string, password: string, role: "admin" | "player" | "management" | "team"): Promise<boolean> => {
    if (role === "admin") {
      const normalizedInput = username.toLowerCase().trim();
      const normalizedSecret = password.trim();

      // Primary admin source: dedicated ADMIN_CREDENTIALS sheet.
      const adminCredentials = await v2api.getAdminCredentials();
      const adminAccount = adminCredentials.find((row: AdminCredentialRow) => {
        if (!isActiveStatus(row.status)) return false;
        const usernameMatch = String(row.username || '').toLowerCase().trim() === normalizedInput;
        const idMatch = String(row.admin_id || '').toLowerCase().trim() === normalizedInput;
        return (usernameMatch || idMatch) && String(row.password || '').trim() === normalizedSecret;
      });
      if (adminAccount) {
        return createAdminSession(adminAccount.name);
      }

      // Backwards compatibility: allow admin users from MANAGEMENT_USERS.
      const managementUsers = await v2api.getManagementUsers();
      const adminUser = managementUsers.find((m) => {
        if (!isActiveStatus(m.status)) return false;
        const usernameMatch = String(m.username || '').toLowerCase().trim() === normalizedInput;
        const idMatch = String(m.management_id || '').toLowerCase().trim() === normalizedInput;
        const roleMatch = String(m.role || '').toLowerCase().includes('admin');
        return (usernameMatch || idMatch) && roleMatch && String(m.password || '').trim() === normalizedSecret;
      });
      if (adminUser) {
        return createAdminSession(adminUser.name);
      }
      return false;
    }

    if (role === "player") {
      const players = await api.getPlayers();
      const player = players.find(
        (p) =>
          String(p.username).toLowerCase().trim() === username.toLowerCase().trim() &&
          String(p.password).trim() === password.trim() &&
          String(p.status).toLowerCase() === "active",
      );
      if (player) {
        const u: AuthUser = { type: "player", username: player.username, player_id: player.player_id, name: player.name };
        setUser(u);
        localStorage.setItem("cricketUser", JSON.stringify(u));
        startHeartbeat(player.player_id);
        return true;
      }
      return false;
    }

    if (role === "team") {
      const teamUsers = await v2api.getTeamAccessUsers();
      const teamUser = teamUsers.find((t) => {
        if (!isActiveStatus(t.status)) return false;
        const normalizedInput = username.toLowerCase().trim();
        const usernameMatch = String(t.username || '').toLowerCase().trim() === normalizedInput;
        const teamNameMatch = String(t.team_name || '').toLowerCase().trim() === normalizedInput;
        const teamIdMatch = String(t.team_id || '').toLowerCase().trim() === normalizedInput;
        return (usernameMatch || teamNameMatch || teamIdMatch) && String(t.password || '').trim() === password.trim();
      });
      if (!teamUser) return false;
      const u: AuthUser = {
        type: "team",
        username: teamUser.username,
        team_id: teamUser.team_id,
        team_name: teamUser.team_name,
        name: teamUser.team_name,
      };
      setUser(u);
      localStorage.setItem("cricketUser", JSON.stringify(u));
      startHeartbeat(teamUser.team_id || teamUser.team_access_id);
      return true;
    }

    const managementUsers = await v2api.getManagementUsers();
    const normalizedInput = username.toLowerCase().trim();
    const normalizedSecret = password.trim();
    const management = managementUsers.find((m) => {
      if (!isActiveStatus(m.status)) return false;

      // Support both current schema (username/password) and legacy sheet columns
      // where credentials were stored in generated_by / generated_at.
      const primaryUsername = String(m.username || '').toLowerCase().trim();
      const legacyUsername = String((m as unknown as Record<string, unknown>).generated_by || '').toLowerCase().trim();
      const usernameMatch = primaryUsername === normalizedInput || legacyUsername === normalizedInput;
      const emailMatch = String(m.email || '').toLowerCase().trim() === normalizedInput;
      const nameMatch = String(m.name || '').toLowerCase().trim() === normalizedInput;
      const idMatch = String(m.management_id || '').toLowerCase().trim() === normalizedInput;
      const identityMatch = usernameMatch || emailMatch || nameMatch || idMatch;
      if (!identityMatch) return false;

      const storedPassword = String(m.password || '').trim();
      const legacyPassword = String((m as unknown as Record<string, unknown>).generated_at || '').trim();
      if (storedPassword) return storedPassword === normalizedSecret;
      if (legacyPassword) return legacyPassword === normalizedSecret;

      // Final fallback for older rows that used phone as credential.
      return String(m.phone || '').trim() === normalizedSecret;
    });

    if (management) {
      const u: AuthUser = {
        type: "management",
        username: management.username || management.email || management.management_id,
        management_id: management.management_id,
        name: management.name,
        designation: management.designation,
      };
      setUser(u);
      localStorage.setItem("cricketUser", JSON.stringify(u));
      startHeartbeat(management.management_id);
      return true;
    }

    return false;
  };

  const logout = () => {
    stopHeartbeat();
    setUser(null);
    localStorage.removeItem("cricketUser");
  };

  const updateAdminProfile = (updates: { aliasName?: string }) => {
    if (updates.aliasName !== undefined) {
      localStorage.setItem('adminAlias', updates.aliasName.trim() || 'Administrator');
    }
    setUser((prev) => {
      if (!prev || prev.type !== 'admin') return prev;
      const updated: AuthUser = { ...prev, name: getAdminAlias() };
      localStorage.setItem('cricketUser', JSON.stringify(updated));
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
