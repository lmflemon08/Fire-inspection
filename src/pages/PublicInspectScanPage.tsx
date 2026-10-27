import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { sql } from '../lib/db';
import { AuthContext } from '@/contexts/authContext';
import type { CheckForm, CheckItem, CheckItemAnswer, InspectionCycle } from '@/contexts/DataContext';

// 根据巡检周期计算下次巡检日期
const calculateNextInspectionDate = (currentDate: Date, cycle: InspectionCycle): string => {
  const nextDate = new Date(currentDate);
  switch (cycle) {
    case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
    case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
    case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
    case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    default: nextDate.setMonth(nextDate.getMonth() + 1);
  }
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const dateToStr = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return String(d).split('T')[0];
};

interface FacilityData {
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
}

export default function PublicInspectScanPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userInfo } = useContext(AuthContext);

  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [checkForm, setCheckForm] = useState<CheckForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectorName, setInspectorName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inspectionComplete, setInspectionComplete] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<'normal' | 'abnormal'>('normal');
  const [nextDate, setNextDate] = useState('');

  // 加载设施信息 + 检查表单（直接查数据库，不依赖 DataProvider）
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      sql`SELECT * FROM facilities WHERE code = ${code} LIMIT 1`,
      sql`SELECT * FROM check_forms ORDER BY created_at ASC`
    ])
      .then(([facilityRows, formRows]: [any[], any[]]) => {
        if (cancelled) return;
        if (facilityRows && facilityRows.length > 0) {
          const db = facilityRows[0];
          const f: FacilityData = {
            id: db.id,
            code: db.code,
            type: db.type || '',
            model: db.model || '',
            specification: db.specification || '',
            location: db.location || '',
            status: db.status || 'normal',
            inspectionCycle: (db.inspection_cycle || 'monthly') as InspectionCycle,
            lastInspectionDate: dateToStr(db.last_inspection_date) || undefined,
            nextInspectionDate: dateToStr(db.next_inspection_date) || undefined,
            initialWeight: db.initial_weight ? Number(db.initial_weight) : undefined,
          };
          setFacility(f);

          // 从表单列表中找到匹配的检查表单
          if (formRows && formRows.length > 0) {
            const formDb = formRows.find((fr: any) => fr.facility_type === f.type) || formRows[0];
            if (formDb) {
              const form: CheckForm = {
                id: formDb.id,
                name: formDb.name,
                facilityType: formDb.facility_type,
                items: formDb.items || []
              };
              setCheckForm(form);
              const initial: Record<string, string | string[]> = {};
              form.items.forEach((item: CheckItem) => {
                initial[item.id] = item.type === 'checkbox' ? [] : '';
              });
              setAnswers(initial);
            }
          }
        }
      })
      .catch((err: any) => {
        if (!cancelled) console.error('加载数据失败:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [code]);

  // 登录后自动填充巡检人
  useEffect(() => {
    if (isAuthenticated && userInfo?.name) {
      setInspectorName(userInfo.name);
    }
  }, [isAuthenticated, userInfo]);

  // 判断单个检查项是否异常
  const isItemAbnormal = (item: CheckItem, answer: string | string[] | undefined): boolean => {
    if (!answer) return false;
    if ((item.type === 'weight' || (item.type === 'number' && item.compareWithInitial)) && item.threshold) {
      const initialWeight = facility?.initialWeight;
      if (initialWeight && !isNaN(Number(answer))) {
        const diff = Math.abs(Number(answer) - initialWeight);
        if (diff > item.threshold) return true;
      }
    }
    if (item.type === 'number' && item.initialValue && item.threshold && !item.compareWithInitial) {
      if (!isNaN(Number(answer))) {
        const diff = Math.abs(Number(answer) - item.initialValue);
        if (diff > item.threshold) return true;
      }
    }
    if (typeof answer === 'string') {
      const mainAnswer = answer.split(/[（(]/)[0].trim();
      const negationPrefixes = ['无', '不', '未', '正常', '完好', '良好', '有效'];
      const abnormalKeywords = ['异常', '损坏', '否', '卡死', '偏低', '偏高', '老化', '泄漏', '堵塞', '缺失'];
      for (const keyword of abnormalKeywords) {
        if (mainAnswer.includes(keyword)) {
          const index = mainAnswer.indexOf(keyword);
          const prevChar = index > 0 ? mainAnswer[index - 1] : '';
          if (!negationPrefixes.includes(prevChar) && !mainAnswer.startsWith(keyword)) {
            return true;
          }
        }
      }
      if (mainAnswer === '否' || mainAnswer === '不正常' || mainAnswer === '有损坏') {
        return true;
      }
    }
    return false;
  };

  const determineInspectionResult = (): 'normal' | 'abnormal' => {
    if (!checkForm) return 'normal';
    for (const item of checkForm.items) {
      if (isItemAbnormal(item, answers[item.id])) return 'abnormal';
    }
    return 'normal';
  };

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

  const handleSubmit = async () => {
    if (!validateForm() || !facility || submitting) return;
    setSubmitting(true);

    try {
      const status = determineInspectionResult();
      const currentDate = getCurrentDateString();
      const next = calculateNextInspectionDate(new Date(), facility.inspectionCycle);
      setNextDate(next);

      const now = new Date();
      const recordId = crypto.randomUUID();

      const checkItemAnswers: CheckItemAnswer[] = [];
      if (checkForm) {
        checkForm.items.forEach(item => {
          const itemAnswer = answers[item.id];
          checkItemAnswers.push({
            itemId: item.id,
            question: item.question,
            answer: itemAnswer,
            isAbnormal: isItemAbnormal(item, itemAnswer)
          });
        });
      }

      // 直接插入巡检记录
      await sql`
        INSERT INTO inspection_records (id, facility_id, facility_code, facility_name, type, status, inspector_id, inspector_name, notes, answers, date, time, issue_status)
        VALUES (${recordId}, ${facility.id}, ${facility.code}, ${facility.location || null}, ${facility.type || null}, ${status}, ${userInfo?.id || null}, ${inspectorName || userInfo?.name || '未知'}, ${inspectionNotes || null}, ${JSON.stringify(checkItemAnswers)}::jsonb, ${currentDate}, ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}, ${status === 'abnormal' ? 'pending' : null})
      `;

      // 更新设施状态与巡检日期
      await sql`
        UPDATE facilities SET status = ${status}, last_inspection_date = ${currentDate}, next_inspection_date = ${next}, updated_at = NOW()
        WHERE id = ${facility.id}
      `;

      setInspectionResult(status);
      setInspectionComplete(true);
      toast.success(`点检完成！下次巡检时间：${next}`, { duration: 4000 });
    } catch (err) {
      console.error('提交点检失败:', err);
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (itemId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: value }));
  };

  const handleCheckboxChange = (itemId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = prev[itemId] as string[];
      if (checked) return { ...prev, [itemId]: [...current, option] };
      return { ...prev, [itemId]: current.filter(o => o !== option) };
    });
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">加载中...</h1>
          <p className="text-gray-500 text-sm">正在获取设施信息</p>
        </motion.div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-qrcode text-3xl text-red-500"></i>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">未找到设施</h1>
          <p className="text-gray-500 text-sm mb-4">设施编号 "{code}" 不存在</p>
          <button onClick={() => navigate('/')} className="text-blue-600 text-sm font-medium">返回首页</button>
        </motion.div>
      </div>
    );
  }

  // 点检完成页面
  if (inspectionComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center">
            <i className="fa-solid fa-shield-halved text-xl mr-2"></i>
            <span className="font-semibold text-lg">点检完成</span>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-8">
          <motion.div className="bg-white rounded-2xl shadow-lg p-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${inspectionResult === 'normal' ? 'bg-green-100' : 'bg-red-100'}`}>
              <i className={`fa-solid ${inspectionResult === 'normal' ? 'fa-circle-check text-green-500' : 'fa-circle-xmark text-red-500'} text-4xl`}></i>
            </div>
            <h2 className={`text-xl font-bold mb-2 ${inspectionResult === 'normal' ? 'text-green-600' : 'text-red-600'}`}>
              {inspectionResult === 'normal' ? '点检正常' : '发现异常'}
            </h2>
            <p className="text-gray-500 text-sm mb-1">{facility.code} - {facility.type}</p>
            <p className="text-gray-500 text-sm mb-4">下次巡检时间：{nextDate}</p>
            <div className="space-y-3">
              <button onClick={() => navigate(`/inspect/${code}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium transition-colors">
                <i className="fa-solid fa-arrow-left mr-2"></i>返回设施信息
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* 顶部 */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(`/inspect/${code}`)} className="mr-3 p-1">
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <div>
              <h1 className="font-bold text-lg">{checkForm?.name || '消防设施点检'}</h1>
              <p className="text-sm text-green-100">{facility.code} - {facility.type}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-8">
        {/* 设施信息概览 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-400 text-xs">编号</span>
              <p className="font-medium text-gray-900">{facility.code}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-400 text-xs">类型</span>
              <p className="font-medium text-gray-900">{facility.type}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-400 text-xs">位置</span>
              <p className="font-medium text-gray-900 truncate">{facility.location}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-400 text-xs">周期</span>
              <p className="font-medium text-gray-900">
                {facility.inspectionCycle === 'weekly' ? '每周' :
                 facility.inspectionCycle === 'monthly' ? '每月' :
                 facility.inspectionCycle === 'quarterly' ? '每季度' : '每年'}
              </p>
            </div>
          </div>
        </div>

        {/* 未登录提示 */}
        {!isAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
            <p className="text-yellow-800 text-sm mb-2">
              <i className="fa-solid fa-triangle-exclamation mr-1"></i>
              请先登录后再进行点检
            </p>
            <button onClick={() => navigate(`/login?redirect=/inspect/${code}/scan`)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              去登录
            </button>
          </div>
        )}

        {/* 点检表单 */}
        {isAuthenticated && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 space-y-4">
              {/* 点检员 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">点检员姓名</label>
                <input type="text" value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="请输入姓名" />
              </div>

              {/* 检查项 */}
              {checkForm && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">检查项目</h3>
                    <span className="text-xs text-gray-400">共 {checkForm.items.length} 项</span>
                  </div>

                  {checkForm.items.map((item, index) => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mr-2 flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-gray-900 font-medium text-sm">
                          {item.question}
                          {item.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </div>

                      {/* 单选 */}
                      {item.type === 'radio' && item.options && (
                        <div className="ml-8 space-y-2">
                          {item.options.map((option, oi) => (
                            <label key={oi} className="flex items-center cursor-pointer">
                              <input type="radio" name={item.id} value={option}
                                checked={answers[item.id] === option}
                                onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                              <span className="ml-2 text-gray-700 text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 多选 */}
                      {item.type === 'checkbox' && item.options && (
                        <div className="ml-8 space-y-2">
                          {item.options.map((option, oi) => (
                            <label key={oi} className="flex items-center cursor-pointer">
                              <input type="checkbox"
                                checked={(answers[item.id] as string[])?.includes(option)}
                                onChange={(e) => handleCheckboxChange(item.id, option, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              <span className="ml-2 text-gray-700 text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 文本 */}
                      {item.type === 'text' && (
                        <div className="ml-8">
                          <textarea value={(answers[item.id] as string) || ''}
                            onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2} placeholder="请输入..." />
                        </div>
                      )}

                      {/* 数字/称重 */}
                      {(item.type === 'number' || item.type === 'weight') && (
                        <div className="ml-8">
                          <input type="number" value={(answers[item.id] as string) || ''}
                            onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={item.type === 'weight' ? '请输入重量(g)' : '请输入数值'} />
                          {item.type === 'weight' && facility.initialWeight && (
                            <p className="text-xs text-gray-400 mt-1">
                              初始重量：{facility.initialWeight}g
                              {item.threshold ? ` | 阈值：±${item.threshold}g` : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
                <textarea value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3} placeholder="如有特殊情况请备注..." />
              </div>

              {/* 提交按钮 */}
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 text-white rounded-xl py-4 font-bold text-lg shadow-lg shadow-green-200 transition-all duration-200 active:scale-[0.98]">
                {submitting ? (
                  <><i className="fa-solid fa-spinner fa-spin mr-2"></i>提交中...</>
                ) : (
                  <><i className="fa-solid fa-check mr-2"></i>提交点检结果</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
