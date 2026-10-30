import React, { useState } from 'react';
import { BellRing, CheckCircle2, Clock, DoorOpen, Hash } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { formatManilaDateTime } from '../../utils/manilaTime';

export const PatientCalledAlertModal: React.FC = () => {
  const { isAuthenticated, currentUser, currentPatient, appointments, acknowledgeCalledAppointment } = useClinic();
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  if (!isAuthenticated || !currentUser || currentUser.role !== 'patient') {
    return null;
  }

  const patientId = currentPatient?.id || currentUser.id;
  const activeCalledAppointment = appointments.find(
    (apt) =>
      apt.patientId === patientId &&
      apt.status === 'Called' &&
      !apt.calledAcknowledgedAt
  );

  if (!activeCalledAppointment) {
    return null;
  }

  const notificationTime = formatManilaDateTime(
    activeCalledAppointment.calledAt || new Date().toISOString()
  );
  const designatedRoom = activeCalledAppointment.room || 'Consultation Room 1';
  const queueLabel = activeCalledAppointment.queueNumber || 'Assigned Ticket';

  const handleAcknowledge = async () => {
    setAcknowledgingId(activeCalledAppointment.id);
    try {
      await acknowledgeCalledAppointment(activeCalledAppointment.id);
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="patient-called-title"
      aria-describedby="patient-called-message"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-500 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
            <BellRing className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md mb-1">
              Real-Time Clinic Queue Alert
            </span>
            <h2 id="patient-called-title" className="text-2xl font-extrabold tracking-tight">
              It&apos;s Your Turn!
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p
            id="patient-called-message"
            className="text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed"
          >
            Clinic staff is ready for you. Please proceed to the designated clinic room.
          </p>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Hash className="w-3.5 h-3.5 text-teal-600" />
                <span>Queue Number</span>
              </div>
              <p className="text-lg font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                {queueLabel}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Appointment Status</span>
              </div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Called
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <DoorOpen className="w-3.5 h-3.5 text-teal-600" />
                <span>Designated Room</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {designatedRoom}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Notification Time</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {notificationTime}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={acknowledgingId === activeCalledAppointment.id}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 px-6 py-3 text-sm font-bold text-white shadow-md transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {acknowledgingId === activeCalledAppointment.id
                  ? 'Acknowledging...'
                  : 'Acknowledge & Proceed to Room'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
