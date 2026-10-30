import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  ShieldAlert,
  Users,
  Receipt,
  TrendingUp,
  CheckCircle2,
  Lock,
  KeyRound,
  Plus,
  Stethoscope,
  UserCheck,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  FileBadge,
  Calendar,
  Clock,
  Activity,
  ArrowRight,
  Filter,
  UserPlus,
  Building2,
  BadgeCheck,
  Briefcase,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { RoleHeroBanner } from '../common/RoleHeroBanner';
import { formatPeso } from '../../utils/currency';
import { AddDoctorModal } from './AddDoctorModal';
import { AddStaffModal } from './AddStaffModal';
import { StaffPermissionsModal } from './StaffPermissionsModal';
import type { User, Patient } from '../../types/clinic';

interface AdminDashboardViewProps {
  onOpenNewPatient?: () => void;
  initialSection?: 'overview' | 'staff' | 'patients';
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onOpenNewPatient,
}) => {
  const {
    currentUser,
    users,
    patients,
    invoices,
    auditLogs,
    activeTab,
    setActiveTab,
    sessionSecondsRemaining,
    deleteUser,
    toggleUserStatus,
    selectPatient,
    t,
    language,
  } = useClinic();

  const isFil = language === 'fil';

  // Modal States
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState<User | null>(null);
  const [staffToEdit, setStaffToEdit] = useState<User | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<User | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModuleTab, setActiveModuleTab] = useState<'all' | 'doctors' | 'staff'>(() => {
    if (activeTab === 'doctors') return 'doctors';
    if (activeTab === 'clinical-staff') return 'staff';
    return 'all';
  });

  React.useEffect(() => {
    if (activeTab === 'doctors') {
      setActiveModuleTab('doctors');
    } else if (activeTab === 'clinical-staff') {
      setActiveModuleTab('staff');
    }
  }, [activeTab]);

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Revenue Metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const outstandingRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
  const adminEmail = currentUser.email || 'smartclinicrealacc@gmail.com';

  // Separate Doctors and Clinical Staff
  const doctorsList = useMemo(() => {
    return users.filter((u) => u.role === 'doctor');
  }, [users]);

  const clinicalStaffList = useMemo(() => {
    return users.filter((u) => ['nurse', 'receptionist', 'lab_technician', 'pharmacist'].includes(u.role));
  }, [users]);

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctorsList.filter((doc) => {
      const matchSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.specialty && doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.department && doc.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.licenseNumber && doc.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || (doc.status || 'Active') === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [doctorsList, searchTerm, statusFilter]);

  // Filtered Clinical Staff
  const filteredStaff = useMemo(() => {
    return clinicalStaffList.filter((staff) => {
      const matchSearch =
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (staff.department && staff.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (staff.licenseNumber && staff.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole = roleFilter === 'ALL' || staff.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || (staff.status || 'Active') === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [clinicalStaffList, searchTerm, roleFilter, statusFilter]);

  const handleEditDoctor = (doc: User) => {
    setDoctorToEdit(doc);
    setShowAddDoctorModal(true);
  };

  const handleEditStaff = (stf: User) => {
    setStaffToEdit(stf);
    setShowAddStaffModal(true);
  };

  const handleDeleteUser = async (userId: string, _name?: string) => {
    if (confirmDeleteUserId !== userId) {
      setConfirmDeleteUserId(userId);
      return;
    }
    setConfirmDeleteUserId(null);
    await deleteUser(userId);
  };

  const handleToggleStatus = async (userId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'Active' ? 'On Leave' : currentStatus === 'On Leave' ? 'Inactive' : 'Active';
    await toggleUserStatus(userId, nextStatus as any);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'doctor':
        return { label: 'Physician / MD', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' };
      case 'nurse':
        return { label: 'Registered Nurse', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'receptionist':
        return { label: 'Front Desk Access', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'lab_technician':
        return { label: 'Medical Technologist', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'pharmacist':
        return { label: 'Clinical Pharmacist', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      default:
        return { label: role.replace('_', ' ').toUpperCase(), color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = status || 'Active';
    if (s === 'Active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Active
        </span>
      );
    }
    if (s === 'On Leave') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          On Leave
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        Inactive
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-3 text-xs font-sans pb-20 relative">
      {/* Subtle Ambient Radial Glows */}
      <div className="pointer-events-none absolute -top-10 left-1/4 w-[500px] h-[350px] bg-purple-600/10 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-40 right-10 w-[450px] h-[300px] bg-cyan-600/8 rounded-full blur-3xl -z-10" />

      {/* ====================================================================
          WELCOME BANNER / HERO SECTION (PURPLE GRADIENT HERO)
          ==================================================================== */}
      <RoleHeroBanner
        badges={[
          {
            text: isFil ? 'Tagapamahala ng Klinika' : 'Executive Clinic Director',
            icon: <ShieldAlert className="w-3.5 h-3.5 text-cyan-300" />,
            className: 'bg-purple-500/25 text-purple-200 border-purple-400/40 shadow-xs',
          },
          {
            text: `${isFil ? 'Ligtas na Sesyon' : 'Secure Session'} • ${adminEmail}`,
            icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
            pulseDot: true,
            pulseColor: 'bg-emerald-400',
            className: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 font-mono shadow-xs',
          },
          {
            text: `Session: ${Math.floor(sessionSecondsRemaining / 60)}:${sessionSecondsRemaining % 60 < 10 ? '0' : ''}${sessionSecondsRemaining % 60}`,
            icon: <Clock className={`w-3.5 h-3.5 ${sessionSecondsRemaining <= 120 ? 'text-amber-400 animate-spin' : 'text-cyan-400'}`} />,
            className: `${
              sessionSecondsRemaining <= 120
                ? 'bg-amber-950/80 text-amber-300 border-amber-500 animate-pulse'
                : 'bg-[#11192c] text-cyan-300 border-slate-700/80 shadow-xs'
            } font-mono`,
          },
        ]}
        title={
          <span className="bg-gradient-to-r from-white via-slate-100 to-cyan-100 bg-clip-text text-transparent">
            {isFil ? 'Pamamahala at Administrasyon ng Klinika' : 'Executive Administration & Governance'}
          </span>
        }
        meta={
          <span className="max-w-2xl block text-slate-200 leading-relaxed">
            <span className="text-white font-semibold">
              {t.common.welcome}, {currentUser.name}.
            </span>{' '}
            {isFil
              ? 'Operasyon ng Klinika, Pananalapi, at Audit Trail alinsunod sa Philippine Data Privacy Act (RA 10173).'
              : 'Outpatient Operations, Physician Credentialing, Staff Access & Cryptographic Audit Trails under Philippine RA 10173.'}
          </span>
        }
        gradientClass="bg-gradient-to-r from-[#2e1065] via-[#1e1b4b] to-[#0a1020] border border-purple-500/35 shadow-2xl shadow-purple-950/40 backdrop-blur-md relative overflow-hidden"
        actions={[
          {
            label: 'Register New Physician',
            onClick: () => {
              setDoctorToEdit(null);
              setShowAddDoctorModal(true);
            },
            icon: <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />,
            variant: 'primary',
            primaryColor:
              'bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-extrabold shadow-lg shadow-cyan-500/30 focus-visible:ring-cyan-300 active:scale-95 transition-all rounded-xl',
            ariaLabel: 'Register New Physician',
            title: 'Register and credential a new doctor',
          },
          {
            label: 'Register New Clinical Staff',
            onClick: () => {
              setStaffToEdit(null);
              setShowAddStaffModal(true);
            },
            icon: <Plus className="w-4 h-4 text-cyan-300 stroke-[2.5]" />,
            variant: 'secondary',
            ariaLabel: 'Register New Clinical Staff',
            title: 'Register nurse, receptionist, lab tech, or pharmacist',
          },
          {
            label: 'Predictive Analytics',
            onClick: () => setActiveTab('predictive-analytics'),
            icon: <TrendingUp className="w-4 h-4 text-teal-300 stroke-[2.5]" />,
            variant: 'secondary',
            ariaLabel: 'Open Predictive Analytics',
            title: 'Open Monthly Patient Volume & Consultation Trend Forecasting',
          },
        ]}
      />

      {/* ====================================================================
          DASHBOARD CARDS WITH METRICS
          ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Revenue Today */}
        <div className="bg-[#0e1628]/90 backdrop-blur-md p-5 rounded-3xl border border-slate-800/90 shadow-xl shadow-black/25 hover:border-slate-700/80 transition space-y-2 group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.admin.revenueToday}</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs shadow-emerald-500/20 group-hover:scale-105 transition">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono tracking-tight">{formatPeso(totalRevenue)}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{isFil ? 'Nasingil na Halaga (PHP)' : 'Active Fiscal Cycle (PHP)'}</span>
          </div>
        </div>

        {/* Metric 2: Outstanding Balances */}
        <div className="bg-[#0e1628]/90 backdrop-blur-md p-5 rounded-3xl border border-slate-800/90 shadow-xl shadow-black/25 hover:border-slate-700/80 transition space-y-2 group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isFil ? 'Natitirang Balanse' : 'Outstanding Balances'}</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs shadow-amber-500/20 group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono tracking-tight">{formatPeso(outstandingRevenue)}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{isFil ? 'Nakahandang Bayarin' : 'Pending Settlement'}</span>
          </div>
        </div>

        {/* Metric 3: Registered Patients */}
        <div className="bg-[#0e1628]/90 backdrop-blur-md p-5 rounded-3xl border border-slate-800/90 shadow-xl shadow-black/25 hover:border-slate-700/80 transition space-y-2 group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.admin.totalPatients}</span>
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-xs shadow-cyan-500/20 group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono tracking-tight">{patients.length}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>{isFil ? 'Aktibong Talaan ng Pasyente' : 'Active Clinical Charts'}</span>
          </div>
        </div>

        {/* Metric 4: System Logs */}
        <div className="bg-[#0e1628]/90 backdrop-blur-md p-5 rounded-3xl border border-slate-800/90 shadow-xl shadow-black/25 hover:border-slate-700/80 transition space-y-2 group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.admin.systemLogs}</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-xs shadow-purple-500/20 group-hover:scale-105 transition">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono tracking-tight">{auditLogs.length}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>{isFil ? 'Mga Tala ng Pagsunod' : 'Tamper-Evident Entries'}</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          PERMISSION / SECURITY PANEL (GOVERNANCE CARD)
          ==================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#10192e]/95 via-[#0d1424]/95 to-[#10192e]/95 backdrop-blur-md border border-teal-500/30 shadow-xl shadow-black/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Admin Authentication & Credential Governance</span>
              </h4>
              <span className="text-[10px] font-mono bg-emerald-950/70 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Session Protected</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Strict role-based isolation enforces Philippine Health Data Privacy Act (RA 10173). Only authenticated executive directors can credential physicians, manage clinical access, and review audit traces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition ${
              sessionSecondsRemaining <= 60
                ? 'bg-amber-950/80 text-amber-300 border-amber-500 animate-pulse'
                : 'bg-[#11192c] text-cyan-300 border-slate-700/80 shadow-xs'
            }`}
            title={`${t.common.sessionRemaining}: ${Math.floor(sessionSecondsRemaining / 60)}m ${
              sessionSecondsRemaining % 60
            }s`}
          >
            <Clock
              className={`w-3.5 h-3.5 ${
                sessionSecondsRemaining <= 60 ? 'text-amber-400 animate-spin' : 'text-cyan-400'
              }`}
            />
            <span>
              Session: {Math.floor(sessionSecondsRemaining / 60)}:{sessionSecondsRemaining % 60 < 10 ? '0' : ''}
              {sessionSecondsRemaining % 60}
            </span>
          </div>

          <div className="text-[11px] font-mono bg-[#080d1a] border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-cyan-300 font-bold shadow-inner">
            Director: {adminEmail}
          </div>
        </div>
      </div>

      {/* ==========================================================================
          SECTION 1: REGISTERED PATIENTS (CARD-BASED CLINICAL BLOCK)
          ========================================================================== */}
      <div className="bg-[#0e1628]/90 backdrop-blur-md rounded-3xl border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-xs shadow-cyan-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">
                  {t.admin.totalPatients}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/40">
                  {patients.length} Active Charts
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Centralized Electronic Medical Record (EMR) registry • Demographics, triage and clinical trajectories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenNewPatient && (
              <button
                onClick={onOpenNewPatient}
                className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Register Patient</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('patients')}
              className="px-3.5 py-1.5 bg-[#121c33] hover:bg-[#182645] text-slate-200 border border-slate-700/80 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <span>View Full Registry</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Recent Registered Patients Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {patients.slice(0, 6).map((patient: Patient) => (
            <div
              key={patient.id}
              onClick={() => {
                selectPatient(patient.id);
                setActiveTab('patients');
              }}
              className="p-4 rounded-2xl border border-slate-800/90 bg-[#121c33]/70 hover:border-cyan-500/50 hover:bg-[#152340] transition cursor-pointer group flex flex-col justify-between space-y-2.5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white group-hover:text-cyan-300 transition text-sm">
                    {patient.fullName}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {patient.mrn} • {patient.age} y/o ({patient.gender}) • Blood {patient.bloodType || 'N/A'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-[#090e1a] border border-slate-700 text-slate-300 shrink-0">
                  {patient.insuranceProvider || 'Self-Pay'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="truncate max-w-[170px] text-slate-300">
                  {patient.chronicConditions && patient.chronicConditions.length > 0
                    ? patient.chronicConditions[0]
                    : 'Standard Routine Care'}
                </span>
                <span className="text-cyan-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                  Open Chart &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================================================
          SECTION 2: REGISTER AND MANAGING DOCTOR AND CLINICAL STAFF
          (Directly below Registered Patients with Dark Navy & Cyan Styling)
          ========================================================================== */}
      <div className="bg-[#0e1628]/90 backdrop-blur-md rounded-3xl border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/30 space-y-5">
        {/* Main Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-400/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-md shadow-cyan-500/20">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2.5 flex-wrap">
                  <span>Register and Managing Doctor and Clinical Staff</span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-950/70 text-purple-300 font-bold border border-purple-500/40">
                    {users.length} Total Authorized
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Credentialing, hospital privileges & role assignments for Physicians, Nurses, Receptionists, Lab Technicians, and Pharmacists
                </p>
              </div>
            </div>
          </div>

          {/* Dedicated Registration Buttons (+ Register Button Style) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dedicated Doctor Registration Button */}
            <button
              onClick={() => {
                setDoctorToEdit(null);
                setShowAddDoctorModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer active:scale-95"
              title="Register New Physician"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <Stethoscope className="w-4 h-4" />
              <span>Register New Physician</span>
            </button>

            {/* Dedicated Clinical Staff Registration Button */}
            <button
              onClick={() => {
                setStaffToEdit(null);
                setShowAddStaffModal(true);
              }}
              className="px-4 py-2 bg-[#121c33] hover:bg-[#182542] text-cyan-300 rounded-xl font-bold text-xs flex items-center gap-2 border border-cyan-500/40 shadow-md transition cursor-pointer active:scale-95"
              title="Register New Clinical Staff"
            >
              <Plus className="w-4 h-4 text-cyan-300 stroke-[2.5]" />
              <UserCheck className="w-4 h-4 text-cyan-300" />
              <span>Register New Clinical Staff</span>
            </button>
          </div>
        </div>

        {/* Module Navigation Tabs, Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Module Selector Pills */}
          <div className="flex items-center gap-1.5 bg-[#090e1a] p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveModuleTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeModuleTab === 'all'
                  ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Personnel ({doctorsList.length + clinicalStaffList.length})
            </button>
            <button
              onClick={() => setActiveModuleTab('doctors')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModuleTab === 'doctors'
                  ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
              <span>Physicians ({doctorsList.length})</span>
            </button>
            <button
              onClick={() => setActiveModuleTab('staff')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModuleTab === 'staff'
                  ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Clinical Staff ({clinicalStaffList.length})</span>
            </button>
          </div>

          {/* Search & Role Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, specialty, license, email…"
                className="w-full pl-9 pr-3 py-1.5 bg-[#11192c] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 bg-[#11192c] border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
              title="Filter by status"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* ====================================================================
            MODULE A: DOCTORS & PHYSICIANS MODULE
            ==================================================================== */}
        {(activeModuleTab === 'all' || activeModuleTab === 'doctors') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-4 h-4 text-cyan-400" />
                <h4 className="font-extrabold text-sm text-white">
                  Physicians & Outpatient Doctors
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-bold">
                  {filteredDoctors.length} Registered
                </span>
              </div>
              <button
                onClick={() => {
                  setDoctorToEdit(null);
                  setShowAddDoctorModal(true);
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Physician</span>
              </button>
            </div>

            {filteredDoctors.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 text-slate-400">
                No physicians match the current search or filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl border border-slate-800/90 bg-[#121c33]/70 hover:border-cyan-500/40 hover:bg-[#14223d] transition flex flex-col justify-between space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs shadow-cyan-500/20">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-sm text-white">
                              {doc.name}
                            </h5>
                            {getStatusBadge(doc.status)}
                          </div>
                          <p className="text-cyan-300 font-semibold text-[11px] mt-0.5">
                            {doc.specialty || doc.department || 'Outpatient Medicine'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {doc.department || 'Outpatient Clinic'}
                          </p>
                        </div>
                      </div>

                      {/* Edit & Status Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setPermissionTarget(doc)}
                          className="p-1.5 rounded-xl border border-teal-700/60 bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 hover:border-teal-400 transition cursor-pointer"
                          title="Manage Module & Feature Permissions"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditDoctor(doc)}
                          className="p-1.5 rounded-xl border border-slate-700 bg-[#11192c] hover:bg-[#192745] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 transition cursor-pointer"
                          title="Edit Physician Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(doc.id, doc.status)}
                          className="px-2.5 py-1 rounded-xl border border-slate-700 bg-[#11192c] hover:bg-[#192745] text-slate-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          title="Toggle Status (Active / On Leave / Inactive)"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => handleDeleteUser(doc.id, doc.name)}
                          className="p-1.5 rounded-xl border border-slate-700 bg-[#11192c] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 hover:border-rose-500 transition cursor-pointer"
                          title="Archive / Remove Doctor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Credentials */}
                    <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{doc.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{doc.phone || '+63 917 Clinic Line'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileBadge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-mono font-bold text-slate-100 bg-[#090e1a] px-2 py-0.5 rounded border border-slate-800">
                          {doc.licenseNumber || 'PRC-VERIFIED'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          {doc.hoursLabel || '8:00 AM – 5:00 PM'}
                        </span>
                      </div>
                    </div>

                    {/* Schedule & Notes */}
                    <div className="flex items-center justify-between text-[11px] bg-[#090e1a] p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-slate-200">
                          {doc.workDaysLabel || 'Mon – Fri Clinic Hours'}
                        </span>
                      </div>
                      {doc.notes && (
                        <span className="text-slate-400 italic truncate max-w-[160px]" title={doc.notes}>
                          "{doc.notes}"
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            MODULE B: CLINICAL STAFF MODULE
            (Nurse, Receptionist, Lab Tech, Pharmacist)
            ==================================================================== */}
        {(activeModuleTab === 'all' || activeModuleTab === 'staff') && (
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <h4 className="font-extrabold text-sm text-white">
                  Clinical Staff Accounts (Nursing, Admissions, Diagnostics, Pharmacy)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-950/70 text-blue-300 border border-blue-500/40 font-bold">
                  {filteredStaff.length} Members
                </span>
              </div>

              {/* Quick Role Filter for Staff */}
              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="py-1 px-3 bg-[#11192c] border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                >
                  <option value="ALL">All Clinical Roles</option>
                  <option value="nurse">Nurses (RN)</option>
                  <option value="receptionist">Receptionists</option>
                  <option value="lab_technician">Lab Technicians (RMT)</option>
                  <option value="pharmacist">Pharmacists (RPh)</option>
                </select>

                <button
                  onClick={() => {
                    setStaffToEdit(null);
                    setShowAddStaffModal(true);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff Member</span>
                </button>
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 text-slate-400">
                No clinical staff accounts found under the current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStaff.map((staff) => {
                  const roleBadge = getRoleBadge(staff.role);
                  return (
                    <div
                      key={staff.id}
                      className="p-4 rounded-2xl border border-slate-800/90 bg-[#121c33]/70 hover:border-cyan-500/40 hover:bg-[#14223d] transition flex flex-col justify-between space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs shadow-blue-500/20">
                            {staff.role === 'nurse' && '🩺'}
                            {staff.role === 'receptionist' && '📋'}
                            {staff.role === 'lab_technician' && '🔬'}
                            {staff.role === 'pharmacist' && '💊'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-sm text-white">
                                {staff.name}
                              </h5>
                              {getStatusBadge(staff.status)}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadge.color}`}>
                                {roleBadge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {staff.department || 'Outpatient Clinical Operations'}
                            </p>
                          </div>
                        </div>

                        {/* Edit & Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setPermissionTarget(staff)}
                            className="p-1.5 rounded-xl border border-teal-700/60 bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 hover:border-teal-400 transition cursor-pointer"
                            title="Manage Module & Feature Permissions"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditStaff(staff)}
                            className="p-1.5 rounded-xl border border-slate-700 bg-[#11192c] hover:bg-[#192745] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 transition cursor-pointer"
                            title="Edit Staff Member Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(staff.id, staff.status)}
                            className="px-2.5 py-1 rounded-xl border border-slate-700 bg-[#11192c] hover:bg-[#192745] text-slate-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                            title="Toggle Status (Active / On Leave / Inactive)"
                          >
                            Status
                          </button>
                          <button
                            onClick={() => handleDeleteUser(staff.id, staff.name)}
                            className="p-1.5 rounded-xl border border-slate-700 bg-[#11192c] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 hover:border-rose-500 transition cursor-pointer"
                            title="Remove Staff Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact & Credentials */}
                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate">{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{staff.phone || '+63 917 Clinic Line'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileBadge className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-mono text-slate-100 bg-[#090e1a] px-2 py-0.5 rounded border border-slate-800">
                            {staff.licenseNumber || staff.credentials || 'PRC Standard'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>RBAC Active</span>
                        </div>
                      </div>

                      {/* Notes / Shifts */}
                      {staff.notes && (
                        <div className="text-[11px] bg-[#090e1a] p-2.5 rounded-xl border border-slate-800 text-slate-400 italic">
                          "{staff.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==========================================================================
          SECTION 3: DATA PRIVACY & COMPLIANCE AUDIT LOGS
          ========================================================================== */}
      <div className="bg-[#0e1628]/90 backdrop-blur-md rounded-3xl border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/30 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-xs shadow-purple-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">{t.admin.complianceAudit}</h3>
              <p className="text-[11px] text-slate-400">Cryptographically verifiable, tamper-evident security audit trail (RA 10173)</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer flex items-center gap-1.5 transition"
          >
            <span>{isFil ? 'Tingnan ang Lahat ng Tala' : 'View Full Logs'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 font-mono text-[11px]">
          {auditLogs.slice(0, 6).map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-2xl border border-slate-800/90 bg-[#121c33]/70 flex flex-col justify-between gap-2 shadow-xs"
            >
              <div className="flex items-center justify-between text-slate-200">
                <span className="font-bold text-cyan-400 truncate max-w-[160px]">{log.action}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-slate-300 font-sans text-xs leading-relaxed">{log.description}</p>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                <span>Actor: <span className="text-slate-300">{log.userName}</span></span>
                <span>IP: <span className="text-slate-300">{log.ipAddress || '—'}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal 1: Doctor Registration & Editing */}
      <AddDoctorModal
        isOpen={showAddDoctorModal}
        onClose={() => {
          setShowAddDoctorModal(false);
          setDoctorToEdit(null);
        }}
        doctorToEdit={doctorToEdit}
      />

      {/* Modal 2: Clinical Staff Registration & Editing */}
      <AddStaffModal
        isOpen={showAddStaffModal}
        onClose={() => {
          setShowAddStaffModal(false);
          setStaffToEdit(null);
        }}
        staffToEdit={staffToEdit}
      />

      {/* Modal 3: Role & Module Permission Configuration */}
      <StaffPermissionsModal
        isOpen={Boolean(permissionTarget)}
        onClose={() => setPermissionTarget(null)}
        targetUser={permissionTarget}
      />
    </div>
  );
};
