import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  FileText,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  AlertTriangle,
  Calendar,
  Printer,
  Sparkles,
  QrCode
} from 'lucide-react';
import { usePrint } from '../../context/PrintContext';
import { AIDisclaimerBanner } from '../common/AIDisclaimerBanner';
import { aiService, PatientSummaryResponse } from '../../services/aiService';

interface Props {
  onOpenQR?: () => void;
  onOpenBookAppointment?: () => void;
}

export const PatientEMRView: React.FC<Props> = ({ onOpenQR, onOpenBookAppointment }) => {
  const {
    patients,
    linkedPatientId,
    currentUser,
    users,
    consultations,
    prescriptions,
    labOrders,
    invoices,
    t,
  } = useClinic();

  const { printPrescription, printLabReport } = usePrint();

  const [activeTab, setActiveTab] = useState<'consultations' | 'vitals' | 'prescriptions' | 'labs'>('consultations');
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<PatientSummaryResponse | null>(null);

  // Active patient (logged-in portal patient)
  const patient =
    patients.find((p) => p.id === linkedPatientId) ||
    patients.find((p) => p.email && currentUser.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    patients[0];

  if (!patient) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        No patient record found.
      </div>
    );
  }

  const patientDoctor = users.find((u) => u.id === patient.primaryDoctorId) || users.find((u) => u.role === 'doctor');
  const patientConsultations = consultations.filter((c) => c.patientId === patient.id);
  const patientPrescriptions = prescriptions.filter((p) => p.patientId === patient.id);
  const patientLabs = labOrders.filter((l) => l.patientId === patient.id);

  const handleGenerateSummary = async () => {
    setIsGeneratingAiSummary(true);
    try {
      const res = await aiService.generatePatientSummary({
        patient,
        consultations: patientConsultations,
        labOrders: patientLabs,
        prescriptions: patientPrescriptions,
      });
      setAiSummary(res.data);
    } catch {
      // Fallback handled inside aiService
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  return (
    <div className="space-y-6 text-xs max-w-6xl mx-auto pb-10">
      {/* Patient Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {patient.fullName}
                </h1>
                <span className="bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-mono text-[10px] px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                  {patient.mrn}
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-semibold">
                  Blood Type: {patient.bloodType}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {patient.gender} • {patient.age} years old (DOB: {patient.dob}) • Attending: {patientDoctor?.name || 'Dr. Maria Lourdes Santos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingAiSummary}
              className="px-3 py-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{isGeneratingAiSummary ? 'Analyzing Record...' : 'Generate AI Summary'}</span>
            </button>
            {onOpenQR && (
              <button
                onClick={onOpenQR}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Digital Health ID</span>
              </button>
            )}
          </div>
        </div>

        {/* Demographics & Clinical Alerts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Contact Information</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium block mt-0.5">{patient.phone}</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate block">{patient.email}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Known Allergies</span>
            {patient.allergies.length > 0 ? (
              <div className="space-y-0.5 mt-0.5">
                {patient.allergies.map((a, idx) => (
                  <span key={idx} className="inline-block bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 rounded text-[10px] font-medium mr-1">
                    {a.allergen} ({a.severity})
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">No documented allergies (NKDA)</span>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Chronic Conditions</span>
            {patient.chronicConditions.length > 0 ? (
              <div className="space-y-0.5 mt-0.5">
                {patient.chronicConditions.map((cond, idx) => (
                  <span key={idx} className="inline-block bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 px-1.5 py-0.2 rounded text-[10px] font-medium mr-1">
                    {cond}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">No chronic conditions</span>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">PhilHealth & Insurance</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium block mt-0.5">
              {patient.insuranceProvider || 'PhilHealth Outpatient'}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
              Policy #{patient.insurancePolicyNumber || 'PH-2026-99182'}
            </span>
          </div>
        </div>

        {/* AI Clinical Summary Banner */}
        {aiSummary && (
          <div className="mt-4 p-4 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>AI Clinical Summary & Executive Review</span>
              </div>
              <button
                onClick={() => setAiSummary(null)}
                className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline"
              >
                Close Summary
              </button>
            </div>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {aiSummary.executiveSummary}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-teal-100 dark:border-teal-900/40">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Vital Trends:</span>
                <span className="text-slate-600 dark:text-slate-400">{aiSummary.vitalTrends}</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-teal-100 dark:border-teal-900/40">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Recommended Action Items:</span>
                <span className="text-slate-600 dark:text-slate-400">{aiSummary.recommendedActionItems?.join(' • ')}</span>
              </div>
            </div>
            <AIDisclaimerBanner compact />
          </div>
        )}
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 gap-2 bg-slate-50/60 dark:bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('consultations')}
            className={`py-3 px-3 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'consultations'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Consultations & Clinical Notes ({patientConsultations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vitals')}
            className={`py-3 px-3 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'vitals'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Vitals History ({patient.vitalsHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`py-3 px-3 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'prescriptions'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Prescriptions & Medications ({patientPrescriptions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('labs')}
            className={`py-3 px-3 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'labs'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Laboratory & Diagnostics ({patientLabs.length})</span>
          </button>
        </div>

        <div className="p-5">
          {/* Consultations Tab */}
          {activeTab === 'consultations' && (
            <div className="space-y-4">
              {patientConsultations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recorded consultations for this patient yet.</p>
                </div>
              ) : (
                patientConsultations.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {c.doctorName}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          ({new Date(c.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.medicalCertificateIssued && (
                          <span className="bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                            Medical Certificate Issued
                          </span>
                        )}
                        <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Completed & Signed
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Chief Complaint:</span>
                        <p className="text-slate-800 dark:text-slate-200">{c.chiefComplaint}</p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">ICD-10 Diagnoses:</span>
                        <div className="flex flex-wrap gap-1">
                          {c.diagnoses.map((d, i) => (
                            <span
                              key={i}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200"
                            >
                              <strong className="text-teal-700 dark:text-teal-400">{d.code}</strong> - {d.description}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {c.vitals && (
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-4 text-[11px]">
                        <div><span className="text-slate-400 font-medium">BP:</span> <strong className="text-slate-800 dark:text-slate-200">{c.vitals.bloodPressureSystolic}/{c.vitals.bloodPressureDiastolic} mmHg</strong></div>
                        <div><span className="text-slate-400 font-medium">Heart Rate:</span> <strong className="text-slate-800 dark:text-slate-200">{c.vitals.heartRate} bpm</strong></div>
                        <div><span className="text-slate-400 font-medium">Temp:</span> <strong className="text-slate-800 dark:text-slate-200">{c.vitals.temperature}°C</strong></div>
                        <div><span className="text-slate-400 font-medium">SpO2:</span> <strong className="text-slate-800 dark:text-slate-200">{c.vitals.oxygenSaturation}%</strong></div>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Treatment Plan & Clinical Notes:</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        {c.treatmentPlan}
                      </p>
                    </div>

                    {c.followUpDate && (
                      <div className="flex items-center gap-2 text-[11px] text-teal-800 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/40 p-2 rounded-lg border border-teal-200 dark:border-teal-800">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Recommended Follow-Up Date: {c.followUpDate}</span>
                        {c.followUpInstructions && <span className="font-normal text-slate-600 dark:text-slate-400">({c.followUpInstructions})</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Vitals Tab */}
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Blood Pressure</th>
                      <th className="py-2.5 px-3">Heart Rate</th>
                      <th className="py-2.5 px-3">Temp</th>
                      <th className="py-2.5 px-3">SpO2</th>
                      <th className="py-2.5 px-3">Weight & Height</th>
                      <th className="py-2.5 px-3">BMI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {patient.vitalsHistory.map((v, i) => (
                      <tr key={v.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {new Date(v.recordedAt).toLocaleDateString()} {new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">{v.heartRate} bpm</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">{v.temperature}°C</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">{v.oxygenSaturation}%</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {v.weight || '--'} kg / {v.height || '--'} cm
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-teal-700 dark:text-teal-400">
                          {v.bmi || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              {patientPrescriptions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No prescriptions recorded for this patient.</p>
                </div>
              ) : (
                patientPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                      <div>
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400 text-xs">
                          {rx.prescriptionNumber}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2">
                          Prescribed by {rx.doctorName} • {rx.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          rx.status === 'Dispensed'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {rx.status}
                        </span>
                        <button
                          onClick={() => printPrescription(rx)}
                          className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-teal-600 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Rx</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {rx.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{item.medicationName}</span>
                            <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-mono text-[11px]">({item.dosage})</span>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">Sig: {item.instructions}</p>
                          </div>
                          <div className="text-right">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono text-[11px]">
                              Qty: {item.quantity} • {item.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Laboratory Tab */}
          {activeTab === 'labs' && (
            <div className="space-y-4">
              {patientLabs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No laboratory orders recorded for this patient.</p>
                </div>
              ) : (
                patientLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {lab.testName}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2">
                          Ordered by {lab.doctorName} • {new Date(lab.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          lab.status === 'Completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                        }`}>
                          {lab.status}
                        </span>
                        {lab.status === 'Completed' && (
                          <button
                            onClick={() => printLabReport(lab)}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-teal-600 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Report</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {lab.results && lab.results.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                          <span>Parameter</span>
                          <span>Result / Reference Range</span>
                        </div>
                        {lab.results.map((param, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{param.parameter}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {param.value} {param.unit}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                (Ref: {param.referenceRange})
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                param.flag === 'Normal'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}>
                                {param.flag}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
