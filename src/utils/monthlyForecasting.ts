/**
 * SmartClinic — Explainable Monthly Time-Series Forecasting Engine (Parts 1, 2, 3, 4)
 *
 * Pure TypeScript module (zero DOM/React dependencies) implementing:
 * 1. Monthly outpatient volume aggregation with strict deduplication of cancelled/rescheduled
 *    appointments and separation of Completed Visits, Scheduled Demand, Unique Patients,
 *    No-Shows, and Walk-In Visits.
 * 2. Candidate explainable statistical forecasting methods:
 *    - Naive Last-Observation Baseline (benchmark)
 *    - 3-Month Weighted Moving Average
 *    - Holt Linear Exponential Smoothing
 *    - Seasonal Naive (12-Month Cycle)
 *    - Holt-Winters Additive Trend-Seasonal Exponential Smoothing (12-month cycle)
 * 3. Chronological rolling-origin backtesting (zero future data leakage) computing
 *    real Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and
 *    Weighted Absolute Percentage Error (WAPE) against the Naive baseline.
 * 4. Monthly Health Consultation Trends derived STRICTLY from Consultation records
 *    (never from appointment records alone), with automatic "Insufficient Historical Data"
 *    detection when supporting records are sparse or absent.
 * 5. Independent Clinic Monthly Capacity calculation from configured physician schedules
 *    and active clinical staff.
 */

import type {
  Appointment,
  ClinicBranch,
  Consultation,
  SymptomConsultationCategory,
  User,
} from '../types/clinic';
import {
  addMonthsToYearMonth,
  formatYearMonthLabel,
  getManilaYearMonth,
} from './manilaTime';

export type ForecastBranchFilter = 'ALL' | ClinicBranch;

export type StatisticalModelId =
  | 'naive_baseline'
  | 'moving_average_3m'
  | 'holt_linear'
  | 'seasonal_naive_12m'
  | 'holt_winters_additive';

export const ALL_SYMPTOM_CATEGORIES: SymptomConsultationCategory[] = [
  'Fever-related Consultations',
  'Cough-related Consultations',
  'Respiratory-symptom Consultations',
  'Headache-related Consultations',
  'Cardiovascular / Hypertension',
  'Metabolic / Endocrine',
  'General Outpatient Checkup',
  'Dermatologic Consultations',
];

export interface MonthlyVolumeObservation {
  yearMonth: string; // YYYY-MM
  label: string; // e.g. "Oct 2026"
  completedVisits: number; // Primary measure of actual clinic attendance
  scheduledAppointments: number; // Net non-cancelled scheduled/booked demand
  uniquePatients: number;
  noShows: number;
  cancelled: number;
  walkInVisits: number;
}

export interface MonthlyForecastPoint {
  yearMonth: string;
  label: string;
  horizonStep: number; // 1..H
  predictedCompletedVisits: number;
  predictedAppointmentDemand: number;
  lowerBound: number; // Non-negative 95% empirical lower bound
  upperBound: number; // 95% empirical upper bound
  demandLevel: 'High Demand' | 'Normal Demand' | 'Lower Demand';
}

export interface ModelEvaluationResult {
  modelId: StatisticalModelId;
  modelName: string;
  formulaDescription: string;
  eligible: boolean;
  ineligibleReason?: string;
  backtestOriginsCount: number;
  mae: number;
  rmse: number;
  wape: number; // percentage e.g. 6.4 means 6.4%
  beatsBaseline: boolean;
}

export interface CategoryMonthlyForecast {
  category: SymptomConsultationCategory;
  status: 'ok' | 'insufficient_data';
  statusLabel: string;
  totalHistoricalCount: number;
  nonZeroMonths: number;
  recent3MonthAvg: number;
  projectedNext3MonthAvg: number;
  trendDirection: 'Increasing' | 'Decreasing' | 'Stable' | 'Insufficient Data';
  percentChange: number;
  modelUsed: string;
  mae: number | null;
  wape: number | null;
  historicalSeries: Array<{ yearMonth: string; label: string; count: number }>;
  forecastSeries: Array<{
    yearMonth: string;
    label: string;
    predictedCount: number;
    lowerBound: number;
    upperBound: number;
  }>;
  peakProjectedMonth: { yearMonth: string; label: string; count: number } | null;
  planningExplanation: string;
}

export interface MonthlyCapacityPoint {
  yearMonth: string;
  label: string;
  activeDoctorsCount: number;
  activeSupportStaffCount: number;
  physicianSlotCapacity: number;
  staffAdjustedCapacity: number;
  predictedCompletedVisits: number;
  predictedAppointmentDemand: number;
  utilizationPercent: number;
  capacityStatus: 'Within Capacity' | 'Near Capacity (80%+)' | 'Exceeds Capacity (100%+)';
}

export interface AdministrativeInsight {
  id: string;
  category: 'Staffing' | 'Appointment Slots' | 'Consultation Trends' | 'Capacity Buffer';
  severity: 'info' | 'attention' | 'high';
  title: string;
  detail: string;
}

export interface CompletePredictiveAnalyticsReport {
  generatedAtIso: string;
  branchFilter: ForecastBranchFilter;
  horizonMonths: number;
  status: 'ok' | 'insufficient_data';
  statusLabel: string;
  insufficientReason?: string;
  historicalPeriodStart: string | null;
  historicalPeriodEnd: string | null;
  observationMonthsCount: number;
  selectedModel: ModelEvaluationResult | null;
  baselineModel: ModelEvaluationResult | null;
  candidateEvaluations: ModelEvaluationResult[];
  historicalVolume: MonthlyVolumeObservation[];
  volumeForecast: MonthlyForecastPoint[];
  highDemandMonths: MonthlyForecastPoint[];
  lowerDemandMonths: MonthlyForecastPoint[];
  categoryForecasts: CategoryMonthlyForecast[];
  capacityComparison: MonthlyCapacityPoint[];
  administrativeInsights: AdministrativeInsight[];
  limitations: string[];
}

/**
 * Classifies consultation categories STRICTLY from a Consultation record's explicit
 * `symptomCategories`, `chiefComplaint`, and ICD-10 `diagnoses`.
 * NEVER reads Appointment data alone.
 */
export function extractCategoriesFromConsultation(
  con: Consultation
): SymptomConsultationCategory[] {
  if (Array.isArray(con.symptomCategories) && con.symptomCategories.length > 0) {
    return Array.from(new Set(con.symptomCategories));
  }

  const text = `${con.chiefComplaint || ''} ${(con.diagnoses || [])
    .map((d) => `${d.code} ${d.description}`)
    .join(' ')}`.toLowerCase();

  const matched = new Set<SymptomConsultationCategory>();

  if (/\b(fever|febrile|pyrexia|r50)\b/.test(text)) {
    matched.add('Fever-related Consultations');
  }
  if (/\b(cough|r05)\b/.test(text)) {
    matched.add('Cough-related Consultations');
  }
  if (/\b(respirat|asthma|wheez|rhinitis|bronch|dyspnea|j06|j45|j20)\b/.test(text)) {
    matched.add('Respiratory-symptom Consultations');
  }
  if (/\b(headache|migraine|cephalalgia|photophobia|r51|g43)\b/.test(text)) {
    matched.add('Headache-related Consultations');
  }
  if (/\b(hypertens|blood pressure|cardiac|atrial|angina|chest|i10|i48)\b/.test(text)) {
    matched.add('Cardiovascular / Hypertension');
  }
  if (/\b(diabet|glycem|hba1c|glucose|dyslipidemia|thyroid|metabolic|e11|e78)\b/.test(text)) {
    matched.add('Metabolic / Endocrine');
  }
  if (/\b(rash|dermatit|eczema|pruritus|skin|l20|l30)\b/.test(text)) {
    matched.add('Dermatologic Consultations');
  }
  if (matched.size === 0 && text.trim().length > 0) {
    matched.add('General Outpatient Checkup');
  }

  return Array.from(matched);
}

/**
 * Aggregates historical appointments into continuous monthly buckets up to `maxHistoricalYearMonth`,
 * deduplicating superseded rescheduled records and avoiding double-counting cancelled bookings.
 */
export function aggregateMonthlyVolume(params: {
  appointments: Appointment[];
  branchFilter?: ForecastBranchFilter;
  maxHistoricalYearMonth?: string;
}): MonthlyVolumeObservation[] {
  const branchFilter = params.branchFilter ?? 'ALL';
  const maxYM = params.maxHistoricalYearMonth;

  // Identify IDs that were superseded by a later rescheduled appointment so we never double-count
  const supersededIds = new Set<string>();
  for (const apt of params.appointments) {
    if (apt.rescheduledFromId) {
      supersededIds.add(apt.rescheduledFromId);
    }
  }

  // Deduplicate identical appointment IDs
  const uniqueAptsMap = new Map<string, Appointment>();
  for (const apt of params.appointments) {
    if (!apt || !apt.id || !apt.date) continue;
    uniqueAptsMap.set(apt.id, apt);
  }

  const bucketMap = new Map<
    string,
    {
      completedVisits: number;
      scheduledAppointments: number;
      uniquePatientSet: Set<string>;
      noShows: number;
      cancelled: number;
      walkInVisits: number;
    }
  >();

  let minYM: string | null = null;
  let latestObservedYM: string | null = null;

  for (const apt of uniqueAptsMap.values()) {
    const aptBranch: ClinicBranch = apt.branch || 'Main Outpatient Clinic';
    if (branchFilter !== 'ALL' && aptBranch !== branchFilter) continue;

    // Primary visit date: completedAt if available for completed visits, else scheduled date
    const refDateStr =
      apt.status === 'Completed' && apt.completedAt ? apt.completedAt : apt.date;
    const ym = getManilaYearMonth(refDateStr);

    // Strictly prevent future months beyond the cutoff from entering historical series
    if (maxYM && ym > maxYM) continue;

    if (!minYM || ym < minYM) minYM = ym;
    if (!latestObservedYM || ym > latestObservedYM) latestObservedYM = ym;

    if (!bucketMap.has(ym)) {
      bucketMap.set(ym, {
        completedVisits: 0,
        scheduledAppointments: 0,
        uniquePatientSet: new Set<string>(),
        noShows: 0,
        cancelled: 0,
        walkInVisits: 0,
      });
    }
    const bucket = bucketMap.get(ym)!;

    // Skip superseded rescheduled originals entirely so rescheduled appointments are counted once
    if (supersededIds.has(apt.id)) {
      continue;
    }

    if (apt.status === 'Cancelled') {
      bucket.cancelled += 1;
      continue;
    }

    // Net active/completed/no-show demand
    bucket.scheduledAppointments += 1;

    if (apt.status === 'No Show') {
      bucket.noShows += 1;
    } else if (apt.status === 'Completed') {
      bucket.completedVisits += 1;
      if (apt.patientId && apt.patientId !== 'REDACTED') {
        bucket.uniquePatientSet.add(apt.patientId);
      }
      if (apt.isWalkIn || apt.type === 'Walk-In') {
        bucket.walkInVisits += 1;
      }
    }
  }

  if (!minYM || !latestObservedYM) return [];

  const endYM = maxYM && maxYM < latestObservedYM ? maxYM : latestObservedYM;
  const result: MonthlyVolumeObservation[] = [];

  let cursor = minYM;
  let guard = 0;
  while (cursor <= endYM && guard < 240) {
    const b = bucketMap.get(cursor);
    result.push({
      yearMonth: cursor,
      label: formatYearMonthLabel(cursor, 'short'),
      completedVisits: b ? b.completedVisits : 0,
      scheduledAppointments: b ? b.scheduledAppointments : 0,
      uniquePatients: b ? b.uniquePatientSet.size : 0,
      noShows: b ? b.noShows : 0,
      cancelled: b ? b.cancelled : 0,
      walkInVisits: b ? b.walkInVisits : 0,
    });
    cursor = addMonthsToYearMonth(cursor, 1);
    guard++;
  }

  return result;
}

// ============================================================================
// PURE STATISTICAL TIME-SERIES FORECASTERS (ZERO FUTURE LEAKAGE)
// ============================================================================

export function forecastNaiveBaseline(series: number[], horizon: number): number[] {
  if (series.length === 0) return Array(horizon).fill(0);
  const last = Math.max(0, series[series.length - 1]);
  return Array(horizon).fill(last);
}

export function forecastMovingAverage3M(series: number[], horizon: number): number[] {
  if (series.length === 0) return Array(horizon).fill(0);
  const working = [...series];
  const preds: number[] = [];
  for (let h = 0; h < horizon; h++) {
    const n = working.length;
    let nextVal: number;
    if (n >= 3) {
      nextVal = 0.5 * working[n - 1] + 0.3 * working[n - 2] + 0.2 * working[n - 3];
    } else if (n === 2) {
      nextVal = 0.6 * working[n - 1] + 0.4 * working[n - 2];
    } else {
      nextVal = working[n - 1];
    }
    nextVal = Math.max(0, nextVal);
    preds.push(nextVal);
    working.push(nextVal);
  }
  return preds;
}

export function forecastHoltLinear(
  series: number[],
  horizon: number,
  alpha = 0.45,
  beta = 0.15
): number[] {
  const n = series.length;
  if (n === 0) return Array(horizon).fill(0);
  if (n === 1) return Array(horizon).fill(Math.max(0, series[0]));

  let level = series[0];
  let trend = (series[Math.min(n - 1, 3)] - series[0]) / Math.min(n - 1, 3);

  for (let t = 1; t < n; t++) {
    const prevLevel = level;
    level = alpha * series[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Dampen long-horizon trend slightly (phi = 0.9) for realistic administrative projections
  const phi = 0.9;
  const preds: number[] = [];
  let dampedSum = 0;
  for (let h = 1; h <= horizon; h++) {
    dampedSum += Math.pow(phi, h);
    preds.push(Math.max(0, level + dampedSum * trend));
  }
  return preds;
}

export function forecastSeasonalNaive12M(series: number[], horizon: number): number[] {
  const n = series.length;
  const seasonLen = 12;
  if (n < seasonLen) return forecastMovingAverage3M(series, horizon);

  // Estimate gentle year-over-year drift ONLY from available historical series
  let yoyDiffSum = 0;
  let yoyCount = 0;
  for (let t = seasonLen; t < n; t++) {
    yoyDiffSum += series[t] - series[t - seasonLen];
    yoyCount++;
  }
  const avgAnnualDrift = yoyCount > 0 ? (yoyDiffSum / yoyCount) * 0.5 : 0;

  const preds: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const targetIdx = n + h - 1;
    let refIdx = targetIdx - seasonLen;
    while (refIdx >= n) refIdx -= seasonLen;
    const baseVal = refIdx >= 0 ? series[refIdx] : series[n - 1];
    preds.push(Math.max(0, baseVal + avgAnnualDrift));
  }
  return preds;
}

export function forecastHoltWintersAdditive(
  series: number[],
  horizon: number,
  alpha = 0.35,
  beta = 0.08,
  gamma = 0.35
): number[] {
  const seasonLen = 12;
  const n = series.length;
  if (n < seasonLen * 2) {
    return forecastSeasonalNaive12M(series, horizon);
  }

  // Initialize level, trend, and additive seasonal indices from first two complete cycles ONLY
  const firstYearMean =
    series.slice(0, seasonLen).reduce((s, v) => s + v, 0) / seasonLen;
  const secondYearMean =
    series.slice(seasonLen, seasonLen * 2).reduce((s, v) => s + v, 0) / seasonLen;

  let level = firstYearMean;
  let trend = (secondYearMean - firstYearMean) / seasonLen;
  const seasonals = new Array<number>(seasonLen).fill(0);

  for (let i = 0; i < seasonLen; i++) {
    const s1 = series[i] - firstYearMean;
    const s2 = series[i + seasonLen] - secondYearMean;
    seasonals[i] = (s1 + s2) / 2;
  }

  // Filter forward chronologically through [0 .. n-1]
  for (let t = 0; t < n; t++) {
    const sIdx = t % seasonLen;
    const obs = series[t];
    if (t === 0) continue;
    const prevLevel = level;
    const prevSeasonal = seasonals[sIdx];
    level = alpha * (obs - prevSeasonal) + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonals[sIdx] = gamma * (obs - level) + (1 - gamma) * prevSeasonal;
  }

  const preds: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const sIdx = (n + h - 1) % seasonLen;
    const raw = level + h * trend + seasonals[sIdx];
    preds.push(Math.max(0, raw));
  }
  return preds;
}

export function runModelById(
  modelId: StatisticalModelId,
  trainSeries: number[],
  horizon: number
): number[] {
  switch (modelId) {
    case 'naive_baseline':
      return forecastNaiveBaseline(trainSeries, horizon);
    case 'moving_average_3m':
      return forecastMovingAverage3M(trainSeries, horizon);
    case 'holt_linear':
      return forecastHoltLinear(trainSeries, horizon);
    case 'seasonal_naive_12m':
      return forecastSeasonalNaive12M(trainSeries, horizon);
    case 'holt_winters_additive':
      return forecastHoltWintersAdditive(trainSeries, horizon);
  }
}

const MODEL_METADATA: Record<
  StatisticalModelId,
  { name: string; minMonths: number; formula: string }
> = {
  naive_baseline: {
    name: 'Naive Last-Observation (Baseline)',
    minMonths: 3,
    formula: 'ŷ(t+h) = y(t) — benchmark reference baseline',
  },
  moving_average_3m: {
    name: 'Weighted Moving Average (3-Month)',
    minMonths: 6,
    formula: 'ŷ(t+1) = 0.5·y(t) + 0.3·y(t−1) + 0.2·y(t−2)',
  },
  holt_linear: {
    name: 'Holt Damped Linear Trend Smoothing',
    minMonths: 8,
    formula: 'ŷ(t+h) = L(t) + Σ φ^i·B(t), α=0.45, β=0.15, φ=0.90',
  },
  seasonal_naive_12m: {
    name: 'Seasonal Naive with Drift (12-Month Cycle)',
    minMonths: 18,
    formula: 'ŷ(t+h) = y(t+h−12) + 0.5·Δ_YoY',
  },
  holt_winters_additive: {
    name: 'Holt-Winters Additive Trend-Seasonal (12-Month)',
    minMonths: 25,
    formula: 'ŷ(t+h) = L(t) + h·B(t) + S(t+h−12), α=0.35, β=0.08, γ=0.35',
  },
};

/**
 * Evaluates candidate statistical models via strict chronological rolling-origin backtesting.
 * At each backtest origin `k`, ONLY `series.slice(0, k)` is passed to the model.
 * Future observations `series[k..]` are never exposed during training.
 */
export function evaluateModelsChronologically(
  series: number[],
  backtestHorizon = 3
): {
  evaluations: ModelEvaluationResult[];
  selectedModel: ModelEvaluationResult | null;
  baselineModel: ModelEvaluationResult | null;
} {
  const n = series.length;
  const candidateIds: StatisticalModelId[] = [
    'naive_baseline',
    'moving_average_3m',
    'holt_linear',
    'seasonal_naive_12m',
    'holt_winters_additive',
  ];

  const evaluations: ModelEvaluationResult[] = [];

  for (const modelId of candidateIds) {
    const meta = MODEL_METADATA[modelId];
    // Need enough initial history before the first rolling origin
    const minTrainWindow = Math.max(3, meta.minMonths - 4);
    if (n < meta.minMonths) {
      evaluations.push({
        modelId,
        modelName: meta.name,
        formulaDescription: meta.formula,
        eligible: false,
        ineligibleReason: `Requires at least ${meta.minMonths} historical months (currently ${n}).`,
        backtestOriginsCount: 0,
        mae: 0,
        rmse: 0,
        wape: 0,
        beatsBaseline: false,
      });
      continue;
    }

    // Use up to the last 6 rolling origins so every model is evaluated on the SAME chronological holdout window
    const evalWindowSize = Math.min(6, Math.max(2, Math.floor(n * 0.2)));
    const firstOrigin = Math.max(minTrainWindow, n - evalWindowSize);

    const absErrors: number[] = [];
    const sqErrors: number[] = [];
    let actualSum = 0;
    let originsCount = 0;

    for (let origin = firstOrigin; origin < n; origin++) {
      // STRICT NO-LEAKAGE SLICE: only indices [0 .. origin - 1]
      const trainSlice = series.slice(0, origin);
      const steps = Math.min(backtestHorizon, n - origin);
      const preds = runModelById(modelId, trainSlice, steps);

      originsCount++;
      for (let s = 0; s < steps; s++) {
        const actual = series[origin + s];
        const predicted = preds[s];
        const err = Math.abs(actual - predicted);
        absErrors.push(err);
        sqErrors.push(err * err);
        actualSum += Math.abs(actual);
      }
    }

    const count = absErrors.length || 1;
    const mae = Number((absErrors.reduce((a, b) => a + b, 0) / count).toFixed(2));
    const rmse = Number(Math.sqrt(sqErrors.reduce((a, b) => a + b, 0) / count).toFixed(2));
    const wape =
      actualSum > 0
        ? Number(((absErrors.reduce((a, b) => a + b, 0) / actualSum) * 100).toFixed(2))
        : 0;

    evaluations.push({
      modelId,
      modelName: meta.name,
      formulaDescription: meta.formula,
      eligible: true,
      backtestOriginsCount: originsCount,
      mae,
      rmse,
      wape,
      beatsBaseline: false,
    });
  }

  const baselineModel = evaluations.find((e) => e.modelId === 'naive_baseline' && e.eligible) || null;
  if (baselineModel) {
    for (const ev of evaluations) {
      if (ev.eligible && ev.modelId !== 'naive_baseline') {
        ev.beatsBaseline = ev.wape <= baselineModel.wape || ev.mae <= baselineModel.mae;
      }
    }
  }

  // Select non-baseline eligible model with lowest WAPE (tie-break by MAE); fallback to baseline if needed
  const nonBaselineEligible = evaluations
    .filter((e) => e.eligible && e.modelId !== 'naive_baseline')
    .sort((a, b) => (a.wape !== b.wape ? a.wape - b.wape : a.mae - b.mae));

  let selectedModel = nonBaselineEligible[0] || baselineModel;
  // If baseline genuinely outperforms all other candidates on a very flat/noisy short series, be transparent
  if (
    baselineModel &&
    selectedModel &&
    baselineModel.wape + 0.5 < selectedModel.wape &&
    n < 12
  ) {
    selectedModel = baselineModel;
  }

  return { evaluations, selectedModel, baselineModel };
}

/**
 * Generates Monthly Health Consultation Trends STRICTLY from Consultation records.
 * Never infers symptom categories from Appointment records alone.
 */
export function forecastConsultationCategories(params: {
  consultations: Consultation[];
  branchFilter: ForecastBranchFilter;
  historicalMonths: string[]; // ordered YYYY-MM list
  horizonMonths: number;
}): CategoryMonthlyForecast[] {
  const { consultations, branchFilter, historicalMonths, horizonMonths } = params;

  if (historicalMonths.length === 0) return [];

  const minYM = historicalMonths[0];
  const maxYM = historicalMonths[historicalMonths.length - 1];

  // Deduplicate consultation IDs
  const uniqueConsultations = new Map<string, Consultation>();
  for (const c of consultations) {
    if (!c || !c.id || !c.date) continue;
    uniqueConsultations.set(c.id, c);
  }

  // Count per category per YYYY-MM
  const categoryMonthCounts = new Map<SymptomConsultationCategory, Map<string, number>>();
  for (const cat of ALL_SYMPTOM_CATEGORIES) {
    categoryMonthCounts.set(cat, new Map<string, number>());
  }

  for (const con of uniqueConsultations.values()) {
    const conBranch: ClinicBranch = con.branch || 'Main Outpatient Clinic';
    if (branchFilter !== 'ALL' && conBranch !== branchFilter) continue;

    const ym = getManilaYearMonth(con.date);
    if (ym < minYM || ym > maxYM) continue;

    const cats = extractCategoriesFromConsultation(con);
    for (const cat of cats) {
      const mMap = categoryMonthCounts.get(cat);
      if (mMap) {
        mMap.set(ym, (mMap.get(ym) || 0) + 1);
      }
    }
  }

  const results: CategoryMonthlyForecast[] = [];

  for (const category of ALL_SYMPTOM_CATEGORIES) {
    const mMap = categoryMonthCounts.get(category)!;
    const series = historicalMonths.map((ym) => mMap.get(ym) || 0);
    const totalHistoricalCount = series.reduce((a, b) => a + b, 0);
    const nonZeroMonths = series.filter((v) => v > 0).length;

    const historicalSeries = historicalMonths.map((ym, idx) => ({
      yearMonth: ym,
      label: formatYearMonthLabel(ym, 'short'),
      count: series[idx],
    }));

    // Require sufficient supporting historical consultation records (at least 12 active months & >= 24 records)
    if (historicalMonths.length < 12 || nonZeroMonths < 10 || totalHistoricalCount < 24) {
      results.push({
        category,
        status: 'insufficient_data',
        statusLabel: 'Insufficient Historical Data',
        totalHistoricalCount,
        nonZeroMonths,
        recent3MonthAvg: 0,
        projectedNext3MonthAvg: 0,
        trendDirection: 'Insufficient Data',
        percentChange: 0,
        modelUsed: 'Disabled (Insufficient Category Observations)',
        mae: null,
        wape: null,
        historicalSeries,
        forecastSeries: [],
        peakProjectedMonth: null,
        planningExplanation: `Category-level forecasting is disabled for ${category} because only ${totalHistoricalCount} recorded consultation${totalHistoricalCount === 1 ? '' : 's'} across ${nonZeroMonths} month${nonZeroMonths === 1 ? '' : 's'} exist in the selected historical dataset (minimum 24 consultations across 10+ months required).`,
      });
      continue;
    }

    const { selectedModel } = evaluateModelsChronologically(series, Math.min(3, horizonMonths));
    const chosenId = selectedModel?.modelId || 'moving_average_3m';
    const rawForecast = runModelById(chosenId, series, horizonMonths);
    const residualRmse = selectedModel?.rmse || 2;

    const forecastSeries = rawForecast.map((val, idx) => {
      const targetYM = addMonthsToYearMonth(maxYM, idx + 1);
      const rounded = Math.max(0, Math.round(val));
      const margin = Math.ceil(1.96 * residualRmse * Math.sqrt(1 + 0.15 * idx));
      return {
        yearMonth: targetYM,
        label: formatYearMonthLabel(targetYM, 'short'),
        predictedCount: rounded,
        lowerBound: Math.max(0, rounded - margin),
        upperBound: rounded + margin,
      };
    });

    const recentSlice = series.slice(-3);
    const recent3MonthAvg = Number(
      (recentSlice.reduce((a, b) => a + b, 0) / Math.max(1, recentSlice.length)).toFixed(1)
    );
    const next3Slice = forecastSeries.slice(0, 3).map((f) => f.predictedCount);
    const projectedNext3MonthAvg = Number(
      (next3Slice.reduce((a, b) => a + b, 0) / Math.max(1, next3Slice.length)).toFixed(1)
    );

    const rawPct =
      recent3MonthAvg > 0
        ? ((projectedNext3MonthAvg - recent3MonthAvg) / recent3MonthAvg) * 100
        : 0;
    const percentChange = Number(rawPct.toFixed(1));

    let trendDirection: CategoryMonthlyForecast['trendDirection'] = 'Stable';
    if (percentChange >= 8) trendDirection = 'Increasing';
    else if (percentChange <= -8) trendDirection = 'Decreasing';

    const peakPoint = [...forecastSeries].sort((a, b) => b.predictedCount - a.predictedCount)[0] || null;
    const peakProjectedMonth = peakPoint
      ? {
          yearMonth: peakPoint.yearMonth,
          label: formatYearMonthLabel(peakPoint.yearMonth, 'long'),
          count: peakPoint.predictedCount,
        }
      : null;

    let planningExplanation = '';
    if (trendDirection === 'Increasing' && peakProjectedMonth) {
      planningExplanation = `${category} are projected to increase by ${Math.abs(percentChange)}% over the upcoming forecast window (peaking around ${peakProjectedMonth.label} with ~${peakProjectedMonth.count} expected outpatient consultations) based on historical clinic consultation records. Administrative note: supports outpatient slot and supply readiness only—not a clinical diagnosis or community outbreak prediction.`;
    } else if (trendDirection === 'Decreasing' && peakProjectedMonth) {
      planningExplanation = `${category} are projected to moderate by ${Math.abs(percentChange)}% compared with the recent 3-month average (${recent3MonthAvg}/mo → ${projectedNext3MonthAvg}/mo) based on historical consultation seasonality.`;
    } else {
      planningExplanation = `${category} are projected to remain relatively steady (~${projectedNext3MonthAvg} consultations/month vs recent ${recent3MonthAvg}/month) based on recorded outpatient history.`;
    }

    results.push({
      category,
      status: 'ok',
      statusLabel: 'Forecast Active',
      totalHistoricalCount,
      nonZeroMonths,
      recent3MonthAvg,
      projectedNext3MonthAvg,
      trendDirection,
      percentChange,
      modelUsed: selectedModel?.modelName || 'Weighted Moving Average (3-Month)',
      mae: selectedModel?.mae ?? null,
      wape: selectedModel?.wape ?? null,
      historicalSeries,
      forecastSeries,
      peakProjectedMonth,
      planningExplanation,
    });
  }

  // Sort active categories by projected volume descending, keeping insufficient_data visible at the bottom
  return results.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ok' ? -1 : 1;
    return b.projectedNext3MonthAvg - a.projectedNext3MonthAvg;
  });
}

/**
 * Computes monthly clinic capacity independently from active physicians' configured weekly schedules
 * (`workDays`, `startHour`, `endHour`, 30-min consultation slots) and active clinical support staff.
 */
export function computeMonthlyClinicCapacity(params: {
  users: User[];
  branchFilter: ForecastBranchFilter;
  volumeForecast: MonthlyForecastPoint[];
  slotDurationMinutes?: number;
}): MonthlyCapacityPoint[] {
  const slotDuration = params.slotDurationMinutes ?? 30;
  // Reasonable outpatient administrative throughput factor (accounts for documentation/turnover between slots)
  const effectiveUtilizationAllowance = 0.42;

  const activeDoctors = params.users.filter(
    (u) => u.role === 'doctor' && u.status !== 'Inactive' && u.status !== 'On Leave'
  );
  const activeSupportStaff = params.users.filter(
    (u) =>
      ['nurse', 'receptionist', 'pharmacist', 'lab_technician'].includes(u.role) &&
      u.status !== 'Inactive' &&
      u.status !== 'On Leave'
  );

  // Branch allocation of configured physicians (matches clinic roster distribution)
  const branchDoctors =
    params.branchFilter === 'ALL'
      ? activeDoctors
      : params.branchFilter === 'Main Outpatient Clinic'
      ? activeDoctors.filter((_, idx) => idx % 3 !== 2)
      : activeDoctors.filter((_, idx) => idx % 3 === 2);

  const effectiveDocs = branchDoctors.length > 0 ? branchDoctors : activeDoctors.slice(0, 1);

  return params.volumeForecast.map((fp) => {
    const [yStr, mStr] = fp.yearMonth.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10); // 1..12
    const daysInMonth = new Date(year, month, 0).getDate();

    let rawMonthlySlots = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun..6=Sat
      for (const doc of effectiveDocs) {
        const workDays =
          Array.isArray(doc.workDays) && doc.workDays.length > 0
            ? doc.workDays
            : [1, 2, 3, 4, 5];
        if (!workDays.includes(dow)) continue;
        const startH = typeof doc.startHour === 'number' ? doc.startHour : 9;
        const endH = typeof doc.endHour === 'number' ? doc.endHour : 15;
        const netHours = Math.max(1, endH - startH - (startH < 12 && endH > 13 ? 1 : 0));
        rawMonthlySlots += Math.floor((netHours * 60) / slotDuration);
      }
    }

    const physicianSlotCapacity = Math.max(
      20,
      Math.round(rawMonthlySlots * effectiveUtilizationAllowance)
    );

    // Support staff throughput cap (each active nurse/receptionist supports ~110 outpatient encounters/month)
    const supportCount =
      params.branchFilter === 'ALL'
        ? Math.max(1, activeSupportStaff.length)
        : Math.max(1, Math.ceil(activeSupportStaff.length * (params.branchFilter === 'Main Outpatient Clinic' ? 0.65 : 0.35)));
    const staffCeiling = supportCount * 110;
    const staffAdjustedCapacity = Math.min(physicianSlotCapacity, Math.max(40, staffCeiling));

    const utilizationPercent = Number(
      ((fp.predictedAppointmentDemand / Math.max(1, staffAdjustedCapacity)) * 100).toFixed(1)
    );

    let capacityStatus: MonthlyCapacityPoint['capacityStatus'] = 'Within Capacity';
    if (utilizationPercent >= 100) capacityStatus = 'Exceeds Capacity (100%+)';
    else if (utilizationPercent >= 80) capacityStatus = 'Near Capacity (80%+)';

    return {
      yearMonth: fp.yearMonth,
      label: fp.label,
      activeDoctorsCount: effectiveDocs.length,
      activeSupportStaffCount: supportCount,
      physicianSlotCapacity,
      staffAdjustedCapacity,
      predictedCompletedVisits: fp.predictedCompletedVisits,
      predictedAppointmentDemand: fp.predictedAppointmentDemand,
      utilizationPercent,
      capacityStatus,
    };
  });
}

/**
 * Generates the complete Predictive Analytics report (Sections A, B, C, D, E).
 */
export function generatePredictiveAnalyticsReport(params: {
  appointments: Appointment[];
  consultations: Consultation[];
  users: User[];
  branchFilter?: ForecastBranchFilter;
  horizonMonths?: number;
  maxHistoricalYearMonth?: string;
}): CompletePredictiveAnalyticsReport {
  const branchFilter = params.branchFilter ?? 'ALL';
  const horizonMonths = Math.max(3, Math.min(6, params.horizonMonths ?? 6));
  const generatedAtIso = new Date().toISOString();

  const historicalVolume = aggregateMonthlyVolume({
    appointments: params.appointments,
    branchFilter,
    maxHistoricalYearMonth: params.maxHistoricalYearMonth,
  });

  const completedSeries = historicalVolume.map((h) => h.completedVisits);
  const demandSeries = historicalVolume.map((h) => h.scheduledAppointments);
  const totalCompleted = completedSeries.reduce((a, b) => a + b, 0);

  const baseLimitations = [
    'Prototype Forecast: Computed from synthetic outpatient records for academic capstone evaluation; not validated on real patient populations.',
    'Consultation symptom categories reflect recorded outpatient chief complaints and ICD-10 visit coding—not confirmed epidemiological surveillance or clinical diagnosis.',
    'Forecasts assume continuity of current clinic operating hours and physician roster without external public health shocks.',
  ];

  // Insufficient historical data guard (< 6 monthly observations or < 15 total completed visits)
  if (historicalVolume.length < 6 || totalCompleted < 15) {
    return {
      generatedAtIso,
      branchFilter,
      horizonMonths,
      status: 'insufficient_data',
      statusLabel: 'Insufficient Historical Data',
      insufficientReason: `At least 6 complete historical months and 15 completed visits are required to compute a reliable statistical forecast (found ${historicalVolume.length} month${historicalVolume.length === 1 ? '' : 's'} and ${totalCompleted} completed visit${totalCompleted === 1 ? '' : 's'}).`,
      historicalPeriodStart: historicalVolume[0]?.yearMonth ?? null,
      historicalPeriodEnd: historicalVolume[historicalVolume.length - 1]?.yearMonth ?? null,
      observationMonthsCount: historicalVolume.length,
      selectedModel: null,
      baselineModel: null,
      candidateEvaluations: [],
      historicalVolume,
      volumeForecast: [],
      highDemandMonths: [],
      lowerDemandMonths: [],
      categoryForecasts: [],
      capacityComparison: [],
      administrativeInsights: [
        {
          id: 'insuff-data',
          category: 'Appointment Slots',
          severity: 'attention',
          title: 'Insufficient Historical Data for Monthly Forecasting',
          detail:
            'Accumulate at least 6 months of completed outpatient visit and consultation records before relying on automated monthly demand projections.',
        },
      ],
      limitations: baseLimitations,
    };
  }

  const { evaluations, selectedModel, baselineModel } = evaluateModelsChronologically(
    completedSeries,
    Math.min(3, horizonMonths)
  );

  const chosenId = selectedModel?.modelId || 'moving_average_3m';
  const rawCompletedForecast = runModelById(chosenId, completedSeries, horizonMonths);
  const rawDemandForecast = runModelById(chosenId, demandSeries, horizonMonths);

  const lastHistoricalYM = historicalVolume[historicalVolume.length - 1].yearMonth;
  const residualRmse = selectedModel?.rmse || 5;
  const historicalMean =
    completedSeries.reduce((a, b) => a + b, 0) / Math.max(1, completedSeries.length);

  const volumeForecast: MonthlyForecastPoint[] = rawCompletedForecast.map((val, idx) => {
    const ym = addMonthsToYearMonth(lastHistoricalYM, idx + 1);
    const predictedCompletedVisits = Math.max(0, Math.round(val));
    const predictedAppointmentDemand = Math.max(
      predictedCompletedVisits,
      Math.round(rawDemandForecast[idx] ?? val * 1.1)
    );
    const halfWidth = Math.ceil(1.96 * residualRmse * Math.sqrt(1 + 0.15 * idx));

    let demandLevel: MonthlyForecastPoint['demandLevel'] = 'Normal Demand';
    if (predictedCompletedVisits >= historicalMean * 1.08) {
      demandLevel = 'High Demand';
    } else if (predictedCompletedVisits <= historicalMean * 0.92) {
      demandLevel = 'Lower Demand';
    }

    return {
      yearMonth: ym,
      label: formatYearMonthLabel(ym, 'short'),
      horizonStep: idx + 1,
      predictedCompletedVisits,
      predictedAppointmentDemand,
      lowerBound: Math.max(0, predictedCompletedVisits - halfWidth),
      upperBound: predictedCompletedVisits + halfWidth,
      demandLevel,
    };
  });

  const sortedByDemand = [...volumeForecast].sort(
    (a, b) => b.predictedCompletedVisits - a.predictedCompletedVisits
  );
  const highDemandMonths = sortedByDemand.filter((m) => m.demandLevel === 'High Demand');
  const lowerDemandMonths = [...volumeForecast]
    .filter((m) => m.demandLevel === 'Lower Demand')
    .sort((a, b) => a.predictedCompletedVisits - b.predictedCompletedVisits);

  const categoryForecasts = forecastConsultationCategories({
    consultations: params.consultations,
    branchFilter,
    historicalMonths: historicalVolume.map((h) => h.yearMonth),
    horizonMonths,
  });

  const capacityComparison = computeMonthlyClinicCapacity({
    users: params.users,
    branchFilter,
    volumeForecast,
  });

  // Build objective Administrative Planning Insights
  const administrativeInsights: AdministrativeInsight[] = [];

  const peakMonth = sortedByDemand[0];
  if (peakMonth) {
    administrativeInsights.push({
      id: 'peak-volume-month',
      category: 'Appointment Slots',
      severity: peakMonth.demandLevel === 'High Demand' ? 'high' : 'info',
      title: `Highest Projected Attendance: ${formatYearMonthLabel(peakMonth.yearMonth, 'long')} (${peakMonth.predictedCompletedVisits} visits)`,
      detail: `Expected completed attendance ranges between ${peakMonth.lowerBound} and ${peakMonth.upperBound} visits (total appointment demand ~${peakMonth.predictedAppointmentDemand}). Consider keeping full reception and nursing check-in coverage during ${formatYearMonthLabel(peakMonth.yearMonth, 'long')}.`,
    });
  }

  const risingCategories = categoryForecasts.filter(
    (c) => c.status === 'ok' && c.trendDirection === 'Increasing'
  );
  if (risingCategories.length > 0) {
    const topRising = risingCategories[0];
    administrativeInsights.push({
      id: 'rising-category',
      category: 'Consultation Trends',
      severity: 'attention',
      title: `Upward Consultation Trend: ${topRising.category} (+${topRising.percentChange}%)`,
      detail: topRising.planningExplanation,
    });
  }

  const strainedMonths = capacityComparison.filter(
    (c) => c.utilizationPercent >= 80
  );
  if (strainedMonths.length > 0) {
    const highestCap = [...strainedMonths].sort(
      (a, b) => b.utilizationPercent - a.utilizationPercent
    )[0];
    administrativeInsights.push({
      id: 'capacity-alert',
      category: 'Capacity Buffer',
      severity: highestCap.utilizationPercent >= 100 ? 'high' : 'attention',
      title: `Capacity Utilization ${highestCap.utilizationPercent}% in ${highestCap.label}`,
      detail: `Projected appointment demand (${highestCap.predictedAppointmentDemand}) reaches ${highestCap.utilizationPercent}% of configured monthly clinic capacity (${highestCap.staffAdjustedCapacity} slots across ${highestCap.activeDoctorsCount} active physicians). Reserve dedicated online slots so walk-ins do not displace booked patients.`,
    });
  } else if (capacityComparison[0]) {
    const avgUtil = Number(
      (
        capacityComparison.reduce((s, c) => s + c.utilizationPercent, 0) /
        capacityComparison.length
      ).toFixed(1)
    );
    administrativeInsights.push({
      id: 'capacity-healthy',
      category: 'Staffing',
      severity: 'info',
      title: `Balanced Clinic Capacity Utilization (Avg ${avgUtil}%)`,
      detail: `Configured physician schedules (${capacityComparison[0].staffAdjustedCapacity} monthly slots) provide adequate buffer for both online appointments and walk-in registrations over the next ${horizonMonths} months.`,
    });
  }

  // Walk-in & No-show operational buffer note
  const recent6 = historicalVolume.slice(-6);
  const recentNoShows = recent6.reduce((s, m) => s + m.noShows, 0);
  const recentScheduled = recent6.reduce((s, m) => s + m.scheduledAppointments, 0);
  const noShowRate =
    recentScheduled > 0 ? Number(((recentNoShows / recentScheduled) * 100).toFixed(1)) : 0;
  administrativeInsights.push({
    id: 'noshow-walkin-planning',
    category: 'Staffing',
    severity: noShowRate >= 12 ? 'attention' : 'info',
    title: `Recent 6-Month No-Show Rate: ${noShowRate}%`,
    detail: `Enforcing the 20-minute check-in grace period allows reception staff to release unclaimed slots safely to walk-in patients without displacing confirmed online bookings.`,
  });

  return {
    generatedAtIso,
    branchFilter,
    horizonMonths,
    status: 'ok',
    statusLabel: 'Computed Statistical Forecast',
    historicalPeriodStart: historicalVolume[0].yearMonth,
    historicalPeriodEnd: lastHistoricalYM,
    observationMonthsCount: historicalVolume.length,
    selectedModel,
    baselineModel,
    candidateEvaluations: evaluations,
    historicalVolume,
    volumeForecast,
    highDemandMonths,
    lowerDemandMonths,
    categoryForecasts,
    capacityComparison,
    administrativeInsights,
    limitations: baseLimitations,
  };
}
