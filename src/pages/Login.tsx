import { useContext, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext, UserInfo } from '@/contexts/authContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// 本地存储键名
const REMEMBER_KEY = 'rememberedLogin';

export default function Login() {
  const { setIsAuthenticated, setUserInfo } = useContext(AuthContext);
  const { users } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [rememberMe, setRememberMe] = useState(false);

  // 组件加载时，读取保存的登录信息
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      try {
        const { username: savedUsername, password: savedPassword, role: savedRole, rememberMe: savedRemember } = JSON.parse(saved);
        if (savedRemember) {
          setUsername(savedUsername || '');
          setPassword(savedPassword || '');
          setRole(savedRole || 'user');
          setRememberMe(true);
        }
      } catch {
        // 解析失败，忽略
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 模拟登录延迟
    setTimeout(() => {
      // 从数据上下文查找匹配的用户
      const foundUser = users.find(
        u => u.username === username && u.password === password && u.role === role && u.status === 'active'
      );

      if (foundUser) {
        // 登录成功，构建用户信息（不包含密码）
        const userInfo: UserInfo = {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
          name: foundUser.name,
          department: foundUser.department,
        };
        
        setIsAuthenticated(true);
        setUserInfo(userInfo);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        // 处理记住密码
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({
            username,
            password,
            role,
            rememberMe: true
          }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        
        toast.success(`欢迎登录，${userInfo.name || userInfo.username}！`);
        
        // 优先跳转到 redirect 指定的页面
        if (redirectUrl) {
          navigate(redirectUrl);
        } else if (userInfo.role === 'admin') {
          // 根据角色跳转到不同页面
          navigate('/admin');
        } else {
          navigate('/user');
        }
      } else {
        // 登录失败
        toast.error('用户名、密码或角色不正确，或账号已禁用');
      }
      
      setIsLoading(false);
    }, 1000);
  };

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div variants={itemVariants} className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <i className="fa-solid fa-fire-extinguisher text-blue-600 dark:text-blue-300 text-3xl"></i>
            </div>
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
            消防设施巡检系统
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            请登录您的账号以继续
          </p>
        </motion.div>

        <motion.form 
          className="mt-8 space-y-6" 
          onSubmit={handleSubmit}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <input type="hidden" name="remember" defaultValue="true" />
          
          <motion.div variants={itemVariants} className="rounded-md -space-y-px">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div className="mt-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                登录角色
              </label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === 'user'}
                    onChange={() => setRole('user')}
                    className="form-radio text-blue-600 dark:text-blue-400"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">巡检员</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="form-radio text-blue-600 dark:text-blue-400"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">管理员</span>
                </label>
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                记住密码
              </label>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  登录中...
                </div>
              ) : (
                <div className="flex items-center">
                  <i className="fa-solid fa-right-to-bracket mr-2"></i>
                  登录
                </div>
              )}
            </button>
          </motion.div>
          
          <motion.div variants={itemVariants} className="text-center text-sm mt-4">
            <p className="text-gray-600 dark:text-gray-300">
              提示：管理员账号 <span className="font-medium text-blue-600">admin/admin123</span>，巡检员账号 <span className="font-medium text-blue-600">inspector/inspector123</span>
            </p>
          </motion.div>
        </motion.form>
      </motion.div>
    </div>
  );
}