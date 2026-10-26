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
import PublicInspectScanPage from "@/pages/PublicInspectScanPage";
import PublicInspectionHistoryPage from "@/pages/PublicInspectionHistoryPage";
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

  // 登录态判断：既满足 isAuthenticated，也满足对应角色
  const isUser = isAuthenticated && userInfo?.role === 'user';
  const isAdmin = isAuthenticated && userInfo?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userInfo, setIsAuthenticated, setUserInfo, logout }}
    >
      {/* ✅ DataProvider 必须包住所有路由：
          之前它只包了 "/*" 这一段，导致 /login、/inspect/:code 等路由下
          任何调用 useData() 的组件都会抛 "useData must be used within a DataProvider"。
          现在提到最外层，所有页面（含登录页与公开扫码页）都能正常拿到 context。 */}
      <DataProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          {/* 公开页面 - 微信扫码访问 */}
          <Route path="/inspect/:code" element={<PublicInspectPage />} />
          <Route path="/inspect/:code/scan" element={<PublicInspectScanPage />} />
          <Route path="/inspect/:code/history" element={<PublicInspectionHistoryPage />} />

          {/* 普通用户 */}
          <Route path="/user" element={isUser ? <UserDashboard /> : <Navigate to="/login" />} />

          {/* 管理员 */}
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/inspection-plans" element={isAdmin ? <AdminInspectionPlans /> : <Navigate to="/login" />} />
          <Route path="/admin/users" element={isAdmin ? <AdminUsers /> : <Navigate to="/login" />} />
          <Route path="/admin/facilities" element={isAdmin ? <AdminFacilities /> : <Navigate to="/login" />} />
          <Route path="/admin/forms" element={isAdmin ? <AdminForms /> : <Navigate to="/login" />} />
          <Route path="/admin/inspection-history" element={isAdmin ? <AdminInspectionHistory /> : <Navigate to="/login" />} />
          <Route path="/admin/issues" element={isAdmin ? <AdminIssueTracking /> : <Navigate to="/login" />} />
          <Route path="/admin/assistant" element={isAdmin ? <AdminAssistant /> : <Navigate to="/login" />} />

          {/* 兜底 */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </DataProvider>
    </AuthContext.Provider>
  );
}
