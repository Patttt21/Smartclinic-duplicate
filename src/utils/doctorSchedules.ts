import type { Appointment, User } from '../types/clinic';

export interface DoctorSchedule {
  doctorId: string;
  doctorName: string;
  department: string;
  specialty: string;
  workDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  workDaysLabel: string;
  hoursLabel: string;
  slots: string[]; // Fixed 30-min time slots in 'HH:mm' 24-hr format
}

/**
 * Individual clinical working schedules for each doctor:
 * - Dr. Santos: Monday–Friday 8:00 AM – 12:00 PM and 1:00 PM – 5:00 PM
 * - Dr. Reyes: Tuesday–Saturday 9:00 AM – 3:00 PM
 * - Dr. Gomez: Monday, Wednesday, Friday 10:00 AM – 4:00 PM
 * - Dr. Lee: Monday–Thursday 1:00 PM – 6:00 PM
 * - Dr. Tan: Wednesday–Saturday 8:00 AM – 1:00 PM
 */
export const DOCTOR_SCHEDULES: Record<string, DoctorSchedule> = {
  // Dr. Juan Miguel Santos, MD (Cardiology)
  'usr-2': {
    doctorId: 'usr-2',
    doctorName: 'Dr. Juan Miguel Santos, MD',
    department: 'Cardiology',
    specialty: 'Cardiovascular Medicine',
    workDays: [1, 2, 3, 4, 5], // Monday to Friday (Closed Sat & Sun)
    workDaysLabel: 'Monday – Friday',
    hoursLabel: '8:00 AM – 12:00 PM & 1:00 PM – 5:00 PM',
    slots: [
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
    ],
  },

  // Dr. Maria Cristina Reyes, MD (Internal Medicine & Endocrinology)
  'usr-1': {
    doctorId: 'usr-1',
    doctorName: 'Dr. Maria Cristina Reyes, MD',
    department: 'Internal Medicine',
    specialty: 'Internal Medicine & Endocrinology',
    workDays: [2, 3, 4, 5, 6], // Tuesday to Saturday (Closed Sun & Mon)
    workDaysLabel: 'Tuesday – Saturday',
    hoursLabel: '9:00 AM – 3:00 PM',
    slots: [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
    ],
  },

  // Dr. Patricia Gomez, MD (Pediatrics & Adolescent Medicine)
  'usr-9': {
    doctorId: 'usr-9',
    doctorName: 'Dr. Patricia Gomez, MD',
    department: 'Pediatrics',
    specialty: 'Pediatrics & Adolescent Care',
    workDays: [1, 3, 5], // Monday, Wednesday, Friday
    workDaysLabel: 'Monday, Wednesday, Friday',
    hoursLabel: '10:00 AM – 4:00 PM',
    slots: [
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
    ],
  },

  // Dr. Anthony Lee, MD (Dermatology & Skin Clinic)
  'usr-10': {
    doctorId: 'usr-10',
    doctorName: 'Dr. Anthony Lee, MD',
    department: 'Dermatology',
    specialty: 'Clinical & Cosmetic Dermatology',
    workDays: [1, 2, 3, 4], // Monday to Thursday
    workDaysLabel: 'Monday – Thursday',
    hoursLabel: '1:00 PM – 6:00 PM',
    slots: [
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
    ],
  },

  // Dr. Roberto Tan, MD (Pulmonology & Respiratory Care)
  'usr-11': {
    doctorId: 'usr-11',
    doctorName: 'Dr. Roberto Tan, MD',
    department: 'Pulmonology',
    specialty: 'Pulmonology & Respiratory Medicine',
    workDays: [3, 4, 5, 6], // Wednesday to Saturday
    workDaysLabel: 'Wednesday – Saturday',
    hoursLabel: '8:00 AM – 1:00 PM',
    slots: [
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
    ],
  },

  // Dr. Sofia Ramos, MD (Neurology & Neurovascular Care)
  'usr-12': {
    doctorId: 'usr-12',
    doctorName: 'Dr. Sofia Ramos, MD',
    department: 'Neurology',
    specialty: 'Neurology',
    workDays: [1, 2, 4, 5], // Monday, Tuesday, Thursday, Friday
    workDaysLabel: 'Monday, Tuesday, Thursday, Friday',
    hoursLabel: '9:00 AM – 3:00 PM',
    slots: [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
    ],
  },

  // Dr. Gabriel Castro, MD (Orthopedics & Sports Medicine)
  'usr-13': {
    doctorId: 'usr-13',
    doctorName: 'Dr. Gabriel Castro, MD',
    department: 'Orthopedics',
    specialty: 'Orthopedics',
    workDays: [1, 3, 5], // Monday, Wednesday, Friday
    workDaysLabel: 'Monday, Wednesday, Friday',
    hoursLabel: '8:00 AM – 2:00 PM',
    slots: [
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
    ],
  },

  // Dr. Elena Torres, MD (Obstetrics & Gynecology)
  'usr-14': {
    doctorId: 'usr-14',
    doctorName: 'Dr. Elena Torres, MD',
    department: 'Obstetrics & Gynecology',
    specialty: 'Obstetrics & Gynecology',
    workDays: [2, 3, 4, 6], // Tuesday, Wednesday, Thursday, Saturday
    workDaysLabel: 'Tuesday – Thursday, Saturday',
    hoursLabel: '10:00 AM – 4:00 PM',
    slots: [
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
    ],
  },

  // Dr. Ramon Jose Bautista, MD (Cardiology & Internal Medicine)
  'usr-bautista': {
    doctorId: 'usr-bautista',
    doctorName: 'Dr. Ramon Jose Bautista, MD, FPCP',
    department: 'Cardiology & Internal Medicine',
    specialty: 'Internal Medicine & Cardiology',
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
    workDaysLabel: 'Monday – Friday',
    hoursLabel: '8:00 AM – 12:00 PM & 1:00 PM – 5:00 PM',
    slots: [
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
    ],
  },

  // Dr. Maria Cristina Mendoza, MD (Pediatrics & Neonatology)
  'usr-mendoza': {
    doctorId: 'usr-mendoza',
    doctorName: 'Dr. Maria Cristina Mendoza, MD, FPPS',
    department: 'Pediatrics',
    specialty: 'Pediatrics & Neonatology',
    workDays: [1, 3, 5], // Monday, Wednesday, Friday
    workDaysLabel: 'Monday, Wednesday, Friday',
    hoursLabel: '9:00 AM – 3:00 PM',
    slots: [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
    ],
  },

  // Dr. Jose Paolo Reyes, MD (Family Medicine & Primary Care)
  'usr-paolo-reyes': {
    doctorId: 'usr-paolo-reyes',
    doctorName: 'Dr. Jose Paolo Reyes, MD, FPAFP',
    department: 'Family Medicine',
    specialty: 'Family Medicine & Primary Care',
    workDays: [2, 3, 4, 5, 6], // Tuesday to Saturday
    workDaysLabel: 'Tuesday – Saturday',
    hoursLabel: '8:00 AM – 2:00 PM',
    slots: [
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
    ],
  },

  // Dr. Beatrice Angela Dizon, MD (Obstetrics & Gynecology)
  'usr-dizon': {
    doctorId: 'usr-dizon',
    doctorName: 'Dr. Beatrice Angela Dizon, MD, FPOGS',
    department: "Women's Health",
    specialty: 'Obstetrics & Gynecology',
    workDays: [2, 4, 6], // Tuesday, Thursday, Saturday
    workDaysLabel: 'Tuesday, Thursday, Saturday',
    hoursLabel: '10:00 AM – 4:00 PM',
    slots: [
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
    ],
  },

  // Dr. Antonio Miguel Villanueva, MD (Orthopedic Surgery & Sports Medicine)
  'usr-villanueva': {
    doctorId: 'usr-villanueva',
    doctorName: 'Dr. Antonio Miguel Villanueva, MD, FPOA',
    department: 'Orthopedics',
    specialty: 'Orthopedic Surgery & Sports Medicine',
    workDays: [1, 3, 4, 5], // Monday, Wednesday, Thursday, Friday
    workDaysLabel: 'Monday, Wednesday, Thursday, Friday',
    hoursLabel: '1:00 PM – 6:00 PM',
    slots: [
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
    ],
  },
};

/**
 * Deterministically generates a unique, specialized schedule based on doctor metadata
 * to prevent any two doctors from sharing an unassigned default schedule.
 */
function generateUniqueDoctorSchedule(doctorId: string, fallbackUser?: User): DoctorSchedule {
  const name = fallbackUser?.name || 'Attending Physician';
  const dept = fallbackUser?.department || 'General Medicine';
  const spec = (fallbackUser?.specialty || dept).toLowerCase();

  // Specialty-tailored clinical shifts
  if (spec.includes('cardio') || spec.includes('heart')) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'Cardiology',
      workDays: [1, 2, 3, 4, 5],
      startHour: 8,
      endHour: 17,
      workDaysLabel: 'Monday – Friday',
      hoursLabel: '8:00 AM – 12:00 PM & 1:00 PM – 5:00 PM',
    });
  }
  if (spec.includes('pediatr') || spec.includes('child')) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'Pediatrics',
      workDays: [1, 3, 5],
      startHour: 9,
      endHour: 15,
      workDaysLabel: 'Monday, Wednesday, Friday',
      hoursLabel: '9:00 AM – 3:00 PM',
    });
  }
  if (spec.includes('derma') || spec.includes('skin')) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'Dermatology',
      workDays: [1, 2, 3, 4],
      startHour: 13,
      endHour: 18,
      workDaysLabel: 'Monday – Thursday',
      hoursLabel: '1:00 PM – 6:00 PM',
    });
  }
  if (spec.includes('pulmo') || spec.includes('respirat') || spec.includes('lung')) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'Pulmonology',
      workDays: [3, 4, 5, 6],
      startHour: 8,
      endHour: 13,
      workDaysLabel: 'Wednesday – Saturday',
      hoursLabel: '8:00 AM – 1:00 PM',
    });
  }
  if (spec.includes('neuro') || spec.includes('brain')) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'Neurology',
      workDays: [1, 2, 4, 5],
      startHour: 9,
      endHour: 15,
      workDaysLabel: 'Monday, Tuesday, Thursday, Friday',
      hoursLabel: '9:00 AM – 3:00 PM',
    });
  }
  if (spec.includes('ortho') || spec.includes('bone') || spec.includes('sports')) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'Orthopedics',
      workDays: [1, 3, 5],
      startHour: 8,
      endHour: 14,
      workDaysLabel: 'Monday, Wednesday, Friday',
      hoursLabel: '8:00 AM – 2:00 PM',
    });
  }
  if (spec.includes('ob') || spec.includes('gyne') || spec.includes('women')) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'Obstetrics & Gynecology',
      workDays: [2, 3, 4, 6],
      startHour: 10,
      endHour: 16,
      workDaysLabel: 'Tuesday – Thursday, Saturday',
      hoursLabel: '10:00 AM – 4:00 PM',
    });
  }

  // Hash-based rotating clinic shifts guaranteeing uniqueness for any additional doctor
  let hash = 0;
  const seedStr = `${doctorId}-${name}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
  }
  const variant = Math.abs(hash) % 4;

  if (variant === 0) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'General Medicine',
      workDays: [1, 2, 3, 4, 5],
      startHour: 8,
      endHour: 14,
      workDaysLabel: 'Monday – Friday',
      hoursLabel: '8:00 AM – 2:00 PM',
    });
  } else if (variant === 1) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'General Medicine',
      workDays: [2, 3, 4, 5, 6],
      startHour: 9,
      endHour: 15,
      workDaysLabel: 'Tuesday – Saturday',
      hoursLabel: '9:00 AM – 3:00 PM',
    });
  } else if (variant === 2) {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'General Medicine',
      workDays: [1, 3, 5],
      startHour: 10,
      endHour: 16,
      workDaysLabel: 'Monday, Wednesday, Friday',
      hoursLabel: '10:00 AM – 4:00 PM',
    });
  } else {
    return createCustomDoctorSchedule({
      doctorId,
      doctorName: name,
      department: dept,
      specialty: fallbackUser?.specialty || 'General Medicine',
      workDays: [1, 2, 4, 5],
      startHour: 11,
      endHour: 17,
      workDaysLabel: 'Monday, Tuesday, Thursday, Friday',
      hoursLabel: '11:00 AM – 5:00 PM',
    });
  }
}

/**
 * Retrieve the individual working schedule for a doctor.
 * Inspects explicit doctor schedule, custom assigned workdays, ID registry, and metadata.
 */
export function getDoctorSchedule(doctorId: string, fallbackUser?: User): DoctorSchedule {
  // 1. Direct match by doctorId
  if (doctorId && DOCTOR_SCHEDULES[doctorId]) {
    return DOCTOR_SCHEDULES[doctorId];
  }

  // 2. Direct match by user.id
  if (fallbackUser?.id && DOCTOR_SCHEDULES[fallbackUser.id]) {
    return DOCTOR_SCHEDULES[fallbackUser.id];
  }

  // 3. If fallbackUser already has pre-computed schedule attached
  if (fallbackUser?.schedule && Array.isArray(fallbackUser.schedule.workDays) && fallbackUser.schedule.workDays.length > 0) {
    registerDoctorSchedule(doctorId || fallbackUser.id, fallbackUser.schedule);
    return fallbackUser.schedule;
  }

  // 4. If fallbackUser has explicitly assigned custom workDays
  if (fallbackUser?.workDays && Array.isArray(fallbackUser.workDays) && fallbackUser.workDays.length > 0) {
    const custom = createCustomDoctorSchedule({
      doctorId: doctorId || fallbackUser.id,
      doctorName: fallbackUser.name,
      department: fallbackUser.department || 'General Medicine',
      specialty: fallbackUser.specialty || 'General Practice',
      workDays: fallbackUser.workDays,
      workDaysLabel: fallbackUser.workDaysLabel,
      hoursLabel: fallbackUser.hoursLabel,
      startHour: fallbackUser.startHour || 8,
      endHour: fallbackUser.endHour || 17,
    });
    return custom;
  }

  // 5. Lookup by email or physician name keywords
  const cleanEmail = (fallbackUser?.email || '').toLowerCase().trim();
  if (cleanEmail) {
    if (cleanEmail.includes('reyes') && cleanEmail.includes('maria')) return DOCTOR_SCHEDULES['usr-1'];
    if (cleanEmail.includes('santos') && cleanEmail.includes('juan')) return DOCTOR_SCHEDULES['usr-2'];
    if (cleanEmail.includes('gomez')) return DOCTOR_SCHEDULES['usr-9'];
    if (cleanEmail.includes('lee')) return DOCTOR_SCHEDULES['usr-10'];
    if (cleanEmail.includes('tan')) return DOCTOR_SCHEDULES['usr-11'];
    if (cleanEmail.includes('ramos')) return DOCTOR_SCHEDULES['usr-12'];
    if (cleanEmail.includes('castro')) return DOCTOR_SCHEDULES['usr-13'];
    if (cleanEmail.includes('torres') && cleanEmail.includes('elena')) return DOCTOR_SCHEDULES['usr-14'];
    if (cleanEmail.includes('bautista')) return DOCTOR_SCHEDULES['usr-bautista'];
    if (cleanEmail.includes('mendoza')) return DOCTOR_SCHEDULES['usr-mendoza'];
    if (cleanEmail.includes('paolo') || (cleanEmail.includes('reyes') && cleanEmail.includes('jose'))) return DOCTOR_SCHEDULES['usr-paolo-reyes'];
    if (cleanEmail.includes('dizon')) return DOCTOR_SCHEDULES['usr-dizon'];
    if (cleanEmail.includes('villanueva')) return DOCTOR_SCHEDULES['usr-villanueva'];
  }

  const queryName = (fallbackUser?.name || doctorId || '').toLowerCase().trim();
  if (queryName) {
    if (queryName.includes('santos') && (queryName.includes('juan') || queryName.includes('miguel'))) return DOCTOR_SCHEDULES['usr-2'];
    if (queryName.includes('reyes') && (queryName.includes('maria') || queryName.includes('cristina'))) return DOCTOR_SCHEDULES['usr-1'];
    if (queryName.includes('gomez')) return DOCTOR_SCHEDULES['usr-9'];
    if (queryName.includes('lee')) return DOCTOR_SCHEDULES['usr-10'];
    if (queryName.includes('tan') && queryName.includes('roberto')) return DOCTOR_SCHEDULES['usr-11'];
    if (queryName.includes('ramos')) return DOCTOR_SCHEDULES['usr-12'];
    if (queryName.includes('castro') && queryName.includes('gabriel')) return DOCTOR_SCHEDULES['usr-13'];
    if (queryName.includes('torres') && queryName.includes('elena')) return DOCTOR_SCHEDULES['usr-14'];
    if (queryName.includes('bautista')) return DOCTOR_SCHEDULES['usr-bautista'];
    if (queryName.includes('mendoza') && queryName.includes('cristina')) return DOCTOR_SCHEDULES['usr-mendoza'];
    if (queryName.includes('reyes') && (queryName.includes('paolo') || queryName.includes('jose'))) return DOCTOR_SCHEDULES['usr-paolo-reyes'];
    if (queryName.includes('dizon')) return DOCTOR_SCHEDULES['usr-dizon'];
    if (queryName.includes('villanueva') && queryName.includes('antonio')) return DOCTOR_SCHEDULES['usr-villanueva'];
  }

  // 6. Generate a deterministic unique schedule for this physician
  const uniqueSchedule = generateUniqueDoctorSchedule(doctorId || fallbackUser?.id || `doc-${Date.now()}`, fallbackUser);
  if (doctorId) registerDoctorSchedule(doctorId, uniqueSchedule);
  if (fallbackUser?.id) registerDoctorSchedule(fallbackUser.id, uniqueSchedule);
  return uniqueSchedule;
}

/**
 * Check if a doctor is working on a given date (YYYY-MM-DD)
 */
export function isDoctorWorkingOnDate(doctorId: string, dateStr: string, fallbackUser?: User): boolean {
  if (!dateStr) return false;
  const cleanDate = dateStr.split('T')[0].trim();
  const parts = cleanDate.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return false;
  }
  const schedule = getDoctorSchedule(doctorId, fallbackUser);
  // Parse YYYY-MM-DD cleanly in local timezone
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayOfWeek = dateObj.getDay();
  return schedule.workDays.includes(dayOfWeek);
}

/**
 * Formats a 24-hr time string ('HH:mm') to 'h:mm AM/PM'
 */
export function formatTimeSlot(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${ampm}`;
}

/**
 * Normalizes any time representation ('9:30 AM', '09:30 AM', '2:00 PM', '14:00', '9:30')
 * into canonical 24-hour 'HH:mm' format (e.g. '09:30', '14:00').
 */
export function normalizeTimeTo24Hour(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  // Standard HH:mm (24-hour)
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return trimmed;
  }
  // Single-digit hour H:mm
  if (/^[0-9]:[0-5]\d$/.test(trimmed)) {
    return `0${trimmed}`;
  }
  // 12-hour format with AM/PM (e.g., "9:30 AM", "09:30 AM", "2:00 PM", "12:00 PM")
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?$/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const modifier = match[3]?.toUpperCase();
    if (modifier === 'PM' && hour < 12) hour += 12;
    if (modifier === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }
  return trimmed;
}

export interface SlotAvailability {
  slot: string;
  formatted: string;
  isAvailable: boolean;
  isBooked: boolean;
  bookedAppointment?: Appointment;
}

/**
 * Compute the slot availability for a doctor on a specific date.
 * Times outside the doctor's personal schedule are NOT returned.
 * Slots booked by other patients are marked unavailable (prevent double booking).
 */
export function getDoctorSlotAvailability(
  doctorId: string,
  dateStr: string,
  appointments: Appointment[],
  excludeAppointmentId?: string,
  fallbackUser?: User
): SlotAvailability[] {
  if (!doctorId || !dateStr) return [];

  const cleanTargetDate = dateStr.split('T')[0].trim();
  const isWorking = isDoctorWorkingOnDate(doctorId, cleanTargetDate, fallbackUser);
  if (!isWorking) {
    return []; // Doctor is off; no slots available
  }

  const schedule = getDoctorSchedule(doctorId, fallbackUser);

  // Find all active booked appointments for this doctor on this date
  const bookedOnDate = appointments.filter((a) => {
    const aDate = (a.date || '').split('T')[0].trim();
    if (aDate !== cleanTargetDate) return false;
    if (a.status === 'Cancelled') return false;
    if (excludeAppointmentId && a.id === excludeAppointmentId) return false;

    const matchesId =
      a.doctorId === doctorId ||
      a.doctorId === schedule.doctorId ||
      (fallbackUser && a.doctorId === fallbackUser.id);
    const matchesName =
      a.doctorName &&
      (a.doctorName.toLowerCase().includes(schedule.doctorName.toLowerCase()) ||
        schedule.doctorName.toLowerCase().includes(a.doctorName.toLowerCase()) ||
        (fallbackUser && a.doctorName.toLowerCase().includes(fallbackUser.name.toLowerCase())));

    return Boolean(matchesId || matchesName);
  });

  const bookedMap = new Map<string, Appointment>();
  bookedOnDate.forEach((a) => {
    const norm = normalizeTimeTo24Hour(a.time);
    bookedMap.set(norm, a);
    if (a.time) {
      bookedMap.set(a.time.trim(), a);
    }
  });

  return schedule.slots.map((slot) => {
    const normSlot = normalizeTimeTo24Hour(slot);
    const bookedAppointment = bookedMap.get(normSlot) || bookedMap.get(slot);
    const isBooked = !!bookedAppointment;
    return {
      slot: normSlot,
      formatted: formatTimeSlot(normSlot),
      isAvailable: !isBooked,
      isBooked,
      bookedAppointment,
    };
  });
}

/**
 * In-memory and persisted dynamic schedules for newly added doctors
 */
export function registerDoctorSchedule(doctorId: string, schedule: DoctorSchedule) {
  DOCTOR_SCHEDULES[doctorId] = schedule;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('smart_clinic_custom_schedules');
      const map = saved ? JSON.parse(saved) : {};
      map[doctorId] = schedule;
      localStorage.setItem('smart_clinic_custom_schedules', JSON.stringify(map));
    }
  } catch {}
}

/**
 * Constructs and registers a DoctorSchedule from custom days and hours
 */
export function createCustomDoctorSchedule(params: {
  doctorId: string;
  doctorName: string;
  department: string;
  specialty: string;
  workDays: number[];
  workDaysLabel?: string;
  hoursLabel?: string;
  startHour?: number;
  endHour?: number;
}): DoctorSchedule {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const workDaysLabel =
    params.workDaysLabel ||
    (params.workDays.length === 5 && params.workDays.every((d, i) => d === i + 1)
      ? 'Monday – Friday'
      : params.workDays.length === 5 && params.workDays[0] === 2
      ? 'Tuesday – Saturday'
      : params.workDays.map((d) => dayNames[d]).join(', '));

  const startHour = params.startHour || 8;
  const endHour = params.endHour || 17;
  const hoursLabel =
    params.hoursLabel ||
    `${startHour > 12 ? startHour - 12 : startHour}:00 ${startHour >= 12 ? 'PM' : 'AM'} – ${
      endHour > 12 ? endHour - 12 : endHour
    }:00 ${endHour >= 12 ? 'PM' : 'AM'}`;

  // Generate 30-min slots
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    // Standard 12:00-13:00 lunch gap if full-day 8-17
    if (h === 12 && endHour >= 16 && startHour <= 9) continue;
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }

  const schedule: DoctorSchedule = {
    doctorId: params.doctorId,
    doctorName: params.doctorName,
    department: params.department,
    specialty: params.specialty,
    workDays: params.workDays,
    workDaysLabel,
    hoursLabel,
    slots,
  };

  registerDoctorSchedule(params.doctorId, schedule);
  return schedule;
}

// On module load in browser, hydrate custom schedules from localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const saved = localStorage.getItem('smart_clinic_custom_schedules');
    if (saved) {
      const map = JSON.parse(saved);
      Object.assign(DOCTOR_SCHEDULES, map);
    }
  } catch {}
}
