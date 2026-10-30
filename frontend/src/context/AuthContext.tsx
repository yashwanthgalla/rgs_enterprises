import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (credentials: { username: string; password: string }) => Promise<AuthResponse>;
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

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const userData = (await authApi.me()) as any;
          if (userData) {
            setUser(userData);
            setMustChangePassword(!!userData.mustChangePassword);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const res = await authApi.login(credentials);
    const authData = res as AuthResponse;
    const newToken = authData.token;
    const userObj: User = {
      id: 1,
      username: authData.username,
      email: authData.email,
      fullName: authData.fullName || authData.username,
      role: (authData.role as any) || 'ADMIN',
      mustChangePassword: authData.mustChangePassword,
    };

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userObj));
    setToken(newToken);
    setUser(userObj);
    setMustChangePassword(!!authData.mustChangePassword);

    return authData;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        mustChangePassword,
        login,
        logout,
        updateUser,
        setMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
