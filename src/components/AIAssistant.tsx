import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// 聊天消息类型定义
interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    const messageLower = userMessage.toLowerCase();
    
    if (messageLower.includes('添加') && messageLower.includes('设施')) {
      return `添加新的消防设施非常简单，您可以按照以下步骤操作：

1. 在左侧菜单中点击"消防设施管理"
2. 点击页面上方的"新增消防设施"按钮
3. 填写设施编号、类型、型号、规格、放置点位等信息
4. 点击"新增消防设施"按钮完成操作

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
3. 点击设施右侧操作栏中的"查看"按钮
4. 系统会显示该设施的唯一二维码，可下载打印

每个设施的二维码都是唯一的，巡检员扫描后可以快速定位到该设施并进行检查，有效防止弄虚作假。`;
    }
    
    if (messageLower.includes('查看') && messageLower.includes('统计')) {
      return `查看巡检统计数据的方法：

1. 在左侧菜单中点击"管理仪表盘"
2. 在仪表盘页面您可以看到：
   - 设施总数、正常、异常、待检等关键指标
   - 状态分布图表
   - 快捷操作入口

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
  
  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
    setTimeout(() => {
      const form = document.getElementById('chat-form-assistant') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 100);
  };

  // 动画变体
  const messageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.button
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.i 
              key="close"
              className="fa-solid fa-times text-xl"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          ) : (
            <motion.i 
              key="robot"
              className="fa-solid fa-robot text-xl"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* 聊天窗口 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* 聊天头部 */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-2">
                  <i className="fa-solid fa-robot text-white text-sm"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">智能助手</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">随时为您提供帮助</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            {/* 常见问题 */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">快捷问题</h4>
              <div className="flex flex-wrap gap-1.5">
                {commonQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendCommonQuestion(question)}
                    className="text-xs px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 rounded-full transition duration-200 border border-gray-200 dark:border-gray-600"
                  >
                    {question.replace('如何', '').replace('？', '')}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 聊天内容 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/30">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div 
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-3`}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                  >
                    {!message.isUser && (
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <i className="fa-solid fa-robot text-white text-xs"></i>
                      </div>
                    )}
                    
                    <div className={`max-w-[75%] ${message.isUser ? 'order-1' : 'order-2'}`}>
                      <div className={`p-2.5 rounded-lg text-sm ${
                        message.isUser 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-bl-none shadow-sm'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      <div className={`text-xs mt-1 text-gray-400 dark:text-gray-500 ${
                        message.isUser ? 'text-right' : 'text-left'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {message.isUser && (
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                        <i className="fa-solid fa-user text-white text-xs"></i>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {/* 正在输入提示 */}
                {isTyping && (
                  <motion.div 
                    className="flex justify-start mb-3"
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <i className="fa-solid fa-robot text-white text-xs"></i>
                    </div>
                    <div className="max-w-[75%]">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm rounded-bl-none">
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
              <div ref={messagesEndRef} />
            </div>
            
            {/* 输入框 */}
            <form id="chat-form-assistant" onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="请输入您的问题..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={isTyping}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition duration-300 flex items-center justify-center min-w-[40px]"
                >
                  {isTyping ? (
                    <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                  ) : (
                    <i className="fa-solid fa-paper-plane text-sm"></i>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
