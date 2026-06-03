import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel?: () => void;
  onScanError?: (error: string) => void;
}

export function QRCodeScanner({ onScanSuccess, onCancel, onScanError }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode('qr-reader');
        
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // 扫描成功
            stopScanner();
            onScanSuccess(decodedText);
          },
          () => {
            // 扫描失败，忽略
          }
        );
        
        setIsScanning(true);
        setCameraError(null);
      } catch (err: unknown) {
        console.error('Camera access error:', err);
        const errorMsg = '无法访问摄像头，请检查权限设置';
        setCameraError(errorMsg);
        setIsScanning(false);
        toast.error(errorMsg);
        onScanError?.(errorMsg);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [onScanSuccess]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleCancel = async () => {
    await stopScanner();
    onCancel?.();
  };

  // 手动输入功能
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/50">
          <button 
            onClick={handleCancel}
            className="p-2 text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </button>
          <h2 className="text-white font-medium">扫描二维码</h2>
          <button 
            onClick={() => setShowManualInput(!showManualInput)}
            className="p-2 text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <i className="fa-solid fa-keyboard text-xl"></i>
          </button>
        </div>

        {/* 扫描区域 */}
        <div className="flex-1 relative flex items-center justify-center">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center text-white px-8">
              <i className="fa-solid fa-camera-slash text-5xl mb-4 text-red-500"></i>
              <p className="text-lg font-medium mb-2">无法访问摄像头</p>
              <p className="text-sm text-gray-300 text-center mb-4">{cameraError}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  重试
                </button>
                <button 
                  onClick={() => setShowManualInput(true)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  手动输入
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 扫描框覆盖层 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 relative">
                  {/* 扫描框角标 */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                  
                  {/* 扫描线动画 */}
                  {isScanning && (
                    <motion.div 
                      className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                      animate={{ 
                        top: ['0%', '100%', '0%'],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 摄像头容器 */}
              <div 
                id="qr-reader" 
                ref={containerRef}
                className="w-full h-full"
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
            </>
          )}
        </div>

        {/* 手动输入弹窗 */}
        <AnimatePresence>
          {showManualInput && (
            <motion.div 
              className="absolute inset-0 bg-black/80 flex items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualInput(false)}
            >
              <motion.div 
                className="w-full bg-white dark:bg-gray-800 rounded-t-3xl p-6"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">手动输入设施编号</h3>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="请输入设施编号（如：MHQ008）"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowManualInput(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleManualSubmit}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium"
                  >
                    确认
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部提示 */}
        {!cameraError && (
          <div className="px-4 py-6 text-center">
            <p className="text-white font-medium mb-1">将二维码对准扫描框</p>
            <p className="text-gray-300 text-sm">或点击右上角键盘图标手动输入</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
