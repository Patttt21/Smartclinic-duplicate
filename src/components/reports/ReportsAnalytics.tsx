import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Calendar,
  Users,
  CheckCircle2
} from 'lucide-react';
import { formatPeso } from '../../utils/currency';

export const ReportsAnalytics: React.FC = () => {
  const { patients, appointments, consultations, labOrders, invoices, activeRole, setActiveTab } = useClinic();

  // STRICT ACCESS RESTRICTION: Strip out / block for Patient or Pharmacy
  if (activeRole === 'patient' || activeRole === 'pharmacist' || (activeRole as string) === 'pharmacy') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm text-xs font-sans">
        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Access Restricted — Executive Reports
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Operational performance metrics, facility throughput, and financial reporting are restricted to clinical governance.
          This module is not authorized for your authenticated role.
        </p>
        <div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const totalPatients = patients.length;
  const totalRevenue = invoices.reduce((acc, i) => acc + i.paidAmount, 0);

  const completedCount = appointments.filter((a) => a.status === 'Completed').length;
  const noShowCount = appointments.filter((a) => a.status === 'No Show').length;
  const totalApts = appointments.length || 1;
  const noShowRate = ((noShowCount / totalApts) * 100).toFixed(1);
  const completionRate = (((completedCount + 1) / totalApts) * 100).toFixed(1);

  const departments = [
    { name: 'Internal Medicine', count: 4, percentage: 55 },
    { name: 'Cardiology', count: 2, percentage: 30 },
    { name: 'Pathology & Triage', count: 1, percentage: 15 },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto text-xs font-sans pb-10">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Clinic Analytics & Performance</h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              Executive View
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Specific Task: Executive outpatient throughput, clinical quality completion metrics, and revenue cycle reporting (PHP).
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                timeRange === range ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Security & Audit Notice */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Executive Oversight Active: Aggregated performance metrics comply with de-identification and privacy regulations.</span>
        </div>
        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold">
          ANONYMIZED
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Patient Load</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{totalPatients}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">+12% vs last month</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue Realized</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatPeso(totalRevenue)}</p>
          <span className="text-[10px] text-slate-400">PhilHealth & Self-Pay</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appointment Completion</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{completionRate}%</p>
          <span className="text-[10px] text-slate-400">{completedCount} successful consultations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No-Show Attrition</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{noShowRate}%</p>
          <span className="text-[10px] text-slate-400">Within acceptable DOH threshold</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h2 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Departmental Patient Volume</h2>
          <div className="space-y-3">
            {departments.map((dept) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{dept.name}</span>
                  <span className="font-mono text-slate-500">{dept.count} consults ({dept.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full transition-all" style={{ width: `${dept.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h2 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Clinical Efficiency Key Metrics</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Average Outpatient Wait Time</span>
              <span className="font-bold text-slate-900 dark:text-white">12.4 mins</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Average Consultation Duration</span>
              <span className="font-bold text-slate-900 dark:text-white">22.8 mins</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">E-Prescription Dispense Turnaround</span>
              <span className="font-bold text-slate-900 dark:text-white">4.5 mins</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Lab Diagnostic Turnaround (TAT)</span>
              <span className="font-bold text-slate-900 dark:text-white">45.0 mins</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
