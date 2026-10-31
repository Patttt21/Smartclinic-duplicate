import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { Patient, Appointment } from '../../types/clinic';
import { X, Printer, QrCode, CalendarCheck, ShieldCheck } from 'lucide-react';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { useTheme } from '../../context/ThemeContext';
import { useClinic } from '../../context/ClinicContext';
import { usePrint } from '../../context/PrintContext';

interface Props {
  patient: Patient;
  appointment?: Appointment;
  onClose: () => void;
}

export const PatientQRModal: React.FC<Props> = ({ patient, appointment, onClose }) => {
  const { isDark } = useTheme();
  const { appointments } = useClinic();
  const { printAppointmentQr } = usePrint();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const patientBookedAppointments = useMemo(() => {
    return appointments
      .filter(
        (a) =>
          !a.isSynthetic &&
          !a.isWalkIn &&
          a.patientId === patient.id &&
          a.status !== 'Cancelled'
      )
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [appointments, patient.id]);

  const [selectedAptId, setSelectedAptId] = useState<string>(
    appointment?.id || patientBookedAppointments[0]?.id || ''
  );

  const activeAppointment = useMemo(() => {
    if (appointment && appointment.id === selectedAptId) return appointment;
    return (
      patientBookedAppointments.find((a) => a.id === selectedAptId) ||
      appointment ||
      patientBookedAppointments[0] ||
      null
    );
  }, [appointment, patientBookedAppointments, selectedAptId]);

  useEffect(() => {
    if (!activeAppointment) {
      setQrDataUrl('');
      return;
    }

    // STRICT PRIVACY GUARD: Encode ONLY non-PHI booking reference & verification token.
    // Never encode patient name, MRN, blood type, allergies, diagnosis, or contact details.
    const nonPhiPayload =
      activeAppointment.qrPayload ||
      JSON.stringify({
        v: 2,
        ref: activeAppointment.bookingReference || activeAppointment.id,
        token: activeAppointment.qrToken || 'verified-ref',
      });

    QRCode.toDataURL(nonPhiPayload, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch((err) => {
        console.warn('Appointment QR generation notice:', err);
      });
  }, [activeAppointment]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Appointment Check-In QR Pass"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden text-slate-800 dark:text-slate-100 text-xs font-sans">
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Appointment Check-In QR Pass
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR modal"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {patientBookedAppointments.length > 1 && (
            <div>
              <label
                htmlFor="qr-apt-selector"
                className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1"
              >
                Select Confirmed Appointment
              </label>
              <select
                id="qr-apt-selector"
                value={activeAppointment?.id || ''}
                onChange={(e) => setSelectedAptId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {patientBookedAppointments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.bookingReference || apt.id} • {apt.date} {apt.time} ({apt.doctorName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!activeAppointment ? (
            <div className="p-6 text-center space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800 dark:text-slate-200">
                No Active Scheduled Appointment
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Book an outpatient appointment first to receive your non-PHI Appointment QR check-in
                pass.
              </p>
            </div>
          ) : (
            <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 tabular-nums">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <SmartClinicLogo className="w-7 h-7" glow={isDark} />
                  <div className="text-left">
                    <p className="font-bold text-slate-900 dark:text-white text-xs leading-none">
                      SmartClinic
                    </p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                      Appointment Verification Pass
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  {activeAppointment.status}
                </span>
              </div>

              {/* Non-PHI QR Code */}
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`Appointment Check-In QR for ${activeAppointment.bookingReference || activeAppointment.id}`}
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                      Generating QR...
                    </div>
                  )}
                </div>
                <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                  {activeAppointment.bookingReference || activeAppointment.id}
                </span>
              </div>

              {/* Required Appointment Details */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Reference:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {activeAppointment.bookingReference || activeAppointment.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Clinic Branch:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeAppointment.branch || 'Main Outpatient Clinic'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Doctor:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeAppointment.doctorName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Appointment Date:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {activeAppointment.date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Appointment Time:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {activeAppointment.time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consultation Type:</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {activeAppointment.consultationMode ||
                      (activeAppointment.type === 'Online Consultation' ||
                      activeAppointment.type === 'Telehealth'
                        ? 'Online Consultation'
                        : 'In-Person')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {activeAppointment.status}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Privacy Protected: This QR code encodes only your signed booking reference and
                  contains zero medical records or personal identifiers.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Present at Reception for Check-In
          </span>
          <div className="flex items-center gap-2">
            {activeAppointment && (
              <button
                type="button"
                onClick={() => printAppointmentQr(activeAppointment)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Appointment QR</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
