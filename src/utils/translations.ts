/**
 * Smart Clinic — Global Bilingual Translation Engine (English & Tagalog / Filipino)
 * Complete system-wide terminology, navigation, clinical actions, and dialogs.
 */

export type AppLanguage = 'en' | 'fil';

export interface Translations {
  // Navigation & System Titles
  nav: {
    home: string;
    dashboard: string;
    patientPortal: string;
    patients: string;
    appointments: string;
    queue: string;
    consultations: string;
    emr: string;
    prescriptions: string;
    laboratory: string;
    inventory: string;
    billing: string;
    reports: string;
    predictiveAnalytics: string;
    aiAssistant: string;
    auditLogs: string;
    notifications: string;
    scanHealthId: string;
    signIn: string;
    signOut: string;
    profileSettings: string;
  };
  // Roles
  roles: {
    patient: string;
    doctor: string;
    nurse: string;
    pharmacist: string;
    receptionist: string;
    labTechnician: string;
    lab_technician: string;
    admin: string;
    provider: string;
    staff: string;
    [key: string]: string;
  };
  // Common Labels & Actions
  common: {
    welcome: string;
    noData: string;
    searchPlaceholder: string;
    bookAppointment: string;
    viewLiveQueue: string;
    stayLoggedIn: string;
    logOut: string;
    cancel: string;
    confirm: string;
    save: string;
    close: string;
    back: string;
    search: string;
    filter: string;
    status: string;
    date: string;
    time: string;
    doctor: string;
    patient: string;
    action: string;
    details: string;
    loading: string;
    all: string;
    refresh: string;
    print: string;
    download: string;
    yes: string;
    no: string;
    success: string;
    error: string;
    warning: string;
    sessionRemaining: string;
    inactivityNotice: string;
    open24Hours: string;
    emergencyHotline: string;
    privacyCertified: string;
  };
  // Homepage
  home: {
    bannerNotice: string;
    accreditation: string;
    heroBadge: string;
    heroTitlePart1: string;
    heroTitlePart2: string;
    heroSubtitle: string;
    btnBookNow: string;
    btnViewQueue: string;
    btnPortalLogin: string;
    liveQueueTitle: string;
    avgWaitTime: string;
    inConsultation: string;
    waitingInQueue: string;
    scheduledToday: string;
    currentPatient: string;
    estWait: string;
    queueFullNotice: string;
    featuresTitle: string;
    featuresSubtitle: string;
    feat1Title: string;
    feat1Desc: string;
    feat2Title: string;
    feat2Desc: string;
    feat3Title: string;
    feat3Desc: string;
    feat4Title: string;
    feat4Desc: string;
    feat5Title: string;
    feat5Desc: string;
    feat6Title: string;
    feat6Desc: string;
    doctorsTitle: string;
    doctorsSubtitle: string;
    faqTitle: string;
    faqSubtitle: string;
    faq1Q: string;
    faq1A: string;
    faq2Q: string;
    faq2A: string;
    faq3Q: string;
    faq3A: string;
    faq4Q: string;
    faq4A: string;
    footerAbout: string;
    quickLinks: string;
    emergencyHeading: string;
    rightsReserved: string;
  };
  // Login & Authentication
  auth: {
    portalTitle: string;
    portalSubtitle: string;
    patientTab: string;
    doctorTab: string;
    staffTab: string;
    adminTab: string;
    registerTab: string;
    loginTab: string;
    emailLabel: string;
    passwordLabel: string;
    confirmPasswordLabel: string;
    fullNameLabel: string;
    phoneLabel: string;
    subRoleLabel: string;
    twoFactorLabel: string;
    twoFactorPlaceholder: string;
    signInBtn: string;
    registerBtn: string;
    forgotPasswordBtn: string;
    dontHaveAccount: string;
    alreadyHaveAccount: string;
    registerHere: string;
    loginHere: string;
    authenticatorNotice: string;
    captchaVerification: string;
    privacyAgreement: string;
    privacyLink: string;
    dobLabel: string;
    ageLabel: string;
    genderLabel: string;
    bloodTypeLabel: string;
    addressLabel: string;
    emergencyContactLabel: string;
    allergiesLabel: string;
    chronicConditionsLabel: string;
    demoNote: string;
  };
  // Patient Portal & Dashboard
  patient: {
    welcome: string;
    healthPortalTitle: string;
    mrnLabel: string;
    bloodTypeLabel: string;
    primaryDoctorLabel: string;
    profileSettingsBtn: string;
    healthIdBtn: string;
    bookAppointmentBtn: string;
    vitalsTitle: string;
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    oxygenSat: string;
    weight: string;
    bmi: string;
    nextAppointment: string;
    noUpcomingAppointments: string;
    activePrescriptions: string;
    noActivePrescriptions: string;
    recentLabResults: string;
    noLabResults: string;
    billingSummary: string;
    unpaidBalance: string;
    totalInvoices: string;
    triageAdvisor: string;
    triageDesc: string;
    startTriageBtn: string;
    allergies: string;
    chronicConditions: string;
    noKnownAllergies: string;
    noChronicConditions: string;
  };
  // Doctor & Consultations
  doctor: {
    dashboardTitle: string;
    consultationWorkspace: string;
    todaySchedule: string;
    inQueueCount: string;
    completedToday: string;
    startConsultationBtn: string;
    viewChartBtn: string;
    soapNotes: string;
    chiefComplaint: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    writePrescription: string;
    orderLabTest: string;
    finishConsultation: string;
    clinicalDecisionSupport: string;
    aiDiagnosticSupport: string;
  };
  // Staff & Nurse Dashboard
  staff: {
    dashboardTitle: string;
    queueManagement: string;
    triageIntake: string;
    checkInPatient: string;
    recordVitals: string;
    scanHealthId: string;
    priorityEmergency: string;
    priorityUrgent: string;
    priorityRoutine: string;
    pharmacyStock: string;
    labPending: string;
    waitingPatients: string;
    callNextPatient: string;
  };
  // Admin Dashboard
  admin: {
    dashboardTitle: string;
    executiveOverview: string;
    totalPatients: string;
    appointmentsToday: string;
    revenueToday: string;
    lowStockAlerts: string;
    complianceAudit: string;
    addDoctorBtn: string;
    addStaffBtn: string;
    systemLogs: string;
    manageStaff: string;
    dataSecurityStatus: string;
  };
  // Session Expiration Modal
  session: {
    warningTitle: string;
    warningSubtitle: string;
    expireMessagePart1: string;
    expireMessagePart2: string;
    stayLoggedInBtn: string;
    logOutBtn: string;
    roleTimeoutInfo: string;
    patientTimeout: string;
    staffTimeout: string;
    doctorTimeout: string;
    adminTimeout: string;
    expiredToast: string;
  };
}

export const translations: Record<AppLanguage, Translations> = {
  en: {
    nav: {
      home: 'Homepage',
      dashboard: 'Dashboard',
      patientPortal: 'My Health Portal',
      patients: 'Patient Directory',
      appointments: 'Appointments',
      queue: 'Live Queue & Waiting Room',
      consultations: 'Consultation Suite',
      emr: 'Medical Records (EMR)',
      prescriptions: 'Prescriptions & Rx',
      laboratory: 'Diagnostic Lab',
      inventory: 'Pharmacy & Stock',
      billing: 'Billing & Invoices',
      reports: 'Reports & Analytics',
      predictiveAnalytics: 'Predictive Analytics',
      aiAssistant: 'AI Clinical Triage',
      auditLogs: 'Audit Logs & RA 10173',
      notifications: 'Notifications',
      scanHealthId: 'Scan Health ID',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      profileSettings: 'Profile Settings',
    },
    roles: {
      patient: 'Patient',
      doctor: 'Physician / Doctor',
      nurse: 'Registered Nurse',
      pharmacist: 'Licensed Pharmacist',
      receptionist: 'Front Desk Receptionist',
      labTechnician: 'Medical Technologist',
      lab_technician: 'Medical Technologist',
      admin: 'Clinic Administrator',
      provider: 'Clinical Provider',
      staff: 'Clinic Staff',
    },
    common: {
      welcome: 'Welcome',
      noData: 'No records available.',
      searchPlaceholder: 'Search by patient name, MRN, or doctor...',
      bookAppointment: 'Book Appointment',
      viewLiveQueue: 'View Live Queue',
      stayLoggedIn: 'Stay Logged In',
      logOut: 'Log Out',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save Changes',
      close: 'Close',
      back: 'Back',
      search: 'Search...',
      filter: 'Filter',
      status: 'Status',
      date: 'Date',
      time: 'Time',
      doctor: 'Doctor',
      patient: 'Patient',
      action: 'Action',
      details: 'Details',
      loading: 'Loading...',
      all: 'All',
      refresh: 'Refresh',
      print: 'Print',
      download: 'Download',
      yes: 'Yes',
      no: 'No',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      sessionRemaining: 'Session Time Remaining',
      inactivityNotice: 'Auto logout on inactivity',
      open24Hours: 'Open 24 Hours • 7 Days a Week',
      emergencyHotline: 'Emergency Hotline: Globe +639154050623',
      privacyCertified: 'Data Privacy Act (RA 10173) Certified',
    },
    home: {
      bannerNotice: 'Accredited with PhilHealth & Major HMOs',
      accreditation: 'Official Partner Clinics Across Metro Manila & Nationwide',
      heroBadge: 'Role-Based Outpatient Healthcare & Predictive Analytics',
      heroTitlePart1: 'Excellence in Outpatient Care &',
      heroTitlePart2: 'Real-Time Clinic Flow Management',
      heroSubtitle:
        'A comprehensive digital healthcare management platform. Schedule consultations, track the live waiting room queue, access electronic medical charts, e-prescriptions, and laboratory diagnostics securely.',
      btnBookNow: 'Book an Appointment',
      btnViewQueue: 'Track Live Waiting Queue',
      btnPortalLogin: 'Patient Portal Sign In',
      liveQueueTitle: 'Live Outpatient Queue & Waiting Room',
      avgWaitTime: 'Estimated Average Wait',
      inConsultation: 'In Consultation',
      waitingInQueue: 'Waiting in Clinic',
      scheduledToday: 'Scheduled Today',
      currentPatient: 'Current Patient',
      estWait: 'Est. Wait',
      queueFullNotice: 'Live queue updates automatically as doctors finish consultations.',
      featuresTitle: 'Complete Healthcare Services at Your Fingertips',
      featuresSubtitle: 'Engineered for seamless clinical operations, zero delays, and patient safety.',
      feat1Title: 'Smart Appointment Scheduling',
      feat1Desc: 'Book outpatient appointments with verified specialists with real-time doctor availability and SMS reminders.',
      feat2Title: 'Live Queue & Waiting Room',
      feat2Desc: 'Monitor your queue position live from home or mobile to minimize waiting room congestion.',
      feat3Title: 'Electronic Medical Records (EMR)',
      feat3Desc: 'Confidential diagnostic history, chronic conditions, and vital sign trajectories protected by RA 10173.',
      feat4Title: 'Digital e-Prescriptions',
      feat4Desc: 'Receive verifiable digital prescriptions with dosage instructions and pharmacy inventory sync.',
      feat5Title: 'Diagnostic Lab Pathology',
      feat5Desc: 'Access complete blood count, lipid panels, urinalysis, and radiology reports as soon as approved.',
      feat6Title: 'Real-Time Queue & Push Alerts',
      feat6Desc: 'Instant in-app and mobile push notifications when clinic staff calls your ticket number to proceed to the room.',
      doctorsTitle: 'Our Distinguished Medical Faculty',
      doctorsSubtitle: 'Experienced board-certified specialists committed to compassionate outpatient care.',
      faqTitle: 'Frequently Asked Questions',
      faqSubtitle: 'Everything you need to know about Smart Clinic outpatient appointments and data privacy.',
      faq1Q: 'How do I book an appointment at Smart Clinic?',
      faq1A:
        'Click the "Book an Appointment" button above, select your preferred specialty or doctor, pick an available time slot, and confirm. You will receive an instant email and SMS confirmation.',
      faq2Q: 'Is my health data private and secured?',
      faq2A:
        'Yes. Smart Clinic strictly complies with the Philippine Data Privacy Act of 2012 (RA 10173). Patient records are encrypted and isolated so that only you and your attending physician have access.',
      faq3Q: 'How does the Live Queue work?',
      faq3A:
        'When you arrive at the clinic or check in online, your position is assigned. You can monitor the live waiting board from your phone and arrive right before your turn.',
      faq4Q: 'Can I request e-prescriptions and lab tests online?',
      faq4A:
        'Yes. After your consultation, your physician will issue official digital prescriptions and laboratory requests accessible directly through your Patient Portal.',
      footerAbout:
        'Smart Clinic is a patient-centered outpatient medical center providing primary care, specialist consultations, and diagnostic laboratory services.',
      quickLinks: 'Quick Links',
      emergencyHeading: 'Emergency Assistance',
      rightsReserved: 'All rights reserved. Aligned with Philippine Health Data Security Standards (RA 10173).',
    },
    auth: {
      portalTitle: 'Smart Clinic Authentication',
      portalSubtitle: 'Secure portal for patients, physicians, and clinic staff',
      patientTab: 'Patient Portal',
      doctorTab: 'Doctor Login',
      staffTab: 'Staff & Nurses',
      adminTab: 'Administrator',
      registerTab: 'Register New Patient',
      loginTab: 'Sign In to Account',
      emailLabel: 'Email Address',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm Password',
      fullNameLabel: 'Full Legal Name',
      phoneLabel: 'Mobile Number (+63)',
      subRoleLabel: 'Select Clinical Role',
      twoFactorLabel: 'Authenticator 2FA Code',
      twoFactorPlaceholder: '6-digit rolling code (e.g. 123456)',
      signInBtn: 'Sign In to Clinic System',
      registerBtn: 'Complete Registration & Create EMR',
      forgotPasswordBtn: 'Forgot your password?',
      dontHaveAccount: "Don't have a patient account?",
      alreadyHaveAccount: 'Already registered?',
      registerHere: 'Register here',
      loginHere: 'Log in here',
      authenticatorNotice: 'Mandatory two-factor authentication required for clinical administrative accounts.',
      captchaVerification: 'Security Verification (Anti-Bot)',
      privacyAgreement: 'I agree to the Collection and Processing of Health Data under RA 10173.',
      privacyLink: 'View Privacy Policy',
      dobLabel: 'Date of Birth',
      ageLabel: 'Age',
      genderLabel: 'Sex / Gender',
      bloodTypeLabel: 'Blood Type',
      addressLabel: 'Residential Address',
      emergencyContactLabel: 'Emergency Contact Person',
      allergiesLabel: 'Known Drug Allergies',
      chronicConditionsLabel: 'Chronic Medical Conditions',
      demoNote: 'Demo credentials available on request. Session automatically expires upon inactivity.',
    },
    patient: {
      welcome: 'Welcome back',
      healthPortalTitle: 'Confidential Patient Health Portal',
      mrnLabel: 'Medical Record No. (MRN)',
      bloodTypeLabel: 'Blood Group',
      primaryDoctorLabel: 'Primary Physician',
      profileSettingsBtn: 'Profile Settings',
      healthIdBtn: 'My Health ID QR',
      bookAppointmentBtn: 'Book Appointment',
      vitalsTitle: 'Latest Recorded Vital Signs',
      bloodPressure: 'Blood Pressure',
      heartRate: 'Heart Rate',
      temperature: 'Body Temp',
      oxygenSat: 'Oxygen Saturation (SpO2)',
      weight: 'Weight',
      bmi: 'BMI',
      nextAppointment: 'Upcoming Appointment',
      noUpcomingAppointments: 'No appointments scheduled. Need a consultation?',
      activePrescriptions: 'Active e-Prescriptions',
      noActivePrescriptions: 'No active prescriptions currently on file.',
      recentLabResults: 'Diagnostic Laboratory Reports',
      noLabResults: 'No diagnostic laboratory tests recorded.',
      billingSummary: 'Billing & Account Statement',
      unpaidBalance: 'Outstanding Balance',
      totalInvoices: 'Total Invoices',
      triageAdvisor: 'AI Clinical Triage Assistant',
      triageDesc: 'Evaluate your symptoms, receive urgency guidance, and auto-book with the recommended specialist.',
      startTriageBtn: 'Launch AI Triage',
      allergies: 'Documented Drug Allergies',
      chronicConditions: 'Chronic Conditions',
      noKnownAllergies: 'No known allergies documented.',
      noChronicConditions: 'No chronic conditions recorded.',
    },
    doctor: {
      dashboardTitle: 'Physician Clinical Workspace',
      consultationWorkspace: 'Active Consultation Suite',
      todaySchedule: "Today's Clinic Appointments",
      inQueueCount: 'Patients in Waiting Queue',
      completedToday: 'Consultations Completed Today',
      startConsultationBtn: 'Start Consultation',
      viewChartBtn: 'Open EMR Chart',
      soapNotes: 'SOAP Clinical Documentation',
      chiefComplaint: 'Chief Complaint',
      subjective: 'Subjective (Symptoms & History)',
      objective: 'Objective (Vitals & Physical Exam)',
      assessment: 'Clinical Assessment & Diagnosis',
      plan: 'Treatment Plan & Interventions',
      writePrescription: 'Prescribe Medication',
      orderLabTest: 'Order Diagnostic Lab',
      finishConsultation: 'Complete & Save Encounter',
      clinicalDecisionSupport: 'Clinical Decision Support AI',
      aiDiagnosticSupport: 'Differential Diagnosis & Drug Interactions AI',
    },
    staff: {
      dashboardTitle: 'Clinical Staff & Nurse Workbench',
      queueManagement: 'Live Queue & Waiting Room Flow',
      triageIntake: 'Nurse Triage & Vitals Intake',
      checkInPatient: 'Check In Patient',
      recordVitals: 'Record Vital Signs',
      scanHealthId: 'Scan Health ID QR',
      priorityEmergency: 'Emergency (Immediate)',
      priorityUrgent: 'Urgent Priority',
      priorityRoutine: 'Standard Routine',
      pharmacyStock: 'Pharmacy Formulary Stock',
      labPending: 'Pending Lab Specimens',
      waitingPatients: 'Patients Currently Waiting',
      callNextPatient: 'Call Patient',
    },
    admin: {
      dashboardTitle: 'Executive Administration & Governance',
      executiveOverview: 'Clinic Operations Overview',
      totalPatients: 'Registered Patients',
      appointmentsToday: 'Appointments Today',
      revenueToday: "Today's Clinic Revenue",
      lowStockAlerts: 'Low Formulary Stock Items',
      complianceAudit: 'Data Security & Audit Trail (RA 10173)',
      addDoctorBtn: 'Register New Physician',
      addStaffBtn: 'Register New Clinical Staff',
      systemLogs: 'System Security Audit Logs',
      manageStaff: 'Register and Managing Doctor and Clinical Staff',
      dataSecurityStatus: 'RA 10173 Compliance Status: Active & Encrypted',
    },
    session: {
      warningTitle: '⚠️ Session Expiration Warning',
      warningSubtitle: 'Inactivity Security Timeout',
      expireMessagePart1: 'Your secure healthcare session will expire in ',
      expireMessagePart2: ' due to inactivity. For patient confidentiality, sessions are automatically terminated.',
      stayLoggedInBtn: 'Stay Signed In',
      logOutBtn: 'Log Out',
      roleTimeoutInfo: 'Role Inactivity Timeout Policy',
      doctorTimeout: 'Clinic Staff (Physician): 15 minutes',
      staffTimeout: 'Clinic Staff: 15 minutes',
      patientTimeout: 'Patient: 30 minutes',
      adminTimeout: 'Administrator: 15 minutes',
      expiredToast: 'Your session has expired due to inactivity. Please log in again.',
    },
  },
  fil: {
    nav: {
      home: 'Tahanan',
      dashboard: 'Dashboard',
      patientPortal: 'Portal ng Pasyente',
      patients: 'Talaan ng Pasyente',
      appointments: 'Mga Appointment',
      queue: 'Kasalukuyang Pila',
      consultations: 'Konsultasyon ng Doktor',
      emr: 'Medikal na Rekord (EMR)',
      prescriptions: 'Mga Reseta (Rx)',
      laboratory: 'Laboratoryo at Diagnostic',
      inventory: 'Botika at Imbentaryo',
      billing: 'Pagsingil at Bayad',
      reports: 'Ulat at Estadistika',
      predictiveAnalytics: 'Pagtataya ng Panganib',
      aiAssistant: 'AI Katulong sa Triage',
      auditLogs: 'Talaan ng Pagsusuri (RA 10173)',
      notifications: 'Mga Abiso',
      scanHealthId: 'I-scan ang Health ID',
      signIn: 'Mag-sign In',
      signOut: 'Mag-sign Out',
      profileSettings: 'Mga Setting ng Profile',
    },
    roles: {
      patient: 'Pasyente',
      doctor: 'Manggagamot / Doktor',
      nurse: 'Rehistradong Nars',
      pharmacist: 'Lisensyadong Parmasyutiko',
      receptionist: 'Resepsyonista',
      labTechnician: 'Medikal Teknolohista',
      lab_technician: 'Medikal Teknolohista',
      admin: 'Tagapangasiwa ng Klinika',
      provider: 'Manggagamot / Klinikal',
      staff: 'Kawani ng Klinika',
    },
    common: {
      welcome: 'Maligayang Pagdating',
      noData: 'Walang magagamit na talaan.',
      searchPlaceholder: 'Maghanap ayon sa pangalan, MRN, o doktor...',
      bookAppointment: 'Magpa-appointment',
      viewLiveQueue: 'Tingnan ang Pila',
      stayLoggedIn: 'Manatiling Nakalog-in',
      logOut: 'Mag-logout',
      cancel: 'Kanselahin',
      confirm: 'Kumpirmahin',
      save: 'I-save ang Pagbabago',
      close: 'Isara',
      back: 'Bumalik',
      search: 'Maghanap...',
      filter: 'Salain',
      status: 'Katayuan',
      date: 'Petsa',
      time: 'Oras',
      doctor: 'Doktor',
      patient: 'Pasyente',
      action: 'Aksyon',
      details: 'Detalye',
      loading: 'Naglo-load...',
      all: 'Lahat',
      refresh: 'I-refresh',
      print: 'I-print',
      download: 'I-download',
      yes: 'Oo',
      no: 'Hindi',
      success: 'Tagumpay',
      error: 'May Mali',
      warning: 'Babala',
      sessionRemaining: 'Natitirang Oras ng Sesyon',
      inactivityNotice: 'Kusang magla-logout kapag walang aktibidad',
      open24Hours: 'Bukas 24 Oras • 7 Araw sa Isang Linggo',
      emergencyHotline: 'Emergency Hotline: Globe +639154050623',
      privacyCertified: 'Sertipikado sa Data Privacy Act (RA 10173)',
    },
    home: {
      bannerNotice: 'Akreditado sa PhilHealth at mga Pangunahing HMO',
      accreditation: 'Opisyal na Kasosyong Klinika sa Metro Manila at Buong Bansa',
      heroBadge: 'Makabagong Outpatient Pangangalaga at Predictive Analytics',
      heroTitlePart1: 'Mataas na Kalidad ng Serbisyong Medikal at',
      heroTitlePart2: 'Real-Time na Pamamahala sa Klinika',
      heroSubtitle:
        'Isang kumpletong digital na plataporma para sa pamamahala ng klinika. Magpa-appointment, subaybayan ang kasalukuyang pila sa waiting room, at i-access ang iyong medikal na rekord, reseta, at mga resulta sa laboratoryo nang ligtas at kumpidensyal.',
      btnBookNow: 'Magpa-appointment Ngayon',
      btnViewQueue: 'Subaybayan ang Kasalukuyang Pila',
      btnPortalLogin: 'Mag-login sa Portal ng Pasyente',
      liveQueueTitle: 'Kasalukuyang Pila sa Waiting Room',
      avgWaitTime: 'Tinatayang Karaniwang Paghihintay',
      inConsultation: 'Kasalukuyang Kinokonsulta',
      waitingInQueue: 'Nasa Waiting Room',
      scheduledToday: 'Nakatakda Ngayong Araw',
      currentPatient: 'Kasalukuyang Pasyente',
      estWait: 'Tantyang Oras',
      queueFullNotice: 'Kusang nag-a-update ang pila kapag natapos ang bawat konsultasyon ng doktor.',
      featuresTitle: 'Kumpletong Serbisyong Medikal Para sa Iyo',
      featuresSubtitle: 'Dinisenyo para sa maayos na operasyon, walang abala, at kaligtasan ng pasyente.',
      feat1Title: 'Madaling Pagpa-appointment',
      feat1Desc: 'Pumili ng espesyalista at maginhawang oras para sa konsultasyon na may kasamang SMS paalala.',
      feat2Title: 'Kasalukuyang Pila (Live Queue)',
      feat2Desc: 'Alamin ang iyong puwesto sa pila mula sa bahay o telepono upang maiwasan ang siksikan sa klinika.',
      feat3Title: 'Elektronikong Rekord Medikal (EMR)',
      feat3Desc: 'Ligtas at kumpidensyal na talaan ng kasaysayang medikal at gamutan alinsunod sa batas ng RA 10173.',
      feat4Title: 'Digital na mga Reseta',
      feat4Desc: 'Makatanggap ng lehitimong digital na reseta na may tamang dosage at direktang konektado sa botika.',
      feat5Title: 'Pagsusuri at Laboratoryo',
      feat5Desc: 'Agad na makuha ang mga resulta ng blood test, urinalysis, at diagnostic kapag naaprubahan ng espesyalista.',
      feat6Title: 'Real-Time Pila at Mobile Push Alert',
      feat6Desc: 'Agarang abiso sa app at cellphone kapag tinawag ng kawani ang iyong numero upang pumasok sa silid.',
      doctorsTitle: 'Ang Ating mga Dalubhasang Doktor',
      doctorsSubtitle: 'Mga sertipikadong espesyalista na may dedikasyon sa mapagkalingang serbisyong pangkalusugan.',
      faqTitle: 'Mga Madalas Itanong (FAQ)',
      faqSubtitle: 'Lahat ng impormasyon ukol sa pagpapagamot, appointment, at seguridad ng iyong datos.',
      faq1Q: 'Paano magpa-appointment sa Smart Clinic?',
      faq1A:
        'Pindutin ang "Magpa-appointment Ngayon", piliin ang nararapat na departamento o doktor, pumili ng petsa at oras, at kumpirmahin. Makakatanggap ka agad ng kumpirmasyon sa email at SMS.',
      faq2Q: 'Ligtas ba at kumpidensyal ang aking mga rekord medikal?',
      faq2A:
        'Oo. Mahigpit naming sinusunod ang Philippine Data Privacy Act ng 2012 (RA 10173). Naka-encrypt at nakahiwalay ang datos ng bawat pasyente upang kayo at ang inyong doktor lamang ang makakita nito.',
      faq3Q: 'Paano gumagana ang Live Queue o Kasalukuyang Pila?',
      faq3A:
        'Kapag kayo ay nag-check in sa klinika o online, bibigyan kayo ng numero. Maaari ninyong subaybayan ang takbo ng pila sa inyong cellphone upang pumunta kapag malapit na ang inyong tawag.',
      faq4Q: 'Maaari ko bang makuha ang aking reseta at resulta ng lab online?',
      faq4A:
        'Oo. Pagkatapos ng inyong konsultasyon, ang opisyal na digital reseta at lab test results ay direktang makikita sa inyong Patient Portal.',
      footerAbout:
        'Ang Smart Clinic ay isang modernong sentro ng pangangalagang medikal na nagbibigay ng pangkalahatang serbisyo, konsultasyon ng espesyalista, at laboratoryo.',
      quickLinks: 'Mabilisang Link',
      emergencyHeading: 'Tulong sa Emerhensya',
      rightsReserved: 'Lahat ng karapatan ay nakalaan. Alinsunod sa Philippine Health Data Security Standards (RA 10173).',
    },
    auth: {
      portalTitle: 'Pagpapatotoo sa Smart Clinic',
      portalSubtitle: 'Ligtas na portal para sa pasyente, doktor, at kawani ng klinika',
      patientTab: 'Portal ng Pasyente',
      doctorTab: 'Login ng Doktor',
      staffTab: 'Kawani at Nars',
      adminTab: 'Tagapangasiwa',
      registerTab: 'Magrehistro ng Bagong Pasyente',
      loginTab: 'Mag-sign In sa Account',
      emailLabel: 'Email Address',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Ulitin ang Password',
      fullNameLabel: 'Buong Legal na Pangalan',
      phoneLabel: 'Numero ng Telepono (+63)',
      subRoleLabel: 'Piliin ang Tungkulin sa Klinika',
      twoFactorLabel: 'Authenticator 2FA Code',
      twoFactorPlaceholder: '6-digit rolling code (hal. 123456)',
      signInBtn: 'Mag-sign In sa Sistema',
      registerBtn: 'Tapusin ang Rehistrasyon at Gumawa ng EMR',
      forgotPasswordBtn: 'Nakalimutan ang password?',
      dontHaveAccount: 'Wala ka pa bang account bilang pasyente?',
      alreadyHaveAccount: 'Mayroon ka na bang account?',
      registerHere: 'Magrehistro rito',
      loginHere: 'Mag-login rito',
      authenticatorNotice: 'Kinakailangan ang two-factor authentication para sa mga medikal at administratibong account.',
      captchaVerification: 'Seguridad (Pagsusuri Laban sa Bot)',
      privacyAgreement: 'Sumasang-ayon ako sa Pagkolekta at Pagproseso ng Datos Pangkalusugan sa ilalim ng RA 10173.',
      privacyLink: 'Basahin ang Patakaran sa Privacy',
      dobLabel: 'Petsa ng Kapanganakan',
      ageLabel: 'Edad',
      genderLabel: 'Kasarian',
      bloodTypeLabel: 'Uri ng Dugo (Blood Type)',
      addressLabel: 'Tirahan',
      emergencyContactLabel: 'Pangalan ng Makokontak sa Emerhensya',
      allergiesLabel: 'Allergy sa Gamot',
      chronicConditionsLabel: 'Matagalang Sakit / Kundisyon',
      demoNote: 'Available ang demo credentials kapag hiniling. Kusang magla-logout kapag walang aktibidad.',
    },
    patient: {
      welcome: 'Maligayang pagbabalik',
      healthPortalTitle: 'Kumpidensyal na Portal Pangkalusugan ng Pasyente',
      mrnLabel: 'Medical Record Blg. (MRN)',
      bloodTypeLabel: 'Uri ng Dugo',
      primaryDoctorLabel: 'Pangunahing Doktor',
      profileSettingsBtn: 'Setting ng Profile',
      healthIdBtn: 'Aking Health ID QR',
      bookAppointmentBtn: 'Magpa-appointment',
      vitalsTitle: 'Huling Naitalang Vital Signs',
      bloodPressure: 'Presyon ng Dugo (BP)',
      heartRate: 'Tibok ng Puso (HR)',
      temperature: 'Temperatura',
      oxygenSat: 'Lebel ng Oksiheno (SpO2)',
      weight: 'Timbang',
      bmi: 'BMI',
      nextAppointment: 'Susunod na Appointment',
      noUpcomingAppointments: 'Walang nakatakdang appointment. Nais mo bang magpakonsulta?',
      activePrescriptions: 'Kasalukuyang mga Reseta',
      noActivePrescriptions: 'Walang aktibong reseta sa kasalukuyan.',
      recentLabResults: 'Mga Resulta sa Laboratoryo',
      noLabResults: 'Walang naitalang resulta ng laboratoryo.',
      billingSummary: 'Buod ng Pagsingil at Bayarin',
      unpaidBalance: 'Natitirang Babayaran',
      totalInvoices: 'Kabuuang Resibo',
      triageAdvisor: 'AI Katulong sa Triage ng Sintomas',
      triageDesc: 'Suriin ang iyong nararamdaman, kumuha ng gabay, at awtomatikong mag-book sa tamang espesyalista.',
      startTriageBtn: 'Simulan ang AI Triage',
      allergies: 'Mga Naitalang Allergy sa Gamot',
      chronicConditions: 'Mga Matagalang Kundisyon',
      noKnownAllergies: 'Walang naitalang allergy sa gamot.',
      noChronicConditions: 'Walang naitalang matagalang kondisyon.',
    },
    doctor: {
      dashboardTitle: 'Klinikal na Workspace ng Doktor',
      consultationWorkspace: 'Aktibong Konsultasyon',
      todaySchedule: 'Mga Appointment Ngayong Araw',
      inQueueCount: 'Mga Pasyente sa Pila',
      completedToday: 'Natapos na Konsultasyon Ngayon',
      startConsultationBtn: 'Simulan ang Konsultasyon',
      viewChartBtn: 'Buksan ang EMR Chart',
      soapNotes: 'SOAP Klinikal na Tala',
      chiefComplaint: 'Pangunahing Reklamo',
      subjective: 'Subjective (Sintomas at Kasaysayan)',
      objective: 'Objective (Vital Signs at Pisikal na Pagsusuri)',
      assessment: 'Klinikal na Pagtatasa at Diagnosis',
      plan: 'Plano sa Paggamot at Gamot',
      writePrescription: 'Magreseta ng Gamot',
      orderLabTest: 'Mag-order ng Lab Test',
      finishConsultation: 'Tapusin at I-save ang Encounter',
      clinicalDecisionSupport: 'AI Gabay sa Desisyong Medikal',
      aiDiagnosticSupport: 'Differential Diagnosis at Interaksyon ng Gamot AI',
    },
    staff: {
      dashboardTitle: 'Workbench ng Nars at Kawani',
      queueManagement: 'Pamamahala ng Pila sa Waiting Room',
      triageIntake: 'Triage ng Nars at Vital Signs',
      checkInPatient: 'I-check In ang Pasyente',
      recordVitals: 'Itala ang Vital Signs',
      scanHealthId: 'I-scan ang Health ID QR',
      priorityEmergency: 'Emerhensya (Kagyat)',
      priorityUrgent: 'Mataas na Priyoridad',
      priorityRoutine: 'Karaniwang Pila',
      pharmacyStock: 'Imbentaryo ng Botika',
      labPending: 'Nakabinbing Sampol sa Lab',
      waitingPatients: 'Mga Pasyenteng Naghihintay',
      callNextPatient: 'Tawagin ang Pasyente',
    },
    admin: {
      dashboardTitle: 'Pamamahala at Administrasyon ng Klinika',
      executiveOverview: 'Buod ng Operasyon ng Klinika',
      totalPatients: 'Rehistradong mga Pasyente',
      appointmentsToday: 'Appointment Ngayong Araw',
      revenueToday: 'Kita ng Klinika Ngayon',
      lowStockAlerts: 'Gamot na Mauubos Na',
      complianceAudit: 'Seguridad ng Datos at Audit (RA 10173)',
      addDoctorBtn: 'Magrehistro ng Bagong Doktor',
      addStaffBtn: 'Magrehistro ng Bagong Kawani',
      systemLogs: 'Talaan ng Seguridad ng Sistema',
      manageStaff: 'Magrehistro at Pamahalaan ang Doktor at mga Kawani',
      dataSecurityStatus: 'Katayuan sa RA 10173: Aktibo at Naka-encrypt',
    },
    session: {
      warningTitle: '⚠️ Babala sa Pag-expire ng Sesyon',
      warningSubtitle: 'Seguridad sa Kawalan ng Aktibidad',
      expireMessagePart1: 'Mag-e-expire ang iyong secure medical session sa loob ng ',
      expireMessagePart2: ' dahil sa kawalan ng aktibidad. Para sa proteksyon ng pasyente, kusang isasara ang sesyon.',
      stayLoggedInBtn: 'Manatiling Naka-sign In',
      logOutBtn: 'Mag-logout',
      roleTimeoutInfo: 'Patakaran sa Timeout Ayon sa Tungkulin',
      doctorTimeout: 'Kawani (Doktor): 15 minuto',
      staffTimeout: 'Kawani ng Klinika: 15 minuto',
      patientTimeout: 'Pasyente: 30 minuto',
      adminTimeout: 'Tagapangasiwa: 15 minuto',
      expiredToast: 'Nag-expire ang iyong sesyon dahil sa kawalan ng aktibidad. Mangyaring mag-log in muli.',
    },
  },
};

export const getTranslation = (lang: AppLanguage): Translations => {
  return translations[lang] || translations.en;
};
