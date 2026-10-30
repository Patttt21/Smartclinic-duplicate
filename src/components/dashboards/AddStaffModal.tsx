import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Users,
  ShieldCheck,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  FileBadge,
  KeyRound,
  Activity,
  FileText,
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { useToast } from '../../context/ToastContext';
import type { User } from '../../types/clinic';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: User | null;
}

type StaffRoleKey = 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';

interface RoleOption {
  key: StaffRoleKey;
  label: string;
  defaultDepartment: string;
  badge: string;
  icon: string;
}

const STAFF_ROLES: RoleOption[] = [
  { key: 'nurse', label: 'Nurse (RN / Clinical Triage)', defaultDepartment: 'Outpatient Triage & Vitals', badge: 'RN', icon: '🩺' },
  { key: 'receptionist', label: 'Receptionist (Front Desk & Admissions)', defaultDepartment: 'Front Desk & Patient Access', badge: 'ACCESS', icon: '📋' },
  { key: 'lab_technician', label: 'Lab Technician (Medical Technologist - RMT)', defaultDepartment: 'Diagnostic Pathology & Laboratory', badge: 'RMT', icon: '🔬' },
  { key: 'pharmacist', label: 'Pharmacist (Clinical Pharmacist - RPh)', defaultDepartment: 'Clinic Pharmacy & Dispensary', badge: 'RPh', icon: '💊' },
];

const DEPARTMENTS = [
  'Outpatient Triage & Vitals',
  'Front Desk & Patient Access',
  'Clinic Pharmacy & Dispensary',
  'Diagnostic Pathology & Laboratory',
  'Emergency & Urgent Care',
  'Day Surgery & Recovery',
  'Cardiology Diagnostics',
  'Clinical Administration',
];

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  staffToEdit,
}) => {
  const { addClinicalStaff, updateClinicalStaff, users } = useClinic();
  const { success: toastSuccess, error: toastError } = useToast();

  const isEditMode = Boolean(staffToEdit);

  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRoleKey>('nurse');
  const [department, setDepartment] = useState('Outpatient Triage & Vitals');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Inactive'>('Active');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (staffToEdit) {
      setName(staffToEdit.name || '');
      setRole((staffToEdit.role as StaffRoleKey) || 'nurse');
      setDepartment(staffToEdit.department || 'Outpatient Triage & Vitals');
      setEmail(staffToEdit.email || '');
      setPhone(staffToEdit.phone || '');
      setLicenseNumber(staffToEdit.licenseNumber || staffToEdit.credentials || '');
      setTemporaryPassword(staffToEdit.temporaryPassword || staffToEdit.accessCode || '');
      setStatus(staffToEdit.status || 'Active');
      setNotes(staffToEdit.notes || '');
    } else {
      setName('');
      setRole('nurse');
      setDepartment('Outpatient Triage & Vitals');
      setEmail('');
      setPhone('+63 917 ');
      setLicenseNumber('');
      setTemporaryPassword('SmartClinic@2026');
      setStatus('Active');
      setNotes('');
    }
    setError('');
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: StaffRoleKey) => {
    setRole(newRole);
    const found = STAFF_ROLES.find((r) => r.key === newRole);
    if (found && !department) {
      setDepartment(found.defaultDepartment);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDept = department.trim();

    // 1. Required fields
    if (!cleanName || cleanName.length < 2) {
      setError('Staff member full name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please provide a valid clinic or institutional email address.');
      return;
    }
    if (!cleanDept) {
      setError('Clinical department assignment is required.');
      return;
    }

    // 2. Prevent duplicate email
    const duplicateEmail = users.some(
      (u) => u.email.toLowerCase() === cleanEmail && (!isEditMode || u.id !== staffToEdit?.id)
    );
    if (duplicateEmail) {
      setError(`The email address "${cleanEmail}" is already assigned to another account.`);
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && staffToEdit) {
        const res = await updateClinicalStaff(staffToEdit.id, {
          name: cleanName,
          role,
          department: cleanDept,
          email: cleanEmail,
          phone: phone.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          credentials: licenseNumber.trim() || undefined,
          temporaryPassword: temporaryPassword.trim() || undefined,
          status,
          notes: notes.trim() || undefined,
        });

        setLoading(false);
        if (!res.success) {
          setError(res.error || 'Failed to update staff member.');
          toastError(res.error || 'Failed to update staff member.');
          return;
        }

        toastSuccess(`Clinical staff record for ${cleanName} successfully updated!`);
        onClose();
      } else {
        const res = await addClinicalStaff({
          name: cleanName,
          role,
          department: cleanDept,
          email: cleanEmail,
          phone: phone.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          credentials: licenseNumber.trim() || undefined,
          temporaryPassword: temporaryPassword.trim() || undefined,
          status,
          notes: notes.trim() || undefined,
        });

        setLoading(false);
        if (!res.success) {
          setError(res.error || 'Failed to register clinical staff.');
          toastError(res.error || 'Failed to register clinical staff.');
          return;
        }

        toastSuccess(`Staff member ${cleanName} successfully registered in roster!`);
        onClose();
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred while saving staff details.');
      toastError('Failed to save staff member.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditMode ? 'Edit Clinical Staff Details' : 'Register New Clinical Staff'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role-Based Access for Nurses, Receptionists, Lab Technicians, and Pharmacists
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection Segment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <span>Clinical Staff Role *</span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                (Enforces strict RBAC privileges under RA 10173)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STAFF_ROLES.map((r) => {
                const isSelected = role === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => handleRoleChange(r.key)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">{r.icon}</span>
                      <span className="text-xs font-bold truncate">{r.label.split('(')[0].trim()}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {r.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name & Credentials *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Teresa Santos, RN"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Clinic Email *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teresa.santos@smartclinic.ph"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Phone / Extension</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 917 111 0006"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Department / Station *</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileBadge className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Credentials / License ID</span>
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. RN-382914, RPh-102948, RMT-559102"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Temporary Password / Access Code</span>
              </label>
              <input
                type="text"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="SmartClinic@2026"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Account Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-semibold"
              >
                <option value="Active">Active (Full Operational Access)</option>
                <option value="On Leave">On Leave (Temporarily Inactive)</option>
                <option value="Inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Operational Notes & Shift Assignments</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Day Shift 7:00 AM - 3:00 PM, assigned to Outpatient Triage Booth A."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Complies with RA 10173 Healthcare Access Control</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-60"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? 'Saving…'
                    : isEditMode
                    ? 'Save Staff Changes'
                    : 'Register Clinical Staff'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
