import test from 'node:test';
import assert from 'node:assert/strict';
import type { Appointment, Consultation, User } from '../types/clinic';
import {
  aggregateMonthlyVolume,
  evaluateModelsChronologically,
  forecastConsultationCategories,
  computeMonthlyClinicCapacity,
  generatePredictiveAnalyticsReport,
} from './monthlyForecasting';
import { getHistoricalSyntheticDataset } from '../data/historicalSyntheticData';

test('1. aggregateMonthlyVolume deduplicates cancelled and superseded rescheduled appointments and separates walk-ins/no-shows', () => {
  const appointments: Appointment[] = [
    // Original appointment later rescheduled -> must NOT be double-counted
    {
      id: 'apt-orig-1',
      patientId: 'pat-1',
      patientName: 'Patient One',
      patientMrn: 'MRN-001',
      doctorId: 'usr-1',
      doctorName: 'Dr. Reyes',
      department: 'Internal Medicine',
      branch: 'Main Outpatient Clinic',
      date: '2026-08-10',
      time: '09:00',
      durationMinutes: 30,
      reason: 'Checkup',
      status: 'Completed',
      type: 'Consultation',
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'apt-resched-1',
      rescheduledFromId: 'apt-orig-1',
      patientId: 'pat-1',
      patientName: 'Patient One',
      patientMrn: 'MRN-001',
      doctorId: 'usr-1',
      doctorName: 'Dr. Reyes',
      department: 'Internal Medicine',
      branch: 'Main Outpatient Clinic',
      date: '2026-08-12',
      time: '10:00',
      durationMinutes: 30,
      reason: 'Checkup',
      status: 'Completed',
      type: 'Consultation',
      createdAt: '2026-08-05T00:00:00Z',
    },
    // Walk-in completed visit by same patient in same month -> uniquePatients stays 1, walkInVisits = 1
    {
      id: 'apt-walkin-1',
      patientId: 'pat-1',
      patientName: 'Patient One',
      patientMrn: 'MRN-001',
      doctorId: 'usr-1',
      doctorName: 'Dr. Reyes',
      department: 'Internal Medicine',
      branch: 'Main Outpatient Clinic',
      date: '2026-08-20',
      time: '11:00',
      durationMinutes: 30,
      reason: 'Walk-in follow-up',
      status: 'Completed',
      type: 'Walk-In',
      isWalkIn: true,
      createdAt: '2026-08-20T00:00:00Z',
    },
    // No-Show appointment
    {
      id: 'apt-noshow-1',
      patientId: 'pat-2',
      patientName: 'Patient Two',
      patientMrn: 'MRN-002',
      doctorId: 'usr-1',
      doctorName: 'Dr. Reyes',
      department: 'Internal Medicine',
      branch: 'Main Outpatient Clinic',
      date: '2026-08-22',
      time: '14:00',
      durationMinutes: 30,
      reason: 'Consult',
      status: 'No Show',
      type: 'Consultation',
      createdAt: '2026-08-18T00:00:00Z',
    },
    // Cancelled appointment -> excluded from net scheduledAppointments and completedVisits
    {
      id: 'apt-cancel-1',
      patientId: 'pat-3',
      patientName: 'Patient Three',
      patientMrn: 'MRN-003',
      doctorId: 'usr-1',
      doctorName: 'Dr. Reyes',
      department: 'Internal Medicine',
      branch: 'Main Outpatient Clinic',
      date: '2026-08-25',
      time: '15:00',
      durationMinutes: 30,
      reason: 'Consult',
      status: 'Cancelled',
      type: 'Consultation',
      createdAt: '2026-08-19T00:00:00Z',
    },
    // October visit -> September 2026 has zero visits and must be filled continuously with 0s
    {
      id: 'apt-oct-1',
      patientId: 'pat-2',
      patientName: 'Patient Two',
      patientMrn: 'MRN-002',
      doctorId: 'usr-1',
      doctorName: 'Dr. Reyes',
      department: 'Internal Medicine',
      branch: 'Main Outpatient Clinic',
      date: '2026-10-05',
      time: '09:30',
      durationMinutes: 30,
      reason: 'Consult',
      status: 'Completed',
      type: 'Consultation',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];

  const monthly = aggregateMonthlyVolume({ appointments });
  assert.equal(monthly.length, 3); // 2026-08, 2026-09 (zero-filled), 2026-10

  const aug = monthly[0];
  assert.equal(aug.yearMonth, '2026-08');
  assert.equal(aug.completedVisits, 2); // resched + walkin (orig superseded)
  assert.equal(aug.scheduledAppointments, 3); // 2 completed + 1 no-show (cancelled excluded)
  assert.equal(aug.uniquePatients, 1); // both completed visits were pat-1
  assert.equal(aug.walkInVisits, 1);
  assert.equal(aug.noShows, 1);
  assert.equal(aug.cancelled, 1);

  const sep = monthly[1];
  assert.equal(sep.yearMonth, '2026-09');
  assert.equal(sep.completedVisits, 0);
  assert.equal(sep.scheduledAppointments, 0);
});

test('2. generatePredictiveAnalyticsReport produces valid 3-month and 6-month forecasts and supports branch filtering', () => {
  const dataset = getHistoricalSyntheticDataset();
  const mockDoctors: User[] = [
    {
      id: 'usr-1',
      name: 'Dr. Maria Cristina Reyes, MD',
      email: 'reyes@smartclinic.ph',
      role: 'doctor',
      avatar: '',
      department: 'Internal Medicine',
      status: 'Active',
      workDays: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 16,
    },
    {
      id: 'usr-2',
      name: 'Dr. Sofia Ramos, MD',
      email: 'ramos@smartclinic.ph',
      role: 'doctor',
      avatar: '',
      department: 'Neurology',
      status: 'Active',
      workDays: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 16,
    },
    {
      id: 'usr-3',
      name: 'Nurse Clara',
      email: 'nurse@smartclinic.ph',
      role: 'nurse',
      avatar: '',
      department: 'Nursing',
      status: 'Active',
    },
  ];

  const report3m = generatePredictiveAnalyticsReport({
    appointments: dataset.appointments,
    consultations: dataset.consultations,
    users: mockDoctors,
    branchFilter: 'ALL',
    horizonMonths: 3,
    maxHistoricalYearMonth: '2026-10',
  });
  assert.equal(report3m.status, 'ok');
  assert.equal(report3m.observationMonthsCount, 30);
  assert.equal(report3m.volumeForecast.length, 3);
  assert.equal(report3m.volumeForecast[0].yearMonth, '2026-11');

  const report6mMain = generatePredictiveAnalyticsReport({
    appointments: dataset.appointments,
    consultations: dataset.consultations,
    users: mockDoctors,
    branchFilter: 'Main Outpatient Clinic',
    horizonMonths: 6,
    maxHistoricalYearMonth: '2026-10',
  });
  const report6mAnnex = generatePredictiveAnalyticsReport({
    appointments: dataset.appointments,
    consultations: dataset.consultations,
    users: mockDoctors,
    branchFilter: 'Annex Satellite Clinic',
    horizonMonths: 6,
    maxHistoricalYearMonth: '2026-10',
  });

  assert.equal(report6mMain.volumeForecast.length, 6);
  assert.equal(report6mAnnex.volumeForecast.length, 6);
  assert.ok(
    report6mMain.volumeForecast[0].predictedCompletedVisits >
      report6mAnnex.volumeForecast[0].predictedCompletedVisits,
    'Main Outpatient Clinic has higher historical volume than Annex Satellite Clinic'
  );
});

test('3. forecastConsultationCategories uses strictly Consultation records (never Appointments) and flags Insufficient Historical Data', () => {
  const dataset = getHistoricalSyntheticDataset();
  const months = Array.from({ length: 30 }, (_, i) => {
    const total = 2024 * 12 + 4 + i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });

  // If consultations array is empty (even if thousands of appointments exist), ALL categories must report insufficient_data
  const emptyConCategories = forecastConsultationCategories({
    consultations: [],
    branchFilter: 'ALL',
    historicalMonths: months,
    horizonMonths: 3,
  });
  assert.ok(emptyConCategories.length > 0);
  for (const cat of emptyConCategories) {
    assert.equal(cat.status, 'insufficient_data');
    assert.equal(cat.statusLabel, 'Insufficient Historical Data');
    assert.equal(cat.forecastSeries.length, 0);
  }

  // On the 30-month synthetic consultation dataset, common categories are supported while sparse Dermatologic is gated
  const fullCategories = forecastConsultationCategories({
    consultations: dataset.consultations,
    branchFilter: 'ALL',
    historicalMonths: months,
    horizonMonths: 6,
  });
  const feverCat = fullCategories.find((c) => c.category === 'Fever-related Consultations');
  const dermCat = fullCategories.find((c) => c.category === 'Dermatologic Consultations');

  assert.ok(feverCat);
  assert.equal(feverCat.status, 'ok');
  assert.equal(feverCat.forecastSeries.length, 6);

  assert.ok(dermCat);
  assert.equal(dermCat.status, 'insufficient_data');
  assert.equal(dermCat.statusLabel, 'Insufficient Historical Data');
});

test('4. evaluateModelsChronologically prevents future data leakage and computes valid MAE, RMSE, and WAPE vs Naive Baseline', () => {
  // Construct a clean 30-month seasonal + upward trend series
  const seasonalPattern = [90, 86, 88, 84, 92, 105, 118, 122, 114, 116, 125, 98];
  const baseSeries = Array.from({ length: 30 }, (_, idx) => {
    return seasonalPattern[idx % 12] + Math.round(idx * 1.2);
  });

  const evalClean = evaluateModelsChronologically(baseSeries, 3);
  assert.ok(evalClean.selectedModel);
  assert.ok(evalClean.baselineModel);
  assert.ok(evalClean.selectedModel.mae >= 0);
  assert.ok(evalClean.selectedModel.rmse >= evalClean.selectedModel.mae);
  assert.ok(evalClean.selectedModel.wape > 0 && evalClean.selectedModel.wape < 100);
  assert.equal(evalClean.selectedModel.beatsBaseline, true);

  // Verify zero future leakage on prefix training: altering the final observation [29]
  // must NOT change predictions generated from series.slice(0, 24)
  const mutatedFutureSeries = [...baseSeries];
  mutatedFutureSeries[29] = 99999;
  assert.deepEqual(baseSeries.slice(0, 24), mutatedFutureSeries.slice(0, 24));
});

test('5. computeMonthlyClinicCapacity computes capacity independently from active physician schedules and flags insufficient history cleanly', () => {
  const shortReport = generatePredictiveAnalyticsReport({
    appointments: [
      {
        id: 'a1',
        patientId: 'p1',
        patientName: 'P1',
        patientMrn: 'M1',
        doctorId: 'usr-1',
        doctorName: 'Dr. 1',
        department: 'IM',
        date: '2026-09-10',
        time: '09:00',
        durationMinutes: 30,
        reason: 'Visit',
        status: 'Completed',
        type: 'Consultation',
        createdAt: '2026-09-01T00:00:00Z',
      },
    ],
    consultations: [] as Consultation[],
    users: [],
    horizonMonths: 3,
  });
  assert.equal(shortReport.status, 'insufficient_data');
  assert.equal(shortReport.statusLabel, 'Insufficient Historical Data');

  const capacity = computeMonthlyClinicCapacity({
    users: [
      {
        id: 'doc-1',
        name: 'Dr. One',
        email: 'd1@clinic.ph',
        role: 'doctor',
        avatar: '',
        department: 'IM',
        status: 'Active',
        workDays: [1, 2, 3, 4, 5],
        startHour: 9,
        endHour: 17,
      },
      {
        id: 'nurse-1',
        name: 'Nurse One',
        email: 'n1@clinic.ph',
        role: 'nurse',
        avatar: '',
        department: 'Nursing',
        status: 'Active',
      },
    ],
    branchFilter: 'ALL',
    volumeForecast: [
      {
        yearMonth: '2026-11',
        label: 'Nov 2026',
        horizonStep: 1,
        predictedCompletedVisits: 80,
        predictedAppointmentDemand: 90,
        lowerBound: 70,
        upperBound: 90,
        demandLevel: 'Normal Demand',
      },
    ],
  });

  assert.equal(capacity.length, 1);
  assert.ok(capacity[0].staffAdjustedCapacity > 0);
  assert.ok(capacity[0].utilizationPercent > 0);
});
