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
    auditLogs: true,
    aiAssistant: true,
  },
  doctor: {
    dashboard: true,
    patients: true,
    appointments: true,
    queue: true,
    triage: false,
    consultations: true,
    emr: true,
    prescriptions: true,
    pharmacy: false,
    laboratory: true,
    billing: false,
    reports: false,
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
    reports: false,
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
    reports: false,
    auditLogs: false,
    aiAssistant: true,
  },
  patient: {
    dashboard: true,
    patients: false,
    appointments: true,
    queue: true,
    triage: false,
    consultations: false,
    emr: true,
    prescriptions: true,
    pharmacy: false,
    laboratory: true,
    billing: true,
    reports: false,
    auditLogs: false,
    aiAssistant: true,
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subRole?: string;
  avatar?: string;
  department?: string;
  specialty?: string;
  licenseNumber?: string;
  phone?: string;
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

export interface Vitals {
  id?: string;
  recordedAt: string;
  recordedBy: string;
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
  timelineStarted: string; // e.g. "Today", "1-3 days ago", "1 week ago", "Weeks/months ago"
  timelineTrajectory: 'improving' | 'worsening' | 'stable';
  previousEpisodes: string; // e.g. "First time", "Recurring", "Chronic/ongoing"
  urgencyScore: number; // 1 to 10
  urgencyBand: UrgencyBand;
  urgencyLabel: string; // e.g. "Green (1-3): Can wait for regular appointment", etc.
  suggestedSpecialty: string; // e.g. "Cardiology", "Pulmonology", "General Medicine"
  summary: string;
  actionRecommended: string;
  isEmergency: boolean;
  language: 'en' | 'fil';
  followUpStatus?: string;
}

export interface Patient {
  id: string;
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

export type ClinicBranch = 'Main Outpatient Clinic' | 'Annex Satellite Clinic';

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
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  branch?: ClinicBranch;
  date: string; // YYYY-MM-DD (Asia/Manila)
  time: string; // HH:mm
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  type: 'In-Person' | 'Telehealth' | 'Follow-up' | 'Emergency' | 'Consultation' | 'Check-up' | 'Walk-In';
  isWalkIn?: boolean;
  isSynthetic?: boolean;
  rescheduledFromId?: string;
  serviceCategory?: string;
  checkInAt?: string;
  calledAt?: string;
  calledAcknowledgedAt?: string;
  completedAt?: string;
  noShowMarkedAt?: string;
  staffOverrideBy?: string;
  staffOverrideReason?: string;
  queueNumber?: string;
  room?: string;
  notes?: string;
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  genericName: string;
  dosage: string;
  frequency: string; // e.g. "Twice daily after meals"
  route: 'Oral' | 'Sublingual' | 'Topical' | 'Inhalation' | 'Intravenous' | 'Intramuscular';
  duration: string; // e.g. "7 days"
  quantity: number;
  instructions: string;
  dispensed?: boolean;
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
  date: string;
  items: PrescriptionItem[];
  status: 'Active' | 'Dispensed' | 'Partially Dispensed' | 'Discontinued';
  aiSafetyAudit?: {
    checkedAt: string;
    warnings: string[];
    safe: boolean;
  };
  notes?: string;
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
  testName: string;
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Endocrinology' | 'Urinalysis' | 'Imaging';
  urgency: 'Routine' | 'Urgent' | 'STAT';
  status: 'Requested' | 'Sample Collected' | 'Processing' | 'Result Available' | 'Reviewed' | 'Completed';
  requestedAt: string;
  collectedAt?: string;
  completedAt?: string;
  notes?: string;
  results?: LabResultItem[];
  interpretation?: string;
  aiSummary?: string;
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
  lastUpdated: string;
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
  coverageRate: number; // percentage (e.g. 100 for 100% or 80)
  contactHotline: string;
  portalUrl?: string;
  status: 'Active Partner' | 'Under Review' | 'Suspended';
}

export interface HMOClaim {
  partnerId?: string;
  partnerName: string; // e.g. Maxicare, Intellicare, Medicard, PhilCare, PhilHealth Konsulta
  memberId: string;
  loaNumber: string; // Letter of Authorization / Approval Code
  coverageAmount: number; // Amount covered by HMO
  patientShare: number; // Out-of-pocket / co-pay
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
  referenceNumber?: string; // For GCash / Maya / Bank Transfer / Card Auth Code
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
