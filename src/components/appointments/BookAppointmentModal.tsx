import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';
import type { User as ClinicUser, Appointment } from '../../types/clinic';
import {
  getDoctorSchedule,
  isDoctorWorkingOnDate,
  formatTimeSlot,
  getDoctorSlotAvailability,
  normalizeTimeTo24Hour,
} from '../../utils/doctorSchedules';
import { getManilaDateString } from '../../utils/manilaTime';
import { canPatientRebookOnDate, validateAppointmentSlotBooking } from '../../utils/schedulingRules';

interface Props {
  initialPatientId?: string;
  onClose: () => void;
}

const SAFE_BOOKING_DRAFT_KEY = 'smart_clinic_safe_draft_booking';

export const BookAppointmentModal: React.FC<Props> = ({ initialPatientId, onClose }) => {
  const {
    patients,
    users,
    appointments,
    allClinicAppointments,
    addAppointment,
    activeRole,
    primaryRole,
    linkedPatientId,
    visiblePatients,
    addNotification,
    setActiveTab,
    triageDraftForBooking,
    setTriageDraftForBooking,
    logAction,
  } = useClinic();

  const isPatientLocked = primaryRole === 'patient' && !!linkedPatientId;
  const patientOptions = isPatientLocked ? visiblePatients : patients;

  // Filter clinical doctors
  const doctors: ClinicUser[] = useMemo(() => {
    return users.filter((u) => u.role === 'doctor');
  }, [users]);

  // Match doctor based on triage specialty if available
  const matchingDoctor = useMemo(() => {
    if (!triageDraftForBooking) return null;
    if (triageDraftForBooking.recommendedDoctorId) {
      const match = doctors.find((d) => d.id === triageDraftForBooking.recommendedDoctorId);
      if (match) return match;
    }
    const spec = (triageDraftForBooking.specialty || triageDraftForBooking.department || '').toLowerCase();
    if (!spec) return null;
    return (
      doctors.find(
        (d) =>
          (d.department && d.department.toLowerCase().includes(spec)) ||
          (d.specialty && d.specialty.toLowerCase().includes(spec)) ||
          (spec.includes('cardio') && d.department?.toLowerCase().includes('cardio')) ||
          (spec.includes('pulmon') && d.department?.toLowerCase().includes('pulmon')) ||
          (spec.includes('respiratory') && d.department?.toLowerCase().includes('pulmon')) ||
          (spec.includes('derm') && d.department?.toLowerCase().includes('derm')) ||
          (spec.includes('pediat') && d.department?.toLowerCase().includes('pediat')) ||
          (spec.includes('child') && d.department?.toLowerCase().includes('pediat')) ||
          (spec.includes('internal') && d.department?.toLowerCase().includes('internal')) ||
          (spec.includes('general') && d.department?.toLowerCase().includes('internal'))
      ) || doctors[0] || null
    );
  }, [triageDraftForBooking, doctors]);

  // Extract unique specialties from doctors
  const specialties = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.department) set.add(d.department);
      if (d.specialty) set.add(d.specialty);
    });
    return Array.from(set);
  }, [doctors]);

  // Steps state: 1. Doctor -> 2. Date -> 3. Time -> 4. Review & Confirm -> 5. Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const savedSafeDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem(SAFE_BOOKING_DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Form selections (restores non-sensitive draft if session previously timed out)
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(() => {
    if (savedSafeDraft?.selectedSpecialty) return savedSafeDraft.selectedSpecialty;
    return 'all';
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    if (savedSafeDraft?.selectedDoctorId && doctors.some((d) => d.id === savedSafeDraft.selectedDoctorId)) {
      return savedSafeDraft.selectedDoctorId;
    }
    if (matchingDoctor) return matchingDoctor.id;
    return doctors[0]?.id || 'usr-1';
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (triageDraftForBooking?.preferredDate) return triageDraftForBooking.preferredDate;
    if (triageDraftForBooking?.globalTomorrowBooking) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return getManilaDateString(d);
    }
    if (savedSafeDraft?.selectedDate) return savedSafeDraft.selectedDate;
    return '';
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [visitType, setVisitType] = useState<
    'Consultation' | 'Follow-up' | 'Check-up' | 'Emergency' | 'Telehealth'
  >(() => {
    if (savedSafeDraft?.visitType) return savedSafeDraft.visitType;
    return 'Consultation';
  });

  const [reason, setReason] = useState<string>(() => {
    if (triageDraftForBooking?.reason) return triageDraftForBooking.reason;
    if (savedSafeDraft?.reason) return savedSafeDraft.reason;
    return '';
  });
  const [staffOverrideReason, setStaffOverrideReason] = useState<string>('');

  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Persist non-sensitive booking draft (no PHI/MRN/patient identity) so form progress survives inactivity timeout
  useEffect(() => {
    try {
      if (currentStep === 5) return;
      localStorage.setItem(
        SAFE_BOOKING_DRAFT_KEY,
        JSON.stringify({
          selectedSpecialty,
          selectedDoctorId,
          selectedDate,
          visitType,
          reason: reason.slice(0, 120),
        })
      );
    } catch {}
  }, [selectedSpecialty, selectedDoctorId, selectedDate, visitType, reason, currentStep]);

  // Selected Patient
  const [selectedPatId, setSelectedPatId] = useState<string>(
    (isPatientLocked ? linkedPatientId : null) || initialPatientId || patientOptions[0]?.id || ''
  );
  const effectivePatId = isPatientLocked ? (linkedPatientId || selectedPatId) : selectedPatId;
  const selectedPatient = patientOptions.find((p) => p.id === effectivePatId) || patients.find((p) => p.id === effectivePatId) || patients[0];
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
  const selectedDoctorSchedule = useMemo(() => {
    return getDoctorSchedule(selectedDoctorId, selectedDoctor);
  }, [selectedDoctorId, selectedDoctor]);

  // Calendar monthly view navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  const prevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filtered doctors list based on selected specialty
  const filteredDoctors = useMemo(() => {
    if (selectedSpecialty === 'all') return doctors;
    return doctors.filter(
      (d) => d.department === selectedSpecialty || d.specialty?.includes(selectedSpecialty)
    );
  }, [doctors, selectedSpecialty]);

  // Calendar days grid computation
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isWorkDay: boolean;
      availableSlotsCount: number;
    }> = [];

    const todayDateStr = getManilaDateString();
    const clinicAppointments = allClinicAppointments || appointments;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isWorkDay = isDoctorWorkingOnDate(selectedDoctor?.id || '', dateString, selectedDoctor);
      const isPast = dateString < todayDateStr;

      // Check slot availability for this doctor on this day using doctor's personal schedule and full clinic bookings
      const daySlots = getDoctorSlotAvailability(selectedDoctor?.id || '', dateString, clinicAppointments, undefined, selectedDoctor);
      const availableSlotsCount = (isWorkDay && !isPast) ? daySlots.filter((s) => s.isAvailable).length : 0;

      days.push({
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        isPast,
        isWorkDay,
        availableSlotsCount,
      });
    }

    return { firstDayIndex, days };
  }, [calendarMonth, selectedDoctor, allClinicAppointments, appointments]);

  // Slots for the currently selected date: ONLY matching doctor's personal individual schedule
  const slotAvailability = useMemo(() => {
    if (!selectedDate || !selectedDoctor) return [];
    const clinicAppointments = allClinicAppointments || appointments;
    return getDoctorSlotAvailability(selectedDoctor.id, selectedDate, clinicAppointments, undefined, selectedDoctor);
  }, [selectedDate, selectedDoctor, allClinicAppointments, appointments]);

  // Available slots count for selected date
  const remainingSlotsForSelectedDate = useMemo(() => {
    return slotAvailability.filter((s) => s.isAvailable).length;
  }, [slotAvailability]);

  // Same-day No-Show rebooking policy check (Asia/Manila)
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
  }, [selectedPatient, selectedDate, allClinicAppointments, appointments, activeRole, staffOverrideReason]);

  // Handle final submission
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedTimeSlot) return;

    const clinicAppointments = allClinicAppointments || appointments;

    // 1. Enforce Same-Day No-Show Rebooking Policy
    const rebookCheck = canPatientRebookOnDate({
      patientId: selectedPatient.id,
      targetDate: selectedDate,
      appointments: clinicAppointments,
      actorRole: activeRole,
      staffOverrideReason,
    });
    if (!rebookCheck.allowed) {
      setBookingError(
        rebookCheck.reason ||
          'Same-day automatic rebooking is blocked after a missed (No-Show) appointment.'
      );
      return;
    }

    // 2. Enforce Double-Booking & Duplicate Active Queue Guard
    const slotGuard = validateAppointmentSlotBooking({
      patientId: selectedPatient.id,
      doctorId: selectedDoctor.id,
      date: selectedDate,
      time: normalizeTimeTo24Hour(selectedTimeSlot),
      appointments: clinicAppointments,
      checkDuplicateQueue: false,
    });
    if (!slotGuard.valid) {
      setBookingError(slotGuard.error || 'Selected time slot is already reserved.');
      return;
    }
    setBookingError(null);

    // Map visitType to Appointment type
    const mappedType: Appointment['type'] =
      visitType === 'Emergency'
        ? 'Emergency'
        : visitType === 'Follow-up'
        ? 'Follow-up'
        : visitType === 'Check-up'
        ? 'Check-up'
        : visitType === 'Telehealth'
        ? 'Telehealth'
        : 'Consultation';

    const newApt = addAppointment({
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      patientMrn: selectedPatient.mrn,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      department: selectedDoctor.department || 'Outpatient Clinic',
      date: selectedDate,
      time: selectedTimeSlot,
      durationMinutes: 30,
      reason: reason ? `[${visitType}] ${reason}` : `Scheduled ${visitType} consultation`,
      status: 'Scheduled',
      type: mappedType,
      room: selectedDoctor.department?.includes('Cardio') ? 'Cardiology Suite 1' : 'Room 302',
      staffOverrideReason: rebookCheck.overriddenByStaff ? staffOverrideReason.trim() : undefined,
    });

    if (rebookCheck.overriddenByStaff) {
      logAction(
        'NOSHOW_REBOOK_OVERRIDE',
        'Appointment',
        newApt.id,
        `Authorized same-day rebooking override after No-Show for ${selectedPatient.fullName}: ${staffOverrideReason.trim()}`
      );
    }

    try {
      localStorage.removeItem(SAFE_BOOKING_DRAFT_KEY);
    } catch {}

    // Create a live notification for patient confirmation with approval notice (strictly scoped to this patient)
    addNotification({
      recipientId: selectedPatient.id,
      patientId: selectedPatient.id,
      recipientRole: 'patient',
      targetRole: 'patient',
      title: 'Appointment Recorded',
      message: 'Your appointment has been recorded. Please wait for approval.',
      content: `Your appointment request with ${selectedDoctor.name} on ${selectedDate} at ${formatTimeSlot(selectedTimeSlot)} (${visitType}) has been recorded. Please wait for clinic staff confirmation. Assigned Queue Station: ${newApt.queueNumber}.`,
      category: 'appointment',
      priority: visitType === 'Emergency' ? 'high' : 'normal',
      relatedResourceId: newApt.id,
      relatedResourceType: 'appointment',
    });

    // Also notify attending provider (strictly scoped to this doctor)
    addNotification({
      recipientId: selectedDoctor.id,
      doctorId: selectedDoctor.id,
      recipientRole: 'doctor',
      targetRole: 'provider',
      title: 'New Patient Booking Pending Approval',
      message: `${selectedPatient.fullName} booked a consultation on ${selectedDate} at ${formatTimeSlot(selectedTimeSlot)} (${visitType}).`,
      content: `New confirmed appointment scheduled: ${selectedPatient.fullName} (${selectedPatient.mrn}) with Dr. ${selectedDoctor.name} on ${selectedDate} at ${formatTimeSlot(selectedTimeSlot)} (${visitType}). Review required.`,
      category: 'appointment',
      priority: visitType === 'Emergency' ? 'high' : 'normal',
      relatedResourceId: newApt.id,
      relatedResourceType: 'appointment',
    });

    setConfirmedAppointment(newApt);
    setCurrentStep(5); // Success confirmation step
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleModalClose = () => {
    setTriageDraftForBooking(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden font-sans my-auto animate-in zoom-in-95 duration-150 select-none text-slate-800 dark:text-slate-100"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold shadow-2xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Book Clinical Appointment
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase tracking-wider">
                  Live Slots
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Doctor availability schedule & automated single-slot locking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (Steps 1 to 4) */}
        {currentStep !== 5 && (
          <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between text-xs">
              {[
                { step: 1, label: '1. Select Doctor' },
                { step: 2, label: '2. Select Date' },
                { step: 3, label: '3. Choose Slot' },
                { step: 4, label: '4. Confirm' },
              ].map((item) => (
                <button
                  key={item.step}
                  type="button"
                  disabled={item.step > currentStep}
                  onClick={() => setCurrentStep(item.step as any)}
                  className={`flex items-center gap-1.5 font-bold transition ${
                    currentStep === item.step
                      ? 'text-teal-600 dark:text-teal-400'
                      : item.step < currentStep
                      ? 'text-slate-700 dark:text-slate-300 cursor-pointer'
                      : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      currentStep === item.step
                        ? 'bg-teal-600 text-white'
                        : item.step < currentStep
                        ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.step < currentStep ? '✓' : item.step}
                  </span>
                  <span className="hidden sm:inline text-[11px]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Outpatient Non-Emergency Scope Notice */}
        {currentStep !== 5 && (
          <div className="mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              <strong>Outpatient Clinic Services:</strong> Online booking reserves scheduled non-emergency outpatient consultations. For acute medical emergencies, call 911 or proceed to the nearest hospital ER.
            </span>
          </div>
        )}

        {/* Global Tomorrow Booking Notice */}
        {triageDraftForBooking?.globalTomorrowBooking && currentStep !== 5 && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center gap-2.5">
            <CalendarCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <strong>Global Tomorrow Booking Active:</strong> Under standard clinic cancellation policy, you may select any doctor or specialty for tomorrow without restrictions.
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: SELECT DOCTOR & SPECIALTY                                         */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Patient Identity Confirmation */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Booking for: {selectedPatient?.fullName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    MRN: <span className="font-mono font-semibold">{selectedPatient?.mrn}</span> • {selectedPatient?.age}y {selectedPatient?.gender}
                  </p>
                </div>
              </div>

              {!isPatientLocked && patientOptions.length > 1 && (
                <select
                  value={effectivePatId}
                  onChange={(e) => setSelectedPatId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Specialty Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Filter by Clinical Department
                </label>
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                  {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Physician' : 'Physicians'} Available
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedSpecialty('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedSpecialty === 'all'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Specialties
                </button>
                {specialties.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSelectedSpecialty(spec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                      selectedSpecialty === spec
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Cards Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Attending Physician
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDoctors.map((doc) => {
                  const isSelected = selectedDoctorId === doc.id;
                  const docSchedule = getDoctorSchedule(doc.id, doc);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (selectedDoctorId !== doc.id) {
                          setSelectedDoctorId(doc.id);
                          setSelectedTimeSlot('');
                          if (selectedDate && !isDoctorWorkingOnDate(doc.id, selectedDate)) {
                            setSelectedDate('');
                          }
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-teal-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {doc.name}
                        </h4>
                        <p className="text-teal-600 dark:text-teal-400 text-xs font-semibold truncate mt-0.5">
                          {doc.specialty || doc.department}
                        </p>
                        <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                          License: {doc.licenseNumber || 'MD-REG'}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-teal-700 dark:text-teal-300 font-bold flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 text-teal-500 shrink-0" />
                            <span>{docSchedule.workDaysLabel}</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Choose'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-teal-500 shrink-0" />
                          <span className="truncate">{docSchedule.hoursLabel}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDoctorId}
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Continue to Calendar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SELECT DATE FROM MONTHLY CALENDAR                                 */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Active Doctor Context Header (No photo/picture) */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">
                  {selectedDoctor?.name}
                </p>
                <p className="text-[11px] text-teal-700 dark:text-teal-300">
                  {selectedDoctor?.specialty || selectedDoctor?.department} • License: {selectedDoctor?.licenseNumber || 'MD-REG'}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Personal Schedule: <strong className="text-teal-700 dark:text-teal-300">{selectedDoctorSchedule.workDaysLabel}</strong> ({selectedDoctorSchedule.hoursLabel})</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer shrink-0"
              >
                Change Doctor
              </button>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pick any available consultation day
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider pb-1">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading padding slots */}
              {Array.from({ length: calendarGrid.firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/40 dark:bg-slate-900/20" />
              ))}

              {calendarGrid.days.map((dayItem) => {
                const isSelected = selectedDate === dayItem.dateString;
                const isUnavailable = !dayItem.isWorkDay || dayItem.isPast || dayItem.availableSlotsCount === 0;
                const badgeLabel = !dayItem.isWorkDay
                  ? 'Doctor Off'
                  : dayItem.isPast
                  ? 'Past'
                  : dayItem.availableSlotsCount === 0
                  ? 'Full'
                  : `${dayItem.availableSlotsCount} open`;

                return (
                  <button
                    key={dayItem.dateString}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => {
                      setSelectedDate(dayItem.dateString);
                      // Reset previously selected time slot if date changes
                      setSelectedTimeSlot('');
                    }}
                    className={`h-14 sm:h-16 rounded-xl p-1.5 flex flex-col justify-between items-center transition border text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-md shadow-teal-900/30 ring-2 ring-teal-400'
                        : isUnavailable
                        ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/30'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold">{dayItem.dayNumber}</span>
                    <span
                      className={`text-[9px] px-1 rounded font-semibold truncate ${
                        isSelected
                          ? 'bg-teal-700 text-teal-100'
                          : isUnavailable
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      }`}
                    >
                      {badgeLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer / Step Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!selectedDate}
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Choose Time Slot</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SELECT TIME SLOT & VISIT DETAILS                                  */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Summary Context */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">
                  {selectedDoctor?.name} • {selectedDate}
                </p>
                <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{selectedDoctorSchedule.workDaysLabel} • {selectedDoctorSchedule.hoursLabel}</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {remainingSlotsForSelectedDate} open slots available on this date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer shrink-0"
              >
                Change Date
              </button>
            </div>

            {/* Time Slot Grid (with grayed-out booked slots) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Doctor Available Time Slots (30 min)
                </label>
                <span className="text-[11px] text-slate-400">
                  Single-patient locking enforced
                </span>
              </div>

              {slotAvailability.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    No Consultation Hours on This Date
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    {selectedDoctor?.name} is not on duty on this day. Schedule: {selectedDoctorSchedule.workDaysLabel} ({selectedDoctorSchedule.hoursLabel}).
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="mt-1 px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-amber-500 transition"
                  >
                    Select Another Date
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {slotAvailability.map((item) => {
                    const isSelected = selectedTimeSlot === item.slot;

                    return (
                      <button
                        key={item.slot}
                        type="button"
                        disabled={!item.isAvailable}
                        onClick={() => setSelectedTimeSlot(item.slot)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-900/20 ring-2 ring-teal-400'
                            : item.isAvailable
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700'
                            : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className="text-xs">{item.formatted}</span>
                        <span
                          className={`text-[9px] mt-0.5 uppercase tracking-wider ${
                            isSelected
                              ? 'text-teal-100 font-bold'
                              : item.isAvailable
                              ? 'text-teal-600 dark:text-teal-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.isAvailable ? 'Available' : 'Booked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Consultation Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                  Encounter Type
                </label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Consultation">Consultation</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Check-up">Check-up</option>
                  <option value="Telehealth">Telehealth</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                  Reason for Visit / Symptoms
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular blood sugar & BP checkup"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!selectedTimeSlot}
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Review & Confirm</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: REVIEW & CONFIRM BOOKING                                          */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <form onSubmit={handleConfirmBooking} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Verify Appointment Details
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Please review your clinical booking details prior to confirming
              </p>
            </div>

            {/* Review Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 text-xs">Patient</span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {selectedPatient?.fullName} (MRN: {selectedPatient?.mrn})
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 text-xs">Attending Physician</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-xs">
                  {selectedDoctor?.name}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 text-xs">Specialty / Dept</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {selectedDoctor?.specialty || selectedDoctor?.department}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 text-xs">Date & Time</span>
                <span className="font-black text-slate-900 dark:text-white text-xs">
                  {selectedDate} at {formatTimeSlot(selectedTimeSlot)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 text-xs">Type</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {visitType} (Duration: 30 minutes)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Chief Reason</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-xs text-right max-w-xs">
                  {reason || 'Outpatient consultation'}
                </span>
              </div>
            </div>

            {/* Same-Day No-Show Rebooking Policy Guard */}
            {rebookPolicyStatus.requiresStaffOverride && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {isPatientLocked
                      ? 'Same-Day Self-Rebooking Blocked After Missed Appointment (No-Show)'
                      : 'Staff Authorization Required: Patient Recorded as No-Show Today'}
                  </span>
                </div>
                {isPatientLocked ? (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Automatic same-day rebooking is disabled after a missed appointment. Please go back and choose a future date, or contact clinic reception staff for assistance.
                  </p>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                      Mandatory Staff Override Reason (logged in Security Audit Log) *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffOverrideReason}
                      onChange={(e) => setStaffOverrideReason(e.target.value)}
                      placeholder="e.g., Patient arrived late due to transit disruption; approved by reception"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {bookingError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Privacy notice banner */}
            <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl flex items-start gap-2.5 text-xs text-teal-900 dark:text-teal-200">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                By confirming, this slot is locked exclusively for your account under RA 10173 data privacy protection.
              </span>
            </div>

            {/* Submit & Back buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/20 transition cursor-pointer flex items-center gap-2"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Confirm & Lock Appointment</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: SUCCESS CONFIRMATION                                              */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Reservation Recorded
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white pt-1">
                Your appointment has been recorded. Please wait for approval.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your appointment request with {selectedDoctor?.name} is logged in the clinic system. You will receive an alert once approved by attending staff.
              </p>
            </div>

            {confirmedAppointment && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-left max-w-md mx-auto space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Queue Number:</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                    {confirmedAppointment.queueNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Date & Time:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {confirmedAppointment.date} at {formatTimeSlot(confirmedAppointment.time)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Physician:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {confirmedAppointment.doctorName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {confirmedAppointment.room} • Outpatient Clinic
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  handleModalClose();
                  setActiveTab('appointments');
                }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-teal-900/20"
              >
                View in My Appointments
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
