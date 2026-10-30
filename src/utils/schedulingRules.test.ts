import test from 'node:test';
import assert from 'node:assert/strict';
import type { Appointment, User } from '../types/clinic';
import {
  validateAppointmentSlotBooking,
  evaluateWalkInCapacity,
  isAppointmentEligibleForNoShow,
  canPatientRebookOnDate,
  applyReschedulingRule,
} from './schedulingRules';

const mockDoctor: User = {
  id: 'usr-doc-1',
  name: 'Dr. Maria Cristina Reyes, MD',
  email: 'reyes@smartclinic.ph',
  role: 'doctor',
  avatar: '',
  department: 'Internal Medicine',
  status: 'Active',
  workDays: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 11, // 2 hours -> four 30-min slots: 09:00, 09:30, 10:00, 10:30
};

function makeAppointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'apt-1',
    patientId: 'pat-1',
    patientName: 'Liam Gabriel Torres',
    patientMrn: 'MRN-001',
    doctorId: 'usr-doc-1',
    doctorName: 'Dr. Maria Cristina Reyes, MD',
    department: 'Internal Medicine',
    date: '2026-10-30',
    time: '09:00',
    durationMinutes: 30,
    reason: 'Outpatient checkup',
    status: 'Confirmed',
    type: 'Consultation',
    createdAt: '2026-10-29T00:00:00Z',
    ...overrides,
  };
}

test('1. validateAppointmentSlotBooking blocks double-booking of the same doctor slot and duplicate active queue entries', () => {
  const existing: Appointment[] = [
    makeAppointment({ id: 'apt-booked', time: '09:30', status: 'Confirmed' }),
    makeAppointment({ id: 'apt-queue', patientId: 'pat-queued', time: '10:00', status: 'Checked In', queueNumber: 'A-101' }),
  ];

  // Double-booking 09:30 (even in 12h format "9:30 AM") must be rejected
  const conflict = validateAppointmentSlotBooking({
    patientId: 'pat-new',
    doctorId: 'usr-doc-1',
    date: '2026-10-30',
    time: '9:30 AM',
    appointments: existing,
  });
  assert.equal(conflict.valid, false);

  // Open slot 10:30 for a new patient succeeds
  const openSlot = validateAppointmentSlotBooking({
    patientId: 'pat-new',
    doctorId: 'usr-doc-1',
    date: '2026-10-30',
    time: '10:30',
    appointments: existing,
  });
  assert.equal(openSlot.valid, true);

  // Duplicate active queue entry for `pat-queued` on the same date is blocked
  const dupQueue = validateAppointmentSlotBooking({
    patientId: 'pat-queued',
    doctorId: 'usr-doc-1',
    date: '2026-10-30',
    time: '10:30',
    appointments: existing,
    checkDuplicateQueue: true,
  });
  assert.equal(dupQueue.valid, false);
});

test('2. evaluateWalkInCapacity protects confirmed online bookings from displacement when daily slots are full', () => {
  const threeOnlineBookings: Appointment[] = [
    makeAppointment({ id: 'o1', time: '09:00', status: 'Confirmed', isWalkIn: false }),
    makeAppointment({ id: 'o2', time: '09:30', status: 'Scheduled', isWalkIn: false }),
    makeAppointment({ id: 'o3', time: '10:00', status: 'Checked In', isWalkIn: false }),
  ];

  // 3 of 4 slots reserved -> 1 walk-in slot remains at 10:30
  const capOpen = evaluateWalkInCapacity({
    doctor: mockDoctor,
    date: '2026-10-30',
    appointments: threeOnlineBookings,
  });
  assert.equal(capOpen.totalDailySlots, 4);
  assert.equal(capOpen.reservedOnlineCount, 3);
  assert.equal(capOpen.remainingWalkInCapacity, 1);
  assert.equal(capOpen.canAcceptWalkIn, true);
  assert.equal(capOpen.suggestedSlotTime, '10:30');

  // Once all 4 slots are reserved online, walk-ins are blocked so online patients are NEVER displaced
  const fourOnlineBookings: Appointment[] = [
    ...threeOnlineBookings,
    makeAppointment({ id: 'o4', time: '10:30', status: 'Confirmed', isWalkIn: false }),
  ];
  const capFull = evaluateWalkInCapacity({
    doctor: mockDoctor,
    date: '2026-10-30',
    appointments: fourOnlineBookings,
  });
  assert.equal(capFull.canAcceptWalkIn, false);
  assert.equal(capFull.remainingWalkInCapacity, 0);
  assert.equal(capFull.suggestedSlotTime, null);
});

test('3. isAppointmentEligibleForNoShow enforces configurable 15-30 minute grace period in Asia/Manila time', () => {
  const apt = makeAppointment({
    date: '2026-10-30',
    time: '09:00',
    status: 'Confirmed',
  });

  // At 09:15 PST (+08:00), 15 minutes late -> not yet eligible under 20-min grace period
  const at915Pst = new Date('2026-10-30T09:15:00+08:00');
  const checkEarly = isAppointmentEligibleForNoShow(apt, 20, at915Pst);
  assert.equal(checkEarly.eligible, false);
  assert.equal(checkEarly.minutesLate, 15);

  // At 09:21 PST (+08:00), 21 minutes late -> eligible under 20-min grace period
  const at921Pst = new Date('2026-10-30T09:21:00+08:00');
  const checkLate = isAppointmentEligibleForNoShow(apt, 20, at921Pst);
  assert.equal(checkLate.eligible, true);
  assert.equal(checkLate.minutesLate, 21);
});

test('4. canPatientRebookOnDate blocks patient same-day self-rebooking after No Show, allows next-day booking, and requires staff reason for same-day override', () => {
  const noShowToday: Appointment[] = [
    makeAppointment({
      id: 'apt-missed',
      patientId: 'pat-1',
      date: '2026-10-30',
      time: '09:00',
      status: 'No Show',
    }),
  ];

  // Patient attempting automatic same-day rebooking -> blocked
  const patientSameDay = canPatientRebookOnDate({
    patientId: 'pat-1',
    targetDate: '2026-10-30',
    appointments: noShowToday,
    actorRole: 'patient',
    todayManila: '2026-10-30',
  });
  assert.equal(patientSameDay.allowed, false);
  assert.equal(patientSameDay.requiresStaffOverride, true);

  // Patient booking for tomorrow -> allowed
  const patientNextDay = canPatientRebookOnDate({
    patientId: 'pat-1',
    targetDate: '2026-10-31',
    appointments: noShowToday,
    actorRole: 'patient',
    todayManila: '2026-10-30',
  });
  assert.equal(patientNextDay.allowed, true);

  // Receptionist attempting override WITHOUT reason -> blocked
  const staffNoReason = canPatientRebookOnDate({
    patientId: 'pat-1',
    targetDate: '2026-10-30',
    appointments: noShowToday,
    actorRole: 'receptionist',
    staffOverrideReason: '',
    todayManila: '2026-10-30',
  });
  assert.equal(staffNoReason.allowed, false);

  // Receptionist WITH documented audit reason -> allowed
  const staffWithReason = canPatientRebookOnDate({
    patientId: 'pat-1',
    targetDate: '2026-10-30',
    appointments: noShowToday,
    actorRole: 'receptionist',
    staffOverrideReason: 'Patient delayed in traffic; approved by reception supervisor',
    todayManila: '2026-10-30',
  });
  assert.equal(staffWithReason.allowed, true);
  assert.equal(staffWithReason.overriddenByStaff, true);
});

test('5. applyReschedulingRule moves same-day reschedule requests to the next calendar day', () => {
  const sameDay = applyReschedulingRule('2026-10-30', '2026-10-30');
  assert.equal(sameDay.wasSameDay, true);
  assert.equal(sameDay.finalDate, '2026-10-31');

  const diffDay = applyReschedulingRule('2026-11-02', '2026-10-30');
  assert.equal(diffDay.wasSameDay, false);
  assert.equal(diffDay.finalDate, '2026-11-02');
});
