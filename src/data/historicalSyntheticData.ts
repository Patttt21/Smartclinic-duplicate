/**
 * SmartClinic — Reproducible Synthetic Historical Outpatient Dataset (Part 5)
 *
 * METHODOLOGY & ACADEMIC TRANSPARENCY:
 * - Purpose: Academic capstone validation of monthly outpatient volume and consultation
 *   symptom category time-series forecasting where no real clinic client records exist.
 * - Time Span: 30 complete historical months (2024-05 through 2026-10, Asia/Manila).
 * - Determinism: Generated via a seeded Mulberry32 PRNG (SEED = 20261029) so every run,
 *   unit test, and evaluation backtest is 100% reproducible and auditable.
 * - Separation: Every generated record carries `isSynthetic: true` and uses synthetic
 *   cohort IDs (`syn-pat-001` .. `syn-pat-160`), preserving existing interactive demo
 *   patients (`pat-1` .. `pat-5`, Patrick Garcia, Elena Vargas) completely untouched.
 * - Realistic Outpatient Structure:
 *   1. Two clinic branches (`Main Outpatient Clinic` and `Annex Satellite Clinic`).
 *   2. Distinct appointment outcomes: `Completed`, `No Show`, `Cancelled`, plus
 *      superseded `rescheduledFromId` records to verify deduplication.
 *   3. Both pre-booked appointments and `Walk-In` (`isWalkIn: true`) visits.
 *   4. Consultation records created ONLY for `Completed` visits, containing structured
 *      outpatient chief complaints, ICD-10 codes, and recorded symptom categories.
 *   5. One intentionally sparse category (`Dermatologic Consultations`, 4 records total)
 *      to demonstrate automatic "Insufficient Historical Data" gating.
 */

import type {
  Appointment,
  ClinicBranch,
  Consultation,
  SymptomConsultationCategory,
} from '../types/clinic';
import { addMonthsToYearMonth } from '../utils/manilaTime';

export const SYNTHETIC_DATA_DISCLAIMER =
  'Prototype Forecast: Results are generated using synthetic healthcare data for academic demonstration purposes and have not been validated using real clinic records.';

export interface SyntheticDatasetMetadata {
  seed: number;
  startMonth: string;
  endMonth: string;
  totalMonths: number;
  branches: ClinicBranch[];
  syntheticPatientCohortSize: number;
  methodologySummary: string;
  disclaimer: string;
}

const PRNG_SEED = 20261029;
const START_YEAR_MONTH = '2024-05';
const TOTAL_HISTORICAL_MONTHS = 30; // 2024-05 .. 2026-10 inclusive

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DOCTORS_POOL = [
  { id: 'usr-1', name: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', branch: 'Main Outpatient Clinic' as ClinicBranch },
  { id: 'usr-2', name: 'Dr. Juan Miguel Santos, MD', department: 'Cardiology', branch: 'Main Outpatient Clinic' as ClinicBranch },
  { id: 'usr-9', name: 'Dr. Patricia Gomez, MD', department: 'Pediatrics', branch: 'Main Outpatient Clinic' as ClinicBranch },
  { id: 'usr-11', name: 'Dr. Roberto Tan, MD', department: 'Pulmonology', branch: 'Main Outpatient Clinic' as ClinicBranch },
  { id: 'usr-12', name: 'Dr. Sofia Ramos, MD', department: 'Neurology', branch: 'Annex Satellite Clinic' as ClinicBranch },
  { id: 'usr-14', name: 'Dr. Elena Torres, MD', department: 'Obstetrics & Gynecology', branch: 'Annex Satellite Clinic' as ClinicBranch },
];

const FIRST_NAMES = [
  'Mateo', 'Camille', 'Rafael', 'Bianca', 'Joaquin', 'Clarisse', 'Nathaniel', 'angelica',
  'Paolo', 'Katrina', 'Lorenzo', 'Marisol', 'Gabriel', 'daniela', 'Cedric', 'Beatriz',
  'Miguel', 'therese', 'Andre', 'Valerie',
];

const LAST_NAMES = [
  'Dela Rosa', 'Villanueva', 'Mendoza', 'Bautista', 'Soriano', 'Aquino', 'Navarro', 'Mercado',
  'Salazar', 'Castillo', 'Pascual', 'Aguilar', 'Domingo', 'Tolentino', 'Evangelista', 'Rivera',
];

interface CategoryTemplate {
  category: SymptomConsultationCategory;
  complaints: string[];
  icdCode: string;
  icdDesc: string;
  /** Relative monthly weight multiplier by calendar month 1..12 (realistic Philippine outpatient seasonality) */
  monthlyMultipliers: number[];
  baseShare: number;
}

const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    category: 'Fever-related Consultations',
    complaints: [
      'Intermittent febrile episodes (38.3°C) for 2 days with mild myalgia',
      'Low-grade fever and malaise evaluated at outpatient clinic',
      'Acute febrile illness monitoring and hydration assessment',
    ],
    icdCode: 'R50.9',
    icdDesc: 'Fever, unspecified — outpatient evaluation',
    // Gradual wet-season elevation (Jul-Nov) derived from multi-year synthetic records
    monthlyMultipliers: [0.88, 0.84, 0.82, 0.85, 0.92, 1.12, 1.28, 1.34, 1.30, 1.36, 1.42, 1.15],
    baseShare: 0.20,
  },
  {
    category: 'Cough-related Consultations',
    complaints: [
      'Non-productive cough for 4 days with throat irritation',
      'Persistent dry cough aggravated by cool evening air',
      'Productive cough without dyspnea, outpatient chest auscultation clear',
    ],
    icdCode: 'R05.9',
    icdDesc: 'Cough, unspecified',
    monthlyMultipliers: [1.14, 1.05, 0.88, 0.82, 0.86, 1.04, 1.18, 1.24, 1.22, 1.25, 1.28, 1.20],
    baseShare: 0.17,
  },
  {
    category: 'Respiratory-symptom Consultations',
    complaints: [
      'Nasal congestion, sneezing, and mild upper airway wheezing',
      'Seasonal allergic rhinitis flare and mild bronchial irritation',
      'Upper respiratory tract catarrhal symptoms for 3 days',
    ],
    icdCode: 'J06.9',
    icdDesc: 'Acute upper respiratory symptom complex',
    monthlyMultipliers: [1.12, 1.04, 0.90, 0.86, 0.90, 1.08, 1.20, 1.26, 1.22, 1.20, 1.24, 1.18],
    baseShare: 0.15,
  },
  {
    category: 'Headache-related Consultations',
    complaints: [
      'Episodic tension-type frontal headache during prolonged screen work',
      'Throbbing unilateral headache with mild photophobia',
      'Heat-triggered cephalalgia and mild orthostatic fatigue',
    ],
    icdCode: 'R51.9',
    icdDesc: 'Headache, unspecified',
    // Slightly higher during hot dry months (Mar-May)
    monthlyMultipliers: [0.95, 0.98, 1.18, 1.26, 1.22, 1.02, 0.94, 0.92, 0.95, 0.98, 0.96, 0.94],
    baseShare: 0.13,
  },
  {
    category: 'Cardiovascular / Hypertension',
    complaints: [
      'Routine blood pressure monitoring and antihypertensive titration',
      'Elevated home BP reading (146/92 mmHg), asymptomatic follow-up',
      'Outpatient cardiovascular risk check and ECG review',
    ],
    icdCode: 'I10',
    icdDesc: 'Essential (primary) hypertension',
    monthlyMultipliers: [1.06, 1.00, 1.04, 1.08, 1.05, 0.98, 0.96, 0.97, 0.99, 1.02, 1.04, 1.10],
    baseShare: 0.14,
  },
  {
    category: 'Metabolic / Endocrine',
    complaints: [
      'Quarterly fasting blood glucose and HbA1c maintenance visit',
      'Type 2 diabetes oral medication review and nutrition counseling',
      'Dyslipidemia lipid panel follow-up',
    ],
    icdCode: 'E11.9',
    icdDesc: 'Type 2 diabetes mellitus without complications',
    monthlyMultipliers: [1.12, 1.04, 1.00, 0.96, 0.98, 0.98, 0.96, 0.98, 1.02, 1.04, 1.02, 1.08],
    baseShare: 0.11,
  },
  {
    category: 'General Outpatient Checkup',
    complaints: [
      'Annual preventive physical examination and fit-to-work clearance',
      'Routine wellness checkup and baseline laboratory screening',
      'School / employment medical clearance assessment',
    ],
    icdCode: 'Z00.00',
    icdDesc: 'Encounter for general adult medical examination',
    monthlyMultipliers: [1.18, 1.10, 1.02, 0.95, 0.96, 1.14, 1.05, 1.08, 1.00, 0.98, 0.94, 0.88],
    baseShare: 0.10,
  },
];

let cachedDataset: {
  appointments: Appointment[];
  consultations: Consultation[];
  metadata: SyntheticDatasetMetadata;
} | null = null;

export function getHistoricalSyntheticDataset(): {
  appointments: Appointment[];
  consultations: Consultation[];
  metadata: SyntheticDatasetMetadata;
} {
  if (cachedDataset) return cachedDataset;

  const rand = createMulberry32(PRNG_SEED);
  const appointments: Appointment[] = [];
  const consultations: Consultation[] = [];

  // Build deterministic synthetic patient cohort (160 fictional individuals)
  const syntheticPatients = Array.from({ length: 160 }, (_, idx) => {
    const firstRaw = FIRST_NAMES[idx % FIRST_NAMES.length];
    const first = firstRaw.charAt(0).toUpperCase() + firstRaw.slice(1);
    const last = LAST_NAMES[Math.floor(idx / FIRST_NAMES.length) % LAST_NAMES.length];
    return {
      id: `syn-pat-${String(idx + 1).padStart(3, '0')}`,
      mrn: `SYN-MRN-${String(idx + 1001)}`,
      fullName: `${first} ${last}`,
    };
  });

  // Overall monthly seasonal index for total clinic demand (1..12)
  const clinicMonthlySeasonality = [
    1.03, // Jan: post-holiday checkups
    0.95, // Feb: shorter month
    0.97, // Mar
    0.94, // Apr: Holy Week / summer lull
    0.98, // May
    1.06, // Jun: school opening & onset of wet season
    1.14, // Jul
    1.17, // Aug
    1.12, // Sep
    1.15, // Oct
    1.19, // Nov: peak wet-season outpatient consultations
    1.02, // Dec: holiday taper late in month
  ];

  let aptSeq = 10000;
  let conSeq = 20000;

  for (let mOffset = 0; mOffset < TOTAL_HISTORICAL_MONTHS; mOffset++) {
    const ym = addMonthsToYearMonth(START_YEAR_MONTH, mOffset);
    const [yearStr, monthStr] = ym.split('-');
    const year = parseInt(yearStr, 10);
    const calMonth = parseInt(monthStr, 10); // 1..12
    const daysInMonth = new Date(year, calMonth, 0).getDate();

    // Base completed visits grows modestly from ~92/mo to ~124/mo across both branches
    const trendBase = 92 + mOffset * 1.08;
    const seasonalFactor = clinicMonthlySeasonality[calMonth - 1];
    const noise = (rand() - 0.5) * 7; // bounded realistic variance
    const targetCompletedTotal = Math.max(55, Math.round(trendBase * seasonalFactor + noise));

    // Additional non-completed appointments: ~11% No Show, ~8% Cancelled, ~4% Rescheduled originals
    const noShowCount = Math.max(4, Math.round(targetCompletedTotal * (0.09 + rand() * 0.03)));
    const cancelledCount = Math.max(3, Math.round(targetCompletedTotal * (0.06 + rand() * 0.03)));
    const rescheduledChainCount = Math.max(2, Math.round(targetCompletedTotal * 0.04));

    // Precompute category probabilities for this calendar month
    const weightedTemplates = CATEGORY_TEMPLATES.map((tpl) => ({
      tpl,
      weight: tpl.baseShare * tpl.monthlyMultipliers[calMonth - 1],
    }));
    const totalWeight = weightedTemplates.reduce((acc, w) => acc + w.weight, 0);

    const pickCategoryTemplate = (): CategoryTemplate => {
      const r = rand() * totalWeight;
      let acc = 0;
      for (const item of weightedTemplates) {
        acc += item.weight;
        if (r <= acc) return item.tpl;
      }
      return weightedTemplates[0].tpl;
    };

    const pickWorkingDay = (): string => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const day = 1 + Math.floor(rand() * daysInMonth);
        const dow = new Date(Date.UTC(year, calMonth - 1, day)).getUTCDay();
        if (dow !== 0) {
          return `${ym}-${String(day).padStart(2, '0')}`;
        }
      }
      return `${ym}-15`;
    };

    // 1. Generate Completed Visits + Matching Consultations
    for (let i = 0; i < targetCompletedTotal; i++) {
      aptSeq++;
      conSeq++;
      const pat = syntheticPatients[Math.floor(rand() * syntheticPatients.length)];
      // ~68% Main Outpatient Clinic, ~32% Annex Satellite Clinic
      const isMainBranch = rand() < 0.68;
      const branchDoctors = DOCTORS_POOL.filter((d) =>
        isMainBranch ? d.branch === 'Main Outpatient Clinic' : d.branch === 'Annex Satellite Clinic'
      );
      const doc = branchDoctors[Math.floor(rand() * branchDoctors.length)] || DOCTORS_POOL[0];
      const dateStr = pickWorkingDay();
      const hour = 8 + Math.floor(rand() * 8);
      const minute = rand() < 0.5 ? '00' : '30';
      const timeStr = `${String(hour).padStart(2, '0')}:${minute}`;
      const isWalkIn = rand() < 0.18; // ~18% walk-in attendance

      const chosenTpl = pickCategoryTemplate();
      const complaint = chosenTpl.complaints[Math.floor(rand() * chosenTpl.complaints.length)];

      // Secondary co-occurring symptom category in ~22% of respiratory/fever visits (e.g. Fever + Cough)
      const categories: SymptomConsultationCategory[] = [chosenTpl.category];
      if (chosenTpl.category === 'Fever-related Consultations' && rand() < 0.24) {
        categories.push('Cough-related Consultations');
      } else if (chosenTpl.category === 'Cough-related Consultations' && rand() < 0.20) {
        categories.push('Respiratory-symptom Consultations');
      }

      // Inject sparse Dermatologic Consultations in only 4 isolated records across 30 months
      if (mOffset % 8 === 3 && i === 0) {
        categories.splice(0, categories.length, 'Dermatologic Consultations');
      }

      let rescheduledFromId: string | undefined;
      if (i < rescheduledChainCount) {
        // Create superseded original rescheduled record so deduplication is exercised
        const origId = `syn-apt-orig-${aptSeq}`;
        rescheduledFromId = origId;
        appointments.push({
          id: origId,
          patientId: pat.id,
          patientName: pat.fullName,
          patientMrn: pat.mrn,
          doctorId: doc.id,
          doctorName: doc.name,
          department: doc.department,
          branch: doc.branch,
          date: dateStr,
          time: '08:30',
          durationMinutes: 30,
          reason: `${complaint} (Rescheduled)`,
          status: 'Cancelled',
          type: 'Consultation',
          isWalkIn: false,
          isSynthetic: true,
          notes: 'Superseded by rescheduled appointment',
          createdAt: `${dateStr}T00:30:00Z`,
        });
      }

      const aptId = `syn-apt-${aptSeq}`;
      appointments.push({
        id: aptId,
        patientId: pat.id,
        patientName: pat.fullName,
        patientMrn: pat.mrn,
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.department,
        branch: doc.branch,
        date: dateStr,
        time: timeStr,
        durationMinutes: 30,
        reason: complaint,
        status: 'Completed',
        type: isWalkIn ? 'Walk-In' : 'Consultation',
        isWalkIn,
        isSynthetic: true,
        rescheduledFromId,
        serviceCategory: doc.department,
        checkInAt: `${dateStr}T${timeStr}:00+08:00`,
        completedAt: `${dateStr}T${String(Math.min(23, hour + 1)).padStart(2, '0')}:${minute}:00+08:00`,
        createdAt: `${dateStr}T00:00:00Z`,
      });

      consultations.push({
        id: `syn-con-${conSeq}`,
        appointmentId: aptId,
        patientId: pat.id,
        patientName: pat.fullName,
        doctorId: doc.id,
        doctorName: doc.name,
        date: dateStr,
        branch: doc.branch,
        chiefComplaint: complaint,
        historyOfPresentIllness: `Synthetic outpatient consultation record (${ym}) for academic forecasting validation.`,
        physicalExamination: 'Outpatient vital signs recorded; stable ambulatory presentation.',
        diagnoses: [
          {
            code: chosenTpl.icdCode,
            description: chosenTpl.icdDesc,
            type: 'Primary',
          },
        ],
        treatmentPlan: 'Outpatient supportive management and follow-up guidance provided.',
        symptomCategories: categories,
        isSynthetic: true,
      });
    }

    // 2. Generate No-Show Appointments (no consultation created)
    for (let n = 0; n < noShowCount; n++) {
      aptSeq++;
      const pat = syntheticPatients[Math.floor(rand() * syntheticPatients.length)];
      const doc = DOCTORS_POOL[Math.floor(rand() * DOCTORS_POOL.length)];
      const dateStr = pickWorkingDay();
      appointments.push({
        id: `syn-apt-${aptSeq}`,
        patientId: pat.id,
        patientName: pat.fullName,
        patientMrn: pat.mrn,
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.department,
        branch: doc.branch,
        date: dateStr,
        time: '10:30',
        durationMinutes: 30,
        reason: 'Scheduled outpatient consultation',
        status: 'No Show',
        type: 'Consultation',
        isWalkIn: false,
        isSynthetic: true,
        noShowMarkedAt: `${dateStr}T11:00:00+08:00`,
        createdAt: `${dateStr}T00:00:00Z`,
      });
    }

    // 3. Generate Cancelled Appointments (excluded from net completed attendance)
    for (let c = 0; c < cancelledCount; c++) {
      aptSeq++;
      const pat = syntheticPatients[Math.floor(rand() * syntheticPatients.length)];
      const doc = DOCTORS_POOL[Math.floor(rand() * DOCTORS_POOL.length)];
      const dateStr = pickWorkingDay();
      appointments.push({
        id: `syn-apt-${aptSeq}`,
        patientId: pat.id,
        patientName: pat.fullName,
        patientMrn: pat.mrn,
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.department,
        branch: doc.branch,
        date: dateStr,
        time: '14:00',
        durationMinutes: 30,
        reason: 'Cancelled outpatient booking',
        status: 'Cancelled',
        type: 'Consultation',
        isWalkIn: false,
        isSynthetic: true,
        createdAt: `${dateStr}T00:00:00Z`,
      });
    }
  }

  const endMonth = addMonthsToYearMonth(START_YEAR_MONTH, TOTAL_HISTORICAL_MONTHS - 1);

  cachedDataset = {
    appointments,
    consultations,
    metadata: {
      seed: PRNG_SEED,
      startMonth: START_YEAR_MONTH,
      endMonth,
      totalMonths: TOTAL_HISTORICAL_MONTHS,
      branches: ['Main Outpatient Clinic', 'Annex Satellite Clinic'],
      syntheticPatientCohortSize: syntheticPatients.length,
      methodologySummary:
        'Deterministic Mulberry32 PRNG (seed 20261029) generating 30 months of outpatient appointments, walk-ins, cancellations, no-shows, and completed consultation symptom records across two clinic branches.',
      disclaimer: SYNTHETIC_DATA_DISCLAIMER,
    },
  };

  return cachedDataset;
}
