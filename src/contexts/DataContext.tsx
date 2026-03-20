import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  inspectionCycle: InspectionCycle;  // 巡检周期
  lastInspectionDate?: string;  // 上次巡检日期
  nextInspectionDate?: string;  // 下次巡检日期
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
  answers?: CheckItemAnswer[];  // 检查项答案
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
  addUser: (user: SystemUser) => boolean;
  updateUser: (id: string, user: Partial<SystemUser>) => void;
  deleteUser: (id: string) => void;
  
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
  getMonthlyInspectionTasks: () => FireFacility[];  // 获取本月待检任务
  getUpcomingInspections: (days?: number) => FireFacility[];  // 获取即将到期的巡检
  getOverdueInspections: () => FireFacility[];  // 获取已逾期的巡检
  getAbnormalIssues: () => InspectionRecord[];  // 获取异常问题列表
}

// 初始消防设施数据
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

// 初始用户数据
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

// 初始检查表单数据
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

// 本地存储键名
const STORAGE_KEYS = {
  facilities: 'fireFacilities',
  users: 'systemUsers',
  inspectionRecords: 'inspectionRecords',
  checkForms: 'checkForms'
};

// Provider组件
export function DataProvider({ children }: { children: ReactNode }) {
  // 初始化消防设施数据
  const [facilities, setFacilities] = useState<FireFacility[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.facilities);
    return stored ? JSON.parse(stored) : initialFacilities;
  });

  // 初始化用户数据
  const [users, setUsers] = useState<SystemUser[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.users);
    return stored ? JSON.parse(stored) : initialUsers;
  });

  // 初始化巡检记录数据
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.inspectionRecords);
    return stored ? JSON.parse(stored) : [];
  });

  // 初始化检查表单数据
  const [checkForms, setCheckForms] = useState<CheckForm[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.checkForms);
    return stored ? JSON.parse(stored) : initialCheckForms;
  });

  // 同步到本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.facilities, JSON.stringify(facilities));
  }, [facilities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.inspectionRecords, JSON.stringify(inspectionRecords));
  }, [inspectionRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.checkForms, JSON.stringify(checkForms));
  }, [checkForms]);

  // 消防设施操作
  const addFacilities = (newFacilities: FireFacility[]) => {
    setFacilities(prev => [...prev, ...newFacilities]);
  };

  const updateFacility = (id: string, updates: Partial<FireFacility>) => {
    setFacilities(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const deleteFacility = (id: string) => {
    setFacilities(prev => prev.filter(f => f.id !== id));
  };

  // 用户操作
  const addUser = (user: SystemUser): boolean => {
    if (users.some(u => u.username === user.username)) {
      return false;
    }
    setUsers(prev => [...prev, user]);
    return true;
  };

  const updateUser = (id: string, updates: Partial<SystemUser>) => {
    setUsers(prev => prev.map(u => 
      u.id === id ? { ...u, ...updates } : u
    ));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // 检查表单操作
  const addCheckForm = (form: CheckForm) => {
    setCheckForms(prev => [...prev, form]);
  };

  const updateCheckForm = (id: string, updates: Partial<CheckForm>) => {
    setCheckForms(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const deleteCheckForm = (id: string) => {
    setCheckForms(prev => prev.filter(f => f.id !== id));
  };

  const getCheckFormByFacilityType = (facilityType: string): CheckForm | undefined => {
    return checkForms.find(f => f.facilityType === facilityType);
  };

  // 巡检记录操作
  const addInspectionRecord = (record: Omit<InspectionRecord, 'id'>) => {
    const newRecord: InspectionRecord = {
      ...record,
      id: Date.now().toString()
    };
    setInspectionRecords(prev => [newRecord, ...prev]);
  };

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

  // 获取即将到期的巡检（默认7天内）
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

  // 获取异常问题列表（从巡检记录中筛选状态为异常的记录）
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
