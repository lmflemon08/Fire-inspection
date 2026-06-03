import React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeMenu?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ activeMenu = 'dashboard', isOpen = true, onToggle }: SidebarProps) {
  // 侧边栏菜单项
  const menuItems = [
    {
      id: 'dashboard',
      name: '管理仪表盘',
      icon: 'fa-gauge-high',
      path: '/admin'
    },
    {
      id: 'inspection-plans',
      name: '巡检计划管理',
      icon: 'fa-calendar-check',
      path: '/admin/inspection-plans'
    },
    {
      id: 'users',
      name: '用户管理',
      icon: 'fa-users',
      path: '/admin/users'
    },
    {
      id: 'facilities',
      name: '消防设施管理',
      icon: 'fa-fire-extinguisher',
      path: '/admin/facilities'
    },
    {
      id: 'forms',
      name: '检查表单管理',
      icon: 'fa-list-check',
      path: '/admin/forms'
    },
    {
      id: 'inspection-history',
      name: '巡检历史记录',
      icon: 'fa-history',
      path: '/admin/inspection-history'
    },
    {
      id: 'issue-tracking',
      name: '问题清单',
      icon: 'fa-clipboard-list',
      path: '/admin/issues'
    },
    {
      id: 'assistant',
      name: 'AI助手',
      icon: 'fa-robot',
      path: '/admin/assistant'
    }
  ];
  
  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };
  
  return (
    <motion.div 
      className={`shrink-0 h-screen flex flex-col transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
      style={{ backgroundColor: '#1E3A5F' }}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 侧边栏头部 */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {isOpen && (
          <div className="flex items-center">
            <i className="fa-solid fa-fire-extinguisher text-cyan-400 text-xl mr-2"></i>
            <span className="font-bold text-lg text-white">管理后台</span>
          </div>
        )}
        <button 
          onClick={onToggle}
          className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        >
          <i className={`fa-solid ${isOpen ? 'fa-angle-left' : 'fa-angle-right'} text-white/80`}></i>
        </button>
      </div>
      
      {/* 侧边栏菜单 */}
      <motion.nav 
        className="flex-1 overflow-y-auto py-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="px-3 space-y-1">
          {menuItems.map((item) => (
            <motion.div key={item.id} variants={itemVariants}>
              <Link
                to={item.path}
                className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === item.id
                    ? 'text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                style={activeMenu === item.id ? { backgroundColor: '#25D5E4' } : {}}
              >
                <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
                {isOpen && (
                  <span className="ml-3">{item.name}</span>
                )}
                {isOpen && activeMenu === item.id && (
                  <motion.div 
                    className="ml-auto w-1.5 h-5 bg-white rounded-full"
                    layoutId="activeIndicator"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.nav>
      
      {/* 侧边栏底部 */}
      {isOpen && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <i className="fa-solid fa-user text-white text-xs"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-white">管理员</p>
              <p className="text-xs text-white/60">系统设置</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}