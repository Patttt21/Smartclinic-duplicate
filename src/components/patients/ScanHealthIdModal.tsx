import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { useToast } from '../../context/ToastContext';
import { Appointment } from '../../types/clinic';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';
import { canUserScanQR } from '../../utils/qrPermissions';
import {
  QrCode,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  UserCheck,
  Smartphone,
  Lock,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'checkin';
  onStartConsultation?: (patientId: string) => void;
}

function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880.0, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  } catch {}
}

export const ScanHealthIdModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    appointments,
    verifyAppointmentQr,
    activeRole,
    primaryRole,
    staffSubRole,
    setActiveClinicalSessionProtected,
  } = useClinic();
  const { success: toastSuccess, error: toastError } = useToast();

  const isAuthorized = canUserScanQR(activeRole, primaryRole, staffSubRole);

  const [manualInput, setManualInput] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('Main Clinic Suite 302');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [verifiedAppointment, setVerifiedAppointment] = useState<Appointment | null>(null);
  const [patientSummary, setPatientSummary] = useState<{
    id: string;
    fullName: string;
    mrn: string;
    gender: string;
    age: number;
  } | null>(null);
  const [checkInCompleted, setCheckInCompleted] = useState<boolean>(false);
  const [alreadyCheckedInNotice, setAlreadyCheckedInNotice] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const scannerContainerId = 'appointment-qr-scanner-viewport';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermissionState, setCameraPermissionState] = useState<
    'idle' | 'requesting' | 'granted' | 'denied' | 'no_camera' | 'error'
  >('idle');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScannerRunning, setIsScannerRunning] = useState<boolean>(false);

  // Protect staff session against inactivity auto-logout while QR camera modal is open
  useEffect(() => {
    if (isOpen) {
      setActiveClinicalSessionProtected(true);
      return () => setActiveClinicalSessionProtected(false);
    }
  }, [isOpen, setActiveClinicalSessionProtected]);

  const stopCameraScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
      } finally {
        setIsScannerRunning(false);
      }
    }
  }, []);

  const handleVerifyLookup = useCallback(
    async (rawInput: string) => {
      const clean = rawInput.trim();
      if (!clean) return;

      setIsProcessing(true);
      setVerificationError(null);
      setAlreadyCheckedInNotice(null);
      setCheckInCompleted(false);
      await stopCameraScanner();

      try {
        const res = await verifyAppointmentQr(clean, false);
        if (!res.success || !res.appointment) {
          setVerifiedAppointment(null);
          setPatientSummary(null);
          const msg =
            res.error ||
            'Invalid or unrecognized Appointment QR / Booking Reference. Verify booking reference and retry.';
          setVerificationError(msg);
          toastError(msg);
          return;
        }

        setLastScannedCode(clean);
        setVerifiedAppointment(res.appointment);
        setPatientSummary(res.patientSummary || null);
        if (res.appointment.room) {
          setSelectedRoom(res.appointment.room);
        }
        if (res.alreadyCheckedIn || res.appointment.status === 'Checked In') {
          setAlreadyCheckedInNotice(
            `Appointment ${res.appointment.bookingReference || res.appointment.id} is already Checked In.`
          );
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [stopCameraScanner, verifyAppointmentQr, toastError]
  );

  const handleConfirmCheckIn = async () => {
    if (!verifiedAppointment || !lastScannedCode) return;
    setIsProcessing(true);
    setVerificationError(null);

    try {
      const res = await verifyAppointmentQr(lastScannedCode, true, selectedRoom);
      if (!res.success) {
        if (res.alreadyCheckedIn) {
          setAlreadyCheckedInNotice(res.error || 'Appointment is already checked in.');
        } else {
          setVerificationError(res.error || 'Unable to complete appointment check-in.');
        }
        toastError(res.error || 'Check-in blocked.');
        return;
      }

      if (res.appointment) {
        setVerifiedAppointment(res.appointment);
      }
      setCheckInCompleted(true);
      if (soundEnabled) playSuccessChime();
      toastSuccess(
        `Verified & Checked In: ${res.appointment?.patientName || 'Patient'} (${
          res.appointment?.bookingReference || verifiedAppointment.id
        })`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const startCameraScanner = useCallback(
    async (cameraDeviceOverride?: string) => {
      if (!isOpen || verifiedAppointment || !isAuthorized) return;
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

        let cameraConfig: string | MediaTrackConstraints = cameraDeviceOverride
          ? cameraDeviceOverride
          : { facingMode: { ideal: 'environment' } };

        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
            if (!cameraDeviceOverride) {
              const backCam = devices.find((d) =>
                (d.label || '').toLowerCase().match(/back|rear|environment/)
              );
              const preferred = backCam || devices[devices.length - 1];
              cameraConfig = preferred.id;
              setSelectedCameraId(preferred.id);
            }
          }
        } catch {
          cameraConfig = { facingMode: 'environment' };
        }

        await html5Qr.start(
          cameraConfig,
          { fps: 12, qrbox: 210 },
          (decodedText) => {
            handleVerifyLookup(decodedText);
          },
          () => {}
        );

        setIsScannerRunning(true);
        setCameraPermissionState('granted');
      } catch (err: any) {
        const errStr = (err?.message || err?.name || String(err)).toLowerCase();
        if (errStr.includes('notallowed') || errStr.includes('permission') || errStr.includes('denied')) {
          setCameraPermissionState('denied');
          setCameraErrorMessage(
            'Camera permission was denied. Enable camera access or enter the Booking Reference manually below.'
          );
        } else if (errStr.includes('notfound') || errStr.includes('devicesnotfound')) {
          setCameraPermissionState('no_camera');
          setCameraErrorMessage(
            'No physical camera detected on this device. Use manual Booking Reference lookup below.'
          );
        } else {
          setCameraPermissionState('error');
          setCameraErrorMessage(
            err?.message || 'Camera feed unavailable. Use manual Booking Reference lookup below.'
          );
        }
        setIsScannerRunning(false);
      }
    },
    [isOpen, verifiedAppointment, isAuthorized, stopCameraScanner, handleVerifyLookup]
  );

  useEffect(() => {
    if (isOpen && isAuthorized) {
      setVerifiedAppointment(null);
      setPatientSummary(null);
      setCheckInCompleted(false);
      setAlreadyCheckedInNotice(null);
      setVerificationError(null);
      setManualInput('');
      const timer = setTimeout(() => startCameraScanner(), 180);
      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }
  }, [isOpen, isAuthorized, startCameraScanner, stopCameraScanner]);

  const handleReset = () => {
    setVerifiedAppointment(null);
    setPatientSummary(null);
    setCheckInCompleted(false);
    setAlreadyCheckedInNotice(null);
    setVerificationError(null);
    setManualInput('');
    setLastScannedCode('');
    setTimeout(() => startCameraScanner(), 150);
  };

  const demoConfirmedBookings = appointments
    .filter((a) => !a.isSynthetic && !a.isWalkIn && a.status === 'Confirmed' && a.bookingReference)
    .slice(0, 2);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-4 text-xs font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="qr-scanner-modal-title"
                  className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base"
                >
                  Appointment QR Check-In Verification
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  Reception &amp; Nurse
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Verify non-PHI Appointment QR token or Booking Reference to check in scheduled
                arrivals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label={soundEnabled ? 'Mute check-in chime' : 'Enable check-in chime'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              aria-label="Close scanner dialog"
              onClick={() => {
                stopCameraScanner();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!isAuthorized ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Access Restricted: Receptionist &amp; Nurse Only
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Appointment QR arrival verification is restricted to authorized Receptionist and
              Nursing personnel.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Outpatient Emergency Scope Notice */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Outpatient Check-In Only:</strong> SmartClinic is an outpatient clinic
                system. Patients presenting with acute medical emergencies must be referred
                immediately to hospital emergency care.
              </span>
            </div>

            {!verifiedAppointment ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Align Appointment QR Pass in camera frame or enter Booking Reference</span>
                  </div>
                  {availableCameras.length > 1 && (
                    <select
                      aria-label="Select camera device"
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        startCameraScanner(e.target.value);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Camera Viewport */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[220px] flex flex-col items-center justify-center text-center p-4">
                  <div
                    id={scannerContainerId}
                    className={`w-full max-h-[280px] ${
                      cameraPermissionState === 'denied' ||
                      cameraPermissionState === 'no_camera' ||
                      cameraPermissionState === 'error'
                        ? 'hidden'
                        : 'block'
                    }`}
                  />

                  {cameraPermissionState === 'requesting' && (
                    <div className="text-slate-200 space-y-2 py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
                      <p className="font-bold">Initializing Camera Scanner...</p>
                    </div>
                  )}

                  {(cameraPermissionState === 'denied' ||
                    cameraPermissionState === 'no_camera' ||
                    cameraPermissionState === 'error') && (
                    <div className="space-y-2.5 max-w-md py-4">
                      <CameraOff className="w-7 h-7 text-amber-400 mx-auto" />
                      <p className="font-bold text-white text-xs">Camera Feed Unavailable</p>
                      <p className="text-[11px] text-slate-300">{cameraErrorMessage}</p>
                      <button
                        type="button"
                        onClick={() => startCameraScanner()}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}

                  {isScannerRunning && cameraPermissionState === 'granted' && (
                    <div className="mt-2 text-[10px] font-mono text-emerald-300">
                      CAMERA ACTIVE • READY TO SCAN APPOINTMENT QR
                    </div>
                  )}
                </div>

                {verificationError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{verificationError}</span>
                  </div>
                )}

                {/* Manual Booking Reference Lookup */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <label
                    htmlFor="booking-reference-input"
                    className="block font-bold text-slate-700 dark:text-slate-200"
                  >
                    Manual Booking Reference / USB Scanner Input
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="booking-reference-input"
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleVerifyLookup(manualInput);
                        }}
                        placeholder="Enter Booking Reference (e.g. SC-2026-1001)"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!manualInput.trim() || isProcessing}
                      onClick={() => handleVerifyLookup(manualInput)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {isProcessing ? 'Verifying...' : 'Verify Reference'}
                    </button>
                  </div>

                  {demoConfirmedBookings.length > 0 && (
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Confirmed Arrivals:
                      </span>
                      {demoConfirmedBookings.map((apt) => (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => handleVerifyLookup(apt.bookingReference || apt.id)}
                          className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 hover:border-blue-400 text-blue-700 dark:text-blue-300 font-mono font-semibold text-[11px] cursor-pointer"
                        >
                          {apt.bookingReference} ({apt.patientName})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Verified Appointment Preview & Check-In Confirmation */
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3 tabular-nums">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">
                        Verified Scheduled Booking
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {verifiedAppointment.patientName}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500">
                        MRN: {verifiedAppointment.patientMrn}
                        {patientSummary ? ` • ${patientSummary.gender}, ${patientSummary.age}y` : ''}
                      </span>
                    </div>
                    <span className="font-mono font-black text-xs px-3 py-1 rounded-lg bg-blue-600 text-white">
                      {verifiedAppointment.bookingReference || verifiedAppointment.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">
                        Assigned Physician
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {verifiedAppointment.doctorName}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {verifiedAppointment.department}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">
                        Date, Time &amp; Branch
                      </span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {verifiedAppointment.date} at {verifiedAppointment.time}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {verifiedAppointment.branch || 'Main Outpatient Clinic'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">
                        Consultation Mode
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {verifiedAppointment.consultationMode || 'In-Person'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">
                        Current Status
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {verifiedAppointment.status}
                      </span>
                    </div>
                  </div>

                  {!checkInCompleted && verifiedAppointment.status !== 'Checked In' && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <label
                        htmlFor="checkin-room-select"
                        className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Assign Consultation Suite / Intake Area
                      </label>
                      <select
                        id="checkin-room-select"
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                      >
                        <option value="Main Clinic Suite 302">Main Clinic Suite 302</option>
                        <option value="Cardiology Suite 204">Cardiology Suite 204</option>
                        <option value="Pediatrics Room 105">Pediatrics Room 105</option>
                        <option value="Annex Consult Room 2">Annex Consult Room 2</option>
                      </select>
                    </div>
                  )}
                </div>

                {alreadyCheckedInNotice && (
                  <div
                    role="status"
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{alreadyCheckedInNotice}</span>
                  </div>
                )}

                {verificationError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{verificationError}</span>
                  </div>
                )}

                {checkInCompleted && (
                  <div
                    role="status"
                    className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      Patient successfully verified and marked Checked In ({selectedRoom}). Assigned
                      physician has been notified.
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Another QR</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!checkInCompleted && verifiedAppointment.status !== 'Checked In' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleConfirmCheckIn}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{isProcessing ? 'Checking In...' : 'Verify & Check In'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
