import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Patient } from '../../types/clinic';
import { X, Printer, Shield, HeartPulse } from 'lucide-react';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  patient: Patient;
  onClose: () => void;
}

export const PatientQRModal: React.FC<Props> = ({ patient, onClose }) => {
  const { isDark } = useTheme();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const payload = JSON.stringify({
      type: 'SMARTCLINIC_HEALTH_ID',
      mrn: patient.mrn,
      id: patient.id,
      name: patient.fullName,
      bloodType: patient.bloodType,
    });

    // High contrast black-on-white QR modules for guaranteed scanner reading
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch((err) => {
        console.warn('QR code generation error:', err);
      });
  }, [patient]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 transition-colors"
      role="dialog"
      aria-modal="true"
      aria-label="Patient Digital ID Card"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/80 border border-slate-200 dark:border-slate-700/80 w-full max-w-md overflow-hidden text-slate-800 dark:text-slate-100 transition-colors animate-in fade-in duration-150">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between no-print transition-colors">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide">
              Patient Digital ID Card
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30 font-medium">
              Verified
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Printable ID Card Area */}
        <div className="p-5 sm:p-6 print-area bg-slate-100/60 dark:bg-slate-950/40 flex flex-col items-center text-center transition-colors">
          {/* Card Frame: Light mode crisp clinic pass / Dark mode glowing metallic surface */}
          <div className="w-full bg-white dark:bg-gradient-to-b dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 border border-slate-200/90 dark:border-teal-500/30 rounded-2xl p-5 shadow-xl shadow-slate-200/60 dark:shadow-black/40 space-y-4 relative overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/5 transition-colors">
            {/* Ambient Background Accents */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -ml-12 -mb-12" />

            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 relative z-10 transition-colors">
              <div className="flex items-center gap-2.5">
                <SmartClinicLogo className="w-7 h-7" glow={isDark} />
                <div className="text-left">
                  <p className="font-bold text-slate-900 dark:text-white text-xs leading-none tracking-tight">
                    Smart Clinic
                  </p>
                  <p className="text-[9px] text-teal-700 dark:text-teal-300/80 uppercase font-mono tracking-wider mt-0.5">
                    Electronic Health Identification
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-2xs">
                {patient.bloodType || 'A+'}
              </span>
            </div>

            {/* Avatar & Identity Info */}
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 dark:bg-gradient-to-br dark:from-teal-500/20 dark:via-teal-600/30 dark:to-slate-800 dark:text-teal-300 dark:border-teal-500/40 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-inner mb-2.5 ring-4 ring-teal-500/10 transition-colors">
                {patient.fullName.charAt(0)}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {patient.fullName}
              </h2>
              <div className="inline-flex items-center gap-1.5 mt-1 bg-slate-100 dark:bg-teal-950/70 border border-slate-200 dark:border-teal-800/60 px-2.5 py-0.5 rounded-md transition-colors">
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-teal-400/80">
                  MRN
                </span>
                <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 tracking-wider">
                  {patient.mrn}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 font-medium">
                {patient.age} yrs • {patient.gender} • DOB: {patient.dob}
              </p>
            </div>

            {/* QR Code & Barcode Section */}
            <div className="py-2 flex flex-col items-center justify-center space-y-2.5 relative z-10">
              {/* Genuine Generated QR Code */}
              <div className="p-3 bg-white rounded-xl shadow-md border-2 border-slate-200 dark:border-slate-700/60 transition-colors">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Electronic Health ID QR Code for ${patient.fullName}`}
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                    <HeartPulse className="w-8 h-8 animate-pulse text-teal-600" />
                  </div>
                )}
              </div>

              {/* Barcode line representation */}
              <div className="w-48 flex items-center justify-center gap-[2px] h-8 pt-1" aria-hidden="true">
                <span className="w-[3px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[1px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[4px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[2px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[1px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[3px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[5px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[2px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[1px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[4px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[2px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[3px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[1px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[4px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
                <span className="w-[2px] h-full bg-slate-700 dark:bg-slate-300 rounded-2xs"></span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-wider">
                *{patient.mrn}*
              </span>
            </div>

            {/* Emergency & Allergies Alert */}
            <div className="bg-slate-50 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 text-left text-[11px] space-y-1.5 relative z-10 transition-colors">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Emerg. Contact:</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {patient.emergencyContact?.name || 'Primary Contact'} ({patient.emergencyContact?.phone || patient.phone || 'On file'})
                </span>
              </div>
              {patient.allergies && patient.allergies.length > 0 && (
                <div className="text-rose-600 dark:text-rose-300 font-medium flex items-start justify-between gap-2">
                  <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">Allergies:</span>
                  <span className="text-right text-rose-700 dark:text-rose-200">
                    {patient.allergies.map((a: any) => typeof a === 'string' ? a : a.allergen).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between no-print transition-colors">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Scan at clinic self check-in kiosk</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-500/20 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
