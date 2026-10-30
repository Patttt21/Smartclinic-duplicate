import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Stethoscope,
  Calendar,
  Layers,
  FileText,
  Pill,
  Sparkles,
  Clock,
  ArrowRight,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { RoleHeroBanner } from '../common/RoleHeroBanner';
import { getDoctorSchedule } from '../../utils/doctorSchedules';

interface Props {
  onStartConsultation: (patientId: string) => void;
  onOpenBookAppointment?: () => void;
}

export const DoctorDashboardView: React.FC<Props> = ({
  onStartConsultation,
  onOpenBookAppointment,
}) => {
  const {
    currentUser,
    appointments,
    patients,
    consultations,
    prescriptions,
    setActiveTab,
    t,
    language,
  } = useClinic();

  const isFil = language === 'fil';
  const [searchPatient, setSearchPatient] = useState('');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Doctor's unique individual working schedule
  const mySchedule = useMemo(() => {
    return getDoctorSchedule(currentUser?.id || '', currentUser);
  }, [currentUser]);

  // Scoped strictly to the logged-in doctor's respected schedule & appointments
  const myAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (currentUser?.id && a.doctorId === currentUser.id) return true;
      if (a.doctorName && currentUser?.name) {
        const aDoc = a.doctorName.toLowerCase();
        const myName = currentUser.name.toLowerCase();
        return aDoc.includes(myName) || myName.includes(aDoc);
      }
      return false;
    });
  }, [appointments, currentUser]);

  const todayAppointments = useMemo(() => {
    return myAppointments.filter(
      (a) => (a.date === todayStr || a.date === '2026-10-06') && a.status !== 'Cancelled' && a.status !== 'No Show'
    );
  }, [myAppointments, todayStr]);

  const activeQueue = useMemo(() => {
    return myAppointments.filter(
      (a) => a.status === 'Checked In' || a.status === 'Called' || a.status === 'In Consultation'
    );
  }, [myAppointments]);

  const myConsultations = useMemo(() => {
    return consultations.filter((c) => {
      if (currentUser?.id && c.doctorId === currentUser.id) return true;
      if (c.doctorName && currentUser?.name) {
        const cDoc = c.doctorName.toLowerCase();
        const myName = currentUser.name.toLowerCase();
        return cDoc.includes(myName) || myName.includes(cDoc);
      }
      return false;
    });
  }, [consultations, currentUser]);

  const myPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      if (currentUser?.id && p.doctorId === currentUser.id) return true;
      if (p.doctorName && currentUser?.name) {
        const pDoc = p.doctorName.toLowerCase();
        const myName = currentUser.name.toLowerCase();
        return pDoc.includes(myName) || myName.includes(pDoc);
      }
      return false;
    });
  }, [prescriptions, currentUser]);

  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchPatient.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchPatient.toLowerCase())
  );

  const deptLabel =
    currentUser.department ||
    (isFil
      ? 'Kagawaran ng Pangkalahatang Medisina at Endokrinolohiya'
      : 'Department of Outpatient Medicine & Endocrinology');

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs font-sans pb-12">
      {/* Unified Doctor Hero Banner with Personal Working Schedule */}
      <RoleHeroBanner
        badges={[
          {
            text: t.doctor.consultationWorkspace,
            pulseDot: true,
            pulseColor: 'bg-teal-400',
            className: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          },
          {
            text: `${mySchedule.workDaysLabel} • ${mySchedule.hoursLabel}`,
            className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold',
          },
          {
            text: currentUser.licenseNumber || 'MD-892410',
            className: 'bg-white/10 text-slate-300 border-white/20 font-mono',
          },
        ]}
        title={`${t.common.welcome}, ${currentUser.name}`}
        meta={
          <span>
            {deptLabel}. <span className="font-bold text-white">{activeQueue.length}</span> {t.doctor.inQueueCount.toLowerCase()} • Assigned Schedule: <strong className="text-white">{mySchedule.workDaysLabel}</strong> ({mySchedule.hoursLabel}).
          </span>
        }
        gradientClass="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 border-teal-800/40"
        actions={[
          {
            label: t.doctor.startConsultationBtn,
            onClick: () => setActiveTab('consultations'),
            icon: <Stethoscope className="w-4 h-4 text-slate-950" />,
            variant: 'primary',
            primaryColor: 'bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 focus-visible:ring-teal-300',
            ariaLabel: t.doctor.startConsultationBtn,
            title: isFil ? 'Simulan ang bagong konsultasyong medikal' : 'Start clinical consultation with waiting patient',
          },
          {
            label: t.nav.queue,
            onClick: () => setActiveTab('queue'),
            icon: <Layers className="w-4 h-4 text-teal-300" />,
            variant: 'secondary',
            ariaLabel: t.nav.queue,
            title: isFil ? 'Tingnan ang Kasalukuyang Pila' : 'Open Live Queue & Waiting Room',
          },
        ]}
      />

      {/* Operational Metrics (Doctor-Scoped) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.doctor.inQueueCount}</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{activeQueue.length}</p>
          <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">{t.home.waitingInQueue}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.doctor.todaySchedule}</span>
            <Calendar className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{todayAppointments.length || myAppointments.length}</p>
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-semibold">{t.doctor.todaySchedule}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.doctor.completedToday}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{myConsultations.length}</p>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">{t.common.status}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span>{t.doctor.writePrescription}</span>
            <Pill className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">{myPrescriptions.length}</p>
          <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold">{t.nav.prescriptions}</span>
        </div>
      </div>

      {/* Main Clinical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.nav.queue}</h3>
            </div>
            <span className="text-xs text-teal-700 dark:text-teal-400 font-semibold">{activeQueue.length} {t.home.waitingInQueue}</span>
          </div>

          <div className="space-y-3">
            {activeQueue.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">{t.common.noData}</p>
            ) : (
              activeQueue.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900 dark:text-slate-100">{apt.patientName}</span>
                      <span className="font-mono text-xs font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                        #{apt.queueNumber || 'Q-10'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                      Reason: <strong className="text-slate-900 dark:text-slate-100">{apt.reason}</strong>
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Check-in: {apt.time} • Scheduled with {apt.doctorName}
                    </p>
                  </div>

                  <button
                    onClick={() => onStartConsultation(apt.patientId)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>{t.doctor.startConsultationBtn}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.nav.emr}</h3>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.common.searchPlaceholder}
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {filteredPatients.map((pat) => (
              <div
                key={pat.id}
                className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 transition flex items-center justify-between gap-2"
              >
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{pat.fullName}</h4>
                  <p className="text-slate-500 text-[11px] font-mono">
                    {pat.mrn} • Blood {pat.bloodType} • {pat.gender}
                  </p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                    {t.patient.allergies}: {Array.isArray(pat.allergies) ? (pat.allergies.length ? pat.allergies.map((a: any) => typeof a === 'string' ? a : a.allergen).join(', ') : t.patient.noKnownAllergies) : t.patient.noKnownAllergies}
                  </p>
                </div>

                <button
                  onClick={() => onStartConsultation(pat.id)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-400 hover:border-teal-500 cursor-pointer transition"
                  title={t.doctor.viewChartBtn}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
