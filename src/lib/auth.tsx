import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from './types';

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
    const stored = localStorage.getItem('cricketUser');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Admin login
    if (username === 'admin' && password === '9908') {
      const u: AuthUser = { type: 'admin', username: 'admin', name: 'Administrator' };
      setUser(u);
      localStorage.setItem('cricketUser', JSON.stringify(u));
      return true;
    }

    // Player login — check mock data (or API)
    const { mockPlayers } = await import('./mockData');
    const player = mockPlayers.find(p => p.username === username && p.password === password && p.status === 'active');
    if (player) {
      const u: AuthUser = { type: 'player', username: player.username, player_id: player.player_id, name: player.name };
      setUser(u);
      localStorage.setItem('cricketUser', JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cricketUser');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin: user?.type === 'admin',
      isPlayer: user?.type === 'player',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
