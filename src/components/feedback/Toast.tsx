import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '@/lib/cn';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type ToastFn = {
  (options: string | Omit<ToastMessage, 'id'>): void;
  success: (title: string, description?: string, action?: { label: string; onClick: () => void }) => void;
  error: (title: string | Error, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string, action?: { label: string; onClick: () => void }) => void;
};

export interface ToastContextType {
  toast: ToastFn;
  success: (title: string, description?: string, action?: { label: string; onClick: () => void }) => void;
  error: (title: string | Error, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string, action?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const rawToast = useCallback(
    ({ title, description, type = 'info', duration = 4500, action }: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, type, duration, action }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string, action?: { label: string; onClick: () => void }) =>
      rawToast({ title: title || 'Success', description, type: 'success', action }),
    [rawToast]
  );

  const error = useCallback(
    (title: string | Error, description?: string) => {
      if (title instanceof Error) {
        rawToast({
          title: title.name || 'Error',
          description: title.message || 'Something went wrong.',
          type: 'error',
        });
      } else {
        rawToast({ title: title || 'Error', description, type: 'error' });
      }
    },
    [rawToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => rawToast({ title: title || 'Warning', description, type: 'warning' }),
    [rawToast]
  );

  const info = useCallback(
    (title: string, description?: string, action?: { label: string; onClick: () => void }) =>
      rawToast({ title: title || 'Info', description, type: 'info', action }),
    [rawToast]
  );

  const toastFn: any = useCallback(
    (input: string | Omit<ToastMessage, 'id'>) => {
      if (typeof input === 'string') {
        rawToast({ title: input });
      } else {
        rawToast(input);
      }
    },
    [rawToast]
  );

  toastFn.success = success;
  toastFn.error = error;
  toastFn.warning = warning;
  toastFn.info = info;

  const contextValue = useMemo<ToastContextType>(
    () => ({
      toast: toastFn,
      success,
      error,
      warning,
      info,
    }),
    [toastFn, success, error, warning, info]
  );

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
  };

  const borders = {
    success: 'border-l-4 border-l-emerald-500 border-border bg-surface',
    error: 'border-l-4 border-l-rose-500 border-border bg-surface',
    warning: 'border-l-4 border-l-amber-500 border-border bg-surface',
    info: 'border-l-4 border-l-blue-500 border-border bg-surface',
  };

  const portalContent = mounted && typeof document !== 'undefined'
    ? ReactDOM.createPortal(
        <div
          aria-live="polite"
          className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-3.5 rounded-card border shadow-2xl transition-all duration-200 animate-in slide-in-from-top-3 fade-in-0',
                borders[t.type || 'info']
              )}
            >
              <div className="mt-0.5 shrink-0">{icons[t.type || 'info']}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-text leading-tight">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-text-muted mt-1 leading-relaxed break-words">{t.description}</p>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      removeToast(t.id);
                    }}
                    className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700 underline focus:outline-none"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-text-muted hover:text-text p-1 rounded-control transition-colors -mr-1 -mt-1"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {portalContent}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
