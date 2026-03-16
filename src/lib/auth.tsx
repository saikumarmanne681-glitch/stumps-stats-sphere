import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthUser } from "./types";
import { api, isConnected } from "./googleSheets";
import { startHeartbeat, stopHeartbeat } from "./presence";

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isPlayer: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAdmin: false,
  isPlayer: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cricketUser");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Start heartbeat for returning users
        const userId = parsed.type === 'admin' ? 'admin' : parsed.player_id;
        if (userId) startHeartbeat(userId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Admin login
    if (username === "admin" && password === "9908") {
      const u: AuthUser = { type: "admin", username: "admin", name: "Administrator" };
      setUser(u);
      localStorage.setItem("cricketUser", JSON.stringify(u));
      startHeartbeat('admin');
      return true;
    }

    // Player login — fetch live data from sheets
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
  };

  const logout = () => {
    stopHeartbeat();
    setUser(null);
    localStorage.removeItem("cricketUser");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin: user?.type === "admin",
        isPlayer: user?.type === "player",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
