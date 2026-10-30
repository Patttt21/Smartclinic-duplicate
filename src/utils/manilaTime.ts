/**
 * SmartClinic — Asia/Manila Timezone Utilities
 * Ensures consistent Philippine Standard Time (UTC+8 / Asia/Manila) date, month,
 * slot comparison, and grace-period calculations across client and server.
 */

export const CLINIC_TIMEZONE = 'Asia/Manila';

function toValidDate(input?: Date | string | number): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Plain YYYY-MM-DD should be treated as local Asia/Manila calendar date
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T12:00:00+08:00`);
    }
  }
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Returns YYYY-MM-DD in Asia/Manila timezone.
 */
export function getManilaDateString(input?: Date | string | number): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  const d = toValidDate(input);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM in Asia/Manila timezone.
 */
export function getManilaYearMonth(input?: Date | string | number): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(input.trim())) {
    return input.trim().slice(0, 7);
  }
  return getManilaDateString(input).slice(0, 7);
}

/**
 * Returns 24-hour HH:mm string in Asia/Manila timezone.
 */
export function getManilaTime24(input?: Date | string | number): string {
  const d = toValidDate(input);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const rawHour = parts.find((p) => p.type === 'hour')?.value ?? '09';
  const hour = rawHour === '24' ? '00' : rawHour.padStart(2, '0');
  const minute = (parts.find((p) => p.type === 'minute')?.value ?? '00').padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * Formats an ISO or Date timestamp into human-readable Asia/Manila timestamp.
 */
export function formatManilaDateTime(input?: Date | string | number): string {
  const d = toValidDate(input);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d) + ' PST';
}

/**
 * Parses a time string ("09:30", "2:15 PM", etc.) into minutes since midnight.
 */
export function parseTimeMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const mer = ampmMatch[3].toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (h24Match) {
    const h = parseInt(h24Match[1], 10);
    const m = parseInt(h24Match[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
  }
  return null;
}

/**
 * Computes how many minutes have elapsed since a scheduled appointment slot
 * in Asia/Manila time. Positive means past the scheduled time; negative means upcoming.
 */
export function minutesPastScheduledSlot(
  scheduledDate: string,
  scheduledTime: string,
  now: Date = new Date()
): number {
  const cleanDate = getManilaDateString(scheduledDate);
  const slotMins = parseTimeMinutes(scheduledTime);
  if (slotMins === null) return -9999;

  const hh = String(Math.floor(slotMins / 60)).padStart(2, '0');
  const mm = String(slotMins % 60).padStart(2, '0');
  const slotEpoch = new Date(`${cleanDate}T${hh}:${mm}:00+08:00`).getTime();
  if (isNaN(slotEpoch)) return -9999;

  return Math.floor((now.getTime() - slotEpoch) / 60000);
}

/**
 * Adds `monthsToAdd` calendar months to a YYYY-MM string.
 */
export function addMonthsToYearMonth(yearMonth: string, monthsToAdd: number): string {
  const [yStr, mStr] = yearMonth.split('-');
  const totalMonths = parseInt(yStr, 10) * 12 + (parseInt(mStr, 10) - 1) + monthsToAdd;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Formats YYYY-MM as "Nov 2026" or "November 2026".
 */
export function formatYearMonthLabel(yearMonth: string, style: 'short' | 'long' = 'short'): string {
  const [yStr, mStr] = yearMonth.split('-');
  const year = parseInt(yStr, 10);
  const monthIdx = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1));
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const longMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${style === 'long' ? longMonths[monthIdx] : shortMonths[monthIdx]} ${year}`;
}
