import type { Appointment, User, UserRole } from '../types/clinic';
import { getManilaDateString, minutesPastScheduledSlot, parseTimeMinutes } from './manilaTime';

/**
 * Smart Clinic Scheduling Rules Engine
 *
 * Rules:
 * 1. Same-day reschedule is not allowed.
 *    - If the patient tries to reschedule to the same date as the original appointment date,
 *      automatically move the appointment to the next calendar day.
 *    - This is the standard rescheduling rule for all appointments.
 *
 * 2. Date comparison rule:
 *    - Before confirming any reschedule, compare: requested_date and original_appointment_date.
 *    - If requested_date == original_appointment_date:
 *        final_date = original_appointment_date + 1 day
 *    - Otherwise:
 *        final_date = requested_date
 *
 * 3. Cancellation and rebooking:
 *    - If the patient cancels the appointment, they may immediately book a new appointment for tomorrow.
 *    - Tomorrow must be available globally, without restricting the location or original slot.
 *    - The new appointment may be booked for any tomorrow slot available in the clinic.
 *
 * 4. Important:
 *    - Same-day rescheduling is forbidden.
 *    - The rescheduled appointment must appear in the calendar on the next day whenever the request matches the original date.
 *    - The system must never leave the appointment on the original date after a reschedule.
 *
 * 5. Examples:
 *    - Original: Jun 10 | Request: reschedule to Jun 10 -> Final: Jun 11
 *    - Original: Oct 25 | Request: reschedule to Oct 26 -> Final: Oct 26
 *    - Original: Dec 18 | Request: cancel and book tomorrow -> Final: canceled and new booking for tomorrow
 */

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Normalizes a date representation for reliable equality comparison.
 * Supports:
 * - 'YYYY-MM-DD'
 * - 'Jun 10', 'June 10', '10 Jun', etc.
 * - ISO string timestamps
 */
export function normalizeDateForComparison(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/,/g, '');

  // 1. Check YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(Number(ymdMatch[2])).padStart(2, '0');
    const d = String(Number(ymdMatch[3])).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Check Month Name + Day (e.g., 'Jun 10', 'October 25', 'Dec 18')
  const mNameDayMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?/i);
  if (mNameDayMatch) {
    const monthStr = mNameDayMatch[1].toLowerCase();
    const day = Number(mNameDayMatch[2]);
    const year = mNameDayMatch[3] ? Number(mNameDayMatch[3]) : new Date().getFullYear();

    const mIdx = MONTH_NAMES_SHORT.findIndex((m) => monthStr.startsWith(m.toLowerCase()));
    if (mIdx !== -1) {
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Check Day + Month Name (e.g., '10 Jun', '25 October')
  const dayMNameMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/i);
  if (dayMNameMatch) {
    const day = Number(dayMNameMatch[1]);
    const monthStr = dayMNameMatch[2].toLowerCase();
    const year = dayMNameMatch[3] ? Number(dayMNameMatch[3]) : new Date().getFullYear();

    const mIdx = MONTH_NAMES_SHORT.findIndex((m) => monthStr.startsWith(m.toLowerCase()));
    if (mIdx !== -1) {
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4. Fallback Date constructor
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return trimmed.toLowerCase();
}

/**
 * Adds exactly one calendar day to any date string or representation.
 * Preserves the format style when possible (e.g. 'Jun 10' -> 'Jun 11', '2026-10-25' -> '2026-10-26').
 */
export function addOneCalendarDay(dateStr: string): string {
  if (!dateStr) return dateStr;
  const trimmed = dateStr.trim();

  // If format is like 'Jun 10' or 'October 25'
  const textMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?/);
  if (textMatch) {
    const monthStr = textMatch[1];
    const dayNum = Number(textMatch[2]);
    const yearNum = textMatch[3] ? Number(textMatch[3]) : new Date().getFullYear();

    const mIdx = MONTH_NAMES_SHORT.findIndex((m) => monthStr.toLowerCase().startsWith(m.toLowerCase()));
    if (mIdx !== -1) {
      const d = new Date(yearNum, mIdx, dayNum);
      d.setDate(d.getDate() + 1);
      const nextMonthShort = MONTH_NAMES_SHORT[d.getMonth()];
      const isFullMonth = MONTH_NAMES_FULL.some((full) => full.toLowerCase() === monthStr.toLowerCase());
      const nextMonth = isFullMonth ? MONTH_NAMES_FULL[d.getMonth()] : nextMonthShort;
      const nextDay = d.getDate();
      return textMatch[3] ? `${nextMonth} ${nextDay}, ${d.getFullYear()}` : `${nextMonth} ${nextDay}`;
    }
  }

  // If format is YYYY-MM-DD
  const ymdParts = trimmed.split('T')[0].split('-').map(Number);
  if (ymdParts.length === 3 && !isNaN(ymdParts[0]) && !isNaN(ymdParts[1]) && !isNaN(ymdParts[2])) {
    const d = new Date(ymdParts[0], ymdParts[1] - 1, ymdParts[2]);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Generic fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  return trimmed;
}

export interface RescheduleComparisonResult {
  requestedDate: string;
  originalAppointmentDate: string;
  finalDate: string;
  wasSameDay: boolean;
  explanation: string;
}

/**
 * Date comparison rule:
 * Before confirming any reschedule, compare: requested_date and original_appointment_date
 * If requested_date == original_appointment_date:
 *     final_date = original_appointment_date + 1 day
 * Otherwise:
 *     final_date = requested_date
 */
export function applyReschedulingRule(
  requestedDate: string,
  originalAppointmentDate: string
): RescheduleComparisonResult {
  const normReq = normalizeDateForComparison(requestedDate);
  const normOrig = normalizeDateForComparison(originalAppointmentDate);

  const isSameDay = Boolean(normReq && normOrig && normReq === normOrig);

  let finalDate = requestedDate;
  let explanation = '';

  if (isSameDay) {
    finalDate = addOneCalendarDay(originalAppointmentDate || requestedDate);
    explanation = `Same-day reschedule is not allowed. Because requested date (${requestedDate}) matches original appointment date (${originalAppointmentDate}), appointment is automatically moved to the next calendar day (${finalDate}).`;
  } else {
    finalDate = requestedDate;
    explanation = `Rescheduled to requested date (${finalDate}) as it differs from original appointment date (${originalAppointmentDate}).`;
  }

  return {
    requestedDate,
    originalAppointmentDate,
    finalDate,
    wasSameDay: isSameDay,
    explanation,
  };
}

/**
 * Formats a date string into readable text (e.g. 'June 11, 2026').
 */
export function formatCalendarDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateStr;
}

export interface SchedulingProcessResult {
  isHandled: boolean;
  reply: string;
  action?: 'reschedule' | 'cancel_and_book_tomorrow' | 'cancel';
  originalDate?: string;
  requestedDate?: string;
  finalDate?: string;
  wasSameDay?: boolean;
}

/**
 * Applies the smart clinic scheduling assistant rules to user text:
 * 1. Same-day reschedule is not allowed. (automatically move to next calendar day)
 * 2. Date comparison rule:
 *    requested_date == original_appointment_date -> final_date = original_appointment_date + 1 day
 *    otherwise -> final_date = requested_date
 * 3. Cancellation and rebooking:
 *    cancel appointment -> immediately book new appointment for tomorrow globally (any provider/slot)
 * 4. Important:
 *    Same-day rescheduling is forbidden.
 *    Rescheduled appointment must appear in calendar on next day whenever request matches original date.
 *    Never leave appointment on original date after reschedule.
 * 5. Examples:
 *    Original: Jun 10 | Request: reschedule to Jun 10 -> Final: Jun 11
 *    Original: Oct 25 | Request: reschedule to Oct 26 -> Final: Oct 26
 *    Original: Dec 18 | Request: cancel and book tomorrow -> Final: canceled and new booking for tomorrow
 */
export function processSchedulingMessage(
  userText: string,
  context?: {
    todayStr?: string;
    tomorrowStr?: string;
    tomorrowFormatted?: string;
    existingAppointmentDate?: string;
    doctorName?: string;
    time?: string;
  }
): SchedulingProcessResult {
  const text = (userText || '').trim();
  const lower = text.toLowerCase();

  const now = new Date();
  const todayStr = context?.todayStr || now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = context?.tomorrowStr || tomorrow.toISOString().split('T')[0];
  const tomorrowFormatted =
    context?.tomorrowFormatted ||
    tomorrow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  // 1. Explicit structure match: "Original: <date> ... Request: <action>"
  const explicitPattern = /original[:\s]+([A-Za-z0-9\s,\-]+?)(?:[\r\n,;]+|\s+and\s+)request[:\s]+([^\r\n]+)/i;
  const explicitMatch = text.match(explicitPattern);

  if (explicitMatch) {
    const rawOriginal = explicitMatch[1].trim();
    const rawRequest = explicitMatch[2].trim();
    const lowerReq = rawRequest.toLowerCase();

    // Cancellation & Book Tomorrow
    if (lowerReq.includes('cancel') && (lowerReq.includes('book tomorrow') || lowerReq.includes('tomorrow'))) {
      const reply = `Your appointment for ${rawOriginal} has been canceled. As per clinic policy, you may immediately book a new appointment for tomorrow globally across any available provider and time slot in the clinic.\n\n• Original: ${rawOriginal}\n• Request: cancel and book tomorrow\n• Final: canceled and new booking for tomorrow\n\nTomorrow is available globally without restricting the location or original slot. You may select any tomorrow slot available in the clinic.`;
      return {
        isHandled: true,
        reply,
        action: 'cancel_and_book_tomorrow',
        originalDate: rawOriginal,
        finalDate: tomorrowStr,
      };
    }

    // Reschedule Request
    const reschedDateMatch = rawRequest.match(/(?:reschedule\s+to|reschedule\s+for|move\s+to|change\s+to)\s+([A-Za-z0-9\s,\-]+)/i);
    const rawRequestedDate = reschedDateMatch ? reschedDateMatch[1].trim() : rawRequest.replace(/reschedule|move|to|for/gi, '').trim();

    if (rawRequestedDate) {
      const ruleResult = applyReschedulingRule(rawRequestedDate, rawOriginal);
      let reply = '';
      if (ruleResult.wasSameDay) {
        reply = `Same-day reschedule is not allowed as per standard clinic policy. Because the requested date (${rawRequestedDate}) matches the original appointment date (${rawOriginal}), the appointment is automatically moved to the next calendar day.\n\n• Original: ${rawOriginal}\n• Request: reschedule to ${rawRequestedDate}\n• Final: ${ruleResult.finalDate}\n\nThe rescheduled appointment appears in the calendar on the next day (${ruleResult.finalDate}). The appointment is never left on the original date.`;
      } else {
        reply = `Your appointment has been rescheduled.\n\n• Original: ${rawOriginal}\n• Request: reschedule to ${rawRequestedDate}\n• Final: ${ruleResult.finalDate}\n\nThe rescheduled appointment appears in your calendar on ${ruleResult.finalDate}.`;
      }

      return {
        isHandled: true,
        reply,
        action: 'reschedule',
        originalDate: rawOriginal,
        requestedDate: rawRequestedDate,
        finalDate: ruleResult.finalDate,
        wasSameDay: ruleResult.wasSameDay,
      };
    }
  }

  // 2. Cancellation with immediate rebooking for tomorrow
  const isCancelAndBookTomorrow =
    lower.includes('cancel') &&
    (lower.includes('book tomorrow') ||
      lower.includes('for tomorrow') ||
      lower.includes('reschedule tomorrow') ||
      lower.includes('schedule tomorrow'));

  if (isCancelAndBookTomorrow) {
    // Extract date if mentioned (e.g. "cancel my Dec 18 appointment and book tomorrow")
    const dateMentionMatch = text.match(/(?:cancel|appointment\s+on|visit\s+on)\s+(?:my\s+)?([A-Za-z]{3,9}\s+\d{1,2}|\d{4}-\d{2}-\d{2})/i);
    const origDate = dateMentionMatch ? dateMentionMatch[1].trim() : context?.existingAppointmentDate || 'Dec 18';

    const reply = `Your appointment for ${origDate} has been canceled. As per clinic policy, you may immediately book a new appointment for tomorrow globally across any available provider and time slot in the clinic.\n\n• Original: ${origDate}\n• Request: cancel and book tomorrow\n• Final: canceled and new booking for tomorrow\n\nTomorrow (${tomorrowFormatted}) is available globally without restricting the location or original slot. You may select any tomorrow slot available in the clinic.`;

    return {
      isHandled: true,
      reply,
      action: 'cancel_and_book_tomorrow',
      originalDate: origDate,
      finalDate: tomorrowStr,
    };
  }

  // 3. Reschedule with two dates mentioned: "reschedule [date1] to [date2]"
  const twoDatesMatch = text.match(/reschedule(?:\s+my)?\s+([A-Za-z]{3,9}\s+\d{1,2}|\d{4}-\d{2}-\d{2})\s+(?:appointment\s+)?(?:to|for)\s+([A-Za-z]{3,9}\s+\d{1,2}|\d{4}-\d{2}-\d{2})/i);
  if (twoDatesMatch) {
    const origDate = twoDatesMatch[1].trim();
    const reqDate = twoDatesMatch[2].trim();
    const ruleResult = applyReschedulingRule(reqDate, origDate);

    let reply = '';
    if (ruleResult.wasSameDay) {
      reply = `Same-day reschedule is not allowed as per standard clinic policy. Because the requested date (${reqDate}) matches the original appointment date (${origDate}), the appointment is automatically moved to the next calendar day.\n\n• Original: ${origDate}\n• Request: reschedule to ${reqDate}\n• Final: ${ruleResult.finalDate}\n\nThe rescheduled appointment appears in the calendar on the next day (${ruleResult.finalDate}). The system never leaves the appointment on the original date.`;
    } else {
      reply = `Your appointment has been rescheduled.\n\n• Original: ${origDate}\n• Request: reschedule to ${reqDate}\n• Final: ${ruleResult.finalDate}\n\nThe rescheduled appointment appears in your calendar on ${ruleResult.finalDate}.`;
    }

    return {
      isHandled: true,
      reply,
      action: 'reschedule',
      originalDate: origDate,
      requestedDate: reqDate,
      finalDate: ruleResult.finalDate,
      wasSameDay: ruleResult.wasSameDay,
    };
  }

  // 4. Same-day reschedule attempt for today
  const isSameDayReschedule =
    (lower.includes('move') || lower.includes('reschedule') || lower.includes('change')) &&
    (lower.includes('another slot today') ||
      lower.includes('other slot today') ||
      lower.includes('later today') ||
      lower.includes('slot today') ||
      lower.includes('same day') ||
      lower.includes('same-day'));

  if (isSameDayReschedule) {
    const origDate = context?.existingAppointmentDate || todayStr;
    const ruleResult = applyReschedulingRule(origDate, origDate);

    const reply = `Same-day reschedule is not allowed as per standard clinic policy. If the patient tries to reschedule to the same date as the original appointment date, the appointment is automatically moved to the next calendar day.\n\n• Original: Today (${todayStr})\n• Request: reschedule to today\n• Final: Tomorrow (${tomorrowFormatted}, ${tomorrowStr})\n\nThe rescheduled appointment appears in the calendar on the next day (${tomorrowFormatted}). Would you like me to book your slot for tomorrow?`;

    return {
      isHandled: true,
      reply,
      action: 'reschedule',
      originalDate: origDate,
      requestedDate: origDate,
      finalDate: ruleResult.finalDate,
      wasSameDay: true,
    };
  }

  // 5. "I need to reschedule my appointment for today" / reschedule today
  const isRescheduleForToday =
    (lower.includes('reschedule') || lower.includes('move')) &&
    (lower.includes('for today') ||
      lower.includes('today') ||
      lower.includes("today's") ||
      lower.includes('appointment')) &&
    !lower.includes('cancel');

  if (isRescheduleForToday && (lower.includes('today') || lower.includes('reschedule'))) {
    const origDate = context?.existingAppointmentDate || todayStr;
    const ruleResult = applyReschedulingRule(origDate, origDate);

    const reply = `Same-day reschedule is not allowed as per standard clinic policy. Because the request matches the original appointment date, your appointment has been automatically moved to the next calendar day.\n\n• Original: Today (${todayStr})\n• Request: reschedule for today\n• Final: Tomorrow (${tomorrowFormatted}, ${tomorrowStr})\n\nYour appointment is now scheduled for tomorrow at ${context?.time || '09:30 AM'}. It appears in your calendar on the following day (${tomorrowFormatted}).`;

    return {
      isHandled: true,
      reply,
      action: 'reschedule',
      originalDate: origDate,
      requestedDate: origDate,
      finalDate: ruleResult.finalDate,
      wasSameDay: true,
    };
  }

  // 6. General cancel
  if (lower.includes('cancel')) {
    const origDate = context?.existingAppointmentDate || todayStr;
    const reply = `Your appointment has been canceled. As per clinic policy, you may immediately book a new appointment for tomorrow globally across any available clinic slot or provider.\n\n• Original: ${origDate}\n• Request: cancel and book tomorrow\n• Final: canceled and new booking for tomorrow\n\nTomorrow (${tomorrowFormatted}) is available globally without restricting the location or original slot. You may book any open slot for tomorrow.`;

    return {
      isHandled: true,
      reply,
      action: 'cancel_and_book_tomorrow',
      originalDate: origDate,
      finalDate: tomorrowStr,
    };
  }

  return {
    isHandled: false,
    reply: '',
  };
}

// ============================================================================
// PART 9 — APPOINTMENT, WALK-IN CAPACITY, GRACE PERIOD & NO-SHOW RULES
// ============================================================================

export const DEFAULT_NO_SHOW_GRACE_MINUTES = 30; // Configurable operational grace period (initial default: 30 minutes)
export const MIN_NO_SHOW_GRACE_MINUTES = 5;
export const MAX_NO_SHOW_GRACE_MINUTES = 120;

export const NO_SAME_DAY_BOOKING_MESSAGE =
  'Same-day online booking is unavailable. Please select an available date starting tomorrow.';

/**
 * Validates that a patient online booking date is strictly tomorrow or later in Asia/Manila time.
 * Applies to both In-Person and Online Consultation bookings.
 */
export function validatePatientBookingDateManila(
  dateStr: string,
  now: Date = new Date()
): { valid: boolean; earliestBookableDate: string; todayManila: string; error?: string } {
  const todayManila = getManilaDateString(now);
  const earliestBookableDate = addOneCalendarDay(todayManila);
  const cleanTarget = normalizeDateForComparison(dateStr);

  if (!cleanTarget || !/^\d{4}-\d{2}-\d{2}$/.test(cleanTarget)) {
    return {
      valid: false,
      earliestBookableDate,
      todayManila,
      error: 'Please select a valid appointment date.',
    };
  }

  if (cleanTarget <= todayManila) {
    return {
      valid: false,
      earliestBookableDate,
      todayManila,
      error: NO_SAME_DAY_BOOKING_MESSAGE,
    };
  }

  return {
    valid: true,
    earliestBookableDate,
    todayManila,
  };
}

export function normalizeSlot24(timeStr: string): string {
  const mins = parseTimeMinutes(timeStr);
  if (mins === null) return (timeStr || '').trim();
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function isActiveQueueStatus(status: Appointment['status']): boolean {
  return status === 'Checked In' || status === 'Called' || status === 'In Consultation';
}

export function isSlotReservingStatus(status: Appointment['status']): boolean {
  return (
    status === 'Scheduled' ||
    status === 'Confirmed' ||
    status === 'Checked In' ||
    status === 'Called' ||
    status === 'In Consultation'
  );
}

/**
 * Checks whether a patient is allowed to book/rebook on `targetDate` (YYYY-MM-DD in Asia/Manila).
 * Blocks automatic same-day self-rebooking after a missed ('No Show') appointment on that same date,
 * while permitting authorized clinic staff/admin override when an explicit audit reason is provided.
 */
export function canPatientRebookOnDate(params: {
  patientId: string;
  targetDate: string;
  appointments: Appointment[];
  actorRole: UserRole;
  staffOverrideReason?: string;
  todayManila?: string;
}): {
  allowed: boolean;
  requiresStaffOverride: boolean;
  overriddenByStaff: boolean;
  reason?: string;
} {
  const cleanTarget = getManilaDateString(params.targetDate);
  const cleanToday = params.todayManila ? getManilaDateString(params.todayManila) : getManilaDateString();

  const hasSameDayNoShow = params.appointments.some(
    (a) =>
      !a.isSynthetic &&
      a.patientId === params.patientId &&
      getManilaDateString(a.date) === cleanTarget &&
      a.status === 'No Show'
  );

  if (!hasSameDayNoShow || cleanTarget !== cleanToday) {
    return { allowed: true, requiresStaffOverride: false, overriddenByStaff: false };
  }

  const isAuthorizedStaff =
    params.actorRole === 'admin' ||
    params.actorRole === 'receptionist' ||
    params.actorRole === 'nurse' ||
    params.actorRole === 'doctor';

  if (isAuthorizedStaff && params.staffOverrideReason && params.staffOverrideReason.trim().length >= 5) {
    return {
      allowed: true,
      requiresStaffOverride: true,
      overriddenByStaff: true,
    };
  }

  if (isAuthorizedStaff) {
    return {
      allowed: false,
      requiresStaffOverride: true,
      overriddenByStaff: false,
      reason:
        'This patient has a recorded No-Show today. Provide a staff override reason (minimum 5 characters) to authorize same-day rebooking in the audit log.',
    };
  }

  return {
    allowed: false,
    requiresStaffOverride: true,
    overriddenByStaff: false,
    reason:
      'Automatic same-day rebooking is disabled after a missed (No-Show) appointment today. Please book for a future date or ask clinic reception staff for assistance.',
  };
}

/**
 * Checks whether two time intervals [startA, endA) and [startB, endB) overlap.
 */
export function doTimeIntervalsOverlap(
  startMinutesA: number,
  durationMinutesA: number,
  startMinutesB: number,
  durationMinutesB: number,
  bufferMinutes = 0
): boolean {
  const endA = startMinutesA + Math.max(15, durationMinutesA) + Math.max(0, bufferMinutes);
  const endB = startMinutesB + Math.max(15, durationMinutesB) + Math.max(0, bufferMinutes);
  return startMinutesA < endB && startMinutesB < endA;
}

/**
 * Prevents double-booking and overlapping appointments (across both In-Person and Online Consultation)
 * for the same physician on the same Manila date, accounting for duration and optional schedule buffer.
 */
export function validateAppointmentSlotBooking(params: {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  appointments: Appointment[];
  excludeAppointmentId?: string;
  checkDuplicateQueue?: boolean;
}): { valid: boolean; error?: string; conflictingAppointmentId?: string } {
  const cleanDate = getManilaDateString(params.date);
  const cleanTime = normalizeSlot24(params.time);
  const targetStartMins = parseTimeMinutes(cleanTime);
  const targetDuration = Math.max(15, Number(params.durationMinutes) || 30);
  const bufferMins = Math.max(0, Number(params.bufferMinutes) || 0);

  if (targetStartMins === null) {
    return {
      valid: false,
      error: 'Invalid appointment time format. Please select an available schedule slot.',
    };
  }

  const slotConflict = params.appointments.find((a) => {
    if (a.isSynthetic) return false;
    if (a.id === params.excludeAppointmentId) return false;
    if (a.doctorId !== params.doctorId) return false;
    if (getManilaDateString(a.date) !== cleanDate) return false;
    if (!isSlotReservingStatus(a.status)) return false;
    if (a.isWalkIn || a.type === 'Walk-In') return false;

    const existingStartMins = parseTimeMinutes(a.time);
    if (existingStartMins === null) {
      return normalizeSlot24(a.time) === cleanTime;
    }
    const existingDuration = Math.max(15, Number(a.durationMinutes) || 30);
    return doTimeIntervalsOverlap(
      targetStartMins,
      targetDuration,
      existingStartMins,
      existingDuration,
      bufferMins
    );
  });

  if (slotConflict) {
    return {
      valid: false,
      conflictingAppointmentId: slotConflict.id,
      error: `Selected time slot (${cleanTime}) on ${cleanDate} conflicts with an existing ${slotConflict.consultationMode || slotConflict.type || 'scheduled'} appointment for this doctor. Double-booking is not permitted.`,
    };
  }

  // Also prevent the same patient from booking two overlapping appointments at the exact same date & time
  const patientSelfOverlap = params.appointments.find((a) => {
    if (a.isSynthetic) return false;
    if (a.id === params.excludeAppointmentId) return false;
    if (a.patientId !== params.patientId) return false;
    if (getManilaDateString(a.date) !== cleanDate) return false;
    if (!isSlotReservingStatus(a.status)) return false;
    const existingStart = parseTimeMinutes(a.time);
    if (existingStart === null) return false;
    return doTimeIntervalsOverlap(targetStartMins, targetDuration, existingStart, Math.max(15, Number(a.durationMinutes) || 30), 0);
  });

  if (patientSelfOverlap && !params.checkDuplicateQueue) {
    return {
      valid: false,
      conflictingAppointmentId: patientSelfOverlap.id,
      error: `You already have an active appointment scheduled on ${cleanDate} at ${normalizeSlot24(patientSelfOverlap.time)}.`,
    };
  }

  if (params.checkDuplicateQueue) {
    const duplicateQueue = params.appointments.find(
      (a) =>
        !a.isSynthetic &&
        a.id !== params.excludeAppointmentId &&
        a.patientId === params.patientId &&
        getManilaDateString(a.date) === cleanDate &&
        isActiveQueueStatus(a.status)
    );
    if (duplicateQueue) {
      return {
        valid: false,
        error: `Patient already has an active walk-in/visit entry (${duplicateQueue.queueNumber || duplicateQueue.bookingReference || duplicateQueue.id} — ${duplicateQueue.status}) today.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Evaluates daily clinic / physician capacity for walk-in registration.
 * Confirmed/scheduled online bookings reserve their slots and can NEVER be displaced by walk-ins.
 */
export function evaluateWalkInCapacity(params: {
  doctor: User;
  date: string;
  appointments: Appointment[];
  slotDurationMinutes?: number;
}): {
  canAcceptWalkIn: boolean;
  totalDailySlots: number;
  reservedOnlineCount: number;
  activeWalkInCount: number;
  completedCount: number;
  remainingWalkInCapacity: number;
  suggestedSlotTime: string | null;
  reason?: string;
} {
  const cleanDate = getManilaDateString(params.date);
  const slotDuration = params.slotDurationMinutes ?? 30;
  const startHour = typeof params.doctor.startHour === 'number' ? params.doctor.startHour : 9;
  const endHour = typeof params.doctor.endHour === 'number' ? params.doctor.endHour : 16;

  // Exclude 12:00-13:00 lunch break if shift spans across noon
  const rawHours = Math.max(1, endHour - startHour - (startHour < 12 && endHour > 13 ? 1 : 0));
  const totalDailySlots = Math.max(2, Math.floor((rawHours * 60) / slotDuration));

  const dayApts = params.appointments.filter(
    (a) =>
      !a.isSynthetic &&
      a.doctorId === params.doctor.id &&
      getManilaDateString(a.date) === cleanDate &&
      a.status !== 'Cancelled' &&
      a.status !== 'No Show'
  );

  const reservedOnlineCount = dayApts.filter((a) => !a.isWalkIn && a.type !== 'Walk-In').length;
  const activeWalkInCount = dayApts.filter((a) => Boolean(a.isWalkIn || a.type === 'Walk-In')).length;
  const completedCount = dayApts.filter((a) => a.status === 'Completed').length;
  const usedSlots = reservedOnlineCount + activeWalkInCount;
  const remainingWalkInCapacity = Math.max(0, totalDailySlots - usedSlots);

  const takenTimes = new Set(dayApts.map((a) => normalizeSlot24(a.time)));
  let suggestedSlotTime: string | null = null;
  for (let h = startHour; h < endHour; h++) {
    if (startHour < 12 && endHour > 13 && h === 12) continue;
    for (let m = 0; m < 60; m += slotDuration) {
      const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!takenTimes.has(slot)) {
        suggestedSlotTime = slot;
        break;
      }
    }
    if (suggestedSlotTime) break;
  }

  if (remainingWalkInCapacity <= 0 || !suggestedSlotTime) {
    return {
      canAcceptWalkIn: false,
      totalDailySlots,
      reservedOnlineCount,
      activeWalkInCount,
      completedCount,
      remainingWalkInCapacity: 0,
      suggestedSlotTime: null,
      reason: `Dr. ${params.doctor.name.replace(/^Dr\.\s*/i, '')} is at full daily capacity (${usedSlots}/${totalDailySlots} slots reserved). Walk-in patients cannot displace confirmed online bookings; please select another attending physician with open capacity or schedule for the next available day.`,
    };
  }

  return {
    canAcceptWalkIn: true,
    totalDailySlots,
    reservedOnlineCount,
    activeWalkInCount,
    completedCount,
    remainingWalkInCapacity,
    suggestedSlotTime,
  };
}

/**
 * Determines if a Scheduled or Confirmed appointment has exceeded the clinic's no-show grace period.
 * Default grace period is 30 minutes after the scheduled slot in Asia/Manila time.
 */
export function isAppointmentEligibleForNoShow(
  apt: Appointment,
  gracePeriodMinutes: number = DEFAULT_NO_SHOW_GRACE_MINUTES,
  now: Date = new Date()
): { eligible: boolean; minutesLate: number; clampedGraceMinutes: number } {
  const clampedGraceMinutes = Math.max(
    MIN_NO_SHOW_GRACE_MINUTES,
    Math.min(MAX_NO_SHOW_GRACE_MINUTES, Math.round(gracePeriodMinutes))
  );

  if (apt.status !== 'Scheduled' && apt.status !== 'Confirmed') {
    return { eligible: false, minutesLate: 0, clampedGraceMinutes };
  }

  const minutesLate = minutesPastScheduledSlot(apt.date, apt.time, now);
  return {
    eligible: minutesLate >= clampedGraceMinutes,
    minutesLate,
    clampedGraceMinutes,
  };
}



