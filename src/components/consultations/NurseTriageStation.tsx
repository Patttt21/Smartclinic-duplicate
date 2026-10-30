import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Patient, Vitals, UrgencyBand } from '../../types/clinic';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Lock,
  Sparkles,
  Info,
  Calendar,
  Layers,
  MapPin,
  ChevronRight,
  BellRing,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface Props {
  initialPatientId?: string;
  onFinish?: () => void;
}

export const NurseTriageStation: React.FC<Props> = ({ initialPatientId, onFinish }) => {
  const {
    patients,
    currentUser,
    appointments,
    addVitals,
    updateAppointmentStatus,
    updateAppointmentRoom,
    addNotification,
    setActiveTab,
    selectPatient,
    language,
    users,
  } = useClinic();
  const { success: toastSuccess, info: toastInfo } = useToast();
  const isFil = language === 'fil';

  const [selectedPatId, setSelectedPatId] = useState<string>(
    initialPatientId || patients[0]?.id || ''
  );

  useEffect(() => {
    if (initialPatientId && initialPatientId !== selectedPatId) {
      setSelectedPatId(initialPatientId);
    }
  }, [initialPatientId]);

  const patient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatId) || patients[0];
  }, [patients, selectedPatId]);

  // Two-Identifier Verification Checkbox
  const [idVerified, setIdVerified] = useState(true);
  const [allergiesConfirmed, setAllergiesConfirmed] = useState(true);

  // Vitals State
  const [bpSys, setBpSys] = useState('120');
  const [bpDia, setBpDia] = useState('80');
  const [hr, setHr] = useState('72');
  const [rr, setRr] = useState('16');
  const [temp, setTemp] = useState('36.6');
  const [spo2, setSpo2] = useState('99');
  const [height, setHeight] = useState('165');
  const [weight, setWeight] = useState('68');
  const [painScale, setPainScale] = useState<number>(0);

  // Triage Assessment
  const [chiefComplaint, setChiefComplaint] = useState(
    'Outpatient intake: Mild headache and generalized body malaise since yesterday.'
  );
  const [onsetTimeline, setOnsetTimeline] = useState('1-3 days ago');
  const [progression, setProgression] = useState<'improving' | 'stable' | 'worsening'>('stable');
  const [triageBand, setTriageBand] = useState<UrgencyBand>('yellow');
  const [fallRisk, setFallRisk] = useState<'Low' | 'Moderate' | 'High'>('Low');
  const [nursingNotes, setNursingNotes] = useState(
    'Patient ambulatory, alert and oriented x3. Skin warm and dry. Hydrated. Accompanied by family member.'
  );

  // Target Doctor & Room Assignment
  const doctorsList = useMemo(() => {
    return users.filter((u) => u.role === 'doctor');
  }, [users]);

  const [assignedDoctorId, setAssignedDoctorId] = useState<string>(
    patient?.primaryDoctorId || doctorsList[0]?.id || 'usr-1'
  );
  const [assignedRoom, setAssignedRoom] = useState<string>('Room 302 (Consultation Suite)');

  // Preload existing latest vitals from patient history
  useEffect(() => {
    if (patient?.vitalsHistory?.[0]) {
      const v = patient.vitalsHistory[0];
      if (v.bloodPressureSystolic) setBpSys(String(v.bloodPressureSystolic));
      if (v.bloodPressureDiastolic) setBpDia(String(v.bloodPressureDiastolic));
      if (v.heartRate) setHr(String(v.heartRate));
      if (v.respiratoryRate) setRr(String(v.respiratoryRate));
      if (v.temperature) setTemp(String(v.temperature));
      if (v.oxygenSaturation) setSpo2(String(v.oxygenSaturation));
      if (v.height) setHeight(String(v.height));
      if (v.weight) setWeight(String(v.weight));
    }
  }, [patient?.id]);

  // Real-time BMI computation
  const computedBmi = useMemo(() => {
    const hM = Number(height) / 100;
    const wKg = Number(weight);
    if (hM > 0 && wKg > 0) {
      return Number((wKg / (hM * hM)).toFixed(1));
    }
    return 22.5;
  }, [height, weight]);

  // AHA Blood Pressure Classification
  const bpAnalysis = useMemo(() => {
    const sys = Number(bpSys);
    const dia = Number(bpDia);
    if (sys >= 180 || dia >= 120) {
      return { label: 'Hypertensive Crisis (Emergency)', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' };
    }
    if (sys >= 140 || dia >= 90) {
      return { label: 'Stage 2 Hypertension', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800' };
    }
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      return { label: 'Stage 1 Hypertension', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' };
    }
    if (sys >= 120 && sys < 130 && dia < 80) {
      return { label: 'Elevated BP', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800' };
    }
    return { label: 'Normal Blood Pressure', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' };
  }, [bpSys, bpDia]);

  // BMI Category
  const bmiCategory = useMemo(() => {
    if (computedBmi < 18.5) return 'Underweight';
    if (computedBmi < 25) return 'Normal Weight';
    if (computedBmi < 30) return 'Overweight';
    return 'Obese Class I';
  }, [computedBmi]);

  // Submission: Save Vitals, Mark Ready for Doctor in Room
  const handleSaveAndDispatch = () => {
    if (!patient) return;

    const newVitals: Omit<Vitals, 'id' | 'recordedAt'> = {
      recordedBy: `${currentUser.name} (RN)`,
      bloodPressureSystolic: Number(bpSys),
      bloodPressureDiastolic: Number(bpDia),
      heartRate: Number(hr),
      respiratoryRate: Number(rr),
      temperature: Number(temp),
      oxygenSaturation: Number(spo2),
      height: Number(height),
      weight: Number(weight),
      bmi: computedBmi,
      notes: `Triage Priority: ${triageBand.toUpperCase()} | Pain Scale: ${painScale}/10 | Fall Risk: ${fallRisk} | Chief Complaint: ${chiefComplaint}`,
    };

    // 1. Commit vitals into patient EMR
    addVitals(patient.id, newVitals);

    // 2. Find active queue appointment
    const activeAppt = appointments.find(
      (a) =>
        a.patientId === patient.id &&
        (a.status === 'Checked In' || a.status === 'Scheduled' || a.status === 'Confirmed' || a.status === 'In Consultation')
    );

    const targetDoc = doctorsList.find((d) => d.id === assignedDoctorId) || doctorsList[0];

    if (activeAppt) {
      updateAppointmentRoom(activeAppt.id, assignedRoom);
      updateAppointmentStatus(activeAppt.id, 'In Consultation', assignedRoom);
    }

    // 3. Dispatch real-time notification to the assigned attending physician
    addNotification({
      recipientRole: 'doctor',
      doctorId: targetDoc?.id,
      patientId: patient.id,
      targetRole: 'provider',
      title: `Triage Complete: ${patient.fullName}`,
      message: `Nursing assessment and vitals recorded by ${currentUser.name}. Patient prepared and assigned to ${assignedRoom}.`,
      category: 'triage',
      priority: triageBand === 'red' ? 'urgent' : 'normal',
    });

    toastSuccess(
      isFil
        ? `Matagumpay na naitala ang vitals para kay ${patient.fullName}. Inilipat sa ${assignedRoom}.`
        : `Triage intake complete for ${patient.fullName}. Patient transferred to ${assignedRoom} for Dr. ${targetDoc?.name || 'Physician'}.`
    );

    if (onFinish) {
      onFinish();
    } else {
      setActiveTab('queue');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12 font-sans text-xs">
      {/* Station Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Nursing Triage & Pre-Consultation Station
              </h1>
              <span className="bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                RN Triage Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Attending Nurse: <strong className="text-slate-700 dark:text-slate-200">{currentUser.name}</strong> • Station: <strong className="text-slate-700 dark:text-slate-200">Triage Station 1 (Vital Signs & Intake)</strong>
            </p>
          </div>
        </div>

        {/* Patient Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 dark:bg-slate-800/80 p-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Triage Patient:</span>
          <select
            value={selectedPatId}
            onChange={(e) => {
              setSelectedPatId(e.target.value);
              selectPatient(e.target.value);
            }}
            className="bg-transparent font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.mrn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Boundary Notice (Professional Clinical Governance) */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3 text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong>Nursing Scope of Practice Notice (Philippine Nursing Act RA 9173 / Medical Act RA 2382):</strong>{' '}
          As a Registered Nurse, you perform vital signs intake, triage prioritization, allergy verification, and patient readiness. Official ICD-10 medical diagnoses, e-prescriptions, and medical certificates are strictly restricted to licensed physicians in the Physician Consultation Room.
        </div>
      </div>

      {/* Patient Identification & Safety Verification Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 font-black text-lg flex items-center justify-center border border-teal-500/40">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  {patient.fullName}
                </h2>
                <span className="font-mono text-[10px] bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-bold border border-slate-700">
                  {patient.mrn}
                </span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold">
                  {patient.gender}, {patient.age} yrs
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Blood Group: <strong className="text-white">{patient.bloodType}</strong> • Phone: <strong className="text-white">{patient.phone}</strong> • Emergency Contact: <strong className="text-white">{patient.emergencyContact?.name} ({patient.emergencyContact?.phone})</strong>
              </p>
            </div>
          </div>

          {/* Quick Safety Checkboxes */}
          <div className="flex flex-wrap sm:flex-col gap-2 bg-slate-800/90 p-2.5 rounded-xl border border-slate-700 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={idVerified}
                onChange={(e) => setIdVerified(e.target.checked)}
                className="rounded text-teal-500 focus:ring-teal-400 h-3.5 w-3.5 cursor-pointer"
              />
              <span>Two-Identifier Identity Verified</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={allergiesConfirmed}
                onChange={(e) => setAllergiesConfirmed(e.target.checked)}
                className="rounded text-teal-500 focus:ring-teal-400 h-3.5 w-3.5 cursor-pointer"
              />
              <span>Allergy Wristband & History Confirmed</span>
            </label>
          </div>
        </div>

        {/* Known Allergies Alert Strip */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Documented Allergies:
          </span>
          {patient.allergies && patient.allergies.length > 0 ? (
            patient.allergies.map((alg: any, idx: number) => {
              const name = typeof alg === 'string' ? alg : alg.allergen;
              return (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 font-bold border border-rose-800/60"
                >
                  ⚠️ {name}
                </span>
              );
            })
          ) : (
            <span className="text-emerald-400 font-semibold">No Known Drug Allergies (NKDA)</span>
          )}
        </div>
      </div>

      {/* Main Grid: Vitals Intake + Triage Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Vital Signs Capture (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                Vital Signs Measurement & Validation
              </h3>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bpAnalysis.color}`}>
              {bpAnalysis.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {/* Blood Pressure Systolic */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Systolic BP</span>
                <span className="text-slate-400 font-normal">(mmHg)</span>
              </label>
              <input
                type="number"
                value={bpSys}
                onChange={(e) => setBpSys(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="120"
              />
            </div>

            {/* Blood Pressure Diastolic */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Diastolic BP</span>
                <span className="text-slate-400 font-normal">(mmHg)</span>
              </label>
              <input
                type="number"
                value={bpDia}
                onChange={(e) => setBpDia(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="80"
              />
            </div>

            {/* Heart Rate */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500" />
                <span>Heart Rate</span>
                <span className="text-slate-400 font-normal">(bpm)</span>
              </label>
              <input
                type="number"
                value={hr}
                onChange={(e) => setHr(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="72"
              />
            </div>

            {/* Respiratory Rate */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Wind className="w-3 h-3 text-cyan-500" />
                <span>Resp. Rate</span>
                <span className="text-slate-400 font-normal">(cpm)</span>
              </label>
              <input
                type="number"
                value={rr}
                onChange={(e) => setRr(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="16"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-500" />
                <span>Body Temp</span>
                <span className="text-slate-400 font-normal">(°C)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="36.8"
              />
            </div>

            {/* Oxygen Saturation */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Activity className="w-3 h-3 text-teal-500" />
                <span>SpO2</span>
                <span className="text-slate-400 font-normal">(%)</span>
              </label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="99"
              />
            </div>

            {/* Height */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Height (cm)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="165"
              />
            </div>

            {/* Weight */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="68"
              />
            </div>

            {/* Computed BMI Display */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Calculated BMI
              </label>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                <span>{computedBmi} kg/m²</span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                  {bmiCategory}
                </span>
              </div>
            </div>
          </div>

          {/* Pain Scale (0 to 10) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Patient Pain Rating Scale (0 - 10)
              </label>
              <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                Score: {painScale} / 10 {painScale === 0 ? '(No Pain)' : painScale <= 3 ? '(Mild)' : painScale <= 6 ? '(Moderate)' : '(Severe)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPainScale(num)}
                  className={`flex-1 min-w-[30px] py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                    painScale === num
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Nursing Triage & Routing to Doctor (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                Nursing Triage & Assignment
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Priority Routing</span>
          </div>

          {/* Triage Priority Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Triage Priority Level:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTriageBand('red')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  triageBand === 'red'
                    ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-700 dark:text-rose-300 font-extrabold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">🔴 Red</div>
                <div className="text-[9px] mt-0.5">Emergency</div>
              </button>
              <button
                type="button"
                onClick={() => setTriageBand('yellow')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  triageBand === 'yellow'
                    ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">🟡 Yellow</div>
                <div className="text-[9px] mt-0.5">Priority</div>
              </button>
              <button
                type="button"
                onClick={() => setTriageBand('green')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  triageBand === 'green'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">🟢 Green</div>
                <div className="text-[9px] mt-0.5">Routine</div>
              </button>
            </div>
          </div>

          {/* Chief Complaint / Symptoms */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Chief Complaint / Presenting Symptoms
            </label>
            <textarea
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Describe presenting symptoms..."
            />
          </div>

          {/* Fall Risk & Progression */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                Fall Risk Assessment
              </label>
              <select
                value={fallRisk}
                onChange={(e) => setFallRisk(e.target.value as any)}
                className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="Low">Low Risk</option>
                <option value="Moderate">Moderate Risk</option>
                <option value="High">High Fall Risk ⚠️</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                Symptom Trajectory
              </label>
              <select
                value={progression}
                onChange={(e) => setProgression(e.target.value as any)}
                className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="stable">Stable</option>
                <option value="worsening">Worsening</option>
                <option value="improving">Improving</option>
              </select>
            </div>
          </div>

          {/* Nursing Intake Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Pre-Consultation Nursing Observations
            </label>
            <textarea
              rows={2}
              value={nursingNotes}
              onChange={(e) => setNursingNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Nursing notes for the physician..."
            />
          </div>

          {/* Doctor & Room Assignment */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Assign to Attending Physician:</span>
              </label>
              <select
                value={assignedDoctorId}
                onChange={(e) => setAssignedDoctorId(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {doctorsList.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.specialty || doc.department || 'Internal Medicine'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Designated Examination Room:</span>
              </label>
              <select
                value={assignedRoom}
                onChange={(e) => setAssignedRoom(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="Room 301 (Pediatrics)">Room 301 (Pediatrics)</option>
                <option value="Room 302 (Consultation Suite)">Room 302 (Consultation Suite)</option>
                <option value="Room 303 (Internal Medicine)">Room 303 (Internal Medicine)</option>
                <option value="Room 304 (Cardiology)">Room 304 (Cardiology)</option>
              </select>
            </div>
          </div>

          {/* Action Button: Dispatch Patient to Physician */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveAndDispatch}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Triage & Transfer to Physician</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
