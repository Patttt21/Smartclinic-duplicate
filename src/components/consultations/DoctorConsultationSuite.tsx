import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Patient, Vitals, PrescriptionItem } from '../../types/clinic';
import {
  Stethoscope,
  Sparkles,
  Activity,
  AlertTriangle,
  Pill,
  FlaskConical,
  FileCheck,
  Calendar,
  Save,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  User,
  ShieldCheck,
  Lock,
  FileText,
  Clock,
  Heart,
  Thermometer,
  Wind,
  BadgeCheck,
} from 'lucide-react';
import { AIDisclaimerBanner } from '../common/AIDisclaimerBanner';
import { aiService, SOAPResponse } from '../../services/aiService';
import { useToast } from '../../context/ToastContext';

interface Props {
  initialPatientId?: string;
  onFinish?: () => void;
}

export const DoctorConsultationSuite: React.FC<Props> = ({ initialPatientId, onFinish }) => {
  const {
    patients,
    currentUser,
    appointments,
    updateAppointmentStatus,
    syncClinicalOrdersToInvoice,
    addNotification,
    addConsultation,
    addPrescription,
    addLabOrder,
    setActiveTab,
    selectPatient,
    language,
  } = useClinic();
  const { success: toastSuccess } = useToast();
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

  // Consultation SOAP States
  const [chiefComplaint, setChiefComplaint] = useState(
    'Quarterly evaluation of blood pressure and glycemic markers. Mild morning fatigue.'
  );
  const [doctorRawNotes, setDoctorRawNotes] = useState(
    'Patient feels generally well, taking oral meds regularly. Occasional tension headache. Denies chest pain or shortness of breath. Lungs clear to auscultation bilaterally, heart sounds S1/S2 normal without murmurs.'
  );
  const [hpi, setHpi] = useState('');
  const [ros, setRos] = useState('');
  const [exam, setExam] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Diagnoses (Physician exclusive)
  const [diagnoses, setDiagnoses] = useState<{ code: string; description: string; type: 'Primary' | 'Secondary' }[]>([
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', type: 'Primary' },
    { code: 'I10', description: 'Essential (primary) hypertension', type: 'Secondary' },
  ]);
  const [newDiagCode, setNewDiagCode] = useState('');
  const [newDiagDesc, setNewDiagDesc] = useState('');

  // Vitals for current consultation (pre-populated from Nurse Triage)
  const latestNurseVitals = patient?.vitalsHistory?.[0];
  const [bpSys, setBpSys] = useState(String(latestNurseVitals?.bloodPressureSystolic || '128'));
  const [bpDia, setBpDia] = useState(String(latestNurseVitals?.bloodPressureDiastolic || '82'));
  const [hr, setHr] = useState(String(latestNurseVitals?.heartRate || '74'));
  const [rr, setRr] = useState(String(latestNurseVitals?.respiratoryRate || '16'));
  const [temp, setTemp] = useState(String(latestNurseVitals?.temperature || '36.7'));
  const [spo2, setSpo2] = useState(String(latestNurseVitals?.oxygenSaturation || '98'));
  const [weight, setWeight] = useState(String(latestNurseVitals?.weight || 70));
  const [height, setHeight] = useState(String(latestNurseVitals?.height || 165));

  useEffect(() => {
    if (patient?.vitalsHistory?.[0]) {
      const v = patient.vitalsHistory[0];
      if (v.bloodPressureSystolic) setBpSys(String(v.bloodPressureSystolic));
      if (v.bloodPressureDiastolic) setBpDia(String(v.bloodPressureDiastolic));
      if (v.heartRate) setHr(String(v.heartRate));
      if (v.respiratoryRate) setRr(String(v.respiratoryRate));
      if (v.temperature) setTemp(String(v.temperature));
      if (v.oxygenSaturation) setSpo2(String(v.oxygenSaturation));
      if (v.weight) setWeight(String(v.weight));
      if (v.height) setHeight(String(v.height));
    }
  }, [patient?.id]);

  // Compute BMI
  const computedBmi = useMemo(() => {
    const h = Number(height) / 100;
    const w = Number(weight);
    if (h > 0 && w > 0) return Number((w / (h * h)).toFixed(1));
    return 24.2;
  }, [height, weight]);

  // Prescriptions created in this consult (Physician exclusive)
  const [prescriptionsToAdd, setPrescriptionsToAdd] = useState<PrescriptionItem[]>([
    {
      id: 'item-1',
      medicationName: 'Amlodipine Besylate 5mg',
      genericName: 'Amlodipine',
      dosage: '5mg',
      frequency: 'Once daily every morning',
      route: 'Oral',
      duration: '30 days',
      quantity: 30,
      instructions: 'Take once daily in the morning with water.',
    },
  ]);
  const [newDrugName, setNewDrugName] = useState('');
  const [newDrugDosage, setNewDrugDosage] = useState('');
  const [newDrugFreq, setNewDrugFreq] = useState('');
  const [newDrugRoute, setNewDrugRoute] = useState<'Oral' | 'Topical' | 'Inhalation'>('Oral');
  const [newDrugDuration, setNewDrugDuration] = useState('30 days');
  const [newDrugQty, setNewDrugQty] = useState('30');
  const [newDrugSig, setNewDrugSig] = useState('Take as directed.');

  // Lab Orders created in this consult
  const [labOrdersToAdd, setLabOrdersToAdd] = useState<string[]>([
    'Comprehensive Metabolic Panel (CMP) & HbA1c',
  ]);
  const [newLabTest, setNewLabTest] = useState('');

  // Follow-up & Medical Certificate
  const [followUpDate, setFollowUpDate] = useState('2026-11-20');
  const [followUpNotes, setFollowUpNotes] = useState('Return in 3-4 weeks for repeat blood pressure and glucose surveillance.');
  const [issueMedCert, setIssueMedCert] = useState(false);
  const [certStartDate, setCertStartDate] = useState('2026-10-28');
  const [certEndDate, setCertEndDate] = useState('2026-10-30');
  const [certRecommendation, setCertRecommendation] = useState('Patient is unfit for strenuous duty. Complete rest advised.');

  // AI Generation State
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiGeneratedSoap, setAiGeneratedSoap] = useState<SOAPResponse | null>(null);

  // Generate Structured SOAP Note using Gemini
  const handleGenerateAiSoap = async () => {
    setIsGeneratingSoap(true);
    try {
      const currentVitals: Vitals = {
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser.name,
        bloodPressureSystolic: Number(bpSys),
        bloodPressureDiastolic: Number(bpDia),
        heartRate: Number(hr),
        respiratoryRate: Number(rr),
        temperature: Number(temp),
        oxygenSaturation: Number(spo2),
        height: Number(height),
        weight: Number(weight),
        bmi: computedBmi,
      };

      const res = await aiService.generateClinicalNotes({
        patientInfo: patient,
        rawNotes: doctorRawNotes,
        vitals: currentVitals,
        chiefComplaint,
      });

      setAiGeneratedSoap(res.data);
      setShowAiDraftModal(true);
    } catch (err) {
      console.error('Failed to generate AI SOAP:', err);
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  // Adopt AI Draft into form
  const handleApplyAiSoap = () => {
    if (!aiGeneratedSoap) return;
    if (aiGeneratedSoap.chiefComplaint) setChiefComplaint(aiGeneratedSoap.chiefComplaint);
    if (aiGeneratedSoap.historyOfPresentIllness) setHpi(aiGeneratedSoap.historyOfPresentIllness);
    if (aiGeneratedSoap.reviewOfSystems) setRos(aiGeneratedSoap.reviewOfSystems);
    if (aiGeneratedSoap.physicalExamination) setExam(aiGeneratedSoap.physicalExamination);
    if (aiGeneratedSoap.assessment) setAssessment(aiGeneratedSoap.assessment);
    if (aiGeneratedSoap.treatmentPlan) setPlan(aiGeneratedSoap.treatmentPlan);

    if (aiGeneratedSoap.suggestedDiagnoses && aiGeneratedSoap.suggestedDiagnoses.length > 0) {
      setDiagnoses(
        aiGeneratedSoap.suggestedDiagnoses.map((d) => ({
          code: d.code,
          description: d.description,
          type: (d.type as any) || 'Primary',
        }))
      );
    }

    setShowAiDraftModal(false);
  };

  // Quick Diagnosis Helpers
  const quickCommonDiagnoses = [
    { code: 'I10', desc: 'Essential (primary) hypertension' },
    { code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications' },
    { code: 'J00', desc: 'Acute nasopharyngitis [common cold]' },
    { code: 'J02.9', desc: 'Acute pharyngitis, unspecified' },
    { code: 'K29.7', desc: 'Gastritis, unspecified' },
    { code: 'G44.2', desc: 'Tension-type headache' },
  ];

  const handleAddDiagnosis = () => {
    if (newDiagCode.trim() && newDiagDesc.trim()) {
      setDiagnoses((prev) => [
        ...prev,
        {
          code: newDiagCode.trim().toUpperCase(),
          description: newDiagDesc.trim(),
          type: prev.length === 0 ? 'Primary' : 'Secondary',
        },
      ]);
      setNewDiagCode('');
      setNewDiagDesc('');
    }
  };

  // Add medication
  const handleAddMedication = () => {
    if (newDrugName.trim()) {
      setPrescriptionsToAdd((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}`,
          medicationName: newDrugName.trim(),
          genericName: newDrugName.trim(),
          dosage: newDrugDosage.trim() || 'Standard Outpatient Dose',
          frequency: newDrugFreq.trim() || 'Once daily',
          route: newDrugRoute,
          duration: newDrugDuration.trim() || '30 days',
          quantity: Number(newDrugQty) || 30,
          instructions: newDrugSig.trim() || 'Take as directed by physician.',
        },
      ]);
      setNewDrugName('');
      setNewDrugDosage('');
      setNewDrugFreq('');
      setNewDrugSig('Take as directed.');
    }
  };

  // Finalize consultation
  const handleFinalizeConsultation = () => {
    if (!patient) return;

    const consultVitals: Vitals = {
      recordedAt: new Date().toISOString(),
      recordedBy: `${currentUser.name}, MD`,
      bloodPressureSystolic: Number(bpSys),
      bloodPressureDiastolic: Number(bpDia),
      heartRate: Number(hr),
      respiratoryRate: Number(rr),
      temperature: Number(temp),
      oxygenSaturation: Number(spo2),
      height: Number(height),
      weight: Number(weight),
      bmi: computedBmi,
    };

    // 1. Create prescription if items exist
    let createdRxId: string | undefined;
    if (prescriptionsToAdd.length > 0) {
      const rx = addPrescription({
        patientId: patient.id,
        patientName: patient.fullName,
        patientMrn: patient.mrn,
        patientAge: patient.age,
        patientGender: patient.gender,
        doctorId: currentUser.id,
        doctorName: currentUser.name,
        doctorSpecialty: currentUser.specialty || 'Internal Medicine',
        doctorLicense: currentUser.licenseNumber || 'PRC-0081294',
        date: new Date().toISOString().split('T')[0],
        items: prescriptionsToAdd,
        status: 'Active',
      });
      createdRxId = rx.id;
    }

    // 2. Create Lab Orders if any
    const createdLabIds: string[] = [];
    labOrdersToAdd.forEach((testName) => {
      const lab = addLabOrder({
        patientId: patient.id,
        patientName: patient.fullName,
        patientMrn: patient.mrn,
        doctorId: currentUser.id,
        doctorName: currentUser.name,
        testName,
        category: 'Biochemistry',
        urgency: 'Routine',
        status: 'Requested',
      });
      createdLabIds.push(lab.id);
    });

    // 3. Save Consultation
    addConsultation({
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: currentUser.id,
      doctorName: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      chiefComplaint,
      historyOfPresentIllness: hpi || doctorRawNotes,
      reviewOfSystems: ros,
      physicalExamination: exam || `Vitals reviewed: BP ${bpSys}/${bpDia} mmHg, HR ${hr} bpm. Alert and oriented x3.`,
      vitals: consultVitals,
      diagnoses,
      treatmentPlan: plan || 'Adherence counseling reinforced. Regular outpatient follow-up scheduled.',
      prescriptionsCreated: createdRxId ? [createdRxId] : [],
      labOrdersCreated: createdLabIds,
      followUpDate,
      followUpInstructions: followUpNotes,
      medicalCertificateIssued: issueMedCert,
      certificateDetails: issueMedCert
        ? {
            diagnosis: diagnoses[0]?.description || 'Acute medical condition',
            leaveStartDate: certStartDate,
            leaveEndDate: certEndDate,
            recommendation: certRecommendation,
          }
        : undefined,
    });

    // 4. Global Queue Progression: Advance appointment status to Completed
    const activeAppt = appointments.find(
      (a) =>
        a.patientId === patient.id &&
        (a.status === 'In Consultation' || a.status === 'Checked In' || a.status === 'Confirmed')
    );
    if (activeAppt) {
      updateAppointmentStatus(activeAppt.id, 'Completed');
    }

    // 5. Automatic Billing Itemization
    const labItemsForBilling = labOrdersToAdd.map((lab: string) => {
      let price = 450;
      if (lab.includes('Lipid') || lab.includes('Metabolic')) price = 750;
      else if (lab.includes('CBC')) price = 350;
      else if (lab.includes('HbA1c')) price = 650;
      else if (lab.includes('ECG')) price = 450;
      return { name: `Diagnostic Lab: ${lab}`, price };
    });

    const rxItemsForBilling = prescriptionsToAdd.map((rx: any) => ({
      name: `Prescribed: ${rx.medicationName} (${rx.dosage})`,
      price: 25,
      quantity: rx.quantity || 14,
    }));

    const isSpecialist = Boolean(currentUser?.specialty && currentUser.specialty !== 'General Practice');
    syncClinicalOrdersToInvoice({
      patientId: patient.id,
      patientName: patient.fullName,
      patientMrn: patient.mrn,
      doctorName: currentUser?.name || 'Attending Physician',
      consultationFee: isSpecialist ? 1200 : 800,
      labItems: labItemsForBilling,
      rxItems: rxItemsForBilling,
      hmoPartner: patient.insuranceProvider,
    });

    addNotification({
      recipientRole: 'receptionist',
      targetRole: 'provider',
      title: 'Consultation Complete — Live Billing Ready',
      message: `Consultation completed for ${patient.fullName}. Live itemized invoice generated for checkout/collection.`,
      category: 'billing',
      priority: 'normal',
    });

    toastSuccess(
      isFil
        ? `Matagumpay na natapos at napirmahan ang konsultasyon para kay ${patient.fullName}.`
        : `Consultation successfully finalized & signed for ${patient.fullName}. Billing synced.`
    );

    if (onFinish) onFinish();
    else setActiveTab('patients');
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12 font-sans text-xs">
      {/* Consultation Suite Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Physician Clinical Consultation Suite
              </h1>
              <span className="bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 uppercase tracking-wider">
                Physician Sole Authority
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Attending: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong> • License: <strong className="text-slate-800 dark:text-slate-200">{currentUser.licenseNumber || 'PRC-0081294'}</strong> • Specialty: <strong className="text-slate-800 dark:text-slate-200">{currentUser.specialty || 'Internal Medicine'}</strong>
            </p>
          </div>
        </div>

        {/* Patient Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 dark:bg-slate-800/80 p-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">In Focus:</span>
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

      {/* Patient EMR Banner */}
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
                Blood Group: <strong className="text-white">{patient.bloodType}</strong> • HMO: <strong className="text-white">{patient.insuranceProvider || 'Direct Pay Outpatient'}</strong>
              </p>
            </div>
          </div>

          <div className="text-[11px] text-right text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px]">Chronic Conditions:</span>
            <span className="font-bold text-teal-300">
              {patient.chronicConditions && patient.chronicConditions.length > 0
                ? patient.chronicConditions.join(', ')
                : 'No chronic illnesses on record'}
            </span>
          </div>
        </div>

        {/* Allergy Alerts Strip */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Allergies:
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
            <span className="text-emerald-400 font-semibold">NKDA (No Known Drug Allergies)</span>
          )}
        </div>
      </div>

      {/* Pre-Consultation Nursing Vitals Card */}
      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
              Pre-Consultation Nursing Vitals Intake
            </span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              Recorded by {latestNurseVitals?.recordedBy || 'Nursing Triage'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {latestNurseVitals?.recordedAt ? new Date(latestNurseVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">BP (mmHg)</span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              {bpSys} / {bpDia}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">Heart Rate</span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              {hr} <span className="text-[10px] font-normal">bpm</span>
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">Body Temp</span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              {temp} <span className="text-[10px] font-normal">°C</span>
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">Oxygen SpO2</span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              {spo2} <span className="text-[10px] font-normal">%</span>
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">Resp. Rate</span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              {rr} <span className="text-[10px] font-normal">cpm</span>
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">BMI Index</span>
            <span className="font-mono font-black text-sm text-teal-600 dark:text-teal-400">
              {computedBmi}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Clinical Scribe (Left 7) + Order Suite (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Examination & SOAP Documentation (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                  Clinical Examination & SOAP Scribe
                </h3>
              </div>

              {/* AI Scribe Button */}
              <button
                type="button"
                onClick={handleGenerateAiSoap}
                disabled={isGeneratingSoap}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingSoap ? 'AI Scribing...' : 'AI Scribe SOAP Draft'}</span>
              </button>
            </div>

            {/* Chief Complaint */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Chief Complaint:
              </label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Doctor Raw Clinical Examination Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Doctor's Clinical Auscultation & Examination Notes:
              </label>
              <textarea
                rows={3}
                value={doctorRawNotes}
                onChange={(e) => setDoctorRawNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Document physician findings, heart/lung auscultation, palpation..."
              />
            </div>

            {/* Structured SOAP Sections */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Subjective (HPI & History):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Patient reported</span>
                </label>
                <textarea
                  rows={2}
                  value={hpi}
                  onChange={(e) => setHpi(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="History of present illness..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Objective (ROS & Physical Findings):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Physician observed</span>
                </label>
                <textarea
                  rows={2}
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Review of systems and physical examination..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Assessment (Clinical Synthesis):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Diagnostic evaluation</span>
                </label>
                <textarea
                  rows={2}
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Physician clinical assessment..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Plan (Therapeutics & Surveillance):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Clinical management</span>
                </label>
                <textarea
                  rows={2}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Treatment regimen, dietary advice, follow-up..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Physician Exclusive Formulations (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. ICD-10 Diagnoses Formulation (Physician-Exclusive) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  ICD-10 Clinical Diagnoses
                </h4>
              </div>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                Doctor Only
              </span>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1">
              {quickCommonDiagnoses.map((qd) => (
                <button
                  key={qd.code}
                  type="button"
                  onClick={() => {
                    if (!diagnoses.some((d) => d.code === qd.code)) {
                      setDiagnoses((prev) => [
                        ...prev,
                        { code: qd.code, description: qd.desc, type: prev.length === 0 ? 'Primary' : 'Secondary' },
                      ]);
                    }
                  }}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  +{qd.code}
                </button>
              ))}
            </div>

            {/* Diagnoses List */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {diagnoses.map((d, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300 text-xs">
                        {d.code}
                      </span>
                      <span className="text-[9px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1.5 py-0.2 rounded font-bold">
                        {d.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                      {d.description}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Custom Diagnosis */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Code (e.g. I10)"
                value={newDiagCode}
                onChange={(e) => setNewDiagCode(e.target.value)}
                className="w-24 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
              />
              <input
                type="text"
                placeholder="Description..."
                value={newDiagDesc}
                onChange={(e) => setNewDiagDesc(e.target.value)}
                className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddDiagnosis}
                className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Electronic Prescriptions (Rx Pad) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  Electronic Prescriptions (Rx)
                </h4>
              </div>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                PRC Licensed MD
              </span>
            </div>

            {/* Prescriptions List */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {prescriptionsToAdd.map((rx, idx) => (
                <div
                  key={rx.id || idx}
                  className="p-2 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      ℞ {rx.medicationName} ({rx.dosage})
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Sig: {rx.frequency} • Disp: #{rx.quantity} ({rx.duration})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrescriptionsToAdd(prescriptionsToAdd.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Medication Row */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Medication Name (e.g. Losartan)"
                  value={newDrugName}
                  onChange={(e) => setNewDrugName(e.target.value)}
                  className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Dosage (e.g. 50mg)"
                  value={newDrugDosage}
                  onChange={(e) => setNewDrugDosage(e.target.value)}
                  className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Frequency (e.g. Once daily morning)"
                  value={newDrugFreq}
                  onChange={(e) => setNewDrugFreq(e.target.value)}
                  className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Rx</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Diagnostic Laboratory Orders */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  Diagnostic Lab & Imaging Orders
                </h4>
              </div>
            </div>

            <div className="space-y-1.5">
              {labOrdersToAdd.map((lab, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    🔬 {lab}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLabOrdersToAdd(labOrdersToAdd.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add test (e.g. Lipid Profile, 12-lead ECG)..."
                value={newLabTest}
                onChange={(e) => setNewLabTest(e.target.value)}
                className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (newLabTest.trim()) {
                    setLabOrdersToAdd([...labOrdersToAdd, newLabTest.trim()]);
                    setNewLabTest('');
                  }
                }}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Add Lab
              </button>
            </div>
          </div>

          {/* 4. Medical Certificate (Physician Exclusive) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-teal-600" />
                Issue Medical Certificate (MedCert)
              </span>
              <input
                type="checkbox"
                checked={issueMedCert}
                onChange={(e) => setIssueMedCert(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
              />
            </label>

            {issueMedCert && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Leave Start</label>
                    <input
                      type="date"
                      value={certStartDate}
                      onChange={(e) => setCertStartDate(e.target.value)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Leave End</label>
                    <input
                      type="date"
                      value={certEndDate}
                      onChange={(e) => setCertEndDate(e.target.value)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={certRecommendation}
                  onChange={(e) => setCertRecommendation(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  placeholder="Physician clinical recommendation..."
                />
              </div>
            )}
          </div>

          {/* Action Button: Finalize Consultation & Sign */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleFinalizeConsultation}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-extrabold shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Sign & Finalize Consultation Note</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-1.5">
              Signing commits this encounter to the patient's legal EMR and generates the itemized billing invoice.
            </p>
          </div>
        </div>
      </div>

      {/* AI SOAP Review Modal */}
      {showAiDraftModal && aiGeneratedSoap && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  AI Scribe Structured SOAP Draft
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                Review & Physician Approval Required
              </span>
            </div>

            <AIDisclaimerBanner />

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">
                  SUBJECTIVE:
                </span>
                <p className="text-slate-700 dark:text-slate-300">{aiGeneratedSoap.historyOfPresentIllness}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">
                  OBJECTIVE:
                </span>
                <p className="text-slate-700 dark:text-slate-300">{aiGeneratedSoap.physicalExamination}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">
                  ASSESSMENT & SUGGESTED DIAGNOSES:
                </span>
                <p className="text-slate-700 dark:text-slate-300 mb-2">{aiGeneratedSoap.assessment}</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiGeneratedSoap.suggestedDiagnoses?.map((d, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-mono text-[11px] font-bold">
                      {d.code}: {d.description}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">
                  PLAN:
                </span>
                <p className="text-slate-700 dark:text-slate-300">{aiGeneratedSoap.treatmentPlan}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAiDraftModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Discard Draft
              </button>
              <button
                type="button"
                onClick={handleApplyAiSoap}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Adopt into SOAP Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
