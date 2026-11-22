import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, AuthResponse } from '../types';
import { authApi } from '../services/api';
import { queryClient, clearQueryCache } from '../api/queryClient';
import { bootstrapSessionData } from '../api/bootstrap';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (credentials: { username: string; password: string }) => Promise<User>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  setMustChangePassword: (must: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? !!JSON.parse(savedUser).mustChangePassword : false;
    } catch {
      return false;
    }
  });

  // If token already exists in localStorage, do not block the UI with initial isLoading=true
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !localStorage.getItem('token');
  });

  // Validate session on mount (silent background verification)
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const userData = (await authApi.me()) as any;
          if (isMounted && userData) {
            setUser(userData);
            setMustChangePassword(!!userData.mustChangePassword);
            localStorage.setItem('user', JSON.stringify(userData));
            bootstrapSessionData(queryClient);
          }
        } catch {
          // Token expired or invalid
          if (isMounted) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setMustChangePassword(false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (credentials: { username: string; password: string }): Promise<User> => {
    const res = await authApi.login(credentials);
    const authData = res as any;
    const newToken = authData.token;
    const userPayload = authData.user || authData;
    const userObj: User = {
      id: userPayload.id || 1,
      username: userPayload.username,
      email: userPayload.email,
      fullName: userPayload.fullName || userPayload.username || 'Administrator',
      role: (userPayload.role as any) || 'ADMIN',
      mustChangePassword: !!(authData.mustChangePassword ?? userPayload.mustChangePassword),
    };

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userObj));
    setToken(newToken);
    setUser(userObj);
    setMustChangePassword(!!userObj.mustChangePassword);
    setIsLoading(false);
    bootstrapSessionData(queryClient);

    return userObj;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    clearQueryCache();
  }, []);

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      mustChangePassword,
      login,
      logout,
      updateUser,
      setMustChangePassword,
    }),
    [user, token, isLoading, mustChangePassword, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
