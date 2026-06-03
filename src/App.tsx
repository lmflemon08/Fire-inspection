import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import UserDashboard from "@/pages/UserDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminFacilities from "@/pages/AdminFacilities";
import AdminForms from "@/pages/AdminForms";
import AdminAssistant from "@/pages/AdminAssistant";
import AdminInspectionHistory from "@/pages/AdminInspectionHistory";
import AdminIssueTracking from "@/pages/AdminIssueTracking";
import AdminInspectionPlans from "@/pages/AdminInspectionPlans";
import PublicInspectPage from "@/pages/PublicInspectPage";
import { AuthContext, UserInfo } from '@/contexts/authContext';
import { DataProvider } from '@/contexts/DataContext';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // 从 localStorage 恢复认证状态（页面刷新或重新打开时）
  useEffect(() => {
    const savedUserInfo = localStorage.getItem('userInfo');
    if (savedUserInfo) {
      try {
        const parsed = JSON.parse(savedUserInfo) as UserInfo;
        setUserInfo(parsed);
        setIsAuthenticated(true);
      } catch {
        // 解析失败，清除无效数据
        localStorage.removeItem('userInfo');
      }
    }
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setUserInfo(null);
    localStorage.removeItem('userInfo');
    localStorage.removeItem('rememberedLogin'); // 同时清除记住的密码
  };

  return (
    <DataProvider>
      <AuthContext.Provider
        value={{ isAuthenticated, userInfo, setIsAuthenticated, setUserInfo, logout }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          {/* 公开页面 - 微信扫码访问 */}
          <Route path="/inspect/:code" element={<PublicInspectPage />} />
          {/* 用户端 */}
          <Route path="/user" element={isAuthenticated && userInfo?.role === 'user' ? <UserDashboard /> : <Navigate to="/login" />} />
          {/* 管理端 */}
          <Route path="/admin" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/inspection-plans" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminInspectionPlans /> : <Navigate to="/login" />} />
          <Route path="/admin/users" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminUsers /> : <Navigate to="/login" />} />
          <Route path="/admin/facilities" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminFacilities /> : <Navigate to="/login" />} />
          <Route path="/admin/forms" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminForms /> : <Navigate to="/login" />} />
          <Route path="/admin/inspection-history" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminInspectionHistory /> : <Navigate to="/login" />} />
          <Route path="/admin/issues" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminIssueTracking /> : <Navigate to="/login" />} />
          <Route path="/admin/assistant" element={isAuthenticated && userInfo?.role === 'admin' ? <AdminAssistant /> : <Navigate to="/login" />} />
        </Routes>
      </AuthContext.Provider>
    </DataProvider>
  );
}
