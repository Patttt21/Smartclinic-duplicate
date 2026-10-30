import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Stethoscope,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  FileBadge,
  Building2,
  Activity,
  FileText,
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { useToast } from '../../context/ToastContext';
import type { User } from '../../types/clinic';

interface AddDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorToEdit?: User | null;
}

const DEPARTMENTS = [
  'Internal Medicine',
  'Cardiology',
  'Pediatrics',
  'Dermatology',
  'Pulmonology',
  'Orthopedics',
  'Obstetrics & Gynecology',
  'Neurology',
  'General Surgery',
  'Family Medicine',
  'Ophthalmology',
  'Otolaryngology (ENT)',
  'Emergency & Urgent Care',
];

const DAY_LABELS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

export const AddDoctorModal: React.FC<AddDoctorModalProps> = ({
  isOpen,
  onClose,
  doctorToEdit,
}) => {
  const { addDoctor, updateDoctor, users } = useClinic();
  const { success: toastSuccess, error: toastError } = useToast();

  const isEditMode = Boolean(doctorToEdit);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Internal Medicine');
  const [specialty, setSpecialty] = useState('Internal Medicine & Primary Care');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Inactive'>('Active');
  const [notes, setNotes] = useState('');
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon - Fri
  const [startHour, setStartHour] = useState<number>(8); // 8 AM
  const [endHour, setEndHour] = useState<number>(17); // 5 PM
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (doctorToEdit) {
      setName(doctorToEdit.name || '');
      setEmail(doctorToEdit.email || '');
      setPhone(doctorToEdit.phone || '');
      setDepartment(doctorToEdit.department || 'Internal Medicine');
      setSpecialty(doctorToEdit.specialty || `${doctorToEdit.department || 'Internal Medicine'} Specialist`);
      setLicenseNumber(doctorToEdit.licenseNumber || '');
      setStatus(doctorToEdit.status || 'Active');
      setNotes(doctorToEdit.notes || '');
      if (Array.isArray(doctorToEdit.workDays) && doctorToEdit.workDays.length > 0) {
        setWorkDays(doctorToEdit.workDays);
      } else {
        setWorkDays([1, 2, 3, 4, 5]);
      }
      setStartHour(doctorToEdit.startHour ?? 8);
      setEndHour(doctorToEdit.endHour ?? 17);
    } else {
      setName('');
      setEmail('');
      setPhone('+63 917 ');
      setDepartment('Internal Medicine');
      setSpecialty('Internal Medicine & Primary Care');
      setLicenseNumber('');
      setStatus('Active');
      setNotes('');
      setWorkDays([1, 2, 3, 4, 5]);
      setStartHour(8);
      setEndHour(17);
    }
    setError('');
  }, [doctorToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    if (workDays.includes(day)) {
      if (workDays.length === 1) {
        setError('At least one working clinic day is required.');
        return;
      }
      setWorkDays(workDays.filter((d) => d !== day));
    } else {
      setWorkDays([...workDays, day].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)));
    }
  };

  const applyPreset = (preset: 'mon_fri' | 'tue_sat' | 'mon_wed_fri' | 'all_week') => {
    if (preset === 'mon_fri') setWorkDays([1, 2, 3, 4, 5]);
    if (preset === 'tue_sat') setWorkDays([2, 3, 4, 5, 6]);
    if (preset === 'mon_wed_fri') setWorkDays([1, 3, 5]);
    if (preset === 'all_week') setWorkDays([1, 2, 3, 4, 5, 6]);
  };

  const handleDepartmentChange = (dept: string) => {
    setDepartment(dept);
    if (!specialty || specialty.includes('Medicine') || specialty.includes('Practice') || specialty.includes('Specialist')) {
      setSpecialty(`${dept} Specialist`);
    }
  };

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanLicense = licenseNumber.trim();
    const cleanSpecialty = specialty.trim();

    // 1. Required fields validation
    if (!cleanName || cleanName.length < 3) {
      setError('Physician full name is required (e.g., Dr. Alexander Reyes, MD).');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid professional email address.');
      return;
    }
    if (!cleanSpecialty) {
      setError('Clinical specialty cannot be empty.');
      return;
    }
    if (!cleanLicense) {
      setError('PRC License number / Credential ID is required for physician privileging.');
      return;
    }

    // 2. Prevent duplicate emails
    const duplicateEmail = users.some(
      (u) => u.email.toLowerCase() === cleanEmail && (!isEditMode || u.id !== doctorToEdit?.id)
    );
    if (duplicateEmail) {
      setError(`The email "${cleanEmail}" is already registered to another staff or doctor.`);
      return;
    }

    if (workDays.length === 0) {
      setError('Select at least one active clinic day.');
      return;
    }
    if (startHour >= endHour) {
      setError('Working end time must be after start time.');
      return;
    }

    setLoading(true);
    try {
      const formattedName = cleanName.toLowerCase().startsWith('dr.') ? cleanName : `Dr. ${cleanName}`;

      if (isEditMode && doctorToEdit) {
        const res = await updateDoctor(doctorToEdit.id, {
          name: formattedName,
          email: cleanEmail,
          phone: phone.trim() || undefined,
          department,
          specialty: cleanSpecialty,
          licenseNumber: cleanLicense,
          status,
          notes: notes.trim() || undefined,
          workDays,
          startHour,
          endHour,
        });

        setLoading(false);
        if (!res.success) {
          setError(res.error || 'Failed to update physician.');
          toastError(res.error || 'Failed to update physician.');
          return;
        }

        toastSuccess(`Physician profile for ${formattedName} successfully updated!`);
        onClose();
      } else {
        const res = await addDoctor({
          name: formattedName,
          email: cleanEmail,
          phone: phone.trim() || undefined,
          department,
          specialty: cleanSpecialty,
          licenseNumber: cleanLicense,
          status,
          notes: notes.trim() || undefined,
          workDays,
          startHour,
          endHour,
        });

        setLoading(false);
        if (!res.success) {
          setError(res.error || 'Failed to save doctor.');
          toastError(res.error || 'Failed to save doctor.');
          return;
        }

        toastSuccess(`${formattedName} successfully registered and open for appointment booking!`);
        onClose();
      }
    } catch {
      setLoading(false);
      setError('Unable to save physician profile. Please try again.');
      toastError('Failed to save physician.');
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
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditMode ? 'Edit Physician Details & Credentials' : 'Register New Physician'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PRC Registered Medical Specialist • Outpatient Consultation & Clinical Privileges
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name & Medical Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Alexander Reyes, MD, FPCP"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Professional Email *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alexander.reyes@smartclinic.ph"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Contact Phone</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 917 111 0001"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Clinical Department *</span>
              </label>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Specialty / Subspecialty *</span>
              </label>
              <input
                type="text"
                required
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Cardiology & Interventional"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileBadge className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>PRC License Number / ID *</span>
              </label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="PRC-0089241"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Operational Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-semibold"
              >
                <option value="Active">Active (Accepting Consultations)</option>
                <option value="On Leave">On Leave (Temporarily Unavailable)</option>
                <option value="Inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {/* Working Days & Schedule */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Working Clinic Days</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset('mon_fri')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-500 cursor-pointer"
                >
                  Mon–Fri
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('tue_sat')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-500 cursor-pointer"
                >
                  Tue–Sat
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('mon_wed_fri')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-500 cursor-pointer"
                >
                  MWF
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 justify-between">
              {DAY_LABELS.map(({ day, label }) => {
                const isSelected = workDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>Start Time</span>
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs"
                >
                  {[7, 8, 9, 10, 11, 12, 13].map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>End Time</span>
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs"
                >
                  {[12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 text-[11px] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>
                Schedule: <strong>{formatHour(startHour)} – {formatHour(endHour)}</strong> • Dynamic 30-min booking slots generated in real-time.
              </span>
            </div>
          </div>

          {/* Notes & Privileges */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Clinical Privileges & Notes</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Consultation Room 204, PhilHealth Accredited Provider, Maxicare & Intellicare partner."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted under RA 10173 • Live Sync</span>
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
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? 'Saving…'
                    : isEditMode
                    ? 'Save Changes'
                    : 'Register Physician'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
