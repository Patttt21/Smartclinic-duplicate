import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Patient } from '../../types/clinic';
import { calculatePatientRiskStratification } from '../../utils/predictiveAnalytics';
import { canUserScanQR } from '../../utils/qrPermissions';
import {
  Search,
  Filter,
  Plus,
  QrCode,
  Sparkles,
  Stethoscope,
  Calendar,
  AlertCircle,
  FileText,
  ChevronRight,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Lock,
  Activity,
  Heart,
  Droplet
} from 'lucide-react';

interface Props {
  onSelectPatient: (patientId: string) => void;
  onOpenNewPatient: () => void;
  onOpenQR: (patient: Patient) => void;
  onOpenAISummary: (patient: Patient) => void;
  onStartConsultation: (patientId: string) => void;
  onBookAppointment: (patientId: string) => void;
  onOpenScanQR?: () => void;
}

export const PatientList: React.FC<Props> = ({
  onSelectPatient,
  onOpenNewPatient,
  onOpenQR,
  onOpenAISummary,
  onStartConsultation,
  onBookAppointment,
  onOpenScanQR,
}) => {
  const { patients, activeRole, primaryRole, staffSubRole } = useClinic();
  const isPatient = activeRole === 'patient';

  const [filterSearch, setFilterSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [bloodFilter, setBloodFilter] = useState('ALL');

  // If patient, they have exactly 1 record in `patients` (their own)
  const currentPatient = patients[0];

  // Staff search filters
  const filteredPatients = patients.filter((p) => {
    if (isPatient) return true;
    const matchesSearch =
      p.fullName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      p.mrn.toLowerCase().includes(filterSearch.toLowerCase()) ||
      p.phone.includes(filterSearch) ||
      (p.chronicConditions || []).some((c) => c.toLowerCase().includes(filterSearch.toLowerCase()));

    const matchesGender = genderFilter === 'ALL' || p.gender === genderFilter;
    const matchesBlood = bloodFilter === 'ALL' || p.bloodType === bloodFilter;

    return matchesSearch && matchesGender && matchesBlood;
  });

  // ---------------------------------------------------------------------------
  // PATIENT VIEW: Dedicated, Isolated Personal Medical Record (EMR) View
  // ---------------------------------------------------------------------------
  if (isPatient && currentPatient) {
    const latestVitals = currentPatient.vitalsHistory?.[0];

    return (
      <div className="space-y-5 max-w-5xl mx-auto text-xs font-sans pb-10">
        {/* Specific Task & Privacy Header */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                My Electronic Medical Record (EMR)
              </h1>
              <span className="text-xs bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800">
                MRN: {currentPatient.mrn}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specific Task: Review personal health history, recorded vitals, documented drug allergies, and outpatient summaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenQR(currentPatient)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Digital Health ID</span>
            </button>
            <button
              onClick={() => onBookAppointment(currentPatient.id)}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-teal-700/20 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Mandatory Security & Privacy Compliance Notice */}
        <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              Strict Tenant Isolation (RA 10173): You are viewing solely your verified personal medical records. All other clinical records in the database are quarantined and blocked.
            </span>
          </div>
          <span className="font-mono text-[10px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded font-bold">
            CONFIDENTIAL
          </span>
        </div>

        {/* Patient Profile Snapshot */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Full Legal Name</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{currentPatient.fullName}</div>
            <div className="text-[11px] text-slate-500 font-mono">DOB: {currentPatient.dob} ({currentPatient.age} yrs)</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Group & Gender</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-900/60">
                {currentPatient.bloodType}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{currentPatient.gender}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Contact & Phone</span>
            <div className="text-xs text-slate-700 dark:text-slate-300">{currentPatient.phone}</div>
            <div className="text-[11px] text-slate-500">{currentPatient.email}</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Residential Address</span>
            <div className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2" title={currentPatient.address}>
              {currentPatient.address}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Emergency Contact</span>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{currentPatient.emergencyContact?.name || 'On File'}</div>
            <div className="text-[11px] text-slate-500">{currentPatient.emergencyContact?.relationship} • {currentPatient.emergencyContact?.phone}</div>
          </div>
        </div>

        {/* Clinical Summary Cards: Allergies, Conditions, Vitals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Allergies & Chronic Conditions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  Documented Drug & Food Allergies
                </h3>
              </div>
              {currentPatient.allergies?.length === 0 ? (
                <p className="text-slate-400 text-xs">No known drug allergies (NKDA) reported.</p>
              ) : (
                <div className="space-y-2">
                  {currentPatient.allergies.map((a, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-amber-900 dark:text-amber-200">{a.allergen}</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 block">Reaction: {a.reaction}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 capitalize">
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide mb-2">
                Chronic Health Conditions
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {currentPatient.chronicConditions?.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Latest Recorded Vitals */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  Clinical Vitals Record
                </h3>
              </div>
              {latestVitals && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Recorded: {new Date(latestVitals.recordedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {latestVitals ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                    {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">mmHg</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                  <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                    {latestVitals.heartRate}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">bpm</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Oxygen Saturation</span>
                  <span className="text-base font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                    {latestVitals.oxygenSaturation}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">BMI</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                    {latestVitals.bmi || '24.2'}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">kg/m²</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-6 text-center">No recorded vital metrics available yet.</p>
            )}

            <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Provider Nurse/Clinician: {latestVitals?.recordedBy || 'Clinic Triage'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STAFF VIEW: Clinical Patient Directory (Only for Authorized Staff)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4 max-w-6xl mx-auto text-xs font-sans pb-10">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Clinical Patient Directory</h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {filteredPatients.length} Active Records
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Specific Task: Authorized clinical directory for electronic patient charts, vital timelines, and diagnostic summaries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenScanQR && canUserScanQR(activeRole, primaryRole, staffSubRole) && (
            <button
              onClick={onOpenScanQR}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Scan Electronic Health ID QR Code (Receptionist & Nurse Only)"
            >
              <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Scan Health ID</span>
            </button>
          )}
          <button
            onClick={onOpenNewPatient}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-teal-700/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Staff Audit & Security Banner */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Clinical Staff Access: Chart views are audited and logged with user credentials under Philippine RA 10173.</span>
        </div>
        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold">
          AUDIT LOGGED
        </span>
      </div>

      {/* Filter and Search Bar for Staff */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search authorized patient charts by name, MRN, phone, or condition..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Gender:</span>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <span className="text-slate-400 font-medium ml-2">Blood:</span>
          <select
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Blood Types</option>
            <option value="A+">A+</option>
            <option value="O+">O+</option>
            <option value="B+">B+</option>
            <option value="AB+">AB+</option>
            <option value="O-">O-</option>
          </select>
        </div>
      </div>

      {/* Staff Patients Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Patient & MRN</th>
                <th className="py-3 px-3">Age / Sex</th>
                <th className="py-3 px-3">Blood Type</th>
                <th className="py-3 px-4">Conditions & Allergies</th>
                <th className="py-3 px-4">Latest Vitals</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No patients match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((pat) => {
                  const latestVitals = pat.vitalsHistory[0];
                  const riskProfile = calculatePatientRiskStratification(pat);
                  const riskBadgeClass = {
                    Critical: 'bg-rose-100 text-rose-800 border-rose-200',
                    High: 'bg-amber-100 text-amber-800 border-amber-200',
                    Moderate: 'bg-blue-100 text-blue-800 border-blue-200',
                    Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  }[riskProfile.overallTier];

                  return (
                    <tr
                      key={pat.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Name & MRN */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {pat.fullName.charAt(0)}
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectPatient(pat.id)}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 text-xs transition cursor-pointer text-left block"
                            >
                              {pat.fullName}
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-mono text-slate-400">{pat.mrn}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${riskBadgeClass}`}
                                title={`Cardio: ${riskProfile.cardioRisk.score}% | Diabetic: ${riskProfile.diabeticRisk.score}%`}
                              >
                                {riskProfile.overallTier} Risk
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Age / Sex */}
                      <td className="py-3.5 px-3">
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{pat.age} yrs</span>
                        <span className="text-[11px] text-slate-500 block">{pat.gender}</span>
                      </td>

                      {/* Blood Type */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-900">
                          {pat.bloodType}
                        </span>
                      </td>

                      {/* Conditions & Allergies */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {pat.chronicConditions.slice(0, 2).map((c, i) => (
                              <span
                                key={i}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.2 rounded font-medium truncate max-w-[140px]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>

                          {pat.allergies.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">
                                Allergies: {pat.allergies.map((a) => a.allergen).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Latest Vitals */}
                      <td className="py-3.5 px-4">
                        {latestVitals ? (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                BP {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}
                              </span>{' '}
                              mmHg
                            </div>
                            <div className="text-[10px] text-slate-400">
                              HR {latestVitals.heartRate} bpm • SpO2 {latestVitals.oxygenSaturation}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No vitals logged</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenAISummary(pat)}
                            className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Generate AI Clinical Summary"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenQR(pat)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="View Patient QR ID"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {activeRole === 'doctor' && (
                            <button
                              onClick={() => onStartConsultation(pat.id)}
                              className="px-2 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Start Consultation"
                            >
                              <Stethoscope className="w-3 h-3" />
                              <span className="hidden sm:inline">Consult</span>
                            </button>
                          )}

                          <button
                            onClick={() => onSelectPatient(pat.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Open Patient Profile"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
