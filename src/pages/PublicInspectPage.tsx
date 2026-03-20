import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '@/contexts/authContext';
import { useData, CheckForm, CheckItem, CheckItemAnswer } from '@/contexts/DataContext';

export default function PublicInspectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userInfo } = useContext(AuthContext);
  const { facilities, updateFacility, addInspectionRecord, getCheckFormByFacilityType, inspectionRecords } = useData();
  
  const [facility, setFacility] = useState<{
    id: string;
    code: string;
    type: string;
    model: string;
    specification: string;
    location: string;
    status: 'pending' | 'normal' | 'abnormal';
    lastInspection?: string;
  } | null>(null);
  
  const [checkForm, setCheckForm] = useState<CheckForm | null>(null);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectorName, setInspectorName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionComplete, setInspectionComplete] = useState(false); // 点检完成状态
  const [inspectionResult, setInspectionResult] = useState<'normal' | 'abnormal'>('normal'); // 点检结果

  // 根据编号查找设施
  useEffect(() => {
    if (code) {
      const found = facilities.find(f => 
        f.code.toLowerCase() === code.toLowerCase()
      );
      if (found) {
        setFacility(found);
        // 加载对应的检查表单
        const form = getCheckFormByFacilityType(found.type);
        setCheckForm(form || null);
        
        // 初始化答案
        if (form) {
          const initialAnswers: Record<string, string | string[]> = {};
          form.items.forEach(item => {
            if (item.type === 'checkbox') {
              initialAnswers[item.id] = [];
            } else {
              initialAnswers[item.id] = '';
            }
          });
          setAnswers(initialAnswers);
        }
      }
    }
  }, [code, facilities, getCheckFormByFacilityType]);

  // 获取当前页面URL作为二维码内容
  const currentUrl = typeof window !== 'undefined' 
    ? window.location.href 
    : '';

  // 获取该设施过去12个月的巡检记录
  const getFacilityHistoryRecords = () => {
    if (!facility) return [];
    
    // 计算过去12个月的起始日期
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    return inspectionRecords
      .filter(record => 
        record.facilityId === facility.id &&
        new Date(record.date) >= twelveMonthsAgo
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 按日期倒序
  };

  const historyRecords = getFacilityHistoryRecords();

  // 开始点检
  const handleStartInspection = () => {
    if (!isAuthenticated) {
      toast.error('请先登录后再进行点检');
      // 跳转到登录页，带上当前页面地址作为重定向参数
      navigate(`/login?redirect=/inspect/${code}`);
      return;
    }
    if (userInfo?.role !== 'user') {
      toast.error('仅巡检员可以进行点检操作');
      return;
    }
    setShowInspectionForm(true);
    setInspectorName(userInfo.name || '');
    // 重置答案
    if (checkForm) {
      const initialAnswers: Record<string, string | string[]> = {};
      checkForm.items.forEach(item => {
        if (item.type === 'checkbox') {
          initialAnswers[item.id] = [];
        } else {
          initialAnswers[item.id] = '';
        }
      });
      setAnswers(initialAnswers);
    }
    setInspectionNotes('');
  };

  // 更新单选/文本/数字答案
  const handleAnswerChange = (itemId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  // 更新多选答案
  const handleCheckboxChange = (itemId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = prev[itemId] as string[];
      if (checked) {
        return { ...prev, [itemId]: [...current, option] };
      } else {
        return { ...prev, [itemId]: current.filter(o => o !== option) };
      }
    });
  };

  // 验证表单
  const validateForm = (): boolean => {
    if (!checkForm) return true;
    
    for (const item of checkForm.items) {
      if (item.required) {
        const answer = answers[item.id];
        if (item.type === 'checkbox') {
          if ((answer as string[]).length === 0) {
            toast.error(`请完成必填项：${item.question}`);
            return false;
          }
        } else if (!answer) {
          toast.error(`请完成必填项：${item.question}`);
          return false;
        }
      }
    }
    return true;
  };

  // 判断巡检结果
  const determineInspectionResult = (): 'normal' | 'abnormal' => {
    if (!checkForm) return 'normal';
    
    for (const item of checkForm.items) {
      const answer = answers[item.id];
      if (typeof answer === 'string') {
        // 检查是否包含异常关键字
        if (answer.includes('异常') || answer.includes('损坏') || 
            answer.includes('否') || answer.includes('卡死') ||
            answer.includes('偏低') || answer.includes('偏高') ||
            answer.includes('老化')) {
          return 'abnormal';
        }
      }
    }
    return 'normal';
  };

  // 提交点检结果
  const handleSubmitInspection = () => {
    if (!validateForm()) return;
    if (!facility) return;

    const status = determineInspectionResult();

    // 更新设施状态
    updateFacility(facility.id, { status });

    // 构建检查项答案数组
    const checkItemAnswers: CheckItemAnswer[] = [];
    if (checkForm) {
      checkForm.items.forEach(item => {
        checkItemAnswers.push({
          itemId: item.id,
          question: item.question,
          answer: answers[item.id]
        });
      });
    }

    // 添加巡检记录
    const now = new Date();
    addInspectionRecord({
      facilityId: facility.id,
      facilityCode: facility.code,
      facilityName: facility.location,
      type: facility.type,
      status,
      inspectorId: userInfo?.id || '',
      inspectorName: inspectorName || userInfo?.name || '未知',
      notes: inspectionNotes || undefined,
      answers: checkItemAnswers,
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });

    // 显示点检完成页面
    setInspectionResult(status);
    setInspectionComplete(true);
    setShowInspectionForm(false);
  };

  // 设施类型图标
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      '干粉灭火器': 'fa-fire-extinguisher',
      '二氧化碳灭火器': 'fa-fire-extinguisher',
      '消火栓': 'fa-house-fire',
      '泡沫灭火器': 'fa-fire-extinguisher',
      '水型灭火器': 'fa-fire-extinguisher',
    };
    return icons[type] || 'fa-shield-halved';
  };

  // 状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-100';
      case 'abnormal': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  // 状态文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal': return '正常';
      case 'abnormal': return '异常';
      default: return '待检';
    }
  };

  if (!facility) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-qrcode text-4xl text-red-500"></i>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">未找到设施信息</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            设施编号 "{code}" 不存在或已被删除
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            请检查二维码是否正确，或联系管理员
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 顶部状态栏 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <i className="fa-solid fa-shield-halved text-xl mr-2"></i>
          <span className="font-semibold">消防设施点检系统</span>
        </div>
        {isAuthenticated ? (
          <div className="text-sm">
            <i className="fa-solid fa-user mr-1"></i>
            {userInfo?.name}
          </div>
        ) : (
          <button 
            onClick={() => navigate(`/login?redirect=/inspect/${code}`)}
            className="text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
          >
            登录
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 pb-8">
        <AnimatePresence mode="wait">
          {showInspectionForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
            >
              {/* 表单头部 */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-5">
                <h2 className="text-lg font-bold">{checkForm?.name || '点检表单'}</h2>
                <p className="text-sm text-green-100">{facility.code} - {facility.type}</p>
              </div>

              <div className="p-4 space-y-4">
                {/* 点检员信息 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    点检员姓名
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="请输入姓名"
                  />
                </div>

                {/* 设施信息概览 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">编号：</span>
                      <span className="text-gray-900 dark:text-white">{facility.code}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">类型：</span>
                      <span className="text-gray-900 dark:text-white">{facility.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">型号：</span>
                      <span className="text-gray-900 dark:text-white">{facility.model}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">位置：</span>
                      <span className="text-gray-900 dark:text-white">{facility.location}</span>
                    </div>
                  </div>
                </div>

                {/* 检查项列表 */}
                {checkForm ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white">检查项目</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        共 {checkForm.items.length} 项
                      </span>
                    </div>
                    
                    {checkForm.items.map((item, index) => (
                      <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                        <div className="flex items-start mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mr-2 flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {item.question}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                        </div>

                        {/* 单选题 */}
                        {item.type === 'radio' && item.options && (
                          <div className="ml-8 space-y-2">
                            {item.options.map((option, optIndex) => (
                              <label key={optIndex} className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={item.id}
                                  value={option}
                                  checked={answers[item.id] === option}
                                  onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* 多选题 */}
                        {item.type === 'checkbox' && item.options && (
                          <div className="ml-8 space-y-2">
                            {item.options.map((option, optIndex) => (
                              <label key={optIndex} className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(answers[item.id] as string[])?.includes(option)}
                                  onChange={(e) => handleCheckboxChange(item.id, option, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* 文本输入 */}
                        {item.type === 'text' && (
                          <div className="ml-8">
                            <textarea
                              value={answers[item.id] as string}
                              onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={2}
                              placeholder="请输入..."
                            />
                          </div>
                        )}

                        {/* 数字输入 */}
                        {item.type === 'number' && (
                          <div className="ml-8">
                            <input
                              type="number"
                              value={answers[item.id] as string}
                              onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="请输入数值..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center">
                    <i className="fa-solid fa-exclamation-triangle text-yellow-500 text-2xl mb-2"></i>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      该设施类型暂无检查表单，请联系管理员配置
                    </p>
                  </div>
                )}

                {/* 备注说明 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    补充说明
                  </label>
                  <textarea
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="其他需要说明的情况..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={2}
                  />
                </div>

                {/* 拍照上传 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    现场照片
                  </label>
                  <button className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 flex flex-col items-center hover:border-green-400 hover:text-green-500 transition-colors">
                    <i className="fa-solid fa-camera text-2xl mb-1"></i>
                    <span className="text-sm">点击拍照上传</span>
                  </button>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="p-4 space-y-3">
                <button
                  onClick={handleSubmitInspection}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all active:scale-98"
                >
                  提交点检结果
                </button>
                <button
                  onClick={() => setShowInspectionForm(false)}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-4 rounded-xl transition-all"
                >
                  返回
                </button>
              </div>
            </motion.div>
          ) : inspectionComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              {/* 点检成功卡片 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {/* 成功动画头部 */}
                <div className={`text-white px-4 py-8 text-center ${
                  inspectionResult === 'normal' 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-br from-orange-500 to-red-500'
                }`}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    {inspectionResult === 'normal' ? (
                      <i className="fa-solid fa-check text-4xl"></i>
                    ) : (
                      <i className="fa-solid fa-exclamation-triangle text-4xl"></i>
                    )}
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold"
                  >
                    点检完成
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/80 mt-2"
                  >
                    {inspectionResult === 'normal' ? '设施状态正常' : '发现异常，已记录'}
                  </motion.p>
                </div>

                {/* 点检信息摘要 */}
                <div className="p-4 space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">设施编号</span>
                        <p className="font-medium text-gray-900 dark:text-white">{facility?.code}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">设施类型</span>
                        <p className="font-medium text-gray-900 dark:text-white">{facility?.type}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">点检时间</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">点检结果</span>
                        <p className={`font-medium ${inspectionResult === 'normal' ? 'text-green-600' : 'text-orange-600'}`}>
                          {inspectionResult === 'normal' ? '正常' : '异常'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => navigate('/user')}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all active:scale-98 flex items-center justify-center"
                    >
                      <i className="fa-solid fa-clipboard-list mr-2"></i>
                      查看巡检记录
                    </button>
                    <button
                      onClick={() => {
                        setInspectionComplete(false);
                        // 刷新设施数据
                        const updated = facilities.find(f => f.id === facility?.id);
                        if (updated) {
                          setFacility(updated);
                        }
                      }}
                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-4 rounded-xl transition-all flex items-center justify-center"
                    >
                      <i className="fa-solid fa-qrcode mr-2"></i>
                      继续点检其他设施
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* 设施信息卡片 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {/* 头部 */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">设施编号</p>
                      <h2 className="text-3xl font-bold">{facility.code}</h2>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                      <i className={`fa-solid ${getTypeIcon(facility.type)} text-3xl`}></i>
                    </div>
                  </div>
                </div>

                {/* 二维码 */}
                <div className="p-4 flex justify-center border-b border-gray-100 dark:border-gray-700">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <QRCodeSVG 
                      value={currentUrl}
                      size={150}
                      level="H"
                    />
                  </div>
                </div>

                {/* 详情信息 */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">设施类型</span>
                    <span className="text-gray-900 dark:text-white font-medium">{facility.type}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">型号规格</span>
                    <span className="text-gray-900 dark:text-white font-medium">{facility.model} / {facility.specification}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">放置位置</span>
                    <span className="text-gray-900 dark:text-white font-medium">{facility.location}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">当前状态</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(facility.status)}`}>
                      {getStatusText(facility.status)}
                    </span>
                  </div>
                  {checkForm && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">检查项目</span>
                      <span className="text-gray-900 dark:text-white font-medium">{checkForm.items.length} 项</span>
                    </div>
                  )}
                </div>

                {/* 点检按钮 */}
                <div className="p-4 space-y-3">
                  <button
                    onClick={handleStartInspection}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all active:scale-98 flex items-center justify-center"
                  >
                    <i className="fa-solid fa-clipboard-check mr-2"></i>
                    开始点检
                  </button>
                  
                  {/* 查看巡检记录按钮 - 仅已登录用户显示 */}
                  {isAuthenticated && (
                    <button
                      onClick={() => navigate('/user')}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all active:scale-98 flex items-center justify-center"
                    >
                      <i className="fa-solid fa-clipboard-list mr-2"></i>
                      查看巡检记录
                    </button>
                  )}
                </div>
              </div>

              {/* 检查表单预览 */}
              {checkForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <i className="fa-solid fa-list-check text-blue-600 mr-2"></i>
                    检查项目预览
                  </h3>
                  <div className="space-y-2">
                    {checkForm.items.slice(0, 3).map((item, index) => (
                      <div key={item.id} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs flex items-center justify-center mr-2">
                          {index + 1}
                        </span>
                        <span className="truncate">{item.question}</span>
                      </div>
                    ))}
                    {checkForm.items.length > 3 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
                        还有 {checkForm.items.length - 3} 项...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 历史巡检记录 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <i className="fa-solid fa-clock-rotate-left text-indigo-600 mr-2"></i>
                  过去12个月巡检记录
                  <span className="ml-auto text-xs font-normal text-gray-400">
                    共 {historyRecords.length} 条
                  </span>
                </h3>
                
                {historyRecords.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                    <i className="fa-solid fa-clipboard text-3xl mb-2 opacity-50"></i>
                    <p className="text-sm">暂无巡检记录</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {historyRecords.map((record) => (
                      <div 
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                      >
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            record.status === 'normal' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {record.status === 'normal' ? (
                              <i className="fa-solid fa-check text-green-600 dark:text-green-400 text-xs"></i>
                            ) : (
                              <i className="fa-solid fa-exclamation text-red-600 dark:text-red-400 text-xs"></i>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {record.date} {record.time}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              点检员：{record.inspectorName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'normal' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {record.status === 'normal' ? '正常' : '异常'}
                          </span>
                          {record.notes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[100px] truncate" title={record.notes}>
                              {record.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 提示信息 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start">
                <i className="fa-solid fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">使用说明</p>
                  <p>点击"开始点检"按钮进行设施巡检。如未登录，将跳转到登录页面。</p>
                </div>
              </div>

              {/* 版权信息 */}
              <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4">
                消防设施智能巡检系统 · 安全第一
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
