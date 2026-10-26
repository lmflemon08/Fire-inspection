import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sql } from '../lib/db';

const dateToStr = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return String(d).split('T')[0];
};

interface FacilityInfo {
  id: string;
  code: string;
  type: string;
  location: string;
  status: string;
}

interface CheckFormItem {
  id: string;
  question: string;
  type: string;
  options?: string[];
  required: boolean;
}

interface CheckForm {
  id: string;
  name: string;
  facility_type: string;
  items: CheckFormItem[];
}

interface HistoryRecord {
  id: string;
  facility_code: string;
  type: string;
  status: string;
  inspector_name: string;
  notes: string | null;
  answers: any;
  date: string;
  time: string;
  issue_status: string;
}

export default function PublicInspectionHistoryPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<FacilityInfo | null>(null);
  const [checkForm, setCheckForm] = useState<CheckForm | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);

    const loadData = async () => {
      try {
        // 1. 查询设施
        const facilityRows = await sql`SELECT id, code, type, location, status FROM facilities WHERE code = ${code} LIMIT 1`;
        if (!facilityRows || facilityRows.length === 0) {
          setFacility(null);
          setLoading(false);
          return;
        }
        const f = facilityRows[0];
        setFacility({ id: f.id, code: f.code, type: f.type, location: f.location, status: f.status });

        // 2. 查询检查表单
        const formRows = await sql`SELECT * FROM check_forms WHERE facility_type = ${f.type} LIMIT 1`;
        if (formRows && formRows.length > 0) {
          const form = formRows[0];
          const items = typeof form.items === 'string' ? JSON.parse(form.items) : form.items;
          setCheckForm({ id: form.id, name: form.name, facility_type: form.facility_type, items });
        }

        // 3. 查询近12个月巡检记录
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const startDate = dateToStr(twelveMonthsAgo);

        const recordRows = await sql`
          SELECT id, facility_code, type, status, inspector_name, notes, answers, date, time, COALESCE(issue_status, 'pending') as issue_status
          FROM inspection_records
          WHERE facility_id = ${f.id}
            AND date >= ${startDate}
          ORDER BY date DESC, created_at DESC
        `;
        setRecords(recordRows.map((r: any) => ({
          id: r.id,
          facility_code: r.facility_code,
          type: r.type,
          status: r.status,
          inspector_name: r.inspector_name,
          notes: r.notes,
          answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers,
          date: dateToStr(r.date),
          time: r.time,
          issue_status: r.issue_status || 'pending'
        })));
      } catch (err) {
        console.error('加载历史记录失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [code]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'normal': return { text: '正常', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: 'fa-circle-check' };
      case 'abnormal': return { text: '异常', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: 'fa-circle-xmark' };
      default: return { text: '未知', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: 'fa-question' };
    }
  };

  const getIssueStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { text: '待整改', color: 'text-yellow-700', bg: 'bg-yellow-50' };
      case 'rectifying': return { text: '整改中', color: 'text-blue-700', bg: 'bg-blue-50' };
      case 'resolved': return { text: '已整改', color: 'text-green-700', bg: 'bg-green-50' };
      default: return { text: '', color: '', bg: '' };
    }
  };

  // 统计
  const totalCount = records.length;
  const normalCount = records.filter(r => r.status === 'normal').length;
  const abnormalCount = records.filter(r => r.status === 'abnormal').length;

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
          <p className="text-gray-500 text-sm">正在获取历史记录</p>
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
          <p className="text-gray-500 text-sm">设施编号 "{code}" 不存在</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* 顶部 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center">
          <button onClick={() => navigate(`/inspect/${code}`)} className="mr-3 p-1">
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h1 className="font-bold text-lg">历史巡检记录</h1>
            <p className="text-sm text-blue-100">{facility.code} - {facility.type}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-8">
        {/* 统计卡片 */}
        <motion.div className="grid grid-cols-3 gap-3 mb-4"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            <p className="text-xs text-gray-500">总记录</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{normalCount}</p>
            <p className="text-xs text-gray-500">正常</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{abnormalCount}</p>
            <p className="text-xs text-gray-500">异常</p>
          </div>
        </motion.div>

        {/* 点检项列表 */}
        {checkForm && (
          <motion.div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-900 text-sm">
                <i className="fa-solid fa-list-check text-blue-500 mr-2"></i>
                点检项（{checkForm.name}）
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {checkForm.items.map((item, index) => (
                  <div key={item.id} className="flex items-start text-sm">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-gray-900">{item.question}</p>
                      {item.options && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          选项：{item.options.join(' / ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 历史记录列表 */}
        <motion.div className="bg-white rounded-2xl shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 text-sm">
              <i className="fa-solid fa-clock-rotate-left text-blue-500 mr-2"></i>
              近12个月巡检记录
            </h2>
          </div>

          {records.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-500 text-sm">暂无巡检记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map((record) => {
                const statusInfo = getStatusInfo(record.status);
                const issueInfo = record.status === 'abnormal' ? getIssueStatusInfo(record.issue_status) : null;
                const isExpanded = expandedRecord === record.id;
                const answers = Array.isArray(record.answers) ? record.answers : [];

                return (
                  <div key={record.id}>
                    <button
                      onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                      className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{record.date}</span>
                          <span className="text-xs text-gray-400">{record.time}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bg} ${statusInfo.color}`}>
                            <i className={`fa-solid ${statusInfo.icon} mr-1 text-[10px]`}></i>
                            {statusInfo.text}
                          </span>
                          {issueInfo && issueInfo.text && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${issueInfo.bg} ${issueInfo.color}`}>
                              {issueInfo.text}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          巡检员：{record.inspector_name}
                          {record.notes ? ` | 备注：${record.notes}` : ''}
                        </p>
                      </div>
                      <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400 text-xs ml-2`}></i>
                    </button>

                    {/* 展开的检查项详情 */}
                    {isExpanded && answers.length > 0 && (
                      <div className="px-4 pb-3 bg-gray-50/50">
                        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                          <p className="text-xs font-medium text-gray-500 mb-2">检查项详情</p>
                          {answers.map((answer: any, idx: number) => (
                            <div key={idx} className="flex items-start text-sm">
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 mr-2 flex-shrink-0 ${answer.isAbnormal ? 'bg-red-500' : 'bg-green-500'}`}></span>
                              <div className="min-w-0">
                                <p className="text-gray-600 text-xs">{answer.question}</p>
                                <p className={`font-medium text-sm ${answer.isAbnormal ? 'text-red-600' : 'text-gray-900'}`}>
                                  {typeof answer.answer === 'string' ? answer.answer : Array.isArray(answer.answer) ? answer.answer.join(', ') : String(answer.answer)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* 返回按钮 */}
        <div className="mt-6">
          <button onClick={() => navigate(`/inspect/${code}`)}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 rounded-2xl py-3 font-medium shadow-sm border border-gray-200 transition-colors">
            <i className="fa-solid fa-arrow-left mr-2"></i>返回设施信息
          </button>
        </div>
      </div>
    </div>
  );
}
