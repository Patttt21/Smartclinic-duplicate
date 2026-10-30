/**
 * Global toast notifications — replaces browser alerts for professional UX.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  pushToast: (message: string, tone?: ToastTone, durationMs?: number) => void;
  dismissToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs = 4200) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, tone, durationMs }]);
      if (durationMs > 0) {
        window.setTimeout(() => dismissToast(id), durationMs);
      }
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      pushToast,
      dismissToast,
      success: (m) => pushToast(m, 'success'),
      error: (m) => pushToast(m, 'error', 5600),
      info: (m) => pushToast(m, 'info'),
      warning: (m) => pushToast(m, 'warning', 5000),
    }),
    [toasts, pushToast, dismissToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100',
  error: 'border-rose-500/40 bg-rose-50 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100',
  info: 'border-teal-500/40 bg-teal-50 text-teal-900 dark:bg-teal-950/80 dark:text-teal-100',
  warning: 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100',
};

const toneIcon: Record<ToastTone, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export const ToastViewport: React.FC = () => {
  const { toasts, dismissToast } = useToast();
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 pointer-events-none px-3 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = toneIcon[t.tone];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3.5 py-3 shadow-lg text-sm ${toneStyles[t.tone]}`}
            role="status"
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1 leading-snug font-medium">{t.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
