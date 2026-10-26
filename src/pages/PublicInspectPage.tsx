import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sql } from '../lib/db';

// 轻量设施信息（仅落地页需要的字段）
interface FacilityInfo {
  id: string;
  code: string;
  type: string;
  model: string;
  specification: string;
  location: string;
  status: 'stored' | 'normal' | 'abnormal';
  inspectionCycle: string;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  initialWeight?: number;
}

// 本地时区日期格式化
const dateToStr = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return String(d).split('T')[0];
};

export default function PublicInspectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<FacilityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError('');

    sql`SELECT * FROM facilities WHERE code = ${code} LIMIT 1`
      .then((rows: any[]) => {
        if (rows && rows.length > 0) {
          const db = rows[0];
          setFacility({
            id: db.id,
            code: db.code,
            type: db.type || '',
            model: db.model || '',
            specification: db.specification || '',
            location: db.location || '',
            status: db.status || 'normal',
            inspectionCycle: db.inspection_cycle || 'monthly',
            lastInspectionDate: dateToStr(db.last_inspection_date) || undefined,
            nextInspectionDate: dateToStr(db.next_inspection_date) || undefined,
            initialWeight: db.initial_weight ? Number(db.initial_weight) : undefined,
          });
        } else {
          setError('not_found');
        }
      })
      .catch((err: any) => {
        console.error('查询设施失败:', err);
        setError('db_error');
      })
      .finally(() => setLoading(false));
  }, [code]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'normal': return { text: '正常', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: 'fa-circle-check', iconColor: 'text-green-500' };
      case 'abnormal': return { text: '异常', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: 'fa-circle-xmark', iconColor: 'text-red-500' };
      default: return { text: '暂存', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: 'fa-box', iconColor: 'text-yellow-500' };
    }
  };

  const getCycleText = (cycle: string) => {
    switch (cycle) {
      case 'weekly': return '每周';
      case 'monthly': return '每月';
      case 'quarterly': return '每季度';
      case 'yearly': return '每年';
      default: return '每月';
    }
  };

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

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">加载中...</h1>
          <p className="text-gray-500 text-sm">正在获取设施信息</p>
        </motion.div>
      </div>
    );
  }

  // 未找到
  if (error || !facility) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-qrcode text-3xl text-red-500"></i>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">未找到设施信息</h1>
          <p className="text-gray-500 text-sm mb-4">
            设施编号 "{code}" 不存在或已被删除
          </p>
          <p className="text-xs text-gray-400">请检查二维码是否正确，或联系管理员</p>
        </motion.div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(facility.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* 顶部标题栏 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center">
          <i className="fa-solid fa-shield-halved text-xl mr-2"></i>
          <span className="font-semibold text-lg">消防设施点检系统</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 设施信息卡片 */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* 设施头部 */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mr-4">
                  <i className={`fa-solid ${getTypeIcon(facility.type)} text-xl text-blue-600`}></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{facility.code}</h2>
                  <p className="text-sm text-gray-500">{facility.type}</p>
                </div>
              </div>
              <div className={`flex items-center px-3 py-1.5 rounded-full border ${statusInfo.bg}`}>
                <i className={`fa-solid ${statusInfo.icon} ${statusInfo.iconColor} mr-1.5 text-sm`}></i>
                <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.text}</span>
              </div>
            </div>
          </div>

          {/* 设施详情 */}
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">位置</p>
                <p className="text-sm font-medium text-gray-900 truncate">{facility.location}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">巡检周期</p>
                <p className="text-sm font-medium text-gray-900">{getCycleText(facility.inspectionCycle)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">上次巡检</p>
                <p className="text-sm font-medium text-gray-900">{facility.lastInspectionDate || '暂无'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">下次巡检</p>
                <p className="text-sm font-medium text-blue-600">{facility.nextInspectionDate || '未设置'}</p>
              </div>
            </div>
            {facility.model && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">型号规格</p>
                <p className="text-sm font-medium text-gray-900">{facility.model} {facility.specification ? `/ ${facility.specification}` : ''}</p>
              </div>
            )}
            {facility.initialWeight && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">初始重量</p>
                <p className="text-sm font-medium text-gray-900">{facility.initialWeight} g</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {/* 扫描消防设施按钮 */}
          <button
            onClick={() => navigate(`/inspect/${code}/scan`)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-4 px-6 flex items-center justify-center shadow-lg shadow-blue-200 transition-all duration-200 active:scale-[0.98]"
          >
            <i className="fa-solid fa-camera text-xl mr-3"></i>
            <div className="text-left">
              <p className="text-base font-bold">扫描消防设施</p>
              <p className="text-xs text-blue-100">打开相机进行点检</p>
            </div>
            <i className="fa-solid fa-chevron-right ml-auto text-blue-200"></i>
          </button>

          {/* 查看历史巡检记录按钮 */}
          <button
            onClick={() => navigate(`/inspect/${code}/history`)}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 rounded-2xl py-4 px-6 flex items-center justify-center shadow-md border border-gray-200 transition-all duration-200 active:scale-[0.98]"
          >
            <i className="fa-solid fa-clock-rotate-left text-xl mr-3 text-gray-500"></i>
            <div className="text-left">
              <p className="text-base font-bold">查看历史巡检记录</p>
              <p className="text-xs text-gray-400">近12个月点检数据</p>
            </div>
            <i className="fa-solid fa-chevron-right ml-auto text-gray-300"></i>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
