import React from 'react';
import {
  X,
  CheckCircle,
  Bell,
  Clock,
  Calendar,
  FlaskConical,
  Pill,
  PackageCheck,
  Receipt,
  ShieldAlert,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import type { Notification } from '../../types/clinic';

interface NotificationDetailModalProps {
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  onClose,
  onMarkAsRead,
}) => {
  if (!notification) return null;

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'lab':
        return <FlaskConical className="w-5 h-5 text-teal-500" />;
      case 'appointment':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'prescription':
        return <Pill className="w-5 h-5 text-indigo-500" />;
      case 'inventory':
        return <PackageCheck className="w-5 h-5 text-amber-500" />;
      case 'billing':
        return <Receipt className="w-5 h-5 text-emerald-500" />;
      case 'triage':
        return <Activity className="w-5 h-5 text-rose-500" />;
      case 'security':
        return <ShieldAlert className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-teal-500" />;
    }
  };

  const formattedDate = notification.createdAt || notification.timestamp
    ? new Date(notification.createdAt || notification.timestamp || '').toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Recent Update';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              {getCategoryIcon(notification.category)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {notification.category || 'General Notice'}
                </span>
                {notification.targetRole && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                    {notification.targetRole}
                  </span>
                )}
                {notification.priority === 'high' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Urgent
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1.5 leading-snug">
                {notification.title}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
            {notification.content || notification.message}
          </div>

          {notification.message && notification.content && notification.message !== notification.content && (
            <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Summary:</span>
              {notification.message}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {notification.read ? (
              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">
                <CheckCircle className="w-4 h-4" /> Marked as Read
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {!notification.read && (
              <button
                onClick={() => {
                  onMarkAsRead(notification.id);
                }}
                className="px-4 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-xl transition cursor-pointer shadow-2xs"
              >
                Mark as Read
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl transition cursor-pointer shadow-sm shadow-teal-900/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
