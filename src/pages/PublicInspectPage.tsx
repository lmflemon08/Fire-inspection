import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { sql } from '../lib/db';
import { AuthContext } from '@/contexts/authContext';
import { useData, CheckForm, CheckItem, CheckItemAnswer, InspectionCycle } from '@/contexts/DataContext';

// 根据巡检周期计算下次巡检日期
const calculateNextInspectionDate = (currentDate: Date, cycle: InspectionCycle): string => {
  const nextDate = new Date(currentDate);
  
  switch (cycle) {
    case 'weekly':      // 每周
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':     // 每月
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':   // 每季度（3个月）
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':      // 每年
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1); // 默认每月
  }
  
  // 格式化为 YYYY-MM-DD
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 获取当前日期字符串 YYYY-MM-DD
const getCurrentDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 称重比较结果组件
interface WeightComparisonResultProps {
  initialValue: number;
  currentValue: number;
  threshold: number;
}

const WeightComparisonResult: React.FC<WeightComparisonResultProps> = ({ initialValue, currentValue, threshold }) => {
  const diff = Math.abs(currentValue - initialValue);
  const isAbnormal = diff > threshold;
  const percentage = ((diff / initialValue) * 100).toFixed(2);

  return (
    <div className={`mt-2 p-3 rounded-lg border ${
      isAbnormal 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${
          isAbnormal ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
        }`}>
          <i className={`fa-solid ${isAbnormal ? 'fa-circle-xmark' : 'fa-circle-check'} mr-1`}></i>
          {isAbnormal ? '超出阈值（异常）' : '在正常范围内'}
        </span>
        <span className={`text-lg font-bold ${
          isAbnormal ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}>
          {isAbnormal ? '异常' : '正常'}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>初始重量：{initialValue} g</span>
          <span>当前重量：{currentValue} g</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>重量差值：{diff} g ({percentage}%)</span>
          <span className={isAbnormal ? 'text-red-600 font-medium' : ''}>
            阈值：±{threshold} g
          </span>
        </div>
      </div>
    </div>
  );
};

export default function PublicInspectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userInfo } = useContext(AuthContext);
  const { facilities, updateFacility, addInspectionRecord, getCheckFormByFacilityType, inspectionRecords, loading } = useData();
  
  // 设施状态类型，包含 inspectionCycle
  const [facility, setFacility] = useState<{
    id: string;
    code: string;
    type: string;
    model: string;
    specification: string;
    location: string;
    status: 'stored' | 'normal' | 'abnormal';
    inspectionCycle: InspectionCycle;
    lastInspectionDate?: string;
    nextInspectionDate?: string;
    initialWeight?: number;
    serviceLife?: number;
    purchaseDate?: string;
  } | null>(null);
  
  const [checkForm, setCheckForm] = useState<CheckForm | null>(null);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectorName, setInspectorName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionComplete, setInspectionComplete] = useState(false); // 点检完成状态
  const [inspectionResult, setInspectionResult] = useState<'normal' | 'abnormal'>('normal'); // 点检结果

  // 根据编号查找设施（优先从 DataContext 缓存，否则直接查询数据库）
  const [directLoading, setDirectLoading] = useState(false);
  
  useEffect(() => {
    if (!code) return;
    
    // 先尝试从 DataContext 缓存查找
    const found = facilities.find(f => 
      f.code.toLowerCase() === code.toLowerCase()
    );
    
    if (found) {
      setFacility(found);
      const form = getCheckFormByFacilityType(found.type);
      setCheckForm(form || null);
      
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
    } else if (!loading) {
      // DataContext 已加载完成但未找到，直接查询数据库
      setDirectLoading(true);
      sql`SELECT * FROM facilities WHERE code = ${code} LIMIT 1`
        .then((rows: any[]) => {
          if (rows && rows.length > 0) {
            const dbToFacility = (db: any) => ({
              id: db.id,
              code: db.code,
              type: db.type || '',
              location: db.location || '',
              status: db.status || 'normal',
              inspectionCycle: db.inspection_cycle || 'monthly',
              lastInspectionDate: db.last_inspection_date 
                ? (db.last_inspection_date instanceof Date 
                    ? `${db.last_inspection_date.getFullYear()}-${String(db.last_inspection_date.getMonth()+1).padStart(2,'0')}-${String(db.last_inspection_date.getDate()).padStart(2,'0')}`
                    : String(db.last_inspection_date).split('T')[0])
                : undefined,
              nextInspectionDate: db.next_inspection_date
                ? (db.next_inspection_date instanceof Date
                    ? `${db.next_inspection_date.getFullYear()}-${String(db.next_inspection_date.getMonth()+1).padStart(2,'0')}-${String(db.next_inspection_date.getDate()).padStart(2,'0')}`
                    : String(db.next_inspection_date).split('T')[0])
                : undefined,
              serviceLife: db.service_life ? Number(db.service_life) : undefined,
              initialWeight: db.initial_weight ? Number(db.initial_weight) : undefined,
              purchaseDate: db.purchase_date
                ? (db.purchase_date instanceof Date
                    ? `${db.purchase_date.getFullYear()}-${String(db.purchase_date.getMonth()+1).padStart(2,'0')}-${String(db.purchase_date.getDate()).padStart(2,'0')}`
                    : String(db.purchase_date).split('T')[0])
                : undefined,
              retirementDate: db.retirement_date
                ? (db.retirement_date instanceof Date
                    ? `${db.retirement_date.getFullYear()}-${String(db.retirement_date.getMonth()+1).padStart(2,'0')}-${String(db.retirement_date.getDate()).padStart(2,'0')}`
                    : String(db.retirement_date).split('T')[0])
                : undefined,
              createdAt: db.created_at,
              updatedAt: db.updated_at,
            });
            const facility = dbToFacility(rows[0]) as any;
            setFacility(facility);
            const form = getCheckFormByFacilityType(facility.type);
            setCheckForm(form || null);
            
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
        })
        .catch((err: any) => console.error('直接查询设施失败:', err))
        .finally(() => setDirectLoading(false));
    }
  }, [code, facilities, loading, getCheckFormByFacilityType]);

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

  // 判断巡检结果 - 统一调用 isItemAbnormal，与单检查项异常判断保持一致
  const determineInspectionResult = (): 'normal' | 'abnormal' => {
    if (!checkForm) return 'normal';
    
    for (const item of checkForm.items) {
      const answer = answers[item.id];
      if (isItemAbnormal(item, answer)) {
        return 'abnormal';
      }
    }
    return 'normal';
  };

  // 判断单个检查项是否异常
  const isItemAbnormal = (item: CheckItem, answer: string | string[] | undefined): boolean => {
    if (!answer) return false;
    
    // 检查称重类检查项
    if (item.type === 'weight' && item.compareWithInitial && item.threshold) {
      const initialWeight = facility?.initialWeight;
      if (initialWeight && !isNaN(Number(answer))) {
        const diff = Math.abs(Number(answer) - initialWeight);
        if (diff > item.threshold) return true;
      }
    }
    
    // 检查其他数值类检查项
    if (item.type === 'number' && item.initialValue && item.threshold) {
      if (!isNaN(Number(answer))) {
        const diff = Math.abs(Number(answer) - item.initialValue);
        if (diff > item.threshold) return true;
      }
    }
    
    // 检查文本类答案关键字
    if (typeof answer === 'string') {
      // 提取答案主体（去除括号内的说明，例如"正常（无损坏）" → "正常"）
      const mainAnswer = answer.split(/[（(]/)[0].trim();
      
      // 否定前缀词：包含这些词表示"无问题"
      const negationPrefixes = ['无', '不', '未', '正常', '完好', '良好', '有效'];
      
      // 异常关键词
      const abnormalKeywords = ['异常', '损坏', '否', '卡死', '偏低', '偏高', '老化', '泄漏', '堵塞', '缺失'];
      
      // 检查异常关键词（但排除否定形式）
      for (const keyword of abnormalKeywords) {
        if (mainAnswer.includes(keyword)) {
          // 如果前面紧跟否定词，则不算异常
          const index = mainAnswer.indexOf(keyword);
          const prevChar = index > 0 ? mainAnswer[index - 1] : '';
          if (!negationPrefixes.includes(prevChar) && !mainAnswer.startsWith(keyword)) {
            return true;
          }
        }
      }
      
      // 特殊处理：单独的"否"字答案
      if (mainAnswer === '否' || mainAnswer === '不正常' || mainAnswer === '有损坏') {
        return true;
      }
    }
    
    return false;
  };

  // 提交点检结果
  const handleSubmitInspection = async () => {
    if (!validateForm()) return;
    if (!facility) return;

    const status = determineInspectionResult();
    const currentDate = getCurrentDateString();

    // 自动计算下次巡检日期
    const nextDate = calculateNextInspectionDate(new Date(), facility.inspectionCycle);

    // 更新设施状态和下次巡检日期（await 确保完成）
    await updateFacility(facility.id, {
      status,
      lastInspectionDate: currentDate,
      nextInspectionDate: nextDate
    });

    // 构建检查项答案数组
    const checkItemAnswers: CheckItemAnswer[] = [];
    if (checkForm) {
      checkForm.items.forEach(item => {
        const itemAnswer = answers[item.id];
        const abnormal = isItemAbnormal(item, itemAnswer);
        checkItemAnswers.push({
          itemId: item.id,
          question: item.question,
          answer: itemAnswer,
          isAbnormal: abnormal
        });
      });
    }

    // 添加巡检记录
    const now = new Date();
    await addInspectionRecord({
      facilityId: facility.id,
      facilityCode: facility.code,
      facilityName: facility.location,
      type: facility.type,
      status,
      inspectorId: userInfo?.id || '',
      inspectorName: inspectorName || userInfo?.name || '未知',
      notes: inspectionNotes || undefined,
      answers: checkItemAnswers,
      date: currentDate,
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });

    // 显示点检完成页面
    setInspectionResult(status);
    setInspectionComplete(true);
    setShowInspectionForm(false);
    
    // 显示下次巡检时间提示
    toast.success(`点检完成！下次巡检时间：${nextDate}`, {
      duration: 4000
    });
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

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <i className="fa-solid fa-spinner text-3xl text-blue-500 animate-spin"></i>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">加载中...</h1>
          <p className="text-gray-500 dark:text-gray-400">
            正在获取设施信息，请稍候
          </p>
        </motion.div>
      </div>
    );
  }

  // 加载中状态
  if (loading || directLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-500"></i>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">加载中...</h1>
          <p className="text-gray-500 dark:text-gray-400">
            正在获取设施信息
          </p>
        </motion.div>
      </div>
    );
  }

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
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">周期：</span>
                      <span className="text-gray-900 dark:text-white">
                        {facility.inspectionCycle === 'weekly' ? '每周' :
                         facility.inspectionCycle === 'monthly' ? '每月' :
                         facility.inspectionCycle === 'quarterly' ? '每季度' :
                         facility.inspectionCycle === 'yearly' ? '每年' : '每月'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">下次巡检：</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {facility.nextInspectionDate || '未设置'}
                      </span>
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
                        {(item.type === 'number' || item.type === 'weight') && (
                          <div className="ml-8">
                            {/* 显示初始值信息 */}
                            {item.compareWithInitial && facility && (
                              <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-blue-700 dark:text-blue-300">
                                    <i className="fa-solid fa-scale-balanced mr-1"></i>
                                    初始重量：
                                  </span>
                                  <span className="font-semibold text-blue-800 dark:text-blue-200">
                                    {facility.initialWeight ? `${facility.initialWeight} g` : '未设置'}
                                  </span>
                                </div>
                                {item.threshold && (
                                  <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-blue-700 dark:text-blue-300">
                                      <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                      告警阈值：
                                    </span>
                                    <span className="font-semibold text-blue-800 dark:text-blue-200">
                                      ±{item.threshold} g
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {!item.compareWithInitial && item.initialValue && (
                              <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-blue-700 dark:text-blue-300">
                                    <i className="fa-solid fa-scale-balanced mr-1"></i>
                                    初始值：
                                  </span>
                                  <span className="font-semibold text-blue-800 dark:text-blue-200">
                                    {item.initialValue} g
                                  </span>
                                </div>
                                {item.threshold && (
                                  <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-blue-700 dark:text-blue-300">
                                      <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                      告警阈值：
                                    </span>
                                    <span className="font-semibold text-blue-800 dark:text-blue-200">
                                      ±{item.threshold} g
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 数值输入 */}
                            <input
                              type="number"
                              value={answers[item.id] as string}
                              onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={item.type === 'weight' ? "请输入称重数值（单位：g）..." : "请输入数值..."}
                            />

                            {/* 自动判断结果 */}
                            {item.compareWithInitial && facility && facility.initialWeight && item.threshold && answers[item.id] && (
                              <WeightComparisonResult
                                initialValue={facility.initialWeight}
                                currentValue={Number(answers[item.id])}
                                threshold={item.threshold}
                              />
                            )}
                            {!item.compareWithInitial && item.initialValue && item.threshold && answers[item.id] && (
                              <WeightComparisonResult
                                initialValue={item.initialValue}
                                currentValue={Number(answers[item.id])}
                                threshold={item.threshold}
                              />
                            )}
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
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">巡检周期</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {facility.inspectionCycle === 'weekly' ? '每周' :
                       facility.inspectionCycle === 'monthly' ? '每月' :
                       facility.inspectionCycle === 'quarterly' ? '每季度' :
                       facility.inspectionCycle === 'yearly' ? '每年' : '每月'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500 dark:text-gray-400">下次巡检</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {facility.nextInspectionDate || '未设置'}
                    </span>
                  </div>
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
