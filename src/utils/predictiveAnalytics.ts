import { Patient, Appointment, InventoryItem, Prescription, LabTestOrder, Vitals } from '../types/clinic';

export interface PatientRiskProfile {
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: string;
  overallScore: number; // 0-100
  overallTier: 'Low' | 'Moderate' | 'High' | 'Critical';
  cardioRisk: {
    score: number; // 0-100
    tier: 'Low' | 'Moderate' | 'High';
    drivers: string[];
  };
  diabeticRisk: {
    score: number; // 0-100
    tier: 'Low' | 'Moderate' | 'High';
    drivers: string[];
  };
  readmissionRisk: {
    score: number; // 0-100
    tier: 'Low' | 'Moderate' | 'High';
    drivers: string[];
  };
  keyRiskDrivers: string[];
  recommendedInterventions: string[];
  lastAssessedDate: string;
}

export interface NoShowPrediction {
  appointmentId: string;
  patientName: string;
  patientMrn: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  probability: number; // 0-100%
  riskLevel: 'Low' | 'Moderate' | 'High';
  contributingFactors: string[];
  recommendedAction: string;
}

export interface StockoutForecast {
  sku: string;
  name: string;
  genericName: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  dailyConsumptionRate: number;
  daysRemaining: number;
  predictedDepletionDate: string;
  status: 'Healthy' | 'Moderate' | 'Critical' | 'Stockout';
  recommendedReorderQty: number;
}

export interface HourlySurgeData {
  hour: string; // "09:00"
  expectedPatients: number;
  staffCapacity: number;
  capacityUtilization: number; // percentage
  status: 'Normal' | 'Elevated' | 'Bottleneck';
}

/**
 * Computes clinically grounded risk stratification for a patient
 */
export function calculatePatientRiskStratification(
  patient: Patient,
  allAppointments: Appointment[] = [],
  allPrescriptions: Prescription[] = [],
  allLabOrders: LabTestOrder[] = []
): PatientRiskProfile {
  const vitals: Vitals | undefined = patient.vitalsHistory?.[0];
  const conditions = patient.chronicConditions || [];
  const allergies = patient.allergies || [];
  const meds = patient.currentMedications || [];

  let cardioScore = 15;
  const cardioDrivers: string[] = [];

  // Vitals analysis
  if (vitals) {
    if (vitals.bloodPressureSystolic >= 160 || vitals.bloodPressureDiastolic >= 100) {
      cardioScore += 40;
      cardioDrivers.push(`Stage 2 Hypertension (${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg)`);
    } else if (vitals.bloodPressureSystolic >= 140 || vitals.bloodPressureDiastolic >= 90) {
      cardioScore += 25;
      cardioDrivers.push(`Stage 1 Hypertension (${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg)`);
    } else if (vitals.bloodPressureSystolic >= 130) {
      cardioScore += 10;
      cardioDrivers.push(`Elevated systolic pressure (${vitals.bloodPressureSystolic} mmHg)`);
    }

    if (vitals.bmi >= 30) {
      cardioScore += 15;
      cardioDrivers.push(`Obesity Class I/II (BMI: ${vitals.bmi.toFixed(1)})`);
    } else if (vitals.bmi >= 25) {
      cardioScore += 8;
      cardioDrivers.push(`Overweight (BMI: ${vitals.bmi.toFixed(1)})`);
    }

    if (vitals.heartRate > 95) {
      cardioScore += 10;
      cardioDrivers.push(`Tachycardia baseline (${vitals.heartRate} bpm)`);
    }
  }

  // Age & comorbidity criteria
  if (patient.age >= 65) {
    cardioScore += 15;
    cardioDrivers.push(`Geriatric age group (${patient.age}y)`);
  } else if (patient.age >= 50) {
    cardioScore += 8;
  }

  const hasHypertension = conditions.some((c) => /hypertension|cardio|heart/i.test(c));
  if (hasHypertension) {
    cardioScore += 20;
    cardioDrivers.push('Pre-existing hypertensive disorder');
  }

  const hasDiabetes = conditions.some((c) => /diabet/i.test(c));
  if (hasDiabetes) {
    cardioScore += 15;
    cardioDrivers.push('Diabetic cardiovascular comorbidity');
  }

  cardioScore = Math.min(Math.max(cardioScore, 5), 98);
  const cardioTier: 'Low' | 'Moderate' | 'High' =
    cardioScore >= 65 ? 'High' : cardioScore >= 40 ? 'Moderate' : 'Low';

  // Diabetic progression risk
  let diabeticScore = 10;
  const diabeticDrivers: string[] = [];

  if (hasDiabetes) {
    diabeticScore += 45;
    diabeticDrivers.push('Documented Type 2 Diabetes diagnosis');
  }

  // Check recent lab tests for HbA1c
  const patientLabs = allLabOrders.filter((l) => l.patientMrn === patient.mrn);
  const hba1cLab = patientLabs.find((l) => /glycated|hba1c|glucose/i.test(l.testName));
  if (hba1cLab && hba1cLab.results) {
    const abnormal = hba1cLab.results.some((r) => r.flag === 'High' || r.flag === 'Critical');
    if (abnormal) {
      diabeticScore += 25;
      diabeticDrivers.push('Elevated Glycemic Index / Abnormal HbA1c flagged');
    }
  }

  if (vitals && vitals.bmi >= 30) {
    diabeticScore += 15;
    diabeticDrivers.push(`Adiposity exacerbation factor (BMI ${vitals.bmi})`);
  }

  diabeticScore = Math.min(Math.max(diabeticScore, 5), 98);
  const diabeticTier: 'Low' | 'Moderate' | 'High' =
    diabeticScore >= 60 ? 'High' : diabeticScore >= 35 ? 'Moderate' : 'Low';

  // 30-Day Readmission / Deterioration Risk
  let readmissionScore = 10;
  const readmissionDrivers: string[] = [];

  if (conditions.length >= 3) {
    readmissionScore += 30;
    readmissionDrivers.push(`Multimorbidity burden (${conditions.length} active conditions)`);
  } else if (conditions.length >= 1) {
    readmissionScore += 15;
  }

  if (meds.length >= 4) {
    readmissionScore += 25;
    readmissionDrivers.push(`Polypharmacy regimen (${meds.length} concurrent medications)`);
  }

  const patientApts = allAppointments.filter((a) => a.patientMrn === patient.mrn);
  const recentMissed = patientApts.filter((a) => a.status === 'No Show' || a.status === 'Cancelled').length;
  if (recentMissed >= 2) {
    readmissionScore += 20;
    readmissionDrivers.push(`Care continuity disruption (${recentMissed} missed visits)`);
  }

  readmissionScore = Math.min(Math.max(readmissionScore, 5), 95);
  const readmissionTier: 'Low' | 'Moderate' | 'High' =
    readmissionScore >= 60 ? 'High' : readmissionScore >= 35 ? 'Moderate' : 'Low';

  // Overall Composite Stratification Score
  const overallScore = Math.round(cardioScore * 0.4 + diabeticScore * 0.3 + readmissionScore * 0.3);
  let overallTier: 'Low' | 'Moderate' | 'High' | 'Critical';
  if (overallScore >= 75) overallTier = 'Critical';
  else if (overallScore >= 55) overallTier = 'High';
  else if (overallScore >= 35) overallTier = 'Moderate';
  else overallTier = 'Low';

  // Synthesize key drivers and preventative interventions
  const allDrivers = Array.from(new Set([...cardioDrivers, ...diabeticDrivers, ...readmissionDrivers]));
  const keyRiskDrivers = allDrivers.slice(0, 4);

  const recommendedInterventions: string[] = [];
  if (cardioTier === 'High') {
    recommendedInterventions.push('Enroll in 14-day ambulatory blood pressure monitoring');
    recommendedInterventions.push('Review ACE-inhibitor/ARB dosage & sodium intake restriction');
  }
  if (diabeticTier === 'High') {
    recommendedInterventions.push('Order Comprehensive Metabolic Panel & microalbuminuria screen');
    recommendedInterventions.push('Consult clinical dietitian for medical nutrition therapy');
  }
  if (readmissionTier === 'High' || overallTier === 'High' || overallTier === 'Critical') {
    recommendedInterventions.push('Schedule proactive 7-day nurse telephone check-in');
    recommendedInterventions.push('Perform medication reconciliation to eliminate drug duplication');
  }
  if (recommendedInterventions.length === 0) {
    recommendedInterventions.push('Maintain routine annual preventative health wellness visits');
    recommendedInterventions.push('Continue home vitals logging and lifestyle maintenance');
  }

  return {
    patientId: patient.id,
    patientName: patient.fullName,
    mrn: patient.mrn,
    age: patient.age,
    gender: patient.gender,
    overallScore,
    overallTier,
    cardioRisk: { score: cardioScore, tier: cardioTier, drivers: cardioDrivers },
    diabeticRisk: { score: diabeticScore, tier: diabeticTier, drivers: diabeticDrivers },
    readmissionRisk: { score: readmissionScore, tier: readmissionTier, drivers: readmissionDrivers },
    keyRiskDrivers,
    recommendedInterventions,
    lastAssessedDate: '2026-10-06',
  };
}

/**
 * Predicts appointment no-show probability using historical indicators and schedule parameters
 */
export function predictAppointmentNoShow(
  appointment: Appointment,
  patient?: Patient,
  allAppointments: Appointment[] = []
): NoShowPrediction {
  let score = 12; // Baseline clinic no-show rate ~12%
  const factors: string[] = [];

  // 1. Lead time calculation
  const createdDate = new Date(appointment.createdAt || appointment.date).getTime();
  const aptDate = new Date(appointment.date).getTime();
  const leadDays = Math.max(0, Math.round((aptDate - createdDate) / (1000 * 3600 * 24)));

  if (leadDays > 21) {
    score += 28;
    factors.push(`Extended booking lead time (${leadDays} days in advance)`);
  } else if (leadDays > 10) {
    score += 16;
    factors.push(`Moderate booking lead time (${leadDays} days)`);
  } else if (leadDays <= 2) {
    score -= 6;
    factors.push('Short turnaround booking (high commitment)');
  }

  // 2. Patient prior adherence history
  const patientHistory = allAppointments.filter(
    (a) => a.patientMrn === appointment.patientMrn && a.id !== appointment.id
  );
  const pastNoShows = patientHistory.filter((a) => a.status === 'No Show').length;
  const pastCancelled = patientHistory.filter((a) => a.status === 'Cancelled').length;
  const pastCompleted = patientHistory.filter((a) => a.status === 'Completed').length;

  if (pastNoShows > 0) {
    score += pastNoShows * 22;
    factors.push(`Prior recorded unexcused no-show (${pastNoShows} event)`);
  }
  if (pastCancelled > 0) {
    score += pastCancelled * 8;
    factors.push('History of last-minute appointment rescheduling');
  }
  if (pastCompleted >= 3 && pastNoShows === 0) {
    score -= 10;
    factors.push('High historical attendance adherence (3+ completed visits)');
  }

  // 3. Time slot effect (early mornings before 9 AM and late afternoons have higher drop-off)
  const hour = parseInt(appointment.time.split(':')[0], 10) || 10;
  if (hour < 9) {
    score += 12;
    factors.push('Early morning slot (< 9:00 AM) prone to transit delays');
  } else if (hour >= 16) {
    score += 10;
    factors.push('Late afternoon slot prone to workday conflicts');
  }

  // 4. Appointment type
  if (appointment.type === 'Telehealth') {
    score -= 12;
    factors.push('Virtual telehealth visit reduces transportation barrier');
  } else if (appointment.type === 'Follow-up') {
    score -= 4;
  }

  // Clamp probability
  const probability = Math.min(Math.max(score, 5), 94);
  const riskLevel: 'Low' | 'Moderate' | 'High' =
    probability >= 50 ? 'High' : probability >= 25 ? 'Moderate' : 'Low';

  let recommendedAction = 'Standard automated email reminder (24h)';
  if (riskLevel === 'High') {
    recommendedAction = 'Send 2-way SMS confirmation + Phone call & offer Telehealth conversion';
  } else if (riskLevel === 'Moderate') {
    recommendedAction = 'Dispatch WhatsApp/SMS priority confirmation with calendar invite';
  }

  return {
    appointmentId: appointment.id,
    patientName: appointment.patientName,
    patientMrn: appointment.patientMrn,
    doctorName: appointment.doctorName,
    department: appointment.department,
    date: appointment.date,
    time: appointment.time,
    probability,
    riskLevel,
    contributingFactors: factors.slice(0, 3),
    recommendedAction,
  };
}

/**
 * Predicts pharmacy medication runout date and stockout risk
 */
export function forecastPharmacyDepletion(
  item: InventoryItem,
  allPrescriptions: Prescription[] = []
): StockoutForecast {
  // Estimate daily consumption: each active prescription mentioning this drug adds ~1-2 units/day
  // plus standard clinic baseline
  const drugNameLower = item.name.toLowerCase();
  const genericLower = item.genericName.toLowerCase();

  const matchingPrescriptions = allPrescriptions.filter((rx) =>
    rx.items.some(
      (med) =>
        (med.medicationName || '').toLowerCase().includes(drugNameLower) ||
        (med.genericName || '').toLowerCase().includes(genericLower)
    )
  );

  // Daily run rate estimate: baseline + active therapy usage
  const prescriptionUnitsDaily = matchingPrescriptions.length * 1.5;
  const baseRate = item.category === 'Antibiotics' ? 4.5 : item.category === 'Cardiovascular' ? 3.0 : 2.0;
  const dailyConsumptionRate = Math.round((baseRate + prescriptionUnitsDaily) * 10) / 10;

  const daysRemaining = dailyConsumptionRate > 0 ? Math.floor(item.stockQuantity / dailyConsumptionRate) : 99;

  const now = new Date('2026-10-06');
  const depletionDate = new Date(now.getTime() + daysRemaining * 24 * 3600 * 1000);
  const predictedDepletionDate = depletionDate.toISOString().split('T')[0];

  let status: 'Healthy' | 'Moderate' | 'Critical' | 'Stockout';
  if (item.stockQuantity === 0) status = 'Stockout';
  else if (daysRemaining <= 5) status = 'Critical';
  else if (daysRemaining <= 14) status = 'Moderate';
  else status = 'Healthy';

  // Recommended order quantity based on 30-day supply + safety buffer
  const recommendedReorderQty = Math.max(
    0,
    Math.ceil(dailyConsumptionRate * 30 + item.reorderLevel - item.stockQuantity)
  );

  return {
    sku: item.sku,
    name: item.name,
    genericName: item.genericName,
    category: item.category,
    currentStock: item.stockQuantity,
    reorderLevel: item.reorderLevel,
    unit: item.unit,
    dailyConsumptionRate,
    daysRemaining,
    predictedDepletionDate,
    status,
    recommendedReorderQty,
  };
}

/**
 * Projects clinic hourly throughput vs staff capacity
 */
export function forecastClinicSurgeCapacity(
  appointments: Appointment[],
  activeStaffCount = 4
): HourlySurgeData[] {
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  const maxStaffThroughputPerHour = activeStaffCount * 2; // 2 patients per staff member per hour capacity

  return hours.map((hour) => {
    // Count active appointments starting around this hour (excluding cancelled and no-show visits)
    const hourPrefix = hour.split(':')[0];
    const scheduled = appointments.filter(
      (a) => a.status !== 'Cancelled' && a.status !== 'No Show' && a.time.startsWith(hourPrefix)
    ).length;

    // Add estimated walk-in volume (peak between 10am-12pm and 2pm-3pm)
    const walkInBoost = hour === '10:00' || hour === '11:00' ? 3 : hour === '14:00' ? 2 : 1;
    const expectedPatients = scheduled + walkInBoost;

    const utilization = Math.min(Math.round((expectedPatients / maxStaffThroughputPerHour) * 100), 160);
    let status: 'Normal' | 'Elevated' | 'Bottleneck';
    if (utilization >= 120) status = 'Bottleneck';
    else if (utilization >= 85) status = 'Elevated';
    else status = 'Normal';

    return {
      hour,
      expectedPatients,
      staffCapacity: maxStaffThroughputPerHour,
      capacityUtilization: utilization,
      status,
    };
  });
}
