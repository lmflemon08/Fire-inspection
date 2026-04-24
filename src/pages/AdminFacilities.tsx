import React, { useRef } from 'react';
import { useState, useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData, FireFacility, InspectionCycle } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from '@/components/AdminLayout';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminFacilities() {
  const { logout } = useContext(AuthContext);
  const { facilities, setFacilities, addFacilities, updateFacility, deleteFacility } = useData();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExtinguisher, setEditingExtinguisher] = useState<FireFacility | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 排序状态
  type SortField = 'code' | 'type' | 'location' | 'nextInspectionDate' | 'status';
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Excel导入相关状态
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<Partial<FireFacility>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 批量下载二维码状态
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  
  // 消防设施类型选项
  const facilityTypes = ['干粉灭火器', '二氧化碳灭火器', '消火栓', '泡沫灭火器', '水型灭火器', '其他'];
  
  // 巡检周期选项
  const inspectionCycleOptions: { value: InspectionCycle; label: string }[] = [
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
    { value: 'quarterly', label: '每季度' },
    { value: 'yearly', label: '每年' }
  ];

  // 状态选项（正常、异常、暂存）
  const statusOptions: { value: 'normal' | 'abnormal' | 'stored'; label: string; color: string }[] = [
    { value: 'normal', label: '正常', color: '#52C41A' },
    { value: 'abnormal', label: '异常', color: '#FF4D4F' },
    { value: 'stored', label: '暂存', color: '#8C8C8C' }
  ];
  
  // 表单状态类型
  type FormData = {
    code: string;
    type: string;
    model: string;
    specification: string;
    location: string;
    status: 'normal' | 'abnormal' | 'stored';
    inspectionCycle: InspectionCycle;
    lastInspectionDate: string;
    nextInspectionDate: string;
    serviceLife?: number;      // 使用寿命（年）
    initialWeight?: number;    // 初始重量（g）
    purchaseDate?: string;     // 购置日期
    retirementDate?: string;   // 报废日期
  };
  
  // 表单状态
  const [formData, setFormData] = useState<FormData>({
    code: '',
    type: '',
    model: '',
    specification: '',
    location: '',
    status: 'stored', // 默认暂存
    inspectionCycle: 'monthly',
    lastInspectionDate: '',
    nextInspectionDate: '',
    serviceLife: 5,
    initialWeight: undefined,
    purchaseDate: '',
    retirementDate: ''
  });

  // 过滤消防设施
  const filteredFacilities = facilities.filter(facility => 
    facility.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    facility.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 排序消防设施
  const sortedFacilities = [...filteredFacilities].sort((a, b) => {
    let valueA: string = '';
    let valueB: string = '';
    
    switch (sortField) {
      case 'code':
        valueA = a.code;
        valueB = b.code;
        break;
      case 'type':
        valueA = a.type;
        valueB = b.type;
        break;
      case 'location':
        valueA = a.location;
        valueB = b.location;
        break;
      case 'nextInspectionDate':
        valueA = a.nextInspectionDate || '';
        valueB = b.nextInspectionDate || '';
        break;
      case 'status':
        valueA = a.status;
        valueB = b.status;
        break;
    }
    
    if (sortOrder === 'asc') {
      return valueA.localeCompare(valueB);
    } else {
      return valueB.localeCompare(valueA);
    }
  });

  // 判断是否逾期
  const isOverdue = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // 处理表单变化
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // 处理数字类型字段
    if (name === 'serviceLife' || name === 'initialWeight') {
      setFormData(prev => ({ ...prev, [name]: value ? Number(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 生成新编号（模拟）
  const generateNewCode = () => {
    const latestCode = facilities.reduce((max, item) => {
      const num = parseInt(item.code.replace(/[^0-9]/g, ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return `MHQ${String(latestCode + 1).padStart(3, '0')}`;
  };

  // 添加消防设施
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 计算下次巡检日期
    const nextDate = calculateNextInspectionDate(formData.inspectionCycle);
    
    const newFacility: FireFacility = {
      ...formData,
      id: Date.now().toString(),
      code: formData.code || generateNewCode(),
      nextInspectionDate: nextDate
    };
    
    try {
      await addFacilities([newFacility]);
      setIsAddModalOpen(false);
      setFormData({
        code: '',
        type: '',
        model: '',
        specification: '',
        location: '',
        status: 'stored' as const,
        inspectionCycle: 'monthly' as InspectionCycle,
        lastInspectionDate: '',
        nextInspectionDate: '',
        serviceLife: 5,
        initialWeight: undefined,
        purchaseDate: '',
        retirementDate: ''
      });
      toast.success('消防设施添加成功');
    } catch (error) {
      console.error('添加失败:', error);
      toast.error('添加失败，请稍后重试');
    }
  };

  // 根据巡检周期计算下次巡检日期
  const calculateNextInspectionDate = (cycle: InspectionCycle): string => {
    const now = new Date();
    const next = new Date(now);
    
    switch (cycle) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    
    return next.toISOString().split('T')[0];
  };

  // 批量修复所有已完成点检设施的下次巡检时间
  const handleBatchFixNextInspection = async () => {
    // 找出所有状态为 normal/abnormal（已完成点检）但下次巡检时间需要修复的设施
    // 条件：下次巡检日期 <= 今天（已到期或需要更新）
    const today = new Date().toISOString().split('T')[0];
    
    // 找出需要修复的设施（状态为 normal/abnormal，且下次巡检日期 <= 今天）
    const facilitiesToFix = facilities.filter(f => 
      (f.status === 'normal' || f.status === 'abnormal') && 
      f.nextInspectionDate && 
      f.nextInspectionDate <= today
    );

    if (facilitiesToFix.length === 0) {
      toast.info('所有设施的下次巡检时间已是最新，无需修复');
      return;
    }

    // 确认操作
    const confirmed = window.confirm(
      `发现 ${facilitiesToFix.length} 个设施的下次巡检时间需要修复。\n\n` +
      `是否立即为这些设施根据其周期重新计算下次巡检时间？\n\n` +
      `（每月 → 下个月今天，每季度 → 3个月后，每年 → 1年后）`
    );

    if (!confirmed) return;

    // 逐个更新
    let successCount = 0;
    let failCount = 0;

    for (const facility of facilitiesToFix) {
      try {
        const newNextDate = calculateNextInspectionDate(facility.inspectionCycle);
        await updateFacility(facility.id, {
          lastInspectionDate: facility.lastInspectionDate || today,
          nextInspectionDate: newNextDate
        });
        successCount++;
      } catch (error) {
        console.error(`更新设施 ${facility.code} 失败:`, error);
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.success(`成功修复 ${successCount} 个设施的下次巡检时间`);
    } else {
      toast.warning(`修复完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }
  };

  // 编辑消防设施
  const handleEditFacility = (facility: FireFacility) => {
    setEditingExtinguisher(facility);
    setFormData({
      code: facility.code,
      type: facility.type,
      model: facility.model,
      specification: facility.specification,
      location: facility.location,
      status: facility.status,
      inspectionCycle: facility.inspectionCycle,
      lastInspectionDate: facility.lastInspectionDate || '',
      nextInspectionDate: facility.nextInspectionDate || '',
      serviceLife: facility.serviceLife,
      initialWeight: facility.initialWeight,
      purchaseDate: facility.purchaseDate || '',
      retirementDate: facility.retirementDate || ''
    });
    setIsEditModalOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingExtinguisher) return;
    
    console.log('保存编辑，设施ID:', editingExtinguisher.id);
    console.log('表单数据:', formData);
    
    try {
      await updateFacility(editingExtinguisher.id, formData);
      
      setIsEditModalOpen(false);
      setEditingExtinguisher(null);
      setFormData({
        code: '',
        type: '',
        model: '',
        specification: '',
        location: '',
        status: 'stored' as const,
        inspectionCycle: 'monthly' as InspectionCycle,
        lastInspectionDate: '',
        nextInspectionDate: '',
        serviceLife: 5,
        initialWeight: undefined,
        purchaseDate: '',
        retirementDate: ''
      });
      
      toast.success('消防设施信息更新成功');
    } catch (error: any) {
      console.error('保存失败:', error);
      toast.error(`保存失败: ${error.message || '请稍后重试'}`);
    }
  };

  // 删除消防设施
  const handleDeleteFacility = async (facilityId: string) => {
    if (window.confirm('确定要删除此消防设施吗？删除后将无法恢复。')) {
      await deleteFacility(facilityId);
      toast.success('消防设施已删除');
    }
  };

  // Excel日期序列号转换为日期字符串
  const excelDateToString = (value: unknown): string => {
    if (!value) return '';
    
    // 如果是数字，认为是Excel日期序列号
    if (typeof value === 'number') {
      // Excel日期序列号从1900年1月1日开始，需要减去2天修正Excel的闰年bug
      const excelEpoch = new Date(1899, 11, 30); // 1899年12月30日
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // 如果是字符串，检查是否是数字字符串（Excel日期序列号）
    const strValue = String(value);
    if (/^\d+$/.test(strValue) && strValue.length >= 4) {
      const numValue = parseInt(strValue, 10);
      // 合理的Excel日期序列号范围（1900-2100年大约是1-73050）
      if (numValue > 1 && numValue < 80000) {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      }
    }
    
    // 已经是日期字符串格式，直接返回
    return strValue;
  };

  // Excel导入处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

        // 周期映射
        const cycleMap: Record<string, InspectionCycle> = {
          '每周': 'weekly',
          '每月': 'monthly',
          '每季': 'quarterly',
          '每季度': 'quarterly',
          '每年': 'yearly',
          'weekly': 'weekly',
          'monthly': 'monthly',
          'quarterly': 'quarterly',
          'yearly': 'yearly'
        };

        // 状态映射
        const statusMap: Record<string, 'stored' | 'normal' | 'abnormal'> = {
          '待检': 'stored',
          '正常': 'normal',
          '异常': 'abnormal',
          '暂存': 'stored',
          'stored': 'stored',
          'normal': 'normal',
          'abnormal': 'abnormal'
        };

        // 验证并转换数据
        const formattedData: Partial<FireFacility>[] = data.map((row, index) => {
          // 解析周期
          const cycleText = String(row['周期'] || row['inspectionCycle'] || '每月');
          const inspectionCycle = cycleMap[cycleText] || 'monthly';
          
          // 解析状态
          const statusText = String(row['状态'] || row['status'] || '正常');
          const status = statusMap[statusText] || 'normal';
          
          // 解析下次巡检日期（处理Excel日期序列号）
          const nextInspectionDateRaw = row['下次巡检日期'] || row['nextInspectionDate'];
          const nextInspectionDate = excelDateToString(nextInspectionDateRaw);

          return {
            id: `import-${Date.now()}-${index}`,
            code: String(row['编号'] || row['code'] || ''),
            type: String(row['类型'] || row['type'] || ''),
            model: String(row['型号'] || row['model'] || ''),
            specification: String(row['规格'] || row['specification'] || ''),
            location: String(row['放置点位'] || row['location'] || ''),
            inspectionCycle: inspectionCycle,
            nextInspectionDate: nextInspectionDate,
            status: status
          };
        });

        // 过滤掉空行
        let validData = formattedData.filter(item => item.code && item.type);
        
        if (validData.length === 0) {
          toast.error('未找到有效数据，请检查Excel格式');
          return;
        }

        // 检查并去除重复编码（保留最后一条）
        const codeMap = new Map<string, Partial<FireFacility>>();
        validData.forEach(item => {
          if (item.code) {
            codeMap.set(item.code, item);
          }
        });
        
        if (codeMap.size < validData.length) {
          const duplicateCount = validData.length - codeMap.size;
          toast.warning(`发现 ${duplicateCount} 条重复编码，已自动去重`);
          validData = Array.from(codeMap.values());
        }

        setImportData(validData);
        setIsImportModalOpen(true);
      } catch {
        toast.error('Excel文件解析失败，请检查文件格式');
      }
    };
    reader.readAsBinaryString(file);
    
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 确认导入
  const handleConfirmImport = async () => {
    // 转换数据并去重（按编码去重，保留最后一条）
    const facilityMap = new Map<string, FireFacility>();
    importData.forEach((item, index) => {
      const code = item.code || generateNewCode();
      // 使用导入数据中的周期和下次巡检日期，如果没有则使用默认值
      const cycle = item.inspectionCycle || 'monthly';
      const nextDate = item.nextInspectionDate || calculateNextInspectionDate(cycle);
      
      facilityMap.set(code, {
        id: `import-${Date.now()}-${index}`,
        code: code,
        type: item.type || '',
        model: item.model || '',
        specification: item.specification || '',
        location: item.location || '',
        status: item.status || 'normal',
        inspectionCycle: cycle,
        nextInspectionDate: nextDate
      });
    });
    
    const newFacilities = Array.from(facilityMap.values());
    console.log('准备导入的设施数量:', newFacilities.length, '条');

    try {
      await addFacilities(newFacilities);
      setIsImportModalOpen(false);
      setImportData([]);
      toast.success(`成功导入 ${newFacilities.length} 条消防设施数据`);
    } catch (error: any) {
      console.error('导入失败详情:', error);
      toast.error(`导入失败: ${error.message || '请稍后重试'}`);
    }
  };

  // 下载Excel模板
  const handleDownloadTemplate = () => {
    // 计算示例的下次巡检日期（下个月今天）
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextInspectionDate = nextMonth.toISOString().split('T')[0];

    const templateData = [
      {
        '编号': 'MHQ001',
        '类型': '干粉灭火器',
        '型号': 'MFZ/ABC4',
        '规格': '4kg',
        '放置点位': '大门口',
        '周期': '每月',
        '下次巡检日期': nextInspectionDate,
        '状态': '待检'
      },
      {
        '编号': 'MHQ002',
        '类型': '二氧化碳灭火器',
        '型号': 'MT3',
        '规格': '3kg',
        '放置点位': '会议室',
        '周期': '每月',
        '下次巡检日期': nextInspectionDate,
        '状态': '待检'
      },
      {
        '编号': 'MHQ003',
        '类型': '消火栓',
        '型号': 'SS100/65-1.6',
        '规格': 'DN100',
        '放置点位': '走廊',
        '周期': '每月',
        '下次巡检日期': nextInspectionDate,
        '状态': '待检'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '消防设施导入模板');

    // 设置列宽
    ws['!cols'] = [
      { wch: 12 },  // 编号
      { wch: 15 },  // 类型
      { wch: 15 },  // 型号
      { wch: 10 },  // 规格
      { wch: 20 },  // 放置点位
      { wch: 10 },  // 周期
      { wch: 15 },  // 下次巡检日期
      { wch: 8 }    // 状态
    ];

    XLSX.writeFile(wb, '消防设施导入模板.xlsx');
    toast.success('模板下载成功');
  };

  // 删除导入预览中的某一行
  const handleRemoveImportRow = (index: number) => {
    setImportData(prev => prev.filter((_, i) => i !== index));
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === sortedFacilities.length) {
      // 取消全选
      setSelectedIds(new Set());
    } else {
      // 全选
      setSelectedIds(new Set(sortedFacilities.map(f => f.id)));
    }
  };

  // 单个选择/取消选择
  const handleSelectOne = (facilityId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(facilityId)) {
      newSelected.delete(facilityId);
    } else {
      newSelected.add(facilityId);
    }
    setSelectedIds(newSelected);
  };

  // 批量删除消防设施
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要删除的设施');
      return;
    }
    
    const count = selectedIds.size;
    if (window.confirm(`确定要删除选中的 ${count} 个消防设施吗？删除后将无法恢复。`)) {
      try {
        // 逐个删除选中的设施
        for (const facilityId of selectedIds) {
          await deleteFacility(facilityId);
        }
        setSelectedIds(new Set());
        toast.success(`成功删除 ${count} 个消防设施`);
      } catch (error) {
        console.error('批量删除失败:', error);
        toast.error('批量删除失败，请稍后重试');
      }
    }
  };

  // 批量下载二维码
  const handleBatchDownloadQRCodes = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要下载二维码的设施');
      return;
    }
    
    setIsBatchDownloading(true);
    
    try {
      // 获取选中的设施
      const selectedFacilities = facilities.filter(f => selectedIds.has(f.id));
      
      // 使用 JSZip 打包下载
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // 使用 qrcode-generator 生成二维码
      const qrGenerator = await import('qrcode-generator');
      
      // 生成每个设施的二维码图片
      for (const facility of selectedFacilities) {
        const qrData = `${typeof window !== 'undefined' ? window.location.origin : ''}/inspect/${facility.code}`;
        
        // 使用 canvas 生成二维码图片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        // 设置canvas尺寸
        const scale = 4;
        const qrSize = 200;
        const padding = 16;
        const labelHeight = 60;
        const totalHeight = qrSize + padding * 2 + labelHeight;
        const totalWidth = qrSize + padding * 2;
        
        canvas.width = totalWidth * scale;
        canvas.height = totalHeight * scale;
        
        // 填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 使用 qrcode-generator 库生成二维码矩阵
        // @ts-expect-error qrcode-generator 动态导入
        const qrCode = qrGenerator.default ? qrGenerator.default(0, 'M') : qrGenerator(0, 'M');
        qrCode.addData(qrData);
        qrCode.make();
        
        // 绘制二维码
        const cellSize = qrSize / qrCode.getModuleCount();
        ctx.fillStyle = '#000000';
        for (let row = 0; row < qrCode.getModuleCount(); row++) {
          for (let col = 0; col < qrCode.getModuleCount(); col++) {
            if (qrCode.isDark(row, col)) {
              ctx.fillRect(
                (padding + col * cellSize) * scale,
                (padding + row * cellSize) * scale,
                cellSize * scale,
                cellSize * scale
              );
            }
          }
        }
        
        // 绘制底部蓝色标签区域
        const labelY = (padding + qrSize) * scale;
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, labelY, canvas.width, labelHeight * scale);
        
        // 绘制设施编号（白色文字）
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = `bold ${24 * scale}px Arial, sans-serif`;
        ctx.fillText(facility.code, canvas.width / 2, labelY + 26 * scale);
        
        // 绘制类型（较小字体）
        ctx.font = `${14 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#bfdbfe';
        ctx.fillText(facility.type, canvas.width / 2, labelY + 46 * scale);
        
        // 将图片添加到 zip
        const imgData = canvas.toDataURL('image/png').split(',')[1];
        zip.file(`${facility.code}_二维码.png`, imgData, { base64: true });
      }
      
      // 下载 zip 文件
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `消防设施二维码_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success(`成功下载 ${selectedFacilities.length} 个二维码`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('批量下载二维码失败:', error);
      toast.error('批量下载二维码失败，请稍后重试');
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // 查看二维码状态
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [currentFacilityId, setCurrentFacilityId] = useState('');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  // 查看二维码
  const handleViewQRCode = (facilityId: string) => {
    setCurrentFacilityId(facilityId);
    setIsQRCodeModalOpen(true);
  };
  
  // 下载二维码
  const handleDownloadQRCode = () => {
    const facility = facilities.find(f => f.id === currentFacilityId);
    if (!facility) return;
    
    // 获取SVG元素
    const svgElement = qrCodeRef.current?.querySelector('svg');
    if (!svgElement) {
      toast.error('二维码生成失败');
      return;
    }
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('二维码生成失败');
      return;
    }
    
    // 设置canvas尺寸（高清）
    const scale = 4; // 4倍分辨率
    const qrSize = 200; // 二维码尺寸（与预览一致）
    const padding = 16; // 内边距
    const labelHeight = 60; // 标签区域高度
    const totalHeight = qrSize + padding * 2 + labelHeight;
    const totalWidth = qrSize + padding * 2;
    
    canvas.width = totalWidth * scale;
    canvas.height = totalHeight * scale;
    
    // 填充白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 将SVG转换为图片
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      // 绘制二维码
      ctx.drawImage(img, padding * scale, padding * scale, qrSize * scale, qrSize * scale);
      URL.revokeObjectURL(url);
      
      // 绘制底部蓝色标签区域
      const labelY = (padding + qrSize) * scale;
      ctx.fillStyle = '#2563eb'; // blue-600
      ctx.fillRect(0, labelY, canvas.width, labelHeight * scale);
      
      // 绘制设施编号（白色文字）
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      
      // 编号（较大字体）
      ctx.font = `bold ${24 * scale}px Arial, sans-serif`;
      ctx.fillText(facility.code, canvas.width / 2, labelY + 26 * scale);
      
      // 类型（较小字体）
      ctx.font = `${14 * scale}px Arial, sans-serif`;
      ctx.fillStyle = '#bfdbfe'; // blue-100
      ctx.fillText(facility.type, canvas.width / 2, labelY + 46 * scale);
      
      // 下载图片
      const link = document.createElement('a');
      link.download = `${facility.code}_二维码.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success(`已下载${facility.code}的二维码`);
      setIsQRCodeModalOpen(false);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('二维码下载失败');
    };
    
    img.src = url;
  };

  // 动画变体
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <AdminLayout activeMenu="facilities" title="消防设施录入" onLogout={logout}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
         <h1 className="text-2xl font-bold" style={{ color: '#333333' }}>消防设施录入</h1>
         </motion.div>

         {/* 操作栏 */}
         <motion.div 
           className="flex flex-wrap gap-4 mb-6"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.1 }}
         >
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="inline-flex items-center px-4 py-2 text-white font-medium rounded-md transition duration-300"
             style={{ backgroundColor: '#1677FF' }}
             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4096FF'}
             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1677FF'}
           >
             <i className="fa-solid fa-plus mr-2"></i>
             新增消防设施
           </button>
             
             <input
               ref={fileInputRef}
               type="file"
               accept=".xlsx,.xls"
               onChange={handleFileUpload}
               className="hidden"
             />
             
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="inline-flex items-center px-4 py-2 font-medium rounded-md transition duration-300 border"
               style={{ backgroundColor: '#E8F3FF', color: '#1677FF', borderColor: '#91CAFF' }}
             >
               <i className="fa-solid fa-file-excel mr-2"></i>
               Excel批量导入
             </button>
             
             <button 
               onClick={handleDownloadTemplate}
               className="inline-flex items-center px-4 py-2 font-medium rounded-md transition duration-300 border"
               style={{ backgroundColor: '#FFFFFF', color: '#595959', borderColor: '#D9D9D9' }}
             >
               <i className="fa-solid fa-download mr-2"></i>
               下载导入模板
             </button>
             
             {/* 批量修复下次巡检时间按钮 */}
             <button 
               onClick={handleBatchFixNextInspection}
               className="inline-flex items-center px-4 py-2 font-medium rounded-md transition duration-300 border"
               style={{ backgroundColor: '#F6FFED', color: '#52C41A', borderColor: '#B7EB8F' }}
               title="为所有已完成点检但下次巡检时间未更新的设施自动计算下次巡检时间"
             >
               <i className="fa-solid fa-calendar-check mr-2"></i>
               批量修复巡检时间
             </button>
             
             {/* 批量操作按钮 - 当有选中项时显示 */}
             {selectedIds.size > 0 && (
               <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                 <span className="text-sm text-blue-700">
                   已选择 <span className="font-bold">{selectedIds.size}</span> 项
                 </span>
                 <button 
                   onClick={() => setSelectedIds(new Set())}
                   className="text-blue-600 hover:text-blue-800 text-sm"
                 >
                   取消选择
                 </button>
               </div>
             )}
             
             {selectedIds.size > 0 && (
               <>
                 <button 
                   onClick={handleBatchDownloadQRCodes}
                   disabled={isBatchDownloading}
                   className="inline-flex items-center px-4 py-2 font-medium rounded-md transition duration-300 border disabled:opacity-50 disabled:cursor-not-allowed"
                   style={{ backgroundColor: '#E8F3FF', color: '#1677FF', borderColor: '#91CAFF' }}
                 >
                   <i className={`fa-solid ${isBatchDownloading ? 'fa-spinner fa-spin' : 'fa-qrcode'} mr-2`}></i>
                   {isBatchDownloading ? '生成中...' : '批量下载二维码'}
                 </button>
                 
                 <button 
                   onClick={handleBatchDelete}
                   className="inline-flex items-center px-4 py-2 font-medium rounded-md transition duration-300 border"
                   style={{ backgroundColor: '#FFF1F0', color: '#FF4D4F', borderColor: '#FFA39E' }}
                 >
                   <i className="fa-solid fa-trash-can mr-2"></i>
                   批量删除
                 </button>
               </>
             )}
           </motion.div>

          {/* 搜索和排序栏 */}
          <motion.div 
            className="flex flex-wrap gap-4 mb-4 items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px]">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="搜索编号、类型、型号、放置点位..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              )}
            </div>
            
            {/* 排序选择 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">排序:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="code">编号</option>
                <option value="type">类型</option>
                <option value="location">放置点位</option>
                <option value="nextInspectionDate">下次巡检</option>
                <option value="status">状态</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
              </button>
            </div>
          </motion.div>

          {/* 数据统计 */}
          <div className="mb-4 text-sm text-gray-500">
            共 <span className="font-medium text-gray-700">{sortedFacilities.length}</span> 条记录
            {searchTerm && ` (筛选自 ${facilities.length} 条)`}
          </div>

          {/* 灭火器列表 */}
          <motion.div 
            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === sortedFacilities.length && sortedFacilities.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>编号</th>
                    <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>类型</th>
                    <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>型号</th>
                    <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>放置点位</th>
                    <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>周期</th>
                    <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>下次巡检</th>
                    <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>状态</th>
                    <th scope="col" className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>二维码</th>
                    <th scope="col" className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: '#333333' }}>操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  <AnimatePresence>
                     {sortedFacilities.map((facility) => (
                       <motion.tr 
                         key={facility.id}
                         className={`hover:bg-gray-50 transition-colors ${selectedIds.has(facility.id) ? 'bg-blue-50' : ''}`}
                         variants={itemVariants}
                         initial="hidden"
                         animate="visible"
                         exit={{ opacity: 0, height: 0 }}
                         transition={{ duration: 0.3 }}
                       >
                         <td className="px-3 py-2">
                           <input
                             type="checkbox"
                             checked={selectedIds.has(facility.id)}
                             onChange={() => handleSelectOne(facility.id)}
                             className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                           />
                         </td>
                         <td className="px-3 py-2 text-xs font-medium whitespace-nowrap" style={{ color: '#333333' }}>{facility.code}</td>
                         <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: '#595959' }}>{facility.type}</td>
                         <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: '#595959' }}>{facility.model}</td>
                         <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: '#595959' }}>{facility.location}</td>
                         <td className="px-3 py-2 whitespace-nowrap">
                           <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                             facility.inspectionCycle === 'weekly' ? 'bg-purple-100 text-purple-800' :
                             facility.inspectionCycle === 'monthly' ? 'bg-blue-100 text-blue-800' :
                             facility.inspectionCycle === 'quarterly' ? 'bg-indigo-100 text-indigo-800' :
                             'bg-gray-100 text-gray-800'
                           }`}>
                             {facility.inspectionCycle === 'weekly' ? '每周' : 
                              facility.inspectionCycle === 'monthly' ? '每月' : 
                              facility.inspectionCycle === 'quarterly' ? '每季' : '每年'}
                           </span>
                         </td>
                         <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: '#595959' }}>
                           {facility.nextInspectionDate ? (
                             <span className={isOverdue(facility.nextInspectionDate) ? 'text-red-600 font-medium' : ''}>
                               {facility.nextInspectionDate}
                             </span>
                           ) : '-'}
                           {facility.nextInspectionDate && isOverdue(facility.nextInspectionDate) && (
                             <i className="fa-solid fa-exclamation-triangle ml-1 text-red-500"></i>
                           )}
                         </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex items-center text-[11px] leading-4 font-semibold rounded-full ${
                              facility.status === 'normal' 
                                ? 'text-green-800' 
                                : facility.status === 'abnormal'
                                ? 'text-red-800'
                                : facility.status === 'stored'
                                ? 'text-gray-800'
                                : 'text-yellow-800'
                            }`}
                            style={{ 
                              backgroundColor: facility.status === 'normal' ? '#F6FFED' : 
                                             facility.status === 'abnormal' ? '#FFF1F0' : 
                                             facility.status === 'stored' ? '#F5F5F5' : '#FFFBE6' 
                            }}
                            >
                              {facility.status === 'normal' && <i className="fa-solid fa-check-circle mr-1"></i>}
                              {facility.status === 'abnormal' && <i className="fa-solid fa-exclamation-circle mr-1"></i>}
                              {facility.status === 'stored' && <i className="fa-solid fa-box mr-1"></i>}
                              {facility.status === 'normal' ? '正常' : 
                               facility.status === 'abnormal' ? '异常' : 
                               facility.status === 'stored' ? '暂存' : '待检'}
                            </span>
                            {/* 显示使用寿命信息 */}
                            {facility.serviceLife && (
                              <span className="ml-2 text-xs text-gray-400" title={`使用寿命：${facility.serviceLife}年`}>
                                <i className="fa-solid fa-hourglass-half mr-1"></i>
                                {facility.serviceLife}年
                              </span>
                            )}
                          </td>
                         <td className="px-3 py-2 text-center whitespace-nowrap">
                           <button 
                             onClick={() => handleViewQRCode(facility.id)}
                             className="text-xs"
                             style={{ color: '#1677FF' }}
                           >
                             <i className="fa-solid fa-qrcode"></i>
                           </button>
                         </td>
                         <td className="px-3 py-2 text-right whitespace-nowrap">
                           <button 
                             onClick={() => handleEditFacility(facility)}
                             className="mr-2 text-xs"
                             style={{ color: '#1677FF' }}
                             title="编辑"
                           >
                             <i className="fa-solid fa-pen-to-square"></i>
                           </button>
                           <button 
                             onClick={() => handleDeleteFacility(facility.id)}
                             className="text-xs"
                             style={{ color: '#FF4D4F' }}
                             title="删除"
                           >
                             <i className="fa-solid fa-trash-can"></i>
                           </button>
                         </td>
                       </motion.tr>
                     ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
             {/* 空状态 */}
             {filteredFacilities.length === 0 && (
               <div className="flex flex-col items-center justify-center py-12">
                 <i className="fa-solid fa-fire-extinguisher-slash text-gray-400 text-4xl mb-4"></i>
                 <p className="text-gray-500 dark:text-gray-400">没有找到匹配的消防设施</p>
               </div>
             )}
          </motion.div>

          {/* 添加灭火器模态框 */}
          <AnimatePresence>
            {isAddModalOpen && (
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
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white">新增消防设施</h3>
                     <button 
                      onClick={() => setIsAddModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddFacility} className="space-y-4">
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        编号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="code"
                        name="code"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="自动生成或手动输入"
                        value={formData.code}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        类型 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="type"
                        name="type"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.type}
                        onChange={handleFormChange}
                      >
                        <option value="">请选择类型</option>
                        <option value="">请选择类型</option>
                        {facilityTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                        <option value="custom">其他类型（手动输入）</option>
                      </select>
                      {/* 手动输入类型的输入框 */}
                      {formData.type === 'custom' && (
                        <input
                          type="text"
                          placeholder="请输入其他类型"
                          className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          onChange={(e) => {
                            // 创建一个新的类型数组，避免直接修改state
                            const newTypes = [...facilityTypes];
                            // 如果输入的类型不在现有列表中，添加到列表并更新表单
                            if (e.target.value && !newTypes.includes(e.target.value)) {
                              // 这里仅在UI中添加，不修改state以保持组件纯净
                              // 在实际应用中，可以考虑更新state或调用API
                            }
                            // 更新表单数据的类型
                            setFormData(prev => ({ ...prev, type: e.target.value }));
                          }}
                        />
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        型号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="model"
                        name="model"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入型号"
                        value={formData.model}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="specification" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        规格 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="specification"
                        name="specification"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="如：2kg"
                        value={formData.specification}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        放置点位 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="location"
                        name="location"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入放置点位"
                        value={formData.location}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="inspectionCycle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        巡检周期 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="inspectionCycle"
                        name="inspectionCycle"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.inspectionCycle}
                        onChange={handleFormChange}
                      >
                        {inspectionCycleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 状态选择 */}
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        状态
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">注：状态为"暂存"的设施不列入巡检计划</p>
                    </div>

                    {/* 使用寿命 */}
                    <div>
                      <label htmlFor="serviceLife" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        使用寿命（年）
                      </label>
                      <input
                        id="serviceLife"
                        name="serviceLife"
                        type="number"
                        min="1"
                        max="20"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="如：5"
                        value={formData.serviceLife || ''}
                        onChange={handleFormChange}
                      />
                    </div>

                    {/* 初始重量（二氧化碳灭火器等称重检测用） */}
                    <div>
                      <label htmlFor="initialWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        初始重量（g）
                      </label>
                      <input
                        id="initialWeight"
                        name="initialWeight"
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="如：2500（用于称重检测）"
                        value={formData.initialWeight || ''}
                        onChange={handleFormChange}
                      />
                      <p className="mt-1 text-xs text-gray-500">二氧化碳灭火器等需要称重检测的设施请填写</p>
                    </div>

                    {/* 购置日期 */}
                    <div>
                      <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        购置日期
                      </label>
                      <input
                        id="purchaseDate"
                        name="purchaseDate"
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.purchaseDate || ''}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsAddModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
                      >
                        取消
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300"
                       >
                        新增消防设施
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Excel导入预览模态框 */}
          <AnimatePresence>
            {isImportModalOpen && (
              <motion.div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col"
                  variants={modalVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      <i className="fa-solid fa-file-excel text-green-500 mr-2"></i>
                      Excel批量导入预览
                    </h3>
                    <button 
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportData([]);
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <i className="fa-solid fa-info-circle mr-2"></i>
                      共解析到 <span className="font-bold">{importData.length}</span> 条数据，请检查无误后点击"确认导入"
                    </p>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">序号</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">编号</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">型号</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">规格</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">放置点位</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {importData.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                              {item.code || <span className="text-orange-500">自动生成</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {item.type || <span className="text-red-500">缺失</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.model || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.specification || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.location || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <button 
                                onClick={() => handleRemoveImportRow(index)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportData([]);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
                    >
                      取消
                    </button>
                    <button 
                      onClick={handleConfirmImport}
                      disabled={importData.length === 0}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition duration-300 flex items-center"
                    >
                      <i className="fa-solid fa-check mr-2"></i>
                      确认导入 ({importData.length}条)
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 编辑灭火器模态框 */}
          <AnimatePresence>
            {isEditModalOpen && (
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">编辑灭火器</h3>
                    <button 
                      onClick={() => setIsEditModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        编号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="code"
                        name="code"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.code}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        类型 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="type"
                        name="type"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.type}
                        onChange={handleFormChange}
                      >
                        <option value="">请选择类型</option>
                        <option value="">请选择类型</option>
                        {facilityTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                        <option value="custom">其他类型（手动输入）</option>
                      </select>
                      {/* 手动输入类型的输入框 */}
                      {formData.type === 'custom' && (
                        <input
                          type="text"
                          placeholder="请输入其他类型"
                          className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.type === 'custom' ? '' : formData.type}
                          onChange={(e) => {
                            // 创建一个新的类型数组，避免直接修改state
                            const newTypes = [...facilityTypes];
                            // 如果输入的类型不在现有列表中，添加到列表并更新表单
                            if (e.target.value && !newTypes.includes(e.target.value)) {
                              // 这里仅在UI中添加，不修改state以保持组件纯净
                              // 在实际应用中，可以考虑更新state或调用API
                            }
                            // 更新表单数据的类型
                            setFormData(prev => ({ ...prev, type: e.target.value }));
                          }}
                        />
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        型号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="model"
                        name="model"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.model}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="specification" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        规格 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="specification"
                        name="specification"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.specification}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        放置点位 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="location"
                        name="location"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.location}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-inspectionCycle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        巡检周期 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="edit-inspectionCycle"
                        name="inspectionCycle"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.inspectionCycle}
                        onChange={handleFormChange}
                      >
                        {inspectionCycleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="edit-nextInspectionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        下次巡检日期
                      </label>
                      <input
                        id="edit-nextInspectionDate"
                        name="nextInspectionDate"
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.nextInspectionDate || ''}
                        onChange={handleFormChange}
                      />
                    </div>

                    {/* 状态选择 */}
                    <div>
                      <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        状态
                      </label>
                      <select
                        id="edit-status"
                        name="status"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">注：状态为"暂存"的设施不列入巡检计划</p>
                    </div>

                    {/* 使用寿命 */}
                    <div>
                      <label htmlFor="edit-serviceLife" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        使用寿命（年）
                      </label>
                      <input
                        id="edit-serviceLife"
                        name="serviceLife"
                        type="number"
                        min="1"
                        max="20"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.serviceLife || ''}
                        onChange={handleFormChange}
                      />
                    </div>

                    {/* 初始重量 */}
                    <div>
                      <label htmlFor="edit-initialWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        初始重量（g）
                      </label>
                      <input
                        id="edit-initialWeight"
                        name="initialWeight"
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.initialWeight || ''}
                        onChange={handleFormChange}
                      />
                    </div>

                    {/* 购置日期 */}
                    <div>
                      <label htmlFor="edit-purchaseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        购置日期
                      </label>
                      <input
                        id="edit-purchaseDate"
                        name="purchaseDate"
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.purchaseDate || ''}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
                      >
                        取消
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300"
                      >
                        保存修改
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
           </AnimatePresence>

          {/* 二维码查看模态框 */}
          <AnimatePresence>
            {isQRCodeModalOpen && (
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">设施二维码</h3>
                    <button 
                      onClick={() => setIsQRCodeModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  
                  <div className="flex flex-col items-center py-6">
                    {/* 查找当前设施信息 */}
                    {(() => {
                      const facility = facilities.find(f => f.id === currentFacilityId);
                      if (facility) {
                        // 二维码内容：公开访问URL，微信扫码可访问
                        const baseUrl = typeof window !== 'undefined' 
                          ? `${window.location.protocol}//${window.location.host}`
                          : '';
                        const qrData = `${baseUrl}/inspect/${facility.code}`;
                        
                        return (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
                              微信扫码可查看设施信息并点检
                            </p>
                            
                            {/* 二维码容器 - 带标签 */}
                            <div 
                              ref={qrCodeRef}
                              className="bg-white rounded-xl overflow-hidden shadow-lg mb-4"
                            >
                              {/* 二维码主体 */}
                              <div className="p-4">
                                <QRCodeSVG 
                                  value={qrData}
                                  size={200}
                                  level="H"  // 高容错率
                                  bgColor="#ffffff"
                                  fgColor="#000000"
                                  includeMargin={true}
                                />
                              </div>
                              
                              {/* 底部标签 */}
                              <div className="bg-blue-600 text-white py-2 px-4 text-center">
                                <p className="font-bold text-lg">{facility.code}</p>
                                <p className="text-sm text-blue-100">{facility.type}</p>
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 text-center break-all max-w-xs">
                              {qrData}
                            </p>
                            
                            <div className="flex gap-3">
                              <button 
                                onClick={handleDownloadQRCode}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition duration-300 flex items-center"
                              >
                                <i className="fa-solid fa-download mr-2"></i> 下载二维码
                              </button>
                              <button 
                                onClick={() => setIsQRCodeModalOpen(false)}
                                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-5 rounded-lg transition duration-300"
                              >
                                关闭
                              </button>
                            </div>
                          </>
                        );
                      } else {
                        return (
                          <div className="text-gray-600 dark:text-gray-300 py-8">
                            未找到设施信息
                          </div>
                        );
                      }
                    })()}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </AdminLayout>
  );
}