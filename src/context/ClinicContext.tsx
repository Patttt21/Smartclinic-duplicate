import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../lib/config';
import {
  Patient, User, UserRole, UserPermissions, DEFAULT_ROLE_PERMISSIONS, Appointment, AppointmentStatus, Consultation,
  Prescription, LabTestOrder, LabResultItem, InventoryItem, Invoice, InvoiceItem,
  Notification, AuditLog, Vitals, TriageRecord, UrgencyBand,
  PaymentMethod, HMOClaimStatus, HMOPartner, HMOClaim, PaymentDetails,
  InventoryTransaction, RestockRequest, ClinicOperationalSettings, NotificationPreferences, ReminderDeliveryLog
} from '../types/clinic';
import {
  INITIAL_PATIENTS, INITIAL_USERS, INITIAL_APPOINTMENTS, INITIAL_CONSULTATIONS,
  INITIAL_PRESCRIPTIONS, INITIAL_LAB_ORDERS, INITIAL_INVENTORY, INITIAL_INVOICES,
  INITIAL_NOTIFICATIONS, INITIAL_AUDIT_LOGS, PHILIPPINE_HMO_PARTNERS,
  INITIAL_INVENTORY_TRANSACTIONS, INITIAL_RESTOCK_REQUESTS
} from '../data/mockData';
import {
  syncPatientToSupabase, syncAppointmentToSupabase, syncConsultationToSupabase,
  syncPrescriptionToSupabase, syncLabOrderToSupabase, syncInventoryItemToSupabase,
  syncInvoiceToSupabase, syncAuditLogToSupabase, syncAllClinicDataToSupabase,
  getSupabaseConfigInfo, isSupabaseConfigured, getSupabaseClient,
} from '../lib/supabase';
import { formatTimeSlot, createCustomDoctorSchedule, registerDoctorSchedule, getDoctorSchedule, normalizeTimeTo24Hour } from '../utils/doctorSchedules';
import { applyReschedulingRule, DEFAULT_NO_SHOW_GRACE_MINUTES, type RescheduleComparisonResult } from '../utils/schedulingRules';
import { showLocalBrowserQueueNotification } from '../services/pushNotificationClient';

import { getTranslation, type AppLanguage, type Translations } from '../utils/translations';

export type PrimaryAuthRole = 'patient' | 'staff' | 'doctor' | 'admin';
export type StaffSubRole = 'nurse' | 'pharmacist' | 'receptionist' | 'lab_technician';

export interface LoginCredentials {
  primaryRole: PrimaryAuthRole;
  email: string;
  password?: string;
  subRole?: StaffSubRole;
  twoFactorCode?: string;
  phone?: string;
  method?: 'email' | 'phone' | 'authenticator';
  fullName?: string;
  isRegister?: boolean;
  // Patient Intake EMR fields for complete medical chart
  dob?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  address?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  chronicConditions?: string;
}

export type PendingAction = 'book' | 'queue' | null;

export interface PatientAccount {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  patientId: string;
}

export interface TriageBookingDraft {
  specialty?: string;
  department?: string;
  urgencyScore?: number;
  urgencyBand?: UrgencyBand;
  urgencyLabel?: string;
  reason?: string;
  symptoms?: string;
  recommendedDoctorId?: string;
  patientId?: string;
  preferredDate?: string;
  globalTomorrowBooking?: boolean;
}

interface ClinicContextType {
  currentUser: User;
  activeRole: UserRole;
  switchRole: (role: UserRole) => void;
  users: User[];
  primaryRole: PrimaryAuthRole | null;
  staffSubRole: StaffSubRole | null;
  isAuthenticated: boolean;
  authReady: boolean;
  authToken: string | null;
  login: (credentials: LoginCredentials) => Promise<{
    success: boolean;
    error?: string;
    requires2FA?: boolean;
    twoFactorRequired?: boolean;
  }>;
  logout: (redirectTab?: string) => void;
  addDoctor: (doctorData: {
    name: string;
    email: string;
    department: string;
    specialty: string;
    licenseNumber: string;
    phone?: string;
    workDays: number[];
    startHour?: number;
    endHour?: number;
    workDaysLabel?: string;
    hoursLabel?: string;
    status?: 'Active' | 'On Leave' | 'Inactive';
    notes?: string;
  }) => Promise<{ success: boolean; doctor?: User; error?: string }>;
  updateDoctor: (doctorId: string, updates: {
    name: string;
    email: string;
    department: string;
    specialty: string;
    licenseNumber: string;
    phone?: string;
    workDays?: number[];
    startHour?: number;
    endHour?: number;
    workDaysLabel?: string;
    hoursLabel?: string;
    status?: 'Active' | 'On Leave' | 'Inactive';
    notes?: string;
  }) => Promise<{ success: boolean; doctor?: User; error?: string }>;
  addClinicalStaff: (staffData: {
    name: string;
    role: 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';
    department: string;
    email: string;
    phone?: string;
    licenseNumber?: string;
    credentials?: string;
    temporaryPassword?: string;
    status?: 'Active' | 'On Leave' | 'Inactive';
    notes?: string;
  }) => Promise<{ success: boolean; staff?: User; error?: string }>;
  updateClinicalStaff: (staffId: string, updates: {
    name: string;
    role: 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';
    department: string;
    email: string;
    phone?: string;
    licenseNumber?: string;
    credentials?: string;
    temporaryPassword?: string;
    status?: 'Active' | 'On Leave' | 'Inactive';
    notes?: string;
  }) => Promise<{ success: boolean; staff?: User; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (userId: string, newStatus: 'Active' | 'On Leave' | 'Inactive') => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  getUserPermissions: (user?: User | null) => UserPermissions;
  updateUserPermissions: (userId: string, permissions: Partial<UserPermissions>) => void;
  resetUserPermissionsToRole: (userId: string, role?: UserRole) => void;
  checkTwoFactorStatus: (email: string) => Promise<{ enabled: boolean }>;
  enableTwoFactor: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  disableTwoFactor: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  pendingAction: PendingAction;
  setPendingAction: (action: PendingAction) => void;
  requestPhoneOtp: (phone: string, purpose?: 'patient_login' | 'patient_register') => Promise<{ success: boolean; error?: string; code?: string; liveDispatched?: boolean; devNotice?: string; provider?: string; message?: string }>;
  requestEmailOtp: (email: string, purpose?: 'patient_login' | 'patient_register' | 'admin_2fa') => Promise<{ success: boolean; error?: string; code?: string; liveDispatched?: boolean; devNotice?: string; previewUrl?: string; provider?: string; message?: string }>;
  verifyServerOtp: (input: { channel: 'email' | 'sms'; destination: string; code: string }) => Promise<{ success: boolean; error?: string }>;
  registerPatient: (input: { fullName: string; email?: string; phone?: string; password?: string }) => { success: boolean; error?: string };
  linkedPatientId: string | null;
  currentPatient: Patient | null;
  visiblePatients: Patient[];
  myAppointments: Appointment[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isNavigating: boolean;
  navigatingTargetTitle: string;
  patients: Patient[];
  allStaffPatients: Patient[];
  selectedPatientId: string | null;
  selectedPatient: Patient | null;
  selectPatient: (id: string | null) => void;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'mrn'>) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  addVitals: (patientId: string, vitals: Omit<Vitals, 'id' | 'recordedAt'>) => void;
  saveTriageRecord: (patientId: string, record: Omit<TriageRecord, 'id' | 'timestamp'>) => TriageRecord;
  triageDraftForBooking: TriageBookingDraft | null;
  setTriageDraftForBooking: (draft: TriageBookingDraft | null) => void;
  isBookAppointmentOpen: boolean;
  setIsBookAppointmentOpen: (open: boolean) => void;
  openBookAppointmentWithDraft: (draft: TriageBookingDraft) => void;
  appointments: Appointment[];
  allClinicAppointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Appointment;
  updateAppointmentStatus: (id: string, status: AppointmentStatus, room?: string, customNotes?: string) => void;
  acknowledgeCalledAppointment: (appointmentId: string) => Promise<void>;
  noShowGraceMinutes: number;
  setNoShowGraceMinutes: (mins: number) => void;
  wsConnected: boolean;
  cancelAppointment: (id: string, reason?: string) => void;
  updateAppointmentRoom: (id: string, room: string) => void;
  checkInPatient: (appointmentId: string, room?: string) => void;
  advanceQueueStatus: (appointmentId: string, nextStatus: AppointmentStatus, room?: string) => void;
  rescheduleAppointment: (id: string, newDate: string, newTime: string) => RescheduleComparisonResult;
  consultations: Consultation[];
  addConsultation: (consultation: Omit<Consultation, 'id'>) => Consultation;
  prescriptions: Prescription[];
  addPrescription: (prescription: Omit<Prescription, 'id' | 'prescriptionNumber'>) => Prescription;
  dispenseMedication: (prescriptionId: string, itemId: string) => void;
  labOrders: LabTestOrder[];
  addLabOrder: (order: Omit<LabTestOrder, 'id' | 'orderNumber' | 'requestedAt'>) => LabTestOrder;
  updateLabStatus: (orderId: string, status: LabTestOrder['status']) => void;
  enterLabResults: (orderId: string, results: LabResultItem[], interpretation?: string, aiSummary?: string) => void;
  inventory: InventoryItem[];
  adjustStock: (itemId: string, quantityChange: number, reason: string) => void;
  invoices: Invoice[];
  hmoPartners: HMOPartner[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => Invoice;
  payInvoice: (invoiceId: string, amount: number, method: Invoice['paymentMethod']) => void;
  payInvoiceWithDetails: (invoiceId: string, amount: number, details: PaymentDetails) => void;
  updateHMOClaim: (invoiceId: string, claimData: Partial<HMOClaim>) => void;
  processHMOApproval: (invoiceId: string, loaNumber: string, approvedAmount: number, remarks?: string) => void;
  syncClinicalOrdersToInvoice: (params: {
    patientId: string;
    patientName: string;
    patientMrn: string;
    consultationFee?: number;
    doctorName?: string;
    labItems?: { name: string; price: number }[];
    rxItems?: { name: string; price: number; quantity: number }[];
    procedureItems?: { name: string; price: number }[];
    hmoPartner?: string;
  }) => Invoice;
  notifications: Notification[];
  allNotifications: Notification[];
  unreadNotificationCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Notification;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  auditLogs: AuditLog[];
  logAction: (action: string, resourceType: AuditLog['resourceType'], resourceId: string, description: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  supabaseInfo: { isConfigured: boolean; url: string; domain: string; hasKey: boolean };
  syncAllToSupabase: () => Promise<{ success: boolean; syncedCounts: Record<string, number>; message: string }>;
  refreshSupabaseConfig: () => void;
  syncClinicFromBackend: () => Promise<void>;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
  showSessionWarning: boolean;
  sessionSecondsRemaining: number;
  sessionTimeoutTotal: number;
  resetSessionTimer: () => void;
  setActiveClinicalSessionProtected: (active: boolean) => void;
  inventoryTransactions: InventoryTransaction[];
  restockRequests: RestockRequest[];
  clinicSettings: ClinicOperationalSettings;
  notificationPreferences: NotificationPreferences | null;
  reminderLogs: ReminderDeliveryLog[];
  createAppointmentVerified: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<{ success: boolean; appointment?: Appointment; qrPayload?: string; error?: string }>;
  verifyAppointmentQr: (qrPayload: string, confirmCheckIn?: boolean, room?: string) => Promise<{
    success: boolean;
    checkedIn?: boolean;
    alreadyCheckedIn?: boolean;
    appointment?: Appointment;
    patientSummary?: { id: string; fullName: string; mrn: string; dob?: string; age?: number; gender?: string; phone?: string };
    error?: string;
  }>;
  recordPatientVitals: (
    patientId: string,
    vitals: Partial<Vitals> & { appointmentId?: string; isPatientReported?: boolean; source?: Vitals['source'] }
  ) => Promise<{ success: boolean; vitals?: Vitals; error?: string }>;
  dispensePrescription: (
    prescriptionId: string,
    items?: { itemId: string; quantityToDispense: number }[],
    notes?: string
  ) => Promise<{ success: boolean; prescription?: Prescription; transactions?: InventoryTransaction[]; lowStockAlerts?: string[]; error?: string }>;
  updateReorderThreshold: (itemId: string, reorderLevel: number) => Promise<{ success: boolean; error?: string }>;
  createRestockRequest: (input: { inventoryItemId: string; requestedQuantity: number; supplier?: string; notes?: string }) => Promise<{ success: boolean; request?: RestockRequest; error?: string }>;
  updateRestockRequest: (requestId: string, input: { action: 'approve' | 'receive' | 'cancel'; receivedQuantity?: number; batchNumber?: string; expirationDate?: string }) => Promise<{ success: boolean; error?: string }>;
  advanceLabWorkflow: (
    orderId: string,
    payload: {
      action: 'verify-patient' | 'collect-sample' | 'start-processing' | 'encode-results' | 'verify-and-release' | 'amend-result' | 'doctor-acknowledge';
      specimenType?: string;
      specimenId?: string;
      results?: LabResultItem[];
      interpretation?: string;
      notes?: string;
      reason?: string;
    }
  ) => Promise<{ success: boolean; order?: LabTestOrder; error?: string }>;
  updateClinicSettings: (updates: Partial<ClinicOperationalSettings>) => Promise<{ success: boolean; settings?: ClinicOperationalSettings; error?: string }>;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => Promise<{ success: boolean; preferences?: NotificationPreferences; error?: string }>;
  runScheduledRemindersNow: () => Promise<{ success: boolean; evaluatedCount?: number; dispatchedCount?: number; skippedCount?: number; error?: string }>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const GUEST_USER: User = {
  id: 'guest',
  name: 'Guest User',
  email: '',
  role: 'patient',
  avatar: '',
  department: 'Outpatient Services',
};

const CLINIC_CACHE_VERSION = 'v5.0.0-smartclinic-v2-master';

try {
  if (typeof window !== 'undefined') {
    const currentVersion = localStorage.getItem('smart_clinic_cache_version');
    if (currentVersion !== CLINIC_CACHE_VERSION) {
      localStorage.removeItem('smart_clinic_users');
      localStorage.removeItem('smart_clinic_audit_logs');
      localStorage.setItem('smart_clinic_cache_version', CLINIC_CACHE_VERSION);
    }
  }
} catch {}

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('smart_clinic_users');
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        const map = new Map<string, User>();
        INITIAL_USERS.forEach((u) => map.set(u.id, { ...u, permissions: u.permissions || { ...DEFAULT_ROLE_PERMISSIONS[u.role] } }));
        parsed.forEach((u) => {
          const base = map.get(u.id);
          const role = u.role || base?.role || 'patient';
          const perms = u.permissions || base?.permissions || { ...DEFAULT_ROLE_PERMISSIONS[role] };
          map.set(u.id, { ...(base || {}), ...u, permissions: perms });
        });
        return Array.from(map.values());
      }
    } catch {}
    return INITIAL_USERS;
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/doctors`)
      .then((res) => res.json())
      .then((serverDoctors) => {
        if (Array.isArray(serverDoctors) && serverDoctors.length > 0) {
          serverDoctors.forEach((d: User) => {
            if (d.role === 'doctor') {
              registerDoctorSchedule(d.id, getDoctorSchedule(d.id, d));
            }
          });
          setUsers((prev) => {
            const map = new Map<string, User>();
            prev.forEach((u) => map.set(u.id, u));
            serverDoctors.forEach((d: User) => map.set(d.id, d));
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('smart_clinic_users', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);
  const [activeRole, setActiveRole] = useState<UserRole>('patient');
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [primaryRole, setPrimaryRole] = useState<PrimaryAuthRole | null>(null);
  const [staffSubRole, setStaffSubRole] = useState<StaffSubRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(null);
  const [triageDraftForBooking, setTriageDraftForBooking] = useState<TriageBookingDraft | null>(null);
  const [isBookAppointmentOpen, setIsBookAppointmentOpen] = useState<boolean>(false);

  const openBookAppointmentWithDraft = useCallback((draft: TriageBookingDraft) => {
    setTriageDraftForBooking(draft);
    setIsBookAppointmentOpen(true);
  }, []);

  // Global Language state locked to English ('en')
  const [language, setLanguageState] = useState<AppLanguage>('en');

  const setLanguage = (_lang: AppLanguage) => {
    setLanguageState('en');
    try {
      localStorage.setItem('smart_clinic_language', 'en');
    } catch {}
  };

  const t = useMemo(() => getTranslation('en'), []);

  const [clinicSettings, setClinicSettings] = useState<ClinicOperationalSettings>({
    id: 'default',
    noShowGraceMinutes: DEFAULT_NO_SHOW_GRACE_MINUTES,
    inactivityTimeoutSeconds: 600,
    inactivityWarningSeconds: 60,
    reminder24hEnabled: true,
    reminder2hEnabled: false,
    branches: ['Main Outpatient Clinic', 'Annex Satellite Clinic'],
  });

  const [activeClinicalSessionProtected, setActiveClinicalSessionProtected] = useState<boolean>(false);
  const activeClinicalProtectedRef = React.useRef<boolean>(false);
  activeClinicalProtectedRef.current = activeClinicalSessionProtected;

  // Session Timeout (Auto Logout): Configurable 10-minute (600s) default across ALL roles
  // with 1-minute (60s) warning, cross-tab sync, and active form/camera/teleconsult protection.
  const lastActivityRef = React.useRef<number>(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState<boolean>(false);
  const showSessionWarningRef = React.useRef<boolean>(false);
  showSessionWarningRef.current = showSessionWarning;

  const getTimeoutSeconds = useCallback(() => {
    const secs = Number(clinicSettings?.inactivityTimeoutSeconds || 600);
    return Math.max(120, Math.min(3600, secs));
  }, [clinicSettings?.inactivityTimeoutSeconds]);

  const [sessionTimeoutTotal, setSessionTimeoutTotal] = useState<number>(() => 600);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState<number>(() => 600);
  const lastServerHeartbeatRef = React.useRef<number>(0);

  const logoutRef = React.useRef<(redirectTab?: string) => void>(() => {});

  const sendServerSessionHeartbeat = useCallback(() => {
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      if (!token) return;
      lastServerHeartbeatRef.current = Date.now();
      fetch(`${API_BASE_URL}/api/auth/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } catch {}
  }, [authToken]);

  const resetSessionTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem('smart_clinic_last_activity_ts', String(now));
    } catch {}
    setShowSessionWarning(false);
    const totalSecs = getTimeoutSeconds();
    setSessionTimeoutTotal(totalSecs);
    setSessionSecondsRemaining(totalSecs);
    sendServerSessionHeartbeat();
  }, [getTimeoutSeconds, sendServerSessionHeartbeat]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowSessionWarning(false);
      return;
    }

    const totalSecs = getTimeoutSeconds();
    const warningSecs = Math.max(30, Math.min(180, Number(clinicSettings?.inactivityWarningSeconds || 60)));
    setSessionTimeoutTotal(totalSecs);
    setSessionSecondsRemaining(totalSecs);
    lastActivityRef.current = Date.now();
    lastServerHeartbeatRef.current = Date.now();

    let lastLoggedActivity = Date.now();
    const handleUserActivity = () => {
      if (showSessionWarningRef.current) {
        return;
      }
      const now = Date.now();
      if (now - lastLoggedActivity > 500) {
        lastLoggedActivity = now;
        lastActivityRef.current = now;
        try {
          localStorage.setItem('smart_clinic_last_activity_ts', String(now));
        } catch {}
      }
      if (now - lastServerHeartbeatRef.current > 45_000) {
        sendServerSessionHeartbeat();
      }
    };

    const handleCrossTabStorage = (ev: StorageEvent) => {
      if (ev.key === 'smart_clinic_last_activity_ts' && ev.newValue) {
        const ts = Number(ev.newValue);
        if (Number.isFinite(ts) && ts > lastActivityRef.current) {
          lastActivityRef.current = ts;
          setShowSessionWarning(false);
        }
      }
    };

    const events = ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'wheel', 'click', 'input'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    window.addEventListener('storage', handleCrossTabStorage);

    const interval = setInterval(() => {
      const now = Date.now();
      // Protect active form typing, consultation note authoring, QR camera scanning, or active Online Consultation
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const isActivelyEditingField =
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLInputElement &&
          activeEl.type !== 'checkbox' &&
          activeEl.type !== 'radio' &&
          activeEl.value.trim().length > 0 &&
          activeEl.closest('[role="dialog"], form') !== null);

      if (activeClinicalProtectedRef.current || isActivelyEditingField) {
        lastActivityRef.current = now;
        setShowSessionWarning(false);
        setSessionSecondsRemaining(getTimeoutSeconds());
        if (now - lastServerHeartbeatRef.current > 45_000) {
          sendServerSessionHeartbeat();
        }
        return;
      }

      const timeoutSecs = getTimeoutSeconds();
      const elapsedSecs = Math.max(0, Math.floor((now - lastActivityRef.current) / 1000));
      const remainingSecs = Math.max(0, timeoutSecs - elapsedSecs);

      setSessionTimeoutTotal(timeoutSecs);
      setSessionSecondsRemaining(remainingSecs);

      if (remainingSecs <= 0) {
        setShowSessionWarning(false);
        logoutRef.current('login');
      } else if (remainingSecs <= warningSecs) {
        setShowSessionWarning(true);
      } else {
        setShowSessionWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      window.removeEventListener('storage', handleCrossTabStorage);
      clearInterval(interval);
    };
  }, [isAuthenticated, getTimeoutSeconds, clinicSettings?.inactivityWarningSeconds, sendServerSessionHeartbeat]);

  const [patientAccounts, setPatientAccounts] = useState<PatientAccount[]>(() => {
    try {
      const saved = localStorage.getItem('smart_clinic_patient_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeTab, setActiveTabState] = useState<string>('home');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTargetTitle, setNavigatingTargetTitle] = useState('Smart Clinic Homepage');

  const TAB_TITLES: Record<string, string> = {
    home: 'Smart Clinic Homepage',
    login: 'Secure Healthcare Authentication',
    dashboard: 'Clinic Dashboard',
    patients: 'Patient Directory',
    appointments: 'Appointment Calendar',
    queue: 'Live Queue & Waiting Room',
    consultations: 'Doctor Consultation Suite',
    emr: 'Medical Records (EMR)',
    prescriptions: 'Pharmacy & e-Prescriptions',
    laboratory: 'Diagnostic Pathology & Lab',
    inventory: 'Medication Formulary & Stock',
    billing: 'Billing & Payments',
    reports: 'Reports & Analytics',
    'predictive-analytics': 'Predictive Analytics & Risk Stratification',
    'ai-assistant': 'Smart Clinic AI Assistant',
    'audit-logs': 'Audit Logs & Compliance',
    notifications: 'Notifications & Clinical Alerts',
  };

  const setActiveTab = (tab: string) => {
    if (tab === activeTab) return;
    setNavigatingTargetTitle(TAB_TITLES[tab] || 'Clinic Workspace');
    setIsNavigating(true);
    setTimeout(() => {
      setActiveTabState(tab);
      setTimeout(() => setIsNavigating(false), 180);
    }, 280);
  };

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('smart_clinic_patients');
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('pat-1');

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('smart_clinic_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    const saved = localStorage.getItem('smart_clinic_consultations');
    return saved ? JSON.parse(saved) : INITIAL_CONSULTATIONS;
  });

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const saved = localStorage.getItem('smart_clinic_prescriptions');
    const raw: Prescription[] = saved ? JSON.parse(saved) : INITIAL_PRESCRIPTIONS;
    return raw.map((rx, rxIdx) => ({
      ...rx,
      id: rx.id || `rx-${rxIdx}`,
      items: (rx.items || []).map((it, itIdx) => ({
        ...it,
        id: it.id || `rx-item-${rx.id || rx.prescriptionNumber || rxIdx}-${itIdx}`,
      })),
    }));
  });

  const [labOrders, setLabOrders] = useState<LabTestOrder[]>(() => {
    const saved = localStorage.getItem('smart_clinic_lab_orders');
    return saved ? JSON.parse(saved) : INITIAL_LAB_ORDERS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('smart_clinic_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('smart_clinic_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [hmoPartners, setHmoPartners] = useState<HMOPartner[]>(() => {
    const saved = localStorage.getItem('smart_clinic_hmo_partners');
    return saved ? JSON.parse(saved) : PHILIPPINE_HMO_PARTNERS;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('smart_clinic_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('smart_clinic_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('smart_clinic_inventory_tx');
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY_TRANSACTIONS;
    } catch {
      return INITIAL_INVENTORY_TRANSACTIONS;
    }
  });

  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>(() => {
    try {
      const saved = localStorage.getItem('smart_clinic_restock_requests');
      return saved ? JSON.parse(saved) : INITIAL_RESTOCK_REQUESTS;
    } catch {
      return INITIAL_RESTOCK_REQUESTS;
    }
  });

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [reminderLogs, setReminderLogs] = useState<ReminderDeliveryLog[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persist clinic data with strict Smart Clinic namespacing
  useEffect(() => { localStorage.setItem('smart_clinic_patients', JSON.stringify(patients)); }, [patients]);
  useEffect(() => { localStorage.setItem('smart_clinic_patient_accounts', JSON.stringify(patientAccounts)); }, [patientAccounts]);
  useEffect(() => { localStorage.setItem('smart_clinic_appointments', JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem('smart_clinic_consultations', JSON.stringify(consultations)); }, [consultations]);
  useEffect(() => { localStorage.setItem('smart_clinic_prescriptions', JSON.stringify(prescriptions)); }, [prescriptions]);
  useEffect(() => { localStorage.setItem('smart_clinic_lab_orders', JSON.stringify(labOrders)); }, [labOrders]);
  useEffect(() => { localStorage.setItem('smart_clinic_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('smart_clinic_inventory_tx', JSON.stringify(inventoryTransactions)); }, [inventoryTransactions]);
  useEffect(() => { localStorage.setItem('smart_clinic_restock_requests', JSON.stringify(restockRequests)); }, [restockRequests]);
  useEffect(() => { localStorage.setItem('smart_clinic_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('smart_clinic_hmo_partners', JSON.stringify(hmoPartners)); }, [hmoPartners]);
  useEffect(() => { localStorage.setItem('smart_clinic_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('smart_clinic_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);

  // High-speed bidirectional synchronization with backend API
  const syncClinicFromBackend = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      if (!token) return;
      const headers: Record<string, string> = {
        'x-user-role': activeRole,
        'x-background-poll': '1',
        Authorization: `Bearer ${token}`,
      };
      if (linkedPatientId) headers['x-linked-patient-id'] = linkedPatientId;

      const res = await fetch(`${API_BASE_URL}/api/clinic/sync`, { headers });
      if (res.status === 401 && isAuthenticated && token) {
        logoutRef.current('login');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.status === 'synced') {
        if (Array.isArray(data.patients) && data.patients.length > 0) {
          setPatients((prev) => {
            const map = new Map<string, Patient>();
            data.patients.forEach((p: Patient) => map.set(p.id, p));
            prev.forEach((p) => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            return Array.from(map.values());
          });
        }
        if (Array.isArray(data.appointments)) {
          setAppointments((prev) => {
            const prevMap = new Map<string, Appointment>(prev.map((a) => [a.id, a]));
            const merged = data.appointments.map((incoming: Appointment) => {
              const local = prevMap.get(incoming.id);
              if (!local) return incoming;
              // Trust authoritative server queue transitions (including 'Called', 'In Consultation', 'Completed', 'No Show', 'Cancelled')
              return {
                ...local,
                ...incoming,
                room: incoming.room || local.room,
                notes: incoming.notes ?? local.notes,
                queueNumber: incoming.queueNumber || local.queueNumber,
                calledAt: incoming.calledAt || local.calledAt,
                calledAcknowledgedAt: incoming.calledAcknowledgedAt || local.calledAcknowledgedAt,
              };
            });
            const incomingIds = new Set(data.appointments.map((a: Appointment) => a.id));
            prev.forEach((local) => {
              if (!incomingIds.has(local.id)) {
                // Only retain local appointments that were created very recently (<60s) in-flight
                const isRecent = local.createdAt && (Date.now() - new Date(local.createdAt).getTime() < 60000);
                if (isRecent) {
                  merged.unshift(local);
                }
              }
            });
            return merged;
          });
        }
        if (Array.isArray(data.consultations)) {
          setConsultations(data.consultations);
        }
        if (Array.isArray(data.prescriptions)) {
          const normalized = data.prescriptions.map((rx: any, rxIdx: number) => ({
            ...rx,
            id: rx.id || `rx-${rxIdx}`,
            items: (rx.items || []).map((it: any, itIdx: number) => ({
              ...it,
              id: it.id || `rx-item-${rx.id || rx.prescriptionNumber || rxIdx}-${itIdx}`,
            })),
          }));
          setPrescriptions(normalized);
        }
        if (Array.isArray(data.labOrders)) {
          setLabOrders(data.labOrders);
        }
        if (Array.isArray(data.inventory) && data.inventory.length > 0) {
          setInventory(data.inventory);
        }
        if (Array.isArray(data.inventoryTransactions)) {
          setInventoryTransactions(data.inventoryTransactions);
        }
        if (Array.isArray(data.restockRequests)) {
          setRestockRequests(data.restockRequests);
        }
        if (data.clinicSettings && typeof data.clinicSettings === 'object') {
          setClinicSettings((prev) => ({ ...prev, ...data.clinicSettings }));
          if (typeof data.clinicSettings.noShowGraceMinutes === 'number') {
            setNoShowGraceMinutesState(data.clinicSettings.noShowGraceMinutes);
          }
        }
        if (data.notificationPreferences && typeof data.notificationPreferences === 'object') {
          setNotificationPreferences(data.notificationPreferences);
        }
        if (Array.isArray(data.reminderLogs)) {
          setReminderLogs(data.reminderLogs);
        }
        if (Array.isArray(data.invoices)) {
          setInvoices(data.invoices);
        }
        if (Array.isArray(data.auditLogs) && activeRole !== 'patient') {
          setAuditLogs(data.auditLogs);
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          try {
            localStorage.setItem('smart_clinic_users', JSON.stringify(data.users));
          } catch {}
          data.users.forEach((u: User) => {
            if (u.role === 'doctor') {
              registerDoctorSchedule(u.id, getDoctorSchedule(u.id, u));
            }
          });
          if (activeRole === 'admin' || primaryRole === 'admin') {
            const adminUser = data.users.find((u: User) => u.role === 'admin');
            if (adminUser) setCurrentUser(adminUser);
          }
        } else if (Array.isArray(data.doctors) && data.doctors.length > 0) {
          data.doctors.forEach((d: User) => {
            registerDoctorSchedule(d.id, getDoctorSchedule(d.id, d));
          });
          setUsers((prev) => {
            const map = new Map<string, User>();
            prev.forEach((u) => map.set(u.id, u));
            data.doctors.forEach((d: User) => map.set(d.id, d));
            return Array.from(map.values());
          });
        }
      }
    } catch {
      // Offline fallback silent
    }
  }, [authToken, activeRole, linkedPatientId]);

  // Trigger sync on boot, role switch, tab visibility, and periodic refresh
  useEffect(() => {
    syncClinicFromBackend();
    const interval = setInterval(syncClinicFromBackend, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncClinicFromBackend();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncClinicFromBackend]);

  // Session recovery on app startup
  useEffect(() => {
    try {
      const token = localStorage.getItem('smart_clinic_token');
      const raw = localStorage.getItem('smart_clinic_auth_session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.isAuthenticated && s.primaryRole) {
          setIsAuthenticated(true);
          setAuthToken(token || null);
          setPrimaryRole(s.primaryRole);
          setStaffSubRole(s.staffSubRole || null);
          setLinkedPatientId(s.linkedPatientId || null);
          const userRole = (s.activeRole || (s.primaryRole === 'staff' ? (s.staffSubRole || 'nurse') : s.primaryRole)) as UserRole;
          setActiveRole(userRole);
          const perms = s.permissions || { ...DEFAULT_ROLE_PERMISSIONS[userRole] };
          setCurrentUser({
            id: s.userId || 'session-user',
            name: s.userName || 'User',
            email: s.userEmail || '',
            role: userRole,
            permissions: perms,
          });
          if (s.linkedPatientId) setSelectedPatientId(s.linkedPatientId);
        }
      }
    } catch {
      localStorage.removeItem('smart_clinic_auth_session');
      localStorage.removeItem('smart_clinic_token');
    } finally {
      setAuthReady(true);
    }
  }, []);

  // Sync session state to storage
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated || !primaryRole) {
      localStorage.removeItem('smart_clinic_auth_session');
      localStorage.removeItem('smart_clinic_token');
      return;
    }
    try {
      localStorage.setItem('smart_clinic_auth_session', JSON.stringify({
        isAuthenticated: true,
        primaryRole,
        staffSubRole,
        linkedPatientId,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        activeRole,
        permissions: currentUser.permissions,
      }));
      if (authToken) {
        localStorage.setItem('smart_clinic_token', authToken);
      }
    } catch { /* ignore */ }
  }, [authReady, isAuthenticated, primaryRole, staffSubRole, linkedPatientId, currentUser, activeRole, authToken]);

  const logAction = (
    action: string,
    resourceType: AuditLog['resourceType'],
    resourceId: string,
    description: string,
    explicitToken?: string
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: activeRole,
      action,
      resourceType,
      resourceId,
      description,
      ipAddress: '127.0.0.1',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    syncAuditLogToSupabase(newLog);

    try {
      const token = explicitToken || authToken || localStorage.getItem('smart_clinic_token');
      if (token) {
        fetch(`${API_BASE_URL}/api/audit-logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newLog),
        }).catch(() => {});
      }
    } catch {}
  };

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
    const matched = users.find((u) => u.role === role) || users[0];
    setCurrentUser(matched);
    if (role === 'patient') setSelectedPatientId('pat-1');
    logAction('ROLE_SWITCH', 'Security', matched.id, `Perspective switched to role: ${role}`);
  };

  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
  const simpleHash = (value: string) => {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
    return `h${h.toString(16)}`;
  };

  const requestPhoneOtp = async (phone: string, purpose: 'patient_login' | 'patient_register' = 'patient_login') => {
    const digits = normalizePhone(phone);
    if (digits.length < 10) return { success: false, error: 'Enter a valid mobile phone number (at least 10 digits).' };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to dispatch verification code.' };
      }
      return data;
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return { success: false, error: isAbort ? 'SMS gateway request timed out. Please retry.' : err?.message || 'Network error communicating with SMS gateway.' };
    }
  };

  const requestEmailOtp = async (
    email: string,
    purpose: 'patient_login' | 'patient_register' | 'admin_2fa' = 'patient_login'
  ) => {
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm.includes('@')) return { success: false, error: 'Enter a valid email address.' };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNorm, purpose }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to dispatch verification code to email.',
        };
      }
      return data;
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return {
        success: false,
        error: isAbort ? 'Email gateway connection timed out during cold start. Please retry.' : err?.message || 'Network error communicating with email gateway.',
      };
    }
  };

  const verifyServerOtp = async (input: { channel: 'email' | 'sms'; destination: string; code: string }) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'OTP verification failed.' };
      }
      return { success: true };
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return { success: false, error: isAbort ? 'Verification request timed out. Please try again.' : err?.message || 'Network error verifying code.' };
    }
  };

  const finishPatientSession = (accountId: string, fullName: string, email: string, patientId: string, token?: string) => {
    const patientUser: User = { id: accountId, name: fullName, email, role: 'patient' };
    setCurrentUser(patientUser);
    setActiveRole('patient');
    setPrimaryRole('patient');
    setStaffSubRole(null);
    setIsAuthenticated(true);
    setLinkedPatientId(patientId);
    setSelectedPatientId(patientId);
    if (token) {
      setAuthToken(token);
      try {
        localStorage.setItem('smart_clinic_token', token);
      } catch {}
    }
    setActiveTab(pendingAction === 'book' ? 'home' : pendingAction === 'queue' ? 'queue' : 'dashboard');
    logAction('AUTH_LOGIN', 'Security', accountId, `Patient session established: ${fullName}`, token);
  };

  const registerPatient = (input: {
    fullName: string;
    email?: string;
    phone?: string;
    password?: string;
    dob?: string;
    age?: number;
    gender?: 'Male' | 'Female' | 'Other';
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    address?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    allergies?: string;
    chronicConditions?: string;
  }) => {
    const fullName = (input.fullName || '').trim();
    if (fullName.length < 2) return { success: false, error: 'Full legal name is required.' };
    const email = (input.email || '').trim().toLowerCase();
    const phone = input.phone ? normalizePhone(input.phone) : '';
    if (!email && !phone) return { success: false, error: 'Provide an email or mobile phone number.' };
    if (email && patientAccounts.some((a) => a.email === email)) return { success: false, error: 'Email already registered. Sign in instead.' };
    if (phone && patientAccounts.some((a) => a.phone === phone)) return { success: false, error: 'Mobile number already registered. Sign in instead.' };

    const patientId = `pat-${Date.now()}`;
    const mrn = `MRN-2026-${String(patients.length + 101).padStart(3, '0')}`;
    const calculatedAge = input.age || (input.dob ? Math.max(0, new Date().getFullYear() - new Date(input.dob).getFullYear()) : 30);
    const newPatient: Patient = {
      id: patientId,
      mrn,
      fullName,
      dob: input.dob || '1995-05-15',
      age: calculatedAge,
      gender: input.gender || 'Female',
      bloodType: input.bloodType || 'O+',
      phone: phone ? `+${phone}` : '+639170000000',
      email: email || `${phone}@phone.smartclinic.local`,
      address: input.address || 'Metro Manila, Philippines',
      emergencyContact: {
        name: input.emergencyContactName || 'Emergency Contact',
        relationship: input.emergencyContactRelation || 'Family',
        phone: input.emergencyContactPhone || (phone ? `+${phone}` : '+639170000000'),
      },
      allergies: input.allergies
        ? input.allergies.split(',').map((a, idx) => ({ id: `alg-${idx}`, allergen: a.trim(), severity: 'moderate' as const, reaction: 'Rash' })).filter((a) => a.allergen)
        : [],
      chronicConditions: input.chronicConditions
        ? input.chronicConditions.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      currentMedications: [],
      primaryDoctorId: 'usr-1',
      createdAt: new Date().toISOString(),
      vitalsHistory: [],
    };
    setPatients((prev) => [newPatient, ...prev]);

    const account: PatientAccount = {
      id: `acc-${Date.now()}`,
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      passwordHash: simpleHash(input.password || phone || email),
      patientId,
    };
    setPatientAccounts((prev) => [...prev, account]);
    syncPatientToSupabase(newPatient);
    finishPatientSession(account.id, fullName, account.email || `${phone}@phone.smartclinic.local`, patientId);
    logAction('AUTH_REGISTER', 'Security', account.id, `Patient registered with full EMR: ${fullName} (${mrn})`);
    return { success: true };
  };

  const login = async (credentials: LoginCredentials): Promise<{
    success: boolean;
    error?: string;
    requires2FA?: boolean;
    twoFactorRequired?: boolean;
  }> => {
    const { primaryRole: role, subRole } = credentials;

    try {
      // Direct call to registration endpoint if creating an account
      if (credentials.isRegister) {
        const regRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: credentials.fullName,
            email: credentials.email,
            phone: credentials.phone,
            password: credentials.password,
            dob: credentials.dob,
            age: credentials.age,
            gender: credentials.gender,
            bloodType: credentials.bloodType,
            address: credentials.address,
            emergencyContactName: credentials.emergencyContactName,
            emergencyContactRelation: credentials.emergencyContactRelation,
            emergencyContactPhone: credentials.emergencyContactPhone,
            allergies: credentials.allergies,
            chronicConditions: credentials.chronicConditions,
          }),
        });

        let regData: any = {};
        try {
          regData = await regRes.json();
        } catch {
          regData = { error: `Server response error (${regRes.status}: ${regRes.statusText || 'Registration failed'})` };
        }

        if (!regRes.ok || !regData.success) {
          return { success: false, error: regData.error || 'Registration failed.' };
        }
        const { token, user, patient } = regData;
        if (token) setAuthToken(token);
        if (patient) {
          setPatients((prev) => {
            const exists = prev.findIndex(
              (p) => p.id === patient.id || (p.email && p.email.toLowerCase() === patient.email?.toLowerCase())
            );
            if (exists >= 0) {
              const updated = [...prev];
              updated[exists] = { ...updated[exists], ...patient };
              return updated;
            }
            return [patient, ...prev];
          });
          setSelectedPatientId(patient.id);
          syncPatientToSupabase(patient);
        }
        finishPatientSession(user.id, user.name, user.email, patient?.id || user.id, token);
        return { success: true };
      }

      // Direct call to server authentication endpoint
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      let serverRes: any = {};
      try {
        serverRes = await res.json();
      } catch {
        serverRes = { error: `Server response error (${res.status}: ${res.statusText || 'Authentication failed'})` };
      }

      if (!res.ok || !serverRes.success) {
        if (serverRes?.requires2FA) {
          return {
            success: false,
            requires2FA: true,
            twoFactorRequired: true,
            error: serverRes.message || serverRes.error || 'Please enter the 6-digit code from your Authenticator app.',
          };
        }
        return { success: false, error: serverRes.error || 'Authentication rejected.' };
      }

      const { token, user } = serverRes;
      if (token) {
        setAuthToken(token);
        try {
          localStorage.setItem('smart_clinic_token', token);
        } catch {}
      }

      // Route based on role
      if (role === 'patient') {
        const pat = serverRes.patient;
        const patId = pat?.id || serverRes.user?.id || 'pat-1';
        if (pat) {
          setPatients((prev) => {
            const exists = prev.findIndex((p) => p.id === pat.id || (p.email && p.email.toLowerCase() === pat.email?.toLowerCase()));
            if (exists >= 0) {
              const updated = [...prev];
              updated[exists] = { ...updated[exists], ...pat };
              return updated;
            }
            return [pat, ...prev];
          });
          setSelectedPatientId(pat.id);
        } else {
          setSelectedPatientId(patId);
        }
        finishPatientSession(user.id, user.name, user.email, patId, token);
        return { success: true };
      }

      if (role === 'doctor') {
        const doctorUser = users.find((u) => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase()) || user;
        const resolvedDoctor: User = {
          ...doctorUser,
          role: 'doctor',
          permissions: doctorUser.permissions || { ...DEFAULT_ROLE_PERMISSIONS.doctor },
        };
        setCurrentUser(resolvedDoctor);
        setActiveRole('doctor');
        setPrimaryRole('doctor');
        setStaffSubRole(null);
        setIsAuthenticated(true);
        // Route doctors directly to their appointment-focused Doctor Dashboard unless queue explicitly requested
        setActiveTab(pendingAction === 'queue' ? 'queue' : 'dashboard');
        logAction('AUTH_LOGIN', 'Security', resolvedDoctor.id, `Doctor provider logged in: ${resolvedDoctor.name}`, token);
        return { success: true };
      }

      if (role === 'staff') {
        const targetSubRole = (subRole || 'nurse') as UserRole;
        const staffUser = users.find((u) => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase()) || user;
        const resolvedStaff: User = {
          ...staffUser,
          role: targetSubRole,
          permissions: staffUser.permissions || { ...DEFAULT_ROLE_PERMISSIONS[targetSubRole] },
        };
        setCurrentUser(resolvedStaff);
        setActiveRole(targetSubRole);
        setPrimaryRole('staff');
        setStaffSubRole(subRole || 'nurse');
        setIsAuthenticated(true);

        if (pendingAction === 'queue') setActiveTab('queue');
        else if (subRole === 'pharmacist') setActiveTab('inventory');
        else if (subRole === 'lab_technician') setActiveTab('laboratory');
        else setActiveTab('dashboard');

        logAction('AUTH_LOGIN', 'Security', resolvedStaff.id, `Staff logged in: ${subRole}`, token);
        return { success: true };
      }

      if (role === 'admin') {
        const adminUser = users.find((u) => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase()) || user;
        const resolvedAdmin: User = {
          ...adminUser,
          role: 'admin',
          permissions: { ...DEFAULT_ROLE_PERMISSIONS.admin },
        };
        setCurrentUser(resolvedAdmin);
        setActiveRole('admin');
        setPrimaryRole('admin');
        setStaffSubRole(null);
        setIsAuthenticated(true);
        setActiveTab(pendingAction === 'queue' ? 'queue' : 'dashboard');
        logAction('AUTH_LOGIN', 'Security', resolvedAdmin.id, 'Administrator 2FA verified and logged in.', token);
        return { success: true };
      }

      return { success: false, error: 'Unknown role.' };
    } catch (netErr) {
      console.warn('[Smart Clinic Auth] Network error connecting to auth server:', netErr);
      return {
        success: false,
        error:
          'Unable to reach the Smart Clinic authentication server. Please check your internet connection or verify your deployment configuration.',
      };
    }
  };

  const logout = useCallback((redirectTab: string = 'login') => {
    const existingToken = authToken || (typeof window !== 'undefined' ? localStorage.getItem('smart_clinic_token') : null);
    if (existingToken) {
      // Preserve Web Push subscriptions across sign-out so patients continue receiving opt-in appointment reminders
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${existingToken}`,
        },
        body: JSON.stringify({ revokePush: false }),
      }).catch(() => {});
    }
    setIsAuthenticated(false);
    setPrimaryRole(null);
    setStaffSubRole(null);
    setLinkedPatientId(null);
    setPendingAction(null);
    setActiveRole('patient');
    setCurrentUser(GUEST_USER);
    setAuthToken(null);
    setShowSessionWarning(false);
    setActiveClinicalSessionProtected(false);
    setSelectedPatientId(null);
    setTriageDraftForBooking(null);
    setSessionSecondsRemaining(clinicSettings?.inactivityTimeoutSeconds || 600);
    lastActivityRef.current = Date.now();
    try {
      localStorage.removeItem('smart_clinic_auth_session');
      localStorage.removeItem('smart_clinic_token');
      localStorage.removeItem('smart_clinic_notifications');
      localStorage.removeItem('smart_clinic_active_role');
      localStorage.removeItem('smart_clinic_user_email');
      sessionStorage.clear();
    } catch { /* ignore */ }
    setNotifications([]);
    setIsNavigating(false);
    setActiveTabState(redirectTab);
  }, [authToken, clinicSettings?.inactivityTimeoutSeconds]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const syncToBackend = async (url: string, options: RequestInit, contextDescription: string) => {
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-role': activeRole,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
      };
      
      const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });
      
      if (!res.ok) {
          console.error(`[Smart Clinic API] Error in ${contextDescription}: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
        console.error(`[Smart Clinic API] Network error in ${contextDescription}:`, err);
    }
  };

  const isPatientScope = isAuthenticated && (primaryRole === 'patient' || activeRole === 'patient');

  // Strictly identify current authenticated patient record via verified linkedPatientId / authUserId (NEVER email or patientName)
  const currentPatientRecord = useMemo(() => {
    if (!isAuthenticated || !isPatientScope) return null;
    return (
      patients.find((p) => linkedPatientId && p.id === linkedPatientId) ||
      patients.find((p) => currentUser.id && (p.authUserId === currentUser.id || p.id === currentUser.id)) ||
      null
    );
  }, [isAuthenticated, isPatientScope, linkedPatientId, patients, currentUser.id]);

  const isolatedPatients = useMemo(() => {
    if (!isAuthenticated) return [];
    if (isPatientScope) {
      return currentPatientRecord ? [currentPatientRecord] : [];
    }
    return patients;
  }, [isAuthenticated, isPatientScope, currentPatientRecord, patients]);

  const isolatedAppointments = useMemo(() => {
    if (!isAuthenticated) return [];
    if (isPatientScope) {
      if (!currentPatientRecord) return [];
      return appointments.filter(
        (a) => a.patientId !== 'REDACTED' && a.patientId === currentPatientRecord.id
      );
    }
    return appointments;
  }, [isAuthenticated, isPatientScope, currentPatientRecord, appointments]);

  const isolatedConsultations = useMemo(() => {
    if (!isAuthenticated) return [];
    if (isPatientScope) {
      if (!currentPatientRecord) return [];
      return consultations.filter((c) => c.patientId === currentPatientRecord.id);
    }
    return consultations;
  }, [isAuthenticated, isPatientScope, currentPatientRecord, consultations]);

  const isolatedPrescriptions = useMemo(() => {
    if (!isAuthenticated) return [];
    if (isPatientScope) {
      if (!currentPatientRecord) return [];
      return prescriptions.filter((p) => p.patientId === currentPatientRecord.id);
    }
    return prescriptions;
  }, [isAuthenticated, isPatientScope, currentPatientRecord, prescriptions]);

  const isolatedLabOrders = useMemo(() => {
    if (!isAuthenticated) return [];
    if (isPatientScope) {
      if (!currentPatientRecord) return [];
      return labOrders
        .filter((l) => l.patientId === currentPatientRecord.id)
        .map((l) => {
          const isReleased = Boolean(l.isFinalVerified) || l.status === 'Released' || l.status === 'Completed' || l.status === 'Reviewed';
          if (isReleased) return l;
          return {
            ...l,
            results: undefined,
            interpretation: undefined,
            aiSummary: undefined,
          };
        });
    }
    return labOrders;
  }, [isAuthenticated, isPatientScope, currentPatientRecord, labOrders]);

  const isolatedInvoices = useMemo(() => {
    if (!isAuthenticated) return [];
    if (isPatientScope) {
      if (!currentPatientRecord) return [];
      return invoices.filter((i) => i.patientId === currentPatientRecord.id);
    }
    if (activeRole !== 'admin') {
      const perms = currentUser?.permissions || (currentUser?.role ? DEFAULT_ROLE_PERMISSIONS[currentUser.role] : null);
      const canAccessBilling = activeRole === 'receptionist' || Boolean(perms?.billing);
      if (!canAccessBilling) {
        return [];
      }
    }
    return invoices;
  }, [isAuthenticated, isPatientScope, currentPatientRecord, invoices, activeRole, currentUser]);

  const visiblePatients = isolatedPatients;
  const myAppointments = isolatedAppointments;

  const selectedPatient = !isAuthenticated
    ? null
    : isPatientScope && currentPatientRecord
      ? currentPatientRecord
      : (patients.find((p) => p.id === selectedPatientId) || null);

  const selectPatient = (id: string | null) => {
    if (!isAuthenticated) return;
    if (isPatientScope && currentPatientRecord && id && id !== currentPatientRecord.id) return;
    setSelectedPatientId(id);
  };

  const addPatient = (newPatData: Omit<Patient, 'id' | 'createdAt' | 'mrn'>) => {
    const mrn = `MRN-2026-${String(patients.length + 101).padStart(3, '0')}`;
    const newPatient: Patient = {
      ...newPatData,
      id: `pat-${Date.now()}`,
      mrn,
      createdAt: new Date().toISOString(),
      vitalsHistory: newPatData.vitalsHistory || [],
    };
    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatientId(newPatient.id);
    logAction('PATIENT_CREATE', 'Patient', newPatient.id, `Registered patient: ${newPatient.fullName} (${mrn})`);
    syncPatientToSupabase(newPatient);

    syncToBackend('/api/patients', {
      method: 'POST',
      body: JSON.stringify(newPatient),
    }, 'Create patient');

    return newPatient;
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    if (primaryRole === 'patient' && linkedPatientId && id !== linkedPatientId) return;

    let updatedPatientRecord: Patient | undefined;
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          updatedPatientRecord = { ...p, ...updates };
          return updatedPatientRecord;
        }
        return p;
      })
    );

    // If this is the current logged-in patient, sync currentUser
    if (primaryRole === 'patient' || currentUser.id === id) {
      setCurrentUser((prev) => ({
        ...prev,
        name: updates.fullName || prev.name,
        email: updates.email || prev.email,
        avatar: updates.avatar !== undefined ? updates.avatar : prev.avatar,
      }));
    }

    logAction('PATIENT_UPDATE', 'Patient', id, `Updated patient information: ${updates.fullName || id}`);

    if (updatedPatientRecord) {
      syncPatientToSupabase(updatedPatientRecord);
    }

    syncToBackend(`/api/patients/${id}`, {
      method: 'PATCH',
      headers: { 'x-linked-patient-id': id },
      body: JSON.stringify(updates),
    }, 'Update patient');
  };

  const addVitals = (patientId: string, vitalsData: Omit<Vitals, 'id' | 'recordedAt'>) => {
    const newVitals: Vitals = {
      ...vitalsData,
      id: `vit-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      recordedBy: currentUser.name,
    };
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, vitalsHistory: [newVitals, ...p.vitalsHistory] } : p))
    );
    logAction('VITALS_RECORDED', 'Patient', patientId, `Vitals recorded: BP ${newVitals.bloodPressureSystolic}/${newVitals.bloodPressureDiastolic}, HR ${newVitals.heartRate}`);
  };

  const saveTriageRecord = (
    patientId: string,
    recordData: Omit<TriageRecord, 'id' | 'timestamp'>
  ): TriageRecord => {
    const newRecord: TriageRecord = {
      ...recordData,
      id: `trg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    let updatedPatientRecord: Patient | undefined;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          const existingHistory = p.triageHistory || [];
          const updatedHistory = [newRecord, ...existingHistory];
          updatedPatientRecord = { ...p, triageHistory: updatedHistory };
          return updatedPatientRecord;
        }
        return p;
      })
    );

    logAction(
      'AI_TRIAGE_SAVED',
      'Patient',
      patientId,
      `AI Triage Recorded: Score ${newRecord.urgencyScore}/10 (${newRecord.urgencyBand.toUpperCase()}) - Specialty: ${newRecord.suggestedSpecialty}`
    );

    // If yellow or red urgency, trigger clinical notification for staff and provider awareness
    if (newRecord.urgencyBand === 'yellow' || newRecord.urgencyBand === 'red') {
      const isRed = newRecord.urgencyBand === 'red';
      addNotification({
        targetRole: 'provider',
        category: 'triage',
        priority: isRed ? 'urgent' : 'high',
        title: `${isRed ? '🚨 EMERGENCY TRIAGE DETECTED' : '⚠️ HIGH URGENCY TRIAGE'}: ${newRecord.patientName || 'Patient'}`,
        message: `Urgency Score ${newRecord.urgencyScore}/10 (${newRecord.suggestedSpecialty}). ${newRecord.summary.slice(0, 90)}...`,
        content: newRecord.summary,
      });
    }

    // Persist to server API and Supabase
    if (updatedPatientRecord) {
      syncPatientToSupabase(updatedPatientRecord);
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            'x-linked-patient-id': patientId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ triageHistory: updatedPatientRecord.triageHistory }),
        }).catch((err) => console.error('Triage API sync error:', err));
      } catch {}
    }

    return newRecord;
  };

  const addAppointment = (aptData: Omit<Appointment, 'id' | 'createdAt'>) => {
    if (primaryRole === 'patient' && linkedPatientId && aptData.patientId !== linkedPatientId) {
      aptData = { ...aptData, patientId: linkedPatientId };
    }
    const isWalkIn = Boolean(aptData.isWalkIn) || aptData.type === 'Walk-in';
    const walkInCount = appointments.filter((a) => a.isWalkIn || a.type === 'Walk-in').length + 1;
    const bookingRef = aptData.bookingReference || (!isWalkIn ? `BK-${new Date().getFullYear()}-${String(100000 + appointments.length + 1)}` : undefined);
    const newApt: Appointment = {
      ...aptData,
      id: `apt-${Date.now()}`,
      status: isWalkIn ? (aptData.status || 'Checked In') : 'Confirmed',
      isWalkIn,
      queueNumber: isWalkIn ? (aptData.queueNumber || `W-${String(walkInCount).padStart(3, '0')}`) : undefined,
      bookingReference: bookingRef,
      consultationMode: aptData.consultationMode || (aptData.type === 'Online Consultation' || aptData.type === 'Telehealth' ? 'Online Consultation' : 'In-Person'),
      createdAt: new Date().toISOString(),
    };
    setAppointments((prev) => [newApt, ...prev]);
    logAction('APPOINTMENT_BOOKED', 'Appointment', newApt.id, `Booked appointment for ${newApt.patientName} (${newApt.bookingReference || newApt.queueNumber || newApt.id})`);
    syncAppointmentToSupabase(newApt);

    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      fetch(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newApt),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((savedApt) => {
          if (savedApt && savedApt.id) {
            setAppointments((prev) => prev.map((a) => (a.id === newApt.id || a.id === savedApt.id ? { ...a, ...savedApt } : a)));
          }
        })
        .catch(() => {});
    } catch {}

    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('smart_clinic_notifications_broadcast');
        channel.postMessage({ type: 'NEW_APPOINTMENT', appointment: newApt });
        channel.close();
      } catch {}
    }

    return newApt;
  };

  const createAppointmentVerified = useCallback(
    async (aptData: Omit<Appointment, 'id' | 'createdAt'>) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const payload =
          primaryRole === 'patient' && linkedPatientId && aptData.patientId !== linkedPatientId
            ? { ...aptData, patientId: linkedPatientId }
            : aptData;
        const res = await fetch(`${API_BASE_URL}/api/appointments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to schedule appointment.' };
        }
        const savedApt: Appointment = data;
        setAppointments((prev) => {
          const exists = prev.some((a) => a.id === savedApt.id);
          return exists ? prev.map((a) => (a.id === savedApt.id ? savedApt : a)) : [savedApt, ...prev];
        });
        syncAppointmentToSupabase(savedApt);
        return { success: true, appointment: savedApt, qrPayload: data.qrPayload };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error while booking appointment.' };
      }
    },
    [authToken, activeRole, primaryRole, linkedPatientId]
  );

  const [noShowGraceMinutes, setNoShowGraceMinutesState] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('smart_clinic_noshow_grace_mins') || String(DEFAULT_NO_SHOW_GRACE_MINUTES));
      return saved >= 5 && saved <= 120 ? saved : DEFAULT_NO_SHOW_GRACE_MINUTES;
    } catch {
      return DEFAULT_NO_SHOW_GRACE_MINUTES;
    }
  });
  const setNoShowGraceMinutes = useCallback((mins: number) => {
    const clamped = Math.max(5, Math.min(120, Math.round(mins)));
    setNoShowGraceMinutesState(clamped);
    setClinicSettings((prev) => ({ ...prev, noShowGraceMinutes: clamped }));
    try {
      localStorage.setItem('smart_clinic_noshow_grace_mins', String(clamped));
      const token = authToken || localStorage.getItem('smart_clinic_token');
      if (token) {
        fetch(`${API_BASE_URL}/api/settings/clinic`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ noShowGraceMinutes: clamped }),
        }).catch(() => {});
      }
    } catch {}
  }, [authToken]);

  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const updateAppointmentStatus = (id: string, status: AppointmentStatus, room?: string, customNotes?: string) => {
    const existingApt = appointments.find((a) => a.id === id);
    const targetRoom = room || (existingApt ? existingApt.room : undefined);
    const finalNotes = customNotes !== undefined ? customNotes : (existingApt ? existingApt.notes : undefined);
    const nowIso = new Date().toISOString();
    const lifecyclePatch: Partial<Appointment> = {
      ...(status === 'Checked In' ? { checkInAt: existingApt?.checkInAt || nowIso } : {}),
      ...(status === 'Called' ? { calledAt: nowIso, calledAcknowledgedAt: undefined } : {}),
      ...(status === 'Completed' ? { completedAt: nowIso } : {}),
      ...(status === 'No Show' ? { noShowMarkedAt: nowIso } : {}),
    };
    const updatedApt: Appointment | null = existingApt
      ? { ...existingApt, ...lifecyclePatch, status, ...(targetRoom ? { room: targetRoom } : {}), ...(finalNotes !== undefined ? { notes: finalNotes } : {}) }
      : null;

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...lifecyclePatch, status, ...(targetRoom ? { room: targetRoom } : {}), ...(finalNotes !== undefined ? { notes: finalNotes } : {}) } : a))
    );

    // Immediately persist to localStorage for instant reload protection
    try {
      const saved = localStorage.getItem('smart_clinic_appointments');
      if (saved) {
        const parsed: Appointment[] = JSON.parse(saved);
        const nextList = parsed.map((a) => (a.id === id ? { ...a, ...lifecyclePatch, status, ...(targetRoom ? { room: targetRoom } : {}), ...(finalNotes !== undefined ? { notes: finalNotes } : {}) } : a));
        localStorage.setItem('smart_clinic_appointments', JSON.stringify(nextList));
      }
    } catch {}

    logAction('APPOINTMENT_STATUS', 'Appointment', id, `Updated status to: ${status}${targetRoom ? ` in ${targetRoom}` : ''}`);

    if (updatedApt) {
      syncAppointmentToSupabase(updatedApt);
    }

    if (existingApt) {
      if (status === 'Called') {
        const assignedRoom = targetRoom || existingApt.room || 'Consultation Room 1';
        addNotification({
          userId: existingApt.patientId,
          recipientId: existingApt.patientId,
          patientId: existingApt.patientId,
          targetRole: 'patient',
          recipientRole: 'patient',
          title: "It's Your Turn!",
          message: 'Clinic staff is ready for you. Please proceed to the designated clinic room.',
          content: `Queue ${existingApt.queueNumber || 'Assigned'} • Status: Called • Please proceed to ${assignedRoom} (${existingApt.doctorName}).`,
          category: 'queue_call',
          priority: 'urgent',
          relatedResourceId: id,
          relatedResourceType: 'appointment',
          queueNumber: existingApt.queueNumber,
          designatedRoom: assignedRoom,
        });
      } else if (status === 'Confirmed') {
        addNotification({
          userId: existingApt.patientId,
          recipientId: existingApt.patientId,
          patientId: existingApt.patientId,
          targetRole: 'patient',
          recipientRole: 'patient',
          title: 'Appointment Approved',
          message: 'Your appointment has been approved.',
          content: `Your appointment with ${existingApt.doctorName} on ${existingApt.date} at ${formatTimeSlot(existingApt.time)} (${existingApt.type}) has been approved. Location: ${targetRoom || existingApt.room || 'Outpatient Clinic'}. Queue Number: ${existingApt.queueNumber || 'Standard Queue'}.`,
          category: 'appointment',
          priority: 'normal',
          relatedResourceId: id,
          relatedResourceType: 'appointment',
        });
      } else if (status === 'Cancelled') {
        // 1. Immediately dismiss/mark read any stale queue or triage alerts for this appointment
        setNotifications((prev) =>
          prev.map((n) =>
            n.relatedResourceId === id || (n.category === 'appointment' && n.content?.includes(existingApt.queueNumber || id))
              ? { ...n, read: true }
              : n
          )
        );

        // 2. Cancellation notification to patient
        addNotification({
          userId: existingApt.patientId,
          recipientId: existingApt.patientId,
          patientId: existingApt.patientId,
          targetRole: 'patient',
          recipientRole: 'patient',
          title: 'Appointment Cancelled',
          message: `Your appointment with ${existingApt.doctorName} on ${existingApt.date} at ${formatTimeSlot(existingApt.time)} has been cancelled.`,
          content: `Your appointment reservation with ${existingApt.doctorName} on ${existingApt.date} has been cancelled and removed from the active queue. You may reschedule whenever convenient.`,
          category: 'appointment',
          priority: 'normal',
          relatedResourceId: id,
          relatedResourceType: 'appointment',
        });

        // 3. Notification to attending physician
        if (existingApt.doctorId) {
          addNotification({
            userId: existingApt.doctorId,
            recipientId: existingApt.doctorId,
            doctorId: existingApt.doctorId,
            targetRole: 'provider',
            recipientRole: 'doctor',
            title: 'Consultation Cancelled',
            message: `${existingApt.patientName} (${existingApt.patientMrn}) appointment on ${existingApt.date} at ${formatTimeSlot(existingApt.time)} was cancelled.`,
            content: `Patient ${existingApt.patientName} was cancelled and cleared from your schedule and live waiting queue.`,
            category: 'appointment',
            priority: 'normal',
            relatedResourceId: id,
            relatedResourceType: 'appointment',
          });
        }

        // 4. Notification to reception desk
        addNotification({
          targetRole: 'provider',
          recipientRole: 'receptionist',
          title: 'Queue Updated — Appointment Cancelled',
          message: `Patient ${existingApt.patientName} (${existingApt.queueNumber || 'Queue'}) cancelled and removed from waiting room.`,
          content: `Reception desk: ${existingApt.patientName} (${existingApt.patientMrn}) cancelled consultation with ${existingApt.doctorName}. Live queue updated.`,
          category: 'appointment',
          priority: 'normal',
          relatedResourceId: id,
          relatedResourceType: 'appointment',
        });
      } else if (status === 'Completed') {
        // Mark active queue notifications for this appointment as read
        setNotifications((prev) =>
          prev.map((n) => (n.relatedResourceId === id ? { ...n, read: true } : n))
        );
        addNotification({
          userId: existingApt.patientId,
          recipientId: existingApt.patientId,
          patientId: existingApt.patientId,
          targetRole: 'patient',
          recipientRole: 'patient',
          title: 'Consultation Completed',
          message: `Your consultation with ${existingApt.doctorName} is complete.`,
          content: `Clinical notes and any issued prescriptions or diagnostic orders are now accessible in your patient portal.`,
          category: 'appointment',
          priority: 'normal',
          relatedResourceId: id,
          relatedResourceType: 'appointment',
        });
      } else if (status === 'No Show') {
        setNotifications((prev) =>
          prev.map((n) => (n.relatedResourceId === id ? { ...n, read: true } : n))
        );
        addNotification({
          userId: existingApt.patientId,
          recipientId: existingApt.patientId,
          patientId: existingApt.patientId,
          targetRole: 'patient',
          recipientRole: 'patient',
          title: 'Appointment Marked as No-Show',
          message: `You missed your scheduled consultation on ${existingApt.date} at ${formatTimeSlot(existingApt.time)}.`,
          content: `Our clinical records show you were unable to attend your scheduled consultation on ${existingApt.date} with ${existingApt.doctorName}. Please contact the clinic or rebook via your portal.`,
          category: 'appointment',
          priority: 'normal',
          relatedResourceId: id,
          relatedResourceType: 'appointment',
        });
        if (existingApt.doctorId) {
          addNotification({
            userId: existingApt.doctorId,
            recipientId: existingApt.doctorId,
            doctorId: existingApt.doctorId,
            targetRole: 'provider',
            recipientRole: 'doctor',
            title: 'Patient No-Show Recorded',
            message: `${existingApt.patientName} did not arrive for their ${formatTimeSlot(existingApt.time)} appointment.`,
            content: `No-show recorded for ${existingApt.patientName} (${existingApt.patientMrn}) with ${existingApt.doctorName}. Queue updated.`,
            category: 'appointment',
            priority: 'normal',
            relatedResourceId: id,
            relatedResourceType: 'appointment',
          });
        }
      }
    }

    syncToBackend(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        room: targetRoom,
        notes: finalNotes,
        queueNumber: updatedApt?.queueNumber,
      }),
    }, 'Update appointment status');

    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('smart_clinic_notifications_broadcast');
        channel.postMessage({ type: 'UPDATE_APPOINTMENT_STATUS', id, status, room: targetRoom, notes: finalNotes, calledAt: lifecyclePatch.calledAt });
        channel.close();
      } catch {}
    }
  };

  const acknowledgeCalledAppointment = useCallback(async (appointmentId: string) => {
    const nowIso = new Date().toISOString();
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, calledAcknowledgedAt: nowIso } : a))
    );
    setNotifications((prev) =>
      prev.map((n) =>
        n.relatedResourceId === appointmentId && (n.category === 'queue_call' || n.title === "It's Your Turn!")
          ? { ...n, read: true, acknowledgedAt: nowIso }
          : n
      )
    );
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}/acknowledge-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {}
  }, [activeRole, authToken]);

  const cancelAppointment = (id: string, reason?: string) => {
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return;
    const updatedNotes = reason ? `${apt.notes ? apt.notes + ' • ' : ''}Cancellation reason: ${reason}` : apt.notes;
    logAction('APPOINTMENT_CANCELLED', 'Appointment', id, `Cancelled appointment for ${apt.patientName}${reason ? ` (${reason})` : ''}`);
    updateAppointmentStatus(id, 'Cancelled', undefined, updatedNotes);
  };

  const updateAppointmentRoom = (id: string, room: string) => {
    const apt = appointments.find((a) => a.id === id);
    const updatedApt = apt ? { ...apt, room } : null;

    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, room } : a)));

    try {
      const saved = localStorage.getItem('smart_clinic_appointments');
      if (saved) {
        const parsed: Appointment[] = JSON.parse(saved);
        const nextList = parsed.map((a) => (a.id === id ? { ...a, room } : a));
        localStorage.setItem('smart_clinic_appointments', JSON.stringify(nextList));
      }
    } catch {}

    if (updatedApt) {
      syncAppointmentToSupabase(updatedApt);
    }

    syncToBackend(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ room }),
    }, 'Update appointment room');

    logAction('APPOINTMENT_ROOM_ASSIGNED', 'Appointment', id, `Assigned consultation room: ${room}`);
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel('smart_clinic_notifications_broadcast');
      channel.postMessage({ type: 'UPDATE_APPOINTMENT_ROOM', id, room });
      channel.close();
    }
  };

  const checkInPatient = (appointmentId: string, room?: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;
    if (apt.status === 'Checked In' || apt.status === 'In Consultation' || apt.status === 'Completed') {
      return;
    }
    const isWalkIn = Boolean(apt.isWalkIn) || apt.type === 'Walk-in';
    const defaultRoom = room || apt.room || 'Outpatient Waiting Area';
    const walkInQueueNum = isWalkIn ? (apt.queueNumber || `W-${String(appointments.filter((x) => x.isWalkIn).length + 1).padStart(3, '0')}`) : undefined;
    const nowIso = new Date().toISOString();
    const checkedInApt: Appointment = {
      ...apt,
      status: 'Checked In',
      room: defaultRoom,
      checkInAt: apt.checkInAt || nowIso,
      checkedInBy: currentUser.name,
      ...(isWalkIn ? { queueNumber: walkInQueueNum } : {}),
    };

    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? checkedInApt : a)));

    try {
      const saved = localStorage.getItem('smart_clinic_appointments');
      if (saved) {
        const parsed: Appointment[] = JSON.parse(saved);
        const nextList = parsed.map((a) => (a.id === appointmentId ? checkedInApt : a));
        localStorage.setItem('smart_clinic_appointments', JSON.stringify(nextList));
      }
    } catch {}

    syncAppointmentToSupabase(checkedInApt);

    syncToBackend(`/api/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Checked In',
        room: defaultRoom,
        ...(isWalkIn ? { queueNumber: walkInQueueNum } : {}),
      }),
    }, 'Check in patient');

    logAction(
      'PATIENT_CHECKED_IN',
      'Appointment',
      appointmentId,
      `Patient checked in to ${defaultRoom} (${apt.bookingReference || walkInQueueNum || appointmentId})`
    );
    addNotification({
      userId: apt.patientId,
      recipientId: apt.patientId,
      patientId: apt.patientId,
      targetRole: 'patient',
      recipientRole: 'patient',
      title: 'Checked In to Outpatient Clinic',
      message: isWalkIn
        ? `Walk-in visit checked in (${walkInQueueNum}). Please wait in ${defaultRoom}.`
        : `Appointment ${apt.bookingReference || ''} checked in. Please wait in ${defaultRoom}.`,
      category: 'appointment',
      priority: 'normal',
      relatedResourceId: appointmentId,
      relatedResourceType: 'appointment',
    });
    if (apt.doctorId) {
      addNotification({
        userId: apt.doctorId,
        recipientId: apt.doctorId,
        doctorId: apt.doctorId,
        targetRole: 'provider',
        recipientRole: 'doctor',
        title: 'Patient Checked In',
        message: `${apt.patientName} (${apt.patientMrn}) arrived and checked in at ${defaultRoom}.`,
        category: 'triage',
        priority: 'normal',
        relatedResourceId: appointmentId,
        relatedResourceType: 'appointment',
      });
    }
  };

  const advanceQueueStatus = (appointmentId: string, nextStatus: AppointmentStatus, room?: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;
    if (nextStatus === 'Cancelled') {
      cancelAppointment(appointmentId, 'Cancelled from queue');
      return;
    }
    const isWalkIn = Boolean(apt.isWalkIn) || apt.type === 'Walk-in';
    if (nextStatus === 'Called' && !isWalkIn) {
      return;
    }
    const targetRoom = room || apt.room || (nextStatus === 'In Consultation' ? 'Consultation Room 1' : 'Outpatient Waiting Area');

    updateAppointmentStatus(appointmentId, nextStatus, targetRoom);
    logAction('QUEUE_ADVANCED', 'Appointment', appointmentId, `Visit status advanced to ${nextStatus} in ${targetRoom}`);
  };

  const rescheduleAppointment = (id: string, requestedDate: string, newTime: string): RescheduleComparisonResult => {
    let result: RescheduleComparisonResult = {
      requestedDate,
      originalAppointmentDate: '',
      finalDate: requestedDate,
      wasSameDay: false,
      explanation: '',
    };

    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          result = applyReschedulingRule(requestedDate, a.date);
          return { ...a, date: result.finalDate, time: newTime, status: 'Confirmed' };
        }
        return a;
      })
    );

    const logMessage = result.wasSameDay
      ? `Same-day reschedule moved to next calendar day: ${result.finalDate} (original: ${result.originalAppointmentDate}) at ${newTime}`
      : `Rescheduled to ${result.finalDate} at ${newTime}`;

    logAction('APPOINTMENT_RESCHEDULE', 'Appointment', id, logMessage);

    syncToBackend(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        date: result.finalDate,
        time: newTime,
        status: 'Confirmed',
        originalDate: result.originalAppointmentDate,
        requestedDate: result.requestedDate,
        wasSameDay: result.wasSameDay,
      }),
    }, 'Reschedule appointment');

    return result;
  };

  const addConsultation = (consData: Omit<Consultation, 'id'>) => {
    const newCons: Consultation = { ...consData, id: `con-${Date.now()}` };
    setConsultations((prev) => [newCons, ...prev]);
    if (consData.appointmentId) updateAppointmentStatus(consData.appointmentId, 'Completed');
    logAction('CONSULTATION_SAVED', 'Consultation', newCons.id, `Clinical SOAP consultation recorded for ${newCons.patientName}`);
    syncConsultationToSupabase(newCons);

    syncToBackend('/api/consultations', {
      method: 'POST',
      body: JSON.stringify(newCons),
    }, 'Create consultation');

    return newCons;
  };

  // Doctor creates Active prescription WITHOUT deducting inventory stock (stock is deducted ONLY on Pharmacist dispensing)
  const addPrescription = (rxData: Omit<Prescription, 'id' | 'prescriptionNumber'>) => {
    const normalizedItems = (rxData.items || []).map((it, idx) => ({
      ...it,
      id: it.id || `rxi-${Date.now()}-${idx}`,
      dispensed: false,
      dispensedQuantity: 0,
      remainingQuantity: Number(it.quantity || 0),
    }));
    const newRx: Prescription = {
      ...rxData,
      id: `rx-${Date.now()}`,
      prescriptionNumber: `RX-2026-${String(9000 + prescriptions.length + 1)}`,
      status: 'Active',
      items: normalizedItems,
    };
    setPrescriptions((prev) => [newRx, ...prev]);
    logAction('PRESCRIPTION_CREATED', 'Prescription', newRx.id, `Created e-Prescription ${newRx.prescriptionNumber} for ${newRx.patientName} (Pending Pharmacist Dispensing)`);
    syncPrescriptionToSupabase(newRx);

    syncToBackend('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(newRx),
    }, 'Create prescription');

    return newRx;
  };

  const dispensePrescription = useCallback(
    async (
      prescriptionId: string,
      items?: { itemId: string; quantityToDispense: number }[],
      notes?: string
    ) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/prescriptions/${prescriptionId}/dispense`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ items, notes }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to dispense prescription.' };
        }
        if (data.prescription) {
          setPrescriptions((prev) => prev.map((r) => (r.id === prescriptionId ? data.prescription : r)));
        }
        if (Array.isArray(data.inventory)) {
          setInventory(data.inventory);
        } else {
          await syncClinicFromBackend();
        }
        if (Array.isArray(data.transactions) && data.transactions.length > 0) {
          setInventoryTransactions((prev) => [...data.transactions, ...prev]);
        }
        return {
          success: true,
          prescription: data.prescription,
          transactions: data.transactions,
          lowStockAlerts: data.lowStockAlerts,
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error dispensing medication.' };
      }
    },
    [authToken, activeRole, syncClinicFromBackend]
  );

  // Backwards-compatible wrapper routing single-item dispense through atomic endpoint
  const dispenseMedication = (prescriptionId: string, itemId: string) => {
    const rx = prescriptions.find((r) => r.id === prescriptionId);
    const item = rx?.items.find((i) => i.id === itemId);
    const remaining = item ? (item.remainingQuantity ?? (item.dispensed ? 0 : item.quantity)) : 0;
    if (!item || remaining <= 0) return;
    void dispensePrescription(prescriptionId, [{ itemId, quantityToDispense: remaining }]);
  };

  const verifyAppointmentQr = useCallback(
    async (qrPayload: string, confirmCheckIn: boolean = false, room?: string) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/appointments/verify-qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ qrPayload, confirmCheckIn, room }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            success: false,
            alreadyCheckedIn: res.status === 409,
            appointment: data.appointment,
            patientSummary: data.patientSummary,
            error: data.error || 'Appointment QR verification failed.',
          };
        }
        if (data.appointment) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === data.appointment.id ? { ...a, ...data.appointment } : a))
          );
        }
        return {
          success: true,
          checkedIn: Boolean(data.checkedIn),
          appointment: data.appointment,
          patientSummary: data.patientSummary,
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error verifying QR.' };
      }
    },
    [authToken, activeRole]
  );

  const recordPatientVitals = useCallback(
    async (
      patientId: string,
      vitalsInput: Partial<Vitals> & { appointmentId?: string; isPatientReported?: boolean; source?: Vitals['source'] }
    ) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}/vitals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(vitalsInput),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to save vital signs.' };
        }
        if (data.vitals) {
          setPatients((prev) =>
            prev.map((p) => (p.id === patientId ? { ...p, vitalsHistory: [data.vitals, ...(p.vitalsHistory || [])] } : p))
          );
        }
        if (vitalsInput.appointmentId && activeRole === 'nurse') {
          setAppointments((prev) =>
            prev.map((a) => (a.id === vitalsInput.appointmentId ? { ...a, nurseVitalsRecorded: true } : a))
          );
        }
        return { success: true, vitals: data.vitals };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error saving vital signs.' };
      }
    },
    [authToken, activeRole]
  );

  const updateReorderThreshold = useCallback(
    async (itemId: string, reorderLevel: number) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/inventory/${itemId}/threshold`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ reorderLevel }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { success: false, error: data.error || 'Failed to update threshold.' };
        setInventory((prev) => prev.map((it) => (it.id === itemId ? { ...it, reorderLevel } : it)));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error updating threshold.' };
      }
    },
    [authToken, activeRole]
  );

  const createRestockRequest = useCallback(
    async (input: { inventoryItemId: string; requestedQuantity: number; supplier?: string; notes?: string }) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/inventory/restock-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return { success: false, error: data.error || 'Failed to create restock request.' };
        if (data.request) {
          setRestockRequests((prev) => [data.request, ...prev]);
        }
        return { success: true, request: data.request };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error creating restock request.' };
      }
    },
    [authToken, activeRole]
  );

  const updateRestockRequest = useCallback(
    async (
      requestId: string,
      input: { action: 'approve' | 'receive' | 'cancel'; receivedQuantity?: number; batchNumber?: string; expirationDate?: string }
    ) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/inventory/restock-requests/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return { success: false, error: data.error || 'Failed to update restock request.' };
        if (data.request) {
          setRestockRequests((prev) => prev.map((r) => (r.id === requestId ? data.request : r)));
        }
        if (data.inventoryItem) {
          setInventory((prev) => prev.map((it) => (it.id === data.inventoryItem.id ? data.inventoryItem : it)));
        }
        if (data.transaction) {
          setInventoryTransactions((prev) => [data.transaction, ...prev]);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error updating restock request.' };
      }
    },
    [authToken, activeRole]
  );

  const advanceLabWorkflow = useCallback(
    async (
      orderId: string,
      payload: {
        action: 'verify-patient' | 'collect-sample' | 'start-processing' | 'encode-results' | 'verify-and-release' | 'amend-result' | 'doctor-acknowledge';
        specimenType?: string;
        specimenId?: string;
        results?: LabResultItem[];
        interpretation?: string;
        notes?: string;
        reason?: string;
      }
    ) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/lab-orders/${orderId}/workflow`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return { success: false, error: data.error || 'Failed to advance laboratory workflow.' };
        if (data.order) {
          setLabOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        }
        return { success: true, order: data.order };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error updating laboratory order.' };
      }
    },
    [authToken, activeRole]
  );

  const updateClinicSettings = useCallback(
    async (updates: Partial<ClinicOperationalSettings>) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/settings/clinic`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updates),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return { success: false, error: data.error || 'Failed to save operational settings.' };
        if (data.settings) {
          setClinicSettings((prev) => ({ ...prev, ...data.settings }));
          if (typeof data.settings.noShowGraceMinutes === 'number') {
            setNoShowGraceMinutesState(data.settings.noShowGraceMinutes);
          }
        }
        return { success: true, settings: data.settings };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error saving operational settings.' };
      }
    },
    [authToken, activeRole]
  );

  const updateNotificationPreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        const res = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': activeRole,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updates),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return { success: false, error: data.error || 'Failed to save notification preferences.' };
        if (data.preferences) {
          setNotificationPreferences(data.preferences);
        }
        return { success: true, preferences: data.preferences };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error saving notification preferences.' };
      }
    },
    [authToken, activeRole]
  );

  const runScheduledRemindersNow = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      const res = await fetch(`${API_BASE_URL}/api/cron/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return { success: false, error: data.error || 'Failed to evaluate reminders.' };
      await syncClinicFromBackend();
      return {
        success: true,
        evaluatedCount: data.evaluatedCount,
        dispatchedCount: data.dispatchedCount,
        skippedCount: data.skippedCount,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error triggering reminder evaluation.' };
    }
  }, [authToken, activeRole, syncClinicFromBackend]);

  const addLabOrder = (orderData: Omit<LabTestOrder, 'id' | 'orderNumber' | 'requestedAt'>) => {
    const newOrder: LabTestOrder = {
      ...orderData,
      id: `lab-${Date.now()}`,
      orderNumber: `LAB-2026-${String(1000 + labOrders.length + 1)}`,
      requestedAt: new Date().toISOString(),
      isFinalVerified: false,
    };
    setLabOrders((prev) => [newOrder, ...prev]);
    logAction('LAB_ORDER_CREATED', 'Laboratory', newOrder.id, `Ordered ${newOrder.testName} for ${newOrder.patientName}`);
    syncLabOrderToSupabase(newOrder);

    syncToBackend('/api/lab-orders', {
      method: 'POST',
      body: JSON.stringify(newOrder),
    }, 'Create lab order');

    return newOrder;
  };

  const updateLabStatus = (orderId: string, status: LabTestOrder['status']) => {
    const updates: Partial<LabTestOrder> = { status };
    if (status === 'Sample Collected') updates.collectedAt = new Date().toISOString();
    if (status === 'Released' || status === 'Completed' || status === 'Reviewed') {
      updates.completedAt = new Date().toISOString();
      updates.releasedAt = new Date().toISOString();
      updates.isFinalVerified = true;
    }

    setLabOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return { ...o, ...updates };
      })
    );
    logAction('LAB_STATUS_UPDATE', 'Laboratory', orderId, `Status updated to: ${status}`);

    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      fetch(`${API_BASE_URL}/api/lab-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      }).catch(() => {});
    } catch {}
  };

  const enterLabResults = (orderId: string, results: LabResultItem[], interpretation?: string, aiSummary?: string) => {
    // Encode results as Preliminary first so Lab Technician explicitly verifies & releases final findings
    void advanceLabWorkflow(orderId, {
      action: 'encode-results',
      results,
      interpretation: interpretation || aiSummary,
    });
  };

  // Audited stock adjustment
  const adjustStock = (itemId: string, quantityChange: number, reason: string) => {
    const item = inventory.find((i) => i.id === itemId);
    setInventory((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, stockQuantity: Math.max(0, it.stockQuantity + quantityChange), lastUpdated: new Date().toISOString() } : it
      )
    );
    logAction('STOCK_ADJUSTMENT', 'Inventory', itemId, `Audited stock adjustment: ${quantityChange > 0 ? '+' : ''}${quantityChange} on ${item?.name || 'Item'} (${reason})`);

    syncToBackend('/api/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ itemId, quantityChange, reason }),
    }, 'Adjust stock');
  };

  const addInvoice = (invData: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
    const newInv: Invoice = {
      ...invData,
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${String(5000 + invoices.length + 1)}`,
    };
    setInvoices((prev) => [newInv, ...prev]);
    logAction('INVOICE_CREATED', 'Billing', newInv.id, `Generated invoice ${newInv.invoiceNumber} for ${newInv.patientName}`);
    syncInvoiceToSupabase(newInv);

    syncToBackend('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(newInv),
    }, 'Create invoice');

    return newInv;
  };

  const payInvoice = (invoiceId: string, amount: number, method: Invoice['paymentMethod']) => {
    let updatedPaidAmount = 0;
    let isFullyPaid = false;

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const newPaid = (inv.paidAmount || 0) + amount;
        const isPaid = newPaid >= inv.totalAmount;
        updatedPaidAmount = newPaid;
        isFullyPaid = isPaid;
        return {
          ...inv,
          paidAmount: newPaid,
          paymentMethod: method,
          paymentDate: new Date().toISOString(),
          paidAt: isPaid ? new Date().toISOString() : inv.paidAt,
          status: isPaid ? 'Paid' : 'Partially Paid',
        };
      })
    );
    logAction('PAYMENT_RECORDED', 'Billing', invoiceId, `Payment of ₱${amount} recorded via ${method}`);

    syncToBackend(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        paidAmount: updatedPaidAmount,
        paymentMethod: method,
        paymentDate: new Date().toISOString(),
        paidAt: isFullyPaid ? new Date().toISOString() : undefined,
        status: isFullyPaid ? 'Paid' : 'Partially Paid',
      }),
    }, 'Pay invoice');
  };

  const payInvoiceWithDetails = (invoiceId: string, amount: number, details: PaymentDetails) => {
    let updatedPaidAmount = 0;
    let isFullyPaid = false;

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const newPaid = (inv.paidAmount || 0) + amount;
        const isPaid = newPaid >= inv.totalAmount;
        updatedPaidAmount = newPaid;
        isFullyPaid = isPaid;
        return {
          ...inv,
          paidAmount: newPaid,
          paymentMethod: details.method,
          paymentDetails: details,
          paymentDate: details.paymentDate,
          paidAt: isPaid ? details.paymentDate : inv.paidAt,
          status: isPaid ? 'Paid' : 'Partially Paid',
        };
      })
    );
    const refTxt = details.referenceNumber ? ` (Ref: ${details.referenceNumber})` : '';
    const tenderTxt = details.tenderedAmount ? ` [Tendered: ₱${details.tenderedAmount}, Change: ₱${details.changeAmount || 0}]` : '';
    logAction('PAYMENT_RECORDED', 'Billing', invoiceId, `Payment of ₱${amount} recorded via ${details.method}${refTxt}${tenderTxt}`);

    syncToBackend(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        paidAmount: updatedPaidAmount,
        paymentMethod: details.method,
        paymentDetails: details,
        paymentDate: details.paymentDate,
        paidAt: isFullyPaid ? details.paymentDate : undefined,
        status: isFullyPaid ? 'Paid' : 'Partially Paid',
      }),
    }, 'Pay invoice');
  };

  const updateHMOClaim = (invoiceId: string, claimData: Partial<HMOClaim>) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const currentClaim = inv.hmoClaim || {
          partnerName: claimData.partnerName || 'Maxicare Healthcare Corporation',
          memberId: claimData.memberId || 'N/A',
          loaNumber: claimData.loaNumber || `LOA-${Date.now().toString().slice(-6)}`,
          coverageAmount: claimData.coverageAmount ?? inv.totalAmount,
          patientShare: claimData.patientShare ?? 0,
          claimStatus: claimData.claimStatus || 'Pending Verification',
        };
        const updatedClaim: HMOClaim = { ...currentClaim, ...claimData };
        let newStatus = inv.status;
        if (updatedClaim.claimStatus === 'Approved') {
          newStatus = 'HMO Approved';
        } else if (updatedClaim.claimStatus === 'Rejected') {
          newStatus = 'Unpaid';
        }

        return {
          ...inv,
          hmoClaim: updatedClaim,
          status: newStatus,
        };
      })
    );
    logAction('HMO_CLAIM_UPDATED', 'Billing', invoiceId, `HMO claim updated for invoice ${invoiceId}: ${claimData.claimStatus || 'updated'}`);
  };

  const processHMOApproval = (invoiceId: string, loaNumber: string, approvedAmount: number, remarks?: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const existingClaim = inv.hmoClaim;
        const partnerName = existingClaim?.partnerName || 'Maxicare Healthcare Corporation';
        const memberId = existingClaim?.memberId || 'MEM-001';
        const patientShare = Math.max(0, inv.totalAmount - approvedAmount);
        const updatedClaim: HMOClaim = {
          partnerName,
          memberId,
          loaNumber,
          coverageAmount: approvedAmount,
          patientShare,
          claimStatus: 'Approved',
          approvedDate: new Date().toISOString(),
          verifiedBy: currentUser?.name || 'Reception Staff',
          remarks: remarks || 'LOA verified and approved by HMO portal',
        };
        const newPaid = (inv.paidAmount || 0) + approvedAmount;
        const isPaid = newPaid >= inv.totalAmount;
        return {
          ...inv,
          hmoClaim: updatedClaim,
          paidAmount: newPaid,
          status: isPaid ? 'Paid' : 'HMO Approved',
          paymentMethod: 'Insurance',
          paidAt: isPaid ? new Date().toISOString() : inv.paidAt,
        };
      })
    );
    logAction('HMO_LOA_APPROVED', 'Billing', invoiceId, `LOA ${loaNumber} approved for ₱${approvedAmount}`);
  };

  const syncClinicalOrdersToInvoice = (params: {
    patientId: string;
    patientName: string;
    patientMrn: string;
    consultationFee?: number;
    doctorName?: string;
    labItems?: { name: string; price: number }[];
    rxItems?: { name: string; price: number; quantity: number }[];
    procedureItems?: { name: string; price: number }[];
    hmoPartner?: string;
  }) => {
    const items: InvoiceItem[] = [];

    // Consultation fee
    const consultFee = params.consultationFee ?? 800;
    items.push({
      id: `ii-cons-${Date.now()}`,
      description: `Outpatient Consultation - ${params.doctorName || 'Attending Physician'}`,
      category: 'Consultation',
      quantity: 1,
      unitPrice: consultFee,
      total: consultFee,
    });

    // Lab items
    params.labItems?.forEach((lab, idx) => {
      items.push({
        id: `ii-lab-${Date.now()}-${idx}`,
        description: lab.name,
        category: 'Laboratory',
        quantity: 1,
        unitPrice: lab.price,
        total: lab.price,
      });
    });

    // Prescription items
    params.rxItems?.forEach((rx, idx) => {
      items.push({
        id: `ii-rx-${Date.now()}-${idx}`,
        description: `${rx.name} (qty: ${rx.quantity})`,
        category: 'Pharmacy',
        quantity: rx.quantity,
        unitPrice: rx.price,
        total: rx.price * rx.quantity,
      });
    });

    // Procedure items
    params.procedureItems?.forEach((proc, idx) => {
      items.push({
        id: `ii-proc-${Date.now()}-${idx}`,
        description: proc.name,
        category: 'Procedure',
        quantity: 1,
        unitPrice: proc.price,
        total: proc.price,
      });
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const pat = patients.find((p) => p.id === params.patientId);
    const hmoPartnerName = params.hmoPartner || pat?.insuranceProvider;

    let hmoClaimData: HMOClaim | undefined = undefined;
    if (hmoPartnerName && hmoPartnerName.toLowerCase() !== 'none' && hmoPartnerName.toLowerCase() !== 'cash') {
      const partner = hmoPartners.find((h) => h.name.toLowerCase().includes(hmoPartnerName.toLowerCase()) || h.code.toLowerCase() === hmoPartnerName.toLowerCase());
      const coverageRate = (partner?.coverageRate ?? 100) / 100;
      const coverageAmount = subtotal * coverageRate;
      const patientShare = subtotal - coverageAmount;
      hmoClaimData = {
        partnerId: partner?.id,
        partnerName: partner?.name || hmoPartnerName,
        memberId: pat?.insurancePolicyNumber || `HMO-${Date.now().toString().slice(-6)}`,
        loaNumber: `LOA-${Date.now().toString().slice(-6)}`,
        coverageAmount,
        patientShare,
        claimStatus: 'Pending Verification',
      };
    }

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${String(5000 + invoices.length + 1)}`,
      patientId: params.patientId,
      patientName: params.patientName,
      patientMrn: params.patientMrn,
      date: today,
      dueDate,
      items,
      subtotal,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: subtotal,
      paidAmount: 0,
      status: hmoClaimData ? 'HMO Pending' : 'Unpaid',
      hmoClaim: hmoClaimData,
      notes: `Automated live charge from consultation on ${today}`,
    };

    setInvoices((prev) => [newInv, ...prev]);
    logAction('INVOICE_CREATED', 'Billing', newInv.id, `Generated live synchronized invoice ${newInv.invoiceNumber} for ${newInv.patientName}`);
    syncInvoiceToSupabase(newInv);
    syncToBackend('/api/invoices', { method: 'POST', body: JSON.stringify(newInv) }, 'Create live invoice');

    return newInv;
  };

  // ==============================================================================
  // ROLE-BASED NOTIFICATION FILTERING (Strict Isolation)
  // Patient -> only 'patient'
  // Provider (Doctor, Nurse, Staff) -> only 'provider'
  // Admin -> only 'admin'
  // ==============================================================================
  // STRICT USER-SCOPED NOTIFICATIONS (Zero-Leakage RBAC & Identity Isolation)
  // ==============================================================================
  const roleNotifications = useMemo(() => {
    if (!isAuthenticated) return [];

    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();

    return notifications
      .filter((n: any) => {
        if (!n || !n.id) return false;

        // Deduplicate by ID
        if (seenIds.has(n.id)) return false;

        // Deduplicate by semantic signature (title + message + target)
        const sig = `${(n.title || '').trim().toLowerCase()}|${(n.message || '').trim().toLowerCase()}|${n.recipientId || ''}|${n.patientId || ''}|${n.doctorId || ''}`;
        if (seenSignatures.has(sig)) return false;

        const notifRecipientId = n.recipientId || n.userId;
        const notifPatientId = n.patientId || (n.relatedResourceType === 'patient' ? n.relatedResourceId : undefined);
        const notifDoctorId = n.doctorId;
        const notifRecipientEmail = (n.recipientEmail || n.email || '').toLowerCase();
        const currentEmail = (currentUser?.email || '').toLowerCase();
        const notifRole = (n.recipientRole || n.targetRole || '').toLowerCase();

        // 1. PATIENT SCOPE:
        // Patient MUST ONLY see notifications related to their specific account/record
        if (activeRole === 'patient' || primaryRole === 'patient') {
          const matchesPatientId = Boolean(linkedPatientId && (notifRecipientId === linkedPatientId || notifPatientId === linkedPatientId));
          const matchesUserId = Boolean(currentUser?.id && (notifRecipientId === currentUser.id || n.userId === currentUser.id));
          const matchesEmail = Boolean(currentEmail && notifRecipientEmail && notifRecipientEmail === currentEmail);

          if (!matchesPatientId && !matchesUserId && !matchesEmail) {
            return false;
          }

          // Disallow any provider or admin internal alerts
          if (notifRole !== 'patient' && notifRole !== 'all' && !matchesPatientId && !matchesUserId) {
            return false;
          }
          seenIds.add(n.id);
          seenSignatures.add(sig);
          return true;
        }

        // 2. DOCTOR SCOPE:
        // Doctor ONLY sees notifications for their own schedule, appointments, or assigned patients
        if (activeRole === 'doctor' || primaryRole === 'doctor') {
          const matchesDoctorId = Boolean(currentUser?.id && (notifDoctorId === currentUser.id || notifRecipientId === currentUser.id));
          const matchesDoctorEmail = Boolean(currentEmail && notifRecipientEmail && notifRecipientEmail === currentEmail);
          const isGeneralDoctorNotif = (notifRole === 'doctor' || notifRole === 'provider') && !notifDoctorId && !notifRecipientId;
          if (matchesDoctorId || matchesDoctorEmail || isGeneralDoctorNotif) {
            seenIds.add(n.id);
            seenSignatures.add(sig);
            return true;
          }
          return false;
        }

        // 3. ADMIN SCOPE:
        if (activeRole === 'admin' || primaryRole === 'admin') {
          const isAdminNotif = notifRole === 'admin' || n.category === 'inventory' || n.category === 'security' || n.category === 'system' || notifRole === 'all';
          if (isAdminNotif) {
            seenIds.add(n.id);
            seenSignatures.add(sig);
            return true;
          }
          return false;
        }

        // 4. SPECIFIC STAFF ROLES:
        let isStaffMatch = false;
        if (activeRole === 'nurse') {
          isStaffMatch = notifRole === 'nurse' || (notifRole === 'provider' && (n.category === 'triage' || n.category === 'appointment' || n.category === 'queue_call'));
        } else if (activeRole === 'receptionist') {
          isStaffMatch = notifRole === 'receptionist' || (notifRole === 'provider' && (n.category === 'appointment' || n.category === 'queue_call'));
        } else if (activeRole === 'pharmacist') {
          isStaffMatch = notifRole === 'pharmacist' || n.category === 'prescription' || n.category === 'inventory';
        } else if (activeRole === 'lab_technician') {
          isStaffMatch = notifRole === 'lab_technician' || n.category === 'lab';
        }

        if (isStaffMatch) {
          seenIds.add(n.id);
          seenSignatures.add(sig);
          return true;
        }

        return false;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
  }, [notifications, activeRole, primaryRole, currentUser, linkedPatientId, isAuthenticated]);

  const unreadNotificationCount = useMemo(() => {
    return roleNotifications.filter((n) => !n.read).length;
  }, [roleNotifications]);

  // Live real-time notification sync with server and cross-tab BroadcastChannel
  useEffect(() => {
    let isMounted = true;

    // Cross-tab broadcast channel with strict recipient verification
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        channel = new BroadcastChannel('smart_clinic_notifications_broadcast');
        channel.onmessage = (event) => {
          if (!isMounted) return;
          if (event.data?.type === 'NEW_NOTIFICATION' && event.data.notification) {
            const incoming: Notification = event.data.notification;
            const myEmail = (currentUser?.email || '').toLowerCase();
            const incEmail = (incoming.recipientEmail || incoming.email || '').toLowerCase();
            const isForMe =
              (incoming.recipientId && (incoming.recipientId === currentUser?.id || incoming.recipientId === linkedPatientId)) ||
              (incoming.patientId && incoming.patientId === linkedPatientId) ||
              (incoming.doctorId && incoming.doctorId === currentUser?.id) ||
              (incEmail && myEmail && incEmail === myEmail) ||
              (activeRole === 'admin' && (incoming.recipientRole === 'admin' || incoming.targetRole === 'admin')) ||
              (activeRole === 'doctor' && (incoming.recipientRole === 'doctor' || incoming.recipientRole === 'provider')) ||
              (activeRole === 'nurse' && (incoming.recipientRole === 'nurse' || incoming.recipientRole === 'provider')) ||
              (activeRole === 'receptionist' && (incoming.recipientRole === 'receptionist' || incoming.recipientRole === 'provider'));

            if (!isForMe) return;

            setNotifications((prev) => {
              if (
                prev.some(
                  (n) =>
                    n.id === incoming.id ||
                    (n.title === incoming.title &&
                      n.message === incoming.message &&
                      Math.abs(new Date(n.createdAt || 0).getTime() - new Date(incoming.createdAt || 0).getTime()) < 5000)
                )
              ) {
                return prev;
              }
              return [incoming, ...prev];
            });
          } else if (event.data?.type === 'UPDATE_APPOINTMENT_STATUS') {
            const { id, status, notes } = event.data;
            setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status, ...(notes !== undefined ? { notes } : {}) } : a)));
          } else if (event.data?.type === 'NEW_APPOINTMENT' && event.data.appointment) {
            const incomingApt: Appointment = event.data.appointment;
            setAppointments((prev) => {
              if (prev.some((a) => a.id === incomingApt.id)) return prev;
              return [incomingApt, ...prev];
            });
          }
        };
      }
    } catch {}

    const fetchLiveNotifications = async () => {
      try {
        const token = authToken || localStorage.getItem('smart_clinic_token');
        if (!token) return;
        const headers: Record<string, string> = {
          'x-user-role': activeRole,
          'x-background-poll': '1',
          Authorization: `Bearer ${token}`,
        };
        if (currentUser?.id) headers['x-user-id'] = currentUser.id;
        if (currentUser?.email) headers['x-user-email'] = currentUser.email;
        if (linkedPatientId) headers['x-linked-patient-id'] = linkedPatientId;

        const queryParams = new URLSearchParams();
        if (currentUser?.id) queryParams.set('userId', currentUser.id);
        if (linkedPatientId) queryParams.set('patientId', linkedPatientId);
        if (activeRole) queryParams.set('role', activeRole);

        const res = await fetch(`${API_BASE_URL}/api/notifications?${queryParams.toString()}`, { headers });
        if (res.status === 401 && isAuthenticated && token) {
          logoutRef.current('login');
          return;
        }
        if (res.ok) {
          const liveData: Notification[] = await res.json();
          if (isMounted && Array.isArray(liveData)) {
            setNotifications((prev) => {
              const idMap = new Map<string, Notification>();
              const signatureMap = new Map<string, Notification>();

              // Register authoritative live data first
              liveData.forEach((item) => {
                const sig = `${(item.title || '').trim().toLowerCase()}|${(item.message || '').trim().toLowerCase()}|${item.recipientId || ''}|${item.patientId || ''}`;
                signatureMap.set(sig, item);
                idMap.set(item.id, item);
              });

              // Check existing local notifications
              prev.forEach((localItem) => {
                if (idMap.has(localItem.id)) {
                  // Retain user's local read status if marked read locally before server poll
                  const serverItem = idMap.get(localItem.id)!;
                  if (localItem.read && !serverItem.read) {
                    idMap.set(localItem.id, { ...serverItem, read: true });
                  }
                  return;
                }
                const sig = `${(localItem.title || '').trim().toLowerCase()}|${(localItem.message || '').trim().toLowerCase()}|${localItem.recipientId || ''}|${localItem.patientId || ''}`;
                if (signatureMap.has(sig)) {
                  // Already represented on server by content signature
                  return;
                }
                // Only keep local notifications that are recent (<15 seconds in-flight)
                const isRecent = localItem.createdAt && (Date.now() - new Date(localItem.createdAt).getTime() < 15000);
                if (isRecent) {
                  idMap.set(localItem.id, localItem);
                }
              });

              return Array.from(idMap.values());
            });
          }
        }
      } catch {
        // Fallback silently if offline or during build
      }
    };

    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, [activeRole, authToken, currentUser, linkedPatientId, isAuthenticated]);

  // Authenticated Real-Time WebSocket (/ws/clinic) + Optional Supabase Realtime Channel
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      setWsConnected(false);
      return;
    }
    const token = authToken || localStorage.getItem('smart_clinic_token');
    if (!token) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connectWs = () => {
      if (disposed) return;
      try {
        const wsOrigin = window.location.origin.replace(/^http/, 'ws');
        ws = new WebSocket(`${wsOrigin}/ws/clinic?token=${encodeURIComponent(token)}`);
        ws.onopen = () => {
          if (!disposed) setWsConnected(true);
        };
        ws.onclose = () => {
          if (!disposed) {
            setWsConnected(false);
            reconnectTimer = setTimeout(connectWs, 4000);
          }
        };
        ws.onerror = () => {
          if (!disposed) setWsConnected(false);
        };
        ws.onmessage = (event) => {
          if (disposed) return;
          try {
            const payload = JSON.parse(String(event.data || '{}'));
            if (payload.type === 'session:revoked') {
              logoutRef.current('login');
              return;
            }
            if (payload.appointment) {
              const incomingApt: Appointment = payload.appointment;
              setAppointments((prev) => {
                const exists = prev.some((a) => a.id === incomingApt.id);
                if (!exists) return [incomingApt, ...prev];
                return prev.map((a) => (a.id === incomingApt.id ? { ...a, ...incomingApt } : a));
              });
            }
            if (payload.type === 'teleconsult:signal' || payload.type === 'teleconsult:participant_joined' || payload.type === 'teleconsult:ended') {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('smartclinic:teleconsult-signal', { detail: payload }));
              }
            }
            if (payload.type === 'patient:called') {
              if (payload.notification) {
                const incNotif: Notification = payload.notification;
                setNotifications((prev) => {
                  if (prev.some((n) => n.id === incNotif.id)) return prev;
                  return [incNotif, ...prev];
                });
              }
              if (payload.appointment) {
                showLocalBrowserQueueNotification({
                  queueNumber: payload.appointment.queueNumber,
                  room: payload.appointment.room,
                  appointmentId: payload.appointment.id,
                });
              }
            }
          } catch {}
        };
      } catch {
        setWsConnected(false);
      }
    };

    connectWs();

    // Optional Supabase Realtime listener when a separate V2 Supabase project is configured
    let supabaseChannel: any = null;
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
      if (sb) {
        try {
          supabaseChannel = sb
            .channel('smartclinic-v2-live-queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
              syncClinicFromBackend();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
              syncClinicFromBackend();
            })
            .subscribe();
        } catch {}
      }
    }

    return () => {
      disposed = true;
      setWsConnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try { ws.close(); } catch {}
      }
      if (supabaseChannel && isSupabaseConfigured()) {
        try { getSupabaseClient()?.removeChannel(supabaseChannel); } catch {}
      }
    };
  }, [isAuthenticated, authToken, syncClinicFromBackend]);

  const addNotification = (notifData: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification => {
    const newNotif: Notification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId: notifData.recipientId || (activeRole === 'patient' ? (linkedPatientId || currentUser?.id) : currentUser?.id),
      recipientRole: notifData.recipientRole || activeRole,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Dispatch via BroadcastChannel for instant cross-tab update
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const channel = new BroadcastChannel('smart_clinic_notifications_broadcast');
        channel.postMessage({ type: 'NEW_NOTIFICATION', notification: newNotif });
        channel.close();
      }
    } catch {}

    // Dispatch to server asynchronously for live persistence
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole,
          'x-user-id': currentUser?.id || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newNotif),
      }).catch(() => {});
    } catch {}

    return newNotif;
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'x-user-role': activeRole,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    } catch {}
  };

  const markAllNotificationsAsRead = () => {
    const roleScope = activeRole === 'patient' ? 'patient' : (activeRole === 'doctor' || activeRole === 'nurse' ? 'provider' : 'admin');
    setNotifications((prev) =>
      prev.map((n) => {
        const isUserScoped = n.recipientId && currentUser?.id ? n.recipientId === currentUser.id : true;
        const target = n.targetRole || n.recipientRole || 'all';
        if (isUserScoped && (target === 'all' || target === roleScope || target === activeRole)) {
          return { ...n, read: true };
        }
        return n;
      })
    );
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'POST',
        headers: {
          'x-user-role': activeRole,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    } catch {}
  };

  const [supabaseRefreshKey, setSupabaseRefreshKey] = useState(0);
  const supabaseInfo = useMemo(() => getSupabaseConfigInfo(), [supabaseRefreshKey]);
  const refreshSupabaseConfig = () => setSupabaseRefreshKey((k) => k + 1);

  const syncAllToSupabase = async () => {
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      if (token) {
        const apiRes = await fetch(`${API_BASE_URL}/api/supabase/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (apiRes.ok) {
          const body = await apiRes.json();
          logAction('SUPABASE_FULL_SYNC', 'System', 'supabase-cloud', body.message || 'Server-side Supabase sync completed');
          return body;
        }
      }
    } catch {
      // Fallback to authenticated Supabase session sync if backend endpoint is unreachable
    }

    const res = await syncAllClinicDataToSupabase({
      patients,
      appointments,
      consultations,
      prescriptions,
      labOrders,
      inventory,
      invoices,
      auditLogs,
    });
    logAction('SUPABASE_FULL_SYNC', 'System', 'supabase-cloud', res.message);
    return res;
  };

  const addDoctor = async (doctorData: {
    name: string;
    email: string;
    department: string;
    specialty: string;
    licenseNumber: string;
    phone?: string;
    workDays: number[];
    startHour?: number;
    endHour?: number;
    workDaysLabel?: string;
    hoursLabel?: string;
    status?: 'Active' | 'On Leave' | 'Inactive';
    notes?: string;
  }) => {
    const cleanName = doctorData.name.trim();
    const cleanEmail = doctorData.email.trim().toLowerCase();

    if (!cleanName) return { success: false, error: 'Physician name is required.' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Valid professional email is required (e.g. doctor@smartclinic.ph).' };
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: `An account with email "${cleanEmail}" is already registered in the system.` };
    }

    const cleanLicense = doctorData.licenseNumber?.trim() || `DEMO-MD-${Math.floor(100000 + Math.random() * 900000)}`;
    if (cleanLicense.length < 3) {
      return { success: false, error: 'A valid demonstration credential ID is required.' };
    }

    const doctorId = `usr-${Date.now()}`;
    const days = doctorData.workDays && doctorData.workDays.length > 0 ? doctorData.workDays : [1, 2, 3, 4, 5];

    // Register dynamic personal schedule
    const schedule = createCustomDoctorSchedule({
      doctorId,
      doctorName: cleanName,
      department: doctorData.department || 'General Medicine',
      specialty: doctorData.specialty || 'General Practice',
      workDays: days,
      workDaysLabel: doctorData.workDaysLabel,
      hoursLabel: doctorData.hoursLabel,
      startHour: doctorData.startHour || 8,
      endHour: doctorData.endHour || 17,
    });

    const newDoctor: User = {
      id: doctorId,
      name: cleanName,
      email: cleanEmail,
      role: 'doctor',
      department: doctorData.department || 'General Medicine',
      specialty: doctorData.specialty || 'Internal & Family Medicine',
      licenseNumber: cleanLicense,
      branches: ['Main Outpatient Clinic', 'Annex Satellite Clinic'],
      consultationModes: ['In-Person', 'Online Consultation'],
      phone: doctorData.phone?.trim() || undefined,
      workDays: days,
      workDaysLabel: schedule.workDaysLabel,
      hoursLabel: schedule.hoursLabel,
      startHour: doctorData.startHour || 8,
      endHour: doctorData.endHour || 17,
      status: doctorData.status || 'Active',
      notes: doctorData.notes?.trim() || undefined,
      schedule,
      permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update state & persist in localStorage immediately
    setUsers((prev) => {
      const updated = [newDoctor, ...prev.filter((u) => u.id !== doctorId)];
      try {
        localStorage.setItem('smart_clinic_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Persist to server database if available (requires verified admin bearer token)
    try {
      const token = authToken || localStorage.getItem('smart_clinic_token');
      await fetch(`${API_BASE_URL}/api/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...doctorData, doctorId, licenseNumber: cleanLicense }),
      });
    } catch {}

    // Add audit log and notification
    logAction('DOCTOR_CREDENTIALED', 'Security', doctorId, `New physician registered: ${cleanName} (${newDoctor.specialty}) • Demo ID: ${cleanLicense}`);
    addNotification({
      title: 'New Physician Registered',
      message: `${cleanName} (${newDoctor.specialty}) has been credentialed and added to the medical staff.`,
      targetRole: 'all',
      type: 'system',
    });

    return { success: true, doctor: newDoctor };
  };

  const updateDoctor = async (
    doctorId: string,
    updates: {
      name: string;
      email: string;
      department: string;
      specialty: string;
      licenseNumber: string;
      phone?: string;
      workDays?: number[];
      startHour?: number;
      endHour?: number;
      workDaysLabel?: string;
      hoursLabel?: string;
      status?: 'Active' | 'On Leave' | 'Inactive';
      notes?: string;
    }
  ) => {
    const cleanName = updates.name.trim();
    const cleanEmail = updates.email.trim().toLowerCase();

    if (!cleanName) return { success: false, error: 'Physician name cannot be empty.' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Valid professional email format is required.' };
    }

    if (users.some((u) => u.id !== doctorId && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: `Email address "${cleanEmail}" is already used by another clinician or staff.` };
    }

    const cleanLicense = updates.licenseNumber?.trim();
    if (!cleanLicense) {
      return { success: false, error: 'Doctor license number / PRC ID cannot be empty.' };
    }

    const existingDoctor = users.find((u) => u.id === doctorId);
    if (!existingDoctor) {
      return { success: false, error: 'Physician profile not found in active records.' };
    }

    const days = updates.workDays && updates.workDays.length > 0 ? updates.workDays : existingDoctor.workDays || [1, 2, 3, 4, 5];
    const startH = updates.startHour ?? existingDoctor.startHour ?? 8;
    const endH = updates.endHour ?? existingDoctor.endHour ?? 17;

    const schedule = createCustomDoctorSchedule({
      doctorId,
      doctorName: cleanName,
      department: updates.department || existingDoctor.department || 'General Medicine',
      specialty: updates.specialty || existingDoctor.specialty || 'General Practice',
      workDays: days,
      workDaysLabel: updates.workDaysLabel,
      hoursLabel: updates.hoursLabel,
      startHour: startH,
      endHour: endH,
    });

    const updatedDoctor: User = {
      ...existingDoctor,
      name: cleanName,
      email: cleanEmail,
      department: updates.department || existingDoctor.department,
      specialty: updates.specialty || existingDoctor.specialty,
      licenseNumber: cleanLicense,
      phone: updates.phone?.trim() ?? existingDoctor.phone,
      workDays: days,
      workDaysLabel: schedule.workDaysLabel,
      hoursLabel: schedule.hoursLabel,
      startHour: startH,
      endHour: endH,
      status: updates.status || existingDoctor.status || 'Active',
      notes: updates.notes?.trim() ?? existingDoctor.notes,
      schedule,
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === doctorId ? updatedDoctor : u));
      try {
        localStorage.setItem('smart_clinic_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logAction('DOCTOR_CREDENTIALS_UPDATED', 'Security', doctorId, `Physician record updated: ${cleanName} (${updatedDoctor.specialty})`);
    addNotification({
      title: 'Physician Credentials Updated',
      message: `Profile and clinical credentials updated for ${cleanName}.`,
      targetRole: 'admin',
      type: 'system',
    });

    return { success: true, doctor: updatedDoctor };
  };

  const addClinicalStaff = async (staffData: {
    name: string;
    role: 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';
    department: string;
    email: string;
    phone?: string;
    licenseNumber?: string;
    credentials?: string;
    temporaryPassword?: string;
    status?: 'Active' | 'On Leave' | 'Inactive';
    notes?: string;
  }) => {
    const cleanName = staffData.name.trim();
    const cleanEmail = staffData.email.trim().toLowerCase();

    if (!cleanName) return { success: false, error: 'Staff member full name is required.' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Valid clinic email address is required.' };
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: `An account with email "${cleanEmail}" is already registered.` };
    }

    const validRoles = ['nurse', 'receptionist', 'lab_technician', 'pharmacist'];
    if (!validRoles.includes(staffData.role)) {
      return { success: false, error: 'Please select a valid clinical staff role (Nurse, Receptionist, Lab Technician, or Pharmacist).' };
    }

    const staffId = `usr-staff-${Date.now()}`;
    const newStaff: User = {
      id: staffId,
      name: cleanName,
      email: cleanEmail,
      role: staffData.role,
      subRole: staffData.role,
      department: staffData.department.trim() || 'Clinical Operations',
      phone: staffData.phone?.trim() || undefined,
      licenseNumber: staffData.licenseNumber?.trim() || undefined,
      credentials: staffData.credentials?.trim() || undefined,
      temporaryPassword: staffData.temporaryPassword?.trim() || undefined,
      status: staffData.status || 'Active',
      notes: staffData.notes?.trim() || undefined,
      permissions: { ...DEFAULT_ROLE_PERMISSIONS[staffData.role] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => {
      const updated = [newStaff, ...prev.filter((u) => u.id !== staffId)];
      try {
        localStorage.setItem('smart_clinic_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logAction('STAFF_ACCOUNT_REGISTERED', 'Security', staffId, `New clinical staff credentialed: ${cleanName} (${staffData.role.toUpperCase()})`);
    addNotification({
      title: 'New Clinical Staff Registered',
      message: `${cleanName} registered as ${staffData.role.replace('_', ' ').toUpperCase()} in ${newStaff.department}.`,
      targetRole: 'admin',
      type: 'system',
    });

    return { success: true, staff: newStaff };
  };

  const updateClinicalStaff = async (
    staffId: string,
    updates: {
      name: string;
      role: 'nurse' | 'receptionist' | 'lab_technician' | 'pharmacist';
      department: string;
      email: string;
      phone?: string;
      licenseNumber?: string;
      credentials?: string;
      temporaryPassword?: string;
      status?: 'Active' | 'On Leave' | 'Inactive';
      notes?: string;
    }
  ) => {
    const cleanName = updates.name.trim();
    const cleanEmail = updates.email.trim().toLowerCase();

    if (!cleanName) return { success: false, error: 'Staff member full name cannot be empty.' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Valid clinic email format is required.' };
    }

    if (users.some((u) => u.id !== staffId && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: `Email address "${cleanEmail}" is already used by another account.` };
    }

    const validRoles = ['nurse', 'receptionist', 'lab_technician', 'pharmacist'];
    if (!validRoles.includes(updates.role)) {
      return { success: false, error: 'Invalid clinical staff role selected.' };
    }

    const existing = users.find((u) => u.id === staffId);
    if (!existing) {
      return { success: false, error: 'Staff member account not found.' };
    }

    const updatedStaff: User = {
      ...existing,
      name: cleanName,
      email: cleanEmail,
      role: updates.role,
      subRole: updates.role,
      department: updates.department.trim() || existing.department,
      phone: updates.phone?.trim() ?? existing.phone,
      licenseNumber: updates.licenseNumber?.trim() ?? existing.licenseNumber,
      credentials: updates.credentials?.trim() ?? existing.credentials,
      temporaryPassword: updates.temporaryPassword?.trim() ?? existing.temporaryPassword,
      status: updates.status || existing.status || 'Active',
      notes: updates.notes?.trim() ?? existing.notes,
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === staffId ? updatedStaff : u));
      try {
        localStorage.setItem('smart_clinic_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logAction('STAFF_ACCOUNT_UPDATED', 'Security', staffId, `Clinical staff updated: ${cleanName} (${updates.role})`);
    addNotification({
      title: 'Staff Profile Updated',
      message: `Account details updated for ${cleanName}.`,
      targetRole: 'admin',
      type: 'system',
    });

    return { success: true, staff: updatedStaff };
  };

  const deleteUser = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };
    if (target.role === 'admin' || target.email === 'smartclinicrealacc@gmail.com') {
      return { success: false, error: 'The Executive Admin account cannot be deleted.' };
    }
    if (target.id === currentUser.id) {
      return { success: false, error: 'You cannot delete your own currently active session account.' };
    }

    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      try {
        localStorage.setItem('smart_clinic_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logAction('USER_ACCOUNT_REMOVED', 'Security', userId, `Account removed from clinic roster: ${target.name} (${target.role})`);
    addNotification({
      title: 'Account Removed',
      message: `${target.name} has been removed from active staff roster.`,
      targetRole: 'admin',
      type: 'system',
    });

    return { success: true };
  };

  const toggleUserStatus = async (userId: string, newStatus: 'Active' | 'On Leave' | 'Inactive') => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };

    const updatedUser: User = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === userId ? updatedUser : u));
      try {
        localStorage.setItem('smart_clinic_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logAction('USER_STATUS_CHANGED', 'Security', userId, `Status of ${target.name} changed to ${newStatus}`);
    return { success: true };
  };

  const checkTwoFactorStatus = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/2fa/status?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      return { enabled: Boolean(data?.enabled) };
    } catch {
      return { enabled: false };
    }
  };

  const enableTwoFactor = async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/2fa/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to activate Authenticator 2FA.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Server connection failed.' };
    }
  };

  const disableTwoFactor = async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to disable Authenticator 2FA.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Server connection failed.' };
    }
  };

  const getUserPermissions = useCallback((user?: User | null): UserPermissions => {
    if (!user) return DEFAULT_ROLE_PERMISSIONS.patient;
    if (user.role === 'admin' || user.email === 'smartclinicrealacc@gmail.com') {
      return { ...DEFAULT_ROLE_PERMISSIONS.admin };
    }
    const defaultForRole = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.nurse;
    if (user.permissions && typeof user.permissions === 'object') {
      return {
        ...defaultForRole,
        ...user.permissions,
      };
    }
    return { ...defaultForRole };
  }, []);

  const hasPermission = useCallback(
    (permission: keyof UserPermissions): boolean => {
      // Admin retains full access across all modules
      if (activeRole === 'admin' || primaryRole === 'admin') {
        return true;
      }
      const perms = getUserPermissions(currentUser);
      return Boolean(perms[permission]);
    },
    [activeRole, primaryRole, currentUser, getUserPermissions]
  );

  const updateUserPermissions = useCallback(
    (userId: string, newPermissions: Partial<UserPermissions>) => {
      setUsers((prev) => {
        const updated = prev.map((u) => {
          if (u.id === userId) {
            // Safety validation: Admin cannot remove their own full access
            if (u.role === 'admin' || u.email === 'smartclinicrealacc@gmail.com') {
              return {
                ...u,
                permissions: { ...DEFAULT_ROLE_PERMISSIONS.admin },
              };
            }
            const currentPerms = u.permissions || DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.nurse;
            const merged: UserPermissions = {
              ...currentPerms,
              ...newPermissions,
            };
            return {
              ...u,
              permissions: merged,
              updatedAt: new Date().toISOString(),
            };
          }
          return u;
        });

        try {
          localStorage.setItem('smart_clinic_users', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // If modifying current logged-in user, update currentUser as well
      if (currentUser.id === userId) {
        setCurrentUser((prev) => {
          const currentPerms = prev.permissions || DEFAULT_ROLE_PERMISSIONS[prev.role] || DEFAULT_ROLE_PERMISSIONS.nurse;
          const merged = { ...currentPerms, ...newPermissions };
          const updatedUser: User = { ...prev, permissions: merged };
          try {
            const raw = localStorage.getItem('smart_clinic_auth_session');
            if (raw) {
              const s = JSON.parse(raw);
              s.permissions = merged;
              localStorage.setItem('smart_clinic_auth_session', JSON.stringify(s));
            }
          } catch {}
          return updatedUser;
        });
      }

      const target = users.find((u) => u.id === userId);
      const targetName = target?.name || userId;
      logAction(
        'PERMISSIONS_UPDATED',
        'Security',
        userId,
        `Admin modified module privileges for ${targetName} (${target?.role || 'staff'}). Changes saved to persistent state.`
      );
    },
    [currentUser.id, users, logAction]
  );

  const resetUserPermissionsToRole = useCallback(
    (userId: string, roleTemplate?: UserRole) => {
      const target = users.find((u) => u.id === userId);
      const role = roleTemplate || target?.role || 'nurse';
      const templatePerms = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.nurse;
      updateUserPermissions(userId, templatePerms);
    },
    [users, updateUserPermissions]
  );

  return (
    <ClinicContext.Provider
      value={{
        currentUser,
        activeRole,
        switchRole,
        users,
        primaryRole,
        staffSubRole,
        isAuthenticated,
        authReady,
        authToken,
        login,
        logout,
        addDoctor,
        updateDoctor,
        addClinicalStaff,
        updateClinicalStaff,
        deleteUser,
        toggleUserStatus,
        hasPermission,
        getUserPermissions,
        updateUserPermissions,
        resetUserPermissionsToRole,
        checkTwoFactorStatus,
        enableTwoFactor,
        disableTwoFactor,
        pendingAction,
        setPendingAction,
        requestPhoneOtp,
        requestEmailOtp,
        verifyServerOtp,
        registerPatient,
        linkedPatientId,
        currentPatient: currentPatientRecord,
        visiblePatients,
        myAppointments,
        activeTab,
        setActiveTab,
        isNavigating,
        navigatingTargetTitle,
        patients: isolatedPatients,
        allStaffPatients: patients,
        selectedPatientId,
        selectedPatient,
        selectPatient,
        addPatient,
        updatePatient,
        addVitals,
        saveTriageRecord,
        triageDraftForBooking,
        setTriageDraftForBooking,
        isBookAppointmentOpen,
        setIsBookAppointmentOpen,
        openBookAppointmentWithDraft,
        appointments: isolatedAppointments,
        allClinicAppointments: appointments,
        addAppointment,
        updateAppointmentStatus,
        acknowledgeCalledAppointment,
        noShowGraceMinutes,
        setNoShowGraceMinutes,
        wsConnected,
        cancelAppointment,
        updateAppointmentRoom,
        checkInPatient,
        advanceQueueStatus,
        rescheduleAppointment,
        consultations: isolatedConsultations,
        addConsultation,
        prescriptions: isolatedPrescriptions,
        addPrescription,
        dispenseMedication,
        labOrders: isolatedLabOrders,
        addLabOrder,
        updateLabStatus,
        enterLabResults,
        inventory,
        adjustStock,
        invoices: isolatedInvoices,
        hmoPartners,
        addInvoice,
        payInvoice,
        payInvoiceWithDetails,
        updateHMOClaim,
        processHMOApproval,
        syncClinicalOrdersToInvoice,
        notifications: roleNotifications,
        allNotifications: notifications,
        unreadNotificationCount,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        auditLogs,
        logAction,
        searchQuery,
        setSearchQuery,
        supabaseInfo,
        syncAllToSupabase,
        refreshSupabaseConfig,
        syncClinicFromBackend,
        language,
        setLanguage,
        t,
        showSessionWarning,
        sessionSecondsRemaining,
        sessionTimeoutTotal,
        resetSessionTimer,
        setActiveClinicalSessionProtected,
        inventoryTransactions,
        restockRequests,
        clinicSettings,
        notificationPreferences,
        reminderLogs,
        createAppointmentVerified,
        verifyAppointmentQr,
        recordPatientVitals,
        dispensePrescription,
        updateReorderThreshold,
        createRestockRequest,
        updateRestockRequest,
        advanceLabWorkflow,
        updateClinicSettings,
        updateNotificationPreferences,
        runScheduledRemindersNow,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic must be used within ClinicProvider');
  return context;
};
