import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AdminLayout } from '@/components/AdminLayout';
import AIAssistant from '@/components/AIAssistant';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { logout } = useContext(AuthContext);
  const { getFacilityStats, getMonthlyInspectionTasks, getUpcomingInspections, getOverdueInspections } = useData();

  // 从数据上下文获取巡检统计数据
  const facilityStats = getFacilityStats();
  const monthlyTasks = getMonthlyInspectionTasks();
  const upcomingInspections = getUpcomingInspections(7);
  const overdueInspections = getOverdueInspections();
  
  const inspectionStats = {
    total: facilityStats.total,
    normal: facilityStats.normal,
    abnormal: facilityStats.abnormal,
    pending: facilityStats.pending,
    monthlyTasks: monthlyTasks.length,
    upcomingInspections: upcomingInspections.length,
    overdueInspections: overdueInspections.length,
  };

  // 状态分布数据
  const statusDistributionData = [
    { name: '正常', value: inspectionStats.normal, color: '#4ade80' },
    { name: '异常', value: inspectionStats.abnormal, color: '#f87171' },
    { name: '待检', value: inspectionStats.pending, color: '#facc15' },
  ];

  // 统计卡片数据
  const systemStats = [
    { title: '设施总数', value: inspectionStats.total.toString(), icon: 'fa-shield-halved', color: 'bg-blue-50', iconBg: 'bg-blue-100 text-blue-600', labelColor: 'text-blue-800' },
    { title: '正常', value: inspectionStats.normal.toString(), icon: 'fa-check-circle', color: 'bg-green-50', iconBg: 'bg-green-100 text-green-600', labelColor: 'text-green-800' },
    { title: '异常', value: inspectionStats.abnormal.toString(), icon: 'fa-circle-xmark', color: 'bg-red-50', iconBg: 'bg-red-100 text-red-600', labelColor: 'text-red-800' },
    { title: '本月待检', value: inspectionStats.monthlyTasks.toString(), icon: 'fa-calendar-day', color: 'bg-yellow-50', iconBg: 'bg-yellow-100 text-yellow-600', labelColor: 'text-yellow-800' },
    { title: '即将到期', value: inspectionStats.upcomingInspections.toString(), icon: 'fa-clock', color: 'bg-orange-50', iconBg: 'bg-orange-100 text-orange-600', labelColor: 'text-orange-800' },
  ];

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

  // 图表卡片变体
  const chartItemVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <AdminLayout activeMenu="dashboard" title="巡查看板" onLogout={logout}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold" style={{ color: '#333333' }}>巡查看板</h1>
        </motion.div>

        {/* 统计卡片 */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {systemStats.map((stat, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex items-center p-6"
            >
              <div className="p-3 rounded-lg mr-4" style={{ backgroundColor: stat.iconBg.includes('blue') ? '#E6F7FF' : stat.iconBg.includes('green') ? '#F6FFED' : stat.iconBg.includes('red') ? '#FFF1F0' : stat.iconBg.includes('yellow') ? '#FFFBE6' : '#FFF7E6' }}>
                <i className={`fa-solid ${stat.icon} text-xl`} style={{ color: stat.iconBg.includes('blue') ? '#1677FF' : stat.iconBg.includes('green') ? '#52C41A' : stat.iconBg.includes('red') ? '#FF4D4F' : stat.iconBg.includes('yellow') ? '#FAAD14' : '#FA8C16' }}></i>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: stat.labelColor.includes('blue') ? '#1677FF' : stat.labelColor.includes('green') ? '#52C41A' : stat.labelColor.includes('red') ? '#FF4D4F' : stat.labelColor.includes('yellow') ? '#FAAD14' : '#FA8C16' }}>{stat.title}</p>
                <h3 className="text-3xl font-bold mt-1" style={{ color: '#333333' }}>{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 状态分布区域 */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 状态分布图表 */}
          <motion.div 
            variants={chartItemVariants}
            className="lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold" style={{ color: '#333333' }}>状态分布</h2>
            </div>
            <div className="p-6 flex items-center justify-center h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* 状态分布卡片 */}
            <motion.div 
              variants={chartItemVariants}
              className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold" style={{ color: '#333333' }}>状态统计</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {statusDistributionData.map((status, index) => (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      className="rounded-xl p-6 flex flex-col items-center justify-center border"
                      style={{ 
                        backgroundColor: `${status.color}10`, 
                        borderColor: status.color
                      }}
                    >
                      <h3 className="text-4xl font-bold" style={{ color: status.color }}>
                        {status.value}
                      </h3>
                      <p className="mt-2 font-medium" style={{ color: '#595959' }}>
                        {status.name}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* 本月待检任务 */}
          <motion.div 
            className="mb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              variants={chartItemVariants}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold" style={{ color: '#333333' }}>
                  <i className="fa-solid fa-calendar-day mr-2" style={{ color: '#1677FF' }}></i>
                  本月待检任务 ({monthlyTasks.length})
                </h2>
                <Link 
                  to="/admin/inspection-plans" 
                  className="text-sm font-medium"
                  style={{ color: '#1677FF' }}
                >
                  查看全部 <i className="fa-solid fa-arrow-right ml-1"></i>
                </Link>
              </div>
              <div className="p-6">
                {monthlyTasks.length === 0 ? (
                  <div className="text-center py-8" style={{ color: '#8C8C8C' }}>
                    <i className="fa-solid fa-check-circle text-4xl mb-3" style={{ color: '#52C41A' }}></i>
                    <p>本月暂无待检任务</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider" style={{ color: '#333333' }}>
                          <th className="pb-3">编号</th>
                          <th className="pb-3">类型</th>
                          <th className="pb-3">位置</th>
                          <th className="pb-3">巡检周期</th>
                          <th className="pb-3">下次巡检</th>
                          <th className="pb-3">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {monthlyTasks.slice(0, 5).map((facility) => {
                          const isOverdue = facility.nextInspectionDate && new Date(facility.nextInspectionDate) < new Date();
                          return (
                            <tr key={facility.id} className="text-sm">
                              <td className="py-3 font-medium" style={{ color: '#333333' }}>{facility.code}</td>
                              <td className="py-3" style={{ color: '#595959' }}>{facility.type}</td>
                              <td className="py-3" style={{ color: '#595959' }}>{facility.location}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  facility.inspectionCycle === 'monthly' ? 'bg-blue-100 text-blue-800' :
                                  facility.inspectionCycle === 'quarterly' ? 'bg-indigo-100 text-indigo-800' :
                                  facility.inspectionCycle === 'yearly' ? 'bg-gray-100 text-gray-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {facility.inspectionCycle === 'weekly' ? '每周' : 
                                   facility.inspectionCycle === 'monthly' ? '每月' : 
                                   facility.inspectionCycle === 'quarterly' ? '每季' : '每年'}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={isOverdue ? 'text-red-600 font-medium' : ''} style={!isOverdue ? { color: '#595959' } : {}}>
                                  {facility.nextInspectionDate}
                                  {isOverdue && <i className="fa-solid fa-exclamation-triangle ml-1"></i>}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium`}
                                  style={{ 
                                    backgroundColor: isOverdue ? '#FFF1F0' : '#FFFBE6', 
                                    color: isOverdue ? '#FF4D4F' : '#D48806' 
                                  }}
                                >
                                  {isOverdue ? '已逾期' : '待检'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {monthlyTasks.length > 5 && (
                      <div className="text-center mt-4">
                        <Link 
                          to="/admin/inspection-plans" 
                          className="text-sm"
                          style={{ color: '#1677FF' }}
                        >
                          还有 {monthlyTasks.length - 5} 项待检任务...
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* 逾期提醒 */}
          {overdueInspections.length > 0 && (
            <motion.div 
              className="mb-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div 
                variants={chartItemVariants}
                className="rounded-xl shadow-sm overflow-hidden border"
                style={{ backgroundColor: '#FFF1F0', borderColor: '#FFCCC7' }}
              >
                <div className="px-6 py-4 border-b" style={{ borderColor: '#FFCCC7' }}>
                  <h2 className="text-lg font-semibold" style={{ color: '#FF4D4F' }}>
                    <i className="fa-solid fa-exclamation-triangle mr-2"></i>
                    逾期提醒 ({overdueInspections.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-4">
                    {overdueInspections.slice(0, 4).map((facility) => (
                      <div key={facility.id} className="bg-white rounded-lg p-4 flex items-center space-x-4 shadow-sm border border-gray-100">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFF1F0' }}>
                          <i className="fa-solid fa-fire-extinguisher" style={{ color: '#FF4D4F' }}></i>
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: '#333333' }}>{facility.code}</p>
                          <p className="text-sm" style={{ color: '#595959' }}>{facility.location}</p>
                          <p className="text-xs" style={{ color: '#FF4D4F' }}>
                            应检日期：{facility.nextInspectionDate}
                          </p>
                        </div>
                      </div>
                    ))}
                    {overdueInspections.length > 4 && (
                      <Link 
                        to="/admin/inspection-plans" 
                        className="flex items-center text-red-600 dark:text-red-400 hover:underline"
                      >
                        +{overdueInspections.length - 4} 更多...
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
      </div>
      
      {/* AI助手悬浮窗 */}
      <AIAssistant />
    </AdminLayout>
  );
}