import React from 'react';
import { Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';

export const SessionWarningModal: React.FC = () => {
  const {
    showSessionWarning,
    sessionSecondsRemaining,
    sessionTimeoutTotal,
    resetSessionTimer,
    logout,
    language,
    t,
    primaryRole,
    activeRole,
  } = useClinic();

  if (!showSessionWarning) return null;

  const mins = Math.floor(sessionSecondsRemaining / 60);
  const secs = sessionSecondsRemaining % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;

  // Determine current role label
  const roleName =
    activeRole === 'doctor' || primaryRole === 'doctor'
      ? t.session.doctorTimeout
      : primaryRole === 'staff' ||
        activeRole === 'nurse' ||
        activeRole === 'pharmacist' ||
        activeRole === 'receptionist' ||
        activeRole === 'lab_technician'
      ? t.session.staffTimeout
      : activeRole === 'admin' || primaryRole === 'admin'
      ? t.session.adminTimeout
      : t.session.patientTimeout;

  const progressPercent = Math.max(0, Math.min(100, (sessionSecondsRemaining / 120) * 100));

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-amber-400 max-w-md w-full p-6 sm:p-7 space-y-5 text-center font-sans text-slate-800 dark:text-slate-100">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-300 dark:border-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.session.warningSubtitle}</span>
          </div>

          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            {t.session.warningTitle}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.session.expireMessagePart1}
            <strong className="text-amber-600 dark:text-amber-400 font-black text-sm px-1 font-mono">
              {timeStr}
            </strong>
            {t.session.expireMessagePart2}
          </p>
        </div>

        {/* Progress bar countdown */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Role Inactivity Policy Card */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
            <span>{t.session.roleTimeoutInfo}:</span>
          </span>
          <span className="font-bold text-teal-700 dark:text-teal-300">{roleName}</span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetSessionTimer();
            }}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-teal-900/20 transition cursor-pointer transform hover:scale-[1.02]"
          >
            {t.session.stayLoggedInBtn}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              logout('login');
            }}
            className="px-4 py-3 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            {t.session.logOutBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
