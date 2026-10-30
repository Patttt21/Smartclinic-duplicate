import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Appointment, AppointmentStatus } from '../../types/clinic';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  History,
  CalendarCheck,
  CalendarDays,
  Filter,
} from 'lucide-react';
import {
  getDoctorSchedule,
  isDoctorWorkingOnDate,
  formatTimeSlot,
  getDoctorSlotAvailability,
  normalizeTimeTo24Hour,
} from '../../utils/doctorSchedules';
import {
  applyReschedulingRule,
  addOneCalendarDay,
  formatCalendarDate,
  normalizeDateForComparison,
} from '../../utils/schedulingRules';

interface Props {
  onOpenBookAppointment: () => void;
  onStartConsultation: (patientId: string) => void;
}

export const AppointmentCalendar: React.FC<Props> = ({
  onOpenBookAppointment,
  onStartConsultation,
}) => {
  const {
    appointments,
    allClinicAppointments,
    updateAppointmentStatus,
    rescheduleAppointment,
    users,
    activeRole,
    currentUser,
    selectPatient,
    setActiveTab,
    openBookAppointmentWithDraft,
    t,
  } = useClinic();

  const isPatient = activeRole === 'patient';
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const tomorrowFormatted = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  const [rescheduleSuccessBanner, setRescheduleSuccessBanner] = useState<string | null>(null);
  const [cancelledOfferApt, setCancelledOfferApt] = useState<Appointment | null>(null);

  const isDoctor = activeRole === 'doctor' || currentUser?.role === 'doctor';
  const doctors = users.filter((u) => u.role === 'doctor');

  // View & Filter States
  const [selectedDate, setSelectedDate] = useState<string>(''); // empty string means all dates visible
  const [timeframeFilter, setTimeframeFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [doctorFilter, setDoctorFilter] = useState<string>(() => {
    return isDoctor && currentUser?.id ? currentUser.id : 'ALL';
  });
  const [showMonthGrid, setShowMonthGrid] = useState<boolean>(true);

  // Synchronize doctorFilter when logged in as doctor
  useEffect(() => {
    if (isDoctor && currentUser?.id) {
      setDoctorFilter(currentUser.id);
    }
  }, [isDoctor, currentUser?.id]);

  // Calendar monthly navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Reschedule state
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [newReschedDate, setNewReschedDate] = useState('');
  const [newReschedTime, setNewReschedTime] = useState('10:00');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const selectedDoctorSchedule = useMemo(() => {
    if (doctorFilter === 'ALL') return null;
    const doc = doctors.find((d) => d.id === doctorFilter);
    return doc ? getDoctorSchedule(doc.id, doc) : null;
  }, [doctorFilter, doctors]);

  // Helper to determine whether an appointment is Past or Inactive
  const isPastAppointment = (apt: Appointment): boolean => {
    return apt.date < todayStr || apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'No Show';
  };

  // Helper to determine whether an appointment is Active & Upcoming
  const isUpcomingAppointment = (apt: Appointment): boolean => {
    return (
      apt.date >= todayStr &&
      apt.status !== 'Completed' &&
      apt.status !== 'Cancelled' &&
      apt.status !== 'No Show'
    );
  };

  // Month navigation helpers
  const prevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calendar Monthly Grid Generation
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isToday: boolean;
      isPastDate: boolean;
      isDoctorOff: boolean;
      dayAppointments: Appointment[];
      hasUpcoming: boolean;
      hasPast: boolean;
    }> = [];

    const selectedDoctorUser = doctorFilter !== 'ALL' ? doctors.find((d) => d.id === doctorFilter) : undefined;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateString === todayStr;
      const isPastDate = dateString < todayStr;
      const isDoctorOff =
        doctorFilter !== 'ALL' && !isDoctorWorkingOnDate(doctorFilter, dateString, selectedDoctorUser);

      // Filter appointments on this day
      const dayAppointments = appointments.filter((a) => {
        if (a.date !== dateString) return false;
        if (doctorFilter !== 'ALL' && a.doctorId !== doctorFilter) return false;
        return true;
      });
      const hasUpcoming = dayAppointments.some((a) => isUpcomingAppointment(a));
      const hasPast = dayAppointments.some((a) => isPastAppointment(a));

      days.push({
        dateString,
        dayNumber: day,
        isToday,
        isPastDate,
        isDoctorOff,
        dayAppointments,
        hasUpcoming,
        hasPast,
      });
    }

    return { firstDayIndex, days };
  }, [calendarMonth, appointments, doctorFilter, doctors]);

  // Overall counts for summary (Cancelled and No Show are excluded from active upcomingCount)
  const upcomingCount = useMemo(
    () => appointments.filter((a) => isUpcomingAppointment(a)).length,
    [appointments]
  );
  const pastCount = useMemo(
    () => appointments.filter((a) => isPastAppointment(a)).length,
    [appointments]
  );

  // Filtered appointments list
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        // Date filter
        const matchesDate = selectedDate ? a.date === selectedDate : true;

        // Timeframe filter (Upcoming vs Past vs All)
        const isPast = isPastAppointment(a);
        const isUpcoming = isUpcomingAppointment(a);
        const matchesTimeframe =
          timeframeFilter === 'ALL'
            ? true
            : timeframeFilter === 'PAST'
            ? isPast
            : isUpcoming;

        // Status filter
        const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;

        // Doctor filter (staff only)
        const matchesDoctor =
          !isPatient && doctorFilter !== 'ALL' ? a.doctorId === doctorFilter : true;

        return matchesDate && matchesTimeframe && matchesStatus && matchesDoctor;
      })
      .sort((a, b) => {
        // Sort descending by date so most relevant are easy to view
        const dateA = `${a.date} ${a.time}`;
        const dateB = `${b.date} ${b.time}`;
        return dateB.localeCompare(dateA);
      });
  }, [appointments, selectedDate, timeframeFilter, statusFilter, doctorFilter, isPatient]);

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Called':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 animate-pulse';
      case 'In Consultation':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 animate-pulse';
      case 'Checked In':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Confirmed':
        return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'No Show':
        return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingApt || !newReschedDate || !newReschedTime) return;

    // Apply exact rescheduling rule:
    // If requested_date == original_appointment_date:
    //    final_date = original_appointment_date + 1 day
    // Otherwise:
    //    final_date = requested_date
    const ruleResult = applyReschedulingRule(newReschedDate, reschedulingApt.date);
    const finalDate = ruleResult.finalDate;

    // Double check that the selected slot is not already booked by another patient on finalDate
    const cleanReschedTime = normalizeTimeTo24Hour(newReschedTime);
    const clinicAppointments = allClinicAppointments || appointments;
    const isBooked = clinicAppointments.some(
      (a) =>
        a.id !== reschedulingApt.id &&
        (a.doctorId === reschedulingApt.doctorId || a.doctorName?.toLowerCase() === reschedulingApt.doctorName?.toLowerCase()) &&
        (a.date || '').split('T')[0].trim() === finalDate &&
        normalizeTimeTo24Hour(a.time) === cleanReschedTime &&
        a.status !== 'Cancelled'
    );
    if (isBooked) {
      setRescheduleError(`This slot on ${formatCalendarDate(finalDate)} at ${formatTimeSlot(newReschedTime)} was just booked by another patient. Please select another slot.`);
      return;
    }

    setRescheduleError(null);
    const result = rescheduleAppointment(reschedulingApt.id, newReschedDate, newReschedTime);
    setReschedulingApt(null);

    if (result.wasSameDay) {
      setRescheduleSuccessBanner(
        `Same-day reschedule is not allowed. Because your requested date (${formatCalendarDate(result.requestedDate)}) matched the original appointment date (${formatCalendarDate(result.originalAppointmentDate)}), the appointment was automatically moved to the next calendar day (${formatCalendarDate(result.finalDate)}) at ${formatTimeSlot(newReschedTime)}. It now appears in your calendar on ${formatCalendarDate(result.finalDate)}.`
      );
    } else {
      setRescheduleSuccessBanner(
        `Your appointment was successfully rescheduled to ${formatCalendarDate(result.finalDate)} at ${formatTimeSlot(newReschedTime)}. It now appears in your calendar on ${formatCalendarDate(result.finalDate)}.`
      );
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto text-xs font-sans pb-10">
      {/* Reschedule Confirmation Banner */}
      {rescheduleSuccessBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium">{rescheduleSuccessBanner}</span>
          </div>
          <button
            onClick={() => setRescheduleSuccessBanner(null)}
            className="text-teal-600 hover:text-teal-800 dark:text-teal-400 font-bold text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cancellation Global Tomorrow Booking Offer */}
      {cancelledOfferApt && (
        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Appointment Cancelled — Global Booking Available for Tomorrow</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              As per clinic policy, you may immediately book a new appointment for tomorrow globally across any available provider and time slot.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                openBookAppointmentWithDraft({
                  globalTomorrowBooking: true,
                  preferredDate: tomorrowStr,
                  patientId: cancelledOfferApt.patientId,
                  reason: 'New consultation following appointment cancellation',
                });
                setCancelledOfferApt(null);
              }}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Book for Tomorrow (Global Slots)</span>
            </button>
            <button
              onClick={() => setCancelledOfferApt(null)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Page Task & Security Directive Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isPatient ? 'My Outpatient Appointments' : 'Clinical Appointment Management'}
            </h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'Visit' : 'Visits'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isPatient
              ? 'View, book, reschedule, or cancel your personal outpatient appointments. Both upcoming and past visits are displayed with clear distinction.'
              : 'Specific Task: Provider schedule oversight, visit confirmation, triage arrival tracking, and consultation initiation.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isPatient && (
            <button
              onClick={() => setActiveTab('queue')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <span>Live Queue</span>
            </button>
          )}

          <button
            onClick={() => setShowMonthGrid(!showMonthGrid)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              showMonthGrid
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{showMonthGrid ? 'Hide Calendar' : 'Show Calendar'}</span>
          </button>

          <button
            onClick={onOpenBookAppointment}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-teal-700/20 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isPatient ? 'Book Appointment' : (t?.common?.bookAppointment || 'Book Appointment')}</span>
          </button>
        </div>
      </div>

      {/* Specific Privacy & Security Enforcement Notice */}
      <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>
            {isPatient
              ? 'Data Privacy Enforced: You are viewing solely your verified appointments. Provider directories and other patient records are strictly isolated.'
              : 'HIPAA & RA 10173 Audit Active: Provider access to appointment records is logged with immutable timestamping.'}
          </span>
        </div>
        <span className="font-mono text-[10px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded font-bold">
          SECURE RLS
        </span>
      </div>

      {/* Monthly Interactive Calendar View */}
      {showMonthGrid && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a date to inspect visits or view all dates below
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Legend */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] mr-2">
                <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                  Upcoming Visit
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                  Past Visit
                </span>
              </div>

              <div className="flex items-center gap-1">
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
                  onClick={() => {
                    setCalendarMonth(new Date(2026, 9, 1));
                    setSelectedDate(todayStr);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Current
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
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Monthly Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Leading padding */}
            {Array.from({ length: calendarGrid.firstDayIndex }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="h-16 sm:h-20 rounded-xl bg-slate-50/40 dark:bg-slate-900/20 border border-transparent"
              />
            ))}

            {calendarGrid.days.map((dayItem) => {
              const isSelected = selectedDate === dayItem.dateString;
              const hasApts = dayItem.dayAppointments.length > 0;

              return (
                <button
                  key={dayItem.dateString}
                  type="button"
                  onClick={() => {
                    if (selectedDate === dayItem.dateString) {
                      setSelectedDate(''); // toggle off date filter
                    } else {
                      setSelectedDate(dayItem.dateString);
                    }
                  }}
                  className={`h-16 sm:h-20 rounded-xl p-1 sm:p-1.5 flex flex-col justify-between items-start transition border text-left cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 ring-2 ring-teal-400'
                      : dayItem.isToday
                      ? 'bg-teal-50/30 dark:bg-teal-950/20 border-teal-300 dark:border-teal-700'
                      : hasApts
                      ? dayItem.hasUpcoming
                        ? 'bg-white dark:bg-slate-800/90 border-teal-200 dark:border-teal-900/60 hover:border-teal-400'
                        : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                      : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-teal-700 dark:text-teal-300'
                          : dayItem.isToday
                          ? 'text-teal-600 dark:text-teal-400 font-extrabold'
                          : dayItem.isPastDate
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayItem.dayNumber}
                    </span>

                    {dayItem.isToday && (
                      <span className="text-[9px] font-bold px-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                        Today
                      </span>
                    )}

                    {dayItem.isDoctorOff && (
                      <span className="text-[8px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                        Off
                      </span>
                    )}
                  </div>

                  {/* Day Appointment Indicator Tags */}
                  <div className="w-full space-y-0.5 mt-auto">
                    {dayItem.hasUpcoming && (
                      <div className="text-[9px] font-bold px-1 py-0.5 rounded bg-teal-500 text-white flex items-center justify-between truncate shadow-2xs">
                        <span className="truncate">Upcoming</span>
                        <span className="text-[8px] opacity-90">
                          {dayItem.dayAppointments.filter((a) => !isPastAppointment(a)).length}
                        </span>
                      </div>
                    )}
                    {dayItem.hasPast && (
                      <div className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between truncate">
                        <span className="truncate">Past Visit</span>
                        <span className="text-[8px] opacity-80">
                          {dayItem.dayAppointments.filter((a) => isPastAppointment(a)).length}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Navigation & Timeframe Tabs */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Timeframe Tabs: All, Upcoming, Past */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTimeframeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              timeframeFilter === 'ALL'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>All Visits</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeframeFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              timeframeFilter === 'UPCOMING'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Upcoming</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
              {upcomingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeframeFilter('PAST')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              timeframeFilter === 'PAST'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Appointments</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {pastCount}
            </span>
          </button>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedDate && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded-lg text-xs font-semibold border border-teal-200 dark:border-teal-800">
              <span>Date: {selectedDate}</span>
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="hover:text-teal-900 dark:hover:text-white cursor-pointer ml-1 font-bold"
                title="Clear date filter"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl">
            <CalendarIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition cursor-pointer"
            >
              Show All Dates
            </button>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked In">Checked In</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Doctor filter (Global for all roles) */}
          <div className="flex items-center gap-1.5">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty || d.department})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Doctor Personal Schedule Banner */}
      {selectedDoctorSchedule && (
        <div className="bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                {selectedDoctorSchedule.doctorName}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                {selectedDoctorSchedule.specialty}
              </span>
            </div>
            <p className="text-[11px] text-teal-700 dark:text-teal-300 flex items-center gap-1.5 mt-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Personal Clinical Schedule: <strong>{selectedDoctorSchedule.workDaysLabel}</strong> ({selectedDoctorSchedule.hoursLabel})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBookAppointment}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book with {selectedDoctorSchedule.doctorName.split(',')[0]}</span>
          </button>
        </div>
      )}

      {/* Appointments List Display (Upcoming & Past clearly marked) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {isPatient ? 'No Appointments Found' : 'No Appointments Matching Filter'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
              {isPatient
                ? 'No appointments found for the selected timeframe. You can book a new consultation or view all your appointments above.'
                : 'There are no patient bookings matching your current filter parameters.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {(selectedDate || timeframeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSelectedDate('');
                    setTimeframeFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={onOpenBookAppointment}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>{isPatient ? 'Book Appointment' : (t?.common?.bookAppointment || 'Book Appointment')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAppointments.map((apt) => {
              const isPast = isPastAppointment(apt);

              return (
                <div
                  key={apt.id}
                  className={`p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPast
                      ? 'border-l-4 border-l-slate-400 dark:border-l-slate-600 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                      : 'border-l-4 border-l-teal-500 bg-white dark:bg-slate-900 hover:bg-teal-50/30 dark:hover:bg-teal-950/20'
                  }`}
                >
                  {/* Left: Time & Information */}
                  <div className="flex items-start gap-4">
                    {/* Date & Time Block */}
                    <div
                      className={`w-24 text-center py-2.5 px-1.5 rounded-2xl border shrink-0 ${
                        isPast
                          ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          : 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300'
                      }`}
                    >
                      <span className="text-sm font-extrabold block font-mono">
                        {apt.time}
                      </span>
                      <span className="text-[11px] font-semibold block mt-0.5 font-mono">
                        {apt.date}
                      </span>
                      <span className="text-[9px] opacity-75 block mt-0.5">
                        {apt.durationMinutes || 30} mins
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Past / Upcoming Label & Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Clear Past vs Upcoming Badge */}
                        {apt.status === 'Cancelled' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 shadow-2xs">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Cancelled Appointment</span>
                          </span>
                        ) : apt.status === 'No Show' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-slate-500" />
                            <span>No Show</span>
                          </span>
                        ) : isPast ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                            <History className="w-3 h-3 text-slate-500" />
                            <span>Past Appointment</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 flex items-center gap-1 shadow-2xs">
                            <CalendarCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            <span>Upcoming Appointment</span>
                          </span>
                        )}

                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {apt.patientName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({apt.patientMrn})
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            apt.status
                          )}`}
                        >
                          {apt.status}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            apt.type === 'Emergency'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {apt.type}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        Reason:{' '}
                        <span className="font-normal text-slate-600 dark:text-slate-400">
                          {apt.reason}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          Doctor:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {apt.doctorName}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>Dept: {apt.department}</span>
                        <span>•</span>
                        <span>Location: {apt.room || 'Clinic Suite 302'}</span>
                        {apt.queueNumber && (
                          <>
                            <span>•</span>
                            <span>
                              Queue:{' '}
                              <strong className="text-teal-600 dark:text-teal-400 font-mono">
                                {apt.queueNumber}
                              </strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 self-end md:self-center">
                    {/* Staff Clinical Workflow Buttons */}
                    {!isPatient && (
                      <>
                        {apt.status === 'Scheduled' && (
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'Confirmed')}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 dark:text-teal-300 rounded-lg font-semibold text-[11px] border border-teal-200 dark:border-teal-800 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Approve patient appointment"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Approve</span>
                          </button>
                        )}

                        {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'Checked In')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-300 rounded-lg font-semibold text-[11px] border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                          >
                            Check-In
                          </button>
                        )}

                        {apt.status === 'Checked In' && activeRole === 'doctor' && (
                          <button
                            onClick={() => {
                              updateAppointmentStatus(apt.id, 'In Consultation');
                              onStartConsultation(apt.patientId);
                            }}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                          >
                            <Stethoscope className="w-3 h-3" />
                            <span>Start Consult</span>
                          </button>
                        )}

                        {apt.status === 'In Consultation' && (
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'Completed')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        )}
                      </>
                    )}

                    {/* Reschedule & Cancel actions (available for upcoming visits) */}
                    {!isPast && apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                      <>
                        <button
                          onClick={() => {
                            setReschedulingApt(apt);
                            // Patients cannot reschedule an appointment to the same day. Next-day slot is the standard outcome.
                            const initialReschedDate = apt.date <= todayStr ? tomorrowStr : apt.date;
                            setNewReschedDate(initialReschedDate);
                            setNewReschedTime(apt.time);
                            setRescheduleError(null);
                          }}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => {
                            updateAppointmentStatus(apt.id, 'Cancelled');
                            setCancelledOfferApt(apt);
                          }}
                          className="px-2.5 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-medium transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {/* For past appointments: show completed/review label */}
                    {isPast && (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 italic">
                        Archived in EMR
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reschedule Modal with Individual Doctor Schedule & Availability */}
      {reschedulingApt && (() => {
        const reschedDoc = users.find((u) => u.id === reschedulingApt.doctorId);
        const docSchedule = getDoctorSchedule(reschedulingApt.doctorId, reschedDoc);
        const isSameDaySelected = Boolean(
          newReschedDate &&
          reschedulingApt.date &&
          normalizeDateForComparison(newReschedDate) === normalizeDateForComparison(reschedulingApt.date)
        );
        const resolvedTargetDate = isSameDaySelected
          ? addOneCalendarDay(reschedulingApt.date)
          : newReschedDate;

        const isDocWorking = resolvedTargetDate ? isDoctorWorkingOnDate(reschedulingApt.doctorId, resolvedTargetDate, reschedDoc) : false;
        const clinicAppointments = allClinicAppointments || appointments;
        const availableSlots = resolvedTargetDate
          ? getDoctorSlotAvailability(reschedulingApt.doctorId, resolvedTargetDate, clinicAppointments, reschedulingApt.id, reschedDoc)
          : [];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 max-w-md w-full text-xs space-y-3.5 font-sans animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Reschedule Appointment
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Visit with <strong>{reschedulingApt.doctorName}</strong> ({reschedulingApt.department})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReschedulingApt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Clinic Rescheduling Policy Directive */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1 text-[11px] text-blue-900 dark:text-blue-300">
                <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-200">
                  <CalendarCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Clinic Rescheduling Policy</span>
                </div>
                <p>
                  Same-day reschedule is not allowed. If you try to reschedule to the same date as your original appointment ({formatCalendarDate(reschedulingApt.date)}), the system automatically moves your appointment to the next calendar day ({formatCalendarDate(addOneCalendarDay(reschedulingApt.date))}). Rescheduled appointments will appear in your calendar on the following day.
                </p>
              </div>

              {isSameDaySelected && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Rule: Same-Day Reschedule Forbidden</span>
                  </div>
                  <p>
                    Because requested date matches your original appointment date ({formatCalendarDate(reschedulingApt.date)}), this appointment will automatically move to the next calendar day: <strong>{formatCalendarDate(resolvedTargetDate)}</strong>.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-[10px]">
                    Available slots below are displayed for <strong>{formatCalendarDate(resolvedTargetDate)}</strong>.
                  </p>
                </div>
              )}

              {/* Doctor Personal Working Schedule Context */}
              <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-bold">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Doctor's Working Schedule</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Days:</strong> {docSchedule.workDaysLabel}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Hours:</strong> {docSchedule.hoursLabel}
                </p>
              </div>

              {rescheduleError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{rescheduleError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmReschedule} className="space-y-3.5">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Select New Date (Original: {formatCalendarDate(reschedulingApt.date)})
                  </label>
                  <input
                    type="date"
                    required
                    value={newReschedDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRescheduleError(null);
                      setNewReschedDate(val);
                      setNewReschedTime('');
                    }}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {resolvedTargetDate && !isDocWorking && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{reschedulingApt.doctorName} is off on {formatCalendarDate(resolvedTargetDate)}. Schedule: {docSchedule.workDaysLabel}.</span>
                    </p>
                  )}
                </div>

                {resolvedTargetDate && isDocWorking && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Doctor Available Time Slots
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {availableSlots.filter((s) => s.isAvailable).length} slots open
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
                      {availableSlots.map((item) => {
                        const isSelected = newReschedTime === item.slot;
                        return (
                          <button
                            key={item.slot}
                            type="button"
                            disabled={!item.isAvailable}
                            onClick={() => setNewReschedTime(item.slot)}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center border cursor-pointer ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-400'
                                : item.isAvailable
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700'
                                : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                            }`}
                          >
                            <span className="text-[11px]">{item.formatted}</span>
                            <span className={`text-[8px] mt-0.5 uppercase ${isSelected ? 'text-teal-100' : item.isAvailable ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                              {item.isAvailable ? 'Open' : 'Booked'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReschedulingApt(null)}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium cursor-pointer transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={!newReschedDate || !newReschedTime || !isDocWorking}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold cursor-pointer shadow-sm transition disabled:opacity-50"
                  >
                    Save Reschedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
