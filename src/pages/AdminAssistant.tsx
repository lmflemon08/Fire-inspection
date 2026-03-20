import React from 'react';
import { useState, useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';

// 聊天消息类型定义
interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function AdminAssistant() {
  const { logout } = useContext(AuthContext);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      content: '您好！我是消防巡检系统的AI助手。请问有什么可以帮助您的？',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 预设的常见问题
  const commonQuestions = [
    '如何添加新的消防设施？',
    '如何创建检查表单？',
    '如何管理系统用户？',
    '如何生成设施的二维码？',
    '如何查看巡检统计数据？'
  ];
  
  // 模拟AI回复
  const getAIResponse = (userMessage: string): string => {
    // 将用户消息转换为小写进行匹配
    const messageLower = userMessage.toLowerCase();
    
    // 根据关键词给出不同的回复
    if (messageLower.includes('添加') && messageLower.includes('设施')) {
      return `添加新的消防设施非常简单，您可以按照以下步骤操作：
1. 在左侧菜单中点击"消防设施管理"
2. 点击页面上方的"添加设施"按钮
3. 填写设施名称、类型、位置等信息
4. 点击"添加设施"按钮完成操作

系统会自动为新添加的设施生成唯一的二维码，用于巡检员扫码签到。`;
    }
    
    if (messageLower.includes('创建') && messageLower.includes('表单')) {
      return `您有两种方式创建检查表单：
1. AI自动生成（推荐）：
   - 选择设施类型
   - 点击"AI生成表单"按钮
   - 系统会根据设施类型自动生成适合的检查项

2. 手动创建：
   - 点击"手动添加"按钮
   - 填写表单名称和适用的设施类型
   - 添加所需的检查项，设置检查项类型和是否必填
   - 点击"添加表单"按钮完成创建`;
    }
    
    if (messageLower.includes('管理') && messageLower.includes('用户')) {
      return `管理系统用户的步骤如下：
1. 在左侧菜单中点击"用户管理"
2. 您可以看到所有系统用户的列表
3. 点击"添加用户"按钮可以创建新用户
4. 点击用户旁边的"编辑"按钮可以修改用户信息
5. 点击"删除"按钮可以删除用户（至少保留一个管理员账号）

注意：管理员账号可以访问所有功能，巡检员账号只能进行设施巡检操作。`;
    }
    
    if (messageLower.includes('生成') && messageLower.includes('二维码')) {
      return `为消防设施生成二维码的方法：
1. 在左侧菜单中点击"消防设施管理"
2. 找到需要生成二维码的设施
3. 点击设施右侧操作栏中的"二维码"按钮
4. 系统会生成该设施的唯一二维码

每个设施的二维码都是唯一的，巡检员扫描后可以快速定位到该设施并进行检查，有效防止弄虚作假。`;
    }
    
    if (messageLower.includes('查看') && messageLower.includes('统计')) {
      return `查看巡检统计数据的方法：
1. 在左侧菜单中点击"管理仪表盘"
2. 在仪表盘页面您可以看到：
   - 总用户数、消防设施数等关键指标
   - 最近7天的巡检趋势图表
   - 系统整体运行状态

通过这些统计数据，您可以全面了解系统的使用情况和巡检工作的进展。`;
    }
    
    // 默认回复
    return `感谢您的提问！以下是系统的主要功能和使用方法：

1. 用户管理：添加、编辑、删除系统用户，分配不同角色权限
2. 设施管理：录入和管理所有消防设施信息，生成唯一二维码
3. 表单管理：配置各种消防设施的检查表单，可以手动创建或AI自动生成
4. 数据统计：查看巡检统计数据和趋势图表

如果您有更具体的问题，请详细描述，我会为您提供更准确的帮助。`;
  };
  
  // 发送消息
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) {
      toast.warning('请输入消息内容');
      return;
    }
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      content: inputMessage.trim(),
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    // 模拟AI回复延迟
    setTimeout(() => {
      // 获取AI回复
      const aiResponse: ChatMessage = {
        id: Date.now().toString() + '-ai',
        content: getAIResponse(inputMessage),
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };
  
  // 快速发送常见问题
  const sendCommonQuestion = (question: string) => {
    setInputMessage(question);
    // 触发发送消息
    const event = new Event('submit', { cancelable: true });
    document.getElementById('chat-form')?.dispatchEvent(event);
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
  
  const messageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex">
      {/* 侧边栏 */}
      <Sidebar activeMenu="assistant" />

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI智能助手</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">获取系统使用指导和帮助</p>
          </motion.div>

          {/* 聊天界面 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* 聊天头部 */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                <i className="fa-solid fa-robot text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">智能助手</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">随时为您提供帮助</p>
              </div>
            </div>
            
            {/* 常见问题 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">常见问题</h4>
              <div className="flex flex-wrap gap-2">
                {commonQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendCommonQuestion(question)}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 rounded-full transition duration-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 聊天内容 */}
            <div className="h-[500px] overflow-y-auto p-4" id="chat-container">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div 
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                  >
                    <div className={`max-w-[80%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                      <div className={`p-3 rounded-lg ${
                        message.isUser 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-bl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className={`text-xs mt-1 text-gray-500 dark:text-gray-400 ${
                        message.isUser ? 'text-right' : 'text-left'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {!message.isUser && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-2 order-1">
                        <i className="fa-solid fa-robot text-white text-xs"></i>
                      </div>
                    )}
                    
                    {message.isUser && (
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center ml-2 order-2">
                        <i className="fa-solid fa-user text-white text-xs"></i>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {/* 正在输入提示 */}
                {isTyping && (
                  <motion.div 
                    className="flex justify-start mb-4"
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-2">
                      <i className="fa-solid fa-robot text-white text-xs"></i>
                    </div>
                    <div className="max-w-[80%]">
                      <div className="p-3 rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-bl-none">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* 输入框 */}
            <form id="chat-form" onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="请输入您的问题..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={isTyping}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300 flex items-center justify-center"
                >
                  {isTyping ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-paper-plane"></i>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
          
          {/* 使用提示 */}
          <motion.div 
            className="max-w-3xl mx-auto mt-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-start">
              <i className="fa-solid fa-lightbulb text-yellow-500 mt-0.5 mr-3"></i>
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">使用提示</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  智能助手可以回答关于系统使用的各种问题，帮助您快速掌握系统功能。您可以使用上方的快捷问题按钮，或直接输入您的问题。
                </p>
              </div>
            </div>
          </motion.div>
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