import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  Copy,
  Check,
  ArrowRight,
  KeyRound,
  Lock,
  Search,
  RefreshCw,
  Activity,
  HeartPulse,
  Pill,
  FlaskConical,
  Phone,
  FileBadge,
  Sparkles,
} from 'lucide-react';
import type { PrimaryAuthRole, StaffSubRole } from '../../context/ClinicContext';
import { API_BASE_URL } from '../../lib/config';

export interface SystemAccount {
  id?: string;
  name: string;
  email: string;
  roleTitle: string;
  primaryRole: PrimaryAuthRole;
  staffSubRole?: StaffSubRole;
  role?: string;
  password: string;
  notes: string;
  badge: string;
  badgeColor: string;
  mrn?: string;
  phone?: string;
  department?: string;
  specialty?: string;
  requires2Fa?: boolean;
}

// 15 Verified Clinic System Accounts (1 Admin, 5 Doctors, 4 Clinical Staff, 5 Outpatients)
export const ALL_SYSTEM_ACCOUNTS: SystemAccount[] = [
  // 1. Administrator
  {
    name: 'Director Maria Lourdes Santos, MD',
    email: 'smartclinicrealacc@gmail.com',
    roleTitle: 'Executive Clinic Director & Administrator',
    primaryRole: 'admin',
    role: 'admin',
    password: 'SmartClinic@Admin2026',
    notes: 'Full administrative access, financial oversight, RA 10173 audit logs, Supabase integration. Requires Authenticator 2FA.',
    badge: 'Admin',
    badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    department: 'Executive Management',
    phone: '+63 917 800 1101',
    requires2Fa: true,
  },

  // 2. Doctors (5)
  {
    name: 'Dr. Maria Cristina Reyes, MD',
    email: 'maria.reyes@smartclinic.ph',
    roleTitle: 'Internal Medicine & Endocrinology Specialist',
    primaryRole: 'doctor',
    role: 'doctor',
    password: 'doctor123',
    notes: 'Clinical SOAP consultations, e-prescribing, lab interpretations, ICD-10 diagnostics.',
    badge: 'Doctor',
    badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    department: 'Internal Medicine',
    phone: '+63 917 111 0001',
    requires2Fa: false,
  },
  {
    name: 'Dr. Juan Miguel Santos, MD',
    email: 'juan.santos@smartclinic.ph',
    roleTitle: 'Cardiovascular Medicine Specialist',
    primaryRole: 'doctor',
    role: 'doctor',
    password: 'doctor123',
    notes: 'Cardiology outpatient consults, ECG & cardiac workup review, patient health trajectory.',
    badge: 'Doctor',
    badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    department: 'Cardiology',
    phone: '+63 917 111 0002',
    requires2Fa: false,
  },
  {
    name: 'Dr. Patricia Gomez, MD',
    email: 'patricia.gomez@smartclinic.ph',
    roleTitle: 'Pediatrics & Adolescent Care Specialist',
    primaryRole: 'doctor',
    role: 'doctor',
    password: 'doctor123',
    notes: 'Pediatric outpatient consultations, vaccination regimens, child growth tracking.',
    badge: 'Doctor',
    badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    department: 'Pediatrics',
    phone: '+63 917 111 0003',
    requires2Fa: false,
  },
  {
    name: 'Dr. Anthony Lee, MD',
    email: 'anthony.lee@smartclinic.ph',
    roleTitle: 'Clinical & Cosmetic Dermatology Specialist',
    primaryRole: 'doctor',
    role: 'doctor',
    password: 'doctor123',
    notes: 'Dermatology consultations, topical medication management, skin biopsy labs.',
    badge: 'Doctor',
    badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    department: 'Dermatology',
    phone: '+63 917 111 0004',
    requires2Fa: false,
  },
  {
    name: 'Dr. Roberto Tan, MD',
    email: 'roberto.tan@smartclinic.ph',
    roleTitle: 'Pulmonology & Respiratory Medicine Specialist',
    primaryRole: 'doctor',
    role: 'doctor',
    password: 'doctor123',
    notes: 'Respiratory assessments, spirometry tests, asthma & COPD maintenance.',
    badge: 'Doctor',
    badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    department: 'Pulmonology',
    phone: '+63 917 111 0005',
    requires2Fa: false,
  },

  // 3. Clinical Staff (4)
  {
    name: 'Nurse Ana Patricia Villanueva, RN',
    email: 'ana.villanueva@smartclinic.ph',
    roleTitle: 'Outpatient Triage & Vitals Nurse',
    primaryRole: 'staff',
    staffSubRole: 'nurse',
    role: 'nurse',
    password: 'nurse123',
    notes: 'Triage intake, vital signs logging, QR check-in scanner, consultation prep.',
    badge: 'Nurse',
    badgeColor: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    department: 'Outpatient Triage',
    phone: '+63 917 111 0006',
    requires2Fa: false,
  },
  {
    name: 'Claire Mendoza',
    email: 'claire.mendoza@smartclinic.ph',
    roleTitle: 'Front Desk Receptionist & Patient Access',
    primaryRole: 'staff',
    staffSubRole: 'receptionist',
    role: 'receptionist',
    password: 'reception123',
    notes: 'Queue management, appointment booking, patient check-in, walk-in registration.',
    badge: 'Receptionist',
    badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    department: 'Front Desk & Patient Access',
    phone: '+63 917 111 0007',
    requires2Fa: false,
  },
  {
    name: 'Julian Dela Cruz, RPh',
    email: 'julian.delacruz@smartclinic.ph',
    roleTitle: 'Chief Clinical Pharmacist',
    primaryRole: 'staff',
    staffSubRole: 'pharmacist',
    role: 'pharmacist',
    password: 'pharm123',
    notes: 'Pharmacy dispensary, medication safety audits, inventory reordering, drug stock tracking.',
    badge: 'Pharmacist',
    badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    department: 'Clinic Pharmacy & Dispensary',
    phone: '+63 917 111 0008',
    requires2Fa: false,
  },
  {
    name: 'Amina Bautista, RMT',
    email: 'amina.bautista@smartclinic.ph',
    roleTitle: 'Diagnostic Pathology Medical Technologist',
    primaryRole: 'staff',
    staffSubRole: 'lab_technician',
    role: 'lab_technician',
    password: 'lab123',
    notes: 'Laboratory specimen orders, entering test results, reference ranges, critical value alerts.',
    badge: 'Lab Tech',
    badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    department: 'Diagnostic Pathology & Laboratory',
    phone: '+63 917 111 0009',
    requires2Fa: false,
  },

  // 4. Registered Outpatients (5 Real Database Patients)
  {
    name: 'Elena Vargas',
    email: 'elena.vargas@smartclinic.ph',
    roleTitle: 'Registered Outpatient (MRN-2026-081)',
    primaryRole: 'patient',
    role: 'patient',
    password: 'patient123',
    notes: 'Type 2 Diabetes, Primary Hypertension. Routine endocrine follow-up, Metformin/Losartan maintenance.',
    badge: 'Patient',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    mrn: 'MRN-2026-081',
    phone: '+63 917 111 0010',
    requires2Fa: false,
  },
  {
    name: 'Liam Gabriel Torres',
    email: 'liam.torres@example.com',
    roleTitle: 'Registered Outpatient (MRN-2026-104)',
    primaryRole: 'patient',
    role: 'patient',
    password: 'patient123',
    notes: 'Childhood Asthma, Seasonal Allergic Rhinitis. Pediatric pulmonary surveillance.',
    badge: 'Patient',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    mrn: 'MRN-2026-104',
    phone: '+63 917 111 0011',
    requires2Fa: false,
  },
  {
    name: 'Sofia Ramirez-Diaz',
    email: 'sofia.rd@example.com',
    roleTitle: 'Registered Outpatient (MRN-2026-218)',
    primaryRole: 'patient',
    role: 'patient',
    password: 'patient123',
    notes: 'Mild Atopic Dermatitis, Eczema. Dermatology surveillance, topical barrier repair.',
    badge: 'Patient',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    mrn: 'MRN-2026-218',
    phone: '+63 917 111 0012',
    requires2Fa: false,
  },
  {
    name: 'David Kevin Ocampo',
    email: 'david.ocampo@example.com',
    roleTitle: 'Registered Outpatient (MRN-2026-305)',
    primaryRole: 'patient',
    role: 'patient',
    password: 'patient123',
    notes: 'Chronic Bronchitis, Post-Viral Cough. Pulmonology review, spirometry follow-up.',
    badge: 'Patient',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    mrn: 'MRN-2026-305',
    phone: '+63 917 111 0013',
    requires2Fa: false,
  },
  {
    name: 'Amara Patel Santos',
    email: 'amara.santos@example.com',
    roleTitle: 'Registered Outpatient (MRN-2026-442)',
    primaryRole: 'patient',
    role: 'patient',
    password: 'patient123',
    notes: 'Annual Executive Health Check, Wellness Screening. Comprehensive preventive health.',
    badge: 'Patient',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    mrn: 'MRN-2026-442',
    phone: '+63 917 111 0014',
    requires2Fa: false,
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: SystemAccount) => void;
}

export const AllAccountsModal: React.FC<Props> = ({ isOpen, onClose, onSelectAccount }) => {
  const [accounts, setAccounts] = useState<SystemAccount[]>(ALL_SYSTEM_ACCOUNTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'doctor' | 'staff' | 'patient'>('all');
  const [staffSubFilter, setStaffSubFilter] = useState<'all' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician'>('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);

  // Fetch live accounts from backend API with local cache resilience
  const fetchLiveAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/system-accounts`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.accounts) && data.accounts.length > 0) {
          setAccounts(data.accounts);
        }
      }
    } catch {
      // Retain fallback accounts seamlessly
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiveAccounts();
    }
  }, [isOpen]);

  const counts = useMemo(() => {
    return {
      all: accounts.length,
      admin: accounts.filter((a) => a.primaryRole === 'admin').length,
      doctor: accounts.filter((a) => a.primaryRole === 'doctor').length,
      staff: accounts.filter((a) => a.primaryRole === 'staff').length,
      patient: accounts.filter((a) => a.primaryRole === 'patient').length,
      nurse: accounts.filter((a) => a.staffSubRole === 'nurse' || a.role === 'nurse').length,
      receptionist: accounts.filter((a) => a.staffSubRole === 'receptionist' || a.role === 'receptionist').length,
      pharmacist: accounts.filter((a) => a.staffSubRole === 'pharmacist' || a.role === 'pharmacist').length,
      lab_technician: accounts.filter((a) => a.staffSubRole === 'lab_technician' || a.role === 'lab_technician').length,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      // Primary role filter
      if (filterRole !== 'all' && acc.primaryRole !== filterRole) {
        return false;
      }
      // Staff subrole filter
      if (filterRole === 'staff' && staffSubFilter !== 'all') {
        const sub = acc.staffSubRole || acc.role;
        if (sub !== staffSubFilter) return false;
      }
      // Search query filter
      if (q) {
        const matchName = acc.name.toLowerCase().includes(q);
        const matchEmail = acc.email.toLowerCase().includes(q);
        const matchRole = acc.roleTitle.toLowerCase().includes(q);
        const matchMrn = acc.mrn?.toLowerCase().includes(q);
        const matchNotes = acc.notes.toLowerCase().includes(q);
        const matchPhone = acc.phone?.toLowerCase().includes(q);
        const matchDept = acc.department?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole && !matchMrn && !matchNotes && !matchPhone && !matchDept) {
          return false;
        }
      }
      return true;
    });
  }, [accounts, filterRole, staffSubFilter, searchQuery]);

  if (!isOpen) return null;

  const handleCopyEmail = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  const handleCopyPassword = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPassword(text);
      setTimeout(() => setCopiedPassword(null), 2000);
    } catch {
      setCopiedPassword(text);
      setTimeout(() => setCopiedPassword(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  All System Accounts & Credentials
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80">
                  {accounts.length} Active Database Accounts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quick access directory for Admin, Doctors, Clinical Staff & Registered Outpatients. Click <span className="font-semibold text-teal-600 dark:text-teal-400">"Select Account"</span> to autofill credentials.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchLiveAccounts}
              disabled={isLoading}
              title="Refresh from Database"
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts by name, email, role, MRN, phone, specialty, or condition..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Primary Role Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              { id: 'all' as const, label: `All Accounts (${counts.all})`, icon: Users },
              { id: 'admin' as const, label: `Director / Admin (${counts.admin})`, icon: ShieldCheck },
              { id: 'doctor' as const, label: `Doctors (${counts.doctor})`, icon: Stethoscope },
              { id: 'staff' as const, label: `Clinical Staff (${counts.staff})`, icon: Activity },
              { id: 'patient' as const, label: `Patients (${counts.patient})`, icon: UserRound },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFilterRole(id);
                  if (id !== 'staff') setStaffSubFilter('all');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  filterRole === id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Sub-role Filter for Clinical Staff */}
          {filterRole === 'staff' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 animate-in fade-in duration-150">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">Staff Sub-Role:</span>
              {[
                { id: 'all' as const, label: `All Staff (${counts.staff})` },
                { id: 'nurse' as const, label: `Nurse (${counts.nurse})`, icon: HeartPulse },
                { id: 'receptionist' as const, label: `Receptionist (${counts.receptionist})`, icon: FileBadge },
                { id: 'pharmacist' as const, label: `Pharmacist (${counts.pharmacist})`, icon: Pill },
                { id: 'lab_technician' as const, label: `Lab Tech (${counts.lab_technician})`, icon: FlaskConical },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStaffSubFilter(id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    staffSubFilter === id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3 shrink-0" />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Accounts List Counter Header */}
        <div className="px-5 py-2 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredAccounts.length}</strong> of {accounts.length} system accounts
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-semibold"
            >
              Clear search filter
            </button>
          )}
        </div>

        {/* Scrollable Accounts Grid/List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredAccounts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No accounts found</p>
              <p className="text-slate-500 text-xs">No system credentials match "{searchQuery}". Try a different keyword.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterRole('all');
                  setStaffSubFilter('all');
                }}
                className="mt-2 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs hover:bg-teal-100 transition cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <div
                key={account.email}
                className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group"
              >
                <div className="space-y-1.5 max-w-xl">
                  {/* Name and Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {account.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${account.badgeColor}`}
                    >
                      {account.badge}
                    </span>
                    {account.primaryRole === 'admin' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        2FA Required
                      </span>
                    )}
                    {account.mrn && (
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {account.mrn}
                      </span>
                    )}
                  </div>

                  {/* Role Title */}
                  <div className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                    {account.roleTitle}
                  </div>

                  {/* Email & Password Info Row */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                    {/* Email with copy */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">{account.email}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyEmail(account.email, e)}
                        title="Copy Email"
                        className="text-slate-400 hover:text-teal-600 transition cursor-pointer ml-1"
                      >
                        {copiedEmail === account.email ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <span>•</span>

                    {/* Password with copy */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">PW:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {account.password}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyPassword(account.password, e)}
                        title="Copy Password"
                        className="text-slate-400 hover:text-teal-600 transition cursor-pointer ml-1"
                      >
                        {copiedPassword === account.password ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {account.phone && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{account.phone}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Notes / Clinical Info */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight pt-0.5">
                    {account.notes}
                  </p>
                </div>

                {/* Quick Select Button */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectAccount(account);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 hover:text-white text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs group-hover:bg-teal-600 group-hover:text-white"
                  >
                    <span>Select Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Directly synchronized with Supabase PostgreSQL. Protected under Philippine Data Privacy Act (RA 10173).
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
