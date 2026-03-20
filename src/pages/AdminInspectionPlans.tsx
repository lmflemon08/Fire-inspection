import { useState, useContext, useMemo } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData, FireFacility } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';

export default function AdminInspectionPlans() {
  const { logout } = useContext(AuthContext);
  const { facilities, getMonthlyInspectionTasks, getUpcomingInspections, getOverdueInspections } = useData();
  
  const [activeTab, setActiveTab] = useState<'monthly' | 'upcoming' | 'overdue' | 'all'>('monthly');
  
  // 获取不同类别的设施数据
  const monthlyTasks = useMemo(() => getMonthlyInspectionTasks(), [facilities]);
  const upcomingInspections = useMemo(() => getUpcomingInspections(7), [facilities]);
  const overdueInspections = useMemo(() => getOverdueInspections(), [facilities]);
  
  // 根据标签页获取当前显示的数据
  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'monthly':
        return monthlyTasks;
      case 'upcoming':
        return upcomingInspections;
      case 'overdue':
        return overdueInspections;
      case 'all':
        return facilities;
      default:
        return [];
    }
  }, [activeTab, monthlyTasks, upcomingInspections, overdueInspections, facilities]);
  
  // 判断是否逾期
  const isOverdue = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  
  // 判断是否本周内
  const isThisWeek = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return date >= today && date <= weekLater;
  };
  
  // 获取状态标签
  const getStatusBadge = (facility: FireFacility) => {
    if (facility.nextInspectionDate && isOverdue(facility.nextInspectionDate)) {
      return { text: '已逾期', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: 'fa-exclamation-triangle' };
    }
    if (facility.nextInspectionDate && isThisWeek(facility.nextInspectionDate)) {
      return { text: '即将到期', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: 'fa-clock' };
    }
    return { text: '计划中', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: 'fa-calendar-check' };
  };
  
  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };
  
  // 统计卡片数据
  const statsCards = [
    { 
      title: '本月待检', 
      value: monthlyTasks.length, 
      icon: 'fa-calendar-day', 
      color: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    { 
      title: '即将到期（7天内）', 
      value: upcomingInspections.length, 
      icon: 'fa-clock', 
      color: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    { 
      title: '已逾期', 
      value: overdueInspections.length, 
      icon: 'fa-exclamation-circle', 
      color: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    { 
      title: '设施总数', 
      value: facilities.length, 
      icon: 'fa-fire-extinguisher', 
      color: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex">
      {/* 侧边栏 */}
      <Sidebar activeMenu="inspection-plans" />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <i className="fa-solid fa-fire-extinguisher text-red-500 text-xl mr-2"></i>
                  <span className="font-bold text-lg">消防巡检系统 - 管理后台</span>
                </div>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition duration-300 flex items-center"
                >
                  <i className="fa-solid fa-right-from-bracket mr-1"></i> 退出
                </button>
              </div>
            </div>
          </div>
        </nav>
        
        {/* 主要内容 */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">巡检计划管理</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">管理和监控消防设施巡检计划</p>
          </motion.div>
          
          {/* 统计卡片 */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {statsCards.map((stat, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className={`${stat.color} rounded-xl shadow-sm overflow-hidden border ${stat.borderColor} p-6`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-lg bg-white dark:bg-gray-800 ${stat.iconColor}`}>
                    <i className={`fa-solid ${stat.icon} text-2xl`}></i>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          
          {/* 标签页切换 */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'monthly' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <i className="fa-solid fa-calendar-day mr-2"></i>
                本月待检 ({monthlyTasks.length})
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'upcoming' 
                    ? 'bg-yellow-600 text-white shadow-lg' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <i className="fa-solid fa-clock mr-2"></i>
                即将到期 ({upcomingInspections.length})
              </button>
              <button
                onClick={() => setActiveTab('overdue')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'overdue' 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <i className="fa-solid fa-exclamation-triangle mr-2"></i>
                已逾期 ({overdueInspections.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'all' 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <i className="fa-solid fa-list mr-2"></i>
                全部设施 ({facilities.length})
              </button>
            </div>
          </motion.div>
          
          {/* 设施列表 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">编号</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">类型</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">放置位置</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">巡检周期</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">上次巡检</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">下次巡检</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <AnimatePresence>
                    {currentData.map((facility) => {
                      const statusBadge = getStatusBadge(facility);
                      return (
                        <motion.tr 
                          key={facility.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0 }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                            {facility.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {facility.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {facility.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              facility.inspectionCycle === 'weekly' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                              facility.inspectionCycle === 'monthly' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              facility.inspectionCycle === 'quarterly' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {facility.inspectionCycle === 'weekly' ? '每周' : 
                               facility.inspectionCycle === 'monthly' ? '每月' : 
                               facility.inspectionCycle === 'quarterly' ? '每季度' : '每年'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {facility.lastInspectionDate || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {facility.nextInspectionDate ? (
                              <span className={isOverdue(facility.nextInspectionDate) ? 'text-red-600 font-medium' : ''}>
                                {facility.nextInspectionDate}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${statusBadge.color}`}>
                              <i className={`fa-solid ${statusBadge.icon} mr-1`}></i>
                              {statusBadge.text}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {/* 空状态 */}
            {currentData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <i className="fa-solid fa-clipboard-check text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
              </div>
            )}
          </motion.div>
          
          {/* 说明信息 */}
          <motion.div 
            className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-start">
              <i className="fa-solid fa-info-circle text-blue-600 dark:text-blue-400 mt-0.5 mr-3"></i>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-2">巡检计划说明：</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li><strong>本月待检</strong>：下次巡检日期在本月内的所有设施</li>
                  <li><strong>即将到期</strong>：下次巡检日期在7天内的设施</li>
                  <li><strong>已逾期</strong>：下次巡检日期已过的设施（需要优先处理）</li>
                  <li>您可以在「消防设施管理」中修改每个设施的巡检周期和巡检日期</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
