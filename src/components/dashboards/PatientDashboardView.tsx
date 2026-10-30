import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Calendar,
  Pill,
  FlaskConical,
  Receipt,
  QrCode,
  Printer,
  ChevronRight,
  Heart,
  Activity,
  AlertTriangle,
  Search,
  X,
  RotateCcw,
  ArrowUpRight,
  History,
  XCircle,
  CheckCircle2,
  BellRing,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { RoleHeroBanner } from '../common/RoleHeroBanner';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { formatPeso } from '../../utils/currency';
import { Invoice, Prescription, LabTestOrder } from '../../types/clinic';
import { usePrint } from '../../context/PrintContext';
import {
  enablePatientPushNotifications,
  disablePatientPushNotifications,
  getPushSubscriptionState,
  type PushSupportState,
} from '../../services/pushNotificationClient';

interface Props {
  onOpenBookAppointment?: () => void;
  onOpenQR?: () => void;
  onOpenLabReport?: (lab: any) => void;
  onOpenPrescription?: (rx: any) => void;
  onOpenProfileSettings?: () => void;
}

export const PatientDashboardView: React.FC<Props> = ({
  onOpenBookAppointment,
  onOpenQR,
  onOpenLabReport,
  onOpenPrescription,
}) => {
  const {
    patients,
    appointments,
    prescriptions,
    labOrders,
    invoices,
    linkedPatientId,
    currentUser,
    users,
    setActiveTab,
    cancelAppointment,
    acknowledgeCalledAppointment,
    openBookAppointmentWithDraft,
    authToken,
    wsConnected,
    t,
    language,
  } = useClinic();
  const { printPrescription: globalPrintRx, printLabReport: globalPrintLab, printReceipt: globalPrintReceipt } = usePrint();

  // Search states for patient dashboard sections
  const [rxSearch, setRxSearch] = useState('');
  const [labSearch, setLabSearch] = useState('');
  const [billingSearch, setBillingSearch] = useState('');
  const [cancelledPromptApt, setCancelledPromptApt] = useState<any>(null);
  const [confirmCancelAptId, setConfirmCancelAptId] = useState<string | null>(null);
  const [showPastAppointments, setShowPastAppointments] = useState(false);
  const [pushState, setPushState] = useState<PushSupportState>('prompt_needed');
  const [pushFeedback, setPushFeedback] = useState<string>('');
  const [pushBusy, setPushBusy] = useState<boolean>(false);

  React.useEffect(() => {
    getPushSubscriptionState().then(setPushState).catch(() => {});
  }, []);

  const handleTogglePushAlerts = async () => {
    setPushBusy(true);
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token') || '';
      if (pushState === 'subscribed') {
        await disablePatientPushNotifications(token);
        setPushState('prompt_needed');
        setPushFeedback('Device push notifications disabled. Real-time in-app queue alerts remain active.');
      } else {
        const result = await enablePatientPushNotifications(token);
        setPushState(result.state);
        setPushFeedback(result.message);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handlePrintPrescription = (rx: Prescription) => {
    if (onOpenPrescription) {
      onOpenPrescription(rx);
    } else {
      globalPrintRx(rx);
    }
  };

  const handlePrintLabReport = (lab: LabTestOrder) => {
    if (onOpenLabReport) {
      onOpenLabReport(lab);
    } else {
      globalPrintLab(lab);
    }
  };

  const handlePrintReceipt = (inv: Invoice) => {
    globalPrintReceipt(inv);
  };

  // Active patient (logged-in portal patient)
  const patient =
    patients.find((p) => p.id === linkedPatientId) ||
    patients.find((p) => p.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
    patients[0] || {
      id: 'pat-1',
      mrn: 'MRN-2026-081',
      fullName: 'Elena Vargas',
      dob: '1978-04-12',
      age: 48,
      gender: 'Female' as const,
      bloodType: 'A+' as const,
      phone: '+63 917 823 4410',
      email: 'elena.vargas@example.com',
      allergies: [{ allergen: 'Penicillin', severity: 'severe' as const, reaction: 'Anaphylaxis' }],
      chronicConditions: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
      primaryDoctorId: 'usr-1',
    };

  // Dynamic primary physician resolution
  const primaryDoctor =
    users.find((u) => u.id === patient.primaryDoctorId) ||
    users.find((u) => u.role === 'doctor');
  const primaryDoctorName = primaryDoctor?.name || 'Dr. Maria Cristina Reyes, MD';

  const patientAppointments = appointments.filter((a) => a.patientId === patient.id || a.patientName === patient.fullName);
  const activeUpcomingAppointments = useMemo(() => {
    return patientAppointments.filter(
      (a) => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'No Show'
    );
  }, [patientAppointments]);
  const pastAndCancelledAppointments = useMemo(() => {
    return patientAppointments.filter(
      (a) => a.status === 'Completed' || a.status === 'Cancelled' || a.status === 'No Show'
    );
  }, [patientAppointments]);
  const patientPrescriptions = prescriptions.filter((p) => p.patientId === patient.id || p.patientName === patient.fullName);
  const patientLabs = labOrders.filter((l) => l.patientId === patient.id || l.patientName === patient.fullName);
  const patientInvoices = invoices.filter((i) => i.patientId === patient.id || i.patientName === patient.fullName);

  // Filtered Prescriptions with real-time multi-field search
  const filteredPrescriptions = useMemo(() => {
    const query = rxSearch.trim().toLowerCase();
    if (!query) return patientPrescriptions;

    return patientPrescriptions.filter((rx) => {
      const rxNum = rx.prescriptionNumber?.toLowerCase() || '';
      const doc = rx.doctorName?.toLowerCase() || '';
      const date = rx.date?.toLowerCase() || '';
      const status = rx.status?.toLowerCase() || '';
      const itemsMatch = rx.items?.some((it) => {
        const med = it.medicationName?.toLowerCase() || '';
        const gen = it.genericName?.toLowerCase() || '';
        const dosage = it.dosage?.toLowerCase() || '';
        const freq = it.frequency?.toLowerCase() || '';
        const inst = it.instructions?.toLowerCase() || '';
        return med.includes(query) || gen.includes(query) || dosage.includes(query) || freq.includes(query) || inst.includes(query);
      });
      return rxNum.includes(query) || doc.includes(query) || date.includes(query) || status.includes(query) || itemsMatch;
    });
  }, [patientPrescriptions, rxSearch]);

  // Filtered Lab Orders with real-time multi-field search
  const filteredLabs = useMemo(() => {
    const query = labSearch.trim().toLowerCase();
    if (!query) return patientLabs;

    return patientLabs.filter((lab) => {
      const test = lab.testName?.toLowerCase() || '';
      const orderNum = lab.orderNumber?.toLowerCase() || '';
      const status = lab.status?.toLowerCase() || '';
      const urgency = lab.urgency?.toLowerCase() || '';
      const doc = lab.doctorName?.toLowerCase() || '';
      const rawDate = lab.requestedAt?.toLowerCase() || '';
      let formattedDate = '';
      try {
        if (lab.requestedAt) formattedDate = new Date(lab.requestedAt).toLocaleDateString().toLowerCase();
      } catch {}
      const resultsMatch = lab.results?.some((r) => {
        const param = r.parameter?.toLowerCase() || '';
        const val = String(r.value || '').toLowerCase();
        return param.includes(query) || val.includes(query);
      });
      return test.includes(query) || orderNum.includes(query) || status.includes(query) || urgency.includes(query) || doc.includes(query) || rawDate.includes(query) || formattedDate.includes(query) || resultsMatch;
    });
  }, [patientLabs, labSearch]);

  // Filtered Invoices with real-time multi-field search
  const filteredInvoices = useMemo(() => {
    const query = billingSearch.trim().toLowerCase();
    if (!query) return patientInvoices;

    return patientInvoices.filter((inv) => {
      const invNum = inv.invoiceNumber?.toLowerCase() || '';
      const date = inv.date?.toLowerCase() || '';
      const status = inv.status?.toLowerCase() || '';
      const payMethod = inv.paymentMethod?.toLowerCase() || '';
      const totalStr = String(inv.totalAmount || '');
      const paidStr = String(inv.paidAmount || '');
      const formattedTotal = formatPeso(inv.totalAmount).toLowerCase();
      const itemsMatch = inv.items?.some((it) => {
        const desc = it.description?.toLowerCase() || '';
        const cat = it.category?.toLowerCase() || '';
        return desc.includes(query) || cat.includes(query);
      });
      return invNum.includes(query) || date.includes(query) || status.includes(query) || payMethod.includes(query) || totalStr.includes(query) || paidStr.includes(query) || formattedTotal.includes(query) || itemsMatch;
    });
  }, [patientInvoices, billingSearch]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto text-xs font-sans pb-12">
      {/* Unified Role Hero Banner */}
      <RoleHeroBanner
        badges={[
          {
            text: t.patient.healthPortalTitle,
            pulseDot: true,
            pulseColor: 'bg-emerald-400',
            className: 'bg-white/10 text-teal-200 border-white/20',
          },
        ]}
        title={`${language === 'fil' ? 'Maligayang pagbabalik' : 'Welcome'}, ${patient.fullName}`}
        meta={
          <span>
            {t.patient.mrnLabel}: <span className="font-mono font-bold text-white">{patient.mrn}</span> •{' '}
            {t.patient.bloodTypeLabel}: <span className="font-bold text-white">{patient.bloodType}</span> •{' '}
            {t.patient.primaryDoctorLabel}: <span className="font-semibold text-white">{primaryDoctorName}</span>
          </span>
        }
        gradientClass="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 border-teal-700/40"
        actions={[
          ...(onOpenQR
            ? [
                {
                  label: t.patient.healthIdBtn,
                  onClick: onOpenQR,
                  icon: <QrCode className="w-4 h-4 text-teal-300" />,
                  variant: 'secondary' as const,
                  ariaLabel: t.patient.healthIdBtn,
                  title: language === 'fil' ? 'Ipakita ang iyong Health ID QR Code' : 'Display your personal Health ID QR Code',
                },
              ]
            : []),
          ...(onOpenBookAppointment
            ? [
                {
                  label: t.common.bookAppointment,
                  onClick: onOpenBookAppointment,
                  icon: <Calendar className="w-4 h-4 text-slate-950" />,
                  variant: 'primary' as const,
                  primaryColor: 'bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 focus-visible:ring-teal-300',
                  ariaLabel: t.common.bookAppointment,
                  title: language === 'fil' ? 'Magtakda ng bagong appointment' : 'Schedule a new clinical consultation',
                },
              ]
            : []),
        ]}
      />

      {/* Outpatient Non-Emergency Clinical Scope Notice */}
      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-start gap-2.5 text-amber-950 dark:text-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Outpatient Non-Emergency Healthcare Services Notice</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-relaxed">
              SmartClinic supports scheduled and walk-in outpatient consultations only and does not provide automated clinical triage or emergency medical care. For chest pain, severe shortness of breath, or life-threatening emergencies, call <strong>911</strong> or proceed to the nearest hospital Emergency Department immediately.
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded font-bold shrink-0 self-start sm:self-center">
          NON-EMERGENCY PORTAL
        </span>
      </div>

      {/* Real-Time In-App & Mobile Queue Push Alerts Card */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/70 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                Real-Time Queue &amp; Mobile Push Alerts
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-teal-500'}`} />
                {wsConnected ? 'Live Channel Active' : 'Auto-Sync Active'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-3 h-3 text-teal-600" />
                Lock-Screen Privacy Protected
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Receive an immediate <strong>&ldquo;It&apos;s Your Turn!&rdquo;</strong> alert when clinic staff calls your ticket—even if you are on another tab or lock your phone. Lock-screen alerts never reveal diagnoses or sensitive medical details.
            </p>
            {(pushState === 'unsupported' || pushState === 'permission_denied') && !pushFeedback && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                {pushState === 'unsupported'
                  ? 'Fallback active: Browser push is unavailable in this environment, so instant in-app real-time alerts remain active while your portal is open.'
                  : 'Fallback active: Browser notification permission was declined. Instant in-app queue alerts remain active inside your portal.'}
              </p>
            )}
            {pushFeedback && (
              <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">{pushFeedback}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={handleTogglePushAlerts}
            disabled={pushBusy}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 border ${
              pushState === 'subscribed'
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                : 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600 shadow-xs'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>
              {pushBusy
                ? 'Updating...'
                : pushState === 'subscribed'
                ? 'Disable Mobile Push'
                : 'Enable Mobile Push Alerts'}
            </span>
          </button>
        </div>
      </div>

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.patient.bloodPressure}</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">138/86 mmHg</p>
          <span className="text-[10px] text-amber-600 font-semibold">{language === 'fil' ? 'Yugto 1 Pre-HTN' : 'Stage 1 Pre-HTN'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.patient.heartRate}</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">74 bpm</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{language === 'fil' ? 'Normal na Lebel' : 'Normal Resting Range'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.patient.oxygenSat}</span>
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">98% SpO2</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{language === 'fil' ? 'Tamang Lebel ng Oksiheno' : 'Optimal Oxygenation'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.patient.allergies}</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-400 truncate">
            {patient.allergies?.map((a: any) => typeof a === 'string' ? a : a.allergen).join(', ') || t.patient.noKnownAllergies}
          </p>
          <span className="text-[10px] text-rose-600 font-semibold">{language === 'fil' ? 'May Babala' : 'Medical Flagged'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* Upcoming Appointments Card (Strictly Active: Scheduled, Confirmed, Checked In, In Consultation) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.patient.nextAppointment}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{activeUpcomingAppointments.length} {language === 'fil' ? 'Nakatakda' : 'Active'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {activeUpcomingAppointments.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-slate-400 text-xs">{t.patient.noUpcomingAppointments}</p>
                  {onOpenBookAppointment && (
                    <button
                      onClick={onOpenBookAppointment}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t.common.bookAppointment}</span>
                    </button>
                  )}
                </div>
              ) : (
                activeUpcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      apt.status === 'Called'
                        ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm'
                        : 'border-teal-200/80 dark:border-teal-900/60 bg-teal-50/20 dark:bg-teal-950/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{apt.doctorName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            apt.status === 'Called'
                              ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                              : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                          }`}
                        >
                          {apt.status === 'Called' ? "Called — It's Your Turn!" : apt.status}
                        </span>
                        {apt.room && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                            {apt.room}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        {apt.date} at {apt.time} • {apt.reason}
                      </p>
                      {apt.status === 'Called' && (
                        <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-1">
                          Clinic staff is ready for you. Please proceed to {apt.room || 'the designated clinic room'}.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-bold bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                        #{apt.queueNumber || 'Q-10'}
                      </span>
                      {apt.status === 'Called' && !apt.calledAcknowledgedAt && (
                        <button
                          type="button"
                          onClick={() => acknowledgeCalledAppointment(apt.id)}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                      {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                        confirmCancelAptId === apt.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                cancelAppointment(apt.id, 'Cancelled by patient');
                                setCancelledPromptApt(apt);
                                setConfirmCancelAptId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                            >
                              Confirm Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCancelAptId(null)}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelAptId(apt.id)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition cursor-pointer flex items-center gap-1"
                            title="Cancel appointment"
                          >
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>{language === 'fil' ? 'Kanselahin' : 'Cancel'}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Cancellation Global Tomorrow Booking Action Prompt */}
              {cancelledPromptApt && (
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Appointment Cancelled — Global Booking Open for Tomorrow</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Under standard clinic policy, you may immediately book a new appointment for tomorrow globally across any available doctor and time slot.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        openBookAppointmentWithDraft({
                          globalTomorrowBooking: true,
                          patientId: cancelledPromptApt.patientId,
                          reason: 'New consultation following appointment cancellation',
                        });
                        setCancelledPromptApt(null);
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book for Tomorrow (Global Slots)</span>
                    </button>
                    <button
                      onClick={() => setCancelledPromptApt(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Past & Cancelled Consultation Toggle */}
              {pastAndCancelledAppointments.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowPastAppointments(!showPastAppointments)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 cursor-pointer transition"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>
                      {showPastAppointments
                        ? (language === 'fil' ? 'Itago ang nakaraan at kinanselang tala' : 'Hide past & cancelled visits')
                        : (language === 'fil'
                            ? `Tingnan ang nakaraan at kinanselang tala (${pastAndCancelledAppointments.length})`
                            : `View past & cancelled visit history (${pastAndCancelledAppointments.length})`)}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPastAppointments ? 'rotate-90' : ''}`} />
                  </button>

                  {showPastAppointments && (
                    <div className="space-y-2 mt-2.5 pt-1">
                      {pastAndCancelledAppointments.map((pastApt) => {
                        const isCancelled = pastApt.status === 'Cancelled';
                        const isNoShow = pastApt.status === 'No Show';

                        return (
                          <div
                            key={pastApt.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                              isCancelled
                                ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                : isNoShow
                                ? 'bg-slate-100/40 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                  {pastApt.doctorName}
                                </span>
                                <span
                                  className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                                    isCancelled
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                      : isNoShow
                                      ? 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {pastApt.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {pastApt.date} • {pastApt.reason}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {pastApt.time}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Prescriptions Card with Interactive Real-Time Search */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.patient.activePrescriptions}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  {filteredPrescriptions.length} {language === 'fil' ? 'Reseta' : 'Records'}
                </span>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded transition cursor-pointer"
                  title="View all in full Prescriptions tab"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Real-time RX Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'fil' ? 'Maghanap ng gamot, doktor, o dosage...' : 'Search medicine, dosage, doctor, or Rx number...'}
                value={rxSearch}
                onChange={(e) => setRxSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              />
              {rxSearch && (
                <button
                  onClick={() => setRxSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Prescriptions List */}
            <div className="space-y-3">
              {filteredPrescriptions.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-2">
                  <Pill className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p>{rxSearch ? `No prescriptions match "${rxSearch}".` : t.patient.noActivePrescriptions}</p>
                  {rxSearch && (
                    <button
                      onClick={() => setRxSearch('')}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear search</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredPrescriptions.slice(0, 4).map((rx) => (
                  <div
                    key={rx.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-3 hover:border-teal-300 dark:hover:border-teal-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{rx.items[0]?.medicationName}</h4>
                        <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                          {rx.items[0]?.dosage}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        {rx.items[0]?.frequency} • {rx.items[0]?.instructions}
                      </p>
                      <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-1">
                        {language === 'fil' ? 'Nireseta ni' : 'Prescribed by'} {rx.doctorName} on {rx.date}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePrintPrescription(rx)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-teal-400 rounded-lg text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition shadow-2xs"
                      title={language === 'fil' ? 'I-print ang Reseta' : 'Print Prescription'}
                      type="button"
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{language === 'fil' ? 'I-print ang Reseta' : 'Print Prescription'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Diagnostic Lab Section with Interactive Real-Time Search */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.patient.recentLabResults}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  {filteredLabs.length} {language === 'fil' ? 'Pagsusuri' : 'Tests'}
                </span>
                <button
                  onClick={() => setActiveTab('laboratory')}
                  className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded transition cursor-pointer"
                  title="View all in full Laboratory tab"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Real-time Lab Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'fil' ? 'Maghanap ng lab test, petsa, o resulta...' : 'Search lab test, status, or date...'}
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              />
              {labSearch && (
                <button
                  onClick={() => setLabSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredLabs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-2">
                  <FlaskConical className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p>{labSearch ? `No lab results match "${labSearch}".` : t.patient.noLabResults}</p>
                  {labSearch && (
                    <button
                      onClick={() => setLabSearch('')}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear search</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-2 hover:border-teal-300 dark:hover:border-teal-700 transition"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">{lab.testName}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        {language === 'fil' ? 'Petsa ng Pagsusuri' : 'Ordered'}: {new Date(lab.requestedAt).toLocaleDateString()}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {lab.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePrintLabReport(lab)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-teal-400 rounded-lg text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition shadow-2xs"
                      title={language === 'fil' ? 'I-print ang Ulat ng Lab' : 'Print Lab Report'}
                      type="button"
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{language === 'fil' ? 'I-print ang Lab' : 'Print Lab Report'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Billing & Invoice Summary Section with Interactive Real-Time Search */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.patient.billingSummary}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  {filteredInvoices.length} {language === 'fil' ? 'Kuwenta' : 'Invoices'}
                </span>
                <button
                  onClick={() => setActiveTab('billing')}
                  className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded transition cursor-pointer"
                  title="View all in full Billing tab"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Real-time Billing Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'fil' ? 'Maghanap ng invoice #, serbisyo, halaga...' : 'Search invoice #, service, amount...'}
                value={billingSearch}
                onChange={(e) => setBillingSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              />
              {billingSearch && (
                <button
                  onClick={() => setBillingSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {filteredInvoices.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-2">
                  <Receipt className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p>{billingSearch ? `No invoices match "${billingSearch}".` : 'No billing statements found.'}</p>
                  {billingSearch && (
                    <button
                      onClick={() => setBillingSearch('')}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear search</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-3 text-[11px] hover:border-teal-300 dark:hover:border-teal-700 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block font-mono">{inv.invoiceNumber}</span>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] truncate">
                        {inv.date} • {inv.items.map((i) => i.description).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{formatPeso(inv.totalAmount)}</span>
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                            inv.status === 'Paid'
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950'
                              : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <button
                        onClick={() => handlePrintReceipt(inv)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-teal-400 rounded-lg text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                        title={language === 'fil' ? 'I-print ang Resibo' : 'Print Receipt'}
                        type="button"
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>{language === 'fil' ? 'I-print ang Resibo' : 'Print Receipt'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
