import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { useToast } from '../../context/ToastContext';
import { Patient, Appointment } from '../../types/clinic';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';
import { canUserScanQR } from '../../utils/qrPermissions';
import {
  QrCode,
  Camera,
  CameraOff,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  User,
  HeartPulse,
  Phone,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  X,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Volume2,
  VolumeX,
  Flame,
  UserCheck,
  Info,
  HelpCircle,
  Smartphone,
  Check,
  Lock
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'checkin' | 'emergency';
  onStartConsultation?: (patientId: string) => void;
}

// Web Audio API Hospital Broadcast Chime for Positive Check-in
function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.0, now + 0.12); // A5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (e) {
    console.warn('Audio chime notice:', e);
  }
}

// Emergency Alert Chime
function playEmergencyChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.15);
    osc.frequency.setValueAtTime(440, now + 0.3);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.warn('Emergency chime notice:', e);
  }
}

export const ScanHealthIdModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialMode = 'checkin',
  onStartConsultation,
}) => {
  const {
    patients,
    allStaffPatients,
    appointments,
    updateAppointmentStatus,
    addAppointment,
    addNotification,
    setActiveTab,
    selectPatient,
    activeRole,
    primaryRole,
    staffSubRole,
  } = useClinic();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  // Role authorization: Only Receptionist and Nurse can scan
  const isAuthorized = canUserScanQR(activeRole, primaryRole, staffSubRole);

  const [scanMode, setScanMode] = useState<'checkin' | 'emergency'>(initialMode);
  const [manualInput, setManualInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Scan Result States
  const [scannedPatient, setScannedPatient] = useState<Patient | null>(null);
  const [scannedAppointment, setScannedAppointment] = useState<Appointment | null>(null);
  const [checkInTicket, setCheckInTicket] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'checked_in' | 'emergency_profile' | null>(null);
  const [noAppointmentReason, setNoAppointmentReason] = useState<string | null>(null);

  // Mobile-Optimized HTML5 Camera Scanner States
  const scannerContainerId = 'health-id-qr-scanner-viewport';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermissionState, setCameraPermissionState] = useState<
    'idle' | 'requesting' | 'granted' | 'denied' | 'no_camera' | 'error'
  >('idle');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScannerRunning, setIsScannerRunning] = useState<boolean>(false);
  const [activeHelpTab, setActiveHelpTab] = useState<'ios' | 'android'>('ios');

  const effectivePatients = allStaffPatients?.length ? allStaffPatients : patients;

  const isTodayDate = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr === todayStr || dateStr === '2026-10-06';
  };

  // Stop camera cleanly
  const stopCameraScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Camera stop exception (safe):', err);
      } finally {
        setIsScannerRunning(false);
      }
    }
  }, []);

  // Process decoded QR or Barcode
  const handleProcessScan = useCallback(
    (identifier: string, forceEmergency = false) => {
      const clean = identifier.trim();
      if (!clean) return;

      setIsProcessing(true);
      stopCameraScanner();

      setTimeout(() => {
        setIsProcessing(false);

        // 1. Match patient by MRN, ID, Name
        let matchedPatient = effectivePatients.find(
          (p) =>
            p.mrn.toLowerCase() === clean.toLowerCase() ||
            p.id.toLowerCase() === clean.toLowerCase() ||
            p.fullName.toLowerCase().includes(clean.toLowerCase())
        );

        // Support JSON QR payloads e.g. {"mrn":"MRN-2026-081", ...}
        if (!matchedPatient && clean.startsWith('{')) {
          try {
            const parsed = JSON.parse(clean);
            const targetMrn = parsed.mrn || parsed.patientMrn || parsed.id;
            if (targetMrn) {
              matchedPatient = effectivePatients.find(
                (p) =>
                  p.mrn.toLowerCase() === String(targetMrn).toLowerCase() ||
                  p.id === String(targetMrn)
              );
            }
          } catch {}
        }

        // Fallback: match by digits in MRN/phone
        if (!matchedPatient) {
          const digits = clean.replace(/\D/g, '');
          if (digits.length >= 2) {
            matchedPatient = effectivePatients.find(
              (p) => p.mrn.includes(digits) || p.phone.includes(digits)
            );
          }
        }

        if (!matchedPatient) {
          toastError(`No registered patient matches Electronic Health ID "${clean}".`);
          return;
        }

        setScannedPatient(matchedPatient);
        selectPatient(matchedPatient.id);

        const isEmergencyRequested = forceEmergency || scanMode === 'emergency';

        // 2. Check Appointment Today
        const todayAppointment = appointments.find(
          (a) =>
            (a.patientId === matchedPatient!.id || a.patientMrn === matchedPatient!.mrn) &&
            isTodayDate(a.date) &&
            a.status !== 'Cancelled'
        );

        if (isEmergencyRequested) {
          // EMERGENCY MODE ACTIVE
          setResultType('emergency_profile');
          setScannedAppointment(todayAppointment || null);
          if (soundEnabled) playEmergencyChime();
          toastInfo(
            `🚨 Emergency Health ID Scanned: Critical medical records for ${matchedPatient.fullName} loaded.`
          );
        } else if (todayAppointment) {
          // APPOINTMENT FOUND -> AUTOMATIC CHECK-IN & QUEUE
          const ticketNum =
            todayAppointment.queueNumber ||
            `Q-${100 + appointments.filter((a) => a.status === 'Checked In' || a.status === 'In Consultation').length + 1}`;

          updateAppointmentStatus(todayAppointment.id, 'Checked In');
          setScannedAppointment({ ...todayAppointment, status: 'Checked In', queueNumber: ticketNum });
          setCheckInTicket(ticketNum);
          setResultType('checked_in');

          addNotification({
            userId: matchedPatient.id,
            targetRole: 'provider',
            title: 'Patient Checked In (QR Scanner)',
            message: `${matchedPatient.fullName} (${matchedPatient.mrn}) checked in for ${todayAppointment.time} visit with ${todayAppointment.doctorName}. Assigned Ticket #${ticketNum}.`,
            category: 'appointment',
            priority: 'high',
          });

          if (soundEnabled) playSuccessChime();
          toastSuccess(
            `Checked In: ${matchedPatient.fullName} is now in the Live Waiting Room (Ticket #${ticketNum}).`
          );
        } else {
          // NO APPOINTMENT TODAY -> IMMEDIATELY FALLBACK TO EMERGENCY MODE & MEDICAL PROFILE
          setResultType('emergency_profile');
          setScannedAppointment(null);
          setNoAppointmentReason('No scheduled appointment found for today.');
          if (soundEnabled) playEmergencyChime();
          toastInfo(
            `Notice: No appointment scheduled today for ${matchedPatient.fullName}. Emergency profile activated.`
          );
        }
      }, 300);
    },
    [
      effectivePatients,
      appointments,
      scanMode,
      soundEnabled,
      stopCameraScanner,
      selectPatient,
      updateAppointmentStatus,
      addNotification,
      toastSuccess,
      toastError,
      toastInfo,
    ]
  );

  // Start HTML5 Camera Scanner with Back Camera priority
  const startCameraScanner = useCallback(
    async (cameraDeviceOverride?: string) => {
      if (!isOpen || scannedPatient || !isAuthorized) return;

      // Stop previous instance if running
      await stopCameraScanner();

      const container = document.getElementById(scannerContainerId);
      if (!container) {
        setTimeout(() => startCameraScanner(cameraDeviceOverride), 150);
        return;
      }

      setCameraPermissionState('requesting');
      setCameraErrorMessage('');

      try {
        const html5Qr = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5Qr;

        // Mobile-friendly camera configuration: environment facingMode
        let cameraConfig: string | MediaTrackConstraints = cameraDeviceOverride
          ? cameraDeviceOverride
          : { facingMode: { ideal: 'environment' } };

        // Try getting cameras list for dropdown without blocking
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
            if (!cameraDeviceOverride) {
              const backCam = devices.find((d) => {
                const label = (d.label || '').toLowerCase();
                return (
                  label.includes('back') ||
                  label.includes('rear') ||
                  label.includes('environment') ||
                  label.includes('facing back')
                );
              });
              if (backCam) {
                cameraConfig = backCam.id;
                setSelectedCameraId(backCam.id);
              } else if (devices.length > 0) {
                const preferred = devices[devices.length - 1];
                cameraConfig = preferred.id;
                setSelectedCameraId(preferred.id);
              }
            }
          }
        } catch (camErr) {
          console.warn('getCameras notice (permission prompt pending):', camErr);
          cameraConfig = { facingMode: 'environment' };
        }

        await html5Qr.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (w, h) => {
              const minDim = Math.min(w, h);
              const size = Math.max(180, Math.min(260, Math.floor(minDim * 0.75)));
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            handleProcessScan(decodedText);
          },
          () => {
            // Scanning frame attempts miss until aligned
          }
        );

        setIsScannerRunning(true);
        setCameraPermissionState('granted');
      } catch (err: any) {
        console.warn('Mobile camera scanner startup exception:', err);
        const errStr = (err?.message || err?.name || String(err)).toLowerCase();
        
        // Fallback attempt with simple string facingMode if object constraint failed
        if (errStr.includes('constraint') || errStr.includes('overconstrained') || errStr.includes('notfound')) {
          try {
            if (scannerRef.current) {
              await scannerRef.current.start(
                { facingMode: 'environment' },
                { fps: 15, qrbox: 220 },
                (decodedText) => handleProcessScan(decodedText),
                () => {}
              );
              setIsScannerRunning(true);
              setCameraPermissionState('granted');
              return;
            }
          } catch (fallbackErr: any) {
            console.warn('Fallback facingMode: environment failed:', fallbackErr);
          }
        }

        if (
          errStr.includes('notallowed') ||
          errStr.includes('permission') ||
          errStr.includes('denied') ||
          errStr.includes('securityerror')
        ) {
          setCameraPermissionState('denied');
          setCameraErrorMessage('Camera permission was denied. Please allow camera access in your mobile browser settings.');
        } else if (
          errStr.includes('notfound') ||
          errStr.includes('devicesnotfound') ||
          errStr.includes('requested device not found')
        ) {
          setCameraPermissionState('no_camera');
          setCameraErrorMessage('No camera device found on this device.');
        } else {
          setCameraPermissionState('error');
          setCameraErrorMessage(err?.message || 'Unable to start camera. Please tap retry or use manual keypad.');
        }
        setIsScannerRunning(false);
      }
    },
    [isOpen, scannedPatient, isAuthorized, stopCameraScanner, handleProcessScan]
  );

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen && isAuthorized && !scannedPatient) {
      setScanMode(initialMode);
      setScannedPatient(null);
      setScannedAppointment(null);
      setCheckInTicket(null);
      setResultType(null);
      setNoAppointmentReason(null);
      setManualInput('');
      setCameraPermissionState('idle');

      const timer = setTimeout(() => {
        startCameraScanner();
      }, 200);

      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }
  }, [isOpen, isAuthorized, initialMode, startCameraScanner, stopCameraScanner]);

  // Clean reset to scan next
  const handleResetScanner = () => {
    setScannedPatient(null);
    setScannedAppointment(null);
    setCheckInTicket(null);
    setResultType(null);
    setNoAppointmentReason(null);
    setManualInput('');
    setTimeout(() => {
      startCameraScanner();
    }, 150);
  };

  // Quick Action: Admit Walk-in
  const handleAdmitWalkIn = (urgency: 'Normal' | 'Emergency' = 'Normal') => {
    if (!scannedPatient) return;

    const isEmerg = urgency === 'Emergency';
    const queuePrefix = isEmerg ? 'EMERG' : 'W';
    const ticketNum = `${queuePrefix}-${100 + appointments.length + 1}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const newApt = addAppointment({
      patientId: scannedPatient.id,
      patientName: scannedPatient.fullName,
      patientMrn: scannedPatient.mrn,
      doctorId: 'usr-1',
      doctorName: 'Dr. Maria Cristina Reyes, MD',
      department: isEmerg ? 'Emergency Triage & Acute Care' : 'Outpatient Medicine',
      date: todayStr,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      durationMinutes: isEmerg ? 45 : 20,
      reason: isEmerg
        ? 'URGENT: Emergency Clinical Triage & Vital Stabilization'
        : 'Walk-in Consultation & Primary Outpatient Care',
      status: 'Checked In',
      type: isEmerg ? 'Emergency' : 'Consultation',
      queueNumber: ticketNum,
      room: isEmerg ? 'Triage Bay 1 (Acute Care)' : 'Waiting Room A',
      notes: `Admitted via Health ID Scanner. ${isEmerg ? 'HIGH PRIORITY RED FLAG' : 'Routine walk-in.'}`,
    });

    setScannedAppointment(newApt);
    setCheckInTicket(ticketNum);
    setResultType('checked_in');

    if (soundEnabled) isEmerg ? playEmergencyChime() : playSuccessChime();
    toastSuccess(
      `${isEmerg ? '🚨 Emergency Triage' : 'Walk-in'} Ticket #${ticketNum} issued for ${scannedPatient.fullName}!`
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Electronic Health ID Scanner
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                  Staff Kiosk
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized for Receptionist & Nurse Check-in & Triage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCameraScanner();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ACCESS RESTRICTION GUARD: If user is not Receptionist or Nurse */}
        {!isAuthorized ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Access Restricted: Receptionist & Nurse Only
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                By hospital policy and clinical governance, the Electronic Health ID QR Scanner is reserved exclusively for{' '}
                <strong className="text-slate-800 dark:text-slate-200">Receptionist</strong> and{' '}
                <strong className="text-slate-800 dark:text-slate-200">Nurse</strong> roles for appointment arrival verification, live queue dispatch, and emergency triage.
              </p>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                Current Role:{' '}
                <span className="font-bold uppercase text-rose-600 dark:text-rose-400">
                  {activeRole || primaryRole || 'User'}
                </span>{' '}
                (Unauthorized for QR Scanner)
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Return to Workspace
            </button>
          </div>
        ) : (
          <>
            {/* Mode Selector & Quick Switcher */}
            <div className="p-3 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setScanMode('checkin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    scanMode === 'checkin'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>1. Check-In Verification</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('emergency')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    scanMode === 'emergency'
                      ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>2. Emergency Mode</span>
                </button>
              </div>

              {scannedPatient && (
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* =========================================================================
                  VIEW 1: CAMERA SCANNER (When no patient has been scanned yet)
                  ========================================================================= */}
              {!scannedPatient && (
                <div className="space-y-4">
                  {/* Instructional Banner Requirement:
                      - "Point your camera at the QR code"
                      - "Allow camera access if asked"
                  */}
                  <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-teal-950 dark:text-teal-100 flex items-center gap-2">
                          <span>Point your camera at the QR code</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
                        </div>
                        <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                          Allow camera access if asked by your mobile browser (Android & iPhone).
                        </p>
                      </div>
                    </div>

                    {availableCameras.length > 1 && (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          const newCam = e.target.value;
                          setSelectedCameraId(newCam);
                          startCameraScanner(newCam);
                        }}
                        className="text-[11px] font-bold bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-1 text-teal-900 dark:text-teal-200 cursor-pointer"
                      >
                        {availableCameras.map((cam, idx) => (
                          <option key={cam.id} value={cam.id}>
                            {cam.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Main Live Viewport or Permission States */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[260px] flex flex-col items-center justify-center text-center p-3">
                    {/* The HTML5-QRCode Target DOM Element */}
                    <div
                      id={scannerContainerId}
                      className={`w-full h-full min-h-[260px] max-h-[340px] flex items-center justify-center ${
                        cameraPermissionState === 'denied' || cameraPermissionState === 'no_camera'
                          ? 'hidden'
                          : 'block'
                      }`}
                    />

                    {/* Viewfinder Overlays & Reticle during active granted state */}
                    {cameraPermissionState === 'granted' && isScannerRunning && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 z-10">
                        {/* Status Tag */}
                        <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-teal-500/40 shadow-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>
                            {scanMode === 'emergency'
                              ? '🚨 EMERGENCY SCAN ACTIVE'
                              : 'BACK CAMERA • FAST QR DETECT'}
                          </span>
                        </div>

                        {/* Scanner targeting laser box */}
                        <div
                          className={`w-52 h-52 sm:w-60 sm:h-60 border-2 rounded-2xl flex flex-col items-center justify-between p-2.5 transition-colors ${
                            scanMode === 'emergency'
                              ? 'border-dashed border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                              : 'border-dashed border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.35)]'
                          }`}
                        >
                          <div className="w-full flex justify-between">
                            <span
                              className={`w-4 h-4 border-t-2 border-l-2 ${
                                scanMode === 'emergency' ? 'border-rose-400' : 'border-teal-400'
                              }`}
                            ></span>
                            <span
                              className={`w-4 h-4 border-t-2 border-r-2 ${
                                scanMode === 'emergency' ? 'border-rose-400' : 'border-teal-400'
                              }`}
                            ></span>
                          </div>
                          <div
                            className={`w-full h-0.5 shadow-sm animate-bounce ${
                              scanMode === 'emergency'
                                ? 'bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_12px_#f43f5e]'
                                : 'bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf]'
                            }`}
                          ></div>
                          <div className="w-full flex justify-between">
                            <span
                              className={`w-4 h-4 border-b-2 border-l-2 ${
                                scanMode === 'emergency' ? 'border-rose-400' : 'border-teal-400'
                              }`}
                            ></span>
                            <span
                              className={`w-4 h-4 border-b-2 border-r-2 ${
                                scanMode === 'emergency' ? 'border-rose-400' : 'border-teal-400'
                              }`}
                            ></span>
                          </div>
                        </div>

                        <div className="bg-slate-900/80 backdrop-blur-xs text-slate-200 text-[10px] font-medium px-3 py-1 rounded-full border border-slate-700">
                          Align patient's Health ID QR within targeting reticle
                        </div>
                      </div>
                    )}

                    {/* Camera Requesting / Starting State */}
                    {cameraPermissionState === 'requesting' && (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 space-y-3 z-20">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center animate-spin">
                          <RefreshCw className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-extrabold text-white">Opening Camera Feed...</p>
                          <p className="text-xs text-teal-300">
                            Please tap "Allow" if your browser prompts for camera permission.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Permission Denied Guide (iOS & Android) */}
                    {cameraPermissionState === 'denied' && (
                      <div className="p-5 max-w-lg mx-auto text-left space-y-4">
                        <div className="flex items-center gap-2.5 text-rose-400">
                          <CameraOff className="w-6 h-6 shrink-0" />
                          <h4 className="font-extrabold text-sm text-white">
                            Camera Permission Denied
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Your browser blocked camera access. To scan Patient QR codes on your phone,
                          please enable camera permissions following these simple steps:
                        </p>

                        {/* OS Selector Tabs */}
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                          <button
                            type="button"
                            onClick={() => setActiveHelpTab('ios')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              activeHelpTab === 'ios'
                                ? 'bg-teal-600 text-white'
                                : 'text-slate-400 hover:text-white bg-slate-900'
                            }`}
                          >
                            iPhone / iPad (iOS Safari)
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveHelpTab('android')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              activeHelpTab === 'android'
                                ? 'bg-teal-600 text-white'
                                : 'text-slate-400 hover:text-white bg-slate-900'
                            }`}
                          >
                            Android (Chrome / Samsung)
                          </button>
                        </div>

                        {activeHelpTab === 'ios' ? (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                            <p className="font-bold text-white text-[11px] uppercase tracking-wide text-teal-400">
                              How to enable in iOS Safari:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-[11px]">
                              <li>Tap the <strong>"aA"</strong> or website settings icon in Safari's address bar.</li>
                              <li>Tap <strong>Website Settings</strong>.</li>
                              <li>Change <strong>Camera</strong> from "Deny" to <strong>"Allow"</strong>.</li>
                              <li><em>Alternatively:</em> Open iPhone <strong>Settings &gt; Safari &gt; Camera &gt; Allow</strong>.</li>
                            </ol>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                            <p className="font-bold text-white text-[11px] uppercase tracking-wide text-teal-400">
                              How to enable in Android Chrome:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-[11px]">
                              <li>Tap the <strong>lock or tune icon</strong> left of the URL in Chrome.</li>
                              <li>Tap <strong>Permissions</strong> &gt; <strong>Camera</strong>.</li>
                              <li>Switch to <strong>"Allow"</strong>.</li>
                              <li><em>Alternatively:</em> Go to Chrome <strong>Settings &gt; Site settings &gt; Camera</strong>.</li>
                            </ol>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => startCameraScanner()}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-teal-600/30"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Camera Access</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* No Physical Camera Found */}
                    {cameraPermissionState === 'no_camera' && (
                      <div className="p-5 max-w-sm mx-auto text-center space-y-3">
                        <CameraOff className="w-8 h-8 text-amber-400 mx-auto" />
                        <h4 className="font-bold text-white text-xs">No Physical Camera Detected</h4>
                        <p className="text-[11px] text-slate-300">
                          This device does not have an active camera or it is occupied by another app. You can use the barcode input or quick test simulation below.
                        </p>
                        <button
                          type="button"
                          onClick={() => startCameraScanner()}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Retry Detection
                        </button>
                      </div>
                    )}

                    {/* General Camera Error */}
                    {cameraPermissionState === 'error' && (
                      <div className="p-5 max-w-sm mx-auto text-center space-y-3">
                        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                        <h4 className="font-bold text-white text-xs">Camera Initialization Notice</h4>
                        <p className="text-[11px] text-slate-300">
                          {cameraErrorMessage || 'Camera feed currently unavailable.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => startCameraScanner()}
                          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Restart Camera
                        </button>
                      </div>
                    )}

                    {/* Processing Overlay */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-30">
                        <div className="flex items-center gap-2 text-white text-xs font-bold">
                          <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                          <span>Interpreting Electronic Health ID...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual Keypad / USB Barcode Reader Input */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Barcode / MRN Keypad Input</span>
                      </label>
                      <span className="text-[10px] text-slate-400">USB/Bluetooth Scanner compatible</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleProcessScan(manualInput);
                          }}
                          placeholder="e.g. MRN-2026-081 or Elena Vargas"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleProcessScan(manualInput)}
                        disabled={!manualInput.trim()}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        Scan ID
                      </button>
                    </div>

                    {/* Instant Demo Presets for Testing */}
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Quick Simulation One-Click Scanner:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleProcessScan('MRN-2026-081', false)}
                          className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/30 hover:border-teal-400 text-left transition cursor-pointer flex items-center justify-between group"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Elena Vargas
                              </span>
                              <span className="text-[9px] font-mono text-teal-700 dark:text-teal-400 font-bold">
                                MRN-2026-081
                              </span>
                            </div>
                            <p className="text-[10px] text-teal-700 dark:text-teal-300">
                              Has appointment today (Internal Medicine)
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-teal-200 dark:border-teal-700 group-hover:bg-teal-600 group-hover:text-white transition">
                            Scan Check-in
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleProcessScan('MRN-2026-442', true)}
                          className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 hover:border-rose-400 text-left transition cursor-pointer flex items-center justify-between group"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Amara Patel Santos
                              </span>
                              <span className="text-[9px] font-mono text-rose-700 dark:text-rose-400 font-bold">
                                MRN-2026-442
                              </span>
                            </div>
                            <p className="text-[10px] text-rose-700 dark:text-rose-300">
                              Emergency Mode (Severe Allergy to Codeine)
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800 group-hover:bg-rose-600 group-hover:text-white transition">
                            🚨 Emergency
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  VIEW 2A: SCAN RESULT -> APPOINTMENT VERIFIED & CHECKED IN
                  ========================================================================= */}
              {scannedPatient && resultType === 'checked_in' && scannedAppointment && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Check-in Banner */}
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/80 flex items-start gap-3 text-emerald-950 dark:text-emerald-100 shadow-sm">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-300">
                          Appointment Confirmed & Checked-In
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                          STATUS: ARRIVED
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold mt-0.5 text-emerald-950 dark:text-white">
                        {scannedPatient.fullName} is verified for outpatient consultation.
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                        Patient has been automatically added to the Live Queue & Waiting Room display.
                      </p>
                    </div>
                  </div>

                  {/* Queue Ticket & Appointment Details Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Big Queue Ticket Badge */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950 text-white flex flex-col items-center justify-center text-center border border-teal-800 shadow-md">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        Live Waiting Ticket
                      </span>
                      <span className="text-3xl font-black font-mono tracking-tight text-white mt-1">
                        #{scannedAppointment.queueNumber || checkInTicket || 'Q-101'}
                      </span>
                      <span className="mt-2 text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full font-semibold border border-teal-400/40">
                        Waiting Room Queue
                      </span>
                    </div>

                    {/* Encounter Details */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-slate-500 font-medium">Assigned Physician:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                          {scannedAppointment.doctorName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-slate-500 font-medium">Scheduled Time:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {scannedAppointment.time} Today ({scannedAppointment.durationMinutes} min)
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-slate-500 font-medium">Department / Room:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {scannedAppointment.department} • {scannedAppointment.room || 'Room 302'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Visit Reason:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                          {scannedAppointment.reason}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Patient Core Summary Strip */}
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                        {scannedPatient.fullName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {scannedPatient.fullName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {scannedPatient.mrn} • {scannedPatient.age}y • {scannedPatient.gender}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                        Blood Type: {scannedPatient.bloodType}
                      </span>
                      <button
                        type="button"
                        onClick={() => setResultType('emergency_profile')}
                        className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>View Emergency Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleResetScanner}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Scan Next Patient</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setActiveTab('queue');
                        }}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Open Live Waiting Room</span>
                      </button>
                      {onStartConsultation && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onStartConsultation(scannedPatient.id);
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Stethoscope className="w-4 h-4 text-teal-400" />
                          <span>Start Doctor Consult</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  VIEW 2B: EMERGENCY MODE / CRITICAL MEDICAL INFORMATION
                  ========================================================================= */}
              {scannedPatient && resultType === 'emergency_profile' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* High-Visibility Emergency Header */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 text-white border-2 border-rose-500 shadow-lg flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white text-rose-700 flex items-center justify-center font-black text-xl shrink-0 shadow-md animate-pulse">
                        🚨
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-400/40 text-rose-200">
                            EMERGENCY MEDICAL PROFILE
                          </span>
                          {noAppointmentReason && (
                            <span className="text-[10px] text-rose-200 font-semibold bg-rose-700/60 px-2 py-0.5 rounded-full">
                              {noAppointmentReason}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black tracking-tight mt-1 text-white">
                          {scannedPatient.fullName}
                        </h3>
                        <p className="text-xs text-rose-200 font-mono">
                          MRN: {scannedPatient.mrn} • {scannedPatient.age} yrs • {scannedPatient.gender} • DOB: {scannedPatient.dob}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-rose-300 font-bold block uppercase tracking-wider">
                        ABO Blood Group
                      </span>
                      <span className="text-2xl font-black text-white bg-rose-950/80 px-3 py-1 rounded-xl border border-rose-400/50 inline-block mt-0.5 shadow-sm">
                        {scannedPatient.bloodType}
                      </span>
                    </div>
                  </div>

                  {/* CRITICAL ALLERGIES SECTION (Top Priority) */}
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Documented Allergies & Severe Sensitivities</span>
                      </h4>
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
                        {scannedPatient.allergies.length} Flagged
                      </span>
                    </div>

                    {scannedPatient.allergies.length === 0 ? (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>No Known Drug Allergies (NKDA) documented in Electronic Health ID.</span>
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {scannedPatient.allergies.map((alg, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border ${
                              alg.severity === 'severe'
                                ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100 shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs">{alg.allergen}</span>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                  alg.severity === 'severe'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-200 text-amber-900'
                                }`}
                              >
                                {alg.severity}
                              </span>
                            </div>
                            <p className="text-[11px] mt-1 opacity-90 leading-tight">
                              <span className="font-semibold">Reaction:</span> {alg.reaction || 'Severe adverse reaction'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* EMERGENCY CONTACT & VITALS SUMMARY GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Emergency Contact */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-300 dark:border-amber-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-600" />
                          <span>Primary Emergency Contact</span>
                        </h5>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          {scannedPatient.emergencyContact?.relationship || 'Family'}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white text-xs">
                            {scannedPatient.emergencyContact?.name || 'Not on file'}
                          </p>
                          <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5 font-bold">
                            {scannedPatient.emergencyContact?.phone || 'No phone recorded'}
                          </p>
                        </div>

                        {scannedPatient.emergencyContact?.phone && (
                          <a
                            href={`tel:${scannedPatient.emergencyContact.phone}`}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Latest Vitals Baseline */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-teal-600" />
                          <span>Latest Recorded Vitals</span>
                        </h5>
                        <span className="text-[10px] text-slate-400">
                          {scannedPatient.vitalsHistory?.[0]?.recordedAt ? 'Documented' : 'No Vitals'}
                        </span>
                      </div>

                      {scannedPatient.vitalsHistory?.[0] ? (
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] text-slate-400 block font-semibold">BP (mmHg)</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {scannedPatient.vitalsHistory[0].bloodPressureSystolic}/
                              {scannedPatient.vitalsHistory[0].bloodPressureDiastolic}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] text-slate-400 block font-semibold">Pulse</span>
                            <span className="text-xs font-black text-rose-600">
                              {scannedPatient.vitalsHistory[0].heartRate} bpm
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] text-slate-400 block font-semibold">SpO2</span>
                            <span className="text-xs font-black text-teal-600">
                              {scannedPatient.vitalsHistory[0].oxygenSaturation}%
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] text-slate-400 block font-semibold">Temp</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {scannedPatient.vitalsHistory[0].temperature}°C
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                          No vitals recorded in chart yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MEDICAL HISTORY & CURRENT MEDICATIONS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Chronic Conditions */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Chronic Conditions & Diagnoses:
                      </span>
                      {scannedPatient.chronicConditions.length ? (
                        <ul className="space-y-1">
                          {scannedPatient.chronicConditions.map((cond, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                              <span>{cond}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 text-[11px]">No chronic conditions documented.</p>
                      )}
                    </div>

                    {/* Active Medications */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Current Active Medications:
                      </span>
                      {scannedPatient.currentMedications.length ? (
                        <ul className="space-y-1">
                          {scannedPatient.currentMedications.map((med, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                              <span>{med}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 text-[11px]">No active medications documented.</p>
                      )}
                    </div>
                  </div>

                  {/* Emergency Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleResetScanner}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Scan Another Patient</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdmitWalkIn('Normal')}
                        className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 rounded-xl text-xs font-bold transition border border-teal-200 dark:border-teal-700 cursor-pointer"
                      >
                        Check-in as Walk-in
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdmitWalkIn('Emergency')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer animate-pulse"
                      >
                        <Flame className="w-4 h-4" />
                        <span>Admit to Emergency Queue</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
