import { useState, useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData, InspectionRecord } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';

export default function AdminInspectionHistory() {
  const { logout } = useContext(AuthContext);
  const { inspectionRecords } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState({ start: '', end: '' });
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // 过滤记录
  const filteredRecords = inspectionRecords.filter(record => {
    // 搜索过滤
    const matchesSearch = 
      record.facilityCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.inspectorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 状态过滤
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    
    // 日期过滤
    let matchesDate = true;
    if (filterDateRange.start) {
      const recordDate = new Date(record.date);
      const startDate = new Date(filterDateRange.start);
      matchesDate = matchesDate && recordDate >= startDate;
    }
    if (filterDateRange.end) {
      const recordDate = new Date(record.date);
      const endDate = new Date(filterDateRange.end);
      endDate.setHours(23, 59, 59);
      matchesDate = matchesDate && recordDate <= endDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });
  
  // 查看详情
  const handleViewDetail = (record: InspectionRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };
  
  // 导出为CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.warning('没有可导出的数据');
      return;
    }
    
    // CSV表头
    const headers = ['序号', '设施编号', '设施类型', '放置位置', '巡检人', '巡检日期', '巡检时间', '状态', '备注'];
    
    // CSV内容
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map((record, index) => [
        index + 1,
        record.facilityCode,
        record.type,
        record.facilityName,
        record.inspectorName,
        record.date,
        record.time,
        record.status === 'normal' ? '正常' : '异常',
        record.notes || ''
      ].join(','))
    ].join('\n');
    
    // 创建Blob并下载
    const BOM = '\uFEFF'; // UTF-8 BOM
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `巡检历史记录_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('导出成功');
  };
  
  // 导出为PDF（模拟）
  const handleExportPDF = () => {
    toast.info('PDF导出功能开发中，请使用CSV导出');
  };
  
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
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex">
      {/* 侧边栏 */}
      <Sidebar activeMenu="inspection-history" />
      
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">巡检历史记录</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">查看和导出巡检历史记录</p>
          </motion.div>
          
          {/* 筛选和操作栏 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 搜索框 */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">搜索</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="搜索设施编号、类型、位置..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* 状态筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">状态</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">全部状态</option>
                  <option value="normal">正常</option>
                  <option value="abnormal">异常</option>
                </select>
              </div>
              
              {/* 开始日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">开始日期</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterDateRange.start}
                  onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              
              {/* 结束日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">结束日期</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterDateRange.end}
                  onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterDateRange({ start: '', end: '' });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
              >
                <i className="fa-solid fa-rotate-left mr-2"></i>重置
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-300"
              >
                <i className="fa-solid fa-file-csv mr-2"></i>导出CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300"
              >
                <i className="fa-solid fa-file-pdf mr-2"></i>导出PDF
              </button>
            </div>
          </motion.div>
          
          {/* 记录列表 */}
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">设施编号</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">设施类型</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">放置位置</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">巡检人</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">巡检时间</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <AnimatePresence>
                    {filteredRecords.map((record) => (
                      <motion.tr 
                        key={record.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{record.facilityCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.facilityName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.inspectorName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.date} {record.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                            record.status === 'normal' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {record.status === 'normal' ? (
                              <>
                                <i className="fa-solid fa-check-circle mr-1"></i>正常
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-exclamation-circle mr-1"></i>异常
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleViewDetail(record)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <i className="fa-solid fa-eye mr-1"></i>详情
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {/* 空状态 */}
            {filteredRecords.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <i className="fa-solid fa-clipboard-list text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">没有找到匹配的巡检记录</p>
              </div>
            )}
            
            {/* 统计信息 */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>共 {filteredRecords.length} 条记录</span>
                <span>
                  正常: {filteredRecords.filter(r => r.status === 'normal').length} | 
                  异常: {filteredRecords.filter(r => r.status === 'abnormal').length}
                </span>
              </div>
            </div>
          </motion.div>
        </main>
        
        {/* 页脚 */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              © 2026 消防设施巡检系统 版权所有
            </p>
          </div>
        </footer>
      </div>
      
      {/* 详情模态框 */}
      <AnimatePresence>
        {isDetailModalOpen && selectedRecord && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">巡检记录详情</h3>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">设施编号</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedRecord.facilityCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">设施类型</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedRecord.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">放置位置</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedRecord.facilityName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">巡检人</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedRecord.inspectorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">巡检日期</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedRecord.date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">巡检时间</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedRecord.time}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">巡检状态</label>
                    <span className={`px-3 py-1 inline-flex items-center text-sm font-semibold rounded-full ${
                      selectedRecord.status === 'normal' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {selectedRecord.status === 'normal' ? (
                        <>
                          <i className="fa-solid fa-check-circle mr-1"></i>正常
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-exclamation-circle mr-1"></i>异常
                        </>
                      )}
                    </span>
                  </div>
                </div>
                
                {/* 检查项答案 */}
                {selectedRecord.answers && selectedRecord.answers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">检查项结果</label>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                      {selectedRecord.answers.map((answer, index) => (
                        <div key={index} className="flex items-start text-sm">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold mr-2 flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <span className="text-gray-700 dark:text-gray-300">{answer.question}: </span>
                            <span className={`font-medium ${
                              typeof answer.answer === 'string' && 
                              (answer.answer.includes('异常') || answer.answer.includes('损坏') || answer.answer.includes('否'))
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRecord.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">备注</label>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition duration-300"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
