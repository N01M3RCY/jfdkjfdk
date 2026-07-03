import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  city: string;
  isAdmin: boolean;
  xp: number;
  badge: string;
}

function getBadge(xp: number): string {
  if (xp >= 2000) return 'Efsane Dedektif';
  if (xp >= 1000) return 'Usta Dedektif';
  if (xp >= 500) return 'Kıdemli Dedektif';
  if (xp >= 200) return 'Dedektif';
  if (xp >= 100) return 'Stajyer Dedektif';
  return 'Aday Dedektif';
}

interface UserContextType {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  register: (username: string, password: string, displayName: string, city: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<Pick<AppUser, 'city' | 'displayName' | 'xp' | 'badge'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
  updateUser: async () => {},
  refreshUser: async () => {},
});

const TOKEN_KEY = '@kadrajdaki_token';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        const me = await fetchMe(storedToken);
        if (me) {
          setToken(storedToken);
          setUser(me);
        } else {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMe(tok: string): Promise<AppUser | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data as AppUser;
    } catch {
      return null;
    }
  }

  async function login(username: string, password: string): Promise<{ error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? 'Giriş başarısız' };
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user as AppUser);
      return {};
    } catch {
      return { error: 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.' };
    }
  }

  async function register(username: string, password: string, displayName: string, city: string): Promise<{ error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password, displayName: displayName.trim(), city }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? 'Kayıt başarısız' };
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user as AppUser);
      return {};
    } catch {
      return { error: 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.' };
    }
  }

  async function logout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function updateUser(updates: Partial<Pick<AppUser, 'city' | 'displayName' | 'xp' | 'badge'>>) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated as AppUser);
      }
    } catch {
      // ignore
    }
  }

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await fetchMe(token);
    if (me) setUser(me);
  }, [token]);

  return (
    <UserContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
