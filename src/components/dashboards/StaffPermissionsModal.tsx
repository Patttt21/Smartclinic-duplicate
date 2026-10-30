/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  X,
  Check,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  QrCode,
  Stethoscope,
  FileText,
  Pill,
  PackageCheck,
  FlaskConical,
  Receipt,
  BarChart3,
  Lock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import type { User, UserRole, UserPermissions } from '../../types/clinic';
import { DEFAULT_ROLE_PERMISSIONS } from '../../types/clinic';

interface StaffPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User | null;
}

interface PermissionItem {
  key: keyof UserPermissions;
  label: string;
  category: 'clinical' | 'frontdesk' | 'dispensary' | 'governance';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  sensitiveNotice?: string;
  recommendedRoles: UserRole[];
}

const PERMISSION_DEFINITIONS: PermissionItem[] = [
  // 1. Clinical Suite
  {
    key: 'dashboard',
    label: 'Clinical & Operational Dashboard',
    category: 'clinical',
    icon: LayoutDashboard,
    description: 'Access to system overview, operational metrics, and role-scoped analytics.',
    recommendedRoles: ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'admin'],
  },
  {
    key: 'patients',
    label: 'Patient Directory & Master Profiles',
    category: 'clinical',
    icon: Users,
    description: 'Search, view, register, and update patient medical demographic charts.',
    sensitiveNotice: 'Confidential EMR Protected under RA 10173',
    recommendedRoles: ['doctor', 'nurse', 'receptionist', 'admin'],
  },
  {
    key: 'consultations',
    label: 'Consultation Suite & SOAP Clinical Notes',
    category: 'clinical',
    icon: Stethoscope,
    description: 'Active consultation documentation, diagnosis coding (ICD-10), and treatment plans.',
    sensitiveNotice: 'Restricted to licensed physicians and triage nurses',
    recommendedRoles: ['doctor', 'nurse', 'admin'],
  },
  {
    key: 'emr',
    label: 'Full Electronic Medical Records (EMR)',
    category: 'clinical',
    icon: FileText,
    description: 'Comprehensive historical clinical notes, diagnostic archives, and longitudinal charts.',
    sensitiveNotice: 'High-privilege clinical data access',
    recommendedRoles: ['doctor', 'admin'],
  },

  // 2. Front Desk & Triage
  {
    key: 'appointments',
    label: 'Appointment Scheduling & Calendar',
    category: 'frontdesk',
    icon: Calendar,
    description: 'Book, reschedule, approve, and manage doctor consultation calendar slots.',
    recommendedRoles: ['doctor', 'nurse', 'receptionist', 'admin'],
  },
  {
    key: 'queue',
    label: 'Live Queue & Waiting Room Flow',
    category: 'frontdesk',
    icon: Layers,
    description: 'Monitor waiting room status, call next queue ticket, and route patients to examination stations.',
    recommendedRoles: ['doctor', 'nurse', 'receptionist', 'admin'],
  },
  {
    key: 'triage',
    label: 'Patient Triage & Health ID QR Check-in',
    category: 'frontdesk',
    icon: QrCode,
    description: 'Record intake vital signs, scan QR Health IDs, and evaluate clinical acuity.',
    sensitiveNotice: 'Primary emergency triage gateway',
    recommendedRoles: ['nurse', 'receptionist', 'admin'],
  },

  // 3. Dispensary & Diagnostics
  {
    key: 'prescriptions',
    label: 'e-Prescriptions & Formulary Review',
    category: 'dispensary',
    icon: Pill,
    description: 'Create, review, verify, and dispense digital outpatient prescriptions.',
    sensitiveNotice: 'PRC Licensure required for generation; Pharmacist review for dispensation',
    recommendedRoles: ['doctor', 'pharmacist', 'admin'],
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy & Stock Inventory Management',
    category: 'dispensary',
    icon: PackageCheck,
    description: 'Formulary reorder thresholds, batch/expiry tracking, and stock dispensation audits.',
    sensitiveNotice: 'Controlled substances & formulary inventory tracking',
    recommendedRoles: ['pharmacist', 'doctor', 'admin'],
  },
  {
    key: 'laboratory',
    label: 'Laboratory Orders & Diagnostic Pathology',
    category: 'dispensary',
    icon: FlaskConical,
    description: 'Create lab test orders, track biospecimen samples, enter values, and certify test results.',
    sensitiveNotice: 'Diagnostic pathology and specimen result certification',
    recommendedRoles: ['lab_technician', 'doctor', 'nurse', 'admin'],
  },

  // 4. Governance & AI Intelligence
  {
    key: 'billing',
    label: 'Patient Billing & Financial Reconciliation',
    category: 'governance',
    icon: Receipt,
    description: 'Issue official clinic invoices, process copays/discounts, and review cashier transactions.',
    sensitiveNotice: 'Fiscal billing records & financial management',
    recommendedRoles: ['admin'],
  },
  {
    key: 'reports',
    label: 'Executive Reports & Predictive Analytics',
    category: 'governance',
    icon: BarChart3,
    description: 'Outpatient clinical volume trends, revenue summaries, and epidemiological projections.',
    recommendedRoles: ['admin'],
  },
  {
    key: 'auditLogs',
    label: 'System Audit Logs & RA 10173 Compliance',
    category: 'governance',
    icon: ShieldAlert,
    description: 'Immutable record of all clinical actions, logins, patient views, and security events.',
    sensitiveNotice: 'Republic Act 10173 Health Data Privacy Sentinel',
    recommendedRoles: ['admin'],
  },
  {
    key: 'aiAssistant',
    label: 'AI Clinical & Administrative Assistant Hub',
    category: 'governance',
    icon: Sparkles,
    description: 'Interactive AI support for drug safety audits, SOAP note scribing, and ICD-10 assistance.',
    recommendedRoles: ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'admin'],
  },
];

export const StaffPermissionsModal: React.FC<StaffPermissionsModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const { updateUserPermissions, getUserPermissions } = useClinic();

  const [permissions, setPermissions] = useState<UserPermissions>(() => {
    return targetUser ? getUserPermissions(targetUser) : { ...DEFAULT_ROLE_PERMISSIONS.nurse };
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (targetUser) {
      setPermissions(getUserPermissions(targetUser));
      setSelectedTemplate('custom');
      setSaveSuccess(false);
    }
  }, [targetUser, getUserPermissions]);

  if (!isOpen || !targetUser) return null;

  const isAdminUser = targetUser.role === 'admin' || targetUser.email === 'smartclinicrealacc@gmail.com';

  const togglePermission = (key: keyof UserPermissions) => {
    if (isAdminUser) return; // Prevent disabling admin permissions
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSelectedTemplate('custom');
    setSaveSuccess(false);
  };

  const applyRoleTemplate = (role: UserRole) => {
    if (isAdminUser) return;
    const template = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.nurse;
    setPermissions({ ...template });
    setSelectedTemplate(role);
    setSaveSuccess(false);
  };

  const handleSelectAll = () => {
    if (isAdminUser) return;
    const allTrue: UserPermissions = {
      dashboard: true,
      patients: true,
      appointments: true,
      queue: true,
      triage: true,
      consultations: true,
      emr: true,
      prescriptions: true,
      pharmacy: true,
      laboratory: true,
      billing: true,
      reports: true,
      auditLogs: true,
      aiAssistant: true,
    };
    setPermissions(allTrue);
    setSelectedTemplate('custom');
    setSaveSuccess(false);
  };

  const handleDeselectAll = () => {
    if (isAdminUser) return;
    const allFalse: UserPermissions = {
      dashboard: true, // Keep dashboard baseline so staff can log in
      patients: false,
      appointments: false,
      queue: false,
      triage: false,
      consultations: false,
      emr: false,
      prescriptions: false,
      pharmacy: false,
      laboratory: false,
      billing: false,
      reports: false,
      auditLogs: false,
      aiAssistant: false,
    };
    setPermissions(allFalse);
    setSelectedTemplate('custom');
    setSaveSuccess(false);
  };

  const handleSave = () => {
    updateUserPermissions(targetUser.id, permissions);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const allowedCount = Object.values(permissions).filter(Boolean).length;
  const initials = targetUser.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const categories = [
    { id: 'clinical', title: 'Clinical Care & Medical Records' },
    { id: 'frontdesk', title: 'Front Desk & Patient Flow' },
    { id: 'dispensary', title: 'Dispensary & Diagnostics' },
    { id: 'governance', title: 'Governance, Billing & AI Intelligence' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#0b1120] border border-cyan-500/40 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl shadow-cyan-950/40 flex flex-col overflow-hidden text-slate-100 animate-scale-up">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-[#0e1628] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Staff Initials Badge (NO Profile Pictures) */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-extrabold text-base tracking-wider shrink-0 shadow-md">
              {initials || <KeyRound className="w-6 h-6 text-cyan-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {targetUser.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 uppercase tracking-wide">
                  {targetUser.role.replace('_', ' ')}
                </span>
                {targetUser.licenseNumber && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-700">
                    {targetUser.licenseNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {targetUser.department || 'Outpatient Services'} • {targetUser.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Role Presets */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#090e1a] border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-400 text-[11px]">Apply Role Preset:</span>
            <button
              type="button"
              disabled={isAdminUser}
              onClick={() => applyRoleTemplate('doctor')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                selectedTemplate === 'doctor'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Doctor
            </button>
            <button
              type="button"
              disabled={isAdminUser}
              onClick={() => applyRoleTemplate('nurse')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                selectedTemplate === 'nurse'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Nurse
            </button>
            <button
              type="button"
              disabled={isAdminUser}
              onClick={() => applyRoleTemplate('receptionist')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                selectedTemplate === 'receptionist'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Receptionist
            </button>
            <button
              type="button"
              disabled={isAdminUser}
              onClick={() => applyRoleTemplate('pharmacist')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                selectedTemplate === 'pharmacist'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Pharmacist
            </button>
            <button
              type="button"
              disabled={isAdminUser}
              onClick={() => applyRoleTemplate('lab_technician')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                selectedTemplate === 'lab_technician'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Lab Tech
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              {allowedCount} of {PERMISSION_DEFINITIONS.length} Modules Allowed
            </span>
            {!isAdminUser && (
              <>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 rounded-lg transition cursor-pointer font-semibold"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-300 bg-slate-900 rounded-lg transition cursor-pointer font-semibold"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Admin Safety Notice */}
        {isAdminUser && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-center gap-2.5 text-xs text-cyan-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>
              Executive Clinic Director accounts maintain mandatory full system governance across all clinical, financial, and administrative modules in accordance with Philippine RA 10173 standards.
            </span>
          </div>
        )}

        {/* Permissions Body (Grouped by Category) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-slate-800/80">
          {categories.map((cat, idx) => {
            const items = PERMISSION_DEFINITIONS.filter((p) => p.category === cat.id);
            return (
              <div key={cat.id} className={idx > 0 ? 'pt-5' : ''}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{cat.title}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((perm) => {
                    const isEnabled = Boolean(permissions[perm.key]);
                    const Icon = perm.icon;

                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 select-none ${
                          isEnabled
                            ? 'bg-[#111c33]/90 border-cyan-500/50 shadow-md shadow-cyan-950/20'
                            : 'bg-[#0e1628]/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        } ${isAdminUser ? 'cursor-default' : 'cursor-pointer hover:bg-[#142340]'}`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                              isEnabled
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4
                                className={`text-xs font-extrabold truncate ${
                                  isEnabled ? 'text-white' : 'text-slate-400'
                                }`}
                              >
                                {perm.label}
                              </h4>
                              {perm.sensitiveNotice && (
                                <span
                                  className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 shrink-0"
                                  title={perm.sensitiveNotice}
                                >
                                  Sensitive
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                              {perm.description}
                            </p>
                          </div>
                        </div>

                        {/* Custom Toggle Switch */}
                        <div className="shrink-0 pt-0.5">
                          <div
                            className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out border ${
                              isEnabled
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 border-cyan-400'
                                : 'bg-slate-800 border-slate-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0e1628] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">
              Changes are immediately enforced and persist across browser reloads.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isAdminUser && saveSuccess}
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Permissions Saved!</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Save Privileges</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
