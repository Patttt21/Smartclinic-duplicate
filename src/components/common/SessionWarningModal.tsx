import React from 'react';
import { Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';

export const SessionWarningModal: React.FC = () => {
  const {
    showSessionWarning,
    sessionSecondsRemaining,
    sessionTimeoutTotal,
    clinicSettings,
    resetSessionTimer,
    logout,
    t,
  } = useClinic();

  if (!showSessionWarning) return null;

  const warningWindow = clinicSettings?.inactivityWarningSeconds || 60;
  const mins = Math.floor(sessionSecondsRemaining / 60);
  const secs = sessionSecondsRemaining % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
  const totalMinutes = Math.max(1, Math.round((sessionTimeoutTotal || 600) / 60));
  const progressPercent = Math.max(0, Math.min(100, (sessionSecondsRemaining / warningWindow) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-400 dark:border-amber-500 max-w-md w-full p-6 space-y-5 text-center font-sans text-slate-800 dark:text-slate-100">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
          <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.session.warningSubtitle}</span>
          </div>

          <h3 id="session-warning-title" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Session Expiration Warning
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.session.expireMessagePart1}
            <strong className="text-amber-600 dark:text-amber-400 font-bold text-sm px-1 font-mono tabular-nums">
              {timeStr}
            </strong>
            {t.session.expireMessagePart2}
          </p>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-600" />
            <span>Inactivity Timeout Policy:</span>
          </span>
          <span className="font-bold text-sky-700 dark:text-sky-300 tabular-nums">
            All Roles: {totalMinutes} minutes
          </span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetSessionTimer();
            }}
            className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
          >
            Stay Signed In
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              logout('login');
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer whitespace-nowrap"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
