import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginPayload, RegisterPayload, UpdateProfilePayload } from '../types';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { websocketService } from '../services/websocketService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  refreshUser: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User data is stored in MongoDB Atlas and held in React state (no localStorage database)
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('simplechat_token');
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated user directly from MongoDB Atlas on mount
  useEffect(() => {
    // Clean up any legacy user application data from client storage
    try {
      localStorage.removeItem('simplechat_user');
      sessionStorage.clear();
    } catch {
      // ignore
    }

    const initAuth = async () => {
      const storedToken = localStorage.getItem('simplechat_token');
      if (storedToken) {
        try {
          // Fetch authoritative user profile directly from MongoDB Atlas
          const freshUser = await userService.getMe();
          setUser(freshUser);
          setToken(storedToken);
          websocketService.connect(freshUser.id, storedToken);
        } catch (error: any) {
          console.error('[Auth] Failed to restore session from MongoDB Atlas', error);
          if (error?.response?.status === 401) {
            authService.logout();
            setUser(null);
            setToken(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Connect or disconnect websocket on user/token change
  useEffect(() => {
    if (user && token) {
      websocketService.connect(user.id, token);
    } else {
      websocketService.disconnect();
    }
  }, [user?.id, token]);

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    try {
      localStorage.setItem('simplechat_token', res.token);
    } catch {
      // ignore
    }
    setToken(res.token);
    setUser(res.user);
    websocketService.connect(res.user.id, res.token);
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    try {
      localStorage.setItem('simplechat_token', res.token);
    } catch {
      // ignore
    }
    setToken(res.token);
    setUser(res.user);
    websocketService.connect(res.user.id, res.token);
  };

  const logout = () => {
    websocketService.disconnect();
    authService.logout();
    try {
      localStorage.removeItem('simplechat_token');
      localStorage.removeItem('simplechat_user');
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
    const updated = await userService.updateProfile(payload);
    setUser(updated);
    return updated;
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const fresh = await userService.getMe();
      setUser(fresh);
    } catch (err) {
      console.error('[Auth] Error refreshing user from MongoDB Atlas', err);
    }
  };

  const deleteAccount = async (password?: string) => {
    await userService.deleteAccount(password);
    websocketService.disconnect();
    authService.logout();
    try {
      localStorage.removeItem('simplechat_token');
      localStorage.removeItem('simplechat_user');
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
