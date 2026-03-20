import { useState, useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData, CheckForm, CheckItem } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';

export default function AdminForms() {
  const { logout } = useContext(AuthContext);
  const { checkForms, setCheckForms, addCheckForm, updateCheckForm, deleteCheckForm } = useData();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CheckForm | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 设施类型选项（与消防设施管理界面保持一致）
  const facilityTypes = ['干粉灭火器', '二氧化碳灭火器', '消火栓', '泡沫灭火器', '水型灭火器', '其他'];
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    facilityType: '',
    items: [] as CheckItem[]
  });
  
  // 临时表单项目状态（用于添加/编辑）
  const [tempItems, setTempItems] = useState<CheckItem[]>([]);
  
  // 过滤表单
  const filteredForms = checkForms.filter(form => 
    form.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    form.facilityType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理表单基本信息变化
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 添加检查项
  const addCheckItem = () => {
    const newItem: CheckItem = {
      id: Date.now().toString(),
      question: '',
      type: 'checkbox',
      options: [],
      required: true
    };
    setTempItems(prev => [...prev, newItem]);
  };

  // 更新检查项
  const updateCheckItem = (index: number, field: keyof CheckItem, value: any) => {
    const updatedItems = [...tempItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // 如果类型改变，清除不相关的选项
    if (field === 'type') {
      if (value === 'text' || value === 'number') {
        updatedItems[index].options = undefined;
      } else if (!updatedItems[index].options) {
        updatedItems[index].options = [];
      }
    }
    
    setTempItems(updatedItems);
  };

  // 添加选项到检查项
  const addOptionToItem = (index: number) => {
    const updatedItems = [...tempItems];
    if (!updatedItems[index].options) {
      updatedItems[index].options = [];
    }
    updatedItems[index].options.push('');
    setTempItems(updatedItems);
  };

  // 更新选项值
  const updateOption = (itemIndex: number, optionIndex: number, value: string) => {
    const updatedItems = [...tempItems];
    if (updatedItems[itemIndex].options) {
      updatedItems[itemIndex].options[optionIndex] = value;
    }
    setTempItems(updatedItems);
  };

  // 删除选项
  const removeOption = (itemIndex: number, optionIndex: number) => {
    const updatedItems = [...tempItems];
    if (updatedItems[itemIndex].options) {
      updatedItems[itemIndex].options.splice(optionIndex, 1);
    }
    setTempItems(updatedItems);
  };

  // 删除检查项
  const removeCheckItem = (index: number) => {
    const updatedItems = [...tempItems];
    updatedItems.splice(index, 1);
    setTempItems(updatedItems);
  };

  // AI生成表单
  const generateFormByAI = () => {
    if (!formData.facilityType) {
      toast.error('请先选择设施类型');
      return;
    }
    
    // 模拟AI生成过程
    setIsAddModalOpen(true);
    
    // 这里模拟AI生成的表单内容
    // 在实际应用中，这里会调用AI API生成表单
    setTimeout(() => {
      const aiGeneratedItems: CheckItem[] = [];
      
      // 根据不同设施类型生成不同的检查项
      switch (formData.facilityType) {
        case '干粉灭火器':
        case '二氧化碳灭火器':
        case '泡沫灭火器':
        case '水型灭火器':
          aiGeneratedItems.push(
            {
              id: Date.now().toString() + '-1',
              question: '灭火器是否在指定位置？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-2',
              question: '灭火器铅封是否完好？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-3',
              question: '灭火器压力指示器是否在绿色区域？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-4',
              question: '灭火器是否有腐蚀、泄漏现象？',
              type: 'radio',
              options: ['无', '轻微', '严重'],
              required: true
            },
            {
              id: Date.now().toString() + '-5',
              question: '备注',
              type: 'text',
              required: false
            }
          );
          break;
        
        case '消火栓':
          aiGeneratedItems.push(
            {
              id: Date.now().toString() + '-1',
              question: '消防栓箱是否完好、清洁？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-2',
              question: '消防水带是否干燥、无破损？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-3',
              question: '消防水枪是否完好？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-4',
              question: '阀门是否灵活，无渗漏？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-5',
              question: '水压测试结果(MPa)',
              type: 'number',
              required: true
            }
          );
          break;
        
        default:
          // 其他设施类型的通用检查项
          aiGeneratedItems.push(
            {
              id: Date.now().toString() + '-1',
              question: '设施是否在指定位置？',
              type: 'radio',
              options: ['是', '否'],
              required: true
            },
            {
              id: Date.now().toString() + '-2',
              question: '设施外观是否完好？',
              type: 'checkbox',
              options: ['无损坏', '无锈蚀', '无变形'],
              required: true
            },
            {
              id: Date.now().toString() + '-3',
              question: '设施运行是否正常？',
              type: 'radio',
              options: ['正常', '异常'],
              required: true
            },
            {
              id: Date.now().toString() + '-4',
              question: '检查备注',
              type: 'text',
              required: false
            }
          );
      }
      
      setTempItems(aiGeneratedItems);
      setFormData(prev => ({ 
        ...prev, 
        name: `${formData.facilityType}检查表单（AI生成）`,
        items: aiGeneratedItems
      }));
      
      toast.success(`已为${formData.facilityType}生成检查表单`);
    }, 1000);
  };

  // 添加表单
  const handleAddForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单数据
    if (!formData.name || !formData.facilityType || tempItems.length === 0) {
      toast.error('请填写完整的表单信息');
      return;
    }
    
    const newForm: CheckForm = {
      id: Date.now().toString(),
      name: formData.name,
      facilityType: formData.facilityType,
      items: tempItems,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    
    addCheckForm(newForm);
    setIsAddModalOpen(false);
    resetFormState();
    
    toast.success('检查表单添加成功');
  };

  // 编辑表单
  const handleEditForm = (form: CheckForm) => {
    setEditingForm(form);
    setFormData({
      name: form.name,
      facilityType: form.facilityType,
      items: form.items
    });
    setTempItems([...form.items]);
    setIsEditModalOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingForm) return;
    
    // 验证表单数据
    if (!formData.name || !formData.facilityType || tempItems.length === 0) {
      toast.error('请填写完整的表单信息');
      return;
    }
    
    updateCheckForm(editingForm.id, {
      name: formData.name,
      facilityType: formData.facilityType,
      items: tempItems,
      updatedAt: new Date().toISOString().split('T')[0]
    });
    
    setIsEditModalOpen(false);
    setEditingForm(null);
    resetFormState();
    
    toast.success('检查表单更新成功');
  };

  // 删除表单
  const handleDeleteForm = (formId: string) => {
    if (window.confirm('确定要删除此检查表单吗？删除后将无法恢复。')) {
      deleteCheckForm(formId);
      toast.success('检查表单已删除');
    }
  };

  // 重置表单状态
  const resetFormState = () => {
    setFormData({
      name: '',
      facilityType: '',
      items: []
    });
    setTempItems([]);
  };

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex">
      {/* 侧边栏 */}
      <Sidebar activeMenu="forms" />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"><div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <i className="fa-solid fa-fire-extinguisher text-red-500 text-xl mr-2"></i>
                  <span className="font-bold text-lg">消防巡检系统 - 管理后台</span>
                </div>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition duration-300 flex items-center"
                >
                  <i className="fa-solid fa-right-from-bracket mr-1"></i> 退出
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* 主要内容 */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">检查表单管理</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">配置和管理各种消防设施的检查表单</p>
          </motion.div>

          {/* 操作栏 */}
          <motion.div 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fa-solid fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="搜索表单..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <select
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.facilityType}
                  onChange={handleFormChange}
                  name="facilityType"
                >
                  <option value="">选择设施类型</option>
                  {facilityTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={generateFormByAI}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition duration-300"
              >
                <i className="fa-solid fa-robot mr-2"></i>
                AI生成表单
              </button>
              
              <button 
                onClick={() => {
                  setFormData({ name: '', facilityType: '', items: [] });
                  setTempItems([]);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300"
              >
                <i className="fa-solid fa-plus mr-2"></i>
                手动添加
              </button>
            </div>
          </motion.div>

          {/* 表单列表 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">表单名称</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">适用设施类型</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">检查项数量</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">创建日期</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">更新日期</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <AnimatePresence>
                    {filteredForms.map((form) => (
                      <motion.tr 
                        key={form.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{form.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{form.facilityType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{form.items.length}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{form.createdAt}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{form.updatedAt}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleEditForm(form)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <i className="fa-solid fa-pen-to-square mr-1"></i> 编辑
                          </button>
                          <button 
                            onClick={() => handleDeleteForm(form.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <i className="fa-solid fa-trash-can mr-1"></i> 删除
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {/* 空状态 */}
            {filteredForms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <i className="fa-solid fa-list-check text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">没有找到匹配的检查表单</p>
              </div>
            )}
          </motion.div>

          {/* 添加/编辑表单模态框 */}
          <AnimatePresence>
            {(isAddModalOpen || isEditModalOpen) && (
              <motion.div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
                  variants={modalVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {isAddModalOpen ? '添加检查表单' : '编辑检查表单'}
                    </h3>
                    <button 
                      onClick={() => {
                        isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                        if (isEditModalOpen) {
                          setEditingForm(null);
                        }
                        resetFormState();
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  
                  <form onSubmit={isAddModalOpen ? handleAddForm : handleSaveEdit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        表单名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入表单名称"
                        value={formData.name}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="facilityType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        适用设施类型 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="facilityType"
                        name="facilityType"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.facilityType}
                        onChange={handleFormChange}
                      >
                        <option value="">请选择设施类型</option>
                        {facilityTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">检查项</h4>
                        <button 
                          type="button"
                          onClick={addCheckItem}
                          className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-300 flex items-center"
                        >
                          <i className="fa-solid fa-plus mr-1"></i> 添加检查项
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {tempItems.map((item, index) => (
                          <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex justify-between items-start mb-3">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                检查项 {index + 1}
                              </label>
                              <button 
                                type="button"
                                onClick={() => removeCheckItem(index)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <input
                                  type="text"
                                  placeholder="请输入检查问题"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  value={item.question}
                                  onChange={(e) => updateCheckItem(index, 'question', e.target.value)}
                                  required
                                />
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    输入类型
                                  </label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    value={item.type}
                                    onChange={(e) => updateCheckItem(index, 'type', e.target.value)}
                                  >
                                    <option value="checkbox">多选框</option>
                                    <option value="radio">单选框</option>
                                    <option value="text">文本</option>
                                    <option value="number">数字</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    是否必填
                                  </label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    value={item.required}
                                    onChange={(e) => updateCheckItem(index, 'required', e.target.value === 'true')}
                                  >
                                    <option value="true">是</option>
                                    <option value="false">否</option>
                                  </select>
                                </div>
                              </div>
                              
                              {(item.type === 'checkbox' || item.type === 'radio') && (
                                <div>
                                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    选项（至少添加2个选项）
                                  </label>
                                  <div className="space-y-2">
                                    {item.options && item.options.map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          placeholder={`选项 ${optionIndex + 1}`}
                                          className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          value={option}
                                          onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                        />
                                        {item.options.length > 2 && (
                                          <button 
                                            type="button"
                                            onClick={() => removeOption(index, optionIndex)}
                                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                                          >
                                            <i className="fa-solid fa-times"></i>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    <button 
                                      type="button"
                                      onClick={() => addOptionToItem(index)}
                                      className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg transition duration-300 flex items-center mt-1"
                                    >
                                      <i className="fa-solid fa-plus mr-1"></i> 添加选项
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => {
                          isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                          if (isEditModalOpen) {
                            setEditingForm(null);
                          }
                          resetFormState();
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-300"
                      >
                        取消
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300"
                      >
                        {isAddModalOpen ? '添加表单' : '保存修改'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 页脚 */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              © 2026 消防设施巡检系统 版权所有
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}