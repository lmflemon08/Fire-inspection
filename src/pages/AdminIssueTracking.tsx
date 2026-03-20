import { useState, useContext, useMemo } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';

// 问题项类型定义（基于巡检记录）
interface IssueItem {
  id: string;
  recordId: string;  // 关联的巡检记录ID
  facilityCode: string;
  facilityType: string;
  facilityLocation: string;
  issueDescription: string;  // 来自巡检备注
  discoveredDate: string;
  discoveredTime: string;
  discoverer: string;
  discovererId: string;
  status: 'pending' | 'rectifying' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  dueDate: string;
  resolvedDate?: string;
  resolutionNotes?: string;
  answers?: { question: string; answer: string | string[] }[];  // 检查项答案
}

export default function AdminIssueTracking() {
  const { logout } = useContext(AuthContext);
  const { getAbnormalIssues } = useData();
  
  // 从巡检记录获取异常问题
  const abnormalRecords = getAbnormalIssues();
  
  // 将巡检异常记录转换为问题清单格式
  const [issueStatusMap, setIssueStatusMap] = useState<Record<string, { status: IssueItem['status']; priority: IssueItem['priority']; assignee: string; dueDate: string; resolvedDate?: string; resolutionNotes?: string }>>({});
  
  const issues: IssueItem[] = useMemo(() => {
    return abnormalRecords.map(record => {
      const existingStatus = issueStatusMap[record.id];
      
      return {
        id: `issue-${record.id}`,
        recordId: record.id,
        facilityCode: record.facilityCode,
        facilityType: record.type,
        facilityLocation: record.facilityName,
        issueDescription: record.notes || '巡检发现异常',
        discoveredDate: record.date,
        discoveredTime: record.time,
        discoverer: record.inspectorName,
        discovererId: record.inspectorId,
        status: existingStatus?.status || 'pending',
        priority: existingStatus?.priority || 'high',
        assignee: existingStatus?.assignee || '',
        dueDate: existingStatus?.dueDate || '',
        resolvedDate: existingStatus?.resolvedDate,
        resolutionNotes: existingStatus?.resolutionNotes,
        answers: record.answers
      };
    });
  }, [abnormalRecords, issueStatusMap]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    status: 'pending' as 'pending' | 'rectifying' | 'resolved',
    resolutionNotes: ''
  });
  
  // 过滤问题
  const filteredIssues = issues.filter(issue => {
    // 搜索过滤
    const matchesSearch = 
      issue.facilityCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.facilityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.facilityLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.issueDescription.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 状态过滤
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    
    // 优先级过滤
    const matchesPriority = filterPriority === 'all' || issue.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  // 统计数据
  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.status === 'pending').length,
    rectifying: issues.filter(i => i.status === 'rectifying').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    high: issues.filter(i => i.priority === 'high' && i.status !== 'resolved').length
  };
  
  // 查看详情
  const handleViewDetail = (issue: IssueItem) => {
    setSelectedIssue(issue);
    setIsDetailModalOpen(true);
  };
  
  // 打开更新模态框
  const handleOpenUpdate = (issue: IssueItem) => {
    setSelectedIssue(issue);
    setUpdateFormData({
      status: issue.status,
      resolutionNotes: issue.resolutionNotes || ''
    });
    setIsUpdateModalOpen(true);
  };
  
  // 更新问题状态
  const handleUpdateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedIssue) return;
    
    setIssueStatusMap(prev => ({
      ...prev,
      [selectedIssue.recordId]: {
        status: updateFormData.status,
        priority: selectedIssue.priority,
        assignee: selectedIssue.assignee,
        dueDate: selectedIssue.dueDate,
        resolutionNotes: updateFormData.resolutionNotes,
        resolvedDate: updateFormData.status === 'resolved' ? new Date().toISOString().split('T')[0] : undefined
      }
    }));
    
    setIsUpdateModalOpen(false);
    setSelectedIssue(null);
    toast.success('问题状态更新成功');
  };
  
  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'rectifying':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待整改';
      case 'rectifying':
        return '整改中';
      case 'resolved':
        return '已整改';
      default:
        return '未知';
    }
  };
  
  // 动画变体
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex">
      {/* 侧边栏 */}
      <Sidebar activeMenu="issue-tracking" />
      
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">问题清单</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">跟踪和管理巡检发现的问题</p>
          </motion.div>
          
          {/* 统计卡片 */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mr-4">
                  <i className="fa-solid fa-list-check text-gray-600 dark:text-gray-300 text-xl"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">总问题数</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-4">
                  <i className="fa-solid fa-clock text-yellow-600 dark:text-yellow-300 text-xl"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">待整改</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                  <i className="fa-solid fa-wrench text-blue-600 dark:text-blue-300 text-xl"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">整改中</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rectifying}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
                  <i className="fa-solid fa-check-circle text-green-600 dark:text-green-300 text-xl"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">已整改</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolved}</h3>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* 筛选栏 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 搜索框 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">搜索</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="搜索设施编号、问题描述..."
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
                  <option value="pending">待整改</option>
                  <option value="rectifying">整改中</option>
                  <option value="resolved">已整改</option>
                </select>
              </div>
            </div>
            
            {/* 重置按钮 */}
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterPriority('all');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
              >
                <i className="fa-solid fa-rotate-left mr-2"></i>重置筛选
              </button>
            </div>
          </motion.div>
          
          {/* 问题列表 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">设施编号</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">问题描述</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">整改说明</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <AnimatePresence>
                    {filteredIssues.map((issue) => (
                      <motion.tr 
                        key={issue.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                          <div>{issue.facilityCode}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{issue.facilityLocation}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                          <div className="truncate">{issue.issueDescription}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(issue.status)}`}>
                            {getStatusText(issue.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                          {issue.resolutionNotes ? (
                            <div className="truncate text-green-600 dark:text-green-400" title={issue.resolutionNotes}>
                              {issue.resolutionNotes}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleViewDetail(issue)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <i className="fa-solid fa-eye mr-1"></i>详情
                          </button>
                          {issue.status !== 'resolved' && (
                            <button 
                              onClick={() => handleOpenUpdate(issue)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            >
                              <i className="fa-solid fa-edit mr-1"></i>更新
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {/* 空状态 */}
            {issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <i className="fa-solid fa-check-circle text-green-500 text-3xl"></i>
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无异常问题</p>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                  当前没有巡检发现的异常问题，所有设施运行正常。当巡检员发现异常时会自动同步到问题清单。
                </p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <i className="fa-solid fa-search text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">没有找到匹配的问题记录</p>
              </div>
            ) : null}
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
        {isDetailModalOpen && selectedIssue && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">问题详情</h3>
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
                    <p className="text-gray-900 dark:text-white font-medium">{selectedIssue.facilityCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">设施类型</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedIssue.facilityType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">放置位置</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedIssue.facilityLocation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">发现人</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedIssue.discoverer}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">发现日期</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedIssue.discoveredDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">负责人</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedIssue.assignee}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">问题描述</label>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-300">{selectedIssue.issueDescription}</p>
                  </div>
                </div>
                
                {/* 检查项答案 */}
                {selectedIssue.answers && selectedIssue.answers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">检查项详情</label>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {selectedIssue.answers.map((answer, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{answer.question}：</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {typeof answer.answer === 'string' ? answer.answer : answer.answer.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">状态</label>
                    <span className={`px-2 py-1 text-sm font-semibold rounded-full ${getStatusStyle(selectedIssue.status)}`}>
                      {getStatusText(selectedIssue.status)}
                    </span>
                  </div>
                  {selectedIssue.resolvedDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">整改日期</label>
                      <p className="text-green-600 dark:text-green-400 font-medium">{selectedIssue.resolvedDate}</p>
                    </div>
                  )}
                </div>
                
                {selectedIssue.resolutionNotes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">整改说明</label>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <p className="text-green-700 dark:text-green-300">{selectedIssue.resolutionNotes}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6 gap-3">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
                >
                  关闭
                </button>
                {selectedIssue.status !== 'resolved' && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenUpdate(selectedIssue);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-300"
                  >
                    更新状态
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 更新模态框 */}
      <AnimatePresence>
        {isUpdateModalOpen && selectedIssue && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">更新问题状态</h3>
                <button 
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              
              <form onSubmit={handleUpdateIssue} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    问题状态 <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={updateFormData.status}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    required
                  >
                    <option value="pending">待整改</option>
                    <option value="rectifying">整改中</option>
                    <option value="resolved">已整改</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    整改说明 {updateFormData.status === 'resolved' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入整改说明..."
                    rows={4}
                    value={updateFormData.resolutionNotes}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                    required={updateFormData.status === 'resolved'}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300"
                  >
                    保存
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
