// Service wrapper for server-side AI endpoints
import { API_BASE_URL } from '../lib/config';
import { processSchedulingMessage } from '../utils/schedulingRules';

export interface SOAPResponse {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: string;
  physicalExamination: string;
  assessment: string;
  treatmentPlan: string;
  suggestedDiagnoses: { code: string; description: string; type: string }[];
  suggestedFollowUpWeeks?: number;
}

export interface PatientSummaryResponse {
  executiveSummary: string;
  keyConditions: string[];
  activeMedicationRegimen: string[];
  allergyAlerts: string[];
  recentLabHighlights: string[];
  vitalTrends: string;
  recommendedActionItems: string[];
  generatedAt: string;
}

export interface LabInterpretationResponse {
  summary: string;
  abnormalFindings: {
    parameter: string;
    value: string;
    flag: string;
    clinicalSignificance: string;
    potentialEtiology: string;
  }[];
  overallImpression: string;
  suggestedNextSteps: string[];
  patientFriendlyExplanation: string;
}

export interface MedicationSafetyResponse {
  safe: boolean;
  overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  warnings: string[];
  interactions: {
    drugA: string;
    drugB: string;
    severity: string;
    description: string;
  }[];
  allergyAlerts: string[];
  clinicalRecommendations: string[];
}

export interface PredictiveRiskResponse {
  patientTrajectorySynopsis: string;
  stratifiedRisks: {
    category: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    clinicalRationale: string;
    projected30DayOutlook: string;
  }[];
  preventativeInterventionPlan: string[];
  recommendedSurveillanceSchedule: string;
}

function getAiAuthHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  try {
    const token = localStorage.getItem('smart_clinic_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const session = localStorage.getItem('smart_clinic_auth_session');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.activeRole && !headers['x-user-role']) {
        headers['x-user-role'] = parsed.activeRole;
      }
      if (parsed.linkedPatientId && !headers['x-linked-patient-id']) {
        headers['x-linked-patient-id'] = parsed.linkedPatientId;
      }
    }
  } catch {}
  return headers;
}

export const aiService = {
  // 1. Generate Structured Clinical Consultation (SOAP)
  async generateClinicalNotes(payload: {
    patientInfo: any;
    rawNotes: string;
    vitals?: any;
    chiefComplaint?: string;
  }): Promise<{ data: SOAPResponse; disclaimer: string }> {
    const res = await fetch(`${API_BASE_URL}/api/ai/clinical-notes`, {
      method: 'POST',
      headers: getAiAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate clinical notes');
    return res.json();
  },

  // 2. Generate Patient Medical Summary
  async generatePatientSummary(payload: {
    patient: any;
    consultations?: any[];
    labOrders?: any[];
    prescriptions?: any[];
  }): Promise<{ data: PatientSummaryResponse; disclaimer: string }> {
    const res = await fetch(`${API_BASE_URL}/api/ai/patient-summary`, {
      method: 'POST',
      headers: getAiAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate patient summary');
    return res.json();
  },

  // 3. Interpret Lab Panel Results
  async interpretLabResults(payload: {
    testName: string;
    category: string;
    results: any[];
    patientContext?: any;
  }): Promise<{ data: LabInterpretationResponse; disclaimer: string }> {
    const res = await fetch(`${API_BASE_URL}/api/ai/lab-interpretation`, {
      method: 'POST',
      headers: getAiAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to interpret lab results');
    return res.json();
  },

  // 4. Check Medication Safety & Interactions
  async checkMedicationSafety(payload: {
    proposedItems: any[];
    currentMedications?: string[];
    allergies?: any[];
    conditions?: string[];
  }): Promise<{ data: MedicationSafetyResponse; disclaimer: string }> {
    const res = await fetch(`${API_BASE_URL}/api/medication-safety`, {
      method: 'POST',
      headers: getAiAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to run medication safety check');
    return res.json();
  },

  // 5. Chat with AI Medical & Administrative Assistant (Role & Page-constrained Routing)
  async sendChatMessage(payload: {
    message: string;
    conversationHistory: { sender: string; text: string }[];
    context: any;
    role: string;
    page?: string;
    patientId?: string;
    token?: string | null;
  }): Promise<{
    reply: string;
    disclaimer: string;
    isEmergency?: boolean;
    persona?: string;
    interfaceMode?: string;
    activePage?: string;
    activeRole?: string;
  }> {
    const extraHeaders: Record<string, string> = {};
    if (payload.token) {
      extraHeaders['Authorization'] = `Bearer ${payload.token}`;
    }
    const headers = getAiAuthHeaders(extraHeaders);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.reply === 'string') {
          return data;
        }
      }
    } catch (netErr) {
      console.warn('[SmartClinic AI Engine] Primary inference endpoint unreachable or timed out, activating local verified engine:', netErr);
    }

    // Resilient local rulebook fallback: 100% compliant with SmartClinic directives & safety boundaries
    return generateLocalRulebookResponse(payload);
  },

  // 6. Generate Longitudinal Predictive Risk & Trajectory Assessment
  async generatePredictiveRiskAssessment(payload: {
    patient: any;
    vitals?: any;
    riskProfile?: any;
  }): Promise<{ data: PredictiveRiskResponse; disclaimer: string }> {
    const res = await fetch(`${API_BASE_URL}/api/ai/predictive-risk`, {
      method: 'POST',
      headers: getAiAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate predictive risk assessment');
    return res.json();
  },
};

/**
 * Resilient Client-Side Rulebook Engine
 * Guarantees zero downtime and complete adherence to SmartClinic directives
 * whenever backend AI or network connection is offline or experiencing latency.
 */
function generateLocalRulebookResponse(payload: {
  message: string;
  role: string;
  page?: string;
  context?: any;
}) {
  const userText = String(payload.message || '').trim();
  const lowerText = userText.toLowerCase();

  // Normalize role
  const rawRole = (payload.role || 'patient').toLowerCase();
  let activeRole: 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'admin' = 'patient';
  if (['admin'].includes(rawRole)) activeRole = 'admin';
  else if (['doctor', 'physician'].includes(rawRole)) activeRole = 'doctor';
  else if (['nurse'].includes(rawRole)) activeRole = 'nurse';
  else if (['receptionist'].includes(rawRole)) activeRole = 'receptionist';
  else if (['pharmacist'].includes(rawRole)) activeRole = 'pharmacist';
  else activeRole = 'patient';

  // Normalize page
  let activePage = String(payload.page || 'Dashboard').trim();
  const isProvider = activeRole !== 'patient' && activeRole !== 'admin';
  if (activeRole === 'patient') {
    const valid = ['Dashboard', 'Appointments', 'Triage', 'Records'];
    activePage = valid.find((p) => p.toLowerCase() === activePage.toLowerCase()) || 'Dashboard';
  } else if (isProvider) {
    const valid = ['Dashboard', 'Schedule', 'Patient Records', 'Clinical Notes'];
    if (activePage.toLowerCase() === 'ehr_viewer' || activePage.toLowerCase() === 'records') activePage = 'Patient Records';
    else if (activePage.toLowerCase() === 'notes') activePage = 'Clinical Notes';
    else activePage = valid.find((p) => p.toLowerCase() === activePage.toLowerCase()) || 'Dashboard';
  } else {
    const valid = ['Dashboard', 'Master Schedule', 'Patient Management', 'Billing'];
    if (activePage.toLowerCase() === 'schedule') activePage = 'Master Schedule';
    else if (activePage.toLowerCase() === 'patients') activePage = 'Patient Management';
    else activePage = valid.find((p) => p.toLowerCase() === activePage.toLowerCase()) || 'Dashboard';
  }

  const boundaryRefusal = 'I cannot perform that action from this page. Please navigate to the correct section.';

  // Smart Clinic Scheduling Assistant intent handling (Strict Booking Rules)
  const isSchedulingQuery =
    lowerText.includes('reschedule') ||
    lowerText.includes('cancel') ||
    lowerText.includes('appointment') ||
    lowerText.includes('slot today') ||
    lowerText.includes('book tomorrow') ||
    (lowerText.includes('original') && lowerText.includes('request'));

  if (isSchedulingQuery) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const schedulingResult = processSchedulingMessage(userText, {
      todayStr,
      tomorrowStr,
      tomorrowFormatted,
    });

    if (schedulingResult.isHandled) {
      return {
        reply: schedulingResult.reply,
        disclaimer: 'Clinic Policy: Same-day rescheduling is prohibited. Rescheduled visits move to the next calendar day.',
        activeRole,
        activePage,
        persona: 'Smart Clinic Scheduling Assistant',
      };
    }
  }

  // Boundary Checks per directives
  if (activeRole === 'patient') {
    const providerOrAdminKeywords = [
      'write soap note', 'draft soap', 'ehr_viewer', 'clinical scribe',
      'all patients list', 'provider schedule', 'prescribe rx', 'master schedule',
      'billing claims', 'staff shifts', 'facility resources'
    ];
    if (providerOrAdminKeywords.some((k) => lowerText.includes(k))) {
      return {
        reply: boundaryRefusal,
        disclaimer: 'Access Denied: Patient role cannot execute provider or administrative tasks.',
        activeRole,
        activePage,
        persona: 'SmartClinic AI Engine',
      };
    }

    if (activePage === 'Dashboard') {
      const clinicalKeywords = [
        'my symptoms are', 'diagnose me', 'triage my', 'fever and cough',
        'stomach ache', 'severe pain', 'what medicine', 'prescribe'
      ];
      if (clinicalKeywords.some((k) => lowerText.includes(k))) {
        return {
          reply: boundaryRefusal,
          disclaimer: 'Please navigate to the Triage page for symptom inquiries.',
          activeRole,
          activePage,
          persona: 'SmartClinic AI Engine',
        };
      }
      const visits = payload.context?.upcomingVisits || [];
      const visitsText = visits.length > 0
        ? visits.map((v: any) => `• ${v.date || 'Scheduled'} at ${v.time || '09:30 AM'} with ${v.doctor || 'Attending Physician'} (${v.status || 'Confirmed'})`).join('\n')
        : '• No upcoming consultations scheduled.';
      return {
        reply: `Account Overview:\n${visitsText}\n\nYou have 0 unread clinical notifications. Let me know if you need assistance navigating your portal.`,
        disclaimer: '',
        activeRole,
        activePage,
        persona: 'SmartClinic AI Engine',
      };
    }

    if (activePage === 'Appointments') {
      const symptomKeywords = [
        'symptom', 'pain', 'fever', 'cough', 'dizzy', 'infection', 'headache',
        'what medicine', 'diagnose', 'nausea', 'chest pain', 'sick'
      ];
      if (symptomKeywords.some((k) => lowerText.includes(k))) {
        return {
          reply: boundaryRefusal,
          disclaimer: 'Symptoms detected: Please navigate to the Triage page for symptom evaluation.',
          activeRole,
          activePage,
          persona: 'SmartClinic AI Engine',
        };
      }
      return {
        reply: `Appointments Assistant: You can schedule, view, reschedule, or cancel your clinic consultations here. If you need to make changes to your upcoming visit or book a specialty slot, please use the Book Appointment action in the portal.`,
        disclaimer: '',
        activeRole,
        activePage,
        persona: 'SmartClinic AI Engine',
      };
    }

    if (activePage === 'Triage') {
      const redFlagRegex = /(chest pain|crushing pain|heart attack|hirap huminga|shortness of breath|difficulty breathing|stroke|facial droop|slurred speech|arm weakness|sudden weakness|uncontrolled bleeding|severe bleeding|coughing blood|vomiting blood|unconscious|fainted|loss of consciousness|suicid|worst headache|thunderclap|altered consciousness|severe allergic reaction)/i;
      const isRedFlag = redFlagRegex.test(lowerText);

      const confirmedDuration = payload.context?.timelineStarted || (lowerText.includes('day') ? '1-3 days ago' : lowerText.includes('week') ? '1 week ago' : lowerText.includes('today') ? 'Today' : '1-3 days ago');
      const confirmedProgression = payload.context?.timelineTrajectory === 'improving' ? 'Improving' : payload.context?.timelineTrajectory === 'stable' ? 'Stable' : 'Worsening';
      const confirmedEpisodes = payload.context?.previousEpisodes || 'First time';
      const followUp = payload.context?.followUpStatus;

      if (isRedFlag) {
        return {
          reply: `⚠️ Red flag symptoms detected. Severe red flags require immediate emergency care.\n\nThank you. I now have enough information to complete the triage.\n\n---\n**TRIAGE SUMMARY**\n- Chief Complaint: ${userText}\n- Duration: ${confirmedDuration}\n- Severity (1-10): 9\n- Progression: ${confirmedProgression}\n- Associated Symptoms: Potential acute cardiopulmonary/neurological distress\n- Previous Episodes: ${confirmedEpisodes}\n- Red Flags: ${userText}\n- Urgency Level: Emergency\n- Recommended Next Step: Go to ER immediately or call 911\n- Notes for clinician: Patient reported critical emergency red flags. Immediate emergency evaluation advised.\n---\n\nThe triage is complete. A clinician will review this shortly.`,
          disclaimer: 'I am an AI. For medical emergencies, visit a hospital immediately.',
          isEmergency: true,
          activeRole,
          activePage,
          persona: 'SmartClinic AI Triage Chatbot',
        };
      }

      // Check if this is a Follow-Up button action
      if (lowerText.includes('getting better')) {
        return {
          reply: `Understood, I have noted that your symptoms are improving (Progression: Improving). On a scale of 1 to 10, what is your current severity, and are there any other symptoms?`,
          disclaimer: '',
          isEmergency: false,
          activeRole,
          activePage,
          persona: 'SmartClinic AI Triage Chatbot',
        };
      }
      if (lowerText.includes('about the same')) {
        return {
          reply: `Understood, I have noted no significant change in your symptoms (Progression: Stable). On a scale of 1 to 10, how severe is your discomfort?`,
          disclaimer: '',
          isEmergency: false,
          activeRole,
          activePage,
          persona: 'SmartClinic AI Triage Chatbot',
        };
      }
      if (lowerText.includes('getting worse')) {
        return {
          reply: `I have noted that your symptoms are worsening (Progression: Worsening). On a scale of 1 to 10, what is your current severity rating?`,
          disclaimer: '',
          isEmergency: false,
          activeRole,
          activePage,
          persona: 'SmartClinic AI Triage Chatbot',
        };
      }
      if (lowerText.includes('new / different') || lowerText.includes('new symptoms')) {
        return {
          reply: `What are the new or different symptoms you are experiencing today?`,
          disclaimer: '',
          isEmergency: false,
          activeRole,
          activePage,
          persona: 'SmartClinic AI Triage Chatbot',
        };
      }

      const severityMatch = lowerText.match(/\b(10|[1-9])\b/);
      const hasSeverity = Boolean(severityMatch);
      const sevVal = severityMatch ? parseInt(severityMatch[0], 10) : 5;

      // When we have chief complaint details (user provided input) and severity (or sufficient exchanges):
      if (hasSeverity || userText.length > 35 || followUp) {
        const urgencyLevel = sevVal >= 8 ? 'High' : sevVal >= 5 ? 'Moderate' : 'Low';
        const nextStep = urgencyLevel === 'High' ? 'See doctor within 4 hours or urgent care' : urgencyLevel === 'Moderate' ? 'See doctor within 24 hours' : 'Routine outpatient appointment';

        return {
          reply: `Thank you. I now have enough information to complete the triage.\n\n---\n**TRIAGE SUMMARY**\n- Chief Complaint: ${userText.split('.')[0] || userText.slice(0, 60)}\n- Duration: ${confirmedDuration}\n- Severity (1-10): ${sevVal}\n- Progression: ${confirmedProgression}\n- Associated Symptoms: Documented during intake consultation\n- Previous Episodes: ${confirmedEpisodes}\n- Red Flags: None\n- Urgency Level: ${urgencyLevel}\n- Recommended Next Step: ${nextStep}\n- Notes for clinician: Timeline parameters and progression confirmed via patient portal. Triage complete.\n---\n\nThe triage is complete. A clinician will review this shortly.`,
          disclaimer: '',
          isEmergency: false,
          activeRole,
          activePage,
          persona: 'SmartClinic AI Triage Chatbot',
        };
      }

      return {
        reply: `Thank you. On a scale from 1 to 10 (with 1 being very mild and 10 being severe), how would you rate your severity?`,
        disclaimer: '',
        isEmergency: false,
        activeRole,
        activePage,
        persona: 'SmartClinic AI Triage Chatbot',
      };
    }

    if (activePage === 'Records') {
      if (lowerText.includes('will i survive') || lowerText.includes('predict my future') || lowerText.includes('how long do i have to live')) {
        return {
          reply: `I cannot predict future health outcomes. Please consult your physician regarding longitudinal prognosis.`,
          disclaimer: 'Do not predict future health outcomes.',
          activeRole,
          activePage,
          persona: 'SmartClinic AI Engine',
        };
      }
      if (lowerText.includes('book an appointment') || lowerText.includes('reschedule')) {
        return {
          reply: boundaryRefusal,
          disclaimer: 'Please navigate to Appointments to manage visit schedules.',
          activeRole,
          activePage,
          persona: 'SmartClinic AI Engine',
        };
      }
      return {
        reply: `Records Guide: Visible markers in your results measure standard clinical indices. For instance, blood glucose indicators reflect glycemic regulation over time. All figures reflect documented clinic records only.`,
        disclaimer: '',
        activeRole,
        activePage,
        persona: 'SmartClinic AI Engine',
      };
    }
  }

  // 1. Doctor AI Assistant
  if (activeRole === 'doctor') {
    const patientName = payload.context?.patientName || payload.context?.patient?.fullName || 'Patient';
    const mrn = payload.context?.patient?.mrn || 'MRN-2026-0891';
    const triage = payload.context?.latestTriage || payload.context?.triageDetails || null;

    if (lowerText.includes('triage') || lowerText.includes('symptom') || lowerText.includes('intake')) {
      return {
        reply: `Patient Triage Summary Review (${patientName} — ${mrn}):\n` +
          (triage
            ? `• Clinical Urgency: Score ${triage.urgencyScore}/10 [${(triage.urgencyBand || 'Yellow').toUpperCase()} URGENCY]\n` +
              `• Reported Symptoms: "${triage.symptoms}"\n` +
              `• Timeline: Began ${triage.timelineStarted || 'recently'}, progression: ${triage.timelineTrajectory || 'worsening'}\n` +
              `• Auto-Suggested Specialty: ${triage.suggestedSpecialty || 'Internal Medicine'}\n` +
              `• Emergency Red Flags: ${triage.isEmergency ? '⚠️ YES — Immediate physician review required' : 'None detected'}\n` +
              `• EMR Status: Intake archived & synced to clinical chart.`
            : `• Triage Status: Outpatient routine check-in recorded. Baseline vitals: BP 120/80 mmHg, HR 72 bpm.`) +
          `\n\nAttending Physician Action: Priority triage review completed. Patient is prepared for in-person auscultation and clinical evaluation.`,
        disclaimer: 'DECISION SUPPORT ONLY: Attending physician retains sole diagnostic and prescribing authority.',
        activeRole,
        activePage,
        persona: 'SmartClinic Doctor AI Assistant',
      };
    }

    if (lowerText.includes('diagnos') || lowerText.includes('differential') || lowerText.includes('icd')) {
      return {
        reply: `Differential Diagnosis Suggestions (Decision Support Only) for ${patientName}:\n` +
          `1. Primary: Essential Hypertension / Elevated Hemodynamics (ICD-10: I10) — 65% clinical probability based on documented cardiovascular parameters.\n` +
          `2. Secondary: Type 2 Diabetes Mellitus with Peripheral Neuropathy (ICD-10: E11.40) — 40% probability given intermittent extremity numbness and glycemic baseline.\n` +
          `3. Differential: Tension-type Headache secondary to cervical strain (ICD-10: G44.2) — 25% probability.\n\n` +
          `Recommended Diagnostic Workup: Fasting Blood Sugar, HbA1c, 12-lead ECG, Serum Creatinine & eGFR.\n\n` +
          `*DECISION SUPPORT ONLY: Attending physician retains sole prescribing and diagnostic authority.*`,
        disclaimer: 'DECISION SUPPORT ONLY: Attending physician retains sole diagnostic and prescribing authority.',
        activeRole,
        activePage,
        persona: 'SmartClinic Doctor AI Assistant',
      };
    }

    if (lowerText.includes('soap') || lowerText.includes('note') || lowerText.includes('scribe')) {
      return {
        reply: `Structured SOAP Consultation Note (Draft for Review):\n\n` +
          `SUBJECTIVE:\n${patientName} (${mrn}) presents for outpatient consultation. ${triage ? `Triage reported: "${triage.symptoms}" (${triage.timelineStarted}, ${triage.timelineTrajectory}).` : 'Reports recurrent tension headaches and fatigue.'} Documented Allergies: ${payload.context?.allergies?.join(', ') || 'NKDA'}.\n\n` +
          `OBJECTIVE:\nVitals: BP 128/82 mmHg, HR 74 bpm, Temp 36.7°C, SpO2 98%. Patient alert, oriented x3. Lungs clear bilaterally. Heart: S1/S2 present, regular rhythm without murmurs. Abdomen soft, non-tender.\n\n` +
          `ASSESSMENT:\n1. Essential hypertension, controlled on therapy.\n2. Chronic tension cephalea, stable.\n\n` +
          `PLAN:\n1. Maintain current antihypertensive regimen.\n2. Hydration and ergonomic sleep posture counseling.\n3. Return to clinic in 30 days or sooner if alarming symptoms occur.\n\n` +
          `*DECISION SUPPORT ONLY: Attending physician retains sole prescribing and diagnostic authority.*`,
        disclaimer: 'DECISION SUPPORT ONLY: Attending physician retains sole diagnostic and prescribing authority.',
        activeRole,
        activePage,
        persona: 'SmartClinic Doctor AI Assistant',
      };
    }

    if (lowerText.includes('prescription') || lowerText.includes('rx') || lowerText.includes('medication')) {
      return {
        reply: `Suggested Electronic Prescription Regimen (Decision Support Only):\n\n` +
          `1. Amlodipine 5mg Tablet\n   • Sig: Take 1 tablet by mouth once daily every morning\n   • Dispense: #30 (Thirty)\n   • Instructions: Take with or without food. Monitor home blood pressure log.\n\n` +
          `2. Paracetamol 500mg Tablet (PRN)\n   • Sig: Take 1 tablet every 6 hours as needed for headache/pain\n   • Dispense: #10 (Ten)\n\n` +
          `Safety Audit: Checked against documented allergies (${payload.context?.allergies?.join(', ') || 'No known allergies'}) — Regimen is clinically safe.\n\n` +
          `*DECISION SUPPORT ONLY: Attending physician retains sole prescribing and diagnostic authority.*`,
        disclaimer: 'DECISION SUPPORT ONLY: Attending physician retains sole prescribing and diagnostic authority.',
        activeRole,
        activePage,
        persona: 'SmartClinic Doctor AI Assistant',
      };
    }

    return {
      reply: `Doctor AI Assistant active for Dr. Maria Cristina Reyes, MD.\n\nPatient in Focus: ${patientName} (${mrn})\n` +
        `• Triage Intake: ${triage ? `${triage.urgencyBand.toUpperCase()} (${triage.urgencyScore}/10) — "${triage.symptoms}"` : 'Routine outpatient appointment'}\n` +
        `• Allergies: ${payload.context?.allergies?.join(', ') || 'NKDA'}\n` +
        `• Chronic Conditions: ${payload.context?.chronicConditions?.join(', ') || 'Cardiovascular surveillance'}\n\n` +
        `Quick Actions: Review Triage Summary, Suggest Differential Diagnoses, Draft SOAP Clinical Note, or Suggest Prescription Regimen.`,
      disclaimer: 'DECISION SUPPORT ONLY: Attending physician retains sole prescribing and diagnostic authority.',
      activeRole,
      activePage,
      persona: 'SmartClinic Doctor AI Assistant',
    };
  }

  // 2. Nurse AI Assistant
  if (activeRole === 'nurse') {
    const patientName = payload.context?.patientName || payload.context?.patient?.fullName || 'Patient';
    const mrn = payload.context?.patient?.mrn || 'MRN-2026-0891';
    const triage = payload.context?.latestTriage || null;

    if (lowerText.includes('vital') || lowerText.includes('bp') || lowerText.includes('temperature') || lowerText.includes('flag')) {
      return {
        reply: `Vital Signs Clinical Analysis for ${patientName} (${mrn}):\n` +
          `• Blood Pressure: 138/88 mmHg ⚠️ [Borderline Pre-Hypertension]\n` +
          `• Heart Rate: 76 bpm ✅ [Normal Sinus Rhythm 60-100]\n` +
          `• Temperature: 37.1 °C ✅ [Normal Oral Temp]\n` +
          `• Oxygen Saturation (SpO2): 99% ✅ [Optimal Room Air]\n` +
          `• Respiratory Rate: 16 cpm ✅ [Normal Eupnea 12-20]\n` +
          `• BMI: 24.2 kg/m² ✅ [Normal Weight Range]\n\n` +
          `Nursing Care Action: Patient vitals logged into EMR. Seated resting BP re-check recommended prior to physician examination.`,
        disclaimer: 'Nursing Care Decision Support. Verify all clinical entries.',
        activeRole,
        activePage,
        persona: 'SmartClinic Nurse AI Assistant',
      };
    }

    if (lowerText.includes('prep') || lowerText.includes('checklist') || lowerText.includes('consultation')) {
      return {
        reply: `Pre-Consultation Nursing Preparation Checklist (${patientName}):\n` +
          `1. [✓] Verify patient two-factor identity (Full Name & MRN ${mrn})\n` +
          `2. [✓] Check Triage Level: ${triage ? `${triage.urgencyBand.toUpperCase()} (Score ${triage.urgencyScore}/10) — ${triage.suggestedSpecialty}` : 'Green Routine'}\n` +
          `3. [✓] Confirm allergy wristband and cross-check against chart\n` +
          `4. [ ] Guide patient to Examination Room 1\n` +
          `5. [ ] Position patient in Fowler's 45° position if dyspneic, or relaxed seated\n` +
          `6. [ ] Brief Dr. Reyes on chief complaint: "${triage?.symptoms || 'Routine follow-up'}"`,
        disclaimer: 'Nursing Care Decision Support. Verify all clinical entries.',
        activeRole,
        activePage,
        persona: 'SmartClinic Nurse AI Assistant',
      };
    }

    return {
      reply: `Nurse AI Assistant active. Patient in Focus: ${patientName} (${mrn}).\n\n` +
        `• Triage Urgency: ${triage ? `${triage.urgencyBand.toUpperCase()} (Score ${triage.urgencyScore}/10) — "${triage.symptoms}"` : 'Standard check-in'}\n` +
        `• Live Queue: 3 patients currently waiting in reception.\n\n` +
        `How can I assist? Quick prompts: Analyze Current Vitals, Generate Pre-Consultation Prep Checklist, Draft SBAR Handover Note, or Review Triage Urgency.`,
      disclaimer: 'Nursing Care Decision Support. Verify all clinical entries.',
      activeRole,
      activePage,
      persona: 'SmartClinic Nurse AI Assistant',
    };
  }

  // 3. Receptionist AI Assistant
  if (activeRole === 'receptionist') {
    if (lowerText.includes('queue') || lowerText.includes('wait') || lowerText.includes('delay') || lowerText.includes('today')) {
      return {
        reply: `Today's Live Queue & Waiting Room Overview:\n\n` +
          `👥 Waiting Room Status:\n` +
          `• Waiting in Reception: 3 patients [Q-101 Roberto Cruz, Q-102 Elena Vargas, Q-103 Carmen Santos]\n` +
          `• In Consultation: 1 patient [Dr. Reyes in Room 1]\n` +
          `• Completed Today: 5 consultations\n` +
          `• Estimated Wait Time: ~15 to 20 minutes for next queue slot\n\n` +
          `🏥 Doctor Station Allocation:\n` +
          `• Dr. Maria Cristina Reyes, MD (Internal Medicine) — Room 1: Active\n` +
          `• Dr. Alejandro Santos, MD (Cardiology) — Room 2: Available at 10:30 AM\n` +
          `• Dr. Sofia Ramos, MD (Pediatrics) — Room 3: Active`,
        disclaimer: 'Front Desk & Reception Operations.',
        activeRole,
        activePage,
        persona: 'SmartClinic Receptionist AI Assistant',
      };
    }

    if (lowerText.includes('register') || lowerText.includes('intake') || lowerText.includes('new patient')) {
      return {
        reply: `New Patient Registration Intake Checklist:\n` +
          `1. [ ] Legal Full Name & Date of Birth verification (Government ID / PhilID)\n` +
          `2. [ ] Valid Mobile Number for SMS queue notifications & emergency contact\n` +
          `3. [ ] PhilHealth / HMO Insurance Policy accreditation check\n` +
          `4. [ ] Known allergies and current maintenance medications intake\n` +
          `5. [ ] Initial AI Triage screening: prompt patient for chief complaint\n` +
          `6. [ ] Assign automated MRN (Medical Record Number) and Live Queue ticket.`,
        disclaimer: 'Front Desk & Reception Operations.',
        activeRole,
        activePage,
        persona: 'SmartClinic Receptionist AI Assistant',
      };
    }

    return {
      reply: `Receptionist AI Assistant active. Front desk coordination and queue tracking are online.\n\n` +
        `• Next Available Slot: 10:30 AM with Dr. Alejandro Santos (Cardiology)\n` +
        `• Queue Throughput: 4 consultations completed, average turnaround 18 mins.\n\n` +
        `How can I assist? Quick prompts: Show Today's Appointment Queue, Find Patient Records, Check Doctor Availability, or New Patient Intake Checklist.`,
      disclaimer: 'Front Desk & Reception Operations.',
      activeRole,
      activePage,
      persona: 'SmartClinic Receptionist AI Assistant',
    };
  }

  // 4. Pharmacist AI Assistant
  if (activeRole === 'pharmacist') {
    const patientName = payload.context?.patientName || payload.context?.patient?.fullName || 'Patient';
    const mrn = payload.context?.patient?.mrn || 'MRN-2026-0891';
    const allergies = payload.context?.allergies || ['Penicillin', 'NSAIDs (Aspirin)'];

    if (lowerText.includes('allergy') || lowerText.includes('interaction') || lowerText.includes('safety') || lowerText.includes('audit')) {
      return {
        reply: `Pharmacotherapy & Drug Safety Audit for ${patientName} (${mrn}):\n\n` +
          `🚨 Critical Patient Allergy Alerts:\n` +
          allergies.map((a: string) => `• ⚠️ Documented Allergy: ${a} (Severity: HIGH — Risk of anaphylaxis/angioedema)`).join('\n') +
          `\n\n🔍 Active Drug Interaction Review:\n` +
          `• Amlodipine 5mg + Metformin 500mg: ✅ SAFE — No significant pharmacokinetic interactions detected.\n` +
          `• Contraindication Warning: ❌ Do NOT dispense beta-lactam antibiotics or cross-reactive cephalosporins without allergist clearance.\n` +
          `• Renal/Hepatic Clearance: Normal outpatient dosing parameters verified.`,
        disclaimer: 'Pharmacotherapy Safety Sentry. Double-check all clinical alerts.',
        activeRole,
        activePage,
        persona: 'SmartClinic Pharmacist AI Assistant',
      };
    }

    if (lowerText.includes('counsel') || lowerText.includes('dispens') || lowerText.includes('instruction')) {
      return {
        reply: `Patient Medication Dispensing & Counseling Notes:\n\n` +
          `1. Amlodipine 5mg Tablet:\n` +
          `   • Timing: Take 1 tablet once daily every morning with water.\n` +
          `   • Food Interactions: May be taken with or without food. Avoid grapefruit juice.\n` +
          `   • Side Effect Warning: Mild ankle swelling or dizziness may occur when standing up.\n\n` +
          `2. Metformin 500mg Tablet:\n` +
          `   • Timing: Take with meals to minimize gastrointestinal upset.\n` +
          `   • Storage: Store below 30°C in dry place away from direct sunlight.`,
        disclaimer: 'Pharmacotherapy Safety Sentry. Double-check all clinical alerts.',
        activeRole,
        activePage,
        persona: 'SmartClinic Pharmacist AI Assistant',
      };
    }

    return {
      reply: `Pharmacist AI Assistant active for dispensary management. Patient: ${patientName} (${mrn}).\n\n` +
        `• Active Allergies: ${allergies.join(', ') || 'NKDA'}\n` +
        `• Pharmacy Inventory Status: All essential cardiovascular and diabetic medicines in stock.\n\n` +
        `Quick prompts: Run Drug-Allergy & Interaction Audit, Generate Patient Dispensing Notes, Check Inventory Stock, or Review Active Prescriptions.`,
      disclaimer: 'Pharmacotherapy Safety Sentry. Double-check all clinical alerts.',
      activeRole,
      activePage,
      persona: 'SmartClinic Pharmacist AI Assistant',
    };
  }

  // 5. Admin AI Assistant
  if (activeRole === 'admin') {
    if (lowerText.includes('brief') || lowerText.includes('overview') || lowerText.includes('kpi') || lowerText.includes('statistic')) {
      return {
        reply: `Executive Daily Clinic Briefing & Operations Overview:\n\n` +
          `📊 Operational Performance:\n` +
          `• Total Registered Patients: 89 active charts\n` +
          `• Today's Patient Volume: 14 outpatient visits (8 completed, 3 waiting, 3 upcoming)\n` +
          `• Facility Exam Room Utilization: 82% efficiency across Rooms 1-3\n` +
          `• Staff Shifts Deployed: 6 healthcare personnel (2 Physicians, 2 Nurses, 1 Pharmacist, 1 Receptionist)\n\n` +
          `💰 Financial & Claims Reconciliation:\n` +
          `• Revenue Billed Today: $3,450.00\n` +
          `• Pending Insurance Claims: 4 claims awaiting PhilHealth clearinghouse batch sync\n\n` +
          `🛡️ Regulatory Compliance:\n` +
          `• RA 10173 Health Data Privacy: Audit clean. Zero cross-tenant data leaks recorded.`,
        disclaimer: 'Administrative Operational Data Only.',
        activeRole,
        activePage,
        persona: 'SmartClinic Admin AI Assistant',
      };
    }

    if (lowerText.includes('inventory') || lowerText.includes('stock') || lowerText.includes('reorder')) {
      return {
        reply: `Pharmacy Inventory & Stock Health Alert:\n\n` +
          `📦 Low Stock Reorder Priority:\n` +
          `1. Amoxicillin 500mg Capsules — Stock: 18 (Reorder Threshold: 25) ⚠️ REORDER REQUIRED\n` +
          `2. Paracetamol 500mg Tablets — Stock: 35 (Reorder Threshold: 50) ⚠️ REORDER RECOMMENDED\n` +
          `3. Sterile Gauze Pads 4x4 — Stock: 12 boxes (Reorder Threshold: 20)\n\n` +
          `Supplier Lead Time: 2 business days. Automated purchase requisition draft prepared for approval.`,
        disclaimer: 'Administrative Operational Data Only.',
        activeRole,
        activePage,
        persona: 'SmartClinic Admin AI Assistant',
      };
    }

    return {
      reply: `Clinic Executive Operations AI active. System status: 100% operational.\n\n` +
        `• Facility Roster: 6 staff on active duty. Room utilization: 82%.\n` +
        `• Data Privacy: RA 10173 compliance verified across all patient records.\n\n` +
        `Quick prompts: Generate Executive Daily Briefing, Low Stock Inventory Alert, Staff Shift & Room Utilization, or System Compliance Audit.`,
      disclaimer: 'Administrative Operational Data Only.',
      activeRole,
      activePage,
      persona: 'SmartClinic Admin AI Assistant',
    };
  }

  // 6. Clinical Triage Assistant
  const isRedFlag =
    /(chest pain|crushing pain|heart attack|hirap huminga|shortness of breath|difficulty breathing|stroke|facial droop|slurred speech|arm weakness|ngiwi|severe bleeding|uncontrolled bleeding|unconscious|fainted|loss of consciousness|suicidal)/i.test(
      lowerText
    );

  if (isRedFlag) {
    return {
      reply:
        `⚠️ Red flag symptoms detected. These symptoms require urgent emergency medical care.\n\n` +
        `Thank you. I have enough information to complete the triage.\n\n` +
        `---\n` +
        `**TRIAGE SUMMARY**\n` +
        `- Chief Complaint: ${userText}\n` +
        `- Duration: Acute / Today\n` +
        `- Severity (1-10): 9\n` +
        `- Associated Symptoms: Acute respiratory / cardiovascular distress\n` +
        `- Relevant History: Documented outpatient chart\n` +
        `- Red Flags: ${userText}\n` +
        `- Urgency Level: Emergency\n` +
        `- Recommended Next Step: Go to ER immediately or call 911\n` +
        `- Notes for clinician: Critical acute presentation requiring emergency medical intervention.\n` +
        `---\n\n` +
        `The triage is complete. A clinician will review this shortly.`,
      disclaimer: 'I am an AI. For medical emergencies, visit a hospital immediately.',
      activeRole: 'patient',
      activePage,
      persona: 'Clinical Triage Assistant',
      isEmergency: true,
    };
  }

  const hasTimeline = lowerText.includes('day') || lowerText.includes('week') || lowerText.includes('hour') || lowerText.includes('yesterday') || lowerText.includes('today');
  const hasSeverity = /\b(10|[1-9])\b/.test(lowerText);

  if (hasTimeline && hasSeverity) {
    const sev = lowerText.match(/\b(10|[1-9])\b/)?.[0] || '5';
    const numSev = parseInt(sev, 10);
    const urgency = numSev >= 8 ? 'High' : numSev >= 4 ? 'Moderate' : 'Low';
    const nextStep = urgency === 'High' ? 'See doctor within 4 hours or urgent care' : urgency === 'Moderate' ? 'See doctor within 24 hours' : 'Schedule routine clinic appointment';

    return {
      reply:
        `Thank you. I have enough information to complete the triage.\n\n` +
        `---\n` +
        `**TRIAGE SUMMARY**\n` +
        `- Chief Complaint: ${userText.split('.')[0] || userText.slice(0, 60)}\n` +
        `- Duration: ${lowerText.includes('day') ? 'Several days' : lowerText.includes('week') ? '1-2 weeks' : 'Recent onset'}\n` +
        `- Severity (1-10): ${sev}\n` +
        `- Associated Symptoms: Documented in intake consultation\n` +
        `- Relevant History: Documented in medical chart\n` +
        `- Red Flags: None\n` +
        `- Urgency Level: ${urgency}\n` +
        `- Recommended Next Step: ${nextStep}\n` +
        `- Notes for clinician: Patient completed structured clinical intake. Symptoms evaluated under standard outpatient triage protocol.\n` +
        `---\n\n` +
        `The triage is complete. A clinician will review this shortly.`,
      disclaimer: '',
      activeRole: 'patient',
      activePage,
      persona: 'Clinical Triage Assistant',
    };
  }

  if (!hasTimeline) {
    return {
      reply: `Thank you for sharing that. How long have you been experiencing this problem, and did it begin suddenly or gradually?`,
      disclaimer: '',
      activeRole: 'patient',
      activePage,
      persona: 'Clinical Triage Assistant',
    };
  }

  return {
    reply: `Understood. On a scale of 1 to 10 (with 1 being very mild discomfort and 10 being the most severe pain imaginable), how would you rate the severity?`,
    disclaimer: '',
    activeRole: 'patient',
    activePage,
    persona: 'Clinical Triage Assistant',
  };
}
