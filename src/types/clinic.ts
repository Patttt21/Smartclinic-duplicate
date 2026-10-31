export type UserRole = 
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'lab_technician'
  | 'patient';

export interface UserPermissions {
  dashboard: boolean;
  patients: boolean;
  appointments: boolean;
  queue: boolean;
  triage: boolean;
  consultations: boolean;
  emr: boolean;
  prescriptions: boolean;
  pharmacy: boolean; // Medication inventory, stock, dispensing
  laboratory: boolean;
  billing: boolean;
  reports: boolean;
  predictiveAnalytics?: boolean;
  auditLogs: boolean;
  aiAssistant: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    dashboard: true,
    patients: true,
    appointments: true,
    queue: true,
    triage: true,
    consultations: true,
    emr: true,
    prescriptions: true,
    pharmacy: true,
    laboratory: true,
    billing: true,
    reports: true,
    predictiveAnalytics: true,
    auditLogs: true,
    aiAssistant: true,
  },
  doctor: {
    dashboard: true,
    patients: true,
    appointments: true,
    queue: false,
    triage: false,
    consultations: true,
    emr: true,
    prescriptions: true,
    pharmacy: true,
    laboratory: true,
    billing: false,
    reports: false,
    predictiveAnalytics: true,
    auditLogs: false,
    aiAssistant: true,
  },
  nurse: {
    dashboard: true,
    patients: true,
    appointments: true,
    queue: true,
    triage: true,
    consultations: true,
    emr: false,
    prescriptions: false,
    pharmacy: false,
    laboratory: true,
    billing: false,
    reports: false,
    predictiveAnalytics: true,
    auditLogs: false,
    aiAssistant: true,
  },
  receptionist: {
    dashboard: true,
    patients: true,
    appointments: true,
    queue: true,
    triage: true,
    consultations: false,
    emr: false,
    prescriptions: false,
    pharmacy: false,
    laboratory: false,
    billing: true,
    reports: false,
    predictiveAnalytics: true,
    auditLogs: false,
    aiAssistant: true,
  },
  pharmacist: {
    dashboard: true,
    patients: false,
    appointments: false,
    queue: false,
    triage: false,
    consultations: false,
    emr: false,
    prescriptions: true,
    pharmacy: true,
    laboratory: false,
    billing: false,
    reports: true,
    predictiveAnalytics: false,
    auditLogs: false,
    aiAssistant: true,
  },
  lab_technician: {
    dashboard: true,
    patients: false,
    appointments: false,
    queue: false,
    triage: false,
    consultations: false,
    emr: false,
    prescriptions: false,
    pharmacy: false,
    laboratory: true,
    billing: false,
    reports: true,
    predictiveAnalytics: false,
    auditLogs: false,
    aiAssistant: true,
  },
  patient: {
    dashboard: true,
    patients: false,
    appointments: true,
    queue: false,
    triage: false,
    consultations: true,
    emr: true,
    prescriptions: true,
    pharmacy: false,
    laboratory: true,
    billing: true,
    reports: false,
    predictiveAnalytics: false,
    auditLogs: false,
    aiAssistant: true,
  },
};

export type ClinicBranch = 'Main Outpatient Clinic' | 'Annex Satellite Clinic';

export type ConsultationMode = 'In-Person' | 'Online Consultation';

export interface User {
  id: string;
  authUserId?: string;
  name: string;
  email: string;
  role: UserRole;
  subRole?: string;
  avatar?: string;
  department?: string;
  specialty?: string;
  licenseNumber?: string;
  phone?: string;
  branches?: ClinicBranch[];
  consultationModes?: ConsultationMode[];
  workDays?: number[];
  workDaysLabel?: string;
  hoursLabel?: string;
  startHour?: number;
  endHour?: number;
  schedule?: any;
  status?: 'Active' | 'On Leave' | 'Inactive';
  notes?: string;
  credentials?: string;
  temporaryPassword?: string;
  accessCode?: string;
  permissions?: UserPermissions;
  createdAt?: string;
  updatedAt?: string;
}

export type VitalsSource = 'nurse-intake' | 'doctor-consultation' | 'patient-reported';

export interface Vitals {
  id?: string;
  recordedAt: string;
  recordedBy: string;
  recordedById?: string;
  recordedByRole?: UserRole;
  appointmentId?: string;
  source?: VitalsSource;
  isPatientReported?: boolean;
  bloodPressureSystolic: number; // mmHg
  bloodPressureDiastolic: number; // mmHg
  heartRate: number; // bpm
  respiratoryRate: number; // breaths/min
  temperature: number; // °C
  oxygenSaturation: number; // %
  height: number; // cm
  weight: number; // kg
  bmi: number; // kg/m²
  notes?: string;
}

export interface Allergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
}

export type UrgencyBand = 'green' | 'yellow' | 'red';

export interface TriageRecord {
  id: string;
  patientId: string;
  patientName?: string;
  timestamp: string;
  symptoms: string;
  timelineStarted: string;
  timelineTrajectory: 'improving' | 'worsening' | 'stable';
  previousEpisodes: string;
  urgencyScore: number;
  urgencyBand: UrgencyBand;
  urgencyLabel: string;
  suggestedSpecialty: string;
  summary: string;
  actionRecommended: string;
  isEmergency: boolean;
  language: 'en' | 'fil';
  followUpStatus?: string;
}

export interface Patient {
  id: string;
  authUserId?: string;
  mrn: string; // Medical Record Number e.g. MRN-2026-081
  fullName: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies: Allergy[];
  chronicConditions: string[];
  currentMedications: string[];
  primaryDoctorId: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  createdAt: string;
  vitalsHistory: Vitals[];
  tags?: string[];
  avatar?: string;
  triageHistory?: TriageRecord[];
}

export type SymptomConsultationCategory =
  | 'Fever-related Consultations'
  | 'Cough-related Consultations'
  | 'Respiratory-symptom Consultations'
  | 'Headache-related Consultations'
  | 'Cardiovascular / Hypertension'
  | 'Metabolic / Endocrine'
  | 'General Outpatient Checkup'
  | 'Dermatologic Consultations';

export type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Checked In'
  | 'Called'
  | 'In Consultation'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export interface Appointment {
  id: string;
  bookingReference?: string;
  qrToken?: string;
  qrPayload?: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  specialty?: string;
  branch?: ClinicBranch;
  date: string; // YYYY-MM-DD (Asia/Manila)
  time: string; // HH:mm
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  type: 'In-Person' | 'Online Consultation' | 'Telehealth' | 'Follow-up' | 'Emergency' | 'Consultation' | 'Check-up' | 'Walk-In';
  consultationMode?: ConsultationMode;
  isWalkIn?: boolean;
  isSynthetic?: boolean;
  rescheduledFromId?: string;
  serviceCategory?: string;
  confirmedAt?: string;
  checkInAt?: string;
  checkedInBy?: string;
  calledAt?: string;
  calledBy?: string;
  calledAcknowledgedAt?: string;
  consultationStartedAt?: string;
  completedAt?: string;
  noShowMarkedAt?: string;
  noShowMarkedBy?: string;
  staffOverrideBy?: string;
  staffOverrideReason?: string;
  nurseVitalsRecorded?: boolean;
  nurseVitalsRecordedAt?: string;
  nurseVitalsRecordedBy?: string;
  teleconsultRoomId?: string;
  teleconsultStatus?: 'Scheduled' | 'Waiting' | 'Active' | 'Ended';
  reminder24hSentAt?: string;
  reminder2hSentAt?: string;
  queueNumber?: string;
  room?: string;
  notes?: string;
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  inventoryItemId?: string;
  medicationName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  route: 'Oral' | 'Sublingual' | 'Topical' | 'Inhalation' | 'Intravenous' | 'Intramuscular';
  duration: string;
  quantity: number;
  dispensedQuantity?: number;
  remainingQuantity?: number;
  instructions: string;
  dispensed?: boolean;
  dispensedAt?: string;
  dispensedBy?: string;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientAge: number;
  patientGender: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorLicense: string;
  consultationId?: string;
  appointmentId?: string;
  branch?: ClinicBranch;
  date: string;
  items: PrescriptionItem[];
  status: 'Active' | 'Dispensed' | 'Partially Dispensed' | 'Discontinued';
  dispensedAt?: string;
  dispensedBy?: string;
  aiSafetyAudit?: {
    checkedAt: string;
    warnings: string[];
    safe: boolean;
  };
  notes?: string;
}

export type LabOrderStatus =
  | 'Requested'
  | 'Sample Collected'
  | 'Processing'
  | 'Encoded'
  | 'Verified'
  | 'Released'
  | 'Result Available'
  | 'Reviewed'
  | 'Completed';

export interface LabAmendmentEntry {
  id: string;
  amendedAt: string;
  amendedBy: string;
  reason: string;
  previousSummary: string;
}

export interface LabTestOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  consultationId?: string;
  appointmentId?: string;
  branch?: ClinicBranch;
  testName: string;
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Endocrinology' | 'Urinalysis' | 'Imaging';
  urgency: 'Routine' | 'Urgent' | 'STAT';
  status: LabOrderStatus;
  requestedAt: string;
  patientVerifiedAt?: string;
  patientVerifiedBy?: string;
  specimenId?: string;
  specimenType?: string;
  collectedAt?: string;
  collectedBy?: string;
  processedAt?: string;
  processedBy?: string;
  encodedAt?: string;
  encodedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  releasedAt?: string;
  releasedBy?: string;
  completedAt?: string;
  isPreliminary?: boolean;
  notes?: string;
  results?: LabResultItem[];
  interpretation?: string;
  aiSummary?: string;
  amendmentHistory?: LabAmendmentEntry[];
}

export interface LabResultItem {
  parameter: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface Consultation {
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  consultationMode?: ConsultationMode;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems?: string;
  physicalExamination: string;
  vitals?: Vitals;
  diagnoses: {
    code: string; // ICD code
    description: string;
    type: 'Primary' | 'Secondary';
  }[];
  treatmentPlan: string;
  prescriptionsCreated?: string[]; // IDs
  labOrdersCreated?: string[]; // IDs
  followUpDate?: string;
  followUpInstructions?: string;
  referral?: {
    specialty: string;
    reason: string;
    facility?: string;
  };
  medicalCertificateIssued?: boolean;
  certificateDetails?: {
    diagnosis: string;
    leaveStartDate: string;
    leaveEndDate: string;
    recommendation: string;
  };
  branch?: ClinicBranch;
  symptomCategories?: SymptomConsultationCategory[];
  isSynthetic?: boolean;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  genericName: string;
  brand: string;
  category: 'Antibiotics' | 'Analgesics' | 'Cardiovascular' | 'Antidiabetic' | 'Respiratory' | 'Vitamins' | 'Medical Supplies';
  batchNumber: string;
  expirationDate: string;
  supplier: string;
  stockQuantity: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  unit: 'Tablets' | 'Capsules' | 'Bottles' | 'Vials' | 'Boxes' | 'Packs' | 'Inhalers' | 'Pieces';
  location: string;
  branch?: ClinicBranch;
  lastUpdated: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  sku: string;
  medicationName: string;
  type: 'DISPENSE' | 'RESTOCK' | 'ADJUSTMENT';
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  prescriptionId?: string;
  prescriptionNumber?: string;
  prescriptionItemId?: string;
  patientId?: string;
  patientName?: string;
  performedById: string;
  performedByName: string;
  branch?: ClinicBranch;
  notes?: string;
  timestamp: string;
}

export interface RestockRequest {
  id: string;
  requestNumber: string;
  inventoryItemId: string;
  sku: string;
  medicationName: string;
  currentStock: number;
  reorderLevel: number;
  requestedQuantity: number;
  unit: string;
  supplier: string;
  branch: ClinicBranch;
  status: 'Pending Approval' | 'Approved' | 'Received' | 'Cancelled';
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  fulfilledAt?: string;
  fulfilledByName?: string;
  notes?: string;
}

export interface NotificationPreferences {
  patientId: string;
  emailEnabled: boolean;
  webPushEnabled: boolean;
  smsEnabled: boolean;
  reminder24hEnabled: boolean;
  reminder2hEnabled: boolean;
  consentUpdatedAt: string;
}

export interface ReminderDeliveryLog {
  id: string;
  appointmentId: string;
  bookingReference?: string;
  patientId: string;
  reminderType: 'BOOKING_CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_2H' | 'RESCHEDULE_NOTICE' | 'CANCELLATION_NOTICE';
  channel: 'in_app' | 'email' | 'web_push' | 'sms';
  status: 'DELIVERED_IN_APP' | 'SENT' | 'SKIPPED_UNCONFIGURED_PROVIDER' | 'SKIPPED_PREFERENCE_DISABLED' | 'FAILED';
  providerNote: string;
  scheduledForManila?: string;
  attemptedAt: string;
}

export interface ClinicOperationalSettings {
  noShowGraceMinutes: number;
  inactivityTimeoutSeconds: number;
  inactivityWarningSeconds: number;
  allowOnlineConsultations: boolean;
  defaultReminder24h: boolean;
  defaultReminder2h: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'Consultation' | 'Laboratory' | 'Pharmacy' | 'Procedure' | 'Other';
  quantity: number;
  unitPrice: number;
  total: number;
}

export type PaymentMethod =
  | 'Cash'
  | 'GCash'
  | 'Credit Card'
  | 'Debit Card'
  | 'Insurance'
  | 'Bank Transfer'
  | 'Maya';

export type HMOClaimStatus =
  | 'Pending Verification'
  | 'Approved'
  | 'Claim Submitted'
  | 'Reimbursed'
  | 'Rejected';

export interface HMOPartner {
  id: string;
  name: string;
  code: string;
  accreditationNumber: string;
  coverageRate: number;
  contactHotline: string;
  portalUrl?: string;
  status: 'Active Partner' | 'Under Review' | 'Suspended';
}

export interface HMOClaim {
  partnerId?: string;
  partnerName: string;
  memberId: string;
  loaNumber: string;
  coverageAmount: number;
  patientShare: number;
  claimStatus: HMOClaimStatus;
  approvedDate?: string;
  verifiedBy?: string;
  remarks?: string;
}

export interface PaymentDetails {
  method: PaymentMethod;
  amountPaid: number;
  tenderedAmount?: number;
  changeAmount?: number;
  referenceNumber?: string;
  paymentDate: string;
  cashierName?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Cancelled' | 'HMO Pending' | 'HMO Approved';
  paymentMethod?: PaymentMethod;
  paymentDetails?: PaymentDetails;
  paymentDate?: string;
  paidAt?: string;
  insuranceClaimStatus?: 'Not Filed' | 'Pending' | 'Approved' | 'Rejected';
  hmoClaim?: HMOClaim;
  notes?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  recipientId?: string;
  recipientRole?: UserRole | 'all' | 'provider';
  recipientEmail?: string;
  patientId?: string;
  doctorId?: string;
  email?: string;
  targetRole?: 'patient' | 'provider' | 'admin' | 'all';
  title: string;
  message: string;
  content?: string;
  category?: 'appointment' | 'lab' | 'prescription' | 'inventory' | 'billing' | 'system' | 'triage' | 'security' | 'queue_call';
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  timestamp?: string;
  createdAt?: string;
  acknowledgedAt?: string;
  queueNumber?: string;
  room?: string;
  designatedRoom?: string;
  appointmentId?: string;
  appointmentStatus?: AppointmentStatus;
  read: boolean;
  link?: string;
  actionUrl?: string;
  relatedResourceId?: string;
  relatedResourceType?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resourceType: 'Patient' | 'Appointment' | 'Consultation' | 'Prescription' | 'Laboratory' | 'Inventory' | 'Billing' | 'Security' | 'System';
  resourceId: string;
  description: string;
  ipAddress?: string;
}

