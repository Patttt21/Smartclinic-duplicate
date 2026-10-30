import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { canUserScanQR } from '../../utils/qrPermissions';
import {
  QrCode,
  Camera,
  ShieldAlert,
  ShieldCheck,
  Clock,
  UserCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  HeartPulse,
  Sparkles,
  Phone,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface Props {
  onOpenScanner: (mode: 'checkin' | 'emergency') => void;
  onStartConsultation: (patientId: string) => void;
}

export const ScanHealthIdPage: React.FC<Props> = ({ onOpenScanner, onStartConsultation }) => {
  const { appointments, patients, activeRole, primaryRole, staffSubRole, setActiveTab } = useClinic();

  // Role verification: Only Receptionist and Nurse can access and use the QR Scanner
  const isAuthorized = canUserScanQR(activeRole, primaryRole, staffSubRole);

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Access Restricted: Scanner Reserved for Receptionist & Nurse
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            By clinical protocol and hospital governance, Patient Electronic Health ID QR code scanning is restricted to <strong>Receptionist</strong> and <strong>Nurse</strong> roles. Doctor, Admin, and other staff do not have permission to operate the QR scanner station.
          </p>
          <div className="inline-block p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300">
            Active Role: <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">{activeRole || primaryRole || 'User'}</span>
          </div>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-teal-600/30"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Find demo candidates
  const todayJuan = patients.find((p) => p.mrn === 'MRN-2026-081') || patients[0];
  const mariaEmergency = patients.find((p) => p.mrn === 'MRN-2026-442') || patients[1] || patients[0];

  const todayStr = '2026-10-06';
  const checkedInToday = appointments.filter(
    (a) =>
      (a.date === todayStr || a.date === new Date().toISOString().split('T')[0]) &&
      a.status === 'Checked In'
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs font-sans pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 text-white p-5 rounded-2xl border border-teal-800/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <QrCode className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  Electronic Health ID Scanner & Triage Verification Station
                </h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  RECEPTION & NURSE ONLY
                </span>
              </div>
              <p className="text-xs text-teal-200/90 mt-1">
                Scan patient Digital Health ID QR codes using your phone or kiosk camera for instant appointment check-in, live queue routing, or immediate emergency profile retrieval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenScanner('checkin')}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-teal-500/20 transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Camera Scanner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Feature 1: Scan to Verify Appointment (Check-in) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200 dark:border-teal-900/60 p-5 shadow-sm space-y-4 hover:border-teal-400 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/80 flex items-center justify-center text-teal-700 dark:text-teal-300">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  1. Scan to Verify Appointment (Check-In)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Standard outpatient arrival & live queue routing
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Check-In Mode
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-slate-700 dark:text-slate-300 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Validates Today's Schedule:</strong> Instantly matches MRN against today's clinic appointments ({todayStr}).
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Assigned Doctor & Room:</strong> Displays doctor name, department, scheduled slot, and triage room.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Auto Live Queue Ticket:</strong> Changes status to "Checked In" and pushes patient straight to Live Waiting Room screen with chime audio.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Active Lobby Queue:{' '}
              <strong className="text-teal-600 dark:text-teal-400 font-mono">
                {checkedInToday} waiting
              </strong>
            </div>
            <button
              onClick={() => onOpenScanner('checkin')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span>Scan for Check-In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Feature 2: Emergency Mode */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-5 shadow-sm space-y-4 hover:border-rose-400 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center text-rose-700 dark:text-rose-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-rose-900 dark:text-rose-200">
                  2. Emergency Mode (Critical Medical Profile)
                </h2>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400">
                  Unconscious, trauma, or no appointment found
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 animate-pulse">
              Emergency Mode
            </span>
          </div>

          <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl space-y-2 text-slate-700 dark:text-slate-300 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Patient Allergies:</strong> Prominent banner displaying severe drug and food allergies with severity levels.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Emergency Contact:</strong> Direct one-tap click-to-call phone and relationship for nearest kin.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Critical Medical History:</strong> Blood type, chronic conditions (Hypertension, Diabetes), active medications, and baseline vitals.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
              High-visibility clinical format
            </div>
            <button
              onClick={() => onOpenScanner('emergency')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-rose-600/20"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Scan in Emergency Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Test Station & Hardware Compatibility */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Mobile Phone Camera & Barcode Compatibility
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Tested on Android Chrome & iOS Safari (Rear Camera Default)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone Cameras</span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Mobile Browser Camera
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Automatically selects rear environment camera with quick focus for QR codes.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Input Device 2</span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Handheld Barcode Gun
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              USB/Bluetooth hardware barcode scanners send keystrokes directly into input.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Input Device 3</span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Manual MRN Keypad Entry
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Instant fallback to type patient Medical Record Number (e.g. MRN-2026-081).
            </p>
          </div>
        </div>

        {/* Quick Demo Test Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-bold">Instant Staff Demo Test:</span>
            <span>Click any patient to test live check-in or emergency mode:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenScanner('checkin')}
              className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-semibold text-xs transition cursor-pointer"
            >
              Test Elena Vargas ({todayJuan.mrn}) • Check-In
            </button>
            <button
              onClick={() => onOpenScanner('emergency')}
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 font-semibold text-xs transition cursor-pointer"
            >
              Test Amara Patel Santos ({mariaEmergency.mrn}) • Emergency
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
