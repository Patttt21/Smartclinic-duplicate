import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { canUserScanQR } from '../../utils/qrPermissions';
import {
  QrCode,
  Camera,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  Lock,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  onOpenScanner: (mode?: 'checkin') => void;
  onStartConsultation: (patientId: string) => void;
}

export const ScanHealthIdPage: React.FC<Props> = ({ onOpenScanner }) => {
  const { appointments, activeRole, primaryRole, staffSubRole, setActiveTab } = useClinic();
  const isAuthorized = canUserScanQR(activeRole, primaryRole, staffSubRole);

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Access Restricted: Receptionist &amp; Nurse Only
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Appointment QR Check-In Verification is restricted to authorized Receptionist and Nursing
          staff.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const confirmedScheduled = appointments.filter(
    (a) => !a.isSynthetic && !a.isWalkIn && a.status === 'Confirmed'
  );
  const checkedInScheduled = appointments.filter(
    (a) => !a.isSynthetic && !a.isWalkIn && a.status === 'Checked In'
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-xs font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Appointment QR Check-In Station
              </h1>
              <span className="text-[10px] bg-blue-500/20 text-blue-200 font-bold px-2 py-0.5 rounded border border-blue-400/30">
                RECEPTION &amp; NURSE DESK
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Verify non-PHI Appointment QR passes or Booking References to confirm scheduled
              patient arrivals without assigning walk-in queue tickets.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenScanner('checkin')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap self-start md:self-auto"
        >
          <Camera className="w-4 h-4" />
          <span>Open QR Check-In Scanner</span>
        </button>
      </div>

      {/* Outpatient Emergency Referral Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex items-start gap-2.5 text-amber-950 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px]">
          <strong>Outpatient Clinic Scope:</strong> SmartClinic supports scheduled outpatient
          consultations and capacity-protected walk-in visits only. Emergency Scan Mode has been
          retired—patients requiring emergency stabilization must be referred directly to a
          hospital emergency department.
        </p>
      </div>

      {/* Main Verification Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Non-PHI Appointment QR Verification
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cryptographic booking token validation &amp; duplicate check-in protection
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Zero PHI in QR Payload:</strong> Encodes only{' '}
                <code className="font-mono text-[10px]">bookingReference</code> and HMAC-signed
                verification token.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Scheduled Slot Integrity:</strong> Transitions booked visits to{' '}
                <strong>Checked In</strong> without issuing walk-in queue numbers.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Duplicate Guard:</strong> Blocks repeated QR check-ins once an appointment
                is already checked in.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 tabular-nums">
            <span className="text-slate-500">
              Checked-In Scheduled Arrivals:{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {checkedInScheduled.length}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onOpenScanner('checkin')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Verify Appointment QR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pending Confirmed Bookings Ready for Check-In */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 tabular-nums">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Confirmed Bookings Awaiting Arrival ({confirmedScheduled.length})
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Booking References</span>
          </div>

          {confirmedScheduled.length === 0 ? (
            <p className="text-slate-500 py-6 text-center">
              No confirmed bookings currently awaiting check-in.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {confirmedScheduled.slice(0, 6).map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {apt.patientName}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                        {apt.bookingReference || apt.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {apt.date} at {apt.time} • {apt.doctorName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenScanner('checkin')}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-bold text-[11px] cursor-pointer whitespace-nowrap"
                  >
                    Scan / Verify
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
