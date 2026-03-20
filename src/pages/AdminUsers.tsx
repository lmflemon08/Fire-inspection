import React from 'react';
import { useState, useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { useData, SystemUser } from '@/contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';

export default function AdminUsers() {
  const { logout } = useContext(AuthContext);
  const { users, addUser, updateUser, deleteUser } = useData();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    name: '',
    department: '',
    status: 'active' as 'active' | 'inactive'
  });

  // 过滤用户
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理表单变化
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 添加用户
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newUser: SystemUser = {
      ...formData,
      id: Date.now().toString(),
    };
    
    if (!addUser(newUser)) {
      toast.error('用户名已存在');
      return;
    }
    
    setIsAddModalOpen(false);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      name: '',
      department: '',
      status: 'active'
    });
    
    toast.success('用户添加成功');
  };

  // 编辑用户
  const handleEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setFormData(user);
    setIsEditModalOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    // 检查用户名是否已被其他用户使用
    if (users.some(user => user.username === formData.username && user.id !== editingUser.id)) {
      toast.error('用户名已存在');
      return;
    }
    
    updateUser(editingUser.id, formData);
    
    setIsEditModalOpen(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      name: '',
      department: '',
      status: 'active'
    });
    
    toast.success('用户信息更新成功');
  };

  // 删除用户
  const handleDeleteUser = (userId: string) => {
    // 不允许删除唯一的管理员账号
    const adminCount = users.filter(user => user.role === 'admin').length;
    const userToDelete = users.find(user => user.id === userId);
    
    if (userToDelete && userToDelete.role === 'admin' && adminCount <= 1) {
      toast.error('至少需要保留一个管理员账号');
      return;
    }
    
    if (window.confirm('确定要删除此用户吗？')) {
      deleteUser(userId);
      toast.success('用户已删除');
    }
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
      <Sidebar activeMenu="users" />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">管理系统用户、角色和权限</p>
          </motion.div>

          {/* 操作栏 */}
          <motion.div 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative w-full sm:w-64"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fa-solid fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="搜索用户..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300"
            >
              <i className="fa-solid fa-user-plus mr-2"></i>
              添加用户
            </button>
          </motion.div>

          {/* 用户列表 */}
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">用户名</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">姓名</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">部门</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">角色</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <AnimatePresence>
                    {filteredUsers.map((user) => (
                      <motion.tr 
                        key={user.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {user.role === 'admin' ? '管理员' : '巡检员'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {user.status === 'active' ? '活跃' : '禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <i className="fa-solid fa-pen-to-square mr-1"></i> 编辑
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
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
            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <i className="fa-solid fa-user-slash text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">没有找到匹配的用户</p>
              </div>
            )}
          </motion.div>

          {/* 添加用户模态框 */}
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">添加新用户</h3>
                    <button 
                      onClick={() => setIsAddModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        用户名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入用户名"
                        value={formData.username}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        密码 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入密码"
                        value={formData.password}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        姓名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入姓名"
                        value={formData.name}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        部门 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="department"
                        name="department"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入部门"
                        value={formData.department}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        角色 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="role"
                        name="role"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.role}
                        onChange={handleFormChange}
                      >
                        <option value="user">巡检员</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        状态 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="status"
                        name="status"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        <option value="active">活跃</option>
                        <option value="inactive">禁用</option>
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
                        添加用户
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 编辑用户模态框 */}
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">编辑用户</h3>
                    <button 
                      onClick={() => setIsEditModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        用户名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入用户名"
                        value={formData.username}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        密码 (留空表示不修改)
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入新密码"
                        value={formData.password}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        姓名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入姓名"
                        value={formData.name}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        部门 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="department"
                        name="department"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入部门"
                        value={formData.department}
                        onChange={handleFormChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        角色 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="role"
                        name="role"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.role}
                        onChange={handleFormChange}
                      >
                        <option value="user">巡检员</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        状态 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="status"
                        name="status"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        <option value="active">活跃</option>
                        <option value="inactive">禁用</option>
                      </select>
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