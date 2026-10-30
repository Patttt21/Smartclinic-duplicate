import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Layers,
  BellRing,
  Stethoscope,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Activity,
  User,
  Plus,
  RefreshCw,
  Radio,
  ArrowRight,
  Maximize2,
  X,
  FileText,
  QrCode,
  UserPlus,
  UserX,
} from 'lucide-react';
import type { Appointment } from '../../types/clinic';
import { PrivacyPolicyModal } from '../auth/PrivacyPolicyModal';
import { ScanHealthIdModal } from '../patients/ScanHealthIdModal';
import { canUserScanQR } from '../../utils/qrPermissions';
import { getManilaDateString, formatManilaDateTime } from '../../utils/manilaTime';
import {
  evaluateWalkInCapacity,
  isAppointmentEligibleForNoShow,
  validateAppointmentSlotBooking,
} from '../../utils/schedulingRules';

interface Props {
  onStartConsultation: (patientId: string) => void;
}

// Web Audio API Hospital Broadcast 2-tone Ding-Dong Chime
function playHospitalBroadcastChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // High Tone (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Low Tone (C5 - 523.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.28);
    gain2.gain.setValueAtTime(0.25, now + 0.28);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.28);
    osc2.stop(now + 1.1);
  } catch (err) {
    console.warn('Audio broadcast chime notice:', err);
  }
}

// Real Voice Announcement using SpeechSynthesis
function announceTicketVoice(ticket: string, name: string, room: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const text = `Ticket number ${ticket}. ${name}. Please proceed to ${room}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.lang = 'en-PH'; // Philippine English accent fallback
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Voice announcement exception:', e);
    }
  }
}

export const QueueManager: React.FC<Props> = ({ onStartConsultation }) => {
  const {
    appointments,
    allClinicAppointments,
    users,
    updateAppointmentStatus,
    cancelAppointment,
    updateAppointmentRoom,
    checkInPatient,
    syncClinicalOrdersToInvoice,
    addAppointment,
    activeRole,
    primaryRole,
    staffSubRole,
    currentUser,
    linkedPatientId,
    patients,
    selectPatient,
    isAuthenticated,
    noShowGraceMinutes,
    setNoShowGraceMinutes,
    logAction,
    t,
    language,
  } = useClinic();

  const isFil = language === 'fil';

  // Philippine Standard Time Clock (UTC+8)
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastCalledAnnouncement, setLastCalledAnnouncement] = useState<{
    ticket: string;
    patientName: string;
    room: string;
    doctorName: string;
    department: string;
    timestamp: string;
  } | null>(null);

  // Self-Service Check-In Modal
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [checkInName, setCheckInName] = useState<string>('');
  const [checkInPhone, setCheckInPhone] = useState<string>('');
  const [checkInDepartment, setCheckInDepartment] = useState<string>('Internal Medicine');
  const [checkInReason, setCheckInReason] = useState<string>('General Consultation & Vitals Triage');
  const [recentCheckedInTicket, setRecentCheckedInTicket] = useState<string | null>(null);

  // Authorized Staff Walk-In Registration Modal (with Daily Physician Capacity Non-Displacement Check)
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInPatientId, setWalkInPatientId] = useState<string>('');
  const [walkInCustomName, setWalkInCustomName] = useState<string>('');
  const [walkInDoctorId, setWalkInDoctorId] = useState<string>('usr-1');
  const [walkInReason, setWalkInReason] = useState<string>('Same-day walk-in outpatient consultation');
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Live Auto-Refresh ticker
  const [, setLivePulse] = useState<number>(0);
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  // Live ticking PST clock effect
  useEffect(() => {
    const updatePstClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          timeZone: 'Asia/Manila',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updatePstClock();
    const interval = setInterval(updatePstClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Periodic simulated live pulse
  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setLivePulse((p) => p + 1);
    }, 5000);
    return () => clearInterval(pulseTimer);
  }, []);

  // Active Queue: strictly include active visits in outpatient clinic (Asia/Manila date)
  const todayStr = getManilaDateString();
  const isTodayOrDemoDate = (d?: string) => {
    if (!d) return true;
    const clean = d.split('T')[0].trim();
    return clean === todayStr || clean === '2026-10-06' || clean === '2026-10-28';
  };
  const activeQueueList = appointments.filter(
    (a) =>
      !a.isSynthetic &&
      a.status !== 'Cancelled' &&
      a.status !== 'Completed' &&
      a.status !== 'No Show' &&
      isTodayOrDemoDate(a.date) &&
      (a.status === 'Checked In' ||
        a.status === 'Called' ||
        a.status === 'In Consultation' ||
        a.status === 'Scheduled' ||
        a.status === 'Confirmed')
  );

  const checkedInList = activeQueueList.filter((a) => a.status === 'Checked In');
  const calledList = activeQueueList.filter((a) => a.status === 'Called');
  const inConsultList = activeQueueList.filter((a) => a.status === 'In Consultation');
  const scheduledUpcoming = activeQueueList.filter(
    (a) => a.status === 'Scheduled' || a.status === 'Confirmed'
  );
  const completedTodayCount = appointments.filter(
    (a) => !a.isSynthetic && a.status === 'Completed' && isTodayOrDemoDate(a.date)
  ).length;

  // Current user's patient ticket if authenticated as patient (Checked In, Called, or In Consultation)
  const patientTicket =
    isAuthenticated && activeRole === 'patient'
      ? appointments.find(
          (a) =>
            !a.isSynthetic &&
            (a.patientId === linkedPatientId ||
              (currentUser?.name && a.patientName.toLowerCase() === currentUser.name.toLowerCase())) &&
            (a.status === 'Checked In' || a.status === 'Called' || a.status === 'In Consultation')
        )
      : null;

  const [doctorScope, setDoctorScope] = useState<'my' | 'all'>('my');

  const isDoctor = activeRole === 'doctor';
  const isNurse = activeRole === 'nurse';
  const isReceptionist = activeRole === 'receptionist';
  const isAdmin = activeRole === 'admin';
  const isPatient = activeRole === 'patient';

  const isStaffOrDoctor =
    isAuthenticated && (isDoctor || isNurse || isReceptionist || isAdmin);

  const activeDoctors = useMemo(
    () => users.filter((u) => u.role === 'doctor' && u.status !== 'Inactive'),
    [users]
  );

  const selectedWalkInDoctor = useMemo(
    () => activeDoctors.find((d) => d.id === walkInDoctorId) || activeDoctors[0],
    [activeDoctors, walkInDoctorId]
  );

  const walkInCapacityStatus = useMemo(() => {
    if (!selectedWalkInDoctor) return null;
    return evaluateWalkInCapacity({
      doctor: selectedWalkInDoctor,
      date: todayStr,
      appointments: allClinicAppointments || appointments,
    });
  }, [selectedWalkInDoctor, todayStr, allClinicAppointments, appointments]);

  const displayedCheckedInList = useMemo(() => {
    if (isDoctor && doctorScope === 'my') {
      return checkedInList.filter((a) => {
        if (currentUser?.id && a.doctorId === currentUser.id) return true;
        if (currentUser?.name && a.doctorName) {
          return a.doctorName.toLowerCase().includes(currentUser.name.toLowerCase());
        }
        return false;
      });
    }
    return checkedInList;
  }, [checkedInList, isDoctor, doctorScope, currentUser]);

  const displayedCalledList = useMemo(() => {
    if (isDoctor && doctorScope === 'my') {
      return calledList.filter((a) => {
        if (currentUser?.id && a.doctorId === currentUser.id) return true;
        if (currentUser?.name && a.doctorName) {
          return a.doctorName.toLowerCase().includes(currentUser.name.toLowerCase());
        }
        return false;
      });
    }
    return calledList;
  }, [calledList, isDoctor, doctorScope, currentUser]);

  const displayedInConsultList = useMemo(() => {
    if (isDoctor && doctorScope === 'my') {
      return inConsultList.filter((a) => {
        if (currentUser?.id && a.doctorId === currentUser.id) return true;
        if (currentUser?.name && a.doctorName) {
          return a.doctorName.toLowerCase().includes(currentUser.name.toLowerCase());
        }
        return false;
      });
    }
    return inConsultList;
  }, [inConsultList, isDoctor, doctorScope, currentUser]);

  // Trigger standardized "Call Patient" workflow: transitions Checked In -> Called and dispatches real-time + push alert
  const handleCallPatient = (
    apt: Appointment,
    targetRoom?: string,
    targetStatus: 'Called' | 'In Consultation' = 'Called'
  ) => {
    let room = targetRoom || apt.room;
    if (!room || room === 'Waiting Room B') {
      if (isNurse) room = 'Triage Station 1';
      else if (isDoctor) room = 'Room 302 (Consultation Suite)';
      else if (isReceptionist) room = 'Room 302 (Consultation Suite)';
      else room = 'Room 302 (Consultation Suite)';
    }

    const announcement = {
      ticket: apt.queueNumber || 'Q-101',
      patientName: apt.patientName,
      room,
      doctorName: apt.doctorName || 'Dr. Maria Cristina Reyes, MD',
      department: apt.department || 'Outpatient Medicine',
      timestamp: new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setLastCalledAnnouncement(announcement);
    updateAppointmentStatus(apt.id, targetStatus, room);

    if (soundEnabled) {
      playHospitalBroadcastChime();
      setTimeout(() => {
        announceTicketVoice(announcement.ticket, announcement.patientName, announcement.room);
      }, 700);
    }
  };

  // Register Walk-In Patient with strict non-displacement capacity check
  const handleRegisterWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalkInDoctor || !walkInCapacityStatus) return;

    if (!walkInCapacityStatus.canAcceptWalkIn || !walkInCapacityStatus.suggestedSlotTime) {
      setWalkInError(
        walkInCapacityStatus.reason ||
          'Selected physician is at full capacity today. Walk-ins cannot displace confirmed online appointments.'
      );
      return;
    }

    const existingPat = patients.find((p) => p.id === walkInPatientId);
    const resolvedPatientId = existingPat ? existingPat.id : `pat-walkin-${Date.now()}`;
    const resolvedPatientName = existingPat ? existingPat.fullName : walkInCustomName.trim();
    const resolvedPatientMrn = existingPat
      ? existingPat.mrn
      : `MRN-2026-${String(patients.length + 201).padStart(3, '0')}`;

    if (!resolvedPatientName) {
      setWalkInError('Please select an existing patient or enter the walk-in patient full name.');
      return;
    }

    const slotValidation = validateAppointmentSlotBooking({
      patientId: resolvedPatientId,
      doctorId: selectedWalkInDoctor.id,
      date: todayStr,
      time: walkInCapacityStatus.suggestedSlotTime,
      appointments: allClinicAppointments || appointments,
      checkDuplicateQueue: true,
    });

    if (!slotValidation.valid) {
      setWalkInError(slotValidation.error || 'Duplicate active queue entry detected.');
      return;
    }

    setWalkInError(null);
    const createdWalkIn = addAppointment({
      patientId: resolvedPatientId,
      patientName: resolvedPatientName,
      patientMrn: resolvedPatientMrn,
      doctorId: selectedWalkInDoctor.id,
      doctorName: selectedWalkInDoctor.name,
      department: selectedWalkInDoctor.department || 'Internal Medicine',
      date: todayStr,
      time: walkInCapacityStatus.suggestedSlotTime,
      durationMinutes: 30,
      reason: walkInReason.trim() || 'Walk-in outpatient consultation',
      status: 'Checked In',
      type: 'Walk-In',
      isWalkIn: true,
      room: 'Waiting Room B',
      notes: `Authorized staff walk-in registration (${walkInCapacityStatus.remainingWalkInCapacity - 1} daily walk-in buffer slots remaining)`,
    });

    logAction(
      'WALK_IN_REGISTERED',
      'Appointment',
      createdWalkIn.id,
      `Registered walk-in patient ${resolvedPatientName} with ${selectedWalkInDoctor.name} without displacing ${walkInCapacityStatus.reservedOnlineCount} online bookings`
    );

    if (soundEnabled) playHospitalBroadcastChime();
    setShowWalkInModal(false);
    setWalkInPatientId('');
    setWalkInCustomName('');
  };

  const handleTestBroadcastChime = () => {
    playHospitalBroadcastChime();
    setTimeout(() => {
      announceTicketVoice('A-102', 'Liam Gabriel Torres', 'Room 302');
    }, 700);
    setLastCalledAnnouncement({
      ticket: 'A-102',
      patientName: 'Liam Gabriel Torres',
      room: 'Room 302',
      doctorName: 'Dr. Maria Cristina Reyes, MD',
      department: 'Internal Medicine',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Submit Self-Service Check-In
  const handleSelfCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInName.trim()) return;

    const patientId = `pat-${Date.now()}`;
    const cleanPhone = checkInPhone.trim() || '+639154050623';
    const newApt = addAppointment({
      patientId,
      patientName: checkInName.trim(),
      patientMrn: `MRN-2026-${String(patients.length + 101).padStart(3, '0')}`,
      doctorId: 'usr-1',
      doctorName: 'Dr. Maria Cristina Reyes, MD',
      department: checkInDepartment,
      date: todayStr,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      durationMinutes: 30,
      reason: checkInReason,
      status: 'Checked In',
      type: 'In-Person',
      room: 'Waiting Room B',
      notes: `Self-service kiosk check-in • Contact: ${cleanPhone}`,
    });

    const ticketNumber = newApt.queueNumber || 'Q-105';
    setRecentCheckedInTicket(ticketNumber);
    if (soundEnabled) playHospitalBroadcastChime();

    setTimeout(() => {
      setShowCheckInModal(false);
      setCheckInName('');
      setCheckInPhone('');
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs font-sans pb-16">
      {/* Top Banner: Service Coverage & Official Clinic Contacts */}
      <div className="p-3.5 bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 text-white rounded-2xl border border-teal-800/80 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                Live Queue
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                ACTIVE LIVE
              </span>
            </div>
            <p className="text-[11px] text-teal-200/90 mt-0.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                Service Coverage: <strong className="text-white">Philippines Only</strong>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                Globe: <strong className="text-white">+639154050623</strong>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3 text-emerald-400" />
                Email: <strong className="text-white">smartclinicrealacc@gmail.com</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Real Live PST Clock */}
        <div className="flex items-center gap-3 self-end md:self-auto bg-black/40 px-3.5 py-2 rounded-xl border border-teal-700/40 font-mono">
          <Clock className="w-4 h-4 text-teal-400 animate-spin-slow" />
          <div className="text-right">
            <div className="text-xs font-black text-emerald-300 tracking-wider">
              {currentTime || 'Loading PST...'}
            </div>
            <div className="text-[9px] text-slate-300 font-sans">
              Philippine Standard Time (PST)
            </div>
          </div>
        </div>
      </div>

      {/* Main Big Screen Header & Calling Display */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t.nav.queue}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isFil
                ? 'Real-time na daloy ng outpatient, pagtatala ng vitals sa triage, broadcast sa silid ng doktor, at progreso ng konsultasyon.'
                : 'Real-time outpatient patient flow, triage vitals processing, room calling broadcast, and clinical consultation progression.'}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Audio Broadcast Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle Hospital Broadcast Chime Sound"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? (isFil ? 'Naka-on ang Audio' : 'Broadcast Audio On') : (isFil ? 'Naka-mute' : 'Muted')}</span>
            </button>

            {/* Test Chime Button */}
            <button
              type="button"
              onClick={handleTestBroadcastChime}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-teal-600" />
              <span>{isFil ? 'Subukan ang Tunog' : 'Test Public Chime'}</span>
            </button>

            {/* View Privacy Policy Button */}
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 transition cursor-pointer"
              title="View Philippine Medical Privacy Policy (RA 10173)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{t.auth.privacyLink}</span>
            </button>

            {/* Scan Patient Health ID Check-in & Emergency Button (Receptionist & Nurse Only) */}
            {canUserScanQR(activeRole, primaryRole, staffSubRole) && (
              <button
                type="button"
                onClick={() => setShowScanModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-xs transition cursor-pointer"
                title="Scan Patient Electronic Health ID QR Code (Receptionist & Nurse Only)"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t.nav.scanHealthId}</span>
              </button>
            )}

            {/* Authorized Staff Walk-In Registration Button */}
            {isStaffOrDoctor && (
              <button
                type="button"
                onClick={() => {
                  setWalkInError(null);
                  setShowWalkInModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isFil ? 'I-rehistro ang Walk-In' : 'Register Walk-In Patient'}</span>
              </button>
            )}

            {/* Self-Service Check-in Button */}
            <button
              type="button"
              onClick={() => setShowCheckInModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isFil ? 'Kumuha ng Ticket / Mag-check In' : 'Get Queue Ticket / Check-In'}</span>
            </button>
          </div>
        </div>

        {/* Real-Time Operational Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
              <span>Waiting in Triage</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {checkedInList.length}
            </div>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400">Patients in lobby</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
              <span>In Consultation</span>
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
              {inConsultList.length}
            </div>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400">Physicians active</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
              <span>Completed Today</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {completedTodayCount}
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400">Consults finished</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
              <span>Called to Room</span>
              <BellRing className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {calledList.length}
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400">
              {completedTodayCount} completed today
            </span>
          </div>
        </div>
      </div>

      {/* Patient's Own Live Ticket Card (if authenticated as Patient) */}
      {patientTicket && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-teal-500/40 dark:border-teal-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-xl bg-teal-600 text-white font-mono font-black text-lg flex items-center justify-center shadow-md">
              {patientTicket.queueNumber || 'Q-101'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-teal-800 dark:text-teal-300">
                  Your Live Queue Ticket
                </span>
                <span className="text-[10px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold px-2 py-0.5 rounded-full">
                  {patientTicket.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {patientTicket.patientName} • {patientTicket.department}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Attending Physician: {patientTicket.doctorName} • Designated Area: {patientTicket.room || 'Waiting Room B'}
              </p>
            </div>
          </div>

          <div className="text-right self-end sm:self-auto">
            <span className="text-[10px] text-slate-400 block font-medium">Queue Status</span>
            <span className="text-base font-black text-teal-700 dark:text-teal-300 font-mono">
              {patientTicket.status === 'In Consultation'
                ? 'Now In Room'
                : patientTicket.status === 'Called'
                ? "It's Your Turn! Proceed to Room"
                : 'Checked In — Waiting for Call'}
            </span>
          </div>
        </div>
      )}

      {/* Hospital Public Calling Banner / Announcement Chime */}
      {lastCalledAnnouncement && (
        <div className="bg-gradient-to-r from-teal-700 to-cyan-800 text-white p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300 border border-teal-600/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Volume2 className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300 bg-black/30 px-2 py-0.5 rounded-full">
                  PUBLIC CALLING ANNOUNCEMENT
                </span>
                <span className="text-[10px] text-teal-200 font-mono">
                  {lastCalledAnnouncement.timestamp}
                </span>
              </div>
              <div className="text-lg font-black text-white mt-1">
                Ticket #{lastCalledAnnouncement.ticket} — {lastCalledAnnouncement.patientName}
              </div>
              <div className="text-xs text-teal-100 font-medium">
                Please proceed immediately to <strong>{lastCalledAnnouncement.room}</strong> ({lastCalledAnnouncement.doctorName})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleTestBroadcastChime}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Repeat Chime
            </button>
            <button
              type="button"
              onClick={() => setLastCalledAnnouncement(null)}
              className="px-3 py-1.5 bg-black/30 hover:bg-black/40 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Waiting vs In Consultation Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Waiting in Lobby & Triage (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                Waiting for Room Call ({displayedCheckedInList.length})
              </h2>
            </div>

            {/* Doctor Scope Toggle */}
            {isDoctor && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDoctorScope('my')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    doctorScope === 'my'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  My Patients
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorScope('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    doctorScope === 'all'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All Clinic Rooms
                </button>
              </div>
            )}

            {!isDoctor && (
              <span className="text-[11px] text-slate-400 font-medium">Order of Triage Arrival</span>
            )}
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {displayedCheckedInList.map((apt: Appointment, idx: number) => {
              const pat = patients.find((p) => p.id === apt.patientId);
              const hasVitals = Boolean(pat?.vitalsHistory && pat.vitalsHistory.length > 0);
              const latestV = hasVitals && pat ? pat.vitalsHistory[0] : null;

              return (
                <div
                  key={apt.id}
                  className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-black flex items-center justify-center font-mono text-base shrink-0 shadow-xs">
                      {apt.queueNumber || `A-${101 + idx}`}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {apt.patientName}
                        </h3>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                          Waiting #{idx + 1}
                        </span>
                        {hasVitals && latestV ? (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Vitals Ready: {latestV.bloodPressureSystolic}/{latestV.bloodPressureDiastolic} mmHg
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                            Needs Nurse Triage
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {apt.department} • Dr. {apt.doctorName}
                      </p>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-mono">Time: {apt.time}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Room:</span>
                          {isAdmin ? (
                            <select
                              value={apt.room || 'Waiting Room B'}
                              onChange={(e) => updateAppointmentRoom(apt.id, e.target.value)}
                              className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              <option value="Waiting Room B">Waiting Room B</option>
                              <option value="Triage Station 1">Triage Station 1</option>
                              <option value="Triage Station 2">Triage Station 2</option>
                              <option value="Room 301 (Pediatrics)">Room 301 (Pediatrics)</option>
                              <option value="Room 302 (Consultation Suite)">Room 302 (Consultation Suite)</option>
                              <option value="Room 303 (Internal Medicine)">Room 303 (Internal Medicine)</option>
                              <option value="Room 304 (Cardiology)">Room 304 (Cardiology)</option>
                            </select>
                          ) : (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{apt.room || 'Waiting Room B'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role-Specific Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    {/* DOCTOR ACTIONS */}
                    {isDoctor && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCallPatient(apt, 'Room 302 (Consultation Suite)', 'Called')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                          title="Call patient and dispatch real-time notification"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Call Patient</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            selectPatient(apt.patientId);
                            onStartConsultation(apt.patientId);
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Examine & SOAP</span>
                        </button>
                      </>
                    )}

                    {/* NURSE ACTIONS */}
                    {isNurse && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCallPatient(apt, 'Triage Station 1', 'Called')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                          title="Call patient and dispatch real-time notification"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Call Patient</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            selectPatient(apt.patientId);
                            onStartConsultation(apt.patientId);
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Triage & Vitals Intake</span>
                        </button>
                      </>
                    )}

                    {/* RECEPTIONIST ACTIONS */}
                    {isReceptionist && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCallPatient(apt, apt.room && apt.room !== 'Waiting Room B' ? apt.room : 'Room 302 (Consultation Suite)', 'Called')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Call Patient</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelAppointment(apt.id, 'Cancelled at reception')}
                          className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-medium transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {/* ADMIN ACTIONS */}
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCallPatient(apt, undefined, 'Called')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Call Patient</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelAppointment(apt.id, 'Cancelled by admin')}
                          className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-medium transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {isPatient && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Queue #{idx + 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {displayedCheckedInList.length === 0 && (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 stroke-1" />
                <p className="text-xs font-medium">Outpatient lobby is currently clear.</p>
                <p className="text-[11px] text-slate-400">
                  Select a scheduled patient below to check them in, or click "Get Queue Ticket / Check-In".
                </p>
              </div>
            )}
          </div>

          {/* Upcoming Scheduled Arrivals + No-Show Grace Period Control */}
          {(isReceptionist || isNurse || isDoctor || isAdmin) && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Upcoming Scheduled Today ({scheduledUpcoming.length})
                  </span>
                  <span className="ml-2 text-[10px] text-teal-600 font-semibold">
                    Asia/Manila Check-In Window
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <span>No-Show Grace Period:</span>
                  <select
                    aria-label="No-Show Grace Period"
                    value={noShowGraceMinutes}
                    onChange={(e) => setNoShowGraceMinutes(Number(e.target.value))}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value={15}>15 mins</option>
                    <option value={20}>20 mins</option>
                    <option value={25}>25 mins</option>
                    <option value={30}>30 mins</option>
                  </select>
                </label>
              </div>
              {scheduledUpcoming.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-2">
                  All scheduled bookings for today have been processed.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {scheduledUpcoming.map((apt) => {
                    const graceStatus = isAppointmentEligibleForNoShow(apt, noShowGraceMinutes);
                    return (
                      <div
                        key={apt.id}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              {apt.patientName}
                            </span>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-mono">
                              {apt.time}
                            </span>
                            {graceStatus.eligible && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded font-bold">
                                Grace Elapsed ({graceStatus.minutesLate}m late)
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {apt.department} • {apt.doctorName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => checkInPatient(apt.id, 'Waiting Room B')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
                          >
                            Check In Patient
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAppointmentStatus(apt.id, 'No Show')}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1"
                            title="Mark missed appointment as No Show after grace period"
                          >
                            <UserX className="w-3 h-3" />
                            <span>Mark No-Show</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelAppointment(apt.id, 'Cancelled from waiting room')}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium transition cursor-pointer shrink-0"
                            title="Cancel appointment"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Called Patients & Currently In Consultation Rooms (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-5">
          {/* Called — Proceeding to Room */}
          <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-emerald-600" />
                <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                  Called — Proceeding to Room ({displayedCalledList.length})
                </h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Real-Time Alert Active
              </span>
            </div>

            {displayedCalledList.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-2">
                No patients currently in Called transition state. Click &ldquo;Call Patient&rdquo; on a checked-in patient to notify them immediately.
              </p>
            ) : (
              <div className="space-y-2.5">
                {displayedCalledList.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300/80 dark:border-emerald-800/70 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-mono font-black text-sm flex items-center justify-center shrink-0">
                          {apt.queueNumber || 'Q-101'}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {apt.patientName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                apt.calledAcknowledgedAt
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              }`}
                            >
                              {apt.calledAcknowledgedAt ? 'Patient Acknowledged' : 'Awaiting Patient'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            Proceed to <strong>{apt.room || 'Room 302'}</strong> • {apt.doctorName}
                          </p>
                          {apt.calledAt && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Called: {formatManilaDateTime(apt.calledAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {isStaffOrDoctor && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50 flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateAppointmentStatus(
                              apt.id,
                              'In Consultation',
                              apt.room || 'Room 302 (Consultation Suite)'
                            )
                          }
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                          Start Consultation
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCallPatient(apt, apt.room, 'Called')}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-semibold cursor-pointer transition"
                        >
                          Call Patient Again
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(apt.id, 'No Show')}
                          className="px-2 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs font-medium cursor-pointer transition"
                        >
                          No Show
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-500" />
              <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                Consultation Rooms ({displayedInConsultList.length})
              </h2>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Now Serving
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {displayedInConsultList.map((apt: Appointment) => (
              <div
                key={apt.id}
                className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-blue-600 text-white font-mono font-black text-base flex items-center justify-center shadow-md shrink-0">
                      {apt.queueNumber || 'A-101'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 font-extrabold px-2 py-0.5 rounded-full">
                          {apt.room || 'Room 302'}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Active Consult
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                        {apt.patientName}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {apt.department} • Dr. {apt.doctorName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role-Specific Actions in In-Consultation */}
                <div className="pt-2 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Time: {apt.time}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Doctor Action: Resume Consultation & Complete in SOAP Suite */}
                    {isDoctor && (
                      <button
                        type="button"
                        onClick={() => {
                          selectPatient(apt.patientId);
                          onStartConsultation(apt.patientId);
                        }}
                        className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Resume SOAP Notes</span>
                      </button>
                    )}

                    {/* Nurse Display */}
                    {isNurse && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        With Physician in {apt.room || 'Room 302'}
                      </span>
                    )}

                    {/* Receptionist Display */}
                    {isReceptionist && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Consultation in progress
                      </span>
                    )}

                    {/* Admin Action: Master Override */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          updateAppointmentStatus(apt.id, 'Completed');
                          const pat = patients.find((p) => p.id === apt.patientId);
                          syncClinicalOrdersToInvoice({
                            patientId: apt.patientId,
                            patientName: apt.patientName,
                            patientMrn: apt.patientMrn,
                            doctorName: apt.doctorName,
                            consultationFee: 800,
                            hmoPartner: pat?.insuranceProvider,
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Admin Complete & Bill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {displayedInConsultList.length === 0 && (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Stethoscope className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 stroke-1" />
                <p className="text-xs font-medium">No physicians currently in consultation.</p>
                <p className="text-[11px] text-slate-400">
                  Call the next patient from the waiting list to begin consultation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Self-Service Kiosk / Queue Ticket Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setShowCheckInModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-2 font-bold shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Self-Service Queue Check-In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Outpatient Reception Kiosk • Service Coverage: Philippines Only
              </p>
            </div>

            {recentCheckedInTicket ? (
              <div className="p-6 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-center space-y-3 animate-in zoom-in-95">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Check-In Confirmed! Your Ticket is:
                </h3>
                <div className="text-4xl font-black font-mono text-teal-700 dark:text-teal-300 tracking-wider">
                  #{recentCheckedInTicket}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Please take a seat in <strong>Waiting Room B</strong>. Watch the live display and listen for the broadcast chime when called.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSelfCheckIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Patient Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={checkInName}
                    onChange={(e) => setCheckInName(e.target.value)}
                    placeholder="e.g., Juan Dela Cruz"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Philippine Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={checkInPhone}
                    onChange={(e) => setCheckInPhone(e.target.value)}
                    placeholder="+63 915 405 0623"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clinical Department / Service
                  </label>
                  <select
                    value={checkInDepartment}
                    onChange={(e) => setCheckInDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    <option value="Internal Medicine">Internal Medicine & Endocrinology</option>
                    <option value="Cardiology">Cardiology & Cardiovascular Clinic</option>
                    <option value="Pediatrics">General Pediatrics & Immunization</option>
                    <option value="Family Medicine">Family Medicine & Preventive Health</option>
                    <option value="Urgent Care">Urgent Outpatient Triage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Consultation
                  </label>
                  <input
                    type="text"
                    value={checkInReason}
                    onChange={(e) => setCheckInReason(e.target.value)}
                    placeholder="e.g., Routine Follow-up, Fever, Cough, BP check"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Generate Live Ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Authorized Staff Walk-In Registration Modal (Non-Displacement Capacity Guard) */}
      {showWalkInModal && isStaffOrDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="walkin-modal-title"
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowWalkInModal(false)}
              aria-label="Close walk-in registration modal"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 id="walkin-modal-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                Register Walk-In Patient (Capacity Protected)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Confirmed online bookings reserve their slots and are never displaced by walk-in arrivals.
              </p>
            </div>

            <form onSubmit={handleRegisterWalkIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attending Physician ({todayStr})
                </label>
                <select
                  value={walkInDoctorId}
                  onChange={(e) => {
                    setWalkInDoctorId(e.target.value);
                    setWalkInError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {activeDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} — {doc.department}
                    </option>
                  ))}
                </select>
              </div>

              {walkInCapacityStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    walkInCapacityStatus.canAcceptWalkIn
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Daily Physician Slot Capacity Check</span>
                    <span className="font-mono">
                      {walkInCapacityStatus.remainingWalkInCapacity} Walk-In Slots Open
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60">
                      <span className="text-slate-500 block">Total Daily Slots</span>
                      <strong className="font-mono text-sm">{walkInCapacityStatus.totalDailySlots}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60">
                      <span className="text-slate-500 block">Reserved Online</span>
                      <strong className="font-mono text-sm">{walkInCapacityStatus.reservedOnlineCount}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60">
                      <span className="text-slate-500 block">Active Walk-Ins</span>
                      <strong className="font-mono text-sm">{walkInCapacityStatus.activeWalkInCount}</strong>
                    </div>
                  </div>
                  {!walkInCapacityStatus.canAcceptWalkIn && walkInCapacityStatus.reason && (
                    <p className="text-[11px] font-semibold pt-1">{walkInCapacityStatus.reason}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Registered Patient (or leave blank for new walk-in)
                </label>
                <select
                  value={walkInPatientId}
                  onChange={(e) => {
                    setWalkInPatientId(e.target.value);
                    setWalkInError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- New Unregistered Walk-In Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              {!walkInPatientId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Walk-In Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={walkInCustomName}
                    onChange={(e) => setWalkInCustomName(e.target.value)}
                    placeholder="e.g., Maria Clara Mendoza"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chief Complaint / Walk-In Reason
                </label>
                <input
                  type="text"
                  value={walkInReason}
                  onChange={(e) => setWalkInReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {walkInError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{walkInError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!walkInCapacityStatus?.canAcceptWalkIn}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl cursor-pointer transition"
                >
                  Confirm Walk-In & Issue Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health ID QR Scanner Modal for Staff */}
      <ScanHealthIdModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onStartConsultation={onStartConsultation}
      />

      {/* Medical Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};
