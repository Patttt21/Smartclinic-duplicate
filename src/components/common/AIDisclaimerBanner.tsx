import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';

interface Props {
  className?: string;
  compact?: boolean;
}

export const AIDisclaimerBanner: React.FC<Props> = ({ className = '', compact = false }) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/60 rounded-xl ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="truncate">AI Decision Support Only — Requires clinical review</span>
      </div>
    );
  }

  return (
    <div className={`p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/70 rounded-2xl text-amber-950 dark:text-amber-100 text-xs flex items-start gap-3 shadow-xs shrink-0 ${className}`}>
      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 mt-0.5 text-amber-700 dark:text-amber-300">
        <ShieldAlert className="w-4 h-4" />
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        <p className="font-bold text-amber-900 dark:text-amber-200 text-[11px] uppercase tracking-wide">
          Clinical Decision Support Notice
        </p>
        <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed font-normal">
          AI-generated insights, notes, interactions, and interpretations are strictly advisory tools intended to support, not replace, the independent professional judgment and diagnostic responsibility of authorized healthcare professionals.
        </p>
        <p className="text-amber-700 dark:text-amber-400 text-[10px] font-medium pt-0.5">
          Protected under Philippine Health Data Security & Encryption Standards (RA 10173 · DOH-PHIE).
        </p>
      </div>
    </div>
  );
};
