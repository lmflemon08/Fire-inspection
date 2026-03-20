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
  
  // Excel导入相关状态
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<Partial<FireFacility>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 消防设施类型选项
  const facilityTypes = ['干粉灭火器', '二氧化碳灭火器', '消火栓', '泡沫灭火器', '水型灭火器', '其他'];
  
  // 巡检周期选项
  const inspectionCycleOptions: { value: InspectionCycle; label: string }[] = [
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
    { value: 'quarterly', label: '每季度' },
    { value: 'yearly', label: '每年' }
  ];
  
  // 表单状态类型
  type FormData = {
    code: string;
    type: string;
    model: string;
    specification: string;
    location: string;
    status: 'pending' | 'normal' | 'abnormal';
    inspectionCycle: InspectionCycle;
    lastInspectionDate: string;
    nextInspectionDate: string;
  };
  
  // 表单状态
  const [formData, setFormData] = useState<FormData>({
    code: '',
    type: '',
    model: '',
    specification: '',
    location: '',
    status: 'pending',
    inspectionCycle: 'monthly',
    lastInspectionDate: '',
    nextInspectionDate: ''
  });

  // 过滤消防设施
  const filteredFacilities = facilities.filter(facility => 
    facility.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    facility.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setFormData(prev => ({ ...prev, [name]: value }));
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
    
    await addFacilities([newFacility]);
    setIsAddModalOpen(false);
    setFormData({
      code: '',
      type: '',
      model: '',
      specification: '',
      location: '',
      status: 'pending' as const,
      inspectionCycle: 'monthly' as InspectionCycle,
      lastInspectionDate: '',
      nextInspectionDate: ''
    });
    
    toast.success('消防设施添加成功');
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
      nextInspectionDate: facility.nextInspectionDate || ''
    });
    setIsEditModalOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingExtinguisher) return;
    
    await updateFacility(editingExtinguisher.id, formData);
    
    setIsEditModalOpen(false);
    setEditingExtinguisher(null);
    setFormData({
      code: '',
      type: '',
      model: '',
      specification: '',
      location: '',
      status: 'pending' as const,
      inspectionCycle: 'monthly' as InspectionCycle,
      lastInspectionDate: '',
      nextInspectionDate: ''
    });
    
    toast.success('消防设施信息更新成功');
  };

  // 删除消防设施
  const handleDeleteFacility = async (facilityId: string) => {
    if (window.confirm('确定要删除此消防设施吗？删除后将无法恢复。')) {
      await deleteFacility(facilityId);
      toast.success('消防设施已删除');
    }
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

        // 验证并转换数据
        const formattedData: Partial<FireFacility>[] = data.map((row, index) => {
          return {
            id: `import-${Date.now()}-${index}`,
            code: String(row['编号'] || row['code'] || ''),
            type: String(row['类型'] || row['type'] || ''),
            model: String(row['型号'] || row['model'] || ''),
            specification: String(row['规格'] || row['specification'] || ''),
            location: String(row['放置点位'] || row['location'] || ''),
            status: 'pending' as const
          };
        });

        // 过滤掉空行
        const validData = formattedData.filter(item => item.code && item.type);
        
        if (validData.length === 0) {
          toast.error('未找到有效数据，请检查Excel格式');
          return;
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
    const newFacilities: FireFacility[] = importData.map((item, index) => ({
      id: `import-${Date.now()}-${index}`,
      code: item.code || generateNewCode(),
      type: item.type || '',
      model: item.model || '',
      specification: item.specification || '',
      location: item.location || '',
      status: 'pending' as const,
      inspectionCycle: 'monthly' as InspectionCycle,
      nextInspectionDate: calculateNextInspectionDate('monthly')
    }));

    await addFacilities(newFacilities);
    setIsImportModalOpen(false);
    setImportData([]);
    toast.success(`成功导入 ${newFacilities.length} 条消防设施数据`);
  };

  // 下载Excel模板
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '编号': 'MHQ001',
        '类型': '干粉灭火器',
        '型号': 'MFZ/ABC4',
        '规格': '4kg',
        '放置点位': '大门口'
      },
      {
        '编号': 'MHQ002',
        '类型': '二氧化碳灭火器',
        '型号': 'MT3',
        '规格': '3kg',
        '放置点位': '会议室'
      },
      {
        '编号': 'MHQ003',
        '类型': '消火栓',
        '型号': 'SS100/65-1.6',
        '规格': 'DN100',
        '放置点位': '走廊'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '消防设施导入模板');

    // 设置列宽
    ws['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 20 }
    ];

    XLSX.writeFile(wb, '消防设施导入模板.xlsx');
    toast.success('模板下载成功');
  };

  // 删除导入预览中的某一行
  const handleRemoveImportRow = (index: number) => {
    setImportData(prev => prev.filter((_, i) => i !== index));
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
           </motion.div>

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
                     {filteredFacilities.map((facility) => (
                       <motion.tr 
                         key={facility.id}
                         className="hover:bg-gray-50 transition-colors"
                         variants={itemVariants}
                         initial="hidden"
                         animate="visible"
                         exit={{ opacity: 0, height: 0 }}
                         transition={{ duration: 0.3 }}
                       >
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
                                : 'text-yellow-800'
                            }`}
                            style={{ backgroundColor: facility.status === 'normal' ? '#F6FFED' : facility.status === 'abnormal' ? '#FFF1F0' : '#FFFBE6' }}
                            >
                              {facility.status === 'normal' && <i className="fa-solid fa-check-circle mr-1"></i>}
                              {facility.status === 'abnormal' && <i className="fa-solid fa-exclamation-circle mr-1"></i>}
                              {facility.status === 'pending' && <i className="fa-solid fa-clock mr-1"></i>}
                              {facility.status === 'normal' ? '正常' : facility.status === 'abnormal' ? '异常' : '待检'}
                            </span>
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