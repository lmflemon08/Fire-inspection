import React from 'react';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'sonner';
import App from "./App.tsx";
import "./index.css";

// 初始化时检查本地存储中的用户信息
const storedUserInfo = localStorage.getItem('userInfo');
if (storedUserInfo) {
  try {
    const userInfo = JSON.parse(storedUserInfo);
    // 这里可以在应用加载时设置初始的认证状态
    // 实际应用中应该有更安全的令牌验证机制
  } catch (error) {
    console.error('Failed to parse stored user info:', error);
    localStorage.removeItem('userInfo');
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>
);
