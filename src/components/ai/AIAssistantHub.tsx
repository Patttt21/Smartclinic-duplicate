/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  User,
  AlertOctagon,
  Info,
  Phone,
  MapPin,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Activity,
  CalendarCheck,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ClipboardList,
  AlertCircle,
  ShieldCheck,
  HeartPulse,
  Pill,
  Building2,
  ShieldAlert,
  FlaskConical,
  Lock,
} from 'lucide-react';
import { EmergencyDisclaimerBanner } from '../common/EmergencyDisclaimerBanner';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { aiService } from '../../services/aiService';
import type { UrgencyBand, Patient, TriageRecord } from '../../types/clinic';

export interface ParsedTriageSummary {
  chiefComplaint: string;
  duration: string;
  severity: string;
  progression: string;
  associatedSymptoms: string;
  previousEpisodes: string;
  redFlags: string;
  urgencyLevel: 'Low' | 'Moderate' | 'High' | 'Emergency';
  recommendedNextStep: string;
  notesForClinician: string;
}

export function parseTriageSummaryCard(text: string): ParsedTriageSummary | null {
  if (!text || !text.includes('TRIAGE SUMMARY')) return null;

  const extractField = (label: string): string => {
    const regex = new RegExp(`(?:^|\\n)\\s*[-*•]?\\s*\\**${label}\\**\\s*:\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const chiefComplaint = extractField('Chief Complaint');
  const duration = extractField('Duration');
  const severity = extractField('Severity \\(1-10\\)') || extractField('Severity');
  const progression = extractField('Progression');
  const associatedSymptoms = extractField('Associated Symptoms');
  const previousEpisodes = extractField('Previous Episodes') || extractField('Relevant History');
  const redFlags = extractField('Red Flags');
  const rawUrgency = extractField('Urgency Level');
  const recommendedNextStep = extractField('Recommended Next Step');
  const notesForClinician = extractField('Notes for clinician') || extractField('Notes for Clinician');

  if (!chiefComplaint && !rawUrgency && !recommendedNextStep) {
    return null;
  }

  let urgencyLevel: 'Low' | 'Moderate' | 'High' | 'Emergency' = 'Low';
  const uLower = rawUrgency.toLowerCase();
  if (uLower.includes('emergency')) urgencyLevel = 'Emergency';
  else if (uLower.includes('high')) urgencyLevel = 'High';
  else if (uLower.includes('mod')) urgencyLevel = 'Moderate';
  else urgencyLevel = 'Low';

  return {
    chiefComplaint: chiefComplaint || 'Patient reported concern',
    duration: duration || 'Recent onset',
    severity: severity || '5',
    progression: progression || 'Stable',
    associatedSymptoms: associatedSymptoms || 'None reported',
    previousEpisodes: previousEpisodes || 'None reported',
    redFlags: redFlags || 'None',
    urgencyLevel,
    recommendedNextStep: recommendedNextStep || 'See clinician for outpatient consultation',
    notesForClinician: notesForClinician || 'Objective outpatient clinical triage summary.',
  };
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isEmergency?: boolean;
  persona?: string;
  parsedTriageSummary?: ParsedTriageSummary;
  triageDetails?: {
    urgencyScore: number;
    urgencyBand: UrgencyBand;
    urgencyLabel: string;
    suggestedSpecialty: string;
    summary: string;
    timelineStarted: string;
    timelineTrajectory: string;
  };
}

// Emergency red flag detector
const EMERGENCY_SYMPTOMS_REGEX =
  /(chest pain|crushing pain|heart attack|hirap huminga|shortness of breath|difficulty breathing|stroke|facial droop|slurred speech|arm weakness|ngiwi|matinding pagdurugo|severe bleeding|uncontrolled bleeding|coughing blood|vomiting blood|unconscious|fainted|loss of consciousness|hinimatay|nawalan ng malay|anaphylaxis|throat swelling|severe allergic reaction|worst headache|thunderclap headache|sudden paralysis|suicid)/i;

export const AIAssistantHub: React.FC = () => {
  const {
    currentUser,
    activeRole,
    primaryRole,
    staffSubRole,
    patients,
    appointments,
    inventory,
    authToken,
    linkedPatientId,
    selectedPatientId,
    selectPatient,
    saveTriageRecord,
    openBookAppointmentWithDraft,
    rescheduleAppointment,
    cancelAppointment,
    setActiveTab,
    language,
    setLanguage,
  } = useClinic();

  // Automatically determine the authenticated user's specialized role
  // (Zero manual role tabs: role is strictly derived from session authentication)
  const userRole: 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'admin' = useMemo(() => {
    if (primaryRole === 'doctor' || activeRole === 'doctor' || currentUser?.role === 'doctor') return 'doctor';
    if (primaryRole === 'admin' || activeRole === 'admin' || currentUser?.role === 'admin') return 'admin';
    if (staffSubRole === 'nurse' || activeRole === 'nurse' || currentUser?.role === 'nurse') return 'nurse';
    if (staffSubRole === 'pharmacist' || activeRole === 'pharmacist' || currentUser?.role === 'pharmacist') return 'pharmacist';
    if (staffSubRole === 'receptionist' || activeRole === 'receptionist' || currentUser?.role === 'receptionist') return 'receptionist';
    if (staffSubRole === 'lab_technician' || activeRole === 'lab_technician' || currentUser?.role === 'lab_technician') return 'lab_technician';
    return 'patient';
  }, [primaryRole, activeRole, staffSubRole, currentUser]);

  const isPatientRole = userRole === 'patient';

  // For Patient: STRICT PRIVACY & SECURITY MEASURES:
  // Patient CANNOT see or pick other patients from a dropdown.
  // The patient context is automatically bound to the authenticated patient record.
  // For Providers (Doctor, Nurse, etc.): allow selecting an enrolled patient in focus.
  const [selectedPatId, setSelectedPatId] = useState<string>(() => {
    if (linkedPatientId) return linkedPatientId;
    if (selectedPatientId && !isPatientRole) return selectedPatientId;
    return '';
  });

  const inFocusPatient: Patient | null = useMemo(() => {
    if (isPatientRole) {
      if (linkedPatientId) {
        const p = patients.find((pat) => pat.id === linkedPatientId);
        if (p) return p;
      }
      if (currentUser?.email) {
        const p = patients.find((pat) => pat.email && pat.email.toLowerCase() === currentUser.email.toLowerCase());
        if (p) return p;
      }
      return patients[0] || null;
    }
    if (!selectedPatId) return null;
    return patients.find((p) => p.id === selectedPatId) || null;
  }, [patients, selectedPatId, isPatientRole, linkedPatientId, currentUser]);

  // Latest Patient Triage for the in-focus patient
  const inFocusTriage: TriageRecord | null = useMemo(() => {
    if (!inFocusPatient?.triageHistory || inFocusPatient.triageHistory.length === 0) return null;
    return inFocusPatient.triageHistory[0];
  }, [inFocusPatient]);

  // Symptom Timeline Parameters (for Patient Triage)
  const [timelineStarted, setTimelineStarted] = useState<string>('1-3 days ago');
  const [timelineTrajectory, setTimelineTrajectory] = useState<'improving' | 'worsening' | 'stable'>('worsening');
  const [previousEpisodes, setPreviousEpisodes] = useState<string>('First time');
  const [emergencyAlertActive, setEmergencyAlertActive] = useState<boolean>(false);
  const [emergencyReason, setEmergencyReason] = useState<string>('');
  const [showParameters, setShowParameters] = useState<boolean>(true);
  const [showRulebookModal, setShowRulebookModal] = useState<boolean>(false);
  const [showERModal, setShowERModal] = useState<boolean>(false);

  // Specialized Greeting based on Authenticated User Role
  const getGreeting = (pat?: Patient | null) => {
    if (userRole === 'doctor') {
      return `SmartClinic Doctor AI Assistant active (Clinical Decision Support).\n\nAttending Physician: ${currentUser?.name || 'Physician'}\n` +
        (pat
          ? `Patient in Focus: ${pat.fullName} (${pat.mrn || 'N/A'})\n\n`
          : `(No patient currently in focus. Select an enrolled patient above to inspect clinical history.)\n\n`) +
        (inFocusTriage
          ? `📊 Connected Patient AI Triage Assessment:\n• Urgency: [${inFocusTriage.urgencyBand.toUpperCase()} — Score ${inFocusTriage.urgencyScore}/10]\n• Chief Reported: "${inFocusTriage.symptoms}" (${inFocusTriage.timelineStarted}, ${inFocusTriage.timelineTrajectory})\n• Suggested Specialty: ${inFocusTriage.suggestedSpecialty}\n\n`
          : '') +
        `I am ready to assist with differential diagnosis suggestions (ICD-10), SOAP clinical consultation notes, and electronic prescription drafting.\n\n*DECISION SUPPORT ONLY: Attending physician retains sole prescribing and diagnostic authority.*`;
    }

    if (userRole === 'nurse') {
      return `SmartClinic Nurse AI Assistant active.\n\nAssisting Staff: ${currentUser?.name || 'Nurse'}\n` +
        (pat
          ? `Patient in Focus: ${pat.fullName} (${pat.mrn || 'N/A'})\n` +
            (inFocusTriage
              ? `📊 Intake Triage: ${inFocusTriage.urgencyBand.toUpperCase()} (Score ${inFocusTriage.urgencyScore}/10) — "${inFocusTriage.symptoms}"\nRecommended Care: ${inFocusTriage.actionRecommended || 'Same-day evaluation'}\n\n`
              : `• No recent intake triage on file for this patient.\n\n`)
          : `(Select a patient from the list above to review vitals and triage status.)\n\n`) +
        `I can analyze vital signs, flag abnormal BP/pulse/temperature, generate pre-consultation nursing prep checklists, and draft SBAR handover notes.`;
    }

    if (userRole === 'receptionist') {
      const waiting = appointments.filter((a) => a.status === 'Checked In').length;
      return `SmartClinic Front Desk & Reception AI Assistant active.\n\n` +
        `• Waiting Room Status: ${waiting} patient(s) waiting in reception\n` +
        `• Appointments Scheduled Today: ${appointments.length} visits\n\n` +
        `I can help check live queue wait times, look up patient records by name or MRN, verify doctor room availability, and assist with intake registration.`;
    }

    if (userRole === 'pharmacist') {
      const allergies = pat?.allergies || [];
      return `SmartClinic Pharmacist AI Assistant & Drug Safety Sentry active.\n\n` +
        (pat
          ? `Patient in Focus: ${pat.fullName} (${pat.mrn || 'N/A'})\n` +
            (allergies.length > 0
              ? `🚨 Documented Allergy Alert: ${allergies.map((a) => `${a.allergen} (${a.severity.toUpperCase()})`).join(', ')}\n\n`
              : `• No documented drug allergies (NKDA).\n\n`)
          : `(Select a patient above to review active electronic prescriptions.)\n\n`) +
        `I can review electronic prescriptions, cross-check drug-drug and drug-allergy interactions, verify dispensary inventory stock, and generate patient counseling notes.`;
    }

    if (userRole === 'lab_technician') {
      return `SmartClinic Diagnostic Pathology AI Assistant active (RMT Decision Support).\n\n` +
        `Medical Technologist: ${currentUser?.name || 'Amina Bautista, RMT'}\n` +
        `Department: Diagnostic Pathology, Hematology & Clinical Chemistry\n` +
        (pat
          ? `Patient in Focus: ${pat.fullName} (${pat.mrn || 'N/A'})\n\n`
          : `\n(Select an accessioned patient from the list above to correlate test orders.)\n\n`) +
        `I can analyze Complete Blood Counts (CBC), blood chemistry panels (CMP, FBS, Lipid Profile), flag critical panic values for urgent clinician notification, and verify quality control calibrations.`;
    }

    if (userRole === 'admin') {
      const lowStock = inventory.filter((i) => i.stockQuantity <= i.reorderLevel).length;
      return `SmartClinic Executive Operations AI active.\n\n` +
        `• Total Enrolled Patients: ${patients.length} records\n` +
        `• Low Stock Inventory Alerts: ${lowStock} item(s) below reorder threshold\n` +
        `• Data Privacy Status: RA 10173 Health Data Compliance Verified\n\n` +
        `I can provide executive operational briefings, department throughput statistics, inventory alerts, and security compliance audits.`;
    }

    // Patient Triage Greeting (Private & Confidential)
    const patientContextLine = pat
      ? `\n\nAuthenticated Patient: ${pat.fullName} (${pat.mrn || 'N/A'})`
      : '';

    return language === 'fil'
      ? `Kumusta po! Ako ang inyong SmartClinic AI Triage Chatbot. Tanging clinical triage lamang po ang aking ginagawa at hindi ako doktor.${patientContextLine}\n\nAno po ang inyong pangunahing problema na nagdala sa inyo rito ngayon? Maaari rin ninyong gamitin ang mga buttons sa itaas para sa Follow-Up, Duration, Progression, at History.`
      : `Hello! I am the SmartClinic AI Triage Chatbot. I only perform triage and I am not a doctor.${patientContextLine}\n\nWhat is the main problem that brought you here today? You can also use the buttons above for Follow-Up, Duration, Progression, and History.`;
  };

  const getPersonaLabel = () => {
    switch (userRole) {
      case 'doctor':
        return 'SmartClinic Doctor AI Assistant';
      case 'nurse':
        return 'SmartClinic Nurse AI Assistant';
      case 'receptionist':
        return 'SmartClinic Front Desk AI';
      case 'pharmacist':
        return 'SmartClinic Pharmacist AI';
      case 'lab_technician':
        return 'SmartClinic Diagnostic Pathology AI';
      case 'admin':
        return 'SmartClinic Executive Admin AI';
      default:
        return 'SmartClinic AI Triage Chatbot';
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: getGreeting(inFocusPatient),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      persona: getPersonaLabel(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, emergencyAlertActive]);

  // When provider changes patient selection
  const handleSelectPatientContext = (patId: string) => {
    if (isPatientRole) return; // Strict security: Patients cannot change patient context
    setSelectedPatId(patId);
    if (patId) selectPatient(patId);
    const pat = patients.find((p) => p.id === patId);
    const triage = pat?.triageHistory?.[0] || null;

    setMessages((prev) => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        sender: 'assistant',
        text: pat
          ? `Patient in focus: ${pat.fullName} (MRN: ${pat.mrn || 'N/A'}).\n` +
            (triage
              ? `Connected Triage Record: [${triage.urgencyBand.toUpperCase()} — Score ${triage.urgencyScore}/10] Reported: "${triage.symptoms}" (${triage.suggestedSpecialty}).`
              : `No previous triage on file for this patient. Ready for clinical consultation.`)
          : 'Patient context cleared. No patient currently selected.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        persona: getPersonaLabel(),
      },
    ]);
  };

  // Main message sender
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const userText = textToSend.trim();
    if (!customText) setInput('');
    setIsLoading(true);

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    const isRedFlagInput = userRole === 'patient' && EMERGENCY_SYMPTOMS_REGEX.test(userText);
    if (isRedFlagInput) {
      setEmergencyAlertActive(true);
      setEmergencyReason(userText);
    }

    try {
      const res = await aiService.sendChatMessage({
        message: userText,
        conversationHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
        context: {
          patientId: inFocusPatient?.id,
          patientName: inFocusPatient?.fullName,
          patient: inFocusPatient,
          allergies: (inFocusPatient?.allergies || []).map((a) => a.allergen),
          chronicConditions: inFocusPatient?.chronicConditions || [],
          latestTriage: inFocusTriage,
          latestVitals: inFocusPatient?.vitalsHistory?.[0] || null,
          timelineStarted,
          timelineTrajectory,
          previousEpisodes,
        },
        role: userRole,
        page: userRole === 'patient' ? 'Triage' : 'Dashboard',
        patientId: inFocusPatient?.id,
        token: authToken,
      });

      const parsed = userRole === 'patient' ? parseTriageSummaryCard(res.reply) : null;
      let triageDetailsObj: any = undefined;

      if (parsed) {
        const isEmergencyLevel = parsed.urgencyLevel === 'Emergency';
        const isHighLevel = parsed.urgencyLevel === 'High';
        const urgencyScore = isEmergencyLevel ? 10 : isHighLevel ? 8 : parsed.urgencyLevel === 'Moderate' ? 5 : 2;
        const urgencyBand: UrgencyBand = isEmergencyLevel || isHighLevel ? 'red' : parsed.urgencyLevel === 'Moderate' ? 'yellow' : 'green';
        const urgencyLabel = isEmergencyLevel
          ? 'Emergency (Immediate ER / 911)'
          : isHighLevel
          ? 'High (7-10): Urgent evaluation required'
          : parsed.urgencyLevel === 'Moderate'
          ? 'Yellow (4-6): Should be seen today'
          : 'Green (1-3): Routine outpatient appointment';

        let specialty = 'General Medicine';
        const compLower = parsed.chiefComplaint.toLowerCase();
        if (compLower.includes('chest') || compLower.includes('heart') || compLower.includes('palpitat') || compLower.includes('blood pressure')) specialty = 'Cardiology';
        else if (compLower.includes('cough') || compLower.includes('breath') || compLower.includes('lung') || compLower.includes('asthma')) specialty = 'Pulmonology';
        else if (compLower.includes('rash') || compLower.includes('skin')) specialty = 'Dermatology';
        else if (compLower.includes('child') || compLower.includes('baby') || compLower.includes('pediat')) specialty = 'Pediatrics';

        const summaryText = `Chief Complaint: ${parsed.chiefComplaint} (Duration: ${parsed.duration}, Severity: ${parsed.severity}/10, Progression: ${parsed.progression}). Urgency: ${parsed.urgencyLevel}. Red flags: ${parsed.redFlags}. Recommended: ${parsed.recommendedNextStep}`;

        if (inFocusPatient?.id) {
          saveTriageRecord(inFocusPatient.id, {
            patientId: inFocusPatient.id,
            patientName: inFocusPatient.fullName,
            symptoms: parsed.chiefComplaint,
            timelineStarted: parsed.duration,
            timelineTrajectory: parsed.progression?.toLowerCase().includes('improv') ? 'improving' : parsed.progression?.toLowerCase().includes('wors') ? 'worsening' : 'stable',
            previousEpisodes: parsed.previousEpisodes || previousEpisodes,
            urgencyScore,
            urgencyBand,
            urgencyLabel,
            suggestedSpecialty: specialty,
            summary: summaryText,
            actionRecommended: parsed.recommendedNextStep,
            isEmergency: isEmergencyLevel || isHighLevel,
            language,
          });
        }

        if (isEmergencyLevel || isHighLevel) {
          setEmergencyAlertActive(true);
          setEmergencyReason(parsed.chiefComplaint);
        }

        triageDetailsObj = {
          urgencyScore,
          urgencyBand,
          urgencyLabel,
          suggestedSpecialty: specialty,
          summary: summaryText,
          timelineStarted: parsed.duration,
          timelineTrajectory: parsed.progression?.toLowerCase().includes('improv') ? 'improving' : parsed.progression?.toLowerCase().includes('wors') ? 'worsening' : 'stable',
        };
      }

      // Synchronize appointment state if scheduling assistant moved, rescheduled, or cancelled
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const replyLower = res.reply.toLowerCase();
      const finalMatch = res.reply.match(/final[:\s]+([A-Za-z0-9\s,\-]+?)(?:[\r\n]|$)/i);
      const isRescheduled = replyLower.includes('rescheduled') || replyLower.includes('moved to the next calendar day');
      const isCancelled =
        replyLower.includes('appointment has been cancelled') ||
        replyLower.includes('appointment was cancelled') ||
        replyLower.includes('appointment has been canceled') ||
        replyLower.includes('appointment was canceled') ||
        (replyLower.includes('appointment for') && replyLower.includes('canceled'));

      if (isRescheduled) {
        const apt = appointments.find((a) =>
          (!inFocusPatient || a.patientId === inFocusPatient.id) &&
          a.status !== 'Completed' &&
          a.status !== 'Cancelled'
        );
        if (apt) {
          const rawFinal = finalMatch ? finalMatch[1].trim() : '';
          const targetDate = rawFinal
            ? (rawFinal.toLowerCase().includes('tomorrow') ? tomorrowStr : rawFinal)
            : (replyLower.includes('tomorrow') ? tomorrowStr : apt.date);
          rescheduleAppointment(apt.id, targetDate, apt.time || '09:30');
        }
      } else if (isCancelled) {
        const apt = appointments.find((a) =>
          (!inFocusPatient || a.patientId === inFocusPatient.id) &&
          a.status !== 'Completed' &&
          a.status !== 'Cancelled'
        );
        if (apt) {
          cancelAppointment(apt.id, 'Cancelled via Smart Clinic Scheduling Assistant');
        }
      }

      const isSchedulingPersona = res.persona?.includes('Scheduling') || replyLower.includes('clinic policy');

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          persona: isSchedulingPersona ? 'Smart Clinic Scheduling Assistant' : getPersonaLabel(),
          isEmergency: parsed?.urgencyLevel === 'Emergency' || parsed?.urgencyLevel === 'High' || res.isEmergency,
          parsedTriageSummary: parsed || undefined,
          triageDetails: triageDetailsObj,
        },
      ]);
    } catch (err) {
      console.error('AI chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookWithTriage = (details: {
    suggestedSpecialty: string;
    urgencyScore: number;
    urgencyBand: UrgencyBand;
    urgencyLabel: string;
    summary: string;
  }) => {
    openBookAppointmentWithDraft({
      specialty: details.suggestedSpecialty,
      urgencyScore: details.urgencyScore,
      urgencyBand: details.urgencyBand,
      urgencyLabel: details.urgencyLabel,
      reason: `AI Triage: ${details.summary}`,
      symptoms: details.summary,
      patientId: inFocusPatient?.id,
    });
  };

  // Follow-Up on Previous Triage button action handler
  const handleFollowUpClick = (action: 'Getting Better' | 'About the Same' | 'Getting Worse' | 'New / Different Symptoms') => {
    if (action === 'Getting Better') {
      setTimelineTrajectory('improving');
      handleSendMessage('Follow-Up: Symptoms are Getting Better');
    } else if (action === 'About the Same') {
      setTimelineTrajectory('stable');
      handleSendMessage('Follow-Up: Symptoms are About the Same');
    } else if (action === 'Getting Worse') {
      setTimelineTrajectory('worsening');
      handleSendMessage('Follow-Up: Symptoms are Getting Worse');
    } else {
      handleSendMessage('Follow-Up: Experiencing New / Different Symptoms');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setEmergencyAlertActive(false);
    setEmergencyReason('');
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        text: getGreeting(inFocusPatient),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        persona: getPersonaLabel(),
      },
    ]);
  };

  // Role Header Metadata
  const roleHeaderMeta = {
    doctor: {
      title: 'SmartClinic Doctor AI Assistant',
      subtitle: 'Clinical Decision Support • Differential Diagnoses (ICD-10) • SOAP Notes • Prescription Safety',
      badge: 'Attending Physician Session',
      icon: Activity,
    },
    nurse: {
      title: 'SmartClinic Nurse AI Assistant',
      subtitle: 'Nursing Care Workflow • Vital Signs Analysis • Pre-Consultation Preparation • SBAR Notes',
      badge: 'Nursing Care Session',
      icon: HeartPulse,
    },
    receptionist: {
      title: 'SmartClinic Front Desk AI Assistant',
      subtitle: 'Queue Operations • Appointment Arrivals & Delays • Consultation Room Availability',
      badge: 'Front Desk Session',
      icon: ClipboardList,
    },
    pharmacist: {
      title: 'SmartClinic Pharmacist AI Assistant',
      subtitle: 'Pharmacotherapy & Drug Safety Sentry • Allergy Interactions • Dispensing Counseling',
      badge: 'Pharmacy Sentry Session',
      icon: Pill,
    },
    lab_technician: {
      title: 'SmartClinic Diagnostic Pathology AI Assistant',
      subtitle: 'Diagnostic Pathology & Laboratory • Panel Interpretation • Critical Panic Values • Specimen QC',
      badge: 'Medical Technologist Session',
      icon: FlaskConical,
    },
    admin: {
      title: 'SmartClinic Executive Admin AI',
      subtitle: 'Clinic Operations • KPI Briefings • Pharmacy Inventory Alerts • Compliance Monitoring',
      badge: 'Executive Intelligence Session',
      icon: Building2,
    },
    patient: {
      title: 'SmartClinic AI Clinical Triage Chatbot',
      subtitle: 'Frontline symptom checking, timeline evaluation, urgency classification, and structured triage summary.',
      badge: 'Clinical Triage Session',
      icon: Stethoscope,
    },
  }[userRole];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto p-3 sm:p-5 space-y-3 font-sans">
      {/* 1. Master Header Card - Dedicated to Authenticated User's Real Role */}
      <div className="bg-white dark:bg-slate-900 px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <SmartClinicLogo className="w-10 h-10 shrink-0" glow={true} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <roleHeaderMeta.icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{roleHeaderMeta.title}</span>
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                <ShieldCheck className="w-3 h-3" />
                <span>{roleHeaderMeta.badge}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              {roleHeaderMeta.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => setShowRulebookModal(true)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Rulebook</span>
          </button>

          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Doctor Decision Support Watermark Banner (Shown to Doctor Role) */}
      {userRole === 'doctor' && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">
              DECISION SUPPORT ONLY: Attending physician retains sole prescribing and diagnostic authority. All differential suggestions and SOAP drafts must be verified by the doctor.
            </span>
          </div>
        </div>
      )}

      {/* 3. PATIENT PRIVACY & SECURITY: Authenticated Patient Dossier Bar (NO PATIENT SELECTOR DROPDOWN) */}
      {isPatientRole && inFocusPatient && (
        <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-teal-50/70 dark:from-teal-950/30 dark:via-slate-900 dark:to-teal-950/30 p-3 sm:p-3.5 rounded-2xl border border-teal-200/70 dark:border-teal-800/50 shadow-xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  {inFocusPatient.fullName}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                  {inFocusPatient.mrn}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {inFocusPatient.age}yo • {inFocusPatient.gender} • Blood: {inFocusPatient.bloodType}
                </span>
                {inFocusPatient.allergies && inFocusPatient.allergies.length > 0 && (
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Allergies: {inFocusPatient.allergies.map((a) => a.allergen).join(', ')}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                🔒 Private Clinical Triage Session • HIPAA & RA 10173 Health Data Privacy Encrypted
              </p>
            </div>
          </div>

          {inFocusTriage && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-teal-200/80 dark:border-teal-800 shadow-2xs self-start sm:self-auto shrink-0">
              <span className={`w-2 h-2 rounded-full ${inFocusTriage.urgencyBand === 'red' ? 'bg-rose-500' : inFocusTriage.urgencyBand === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                Latest Intake: <strong className="text-teal-700 dark:text-teal-300">{inFocusTriage.urgencyBand.toUpperCase()}</strong> ({inFocusTriage.suggestedSpecialty})
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. PROVIDER DOSSIER BAR: Patient in Focus Selector (Shown strictly for clinical providers, NOT for patients) */}
      {!isPatientRole && userRole !== 'admin' && (
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Patient in Focus:</span>
              </span>
              <select
                value={selectedPatId}
                onChange={(e) => handleSelectPatientContext(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="">-- No Patient Selected --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.mrn})
                  </option>
                ))}
              </select>
            </div>

            {/* Real Patient Demographic Tags */}
            {inFocusPatient ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  {inFocusPatient.age}yo {inFocusPatient.gender}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  Blood: {inFocusPatient.bloodType}
                </span>
                {inFocusPatient.allergies && inFocusPatient.allergies.length > 0 ? (
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Allergies: {inFocusPatient.allergies.map((a) => a.allergen).join(', ')}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] text-slate-500">
                    No known drug allergies
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                No patient currently selected. Select a patient above to review records.
              </span>
            )}
          </div>

          {/* Real Triage History Status Indicator (Visible to Doctor, Nurse, Receptionist, Lab Tech) */}
          <div className="flex items-center gap-2 flex-wrap">
            {inFocusTriage ? (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-white text-[11px] ${
                    inFocusTriage.urgencyBand === 'red'
                      ? 'bg-rose-600'
                      : inFocusTriage.urgencyBand === 'yellow'
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                >
                  {inFocusTriage.urgencyScore}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-teal-700 dark:text-teal-300">
                      Patient Triage: {inFocusTriage.urgencyBand.toUpperCase()} ({inFocusTriage.suggestedSpecialty})
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(inFocusTriage.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-xs">
                    &quot;{inFocusTriage.symptoms}&quot;
                  </p>
                </div>
              </div>
            ) : inFocusPatient ? (
              <span className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                No intake triage recorded for this patient
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* 5. Emergency Red Flag Alert Notification Banner */}
      {emergencyAlertActive && (
        <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-lg border border-rose-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase tracking-wider bg-rose-950/50 px-2 py-0.5 rounded">
                  RED FLAG ALERT (EMERGENCY)
                </span>
                <span className="text-xs font-bold">Immediate Medical Care Required</span>
              </div>
              <p className="text-xs mt-0.5 opacity-95">
                Reported: &quot;{emergencyReason}&quot;. Red flag symptoms require immediate physical evaluation at an emergency department.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="tel:911"
              className="px-3.5 py-2 bg-white text-rose-700 hover:bg-rose-50 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Phone className="w-4 h-4" />
              <span>Call 911</span>
            </a>
            <button
              type="button"
              onClick={() => setShowERModal(true)}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-950/60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 border border-white/30 transition cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Trauma Centers</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Patient Symptom Timeline & Follow-Up Configuration (Shown to Patient Role) */}
      {userRole === 'patient' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden shrink-0 transition-all">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                {language === 'fil' ? 'Triage Parameters at Timeline' : 'Symptom Timeline & Follow-Up Parameters'}
              </span>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 hidden sm:inline">
                Confirmed Button Inputs
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowParameters(!showParameters)}
              className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showParameters ? 'Collapse' : 'Configure'}</span>
              {showParameters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showParameters && (
            <div className="p-3.5 space-y-3.5">
              <EmergencyDisclaimerBanner />

              {/* 1. Follow-Up on Previous Triage Buttons */}
              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200/80 dark:border-teal-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Follow-Up on Previous Triage:</span>
                  </span>
                  {inFocusTriage && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Last Intake: {inFocusTriage.symptoms} [{inFocusTriage.urgencyBand.toUpperCase()}]
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: 'Getting Better', emoji: '🟢', desc: 'Note symptoms are improving' },
                    { label: 'About the Same', emoji: '🟡', desc: 'Note no significant change' },
                    { label: 'Getting Worse', emoji: '🔴', desc: 'Note symptoms are worsening' },
                    { label: 'New / Different Symptoms', emoji: '🔄', desc: 'Report new symptoms' },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => handleFollowUpClick(btn.label as any)}
                      title={btn.desc}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 border border-teal-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <span>{btn.emoji}</span>
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Symptom Timeline Parameters Buttons (Duration, Progression, History) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Duration */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      When did symptoms start? (Duration)
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['Today', '1-3 days ago', '1 week ago', 'Over a week'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTimelineStarted(opt)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                          timelineStarted === opt
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progression */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      How are symptoms progressing? (Progression)
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { val: 'worsening', label: 'Getting Worse' },
                      { val: 'stable', label: 'About the Same' },
                      { val: 'improving', label: 'Getting Better' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setTimelineTrajectory(opt.val as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                          timelineTrajectory === opt.val
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* History / Previous Episodes */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Any previous similar episodes? (History)
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['First time', 'Recurring', 'Chronic / Ongoing'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPreviousEpisodes(opt)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                          previousEpisodes === opt
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Main Chat Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 sm:p-5 overflow-y-auto space-y-4"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                  isUser
                    ? 'bg-slate-800 text-white dark:bg-slate-700'
                    : msg.isEmergency
                    ? 'bg-rose-600 text-white animate-pulse'
                    : userRole === 'doctor'
                    ? 'bg-blue-600 text-white'
                    : userRole === 'nurse'
                    ? 'bg-rose-600 text-white'
                    : userRole === 'pharmacist'
                    ? 'bg-purple-600 text-white'
                    : userRole === 'lab_technician'
                    ? 'bg-teal-700 text-white'
                    : userRole === 'receptionist'
                    ? 'bg-amber-600 text-white'
                    : 'bg-teal-600 text-white'
                }`}
              >
                {isUser ? (
                  <User className="w-4 h-4" />
                ) : msg.isEmergency ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs space-y-3 shadow-2xs ${
                  isUser
                    ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-tr-xs shadow-teal-900/10'
                    : msg.isEmergency
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 rounded-tl-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-75">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span>{isUser ? (currentUser?.name || 'User') : (msg.persona || getPersonaLabel())}</span>
                    {msg.isEmergency && (
                      <span className="px-2 py-0.2 bg-rose-600 text-white rounded font-black text-[9px] uppercase tracking-wider">
                        CRITICAL RED FLAG
                      </span>
                    )}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="leading-relaxed whitespace-pre-wrap font-normal text-xs">
                  {msg.text}
                </div>

                {/* Structured Clinical Triage Card (Patient intake) */}
                {!isUser && (() => {
                  const parsedSummary = msg.parsedTriageSummary || parseTriageSummaryCard(msg.text);

                  if (parsedSummary) {
                    const isEmergencyLevel = parsedSummary.urgencyLevel === 'Emergency';
                    const isHighLevel = parsedSummary.urgencyLevel === 'High';
                    const isModLevel = parsedSummary.urgencyLevel === 'Moderate';
                    const urgencyBand: UrgencyBand = isEmergencyLevel || isHighLevel ? 'red' : isModLevel ? 'yellow' : 'green';
                    const urgencyScore = isEmergencyLevel ? 10 : isHighLevel ? 8 : isModLevel ? 5 : 2;

                    let specialty = 'General Medicine';
                    const compLower = parsedSummary.chiefComplaint.toLowerCase();
                    if (compLower.includes('chest') || compLower.includes('heart') || compLower.includes('palpitat') || compLower.includes('blood pressure')) specialty = 'Cardiology';
                    else if (compLower.includes('cough') || compLower.includes('breath') || compLower.includes('lung') || compLower.includes('asthma')) specialty = 'Pulmonology';
                    else if (compLower.includes('rash') || compLower.includes('skin')) specialty = 'Dermatology';
                    else if (compLower.includes('child') || compLower.includes('baby') || compLower.includes('pediat')) specialty = 'Pediatrics';

                    return (
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-500/30 dark:border-teal-500/20 shadow-md space-y-3.5 my-1">
                        {/* Header Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                            <div>
                              <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                                TRIAGE SUMMARY
                              </h3>
                              <span className="text-[10px] text-slate-400">Standardized Outpatient Clinical Protocol</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                                isEmergencyLevel
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-300 animate-pulse'
                                  : isHighLevel
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                                  : isModLevel
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                              }`}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Urgency: {parsedSummary.urgencyLevel}</span>
                            </span>

                            {inFocusPatient && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Saved to EMR Chart</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 10 Standard Clinical Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Chief Complaint
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{parsedSummary.chiefComplaint}</span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Duration
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{parsedSummary.duration}</span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Severity (1-10)
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{parsedSummary.severity}</span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Progression
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{parsedSummary.progression}</span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Associated Symptoms
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{parsedSummary.associatedSymptoms}</span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Previous Episodes
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{parsedSummary.previousEpisodes}</span>
                          </div>

                          <div className={`p-2.5 rounded-xl border ${
                            parsedSummary.redFlags.toLowerCase() !== 'none'
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700'
                          }`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Red Flags
                            </span>
                            <span className="font-bold">{parsedSummary.redFlags}</span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Urgency Level
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{parsedSummary.urgencyLevel}</span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 sm:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                              • Recommended Next Step
                            </span>
                            <span className="font-bold text-teal-800 dark:text-teal-300">{parsedSummary.recommendedNextStep}</span>
                          </div>

                          {parsedSummary.notesForClinician && (
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 sm:col-span-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                                • Notes for clinician
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 italic">{parsedSummary.notesForClinician}</p>
                            </div>
                          )}
                        </div>

                        {/* Concluding Clinical Status Note */}
                        <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>The triage is complete. A clinician will review this shortly.</span>
                          </div>
                        </div>

                        {/* Booking CTA Button (Outpatient scheduling) */}
                        {!isEmergencyLevel && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Auto-suggested consultation: <strong className="text-teal-700 dark:text-teal-300">{specialty}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleBookWithTriage({
                                  suggestedSpecialty: specialty,
                                  urgencyScore,
                                  urgencyBand,
                                  urgencyLabel: `${parsedSummary.urgencyLevel} Urgency`,
                                  summary: `AI Triage: ${parsedSummary.chiefComplaint} (Severity ${parsedSummary.severity}/10). ${parsedSummary.recommendedNextStep}`,
                                })
                              }
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-900/20 cursor-pointer self-start sm:self-auto"
                            >
                              <CalendarCheck className="w-4 h-4" />
                              <span>Book Pre-filled Appointment ({specialty})</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Smart Clinic Scheduling Action CTAs */}
                {!isUser &&
                  (msg.text.toLowerCase().includes('rescheduled to tomorrow') ||
                    msg.text.toLowerCase().includes('appointment has been cancelled') ||
                    msg.text.toLowerCase().includes('book a new appointment for tomorrow') ||
                    msg.text.toLowerCase().includes('global tomorrow booking') ||
                    msg.text.toLowerCase().includes('standard clinic policy') ||
                    msg.text.toLowerCase().includes('clinic policy')) && (
                    <div className="pt-2 pb-1 flex items-center gap-2 flex-wrap">
                      {(msg.text.toLowerCase().includes('rescheduled') ||
                        msg.text.toLowerCase().includes('final:')) && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('appointments')}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          <span>View in Appointments Calendar</span>
                        </button>
                      )}
                      {(msg.text.toLowerCase().includes('cancelled') ||
                        msg.text.toLowerCase().includes('book a new appointment for tomorrow') ||
                        msg.text.toLowerCase().includes('move your appointment to tomorrow')) && (
                        <button
                          type="button"
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const tomorrowDate = tomorrow.toISOString().split('T')[0];
                            openBookAppointmentWithDraft({
                              globalTomorrowBooking: true,
                              preferredDate: tomorrowDate,
                              patientId: inFocusPatient?.id,
                              reason: 'Consultation booking following rescheduling/cancellation',
                            });
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>Book for Tomorrow (Global Slots)</span>
                        </button>
                      )}
                    </div>
                  )}

                {/* Footer Controls & Copy Action */}
                {!isUser && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="italic">
                      {userRole === 'doctor'
                        ? 'Clinical Decision Support Only • Physician Approval Required'
                        : userRole === 'nurse'
                        ? 'Nursing Care Support • Verify Clinical Entries'
                        : userRole === 'pharmacist'
                        ? 'Pharmacotherapy Safety Sentry'
                        : userRole === 'lab_technician'
                        ? 'Diagnostic Pathology Support • RMT Certification Required'
                        : userRole === 'receptionist'
                        ? 'Front Desk & Queue Operations'
                        : userRole === 'admin'
                        ? 'Executive Operations • RA 10173 Compliant'
                        : 'Standardized Clinical Triage Protocol • Never substitute for physical examination'}
                    </span>
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xs shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span>{getPersonaLabel()} is processing context and formulating response...</span>
            </div>
          </div>
        )}
      </div>

      {/* 8. Specialized Action Tray per Authenticated Role */}
      <div className="shrink-0 space-y-2">
        {/* DOCTOR Quick Action Tray */}
        {userRole === 'doctor' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 shrink-0 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Doctor Tools:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage('Review patient triage summary and urgency level')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              ⚡ Review Triage Summary
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Suggest differential diagnoses with ICD-10 codes for this patient')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              💡 Suggest Differentials (ICD-10)
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Draft complete SOAP clinical consultation note for this patient')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📝 Draft SOAP Note
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Suggest electronic prescription regimen and check allergy interactions')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              💊 Suggest Prescription Regimen
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Analyze patient longitudinal history, allergies, and lab trends')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🔍 Analyze History & Labs
            </button>
          </div>
        )}

        {/* NURSE Quick Action Tray */}
        {userRole === 'nurse' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 shrink-0 flex items-center gap-1">
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Nurse Actions:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage('Analyze current patient vital signs and flag abnormal readings')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🩺 Analyze Vitals & Flag Abnormals
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Generate pre-consultation nursing preparation checklist for this patient')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📋 Pre-Consultation Prep Checklist
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Review patient triage result, urgency level, and priority queue')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              ⚡ Review Triage Urgency Level
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Draft SBAR nursing handover note for attending physician')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📝 SBAR Nursing Note
            </button>
          </div>
        )}

        {/* LAB TECHNICIAN Quick Action Tray */}
        {userRole === 'lab_technician' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 shrink-0 flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Lab Tools:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage('Interpret Complete Blood Count (CBC) and CMP lab panel with reference intervals')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-teal-50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🔬 Interpret Lab Panel & Ranges
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Check for critical panic alert values and immediate clinician notification protocols')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-teal-50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              ⚠️ Critical Panic Value Protocol
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Check pending laboratory test orders and specimen queue status')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-teal-50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📋 Pending Specimen Queue
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Verify automated analyzer daily quality control (QC) and reagent calibrations')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-teal-50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🧪 Analyzer QC & Calibrations
            </button>
          </div>
        )}

        {/* RECEPTIONIST Quick Action Tray */}
        {userRole === 'receptionist' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 shrink-0 flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Front Desk:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage("Show today's appointment queue, arrival status, and estimated wait times")}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              👥 Today&apos;s Queue & Wait Times
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Check doctor availability and consultation room allocations for today')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🏥 Doctor Rooms & Availability
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('New patient intake registration checklist and insurance verification')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📝 Intake Registration Checklist
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(`Find patient record details for ${inFocusPatient?.fullName || 'selected patient'}`)}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🔍 Patient Record Lookup
            </button>
          </div>
        )}

        {/* PHARMACIST Quick Action Tray */}
        {userRole === 'pharmacist' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 shrink-0 flex items-center gap-1">
              <Pill className="w-3.5 h-3.5" />
              <span>Pharmacy Sentry:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage('Run drug-allergy and drug-drug interaction safety audit for this patient')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-purple-50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              ⚠️ Run Drug-Allergy & Interaction Audit
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Generate patient medication dispensing and counseling notes with food/timing rules')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-purple-50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📋 Patient Dispensing & Counseling Notes
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Check pharmacy stock inventory availability for prescribed medicines')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-purple-50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📦 Inventory Stock Check
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(`Review all active electronic prescriptions for ${inFocusPatient?.fullName || 'patient'}`)}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-purple-50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🏷️ Review Active Prescriptions
            </button>
          </div>
        )}

        {/* ADMIN Quick Action Tray */}
        {userRole === 'admin' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Admin Intel:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage('Generate executive daily clinic briefing and operational throughput')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📊 Executive Daily Clinic Briefing
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Check pharmacy inventory low stock and reorder priority alerts')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              📦 Low Stock Inventory Alert
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Staff shift coverage and consultation room utilization report')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              👥 Staff Shifts & Room Utilization
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Verify RA 10173 Health Data Privacy compliance and audit log status')}
              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold transition shrink-0 cursor-pointer shadow-2xs"
            >
              🛡️ RA 10173 Compliance Audit
            </button>
          </div>
        )}

        {/* PATIENT Smart Clinic Scheduling Assistant Quick Chips */}
        {userRole === 'patient' && !emergencyAlertActive && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 shrink-0 flex items-center gap-1">
              <CalendarCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Scheduling Assistant:</span>
            </span>
            {[
              {
                label: 'Ex 1: Jun 10 → Jun 11 (Same-Day Move)',
                prompt: 'Original: Jun 10\nRequest: reschedule to Jun 10',
              },
              {
                label: 'Ex 2: Oct 25 → Oct 26',
                prompt: 'Original: Oct 25\nRequest: reschedule to Oct 26',
              },
              {
                label: 'Ex 3: Dec 18 → Cancel & Book Tomorrow',
                prompt: 'Original: Dec 18\nRequest: cancel and book tomorrow',
              },
              {
                label: 'Reschedule Today → Move to Tomorrow',
                prompt: 'I need to reschedule my appointment for today',
              },
              {
                label: 'Cancel & Book Tomorrow (Global)',
                prompt: 'I want to cancel my appointment and book tomorrow',
              },
              {
                label: 'Move to Another Slot Today?',
                prompt: 'Can I move my appointment from today to another slot today?',
              },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleSendMessage(chip.prompt)}
                className="px-2.5 py-1 bg-teal-50/80 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-2xs"
              >
                📅 {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* PATIENT Quick Symptom Chips */}
        {userRole === 'patient' && !emergencyAlertActive && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 shrink-0">
              {language === 'fil' ? 'Mga Sintomas:' : 'Quick Symptoms:'}
            </span>
            {[
              language === 'fil' ? 'Mataas na Lagnat' : 'High Fever',
              language === 'fil' ? 'Paninikip ng Dibdib' : 'Chest Tightness',
              language === 'fil' ? 'Matinding Sakit ng Ulo' : 'Severe Headache',
              language === 'fil' ? 'Ubo at Sipon' : 'Persistent Cough',
              language === 'fil' ? 'Nahihilo / Pagsusuka' : 'Dizziness / Nausea',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-300 rounded-xl border border-teal-200 dark:border-teal-800 font-semibold transition shrink-0 cursor-pointer shadow-2xs"
              >
                + {chip}
              </button>
            ))}
          </div>
        )}

        {/* Unified Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 shrink-0"
        >
          <div className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-xl text-[10px] font-bold border border-teal-200 dark:border-teal-800 shrink-0 flex items-center gap-1.5">
            <roleHeaderMeta.icon className="w-3.5 h-3.5" />
            <span>{roleHeaderMeta.badge}</span>
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              userRole === 'doctor'
                ? 'Ask for differential diagnoses (ICD-10), SOAP note draft, or prescription recommendations...'
                : userRole === 'nurse'
                ? 'Check patient vitals, ask for pre-consultation prep checklist, or draft nursing notes...'
                : userRole === 'receptionist'
                ? "Inquire about today's queue, appointment delays, patient records, or intake registration..."
                : userRole === 'pharmacist'
                ? 'Review drug interactions, verify patient allergies, or draft dispensing instructions...'
                : userRole === 'lab_technician'
                ? 'Inquire about test panel interpretation, reference ranges, critical panic values, or QC calibration...'
                : userRole === 'admin'
                ? 'Request clinic KPI briefing, inventory reorder alerts, staff shifts, or compliance audit...'
                : language === 'fil'
                ? 'Ipasok ang chief complaint details, severity (1-10), iba pang sintomas, o red flags...'
                : 'Enter chief complaint details, severity (1-10), other symptoms, or red flags...'
            }
            className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 dark:text-slate-100"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{language === 'fil' && userRole === 'patient' ? 'Ipadala' : 'Send'}</span>
          </button>
        </form>
      </div>

      {/* Emergency Trauma Centers Modal */}
      {showERModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden font-sans my-auto text-xs text-slate-800 dark:text-slate-100">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50 dark:bg-rose-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-950 dark:text-rose-100">
                    Emergency Trauma Centers & 24/7 ER Directory
                  </h3>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Metro Manila & National Emergency Services
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowERModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <span className="font-black text-rose-900 dark:text-rose-200 block">National Emergency Hotline</span>
                  <span className="text-slate-600 dark:text-slate-400 text-[11px]">Free nationwide emergency dispatch</span>
                </div>
                <a
                  href="tel:911"
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call 911</span>
                </a>
              </div>

              {[
                { name: 'Philippine General Hospital (PGH) Trauma Center', address: 'Taft Avenue, Ermita, Manila', phone: '(02) 8554-8400' },
                { name: "St. Luke's Medical Center - Global City ER", address: '32nd St, BGC, Taguig', phone: '(02) 8789-7700' },
                { name: 'Makati Medical Center Emergency Department', address: 'Amorsolo St, Makati City', phone: '(02) 8888-8999' },
                { name: 'Philippine Heart Center Emergency Care', address: 'East Avenue, Diliman, QC', phone: '(02) 8925-2401' },
              ].map((hosp, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">{hosp.name}</h4>
                    <p className="text-[11px] text-slate-500">{hosp.address}</p>
                  </div>
                  <a
                    href={`tel:${hosp.phone.replace(/\D/g, '')}`}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-100 font-bold rounded-xl text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>{hosp.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Protocol Rulebook Modal */}
      {showRulebookModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden font-sans my-auto text-xs text-slate-800 dark:text-slate-100">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-teal-50 dark:bg-teal-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-teal-950 dark:text-teal-100">
                    SmartClinic AI Assistant Specifications
                  </h3>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300">
                    Role-Gated Clinical & Operational Directives
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRulebookModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 max-h-[65vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  1. Automatic Role Gating & Security Isolation
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  Each user automatically receives the AI Assistant tailored to their authenticated role (Doctor, Nurse, Receptionist, Pharmacist, Lab Technician, Admin, or Patient) without manual role-switching tabs.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  2. Patient Privacy & Data Protection (RA 10173)
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  On the Patient Triage interface, patient selectors are completely removed. Patients only have access to their own confidential triage session and medical record.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  3. Connected Patient AI Triage Flow
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  When patients perform AI Triage, their urgency score, symptoms, and timeline are recorded to the EMR. Attending Doctors, Nurses, and Lab Techs immediately view this connected triage assessment when opening the patient&apos;s chart.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  4. Doctor Decision Support Directive
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  Doctor AI suggestions (ICD-10 differentials, SOAP drafts, prescription recommendations) are clinical decision support only. The attending physician retains sole diagnostic and prescribing authority.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  5. Patient Emergency Red Flag Rule
                </h4>
                <p className="text-slate-600 dark:text-slate-300">
                  Severe chest pain, difficulty breathing, severe bleeding, sudden weakness, stroke symptoms, altered consciousness, severe allergic reaction, or suicidal thoughts immediately set Urgency = Emergency with instructions to call 911 or proceed to an ER.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRulebookModal(false)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
