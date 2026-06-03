import { useContext, useState, useMemo } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData, CheckForm, CheckItemAnswer } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { QRCodeScanner } from '@/components/QRCodeScanner';

// 底部导航类型
type TabType = 'home' | 'scan' | 'history' | 'profile';

export default function UserDashboard() {
  const { userInfo, logout } = useContext(AuthContext);
  const { facilities, updateFacility, addInspectionRecord, inspectionRecords, getCheckFormByFacilityType, getMonthlyInspectionTasks, getUpcomingInspections, getOverdueInspections } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [checkForm, setCheckForm] = useState<CheckForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // 获取待检设施
  const pendingFacilities = facilities.filter(f => f.status === 'pending');
  const normalFacilities = facilities.filter(f => f.status === 'normal');
  const abnormalFacilities = facilities.filter(f => f.status === 'abnormal');
  
  // 获取本月待检任务
  const monthlyTasks = useMemo(() => getMonthlyInspectionTasks(), [facilities]);
  const upcomingInspections = useMemo(() => getUpcomingInspections(7), [facilities]);
  const overdueInspections = useMemo(() => getOverdueInspections(), [facilities]);

  // 扫描设施
  const handleScanFacility = (facilityId: string) => {
    setSelectedFacility(facilityId);
    setActiveTab('scan');
  };

  // 扫描成功处理
  const handleScanSuccess = (decodedText: string) => {
    setShowScanner(false);
    
    // 尝试解析二维码内容
    let facilityCode: string | null = null;
    
    // 1. 尝试解析URL格式（如 https://xxx/inspect/MHQ008 或 /inspect/MHQ008）
    if (decodedText.includes('/inspect/')) {
      const match = decodedText.match(/\/inspect\/([^\/\?]+)/);
      if (match) {
        facilityCode = match[1];
      }
    }
    
    // 2. 尝试解析JSON格式
    if (!facilityCode) {
      try {
        const parsed = JSON.parse(decodedText);
        facilityCode = parsed.code || null;
      } catch {
        // 不是JSON
      }
    }
    
    // 3. 如果都不是，可能是纯文本编号
    if (!facilityCode) {
      facilityCode = decodedText.trim();
    }

    // 从设施数据中查找匹配的设施
    const matchedFacility = facilities.find(f => 
      f.code.toLowerCase() === facilityCode!.toLowerCase()
    );

    if (matchedFacility) {
      setSelectedFacility(matchedFacility.id);
      setActiveTab('scan');
      toast.success(`已识别设施: ${matchedFacility.code}`);
    } else {
      toast.error(`未找到设施编号: ${facilityCode}`);
    }
  };

  // 开始巡检
  const handleStartInspection = () => {
    if (!selectedFacility) return;
    const facility = getSelectedFacilityInfo();
    if (!facility) return;
    
    // 加载对应的检查表单
    const form = getCheckFormByFacilityType(facility.type);
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
    } else {
      setAnswers({});
    }
    
    setInspectionNotes('');
    setShowInspectionForm(true);
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

  // 提交巡检结果
  const handleSubmitInspection = () => {
    if (!validateForm()) return;

    const facility = getSelectedFacilityInfo();
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
      inspectorName: userInfo?.name || '未知',
      notes: inspectionNotes || undefined,
      answers: checkItemAnswers,
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });
    
    toast.success('巡检记录已提交');
    setShowInspectionForm(false);
    setSelectedFacility(null);
    setActiveTab('home');
  };

  // 获取选中的设施信息
  const getSelectedFacilityInfo = () => {
    if (!selectedFacility) return null;
    return facilities.find(f => f.id === selectedFacility);
  };

  // 渲染主页
  const renderHome = () => (
    <div className="pb-20">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-4 py-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm">今日巡检</p>
            <h1 className="text-2xl font-bold">{userInfo?.name || '巡检员'}</h1>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-user text-xl"></i>
          </div>
        </div>
        <p className="text-blue-100 text-sm">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 -mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <i className="fa-solid fa-clock text-yellow-600 dark:text-yellow-400"></i>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingFacilities.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">待检</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <i className="fa-solid fa-check text-green-600 dark:text-green-400"></i>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{normalFacilities.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">正常</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <i className="fa-solid fa-exclamation text-red-600 dark:text-red-400"></i>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{abnormalFacilities.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">异常</p>
          </div>
        </div>
      </div>

      {/* 本月任务卡片 */}
      <div className="px-4 mt-4">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <i className="fa-solid fa-calendar-day text-xl mr-2"></i>
              <span className="font-semibold">本月巡检任务</span>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
              {monthlyTasks.length} 项
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/10 rounded-xl py-2">
              <p className="text-xl font-bold">{monthlyTasks.length}</p>
              <p className="text-xs text-blue-100">本月待检</p>
            </div>
            <div className="bg-white/10 rounded-xl py-2">
              <p className="text-xl font-bold text-yellow-300">{upcomingInspections.length}</p>
              <p className="text-xs text-blue-100">即将到期</p>
            </div>
            <div className="bg-white/10 rounded-xl py-2">
              <p className="text-xl font-bold text-red-300">{overdueInspections.length}</p>
              <p className="text-xs text-blue-100">已逾期</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速扫描按钮 */}
      <div className="px-4 mt-6">
        <button 
          onClick={() => {
            setActiveTab('scan');
            setSelectedFacility(null);
          }}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 px-6 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center text-lg active:scale-98"
        >
          <i className="fa-solid fa-qrcode mr-3 text-2xl"></i>
          扫描消防设施
        </button>
      </div>

      {/* 本月待检设施列表 */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">本月待检设施</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">共 {monthlyTasks.length} 项</span>
        </div>
        
        {monthlyTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
            <i className="fa-solid fa-check-circle text-green-500 text-4xl mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">本月暂无待检设施</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthlyTasks.slice(0, 5).map((facility) => {
              const isOverdue = facility.nextInspectionDate && new Date(facility.nextInspectionDate) < new Date();
              return (
                <motion.div
                  key={facility.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleScanFacility(facility.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-3 ${
                        isOverdue 
                          ? 'bg-red-100 dark:bg-red-900/30' 
                          : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                        <i className={`fa-solid fa-fire-extinguisher text-lg ${
                          isOverdue 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{facility.code}</p>
                          {isOverdue && (
                            <span className="ml-2 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                              已逾期
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{facility.type} · {facility.location}</p>
                        {facility.nextInspectionDate && (
                          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            应检日期：{facility.nextInspectionDate}
                          </p>
                        )}
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-gray-400 ml-2"></i>
                  </div>
                </motion.div>
              );
            })}
            {monthlyTasks.length > 5 && (
              <button 
                onClick={() => setActiveTab('history')}
                className="w-full text-center text-blue-600 dark:text-blue-400 text-sm py-2"
              >
                还有 {monthlyTasks.length - 5} 项待检设施...
              </button>
            )}
          </div>
        )}
      </div>

      {/* 最近巡检 */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">最近巡检</h2>
          <button 
            onClick={() => setActiveTab('history')}
            className="text-sm text-blue-600 dark:text-blue-400"
          >
            查看全部
          </button>
        </div>
        
        <div className="space-y-3">
          {inspectionRecords.slice(0, 3).map((record) => (
            <div
              key={record.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">{record.facilityCode}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  record.status === 'normal' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {record.status === 'normal' ? '正常' : '异常'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{record.type} · {record.facilityName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{record.date} {record.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染扫描页面
  const renderScan = () => {
    const facility = getSelectedFacilityInfo();
    
    if (showInspectionForm) {
      return (
        <div className="pb-20 px-4">
          {/* 巡检表单 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mt-4">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-4">
              <h2 className="text-lg font-bold">{checkForm?.name || '巡检表单'}</h2>
              <p className="text-sm text-green-100">{facility?.code} - {facility?.type}</p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* 设施信息 */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">编号：</span>
                    <span className="text-gray-900 dark:text-white">{facility?.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">类型：</span>
                    <span className="text-gray-900 dark:text-white">{facility?.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">型号：</span>
                    <span className="text-gray-900 dark:text-white">{facility?.model}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">位置：</span>
                    <span className="text-gray-900 dark:text-white">{facility?.location}</span>
                  </div>
                </div>
              </div>

              {/* 检查项列表 */}
              {checkForm ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">检查项目</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      共 {checkForm.items.length} 项
                    </span>
                  </div>
                  
                  {checkForm.items.map((item, index) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-start mb-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold mr-2 flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-gray-900 dark:text-white text-sm font-medium">
                          {item.question}
                          {item.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </div>

                      {/* 单选题 */}
                      {item.type === 'radio' && item.options && (
                        <div className="ml-7 space-y-1.5">
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
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 多选题 */}
                      {item.type === 'checkbox' && item.options && (
                        <div className="ml-7 space-y-1.5">
                          {item.options.map((option, optIndex) => (
                            <label key={optIndex} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(answers[item.id] as string[])?.includes(option)}
                                onChange={(e) => handleCheckboxChange(item.id, option, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 文本输入 */}
                      {item.type === 'text' && (
                        <div className="ml-7">
                          <textarea
                            value={answers[item.id] as string}
                            onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={2}
                            placeholder="请输入..."
                          />
                        </div>
                      )}

                      {/* 数字输入 */}
                      {item.type === 'number' && (
                        <div className="ml-7">
                          <input
                            type="number"
                            value={answers[item.id] as string}
                            onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    该设施类型暂无检查表单
                  </p>
                </div>
              )}

              {/* 备注说明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">补充说明</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">现场照片</label>
                <button className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 flex flex-col items-center">
                  <i className="fa-solid fa-camera text-xl mb-1"></i>
                  <span className="text-sm">点击拍照上传</span>
                </button>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="p-4 space-y-3">
              <button
                onClick={handleSubmitInspection}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all active:scale-98"
              >
                提交巡检结果
              </button>
              <button
                onClick={() => setShowInspectionForm(false)}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-4 rounded-xl transition-all"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="pb-20 px-4">
        <div className="pt-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">扫描巡检</h1>
          
          {facility ? (
            // 显示选中的设施
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
            >
              {/* 设施信息头部 */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">设施编号</p>
                    <h2 className="text-2xl font-bold">{facility.code}</h2>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-fire-extinguisher text-2xl"></i>
                  </div>
                </div>
              </div>

              {/* 二维码 */}
              <div className="p-4 flex justify-center">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <QRCodeSVG 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/inspect/${facility.code}`}
                    size={180}
                    level="H"
                  />
                </div>
              </div>

              {/* 设施详情 */}
              <div className="px-4 pb-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">设施类型</span>
                    <span className="text-gray-900 dark:text-white font-medium">{facility.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">型号规格</span>
                    <span className="text-gray-900 dark:text-white font-medium">{facility.model} / {facility.specification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">放置位置</span>
                    <span className="text-gray-900 dark:text-white font-medium">{facility.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">当前状态</span>
                    <span className={`font-medium ${
                      facility.status === 'normal' ? 'text-green-600' : 
                      facility.status === 'abnormal' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {facility.status === 'normal' ? '正常' : facility.status === 'abnormal' ? '异常' : '待检'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="p-4 space-y-3">
                <button
                  onClick={handleStartInspection}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all active:scale-98 flex items-center justify-center"
                >
                  <i className="fa-solid fa-clipboard-check mr-2"></i>
                  开始巡检
                </button>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-4 rounded-xl transition-all"
                >
                  重新扫描
                </button>
              </div>
            </motion.div>
          ) : (
            // 扫描界面
            <div className="space-y-4">
              {/* 扫描区域 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                {showScanner ? (
                  <div className="space-y-4">
                    <QRCodeScanner
                      onScanSuccess={handleScanSuccess}
                      onScanError={(error: string) => {
                        console.error('扫描错误:', error);
                        toast.error('扫描失败，请重试');
                      }}
                    />
                    <button
                      onClick={() => setShowScanner(false)}
                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-xl transition-all"
                    >
                      取消扫描
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-600 rounded-xl flex flex-col items-center justify-center mb-4 relative overflow-hidden">
                      <div className="absolute inset-4 border-2 border-dashed border-blue-400 rounded-lg animate-pulse"></div>
                      <i className="fa-solid fa-qrcode text-6xl text-blue-500 dark:text-blue-400 mb-3"></i>
                      <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">扫码开始巡检</p>
                    </div>
                    <button
                      onClick={() => setShowScanner(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-98 flex items-center justify-center"
                    >
                      <i className="fa-solid fa-camera mr-2"></i>
                      打开摄像头扫描
                    </button>
                  </>
                )}
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-4">
                  或从下方列表选择设施进行巡检
                </p>
              </div>

              {/* 快速选择待检设施 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">快速选择待检设施</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pendingFacilities.length > 0 ? (
                    pendingFacilities.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFacility(f.id)}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-left flex items-center active:bg-gray-100 dark:active:bg-gray-600 transition-colors"
                      >
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mr-3">
                          <i className="fa-solid fa-fire-extinguisher text-yellow-600 dark:text-yellow-400"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">{f.code}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.type} · {f.location}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-gray-400"></i>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <i className="fa-solid fa-check-circle text-4xl text-green-500 mb-2"></i>
                      <p>暂无待检设施</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染历史记录
  const renderHistory = () => {
    // 计算统计数据
    const totalCount = inspectionRecords.length;
    const normalCount = inspectionRecords.filter(r => r.status === 'normal').length;
    const abnormalCount = inspectionRecords.filter(r => r.status === 'abnormal').length;
    
    return (
    <div className="pb-20 px-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">巡检历史</h1>
        
        {/* 统计概览 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">总巡检</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{normalCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">正常</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{abnormalCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">异常</p>
          </div>
        </div>

        {/* 历史列表 */}
        <div className="space-y-3">
          {inspectionRecords.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
              <i className="fa-solid fa-clipboard-list text-gray-400 text-4xl mb-3"></i>
              <p className="text-gray-500 dark:text-gray-400">暂无巡检记录</p>
            </div>
          ) : (
            inspectionRecords.map((record) => (
            <motion.div
              key={record.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      record.status === 'normal' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <i className={`fa-solid fa-fire-extinguisher ${
                        record.status === 'normal' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}></i>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{record.facilityCode}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{record.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    record.status === 'normal' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {record.status === 'normal' ? '正常' : '异常'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{record.facilityName}</span>
                  <span className="text-gray-400 dark:text-gray-500">{record.date} {record.time}</span>
                </div>
                {record.notes && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                    <i className="fa-solid fa-exclamation-circle mr-1"></i>
                    {record.notes}
                  </div>
                )}
                {/* 显示检查项答案 */}
                {record.answers && record.answers.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">检查项：</p>
                    <div className="flex flex-wrap gap-1">
                      {record.answers.slice(0, 3).map((answer, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                          {typeof answer.answer === 'string' ? answer.answer : answer.answer.join(',')}
                        </span>
                      ))}
                      {record.answers.length > 3 && (
                        <span className="text-xs text-gray-400">+{record.answers.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
          )}
        </div>
      </div>
    </div>
  )};

  // 渲染个人中心
  const renderProfile = () => {
    // 计算当前用户的统计数据
    const myRecords = inspectionRecords.filter(r => r.inspectorId === userInfo?.id);
    const myTotal = myRecords.length;
    const myNormal = myRecords.filter(r => r.status === 'normal').length;
    
    return (
    <div className="pb-20 px-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">个人中心</h1>
        
        {/* 用户信息卡片 */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mr-4">
              <i className="fa-solid fa-user text-3xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold">{userInfo?.name || '巡检员'}</h2>
              <p className="text-blue-100">{userInfo?.department || '消防安全部'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-2xl font-bold">{myNormal}</p>
              <p className="text-xs text-blue-100">正常巡检</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-2xl font-bold">{myTotal}</p>
              <p className="text-xs text-blue-100">累计巡检</p>
            </div>
          </div>
        </div>

        {/* 功能列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-4">
          <button className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-3">
                <i className="fa-solid fa-bell text-blue-600 dark:text-blue-400"></i>
              </div>
              <span className="text-gray-900 dark:text-white">消息通知</span>
            </div>
            <div className="flex items-center">
              <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center mr-2">3</span>
              <i className="fa-solid fa-chevron-right text-gray-400"></i>
            </div>
          </button>
          <button className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mr-3">
                <i className="fa-solid fa-chart-line text-green-600 dark:text-green-400"></i>
              </div>
              <span className="text-gray-900 dark:text-white">我的统计</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-400"></i>
          </button>
          <button className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mr-3">
                <i className="fa-solid fa-gear text-purple-600 dark:text-purple-400"></i>
              </div>
              <span className="text-gray-900 dark:text-white">设置</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-400"></i>
          </button>
        </div>

        {/* 退出登录 */}
        <button
          onClick={logout}
          className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium py-4 rounded-2xl flex items-center justify-center active:bg-red-100 dark:active:bg-red-900/30"
        >
          <i className="fa-solid fa-right-from-bracket mr-2"></i>
          退出登录
        </button>
      </div>
    </div>
  )};

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* 主内容区域 */}
      <main className="min-h-screen">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {renderHome()}
            </motion.div>
          )}
          {activeTab === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {renderScan()}
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {renderHistory()}
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {renderProfile()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center w-16 py-1 ${
              activeTab === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <i className={`fa-solid fa-home text-xl mb-1 ${activeTab === 'home' ? 'text-blue-600 dark:text-blue-400' : ''}`}></i>
            <span className="text-xs">首页</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center w-16 py-1 ${
              activeTab === 'scan' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg ${
              activeTab === 'scan' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              <i className="fa-solid fa-qrcode text-xl"></i>
            </div>
            <span className="text-xs mt-1">扫描</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center w-16 py-1 ${
              activeTab === 'history' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <i className={`fa-solid fa-clock-rotate-left text-xl mb-1 ${activeTab === 'history' ? 'text-blue-600 dark:text-blue-400' : ''}`}></i>
            <span className="text-xs">历史</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center w-16 py-1 ${
              activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <i className={`fa-solid fa-user text-xl mb-1 ${activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : ''}`}></i>
            <span className="text-xs">我的</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
