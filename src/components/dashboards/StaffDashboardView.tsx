import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { StaffSubRole } from '../../context/ClinicContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Activity,
  Calendar,
  Pill,
  FlaskConical,
  PackageCheck,
  CheckCircle2,
  Layers,
  UserPlus,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  UserX,
  CalendarDays,
  RotateCcw,
  History,
} from 'lucide-react';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { RoleHeroBanner } from '../common/RoleHeroBanner';

interface Props {
  subRole: StaffSubRole;
  onOpenBookAppointment?: () => void;
  onOpenNewPatient?: () => void;
}

export const StaffDashboardView: React.FC<Props> = ({
  subRole,
  onOpenBookAppointment,
  onOpenNewPatient,
}) => {
  const {
    currentUser,
    appointments,
    patients,
    inventory,
    prescriptions,
    labOrders,
    updateAppointmentStatus,
    cancelAppointment,
    dispenseMedication,
    updateLabStatus,
    t,
    language,
  } = useClinic();
  const { info: toastInfo, success: toastSuccess } = useToast();

  const isFil = language === 'fil';

  const roleLabels: Record<StaffSubRole, { title: string; badge: string; desc: string }> = {
    nurse: {
      title: isFil ? 'Pangangalagang Pang-nars at Triage' : 'Clinical Nursing & Outpatient Triage',
      badge: t.roles.nurse,
      desc: isFil
        ? 'Pagtatala ng vital signs, pagsubaybay sa outpatient, at paghahanda sa pasyente bago ang konsultasyon.'
        : 'Triage vital sign evaluations, outpatient monitoring, and pre-consultation patient readiness.',
    },
    pharmacist: {
      title: isFil ? 'Parmasya at Pamamahagi ng Gamot' : 'Pharmacy Formulary & Dispensary Operations',
      badge: t.roles.pharmacist,
      desc: isFil
        ? 'Pagsubaybay sa imbentaryo ng gamot, pagsusuri ng reseta, at pag-dispense ng gamot.'
        : 'Drug inventory monitoring, prescription review, compounding validation, and dispensing dispatch.',
    },
    receptionist: {
      title: isFil ? 'Pagtanggap ng Pasyente at Pamamahala ng Pila' : 'Patient Intake & Queue Management Desk',
      badge: t.roles.receptionist,
      desc: isFil
        ? 'Pagtanggap sa front desk, pag-iskedyul ng appointment, check-in ng pasyente, at triage sa pila.'
        : 'Front desk intake, appointment calendar scheduling, patient check-ins, and queue triage.',
    },
    lab_technician: {
      title: isFil ? 'Laboratoryo ng Diagnostics at Pagsusuri' : 'Diagnostic Laboratory & Specimen Processing',
      badge: t.roles.labTechnician,
      desc: isFil
        ? 'Pagsusuri ng biyolohikal na ispesimen, sertipikasyon ng lab assay, at paglalabas ng resulta.'
        : 'Biological specimen processing, laboratory assay certification, and diagnostics turnaround.',
    },
  };

  const subRoleGradients: Record<StaffSubRole, string> = {
    nurse: 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-emerald-800/40',
    pharmacist: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-800/40',
    receptionist: 'bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-sky-800/40',
    lab_technician: 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-amber-800/40',
  };

  const subRoleBadgeColors: Record<StaffSubRole, string> = {
    nurse: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    pharmacist: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    receptionist: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    lab_technician: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  };

  const subRolePulseColors: Record<StaffSubRole, string> = {
    nurse: 'bg-emerald-400',
    pharmacist: 'bg-indigo-400',
    receptionist: 'bg-sky-400',
    lab_technician: 'bg-amber-400',
  };

  const currentMeta = roleLabels[subRole] || roleLabels.nurse;

  const waitingPatients = appointments.filter(
    (a) => a.status === 'Checked In' || a.status === 'Called' || a.status === 'In Consultation'
  );
  const pendingRx = prescriptions.filter((p) => p.status === 'Active');
  const lowStock = inventory.filter((i) => i.stockQuantity <= i.reorderLevel);
  const pendingLabs = labOrders.filter((l) => l.status === 'Requested' || l.status === 'Processing');

  // Receptionist Tab & Filter State (Strict Categorization: Canceled appointments NEVER leak into Current or Recent)
  const [receptionistTab, setReceptionistTab] = useState<'queue' | 'upcoming' | 'recent' | 'cancelled' | 'all'>('queue');
  const [receptionistSearch, setReceptionistSearch] = useState('');

  const liveQueueAppointments = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === 'Checked In' || a.status === 'Called' || a.status === 'In Consultation'
      ),
    [appointments]
  );
  const upcomingBookings = useMemo(
    () => appointments.filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed'),
    [appointments]
  );
  const recentCompletedAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'Completed'),
    [appointments]
  );
  const cancelledAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'Cancelled' || a.status === 'No Show'),
    [appointments]
  );

  const filteredReceptionistAppointments = useMemo(() => {
    let list = appointments;
    if (receptionistTab === 'queue') list = liveQueueAppointments;
    else if (receptionistTab === 'upcoming') list = upcomingBookings;
    else if (receptionistTab === 'recent') list = recentCompletedAppointments;
    else if (receptionistTab === 'cancelled') list = cancelledAppointments;

    const query = receptionistSearch.trim().toLowerCase();
    if (!query) return list;

    return list.filter(
      (a) =>
        a.patientName.toLowerCase().includes(query) ||
        (a.patientMrn && a.patientMrn.toLowerCase().includes(query)) ||
        (a.queueNumber && a.queueNumber.toLowerCase().includes(query)) ||
        (a.doctorName && a.doctorName.toLowerCase().includes(query)) ||
        (a.reason && a.reason.toLowerCase().includes(query))
    );
  }, [
    appointments,
    receptionistTab,
    liveQueueAppointments,
    upcomingBookings,
    recentCompletedAppointments,
    cancelledAppointments,
    receptionistSearch,
  ]);

  const cardClass = 'bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1';
  const panelClass = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4';
  const rowClass = 'p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3';

  // Dynamic actions based on subRole
  const staffActions = [
    ...(onOpenNewPatient
      ? [
          {
            label: isFil ? 'Bagong Pasyente' : 'New Patient',
            onClick: onOpenNewPatient,
            icon: <UserPlus className="w-4 h-4 text-slate-200" />,
            variant: 'secondary' as const,
            ariaLabel: isFil ? 'Magrehistro ng bagong pasyente' : 'Register new clinic patient',
            title: isFil ? 'Magrehistro ng bagong pasyente' : 'Register a new patient into EMR',
          },
        ]
      : []),
    ...(onOpenBookAppointment && subRole === 'receptionist'
      ? [
          {
            label: t.common.bookAppointment,
            onClick: onOpenBookAppointment,
            icon: <Calendar className="w-4 h-4 text-slate-950" />,
            variant: 'primary' as const,
            primaryColor: 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-md shadow-sky-500/20 focus-visible:ring-sky-300',
            ariaLabel: t.common.bookAppointment,
            title: isFil ? 'Mag-iskedyul ng appointment' : 'Schedule appointment for patient',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs font-sans pb-12">
      {/* Unified Staff Hero Banner */}
      <RoleHeroBanner
        badges={[
          {
            text: currentMeta.badge,
            pulseDot: true,
            pulseColor: subRolePulseColors[subRole] || 'bg-teal-400',
            className: subRoleBadgeColors[subRole] || 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          },
          {
            text: isFil ? 'Aktibong Departamento' : 'Department Active',
            className: 'bg-white/10 text-slate-300 border-white/20 font-mono',
          },
        ]}
        title={currentMeta.title}
        meta={
          <span className="max-w-2xl block">
            {currentMeta.desc}{' '}
            <span className="text-white/80">
              {isFil ? 'Naka-authenticate bilang' : 'Authenticated as'}{' '}
              <strong className="text-white font-bold">{currentUser.name}</strong>.
            </span>
          </span>
        }
        gradientClass={subRoleGradients[subRole] || 'bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border-teal-800/40'}
        actions={staffActions}
      />

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.staff.waitingPatients}</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{waitingPatients.length}</p>
          <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">{t.home.waitingInQueue}</span>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.staff.pharmacyStock}</span>
            <Pill className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{pendingRx.length}</p>
          <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold">{t.nav.prescriptions}</span>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.admin.lowStockAlerts}</span>
            <PackageCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{lowStock.length}</p>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">{t.nav.inventory}</span>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.staff.labPending}</span>
            <FlaskConical className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{pendingLabs.length}</p>
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-semibold">{t.nav.laboratory}</span>
        </div>
      </div>

      {/* Nurse workspace */}
      {subRole === 'nurse' && (
        <div className={panelClass}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Nurse Triage & Pre-Consultation Vitals Desk</h3>
            </div>
            <span className="text-xs text-slate-500">Continuous Vital Sign Surveillance</span>
          </div>

          <div className="space-y-3">
            {patients.map((pat) => (
              <div key={pat.id} className={rowClass}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{pat.fullName}</span>
                    <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded">
                      {pat.mrn}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      Blood {pat.bloodType}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Allergies: <strong className="text-rose-600 dark:text-rose-400">{Array.isArray(pat.allergies) && pat.allergies.length ? pat.allergies.map((a: any) => typeof a === 'string' ? a : a.allergen).join(', ') : 'NKDA'}</strong>
                    {' • Conditions: '}{Array.isArray(pat.chronicConditions) ? pat.chronicConditions.join(', ') || 'None documented' : 'None'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      BP 138/86 • HR 74
                    </span>
                    <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      SpO2 98% • Temp 36.8°C
                    </span>
                  </div>
                  <button
                    onClick={() => toastInfo(`Nurse vitals checklist opened for ${pat.fullName}`)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition text-xs"
                  >
                    {t.staff.recordVitals}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pharmacist workspace */}
      {subRole === 'pharmacist' && (
        <div className={panelClass}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{isFil ? 'Pila ng Pagbibigay ng Gamot sa Parmasya' : 'Pharmacy Prescription Dispense Queue'}</h3>
            </div>
            <span className="text-xs text-slate-500">{isFil ? 'Beripikasyon at Pag-iimpake ng Gamot' : 'Batch Verification & Barcode Packaging'}</span>
          </div>

          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <div key={rx.id} className={rowClass}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{rx.prescriptionNumber}</span>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {rx.status}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold mt-1">
                    Patient: {rx.patientName} • Doctor: {rx.doctorName}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Drug: {rx.items[0]?.medicationName} ({rx.items[0]?.dosage}, {rx.items[0]?.frequency})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {rx.status !== 'Dispensed' ? (
                    <button
                      onClick={() => dispenseMedication(rx.id, rx.items[0]?.id || '')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isFil ? 'Ibigay ang Gamot' : 'Dispense Medication'}</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isFil ? 'Naibigay at Beripikado' : 'Dispensed & Verified'}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receptionist workspace */}
      {subRole === 'receptionist' && (
        <div className={panelClass}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {isFil ? 'Front Desk ng Klinika at Pamamahala ng Pila' : 'Clinic Front Desk & Queue Management'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isFil ? 'Tiyaking nakatala nang tama ang mga aktibo, tapos, at kinanselang pasyente' : 'Real-time patient intake, consultation call dispatch, and verified status lifecycle'}
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isFil ? 'Maghanap ng pasyente, MRN, o ticket...' : 'Search patient, MRN, ticket, or MD...'}
                value={receptionistSearch}
                onChange={(e) => setReceptionistSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Categorized Workflow Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
            <button
              onClick={() => setReceptionistTab('queue')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                receptionistTab === 'queue'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isFil ? 'Kasalukuyang Pila' : 'Current Queue'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                receptionistTab === 'queue' ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}>
                {liveQueueAppointments.length}
              </span>
            </button>

            <button
              onClick={() => setReceptionistTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                receptionistTab === 'upcoming'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{isFil ? 'Paparating na Bookings' : 'Upcoming Bookings'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                receptionistTab === 'upcoming' ? 'bg-teal-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}>
                {upcomingBookings.length}
              </span>
            </button>

            <button
              onClick={() => setReceptionistTab('recent')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                receptionistTab === 'recent'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isFil ? 'Kamakailang Natapos' : 'Recent Completed'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                receptionistTab === 'recent' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}>
                {recentCompletedAppointments.length}
              </span>
            </button>

            <button
              onClick={() => setReceptionistTab('cancelled')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                receptionistTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isFil ? 'Kinansela at Di-Sumipot' : 'Cancelled & No-Show'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                receptionistTab === 'cancelled' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}>
                {cancelledAppointments.length}
              </span>
            </button>

            <button
              onClick={() => setReceptionistTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                receptionistTab === 'all'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{isFil ? 'Lahat' : 'All'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                receptionistTab === 'all' ? 'bg-slate-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}>
                {appointments.length}
              </span>
            </button>
          </div>

          {/* Tab Information Notice */}
          {receptionistTab === 'cancelled' && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>
                {isFil
                  ? 'Naka-isolate ang mga kinanselang appointment at no-show dito upang hindi sila lumitaw sa aktibong live queue o kamakailang pasyente.'
                  : 'Canceled and no-show appointments are strictly sequestered here. They are permanently removed from the live queue, lobby tickets, and active status.'}
              </span>
            </div>
          )}

          {/* List Display */}
          <div className="space-y-3">
            {filteredReceptionistAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                  {isFil ? 'Walang nahanap na appointment sa kategoryang ito.' : 'No appointments found in this category.'}
                </p>
                {receptionistSearch && (
                  <button
                    onClick={() => setReceptionistSearch('')}
                    className="text-sky-600 hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    {isFil ? 'I-clear ang paghahanap' : 'Clear search query'}
                  </button>
                )}
              </div>
            ) : (
              filteredReceptionistAppointments.map((apt) => {
                const isCancelled = apt.status === 'Cancelled';
                const isNoShow = apt.status === 'No Show';
                const isCompleted = apt.status === 'Completed';

                let badgeColor = 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
                if (apt.status === 'Called') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 font-bold animate-pulse';
                else if (apt.status === 'In Consultation') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
                else if (apt.status === 'Checked In') badgeColor = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
                else if (apt.status === 'Confirmed') badgeColor = 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
                else if (apt.status === 'Completed') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
                else if (isCancelled) badgeColor = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 font-bold';
                else if (isNoShow) badgeColor = 'bg-slate-300 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-300 font-bold';

                return (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCancelled
                        ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                        : isNoShow
                        ? 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40'
                        : isCompleted
                        ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900 dark:text-slate-100">{apt.patientName}</span>
                        {apt.patientMrn && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {apt.patientMrn}
                          </span>
                        )}
                        {!isCancelled && !isNoShow && apt.queueNumber && (
                          <span className="font-mono text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                            #{apt.queueNumber}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                          {apt.status}
                        </span>
                        {apt.room && !isCancelled && (
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            {apt.room}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] mt-1">
                        Doctor: <strong className="text-slate-700 dark:text-slate-300">{apt.doctorName}</strong> ({apt.department}) • Scheduled: {apt.date} at {apt.time}
                        {apt.reason && ` • ${apt.reason}`}
                      </p>
                      {apt.notes && (
                        <p className="text-[10px] text-slate-400 mt-0.5 italic">
                          Notes: {apt.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center shrink-0">
                      {/* Scheduled Actions */}
                      {apt.status === 'Scheduled' && (
                        <>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'Confirmed');
                              toastSuccess(`Confirmed appointment for ${apt.patientName}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-300 font-bold cursor-pointer transition text-xs border border-teal-200 dark:border-teal-800 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>{isFil ? 'Aprubahan' : 'Approve'}</span>
                          </button>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'Checked In');
                              toastSuccess(`Checked in ${apt.patientName}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer transition text-xs flex items-center gap-1"
                          >
                            <span>{t.staff.checkInPatient}</span>
                          </button>
                          <button
                            onClick={() => {
                              cancelAppointment(apt.id, 'Cancelled at reception intake');
                              toastInfo(`Cancelled appointment for ${apt.patientName}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 font-semibold cursor-pointer transition text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                            title="Cancel appointment and notify patient/doctor"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isFil ? 'Kanselahin' : 'Cancel'}</span>
                          </button>
                        </>
                      )}

                      {/* Confirmed Actions */}
                      {apt.status === 'Confirmed' && (
                        <>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'Checked In');
                              toastSuccess(`Checked in ${apt.patientName}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer transition text-xs flex items-center gap-1"
                          >
                            <span>{t.staff.checkInPatient}</span>
                          </button>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'No Show');
                              toastInfo(`Marked ${apt.patientName} as No-Show`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                            title="Mark as No Show"
                          >
                            <UserX className="w-3.5 h-3.5 text-slate-500" />
                            <span>No Show</span>
                          </button>
                          <button
                            onClick={() => {
                              cancelAppointment(apt.id, 'Cancelled by patient via front desk');
                              toastInfo(`Cancelled appointment for ${apt.patientName}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 font-semibold cursor-pointer transition text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isFil ? 'Kanselahin' : 'Cancel'}</span>
                          </button>
                        </>
                      )}

                      {/* Checked In Actions */}
                      {apt.status === 'Checked In' && (
                        <>
                          <button
                            onClick={() => {
                              const room = apt.room || 'Room 302 (Consultation Suite)';
                              updateAppointmentStatus(apt.id, 'Called', room);
                              toastSuccess(`Called ${apt.patientName} — real-time patient alert dispatched (${room})`);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition text-xs flex items-center gap-1"
                          >
                            <span>Call Patient</span>
                          </button>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'No Show');
                              toastInfo(`Marked ${apt.patientName} as No-Show`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5 text-slate-500" />
                            <span>No Show</span>
                          </button>
                          <button
                            onClick={() => {
                              cancelAppointment(apt.id, 'Patient left clinic prior to consult');
                              toastInfo(`Removed ${apt.patientName} from active queue`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 font-semibold cursor-pointer transition text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                            title="Remove from queue & cancel visit"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isFil ? 'Alisin sa Pila' : 'Cancel Visit'}</span>
                          </button>
                        </>
                      )}

                      {/* Called Actions */}
                      {apt.status === 'Called' && (
                        <>
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                              apt.calledAcknowledgedAt
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {apt.calledAcknowledgedAt ? 'Acknowledged' : 'Awaiting Patient'}
                          </span>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'In Consultation', apt.room || 'Room 302 (Consultation Suite)');
                              toastSuccess(`Started consultation for ${apt.patientName}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition text-xs flex items-center gap-1"
                          >
                            <span>Start Consultation</span>
                          </button>
                          <button
                            onClick={() => {
                              const room = apt.room || 'Room 302 (Consultation Suite)';
                              updateAppointmentStatus(apt.id, 'Called', room);
                              toastInfo(`Re-sent Call Patient alert to ${apt.patientName}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 font-bold cursor-pointer transition text-xs border border-emerald-200 dark:border-emerald-800"
                          >
                            Call Patient
                          </button>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'No Show');
                              toastInfo(`Marked ${apt.patientName} as No-Show`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5 text-slate-500" />
                            <span>No Show</span>
                          </button>
                        </>
                      )}

                      {/* In Consultation Actions */}
                      {apt.status === 'In Consultation' && (
                        <>
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'Completed');
                              toastSuccess(`Marked consultation completed for ${apt.patientName}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition text-xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isFil ? 'Markahang Tapos' : 'Mark Completed'}</span>
                          </button>
                          <button
                            onClick={() => {
                              cancelAppointment(apt.id, 'Consultation cancelled');
                              toastInfo(`Cancelled consultation for ${apt.patientName}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 font-semibold cursor-pointer transition text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isFil ? 'Kanselahin' : 'Cancel'}</span>
                          </button>
                        </>
                      )}

                      {/* Cancelled or No Show Actions */}
                      {(isCancelled || isNoShow) && (
                        <button
                          onClick={() => {
                            updateAppointmentStatus(apt.id, 'Scheduled');
                            toastSuccess(`Reactivated booking for ${apt.patientName}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-950 dark:hover:bg-sky-900 dark:text-sky-300 font-bold cursor-pointer transition text-xs border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                          title="Rebook or reactivate appointment"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>{isFil ? 'Muling I-book' : 'Rebook / Reactivate'}</span>
                        </button>
                      )}

                      {/* Completed Badge */}
                      {isCompleted && (
                        <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/60 rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Done</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Lab technician workspace */}
      {subRole === 'lab_technician' && (
        <div className={panelClass}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{isFil ? 'Pagsusuri ng Diagnostic Specimen' : 'Diagnostic Specimen Intake & Analysis Desk'}</h3>
            </div>
            <span className="text-xs text-slate-500">{isFil ? 'Akreditadong Klinikal na Laboratoryo' : 'CLIA Accredited Clinical Pathology Laboratory'}</span>
          </div>

          <div className="space-y-3">
            {labOrders.map((lab) => (
              <div key={lab.id} className={rowClass}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{lab.testName}</span>
                    <span className="font-mono text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {lab.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {lab.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Patient: {lab.patientName} • Ordered by: {lab.doctorName} • Urgency: <strong className="text-rose-600 dark:text-rose-400">{lab.urgency}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {lab.status === 'Requested' && (
                    <button
                      onClick={() => updateLabStatus(lab.id, 'Processing')}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition text-xs"
                    >
                      {isFil ? 'Iproseso ang Ispesimen' : 'Process Specimen'}
                    </button>
                  )}
                  {lab.status === 'Processing' && (
                    <button
                      onClick={() => updateLabStatus(lab.id, 'Result Available')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition text-xs"
                    >
                      {isFil ? 'Sertipikahan ang Resulta' : 'Certify Results'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
