import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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
  status: 'pending' | 'normal' | 'abnormal';
  inspectionCycle: InspectionCycle;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
}

// 检查项类型定义
export interface CheckItem {
  id: string;
  question: string;
  type: 'checkbox' | 'radio' | 'text' | 'number';
  options?: string[];
  required: boolean;
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
    pending: number;
  };
  
  // 巡检计划相关
  getMonthlyInspectionTasks: () => FireFacility[];
  getUpcomingInspections: (days?: number) => FireFacility[];
  getOverdueInspections: () => FireFacility[];
  getAbnormalIssues: () => InspectionRecord[];
  
  // 加载状态
  loading: boolean;
}

// 初始数据
const initialFacilities: FireFacility[] = [
  {
    id: '1',
    code: 'MHQ008',
    type: '干粉灭火器',
    model: 'MFZ/BC1',
    specification: '2kg',
    location: '大门口',
    status: 'pending',
    inspectionCycle: 'monthly',
    lastInspectionDate: '2025-01-15',
    nextInspectionDate: '2025-02-15'
  },
  {
    id: '2',
    code: 'MHQ007',
    type: '二氧化碳灭火器',
    model: 'MT2',
    specification: '2kg',
    location: '测试',
    status: 'pending',
    inspectionCycle: 'monthly',
    lastInspectionDate: '2025-01-10',
    nextInspectionDate: '2025-02-10'
  },
  {
    id: '3',
    code: 'MHQ006',
    type: '干粉灭火器',
    model: 'MFZ/ABC3',
    specification: '5kg',
    location: '侧',
    status: 'normal',
    inspectionCycle: 'quarterly',
    lastInspectionDate: '2025-01-05',
    nextInspectionDate: '2025-04-05'
  },
  {
    id: '4',
    code: 'MHQ005',
    type: '干粉灭火器',
    model: 'MFZ/ABC1',
    specification: '5kg',
    location: '叉车',
    status: 'abnormal',
    inspectionCycle: 'monthly',
    lastInspectionDate: '2025-01-20',
    nextInspectionDate: '2025-02-20'
  },
  {
    id: '5',
    code: 'MHQ004',
    type: '消火栓',
    model: 'SS100/65-1.6',
    specification: 'DN100',
    location: '测试',
    status: 'pending',
    inspectionCycle: 'quarterly',
    lastInspectionDate: '2024-12-01',
    nextInspectionDate: '2025-03-01'
  },
  {
    id: '6',
    code: 'FE001',
    type: '干粉灭火器',
    model: 'MFZ/ABC4',
    specification: '4kg',
    location: '会议室',
    status: 'normal',
    inspectionCycle: 'monthly',
    lastInspectionDate: '2025-01-25',
    nextInspectionDate: '2025-02-25'
  },
  {
    id: '7',
    code: 'MHQ003',
    type: '二氧化碳灭火器',
    model: 'MT5',
    specification: '5kg',
    location: '库房',
    status: 'abnormal',
    inspectionCycle: 'yearly',
    lastInspectionDate: '2024-06-15',
    nextInspectionDate: '2025-06-15'
  }
];

const initialUsers: SystemUser[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: '系统管理员',
    department: '信息部',
    status: 'active'
  },
  {
    id: '2',
    username: 'inspector',
    password: 'inspector123',
    role: 'user',
    name: '巡检员张三',
    department: '消防安全部',
    status: 'active'
  },
  {
    id: '3',
    username: 'inspector2',
    password: 'inspector123',
    role: 'user',
    name: '巡检员李四',
    department: '消防安全部',
    status: 'active'
  },
  {
    id: '4',
    username: 'inspector3',
    password: 'inspector123',
    role: 'user',
    name: '巡检员王五',
    department: '消防安全部',
    status: 'inactive'
  }
];

const initialCheckForms: CheckForm[] = [
  {
    id: '1',
    name: '干粉灭火器检查表单',
    facilityType: '干粉灭火器',
    items: [
      {
        id: '1-1',
        question: '灭火器压力表指针是否在绿色区域？',
        type: 'radio',
        options: ['是（正常）', '否（异常）'],
        required: true
      },
      {
        id: '1-2',
        question: '灭火器外观检查',
        type: 'checkbox',
        options: ['无明显变形', '无锈蚀', '无泄漏痕迹', '喷管完好'],
        required: true
      },
      {
        id: '1-3',
        question: '保险销是否完好？',
        type: 'radio',
        options: ['完好', '损坏', '已拔出'],
        required: true
      },
      {
        id: '1-4',
        question: '灭火器是否在有效期内？',
        type: 'radio',
        options: ['是', '否'],
        required: true
      },
      {
        id: '1-5',
        question: '检查备注',
        type: 'text',
        required: false
      }
    ],
    createdAt: '2026-03-01',
    updatedAt: '2026-03-10'
  },
  {
    id: '2',
    name: '二氧化碳灭火器检查表单',
    facilityType: '二氧化碳灭火器',
    items: [
      {
        id: '2-1',
        question: '灭火器压力是否正常？',
        type: 'radio',
        options: ['正常', '偏低', '偏高'],
        required: true
      },
      {
        id: '2-2',
        question: '灭火器外观是否完好？',
        type: 'checkbox',
        options: ['无损坏', '无锈蚀', '无泄漏'],
        required: true
      },
      {
        id: '2-3',
        question: '喷管是否完好？',
        type: 'radio',
        options: ['完好', '老化', '损坏'],
        required: true
      },
      {
        id: '2-4',
        question: '检查备注',
        type: 'text',
        required: false
      }
    ],
    createdAt: '2026-03-05',
    updatedAt: '2026-03-05'
  },
  {
    id: '3',
    name: '消火栓检查表单',
    facilityType: '消火栓',
    items: [
      {
        id: '3-1',
        question: '消防栓箱门是否完好无损？',
        type: 'radio',
        options: ['是', '否'],
        required: true
      },
      {
        id: '3-2',
        question: '水带、水枪是否完好？',
        type: 'checkbox',
        options: ['水带无破损', '水枪无损坏', '接口无渗漏'],
        required: true
      },
      {
        id: '3-3',
        question: '阀门是否灵活？',
        type: 'radio',
        options: ['灵活', '一般', '卡死'],
        required: true
      },
      {
        id: '3-4',
        question: '水压测试结果(MPa)',
        type: 'number',
        required: true
      },
      {
        id: '3-5',
        question: '检查备注',
        type: 'text',
        required: false
      }
    ],
    createdAt: '2026-03-05',
    updatedAt: '2026-03-05'
  },
  {
    id: '4',
    name: '泡沫灭火器检查表单',
    facilityType: '泡沫灭火器',
    items: [
      {
        id: '4-1',
        question: '灭火器压力是否正常？',
        type: 'radio',
        options: ['正常', '偏低', '偏高'],
        required: true
      },
      {
        id: '4-2',
        question: '灭火器外观检查',
        type: 'checkbox',
        options: ['无明显变形', '无锈蚀', '无泄漏'],
        required: true
      },
      {
        id: '4-3',
        question: '是否在有效期内？',
        type: 'radio',
        options: ['是', '否'],
        required: true
      },
      {
        id: '4-4',
        question: '检查备注',
        type: 'text',
        required: false
      }
    ],
    createdAt: '2026-03-10',
    updatedAt: '2026-03-10'
  },
  {
    id: '5',
    name: '水型灭火器检查表单',
    facilityType: '水型灭火器',
    items: [
      {
        id: '5-1',
        question: '灭火器压力是否正常？',
        type: 'radio',
        options: ['正常', '偏低', '偏高'],
        required: true
      },
      {
        id: '5-2',
        question: '灭火器外观检查',
        type: 'checkbox',
        options: ['无明显变形', '无锈蚀', '无泄漏'],
        required: true
      },
      {
        id: '5-3',
        question: '是否在有效期内？',
        type: 'radio',
        options: ['是', '否'],
        required: true
      },
      {
        id: '5-4',
        question: '检查备注',
        type: 'text',
        required: false
      }
    ],
    createdAt: '2026-03-10',
    updatedAt: '2026-03-10'
  }
];

// 创建上下文
export const DataContext = createContext<DataContextType | undefined>(undefined);

// 转换函数：数据库格式 -> 前端格式
const dbToFacility = (db: any): FireFacility => ({
  id: db.id,
  code: db.code,
  type: db.type,
  model: db.model || '',
  specification: db.specification || '',
  location: db.location || '',
  status: db.status,
  inspectionCycle: db.inspection_cycle,
  lastInspectionDate: db.last_inspection_date,
  nextInspectionDate: db.next_inspection_date
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
  last_inspection_date: facility.lastInspectionDate,
  next_inspection_date: facility.nextInspectionDate
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
  items: db.items,
  createdAt: db.created_at,
  updatedAt: db.updated_at
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
  answers: db.answers,
  date: db.date,
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

  // 初始化数据：从 Supabase 加载
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载设施
        const { data: facilitiesData, error: facilitiesError } = await supabase
          .from('facilities')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (facilitiesError) throw facilitiesError;
        
        if (facilitiesData && facilitiesData.length > 0) {
          setFacilities(facilitiesData.map(dbToFacility));
        } else {
          // 数据库为空，插入初始数据
          const { error: insertError } = await supabase
            .from('facilities')
            .insert(initialFacilities.map(facilityToDb));
          if (!insertError) {
            setFacilities(initialFacilities);
          }
        }

        // 加载用户
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (usersError) throw usersError;
        
        if (usersData && usersData.length > 0) {
          setUsers(usersData.map(dbToUser));
        } else {
          const { error: insertError } = await supabase
            .from('users')
            .insert(initialUsers.map(userToDb));
          if (!insertError) {
            setUsers(initialUsers);
          }
        }

        // 加载检查表单
        const { data: formsData, error: formsError } = await supabase
          .from('check_forms')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (formsError) throw formsError;
        
        if (formsData && formsData.length > 0) {
          setCheckForms(formsData.map(dbToCheckForm));
        } else {
          const { error: insertError } = await supabase
            .from('check_forms')
            .insert(initialCheckForms.map(checkFormToDb));
          if (!insertError) {
            setCheckForms(initialCheckForms);
          }
        }

        // 加载巡检记录
        const { data: recordsData, error: recordsError } = await supabase
          .from('inspection_records')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (recordsError) throw recordsError;
        
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

  // 消防设施操作
  const addFacilities = useCallback(async (newFacilities: FireFacility[]) => {
    console.log('正在添加设施到数据库:', newFacilities.length, '条');
    
    const dbData = newFacilities.map(facilityToDb);
    console.log('转换后的数据库格式:', JSON.stringify(dbData.slice(0, 2), null, 2));
    
    const { data, error } = await supabase
      .from('facilities')
      .insert(dbData)
      .select();
    
    if (error) {
      console.error('添加设施失败 - 错误详情:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`数据库错误: ${error.message}`);
    }
    
    console.log('添加成功，返回数据条数:', data?.length);
    setFacilities(prev => [...prev, ...newFacilities]);
  }, []);

  const updateFacility = useCallback(async (id: string, updates: Partial<FireFacility>) => {
    const dbUpdates: any = {};
    if (updates.code !== undefined) dbUpdates.code = updates.code;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.specification !== undefined) dbUpdates.specification = updates.specification;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.inspectionCycle !== undefined) dbUpdates.inspection_cycle = updates.inspectionCycle;
    if (updates.lastInspectionDate !== undefined) dbUpdates.last_inspection_date = updates.lastInspectionDate;
    if (updates.nextInspectionDate !== undefined) dbUpdates.next_inspection_date = updates.nextInspectionDate;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('facilities')
      .update(dbUpdates)
      .eq('id', id);
    
    if (!error) {
      setFacilities(prev => prev.map(f => 
        f.id === id ? { ...f, ...updates } : f
      ));
    }
  }, []);

  const deleteFacility = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('facilities')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setFacilities(prev => prev.filter(f => f.id !== id));
    }
  }, []);

  // 用户操作
  const addUser = useCallback(async (user: SystemUser): Promise<boolean> => {
    if (users.some(u => u.username === user.username)) {
      return false;
    }
    
    const { error } = await supabase
      .from('users')
      .insert(userToDb(user));
    
    if (!error) {
      setUsers(prev => [...prev, user]);
      return true;
    }
    return false;
  }, [users]);

  const updateUser = useCallback(async (id: string, updates: Partial<SystemUser>) => {
    const dbUpdates: any = {};
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id);
    
    if (!error) {
      setUsers(prev => prev.map(u => 
        u.id === id ? { ...u, ...updates } : u
      ));
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  }, []);

  // 检查表单操作
  const addCheckForm = useCallback(async (form: CheckForm) => {
    const { error } = await supabase
      .from('check_forms')
      .insert(checkFormToDb(form));
    
    if (!error) {
      setCheckForms(prev => [...prev, form]);
    }
  }, []);

  const updateCheckForm = useCallback(async (id: string, updates: Partial<CheckForm>) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.facilityType !== undefined) dbUpdates.facility_type = updates.facilityType;
    if (updates.items !== undefined) dbUpdates.items = updates.items;

    const { error } = await supabase
      .from('check_forms')
      .update(dbUpdates)
      .eq('id', id);
    
    if (!error) {
      setCheckForms(prev => prev.map(f => 
        f.id === id ? { ...f, ...updates } : f
      ));
    }
  }, []);

  const deleteCheckForm = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('check_forms')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setCheckForms(prev => prev.filter(f => f.id !== id));
    }
  }, []);

  const getCheckFormByFacilityType = useCallback((facilityType: string): CheckForm | undefined => {
    return checkForms.find(f => f.facilityType === facilityType);
  }, [checkForms]);

  // 巡检记录操作
  const addInspectionRecord = useCallback(async (record: Omit<InspectionRecord, 'id'>) => {
    const dbRecord = inspectionRecordToDb(record);
    
    const { error } = await supabase
      .from('inspection_records')
      .insert(dbRecord);
    
    if (!error) {
      const newRecord: InspectionRecord = {
        ...record,
        id: dbRecord.id
      };
      setInspectionRecords(prev => [newRecord, ...prev]);
    }
  }, []);

  // 统计数据
  const getFacilityStats = () => {
    return {
      total: facilities.length,
      normal: facilities.filter(f => f.status === 'normal').length,
      abnormal: facilities.filter(f => f.status === 'abnormal').length,
      pending: facilities.filter(f => f.status === 'pending').length,
    };
  };

  // 获取本月待检任务
  const getMonthlyInspectionTasks = (): FireFacility[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return facilities.filter(f => {
      if (!f.nextInspectionDate) return false;
      
      const nextDate = new Date(f.nextInspectionDate);
      return nextDate.getMonth() === currentMonth && nextDate.getFullYear() === currentYear;
    });
  };

  // 获取即将到期的巡检
  const getUpcomingInspections = (days: number = 7): FireFacility[] => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return facilities.filter(f => {
      if (!f.nextInspectionDate) return false;
      
      const nextDate = new Date(f.nextInspectionDate);
      return nextDate >= now && nextDate <= futureDate;
    });
  };

  // 获取已逾期的巡检
  const getOverdueInspections = (): FireFacility[] => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return facilities.filter(f => {
      if (!f.nextInspectionDate) return false;
      
      const nextDate = new Date(f.nextInspectionDate);
      nextDate.setHours(0, 0, 0, 0);
      return nextDate < now;
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
