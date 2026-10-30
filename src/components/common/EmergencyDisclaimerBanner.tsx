import React from 'react';
import { AlertOctagon, PhoneCall } from 'lucide-react';

interface Props {
  className?: string;
  compact?: boolean;
}

export const EmergencyDisclaimerBanner: React.FC<Props> = ({ className = '', compact = false }) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl ${className}`}>
        <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
        <span className="truncate">EMERGENCY ADVISORY: If experiencing severe symptoms, call 911 or go to the nearest ER immediately.</span>
      </div>
    );
  }

  return (
    <div className={`p-3.5 bg-rose-50/95 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/70 rounded-2xl text-rose-950 dark:text-rose-100 text-xs flex items-start gap-3 shadow-xs shrink-0 ${className}`}>
      <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0 mt-0.5 text-rose-700 dark:text-rose-300">
        <AlertOctagon className="w-4 h-4" />
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
            <span>Critical Medical Emergency Disclaimer</span>
          </p>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-700">
            <PhoneCall className="w-3 h-3" /> Call 911 / Go to ER
          </span>
        </div>
        <p className="text-rose-900 dark:text-rose-200/90 leading-relaxed font-normal">
          The SmartClinic AI Triage Chatbot is an automated triage assistant and <strong className="font-bold underline decoration-rose-400 dark:decoration-rose-600">is not a doctor</strong>. It cannot provide definitive medical diagnoses or prescribe medications. If you or someone you are assisting has severe symptoms (such as acute chest pain, difficulty breathing, severe bleeding, sudden weakness, stroke symptoms, or altered consciousness), <strong className="font-bold text-rose-950 dark:text-rose-100">please seek immediate emergency medical care</strong>.
        </p>
        <p className="text-rose-700 dark:text-rose-400 text-[10px] font-medium pt-0.5">
          In the Philippines, call <strong className="font-bold">911</strong> or proceed immediately to the nearest hospital Emergency Department.
        </p>
      </div>
    </div>
  );
};
