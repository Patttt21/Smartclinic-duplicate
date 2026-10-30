import React, { useState, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { useToast } from '../../context/ToastContext';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  Shield,
  Lock,
  Plus,
  Trash2,
  Camera,
  FileText,
  Pill,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Save,
  Calendar,
} from 'lucide-react';
import type { Patient, Allergy } from '../../types/clinic';

interface Props {
  onClose: () => void;
}

export const PatientProfileSettingsModal: React.FC<Props> = ({ onClose }) => {
  const {
    patients,
    linkedPatientId,
    currentUser,
    updatePatient,
    consultations,
    prescriptions,
    labOrders,
  } = useClinic();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active patient profile
  const patient =
    patients.find((p) => p.id === linkedPatientId) ||
    patients.find((p) => p.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
    patients[0];

  const [activeTab, setActiveTab] = useState<'profile' | 'emergency' | 'emr' | 'clinical'>('profile');

  // Form states
  const [fullName, setFullName] = useState(patient?.fullName || '');
  const [email, setEmail] = useState(patient?.email || '');
  const [phone, setPhone] = useState(patient?.phone || '');
  const [address, setAddress] = useState(patient?.address || '');
  const [bloodType, setBloodType] = useState<Patient['bloodType']>(patient?.bloodType || 'O+');
  const [dob, setDob] = useState(patient?.dob || '1990-01-01');
  const [gender, setGender] = useState<Patient['gender']>(patient?.gender || 'Female');
  const [avatar, setAvatar] = useState<string>(patient?.avatar || currentUser.avatar || '');

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState(patient?.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(patient?.emergencyContact?.relationship || '');
  const [emergencyPhone, setEmergencyPhone] = useState(patient?.emergencyContact?.phone || '');

  // Allergies
  const [allergies, setAllergies] = useState<Allergy[]>(patient?.allergies || []);
  const [newAllergen, setNewAllergen] = useState('');
  const [newSeverity, setNewSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [newReaction, setNewReaction] = useState('');

  // Medical history / chronic conditions
  const [chronicConditions, setChronicConditions] = useState<string[]>(patient?.chronicConditions || []);
  const [newCondition, setNewCondition] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read-only clinical records for this patient
  const patientConsultations = consultations.filter(
    (c) => c.patientId === patient?.id || c.patientName === patient?.fullName
  );
  const patientPrescriptions = prescriptions.filter(
    (p) => p.patientId === patient?.id || p.patientName === patient?.fullName
  );
  const patientLabs = labOrders.filter(
    (l) => l.patientId === patient?.id || l.patientName === patient?.fullName
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size must be under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddAllergy = () => {
    if (!newAllergen.trim()) return;
    setAllergies((prev) => [
      ...prev,
      {
        allergen: newAllergen.trim(),
        severity: newSeverity,
        reaction: newReaction.trim() || 'Documented sensitivity',
      },
    ]);
    setNewAllergen('');
    setNewReaction('');
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCondition = () => {
    if (!newCondition.trim()) return;
    if (chronicConditions.includes(newCondition.trim())) {
      setNewCondition('');
      return;
    }
    setChronicConditions((prev) => [...prev, newCondition.trim()]);
    setNewCondition('');
  };

  const handleRemoveCondition = (index: number) => {
    setChronicConditions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<Patient> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        dob,
        gender,
        bloodType,
        avatar: avatar || undefined,
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelation.trim(),
          phone: emergencyPhone.trim(),
        },
        allergies,
        chronicConditions,
      };

      if (patient?.id) {
        updatePatient(patient.id, updates);
      }

      toast.success('Profile updated successfully');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-lg flex items-center justify-center border-2 border-teal-500/40 shadow-sm">
                {avatar ? (
                  <img src={avatar} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>
                    {fullName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase() || 'P'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-md transition cursor-pointer"
                title="Upload or change profile photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 id="profile-settings-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Profile Settings
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold">
                  {patient?.mrn || 'MRN-2026'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your confidential personal information and electronic medical record preferences.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'emergency'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Emergency Contact</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emr')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'emr'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>EMR & Health Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clinical')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'clinical'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Clinical Records (Read-Only)</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Maria Elena Santos"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. patient@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +63 917 123 4567"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Residential Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Rizal Avenue, Quezon City, Metro Manila"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Photo preview and controls */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center font-bold text-teal-700 dark:text-teal-300 text-xs shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Profile Photo (Optional)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Upload your own picture or use default healthcare avatar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition cursor-pointer"
                  >
                    Upload Photo
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMERGENCY CONTACT */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  This contact will be called immediately by triage staff in the event of an urgent medical situation or hospital referral.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Contact Full Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Roberto Vargas"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    placeholder="e.g. Spouse / Parent / Sibling"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Emergency Phone Number
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="e.g. +63 917 999 8888"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMR & HEALTH DETAILS (Blood type, Allergies, Medical History) */}
          {activeTab === 'emr' && (
            <div className="space-y-5">
              {/* Blood Type */}
              <div className="space-y-1.5 max-w-xs">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Blood Group / Rh Factor
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-teal-700 dark:text-teal-300"
                >
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                </select>
              </div>

              {/* Known Allergies */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Known Drug & Environmental Allergies
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Critical for medication safety checking and e-prescription alerts.
                    </p>
                  </div>
                </div>

                {allergies.length > 0 ? (
                  <div className="space-y-2">
                    {allergies.map((alg, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {alg.allergen}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              alg.severity === 'severe'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : alg.severity === 'moderate'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {alg.severity}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({alg.reaction})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergy(index)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Remove allergy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    No documented allergies. Add any known adverse reactions below.
                  </div>
                )}

                {/* Add Allergy Inline Form */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                  <input
                    type="text"
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value)}
                    placeholder="Allergen (e.g. Penicillin, Peanuts)"
                    className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Allergy</span>
                  </button>
                </div>
              </div>

              {/* Medical History & Chronic Conditions */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Medical History & Chronic Conditions
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Known ongoing diagnoses or medical history (e.g. Hypertension, Asthma, Diabetes).
                  </p>
                </div>

                {chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {chronicConditions.map((cond, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800"
                      >
                        <span>{cond}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(index)}
                          className="hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    No chronic conditions documented.
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Add condition (e.g. Type 2 Diabetes, Migraine)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCondition();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Condition</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLINICAL RECORDS (READ-ONLY) */}
          {activeTab === 'clinical' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold">Protected Clinician Medical Records (Read-Only)</p>
                  <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                    In compliance with the Data Privacy Act (RA 10173) and medical governance standards,
                    physician notes, digital prescription regimens, and certified diagnostic lab interpretations
                    are strictly read-only for patient accounts. Please schedule a consultation with your doctor
                    if changes are required.
                  </p>
                </div>
              </div>

              {/* Consultation / Doctor Notes */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Clinical Consultations & Physician Notes ({patientConsultations.length})</span>
                </div>
                {patientConsultations.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientConsultations.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                          <span>{c.date} · {c.doctorName}</span>
                          <span className="font-mono bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded text-[10px]">
                            Documented
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          Chief Complaint: {c.chiefComplaint}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">
                          Treatment Plan: {c.treatmentPlan}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                    No consultation notes found.
                  </p>
                )}
              </div>

              {/* Prescriptions */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <span>Official Prescriptions ({patientPrescriptions.length})</span>
                </div>
                {patientPrescriptions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientPrescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-teal-700 dark:text-teal-300">
                            {rx.prescriptionNumber}
                          </span>
                          <span>{rx.date} · {rx.doctorName}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-300">
                          {rx.items.map((it, idx) => (
                            <span key={idx} className="mr-2 inline-block">
                              • {it.medicationName} ({it.dosage}) - {it.frequency}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                    No active prescriptions found.
                  </p>
                )}
              </div>

              {/* Diagnostic Labs */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <FlaskConical className="w-4 h-4 text-teal-600" />
                  <span>Diagnostic Lab Orders ({patientLabs.length})</span>
                </div>
                {patientLabs.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientLabs.map((lab) => (
                      <div
                        key={lab.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {lab.testName} ({lab.category})
                          </span>
                          <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {lab.status}
                          </span>
                        </div>
                        {lab.interpretation && (
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            {lab.interpretation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                    No lab orders found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            {activeTab !== 'clinical' && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white transition flex items-center gap-1.5 shadow-md shadow-teal-900/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
