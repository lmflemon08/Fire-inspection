import React from 'react';
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '@/contexts/authContext';
import { motion } from 'framer-motion';

export default function Home() {
  const { isAuthenticated, userInfo } = useContext(AuthContext);

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex flex-col">
      {/* 顶部导航栏 */}
      <nav className="bg-white dark:bg-gray-800 shadow-md py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-fire-extinguisher text-red-500 text-2xl"></i>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">消防设施巡检系统</h1>
          </div>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                欢迎, {userInfo?.name || userInfo?.username}
              </span>
              <Link 
                to={userInfo?.role === 'admin' ? "/admin" : "/user"}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300 flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                进入系统
              </Link>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300 flex items-center gap-2"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              登录
            </Link>
          )}
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="flex-1 container mx-auto px-6 py-12">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">智能消防巡检解决方案</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            高效、精准的消防设施巡检管理，保障消防安全，预防火灾隐患
          </p>
        </motion.div>

        {/* 功能卡片 */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg inline-block mb-4">
              <i className="fa-solid fa-user-gear text-blue-600 dark:text-blue-300 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">专业管理系统</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              管理员可轻松管理用户、配置检查表单、录入消防设施信息
            </p>
            {isAuthenticated && userInfo?.role === 'admin' ? (
              <Link 
                to="/admin" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium"
              >
                进入管理界面 <i className="fa-solid fa-chevron-right ml-2 text-sm"></i>
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium"
              >
                登录管理账号 <i className="fa-solid fa-chevron-right ml-2 text-sm"></i>
              </Link>
            )}
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg inline-block mb-4">
              <i className="fa-solid fa-check-square text-green-600 dark:text-green-300 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">智能巡检流程</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              扫描二维码快速定位设施，AI自动生成检查表单，高效完成巡检任务
            </p>
            {isAuthenticated && userInfo?.role === 'user' ? (
              <Link 
                to="/user" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium"
              >
                开始巡检 <i className="fa-solid fa-chevron-right ml-2 text-sm"></i>
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium"
              >
                登录巡检账号 <i className="fa-solid fa-chevron-right ml-2 text-sm"></i>
              </Link>
            )}
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg inline-block mb-4">
              <i className="fa-solid fa-robot text-purple-600 dark:text-purple-300 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI智能助手</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              智能AI助手为您提供系统使用指导，解答疑问，提高工作效率
            </p>
            {isAuthenticated && userInfo?.role === 'admin' ? (
              <Link 
                to="/admin/assistant" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium"
              >
                咨询助手 <i className="fa-solid fa-chevron-right ml-2 text-sm"></i>
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium"
              >
                了解更多 <i className="fa-solid fa-chevron-right ml-2 text-sm"></i>
              </Link>
            )}
          </motion.div>
        </motion.div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white dark:bg-gray-800 shadow-inner py-6 px-6">
        <div className="container mx-auto text-center text-gray-600 dark:text-gray-300">
          <p>&copy; 2026 消防设施巡检系统. 保留所有权利.</p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="#" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
              <i className="fa-solid fa-question-circle"></i> 帮助中心
            </a>
            <a href="#" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
              <i className="fa-solid fa-file-contract"></i> 使用条款
            </a>
            <a href="#" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
              <i className="fa-solid fa-shield-halved"></i> 隐私政策
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}