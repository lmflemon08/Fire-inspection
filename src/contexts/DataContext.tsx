import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { sql, dynamicQuery } from '@/lib/db';

// 巡检周期类型
export type InspectionCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// 消防设施类型定义
export interface FireFacility {
  id: string;
  code: string;
  type: string;
  model: string;
  specification: string;
  location: string;
  status: 'normal' | 'abnormal' | 'stored'; // 正常、异常、暂存
  inspectionCycle: InspectionCycle;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  serviceLife?: number;      // 使用寿命（年）
  initialWeight?: number;    // 初始重量（g）- 用于二氧化碳灭火器等需要称重检测的设施
  purchaseDate?: string;     // 购置日期
  retirementDate?: string;    // 报废日期
}

// 检查项类型定义
export interface CheckItem {
  id: string;
  question: string;
  type: 'checkbox' | 'radio' | 'text' | 'number' | 'weight'; // 新增 weight 类型用于称重检测
  options?: string[];
  required: boolean;
  threshold?: number;         // 阈值（如 50g）
  initialValue?: number;     // 初始值（用于称重比较）
  compareWithInitial?: boolean; // 是否与初始值比较
}

// 检查表单类型定义
export interface CheckForm {
  id: string;
  name: string;
  facilityType: string;
  items: CheckItem[];
  createdAt: string;
  updatedAt: string;
}

// 检查项答案类型
export interface CheckItemAnswer {
  itemId: string;
  question: string;
  answer: string | string[];
  isAbnormal?: boolean; // 该检查项是否异常
}

// 巡检记录类型定义
export interface InspectionRecord {
  id: string;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  type: string;
  status: 'normal' | 'abnormal';
  inspectorId: string;
  inspectorName: string;
  notes?: string;
  answers?: CheckItemAnswer[];
  photos?: string[];
  date: string;
  time: string;
}

// 用户类型定义
export interface SystemUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
  department: string;
  status: 'active' | 'inactive';
}

// 数据上下文接口
export interface DataContextType {
  // 消防设施
  facilities: FireFacility[];
  setFacilities: React.Dispatch<React.SetStateAction<FireFacility[]>>;
  addFacilities: (newFacilities: FireFacility[]) => void;
  updateFacility: (id: string, facility: Partial<FireFacility>) => void;
  deleteFacility: (id: string) => void;
  
  // 用户
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  addUser: (user: SystemUser) => Promise<boolean>;
  updateUser: (id: string, user: Partial<SystemUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // 检查表单
  checkForms: CheckForm[];
  setCheckForms: React.Dispatch<React.SetStateAction<CheckForm[]>>;
  addCheckForm: (form: CheckForm) => void;
  updateCheckForm: (id: string, form: Partial<CheckForm>) => void;
  deleteCheckForm: (id: string) => void;
  getCheckFormByFacilityType: (facilityType: string) => CheckForm | undefined;
  
  // 巡检记录
  inspectionRecords: InspectionRecord[];
  addInspectionRecord: (record: Omit<InspectionRecord, 'id'>) => void;
  
  // 统计数据
  getFacilityStats: () => {
    total: number;
    normal: number;
    abnormal: number;
    stored: number;
  };
  
  // 巡检计划相关
  getMonthlyInspectionTasks: () => FireFacility[];
  getUpcomingInspections: (days?: number) => FireFacility[];
  getOverdueInspections: () => FireFacility[];
  getAbnormalIssues: () => InspectionRecord[];
  
  // 加载状态
  loading: boolean;
}

// 创建上下文
export const DataContext = createContext<DataContextType | undefined>(undefined);


// Neon 返回的日期字段是 Date 对象，需要转换为字符串
// 注意：不能使用 toISOString()，因为 Neon 会自动给 date 字段加本地时区(GMT+0800)，
// 导致 2026-06-13 (date) 变成 2026-06-12T16:00:00.000Z，从而少一天
const dateToStr = (v: any): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) {
    // 用本地时区提取日期部分（getFullYear/getMonth/getDate）
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v);
};

const datetimeToStr = (v: any): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

// 转换函数：数据库格式 -> 前端格式
const dbToFacility = (db: any): FireFacility => ({
  id: db.id,
  code: db.code,
  type: db.type,
  model: db.model || '',
  specification: db.specification || '',
  location: db.location || '',
  status: db.status || 'stored',
  inspectionCycle: db.inspection_cycle || 'monthly',
  lastInspectionDate: dateToStr(db.last_inspection_date),
  nextInspectionDate: dateToStr(db.next_inspection_date),
  // 新增字段
  serviceLife: db.service_life || 5,
  initialWeight: db.initial_weight,
  purchaseDate: dateToStr(db.purchase_date),
  retirementDate: dateToStr(db.retirement_date)
});

const facilityToDb = (facility: FireFacility) => ({
  id: facility.id,
  code: facility.code,
  type: facility.type,
  model: facility.model,
  specification: facility.specification,
  location: facility.location,
  status: facility.status,
  inspection_cycle: facility.inspectionCycle,
  // 日期字段：空字符串转为 null
  last_inspection_date: facility.lastInspectionDate || null,
  next_inspection_date: facility.nextInspectionDate || null,
  // 新增字段
  service_life: facility.serviceLife,
  initial_weight: facility.initialWeight,
  purchase_date: facility.purchaseDate || null,
  retirement_date: facility.retirementDate || null
});

const dbToUser = (db: any): SystemUser => ({
  id: db.id,
  username: db.username,
  password: db.password,
  role: db.role,
  name: db.name,
  department: db.department,
  status: db.status
});

const userToDb = (user: SystemUser) => ({
  id: user.id,
  username: user.username,
  password: user.password,
  role: user.role,
  name: user.name,
  department: user.department,
  status: user.status
});

const dbToCheckForm = (db: any): CheckForm => ({
  id: db.id,
  name: db.name,
  facilityType: db.facility_type,
  items: typeof db.items === 'string' ? JSON.parse(db.items) : db.items,
  createdAt: datetimeToStr(db.created_at) || '',
  updatedAt: datetimeToStr(db.updated_at) || ''
});

const checkFormToDb = (form: CheckForm) => ({
  id: form.id,
  name: form.name,
  facility_type: form.facilityType,
  items: form.items,
  created_at: form.createdAt,
  updated_at: form.updatedAt
});

const dbToInspectionRecord = (db: any): InspectionRecord => ({
  id: db.id,
  facilityId: db.facility_id,
  facilityCode: db.facility_code,
  facilityName: db.facility_name,
  type: db.type,
  status: db.status,
  inspectorId: db.inspector_id,
  inspectorName: db.inspector_name,
  notes: db.notes,
  answers: typeof db.answers === 'string' ? JSON.parse(db.answers) : db.answers,
  date: dateToStr(db.date) || '',
  time: db.time
});

const inspectionRecordToDb = (record: Omit<InspectionRecord, 'id'>) => ({
  id: Date.now().toString(),
  facility_id: record.facilityId,
  facility_code: record.facilityCode,
  facility_name: record.facilityName,
  type: record.type,
  status: record.status,
  inspector_id: record.inspectorId,
  inspector_name: record.inspectorName,
  notes: record.notes,
  answers: record.answers,
  date: record.date,
  time: record.time
});

// Provider组件
export function DataProvider({ children }: { children: ReactNode }) {
  const [facilities, setFacilities] = useState<FireFacility[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [checkForms, setCheckForms] = useState<CheckForm[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始化数据：从 Neon 加载
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载设施
        const facilitiesData = await sql`
          SELECT * FROM facilities ORDER BY created_at ASC
        `;
        if (facilitiesData && facilitiesData.length > 0) {
          setFacilities(facilitiesData.map(dbToFacility));
        }

        // 加载用户
        const usersData = await sql`
          SELECT * FROM users ORDER BY created_at ASC
        `;
        if (usersData && usersData.length > 0) {
          setUsers(usersData.map(dbToUser));
        }

        // 加载检查表单
        const formsData = await sql`
          SELECT * FROM check_forms ORDER BY created_at ASC
        `;
        if (formsData && formsData.length > 0) {
          setCheckForms(formsData.map(dbToCheckForm));
        }

        // 加载巡检记录
        const recordsData = await sql`
          SELECT * FROM inspection_records ORDER BY created_at DESC
        `;
        if (recordsData) {
          setInspectionRecords(recordsData.map(dbToInspectionRecord));
        }

      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 消防设施操作 - 使用 upsert 处理重复编码
  const addFacilities = useCallback(async (newFacilities: FireFacility[]) => {
    console.log('正在添加设施到数据库:', newFacilities.length, '条');
    
    // 去重：按编码去重，保留最后一条
    const codeMap = new Map<string, FireFacility>();
    newFacilities.forEach(f => {
      codeMap.set(f.code, f);
    });
    const uniqueFacilities = Array.from(codeMap.values());
    console.log('去重后设施数量:', uniqueFacilities.length, '条');
    
    for (const f of uniqueFacilities) {
      const db = facilityToDb(f);
      await sql`
        INSERT INTO facilities (id, code, type, model, specification, location, status, inspection_cycle, last_inspection_date, next_inspection_date, service_life, initial_weight, purchase_date, retirement_date)
        VALUES (${db.id}, ${db.code}, ${db.type}, ${db.model || null}, ${db.specification || null}, ${db.location}, ${db.status}, ${db.inspection_cycle}, ${db.last_inspection_date || null}, ${db.next_inspection_date || null}, ${db.service_life || null}, ${db.initial_weight || null}, ${db.purchase_date || null}, ${db.retirement_date || null})
        ON CONFLICT (code) DO UPDATE SET
          type = EXCLUDED.type,
          model = EXCLUDED.model,
          specification = EXCLUDED.specification,
          location = EXCLUDED.location,
          status = EXCLUDED.status,
          inspection_cycle = EXCLUDED.inspection_cycle,
          last_inspection_date = EXCLUDED.last_inspection_date,
          next_inspection_date = EXCLUDED.next_inspection_date,
          service_life = EXCLUDED.service_life,
          initial_weight = EXCLUDED.initial_weight,
          purchase_date = EXCLUDED.purchase_date,
          retirement_date = EXCLUDED.retirement_date,
          updated_at = NOW()
      `;
    }
    
    // 重新加载
    const allFacilities = await sql`SELECT * FROM facilities ORDER BY created_at ASC`;
    setFacilities(allFacilities.map(dbToFacility));
  }, []);

  const updateFacility = useCallback(async (id: string, updates: Partial<FireFacility>) => {
    console.log('更新设施:', id, updates);
    
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    const addField = (colName: string, value: any) => {
      setClauses.push(`${colName} = $${paramIdx}`);
      params.push(value);
      paramIdx++;
    };

    if (updates.code !== undefined) addField('code', updates.code);
    if (updates.type !== undefined) addField('type', updates.type);
    if (updates.model !== undefined) addField('model', updates.model);
    if (updates.specification !== undefined) addField('specification', updates.specification);
    if (updates.location !== undefined) addField('location', updates.location);
    if (updates.status !== undefined) addField('status', updates.status);
    if (updates.inspectionCycle !== undefined) addField('inspection_cycle', updates.inspectionCycle);
    if (updates.lastInspectionDate !== undefined) addField('last_inspection_date', updates.lastInspectionDate || null);
    if (updates.nextInspectionDate !== undefined) addField('next_inspection_date', updates.nextInspectionDate || null);
    if (updates.serviceLife !== undefined) addField('service_life', updates.serviceLife);
    if (updates.initialWeight !== undefined) addField('initial_weight', updates.initialWeight);
    if (updates.purchaseDate !== undefined) addField('purchase_date', updates.purchaseDate || null);
    if (updates.retirementDate !== undefined) addField('retirement_date', updates.retirementDate || null);
    addField('updated_at', new Date().toISOString());

    params.push(id);
    const updateQuery = `UPDATE facilities SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`;
    
    await dynamicQuery(updateQuery, params);

    // 重新加载
    const allFacilities = await sql`SELECT * FROM facilities ORDER BY created_at ASC`;
    setFacilities(allFacilities.map(dbToFacility));
  }, []);

  const deleteFacility = useCallback(async (id: string) => {
    await sql`DELETE FROM facilities WHERE id = ${id}`;
    setFacilities(prev => prev.filter(f => f.id !== id));
  }, []);

  // 用户操作
  const addUser = useCallback(async (user: SystemUser): Promise<boolean> => {
    if (users.some(u => u.username === user.username)) {
      return false;
    }
    
    const db = userToDb(user);
    await sql`
      INSERT INTO users (id, username, password, role, name, department, status)
      VALUES (${db.id}, ${db.username}, ${db.password}, ${db.role}, ${db.name}, ${db.department}, ${db.status})
    `;
    setUsers(prev => [...prev, user]);
    return true;
  }, [users]);

  const updateUser = useCallback(async (id: string, updates: Partial<SystemUser>) => {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    const addField = (colName: string, value: any) => {
      setClauses.push(`${colName} = $${paramIdx}`);
      params.push(value);
      paramIdx++;
    };

    if (updates.username !== undefined) addField('username', updates.username);
    if (updates.password !== undefined) addField('password', updates.password);
    if (updates.role !== undefined) addField('role', updates.role);
    if (updates.name !== undefined) addField('name', updates.name);
    if (updates.department !== undefined) addField('department', updates.department);
    if (updates.status !== undefined) addField('status', updates.status);

    params.push(id);
    const updateQuery = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`;
    await dynamicQuery(updateQuery, params);
    
    setUsers(prev => prev.map(u => 
      u.id === id ? { ...u, ...updates } : u
    ));
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await sql`DELETE FROM users WHERE id = ${id}`;
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  // 检查表单操作
  const addCheckForm = useCallback(async (form: CheckForm) => {
    const db = checkFormToDb(form);
    await sql`
      INSERT INTO check_forms (id, name, facility_type, items, created_at, updated_at)
      VALUES (${db.id}, ${db.name}, ${db.facility_type}, ${JSON.stringify(db.items)}::jsonb, ${db.created_at}, ${db.updated_at})
    `;
    setCheckForms(prev => [...prev, form]);
  }, []);

  const updateCheckForm = useCallback(async (id: string, updates: Partial<CheckForm>) => {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    const addField = (colName: string, value: any) => {
      setClauses.push(`${colName} = $${paramIdx}`);
      params.push(value);
      paramIdx++;
    };

    addField('updated_at', new Date().toISOString());
    if (updates.name !== undefined) addField('name', updates.name);
    if (updates.facilityType !== undefined) addField('facility_type', updates.facilityType);
    if (updates.items !== undefined) addField('items', JSON.stringify(updates.items));

    params.push(id);
    const updateQuery = `UPDATE check_forms SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`;
    await dynamicQuery(updateQuery, params);
    
    setCheckForms(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  }, []);

  const deleteCheckForm = useCallback(async (id: string) => {
    await sql`DELETE FROM check_forms WHERE id = ${id}`;
    setCheckForms(prev => prev.filter(f => f.id !== id));
  }, []);

  const getCheckFormByFacilityType = useCallback((facilityType: string): CheckForm | undefined => {
    return checkForms.find(f => f.facilityType === facilityType);
  }, [checkForms]);

  // 巡检记录操作
  const addInspectionRecord = useCallback(async (record: Omit<InspectionRecord, 'id'>) => {
    const dbRecord = inspectionRecordToDb(record);
    
    await sql`
      INSERT INTO inspection_records (id, facility_id, facility_code, facility_name, type, status, inspector_id, inspector_name, notes, answers, date, time)
      VALUES (${dbRecord.id}, ${dbRecord.facility_id}, ${dbRecord.facility_code}, ${dbRecord.facility_name || null}, ${dbRecord.type || null}, ${dbRecord.status}, ${dbRecord.inspector_id || null}, ${dbRecord.inspector_name || null}, ${dbRecord.notes || null}, ${JSON.stringify(dbRecord.answers)}::jsonb, ${dbRecord.date || null}, ${dbRecord.time || null})
    `;
    
    // 自动更新设施状态：上次巡检时间 + 下次巡检时间
    // 用本地时区提取日期，避免 toISOString() 跨时区导致日期偏差
    const facilityRes: any[] = await sql`SELECT id, inspection_cycle, status FROM facilities WHERE id = ${dbRecord.facility_id}`;
    if (facilityRes && facilityRes.length > 0) {
      const facility = facilityRes[0];
      // 解析 last_inspection_date (YYYY-MM-DD) 为本地时区 Date 对象
      const today = dbRecord.date 
        ? new Date(dbRecord.date + 'T00:00:00')
        : new Date();
      const formatLocalDate = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const nextDate = new Date(today);
      switch (facility.inspection_cycle) {
        case 'weekly': nextDate.setDate(today.getDate() + 7); break;
        case 'quarterly': nextDate.setMonth(today.getMonth() + 3); break;
        case 'yearly': nextDate.setFullYear(today.getFullYear() + 1); break;
        default: nextDate.setMonth(today.getMonth() + 1); break;
      }
      const nextDateStr = formatLocalDate(nextDate);
      const todayStr = formatLocalDate(today);
      const newFacilityStatus = dbRecord.status === 'abnormal' ? 'abnormal' : 'normal';
      await sql`UPDATE facilities SET last_inspection_date = ${todayStr}, next_inspection_date = ${nextDateStr}, status = ${newFacilityStatus}, updated_at = NOW() WHERE id = ${dbRecord.facility_id}`;
    }
    
    const newRecord: InspectionRecord = {
      ...record,
      id: dbRecord.id
    };
    setInspectionRecords(prev => [newRecord, ...prev]);
  }, []);

  // 统计数据
  const getFacilityStats = () => {
    return {
      total: facilities.length,
      normal: facilities.filter(f => f.status === 'normal').length,
      abnormal: facilities.filter(f => f.status === 'abnormal').length,
      stored: facilities.filter(f => f.status === 'stored').length,
    };
  };

  // 获取本月待检任务（排除暂存状态）
  const getMonthlyInspectionTasks = (): FireFacility[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return facilities.filter(f => {
      // 排除暂存状态的设施
      if (f.status === 'stored') return false;
      if (!f.nextInspectionDate) return false;
      
      const nextDate = new Date(f.nextInspectionDate);
      return nextDate.getMonth() === currentMonth && nextDate.getFullYear() === currentYear;
    });
  };

  // 获取即将到期的巡检（排除暂存状态）
  // 用纯字符串(YYYY-MM-DD)比较避免时区错位
  const getUpcomingInspections = (days: number = 7): FireFacility[] => {
    const today = new Date();
    const ty = today.getFullYear();
    const tm = String(today.getMonth() + 1).padStart(2, '0');
    const td = String(today.getDate()).padStart(2, '0');
    const todayStr = `${ty}-${tm}-${td}`;
    
    // 计算未来 days 天的日期
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const fy = future.getFullYear();
    const fm = String(future.getMonth() + 1).padStart(2, '0');
    const fd = String(future.getDate()).padStart(2, '0');
    const futureStr = `${fy}-${fm}-${fd}`;
    
    return facilities.filter(f => {
      // 排除暂存状态的设施
      if (f.status === 'stored') return false;
      if (!f.nextInspectionDate) return false;
      
      const next = f.nextInspectionDate;
      return next >= todayStr && next <= futureStr;
    });
  };

  // 获取已逾期的巡检（排除暂存状态）
  // 用纯字符串(YYYY-MM-DD)比较避免时区错位
  const getOverdueInspections = (): FireFacility[] => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    
    return facilities.filter(f => {
      // 排除暂存状态的设施
      if (f.status === 'stored') return false;
      if (!f.nextInspectionDate) return false;
      // 字符串字典序 == 日期时间序，YYYY-MM-DD 格式可直接比较
      return f.nextInspectionDate < todayStr;
    });
  };

  // 获取异常问题列表
  const getAbnormalIssues = (): InspectionRecord[] => {
    return inspectionRecords.filter(record => record.status === 'abnormal');
  };

  const value: DataContextType = {
    facilities,
    setFacilities,
    addFacilities,
    updateFacility,
    deleteFacility,
    users,
    setUsers,
    addUser,
    updateUser,
    deleteUser,
    checkForms,
    setCheckForms,
    addCheckForm,
    updateCheckForm,
    deleteCheckForm,
    getCheckFormByFacilityType,
    inspectionRecords,
    addInspectionRecord,
    getFacilityStats,
    getMonthlyInspectionTasks,
    getUpcomingInspections,
    getOverdueInspections,
    getAbnormalIssues,
    loading,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// 自定义Hook
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
