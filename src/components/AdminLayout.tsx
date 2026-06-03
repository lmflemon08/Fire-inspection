import React, { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface AdminLayoutProps {
  children: ReactNode;
  activeMenu?: string;
  title?: string;
  onLogout: () => void;
}

export function AdminLayout({ children, activeMenu = 'dashboard', title, onLogout }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F7F8FA' }}>
      {/* 侧边栏 */}
      <Sidebar activeMenu={activeMenu} isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <nav className="bg-white shadow-sm border-b border-gray-100 shrink-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <i className="fa-solid fa-fire-extinguisher text-cyan-500 text-xl mr-2"></i>
                  <span className="font-bold text-lg" style={{ color: '#333333' }}>
                    消防巡检系统 - 管理后台
                    {title && ` - ${title}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <button className="mr-4 p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  <i className="fa-solid fa-gear text-lg"></i> 设置
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition duration-300 flex items-center border"
                  style={{ backgroundColor: '#FFF1F0', color: '#FF4D4F', borderColor: '#FFCCC7' }}
                >
                  <i className="fa-solid fa-right-from-bracket mr-1"></i> 退出
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* 主要内容 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
