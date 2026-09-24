import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStore } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(setUser)
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login: async (credentials) => {
        const data = await api.post('/auth/login', credentials);
        tokenStore.set(data.token);
        setUser(data.user);
        return data.user;
      },
      logout: () => {
        tokenStore.clear();
        setUser(null);
      },
      refresh: async () => {
        const me = await api.get('/auth/me');
        setUser(me);
        return me;
      },
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
