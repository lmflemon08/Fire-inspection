import React from 'react';
import { createContext } from "react";

// 用户角色类型
export type UserRole = 'admin' | 'user';

// 用户信息接口
export interface UserInfo {
  id: string;
  username: string;
  role: UserRole;
  department?: string;
  name?: string;
}

// 认证上下文接口
export interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  setIsAuthenticated: (value: boolean) => void;
  setUserInfo: (user: UserInfo | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userInfo: null,
  setIsAuthenticated: (value: boolean) => {},
  setUserInfo: (user: UserInfo | null) => {},
  logout: () => {},
});