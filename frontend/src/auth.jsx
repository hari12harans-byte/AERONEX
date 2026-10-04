import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const login = useCallback(async (email, password) => { const d = await api('/auth/login', { method: 'POST', body: { email, password } }); setToken(d.token); setUser(d.user); }, []);
  const register = useCallback(async (name, email, password) => { const d = await api('/auth/register', { method: 'POST', body: { name, email, password } }); setToken(d.token); setUser(d.user); }, []);
  const logout = useCallback(async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setToken(null); setUser(null); }, []);
  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
