import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { useClinic } from '../../context/ClinicContext';
import { usePrint } from '../../context/PrintContext';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  MapPin,
  Stethoscope,
  Video,
  Building2,
  Printer,
  QrCode,
  Info,
} from 'lucide-react';
import type {
  User as ClinicUser,
  Appointment,
  ConsultationMode,
  ClinicBranch,
} from '../../types/clinic';
import {
  getDoctorSchedule,
  isDoctorWorkingOnDate,
  formatTimeSlot,
  getDoctorSlotAvailability,
  normalizeTimeTo24Hour,
} from '../../utils/doctorSchedules';
import { getManilaDateString } from '../../utils/manilaTime';
import {
  canPatientRebookOnDate,
  validateAppointmentSlotBooking,
  validatePatientBookingDateManila,
  NO_SAME_DAY_BOOKING_MESSAGE,
} from '../../utils/schedulingRules';
import {
  CLINIC_BRANCHES,
  matchSpecialtiesForReason,
  isDoctorOfferedAtBranch,
  NON_DIAGNOSTIC_MATCHER_DISCLAIMER,
} from '../../utils/specialtyMatcher';

interface Props {
  initialPatientId?: string;
  onClose: () => void;
}

const SAFE_BOOKING_DRAFT_KEY = 'smart_clinic_v2_safe_draft_booking';

export const BookAppointmentModal: React.FC<Props> = ({ initialPatientId, onClose }) => {
  const {
    patients,
    users,
    appointments,
    allClinicAppointments,
    createAppointmentVerified,
    activeRole,
    primaryRole,
    linkedPatientId,
    visiblePatients,
    setActiveTab,
    triageDraftForBooking,
    setTriageDraftForBooking,
    setActiveClinicalSessionProtected,
  } = useClinic();
  const { printAppointmentConfirmation, printAppointmentQr } = usePrint();

  useEffect(() => {
    setActiveClinicalSessionProtected(true);
    return () => setActiveClinicalSessionProtected(false);
  }, [setActiveClinicalSessionProtected]);

  const isPatientLocked =
    (primaryRole === 'patient' || activeRole === 'patient') && Boolean(linkedPatientId);
  const patientOptions = isPatientLocked ? visiblePatients : patients;

  const doctors: ClinicUser[] = useMemo(
    () => users.filter((u) => u.role === 'doctor' && u.status !== 'Inactive'),
    [users]
  );

  const savedSafeDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem(SAFE_BOOKING_DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const todayManila = useMemo(() => getManilaDateString(), []);
  const tomorrowManila = useMemo(() => {
    const [y, m, d] = todayManila.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return dt.toISOString().split('T')[0];
  }, [todayManila]);

  // Wizard Steps covering all 16 functional steps:
  // Step 1: Branch -> Reason -> Non-diagnostic Specialty Suggestions -> Select Specialty -> Select Available Doctor
  // Step 2: Doctor Schedule Calendar (No Same-Day Booking in Asia/Manila) -> Available Time Slot -> Consultation Mode (In-Person / Online)
  // Step 3: Review All Details & Confirm
  // Step 4: Immediate Auto-Confirmed Booking Reference + Non-PHI QR / Online Access + Print
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [selectedBranch, setSelectedBranch] = useState<ClinicBranch>(
    savedSafeDraft?.selectedBranch === 'Annex Satellite Clinic'
      ? 'Annex Satellite Clinic'
      : CLINIC_BRANCHES[0]
  );
  const [reason, setReason] = useState<string>(
    triageDraftForBooking?.reason || savedSafeDraft?.reason || ''
  );

  // Non-diagnostic specialty suggestions based on free-text reason and selected branch
  const specialtyMatchResult = useMemo(
    () =>
      matchSpecialtiesForReason({
        reason,
        branch: selectedBranch,
        doctors,
      }),
    [reason, selectedBranch, doctors]
  );

  // All specialties available at the selected branch
  const branchSpecialties = useMemo(() => {
    const set = new Set<string>();
    doctors
      .filter((d) => isDoctorOfferedAtBranch(d, selectedBranch))
      .forEach((d) => {
        if (d.specialty) set.add(d.specialty);
        else if (d.department) set.add(d.department);
      });
    return Array.from(set);
  }, [doctors, selectedBranch]);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(() => {
    if (triageDraftForBooking?.specialty) return triageDraftForBooking.specialty;
    if (savedSafeDraft?.selectedSpecialty) return savedSafeDraft.selectedSpecialty;
    return '';
  });

  // Auto-select top suggested specialty when typing reason if user hasn't manually picked a specialty incompatible with branch
  useEffect(() => {
    if (!selectedSpecialty && specialtyMatchResult.suggestions.length > 0) {
      const topAvailable = specialtyMatchResult.suggestions.find((s) =>
        branchSpecialties.some(
          (bs) =>
            bs.toLowerCase().includes(s.specialty.toLowerCase()) ||
            s.specialty.toLowerCase().includes(bs.toLowerCase())
        )
      );
      if (topAvailable) {
        const matchedBranchSpec =
          branchSpecialties.find(
            (bs) =>
              bs.toLowerCase().includes(topAvailable.specialty.toLowerCase()) ||
              topAvailable.specialty.toLowerCase().includes(bs.toLowerCase())
          ) || '';
        if (matchedBranchSpec) setSelectedSpecialty(matchedBranchSpec);
      }
    }
  }, [specialtyMatchResult, branchSpecialties, selectedSpecialty]);

  // Actual available doctors at selected branch + specialty
  const availableBranchDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (!isDoctorOfferedAtBranch(doc, selectedBranch)) return false;
      if (!selectedSpecialty || selectedSpecialty === 'ALL') return true;
      const specLower = selectedSpecialty.toLowerCase();
      return (
        (doc.specialty && doc.specialty.toLowerCase().includes(specLower)) ||
        (doc.department && doc.department.toLowerCase().includes(specLower)) ||
        specLower.includes((doc.department || '').toLowerCase())
      );
    });
  }, [doctors, selectedBranch, selectedSpecialty]);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    if (triageDraftForBooking?.recommendedDoctorId) {
      return triageDraftForBooking.recommendedDoctorId;
    }
    if (savedSafeDraft?.selectedDoctorId) return savedSafeDraft.selectedDoctorId;
    return '';
  });

  useEffect(() => {
    if (
      availableBranchDoctors.length > 0 &&
      !availableBranchDoctors.some((d) => d.id === selectedDoctorId)
    ) {
      setSelectedDoctorId(availableBranchDoctors[0].id);
    } else if (availableBranchDoctors.length === 0) {
      setSelectedDoctorId('');
    }
  }, [availableBranchDoctors, selectedDoctorId]);

  const selectedDoctor = useMemo(
    () => availableBranchDoctors.find((d) => d.id === selectedDoctorId) || null,
    [availableBranchDoctors, selectedDoctorId]
  );

  const selectedDoctorSchedule = useMemo(
    () => (selectedDoctor ? getDoctorSchedule(selectedDoctor.id, selectedDoctor) : null),
    [selectedDoctor]
  );

  const doctorOfferedModes: ConsultationMode[] = useMemo(() => {
    if (!selectedDoctor) return ['In-Person'];
    return selectedDoctor.consultationModes && selectedDoctor.consultationModes.length > 0
      ? selectedDoctor.consultationModes
      : ['In-Person'];
  }, [selectedDoctor]);

  const [consultationMode, setConsultationMode] = useState<ConsultationMode>('In-Person');

  useEffect(() => {
    if (!doctorOfferedModes.includes(consultationMode)) {
      setConsultationMode(doctorOfferedModes[0]);
    }
  }, [doctorOfferedModes, consultationMode]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const candidate =
      triageDraftForBooking?.preferredDate || savedSafeDraft?.selectedDate || tomorrowManila;
    return candidate > todayManila ? candidate : tomorrowManila;
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [sameDayAttemptNotice, setSameDayAttemptNotice] = useState<string | null>(null);
  const [staffOverrideReason, setStaffOverrideReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [confirmedQrDataUrl, setConfirmedQrDataUrl] = useState<string>('');

  const [selectedPatId, setSelectedPatId] = useState<string>(
    (isPatientLocked ? linkedPatientId : null) || initialPatientId || patientOptions[0]?.id || ''
  );
  const effectivePatId = isPatientLocked ? linkedPatientId || selectedPatId : selectedPatId;
  const selectedPatient =
    patientOptions.find((p) => p.id === effectivePatId) ||
    patients.find((p) => p.id === effectivePatId) ||
    patientOptions[0];

  // Persist non-PHI draft
  useEffect(() => {
    if (currentStep === 4) return;
    try {
      localStorage.setItem(
        SAFE_BOOKING_DRAFT_KEY,
        JSON.stringify({
          selectedBranch,
          selectedSpecialty,
          selectedDoctorId,
          selectedDate,
          consultationMode,
          reason: reason.slice(0, 120),
        })
      );
    } catch {}
  }, [
    selectedBranch,
    selectedSpecialty,
    selectedDoctorId,
    selectedDate,
    consultationMode,
    reason,
    currentStep,
  ]);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const [y, m] = tomorrowManila.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const clinicAppointments = allClinicAppointments || appointments;

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isPast: boolean;
      isTodayManila: boolean;
      isBlockedDate: boolean;
      isWorkDay: boolean;
      availableSlotsCount: number;
    }> = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = dateString < todayManila;
      const isTodayManila = dateString === todayManila;
      const isBlockedDate = dateString <= todayManila;
      const isWorkDay = selectedDoctor
        ? isDoctorWorkingOnDate(selectedDoctor.id, dateString, selectedDoctor)
        : false;
      const daySlots =
        selectedDoctor && isWorkDay && !isBlockedDate
          ? getDoctorSlotAvailability(
              selectedDoctor.id,
              dateString,
              clinicAppointments,
              undefined,
              selectedDoctor
            )
          : [];
      const availableSlotsCount = daySlots.filter((s) => s.isAvailable).length;

      days.push({
        dateString,
        dayNumber: day,
        isPast,
        isTodayManila,
        isBlockedDate,
        isWorkDay,
        availableSlotsCount,
      });
    }

    return { firstDayIndex, days };
  }, [calendarMonth, todayManila, selectedDoctor, allClinicAppointments, appointments]);

  const slotAvailability = useMemo(() => {
    if (!selectedDate || !selectedDoctor || selectedDate <= todayManila) return [];
    const clinicAppointments = allClinicAppointments || appointments;
    return getDoctorSlotAvailability(
      selectedDoctor.id,
      selectedDate,
      clinicAppointments,
      undefined,
      selectedDoctor
    );
  }, [selectedDate, selectedDoctor, todayManila, allClinicAppointments, appointments]);

  const rebookPolicyStatus = useMemo(() => {
    if (!selectedPatient || !selectedDate) {
      return { allowed: true, requiresStaffOverride: false, overriddenByStaff: false };
    }
    return canPatientRebookOnDate({
      patientId: selectedPatient.id,
      targetDate: selectedDate,
      appointments: allClinicAppointments || appointments,
      actorRole: activeRole,
      staffOverrideReason,
    });
  }, [
    selectedPatient,
    selectedDate,
    allClinicAppointments,
    appointments,
    activeRole,
    staffOverrideReason,
  ]);

  const handleModalClose = () => {
    setTriageDraftForBooking(null);
    onClose();
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedTimeSlot) return;

    const dateCheck = validatePatientBookingDateManila(selectedDate);
    if (!dateCheck.valid) {
      setBookingError(dateCheck.error || NO_SAME_DAY_BOOKING_MESSAGE);
      return;
    }

    const clinicAppointments = allClinicAppointments || appointments;
    const slotGuard = validateAppointmentSlotBooking({
      patientId: selectedPatient.id,
      doctorId: selectedDoctor.id,
      date: selectedDate,
      time: normalizeTimeTo24Hour(selectedTimeSlot),
      durationMinutes: 30,
      appointments: clinicAppointments,
      checkDuplicateQueue: false,
    });

    if (!slotGuard.valid) {
      setBookingError(slotGuard.error || 'Selected time slot is already booked.');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const response = await createAppointmentVerified({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        patientMrn: selectedPatient.mrn,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.specialty || selectedDoctor.department || selectedSpecialty,
        branch: selectedBranch,
        date: selectedDate,
        time: normalizeTimeTo24Hour(selectedTimeSlot),
        durationMinutes: 30,
        reason: reason.trim() || 'Scheduled outpatient consultation',
        status: 'Confirmed',
        consultationMode,
        type: consultationMode === 'Online Consultation' ? 'Online Consultation' : 'In-Person',
        isWalkIn: false,
        room:
          consultationMode === 'Online Consultation'
            ? 'Private Teleconsultation Room'
            : selectedBranch === 'Annex Satellite Clinic'
            ? 'Annex Consult Room 2'
            : 'Main Clinic Suite 302',
        staffOverrideReason: rebookPolicyStatus.overriddenByStaff
          ? staffOverrideReason.trim()
          : undefined,
      });

      if (!response.success || !response.appointment) {
        setBookingError(response.error || 'Unable to save appointment. Please choose another slot.');
        setIsSubmitting(false);
        return;
      }

      const savedApt = response.appointment;
      setConfirmedAppointment(savedApt);

      // Generate strictly non-PHI QR image for In-Person check-in
      const nonPhiQrString =
        response.qrPayload ||
        savedApt.qrPayload ||
        JSON.stringify({
          v: 2,
          ref: savedApt.bookingReference || savedApt.id,
          token: savedApt.qrToken || 'verified-ref',
        });

      try {
        const dataUrl = await QRCode.toDataURL(nonPhiQrString, {
          width: 210,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setConfirmedQrDataUrl(dataUrl);
      } catch {
        setConfirmedQrDataUrl('');
      }

      try {
        localStorage.removeItem(SAFE_BOOKING_DRAFT_KEY);
      } catch {}

      setCurrentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-appointment-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden text-xs font-sans my-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="book-appointment-title"
                className="text-sm sm:text-base font-bold text-slate-900 dark:text-white"
              >
                Schedule Outpatient Appointment
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Auto-confirmed slot reservation • Asia/Manila clinic schedule
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            aria-label="Close booking dialog"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        {currentStep < 4 && (
          <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-[11px] font-semibold">
            <div
              className={`flex items-center gap-1.5 ${
                currentStep === 1
                  ? 'text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono">
                1
              </span>
              <span className="truncate">Branch, Specialty &amp; Doctor</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                currentStep === 2
                  ? 'text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                  currentStep >= 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                2
              </span>
              <span className="truncate">Date, Slot &amp; Mode</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                currentStep === 3
                  ? 'text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                  currentStep >= 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                3
              </span>
              <span className="truncate">Review &amp; Auto-Confirm</span>
            </div>
          </div>
        )}

        {/* STEP 1: BRANCH -> REASON -> SPECIALTY SUGGESTION -> DOCTOR */}
        {currentStep === 1 && (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {!isPatientLocked && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Patient Profile
                </label>
                <select
                  value={selectedPatId}
                  onChange={(e) => setSelectedPatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 1. Select Clinic Branch */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                1. Select Clinic Branch
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CLINIC_BRANCHES.map((branch) => {
                  const active = selectedBranch === branch;
                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => {
                        setSelectedBranch(branch);
                        setSelectedTimeSlot('');
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        active
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div>
                        <span className="font-bold block text-xs">{branch}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {branch === 'Main Outpatient Clinic'
                            ? 'Full multi-specialty & online teleconsultations'
                            : 'Satellite outpatient & primary consultation desk'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Enter Free-Text Reason for Consultation */}
            <div>
              <label
                htmlFor="booking-reason-input"
                className="block font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                2. Reason for Consultation / Presenting Symptoms
              </label>
              <input
                id="booking-reason-input"
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., High fever and cough for 2 days, blood pressure follow-up, skin rash"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 3. Non-Diagnostic Specialty Suggestions & 4. Select Specialty */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    3. Suggested Specialties (Non-Diagnostic Guidance):
                  </span>{' '}
                  <span>{NON_DIAGNOSTIC_MATCHER_DISCLAIMER}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {specialtyMatchResult.suggestions.map((sug) => {
                  const matchingBranchSpec =
                    branchSpecialties.find(
                      (bs) =>
                        bs.toLowerCase().includes(sug.specialty.toLowerCase()) ||
                        sug.specialty.toLowerCase().includes(bs.toLowerCase())
                    ) || sug.specialty;
                  const isChosen =
                    selectedSpecialty.toLowerCase() === matchingBranchSpec.toLowerCase();
                  return (
                    <button
                      key={sug.specialty}
                      type="button"
                      onClick={() => {
                        setSelectedSpecialty(matchingBranchSpec);
                        setSelectedTimeSlot('');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer whitespace-nowrap ${
                        isChosen
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                      }`}
                      title={sug.guidanceNote}
                    >
                      Recommended: {matchingBranchSpec}
                    </button>
                  );
                })}
              </div>

              <div>
                <label
                  htmlFor="specialty-select"
                  className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  4. Choose Specialty Manually (or keep suggestion)
                </label>
                <select
                  id="specialty-select"
                  value={selectedSpecialty}
                  onChange={(e) => {
                    setSelectedSpecialty(e.target.value);
                    setSelectedTimeSlot('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="ALL">All Specialties at {selectedBranch}</option>
                  {branchSpecialties.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5 & 6. Available Doctors at Selected Branch */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                5. Select Available Physician at {selectedBranch} ({availableBranchDoctors.length})
              </label>

              {availableBranchDoctors.length === 0 ? (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                  No physicians for <strong>{selectedSpecialty}</strong> are scheduled at{' '}
                  <strong>{selectedBranch}</strong>. Please select &ldquo;All Specialties&rdquo; or
                  switch clinic branch.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {availableBranchDoctors.map((doc) => {
                    const isSelected = doc.id === selectedDoctorId;
                    const sched = getDoctorSchedule(doc.id, doc);
                    const modes = doc.consultationModes || ['In-Person'];
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId(doc.id);
                          setSelectedTimeSlot('');
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {doc.name}
                          </span>
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        </div>
                        <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                          {doc.specialty || doc.department}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {sched.workDaysLabel} • {sched.hoursLabel}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {modes.map((m) => (
                            <span
                              key={m}
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDoctor || !reason.trim()}
                onClick={() => {
                  setBookingError(null);
                  setCurrentStep(2);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <span>Select Date, Time &amp; Mode</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DOCTOR CALENDAR (NO SAME-DAY MANILA BOOKING) + TIME SLOT + CONSULTATION MODE */}
        {currentStep === 2 && selectedDoctor && (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Same-Day Booking Rule Banner */}
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-950 dark:text-blue-200 flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Asia/Manila Scheduling Policy (Today: {todayManila})
                </p>
                <p>{NO_SAME_DAY_BOOKING_MESSAGE}</p>
              </div>
            </div>

            {sameDayAttemptNotice && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{sameDayAttemptNotice}</span>
              </div>
            )}

            {/* 7 & 8. Available Dates Calendar */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs block">
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {selectedDoctor.name} • {selectedDoctorSchedule?.workDaysLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1 tabular-nums">
                {Array.from({ length: calendarGrid.firstDayIndex }).map((_, idx) => (
                  <div key={`pad-${idx}`} className="h-11" />
                ))}
                {calendarGrid.days.map((day) => {
                  const isSelected = selectedDate === day.dateString;
                  const canSelect =
                    !day.isBlockedDate && day.isWorkDay && day.availableSlotsCount > 0;

                  return (
                    <button
                      key={day.dateString}
                      type="button"
                      aria-disabled={!canSelect}
                      onClick={() => {
                        if (day.isBlockedDate) {
                          setSameDayAttemptNotice(NO_SAME_DAY_BOOKING_MESSAGE);
                          return;
                        }
                        if (!canSelect) return;
                        setSameDayAttemptNotice(null);
                        setSelectedDate(day.dateString);
                        setSelectedTimeSlot('');
                      }}
                      className={`h-12 rounded-lg border p-1 flex flex-col items-center justify-center transition ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 font-bold cursor-pointer'
                          : canSelect
                          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-blue-400 cursor-pointer'
                          : 'bg-slate-100/70 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      }`}
                      title={
                        day.isTodayManila
                          ? NO_SAME_DAY_BOOKING_MESSAGE
                          : !day.isWorkDay
                          ? 'Physician off duty'
                          : `${day.availableSlotsCount} slots available`
                      }
                    >
                      <span className="text-xs font-mono">{day.dayNumber}</span>
                      <span
                        className={`text-[8px] leading-none mt-0.5 ${
                          isSelected
                            ? 'text-blue-100'
                            : day.isTodayManila
                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                            : canSelect
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {day.isTodayManila
                          ? 'Blocked'
                          : day.isPast
                          ? 'Past'
                          : !day.isWorkDay
                          ? 'Off'
                          : `${day.availableSlotsCount} open`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 9 & 10. Available Time Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Available Time Slots on {selectedDate}
                </label>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {slotAvailability.filter((s) => s.isAvailable).length} open slots
                </span>
              </div>

              {slotAvailability.length === 0 ? (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-center">
                  Select an open working date starting {tomorrowManila} to view available time slots.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 tabular-nums">
                  {slotAvailability.map((item) => {
                    const isSelected = selectedTimeSlot === item.slot;
                    return (
                      <button
                        key={item.slot}
                        type="button"
                        disabled={!item.isAvailable}
                        onClick={() => setSelectedTimeSlot(item.slot)}
                        className={`py-2 px-2 rounded-xl border text-center transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold cursor-pointer'
                            : item.isAvailable
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-blue-400 cursor-pointer font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 line-through cursor-not-allowed'
                        }`}
                      >
                        <span className="block text-xs font-mono">{item.formatted}</span>
                        <span className="block text-[9px] mt-0.5">
                          {item.isAvailable ? 'Available' : 'Booked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 11. Choose In-Person or Online Consultation */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Consultation Mode (Offered by {selectedDoctor.name})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['In-Person', 'Online Consultation'] as ConsultationMode[]).map((mode) => {
                  const supported = doctorOfferedModes.includes(mode);
                  const active = consultationMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={!supported}
                      onClick={() => setConsultationMode(mode)}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        active
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500 cursor-pointer'
                          : supported
                          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 cursor-pointer'
                          : 'border-slate-200/60 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {mode === 'Online Consultation' ? (
                        <Video className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block text-xs">{mode}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {!supported
                            ? 'Not offered by selected physician'
                            : mode === 'In-Person'
                            ? 'Issues non-PHI Appointment QR Code for reception check-in'
                            : 'Private 1-to-1 browser video consultation room'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedDate || selectedDate <= todayManila || !selectedTimeSlot}
                onClick={() => {
                  setBookingError(null);
                  setCurrentStep(3);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <span>Review Booking Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & CONFIRM (AUTO-CONFIRMATION) */}
        {currentStep === 3 && selectedDoctor && selectedPatient && (
          <form
            onSubmit={handleConfirmBooking}
            className="p-5 space-y-4 max-h-[75vh] overflow-y-auto"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Review Appointment Details
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Valid slot bookings are automatically confirmed upon submission without manual
                reception approval.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 tabular-nums">
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Patient</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedPatient.fullName} ({selectedPatient.mrn})
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Clinic Branch</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedBranch}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Assigned Physician</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {selectedDoctor.name}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Specialty</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedDoctor.specialty || selectedDoctor.department}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Date &amp; Time</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {selectedDate} at {formatTimeSlot(selectedTimeSlot)}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Consultation Mode</span>
                <span className="font-bold text-slate-900 dark:text-white">{consultationMode}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Reason for Consultation</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                  {reason}
                </span>
              </div>
            </div>

            {bookingError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Confirming Slot...' : 'Confirm Appointment'}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: AUTO-CONFIRMED BOOKING PASS + NON-PHI QR / ONLINE ACCESS */}
        {currentStep === 4 && confirmedAppointment && (
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Status: {confirmedAppointment.status}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Appointment Confirmed Automatically
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your time slot with {confirmedAppointment.doctorName} is reserved. No manual
                reception approval is required.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 tabular-nums">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Booking Reference</span>
                <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                  {confirmedAppointment.bookingReference || confirmedAppointment.id}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Clinic Branch</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {confirmedAppointment.branch || selectedBranch}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Date &amp; Time</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {confirmedAppointment.date} at {formatTimeSlot(confirmedAppointment.time)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Physician</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {confirmedAppointment.doctorName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Consultation Mode</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {confirmedAppointment.consultationMode || consultationMode}
                </span>
              </div>
            </div>

            {(confirmedAppointment.consultationMode || consultationMode) === 'In-Person' ? (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center text-center space-y-2">
                {confirmedQrDataUrl && (
                  <img
                    src={confirmedQrDataUrl}
                    alt={`Appointment QR code for ${confirmedAppointment.bookingReference}`}
                    className="w-36 h-36 object-contain p-2 bg-white border border-slate-200 rounded-xl"
                  />
                )}
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Appointment Check-In QR Pass (Contains Zero PHI)</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-md">
                  Present this QR code to Reception or Nursing Staff on arrival. It encodes only
                  your signed booking verification reference.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-xs space-y-1">
                <p className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  <span>Online Consultation Access Assigned</span>
                </p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  Open your Patient Dashboard or Appointments tab at the scheduled time and click{' '}
                  <strong>Join Online Consultation</strong> to enter the private 1-to-1 room with{' '}
                  {confirmedAppointment.doctorName}.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => printAppointmentConfirmation(confirmedAppointment)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Confirmation</span>
              </button>
              {(confirmedAppointment.consultationMode || consultationMode) === 'In-Person' && (
                <button
                  type="button"
                  onClick={() => printAppointmentQr(confirmedAppointment)}
                  className="px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-800 dark:text-blue-200 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Print Appointment QR</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleModalClose();
                  setActiveTab('appointments');
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer whitespace-nowrap"
              >
                View My Appointments
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
