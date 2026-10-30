import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Layers,
  Receipt,
  Calendar,
  CheckCircle2,
  Users,
  Info,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export const ReceptionistConsultationGuide: React.FC = () => {
  const { setActiveTab } = useClinic();

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5 text-xs font-sans">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center font-bold">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Front Desk Outpatient Workflow & Coordination
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Role-Based Clinical Protocol Guidance
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-sky-900 dark:text-sky-200 leading-relaxed text-[11px]">
        <strong>Receptionist Scope & Role Separation:</strong> In compliance with hospital standards, physician clinical examination rooms and nursing triage stations are managed by licensed medical personnel. Your frontline responsibilities include:
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">1. Patient Check-In</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Welcome arriving patients, verify PhilHealth/HMO cards, and issue queue tickets.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">2. Triage Handoff</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Direct patients to Triage Station 1 where registered nurses record vital signs.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">3. Checkout & Billing</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Collect consultation and lab fees once the physician completes the consultation note.
          </p>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Manage Live Queue</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Proceed to Billing & Cashier</span>
        </button>
      </div>
    </div>
  );
};
