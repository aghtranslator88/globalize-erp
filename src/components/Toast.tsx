import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isRtl?: boolean;
}

interface ToastContextType {
  // Toast notifications
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  
  // Custom confirmation dialog
  confirm: (
    message: string,
    onConfirm: () => void | Promise<void>,
    onCancel?: () => void,
    options?: ConfirmOptions
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    options?: ConfirmOptions;
  } | null>(null);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast(message, 'info', duration);
  }, [addToast]);

  const confirm = useCallback((
    message: string,
    onConfirm: () => void | Promise<void>,
    onCancel?: () => void,
    options?: ConfirmOptions
  ) => {
    setConfirmDialog({
      isOpen: true,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirmDialog(null);
      },
      options
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, confirm }}>
      {children}

      {/* Dynamic Toast Container to hold stacked toasts */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full sm:w-96 text-xs font-sans">
        <AnimatePresence>
          {toasts.map((item) => {
            let icon = <Info className="h-5 w-5 text-blue-500" />;
            let bgClass = 'bg-white border-zinc-200';
            let progressClass = 'bg-blue-550';
            
            if (item.type === 'success') {
              icon = <CheckCircle className="h-5 w-5 text-emerald-500" />;
              bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-990';
              progressClass = 'bg-emerald-500';
            } else if (item.type === 'error') {
              icon = <XCircle className="h-5 w-5 text-rose-500" />;
              bgClass = 'bg-rose-50/95 border-rose-200 text-rose-990';
              progressClass = 'bg-rose-600';
            } else if (item.type === 'warning') {
              icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
              bgClass = 'bg-amber-50 border-amber-200 text-amber-990';
              progressClass = 'bg-amber-500';
            }

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bgClass} relative overflow-hidden`}
              >
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 pr-6 text-zinc-900 font-semibold leading-relaxed">
                  {item.message}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
                
                {/* Auto-dismiss animated progress bar */}
                <ToastProgressBar duration={item.duration || 4000} onComplete={() => removeToast(item.id)} barColor={progressClass} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Interactive Confirmation Modal Override */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-zinc-200 font-sans`}
              dir={confirmDialog.options?.isRtl ? 'rtl' : 'ltr'}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {confirmDialog.options?.isDanger ? (
                    <div className="p-3 bg-red-50 rounded-full text-red-600">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-100 rounded-full text-zinc-600">
                      <Info className="h-6 w-6" />
                    </div>
                  )}
                  
                  <div className="flex-1 mt-1">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                      {confirmDialog.options?.title || (confirmDialog.options?.isRtl ? 'تأكيد العملية' : 'Confirm Action')}
                    </h3>
                    <p className="text-zinc-600 text-xs mt-2 leading-relaxed font-semibold">
                      {confirmDialog.message}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-zinc-50 px-6 py-4 flex gap-3 justify-end border-t border-zinc-110">
                <button
                  type="button"
                  onClick={confirmDialog.onCancel}
                  className="px-4 py-2 bg-white hover:bg-zinc-100 border border-zinc-250 text-zinc-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {confirmDialog.options?.cancelText || (confirmDialog.options?.isRtl ? 'إلغاء' : 'Cancel')}
                </button>
                
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-4 py-2 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer ${
                    confirmDialog.options?.isDanger 
                      ? 'bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200' 
                      : 'bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  {confirmDialog.options?.confirmText || (confirmDialog.options?.isRtl ? 'تأكيد' : 'Confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

// Internal progression bar loader helper
const ToastProgressBar: React.FC<{ duration: number; onComplete: () => void; barColor: string }> = ({
  duration,
  onComplete,
  barColor
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <motion.div
      initial={{ width: '100%' }}
      animate={{ width: 0 }}
      transition={{ duration: duration / 1000, ease: 'linear' }}
      className={`absolute bottom-0 left-0 h-1 ${barColor}`}
    />
  );
};
