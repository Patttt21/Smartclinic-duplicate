import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  Stethoscope,
  FileText,
  Pill,
  FlaskConical,
  PackageCheck,
  Receipt,
  BarChart3,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Lock,
  QrCode,
  UserCheck,
  X,
} from 'lucide-react';
import { UserRole, UserPermissions, Appointment, LabTestOrder, InventoryItem } from '../../types/clinic';
import { useClinic } from '../../context/ClinicContext';
import { SmartClinicLogo } from '../common/SmartClinicLogo';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  roles: UserRole[];
  permissionKey?: keyof UserPermissions;
}

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { activeTab, setActiveTab, activeRole, appointments, labOrders, inventory, t, hasPermission } = useClinic();

  const waitingCount = appointments.filter(
    (a: Appointment) => a.status === 'Checked In' || a.status === 'Called' || a.status === 'In Consultation'
  ).length;
  const pendingLabs = labOrders.filter((l: LabTestOrder) => l.status === 'Requested' || l.status === 'Processing').length;
  const lowStockCount = inventory.filter((i: InventoryItem) => i.stockQuantity <= i.reorderLevel).length;

  // Strict Role Classification
  const isPatient = activeRole === 'patient';
  const isAdmin = activeRole === 'admin';
  const isProvider = !isPatient && !isAdmin; // doctor, nurse, receptionist, pharmacist, lab_technician

  // Exact navigation item registry with strict role-based access control (RBAC) and granular permission gates
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: isPatient ? t.nav.patientPortal : isAdmin ? t.admin.dashboardTitle : t.nav.dashboard,
      icon: LayoutDashboard,
      roles: ['patient', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'admin'],
      permissionKey: 'dashboard',
    },
    {
      id: 'patients',
      label: isAdmin ? t.admin.totalPatients : t.nav.patients,
      icon: Users,
      roles: ['doctor', 'nurse', 'receptionist', 'admin'],
      permissionKey: 'patients',
    },
    {
      id: 'doctors',
      label: 'Physicians & Doctors',
      icon: Stethoscope,
      roles: ['admin'],
    },
    {
      id: 'clinical-staff',
      label: 'Clinical Staff Accounts',
      icon: UserCheck,
      roles: ['admin'],
    },
    {
      id: 'scan-qr',
      label: t.nav.scanHealthId,
      icon: QrCode,
      roles: ['nurse', 'receptionist'],
      permissionKey: 'triage',
    },
    {
      id: 'appointments',
      label: t.nav.appointments,
      icon: Calendar,
      roles: ['patient', 'doctor', 'nurse', 'receptionist'],
      permissionKey: 'appointments',
    },
    {
      id: 'queue',
      label: t.nav.queue,
      icon: Layers,
      badge: waitingCount > 0 ? waitingCount : undefined,
      roles: ['patient', 'doctor', 'nurse', 'receptionist'],
      permissionKey: 'queue',
    },
    {
      id: 'consultations',
      label: t.nav.consultations,
      icon: Stethoscope,
      roles: ['doctor', 'nurse', 'admin'],
      permissionKey: 'consultations',
    },
    {
      id: 'emr',
      label: t.nav.emr,
      icon: FileText,
      roles: ['patient'],
      permissionKey: 'emr',
    },
    {
      id: 'prescriptions',
      label: t.nav.prescriptions,
      icon: Pill,
      roles: ['patient', 'doctor', 'pharmacist'],
      permissionKey: 'prescriptions',
    },
    {
      id: 'laboratory',
      label: t.nav.laboratory,
      icon: FlaskConical,
      badge: pendingLabs > 0 ? pendingLabs : undefined,
      roles: ['patient', 'doctor', 'lab_technician', 'nurse'],
      permissionKey: 'laboratory',
    },
    {
      id: 'inventory',
      label: t.nav.inventory,
      icon: PackageCheck,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      roles: ['pharmacist', 'doctor', 'admin'],
      permissionKey: 'pharmacy',
    },
    {
      id: 'billing',
      label: t.nav.billing,
      icon: Receipt,
      roles: ['patient', 'receptionist', 'admin'],
      permissionKey: 'billing',
    },
    {
      id: 'reports',
      label: t.nav.reports,
      icon: BarChart3,
      roles: ['admin'],
      permissionKey: 'reports',
    },
    {
      id: 'predictive-analytics',
      label: t.nav.predictiveAnalytics,
      icon: TrendingUp,
      roles: ['admin'],
      permissionKey: 'reports',
    },
    {
      id: 'audit-logs',
      label: t.nav.auditLogs,
      icon: ShieldAlert,
      roles: ['admin'],
      permissionKey: 'auditLogs',
    },
  ];

  // Apply strict role AND assigned permission filter: a user ONLY sees items they are authorized to access
  const visibleItems = navItems.filter((item) => {
    if (!item.roles.includes(activeRole)) return false;
    if (activeRole === 'admin') return true;
    if (item.permissionKey && !hasPermission(item.permissionKey)) {
      return false;
    }
    return true;
  });

  const renderNavButtons = (isMobile = false) =>
    visibleItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;
      return (
        <button
          key={item.id}
          onClick={() => {
            setActiveTab(item.id);
            if (isMobile && onClose) onClose();
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
            isActive
              ? 'bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-transparent text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/30 font-semibold'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
          }`}
          title={item.label}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span className="leading-tight text-left break-words min-w-0 flex-1">{item.label}</span>
          </div>
          {item.badge !== undefined && (
            <span
              className={`ml-2 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
              }`}
            >
              {item.badge}
            </span>
          )}
        </button>
      );
    });

  const renderSecurityFooter = () => (
    <div className="p-3 border-t border-slate-800/80 bg-[#070b14]/90 text-[11px]">
      <div className="p-2.5 rounded-xl bg-[#0d1424] border border-slate-800/80 text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-200">
          <span className="flex items-center gap-1 text-teal-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security & Privacy Scope</span>
          </span>
          <span className="text-[9px] font-mono bg-teal-950/80 text-teal-300 px-1.5 py-0.5 rounded border border-teal-800/60">
            RA 10173
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          {isPatient
            ? 'Private single-patient isolation active. Only your verified health records are accessible.'
            : isAdmin
            ? 'Executive administration session. Full audit trail and facility configuration active.'
            : 'Clinical provider session. Patient care, charting, and diagnostic orders active.'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex w-72 bg-[#090e1a]/95 backdrop-blur-md border-r border-slate-800/80 flex-col shrink-0 min-h-screen text-slate-300 select-none">
        <div className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {renderNavButtons(false)}
        </div>
        {renderSecurityFooter()}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer (< 1024px) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-[#090e1a] border-r border-slate-800/80 shadow-2xl flex flex-col text-slate-300 select-none z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#070b14]/90">
              <div className="flex items-center gap-2.5">
                <SmartClinicLogo className="w-8 h-8" glow={true} />
                <div>
                  <span className="font-bold text-white text-sm">Smart Clinic</span>
                  <p className="text-[10px] text-teal-400 font-semibold uppercase">
                    {isPatient ? 'Patient Portal' : 'Clinical Hub'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close navigation"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {renderNavButtons(true)}
            </div>

            {renderSecurityFooter()}
          </aside>
        </div>
      )}
    </>
  );
};

