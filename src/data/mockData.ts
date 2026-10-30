import {
  Patient,
  User,
  Appointment,
  Consultation,
  Prescription,
  LabTestOrder,
  InventoryItem,
  Invoice,
  Notification,
  AuditLog,
  DEFAULT_ROLE_PERMISSIONS,
  HMOPartner
} from '../types/clinic';

export const INITIAL_USERS: User[] = [
  { id: 'usr-1', name: 'Dr. Maria Cristina Reyes, MD', email: 'maria.reyes@smartclinic.ph', role: 'doctor', avatar: '', department: 'Internal Medicine', specialty: 'Internal Medicine & Endocrinology', licenseNumber: 'PRC-0084521', phone: '+63 917 111 0001', workDays: [2, 3, 4, 5, 6], workDaysLabel: 'Tuesday – Saturday', hoursLabel: '9:00 AM – 3:00 PM', startHour: 9, endHour: 15, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-2', name: 'Dr. Juan Miguel Santos, MD', email: 'juan.santos@smartclinic.ph', role: 'doctor', avatar: '', department: 'Cardiology', specialty: 'Cardiology', licenseNumber: 'PRC-0092144', phone: '+63 917 111 0002', workDays: [1, 2, 3, 4, 5], workDaysLabel: 'Monday – Friday', hoursLabel: '8:00 AM – 12:00 PM & 1:00 PM – 5:00 PM', startHour: 8, endHour: 17, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-9', name: 'Dr. Patricia Gomez, MD', email: 'patricia.gomez@smartclinic.ph', role: 'doctor', avatar: '', department: 'Pediatrics', specialty: 'Pediatrics', licenseNumber: 'PRC-0078912', phone: '+63 917 111 0003', workDays: [1, 3, 5], workDaysLabel: 'Monday, Wednesday, Friday', hoursLabel: '10:00 AM – 4:00 PM', startHour: 10, endHour: 16, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-10', name: 'Dr. Anthony Lee, MD', email: 'anthony.lee@smartclinic.ph', role: 'doctor', avatar: '', department: 'Dermatology', specialty: 'Dermatology', licenseNumber: 'PRC-0065432', phone: '+63 917 111 0004', workDays: [1, 2, 3, 4], workDaysLabel: 'Monday – Thursday', hoursLabel: '1:00 PM – 6:00 PM', startHour: 13, endHour: 18, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-11', name: 'Dr. Roberto Tan, MD', email: 'roberto.tan@smartclinic.ph', role: 'doctor', avatar: '', department: 'Pulmonology', specialty: 'Pulmonology', licenseNumber: 'PRC-0054321', phone: '+63 917 111 0005', workDays: [3, 4, 5, 6], workDaysLabel: 'Wednesday – Saturday', hoursLabel: '8:00 AM – 1:00 PM', startHour: 8, endHour: 13, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-12', name: 'Dr. Sofia Ramos, MD', email: 'sofia.ramos@smartclinic.ph', role: 'doctor', avatar: '', department: 'Neurology', specialty: 'Neurology', licenseNumber: 'PRC-0098765', phone: '+63 917 111 0010', workDays: [1, 2, 4, 5], workDaysLabel: 'Monday, Tuesday, Thursday, Friday', hoursLabel: '9:00 AM – 3:00 PM', startHour: 9, endHour: 15, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-13', name: 'Dr. Gabriel Castro, MD', email: 'gabriel.castro@smartclinic.ph', role: 'doctor', avatar: '', department: 'Orthopedics', specialty: 'Orthopedics', licenseNumber: 'PRC-0087654', phone: '+63 917 111 0011', workDays: [1, 3, 5], workDaysLabel: 'Monday, Wednesday, Friday', hoursLabel: '8:00 AM – 2:00 PM', startHour: 8, endHour: 14, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-14', name: 'Dr. Elena Torres, MD', email: 'elena.torres@smartclinic.ph', role: 'doctor', avatar: '', department: 'Obstetrics & Gynecology', specialty: 'Obstetrics & Gynecology', licenseNumber: 'PRC-0076543', phone: '+63 917 111 0012', workDays: [2, 3, 4, 6], workDaysLabel: 'Tuesday – Thursday, Saturday', hoursLabel: '10:00 AM – 4:00 PM', startHour: 10, endHour: 16, permissions: { ...DEFAULT_ROLE_PERMISSIONS.doctor } },
  { id: 'usr-3', name: 'Nurse Ana Patricia Villanueva, RN', email: 'ana.villanueva@smartclinic.ph', role: 'nurse', avatar: '', department: 'Outpatient Triage', licenseNumber: 'RN-382914', phone: '+63 917 111 0006', permissions: { ...DEFAULT_ROLE_PERMISSIONS.nurse } },
  { id: 'usr-4', name: 'Claire Mendoza', email: 'claire.mendoza@smartclinic.ph', role: 'receptionist', avatar: '', department: 'Front Desk & Patient Access', phone: '+63 917 111 0007', permissions: { ...DEFAULT_ROLE_PERMISSIONS.receptionist } },
  { id: 'usr-5', name: 'Julian Dela Cruz, RPh', email: 'julian.delacruz@smartclinic.ph', role: 'pharmacist', avatar: '', department: 'Clinic Pharmacy & Dispensary', licenseNumber: 'RPh-102948', phone: '+63 917 111 0008', permissions: { ...DEFAULT_ROLE_PERMISSIONS.pharmacist } },
  { id: 'usr-6', name: 'Amina Bautista, RMT', email: 'amina.bautista@smartclinic.ph', role: 'lab_technician', avatar: '', department: 'Diagnostic Pathology & Laboratory', licenseNumber: 'RMT-559102', phone: '+63 917 111 0009', permissions: { ...DEFAULT_ROLE_PERMISSIONS.lab_technician } },
  { id: 'usr-admin', name: 'Director Maria Lourdes Santos, MD', email: 'smartclinicrealacc@gmail.com', role: 'admin', avatar: '', department: 'Executive Management', specialty: 'Healthcare Administration', licenseNumber: 'PRC-0081294', phone: '+63 917 800 1101', permissions: { ...DEFAULT_ROLE_PERMISSIONS.admin } },
  { id: '664e0862-fd97-40da-a3c3-75cfa278b57e', name: 'Elena Vargas', email: 'elena.vargas@smartclinic.ph', role: 'patient', avatar: '', department: 'Patient Portal', permissions: { ...DEFAULT_ROLE_PERMISSIONS.patient } },
  { id: '2d022a2d-89b6-4a78-8540-215cba501268', name: 'Patrick Garcia', email: 'patrick.garcia@email.com', role: 'patient', avatar: '', department: 'Patient Portal', permissions: { ...DEFAULT_ROLE_PERMISSIONS.patient } }
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1', mrn: 'MRN-2026-081', fullName: 'Elena Vargas', dob: '1978-04-12', age: 48, gender: 'Female', bloodType: 'A+',
    phone: '+63 917 234 5678', email: 'elena.vargas@smartclinic.ph',
    address: '742 Mabini Street, Barangay San Antonio, Quezon City, Metro Manila',
    emergencyContact: { name: 'Roberto Vargas', relationship: 'Spouse', phone: '+63 917 234 9988' },
    allergies: [{ allergen: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis, hives' }, { allergen: 'Sulfa Drugs', severity: 'moderate', reaction: 'Skin rash, pruritus' }],
    chronicConditions: ['Type 2 Diabetes Mellitus', 'Essential Hypertension', 'Dyslipidemia'],
    currentMedications: ['Metformin 500mg PO BID', 'Lisinopril 10mg PO Daily', 'Atorvastatin 20mg PO QHS'],
    primaryDoctorId: 'usr-1', insuranceProvider: 'PhilHealth', insurancePolicyNumber: 'PH-992-1849-01',
    createdAt: '2025-11-15T09:00:00Z', tags: ['Diabetic Care', 'High Priority', 'Follow-up Needed'],
    vitalsHistory: [
      { id: 'vit-1', recordedAt: '2026-10-06T09:15:00Z', recordedBy: 'Nurse Ana Patricia Villanueva', bloodPressureSystolic: 138, bloodPressureDiastolic: 86, heartRate: 74, respiratoryRate: 16, temperature: 36.8, oxygenSaturation: 98, height: 165, weight: 71.5, bmi: 26.3, notes: 'Patient reports mild fatigue after morning walk.' },
      { id: 'vit-0', recordedAt: '2026-09-02T10:00:00Z', recordedBy: 'Nurse Ana Patricia Villanueva', bloodPressureSystolic: 142, bloodPressureDiastolic: 90, heartRate: 78, respiratoryRate: 18, temperature: 36.7, oxygenSaturation: 97, height: 165, weight: 72.8, bmi: 26.7, notes: 'Baseline check.' }
    ],
    triageHistory: [
      {
        id: 'trg-01',
        patientId: 'pat-1',
        patientName: 'Elena Vargas',
        timestamp: '2026-10-04T14:20:00Z',
        symptoms: 'Mild dizziness when standing up and occasional blurred vision after meals.',
        timelineStarted: '1-3 days ago',
        timelineTrajectory: 'stable',
        previousEpisodes: 'Recurring',
        urgencyScore: 4,
        urgencyBand: 'yellow',
        urgencyLabel: 'Yellow (4-6): Should be seen today',
        suggestedSpecialty: 'Internal Medicine',
        summary: 'Patient reports orthostatic lightheadedness and postprandial visual blurring. Known diabetic on Metformin. Vital signs and glycemic curve evaluation recommended.',
        actionRecommended: 'Same-day outpatient consultation with Internal Medicine specialist.',
        isEmergency: false,
        language: 'en',
      }
    ]
  },
  {
    id: 'pat-2', mrn: 'MRN-2026-104', fullName: 'Liam Gabriel Torres', dob: '1992-08-25', age: 34, gender: 'Male', bloodType: 'O+',
    phone: '+63 918 871 3342', email: 'liam.torres@example.com',
    address: '1204 Pine Street, Apt 3B, Makati City, Metro Manila',
    emergencyContact: { name: 'Hannah Torres', relationship: 'Sister', phone: '+63 918 871 9921' },
    allergies: [{ allergen: 'NSAIDs (Ibuprofen)', severity: 'moderate', reaction: 'Bronchospasm, facial swelling' }],
    chronicConditions: ['Mild Asthma', 'Seasonal Allergic Rhinitis'],
    currentMedications: ['Albuterol Inhaler 90mcg PRN', 'Fluticasone nasal spray 50mcg'],
    primaryDoctorId: 'usr-1', insuranceProvider: 'Maxicare', insurancePolicyNumber: 'MX-552-3011-09',
    createdAt: '2026-01-20T14:30:00Z', tags: ['Respiratory', 'Asthma Action Plan'],
    vitalsHistory: [
      { id: 'vit-2', recordedAt: '2026-10-06T10:00:00Z', recordedBy: 'Nurse Ana Patricia Villanueva', bloodPressureSystolic: 122, bloodPressureDiastolic: 78, heartRate: 82, respiratoryRate: 19, temperature: 37.1, oxygenSaturation: 96, height: 180, weight: 78, bmi: 24.1, notes: 'Occasional wheezing reported during cold mornings.' }
    ]
  },
  {
    id: 'pat-3', mrn: 'MRN-2026-218', fullName: 'Sofia Ramirez-Diaz', dob: '1965-11-03', age: 60, gender: 'Female', bloodType: 'B+',
    phone: '+63 919 439 8812', email: 'sofia.rd@example.com',
    address: '388 Willow Brook Lane, Cebu City, Cebu',
    emergencyContact: { name: 'Carlos Ramirez', relationship: 'Son', phone: '+63 919 439 1200' },
    allergies: [],
    chronicConditions: ['Atrial Fibrillation', 'Stage 2 Chronic Kidney Disease', 'Osteoarthritis'],
    currentMedications: ['Apixaban 5mg PO BID', 'Metoprolol Succinate 50mg PO Daily', 'Acetaminophen 500mg PRN'],
    primaryDoctorId: 'usr-2', insuranceProvider: 'PhilHealth Senior', insurancePolicyNumber: 'PH-771-4902-88',
    createdAt: '2025-08-10T11:20:00Z', tags: ['Cardiology Referral', 'Anticoagulated'],
    vitalsHistory: [
      { id: 'vit-3', recordedAt: '2026-10-06T08:45:00Z', recordedBy: 'Nurse Ana Patricia Villanueva', bloodPressureSystolic: 130, bloodPressureDiastolic: 82, heartRate: 68, respiratoryRate: 15, temperature: 36.6, oxygenSaturation: 99, height: 158, weight: 64, bmi: 25.6, notes: 'Regular rate and rhythm noted today.' }
    ]
  },
  {
    id: 'pat-4', mrn: 'MRN-2026-305', fullName: 'David Kevin Ocampo', dob: '1985-02-14', age: 41, gender: 'Male', bloodType: 'AB-',
    phone: '+63 920 672 9011', email: 'david.ocampo@example.com',
    address: '512 Oakwood Boulevard, Davao City, Davao del Sur',
    emergencyContact: { name: 'Megan Ocampo', relationship: 'Spouse', phone: '+63 920 672 9012' },
    allergies: [{ allergen: 'Latex', severity: 'mild', reaction: 'Contact dermatitis' }],
    chronicConditions: ['Gastroesophageal Reflux Disease (GERD)', 'Mild Sleep Apnea'],
    currentMedications: ['Omeprazole 20mg PO QAM'],
    primaryDoctorId: 'usr-1', insuranceProvider: 'Intellicare', insurancePolicyNumber: 'IC-109-8832-11',
    createdAt: '2026-03-01T16:00:00Z', tags: ['General Checkup'],
    vitalsHistory: [
      { id: 'vit-4', recordedAt: '2026-10-05T14:10:00Z', recordedBy: 'Nurse Ana Patricia Villanueva', bloodPressureSystolic: 126, bloodPressureDiastolic: 80, heartRate: 72, respiratoryRate: 16, temperature: 36.9, oxygenSaturation: 98, height: 175, weight: 84, bmi: 27.4, notes: 'Routine visit.' }
    ]
  },
  {
    id: 'pat-5', mrn: 'MRN-2026-442', fullName: 'Amara Patel Santos', dob: '2001-06-18', age: 25, gender: 'Female', bloodType: 'O-',
    phone: '+63 921 912 3488', email: 'amara.santos@example.com',
    address: '900 University Way, Apt 412, Los Baños, Laguna',
    emergencyContact: { name: 'Rajiv Santos', relationship: 'Father', phone: '+63 921 912 8899' },
    allergies: [{ allergen: 'Codeine', severity: 'moderate', reaction: 'Nausea, severe dizziness, rash' }],
    chronicConditions: ['Migraine with Photophobia', 'Iron Deficiency Anemia'],
    currentMedications: ['Sumatriptan 50mg PRN at onset', 'Ferrous Sulfate 325mg PO Daily'],
    primaryDoctorId: 'usr-1', insuranceProvider: 'PhilHealth', insurancePolicyNumber: 'PH-882-9012-44',
    createdAt: '2026-04-11T13:15:00Z', tags: ['Neurology Tracking', 'Anemia Monitoring'],
    vitalsHistory: [
      { id: 'vit-5', recordedAt: '2026-10-06T11:20:00Z', recordedBy: 'Nurse Ana Patricia Villanueva', bloodPressureSystolic: 110, bloodPressureDiastolic: 72, heartRate: 88, respiratoryRate: 16, temperature: 36.7, oxygenSaturation: 99, height: 162, weight: 52, bmi: 19.8, notes: 'Reports fatigue and episodic visual disturbances.' }
    ]
  },
  {
    id: '2d022a2d-89b6-4a78-8540-215cba501268',
    mrn: 'MRN-2026-030',
    fullName: 'Patrick Garcia',
    dob: '1988-06-15',
    age: 38,
    gender: 'Male',
    bloodType: 'O+',
    phone: '09170030303',
    email: 'patrick.garcia@email.com',
    address: '45 Aurora Boulevard, Quezon City, Metro Manila',
    emergencyContact: { name: 'Maria Garcia', relationship: 'Spouse', phone: '09170039999' },
    allergies: [],
    chronicConditions: ['Borderline Hypertension'],
    currentMedications: ['Amlodipine 5mg PO Daily'],
    primaryDoctorId: 'usr-1',
    insuranceProvider: 'PhilHealth',
    insurancePolicyNumber: 'PH-102-8841-30',
    createdAt: '2026-02-10T08:00:00Z',
    tags: ['Cardiology Consult', 'Executive Checkup'],
    vitalsHistory: [
      { id: 'vit-pat-1', recordedAt: '2026-10-06T08:30:00Z', recordedBy: 'Nurse Ana Patricia Villanueva', bloodPressureSystolic: 128, bloodPressureDiastolic: 82, heartRate: 72, respiratoryRate: 16, temperature: 36.6, oxygenSaturation: 99, height: 175, weight: 74, bmi: 24.2, notes: 'Routine checkup.' }
    ]
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'apt-101', patientId: 'pat-1', patientName: 'Elena Vargas', patientMrn: 'MRN-2026-081', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-10-06', time: '09:30', durationMinutes: 30, reason: 'Quarterly Diabetic & Hypertension Follow-up, HbA1c review', status: 'Completed', type: 'Follow-up', queueNumber: 'A-101', room: 'Room 302', notes: 'Patient checked in on time; vitals recorded.', createdAt: '2026-09-28T10:00:00Z' },
  { id: 'apt-102', patientId: 'pat-2', patientName: 'Liam Gabriel Torres', patientMrn: 'MRN-2026-104', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-10-06', time: '10:15', durationMinutes: 30, reason: 'Asthma exacerbation during physical exertion & allergy review', status: 'Checked In', type: 'In-Person', queueNumber: 'A-102', room: 'Waiting Room B', notes: 'Nurse triaged; vitals stable.', createdAt: '2026-10-01T11:30:00Z' },
  { id: 'apt-103', patientId: 'pat-3', patientName: 'Sofia Ramirez-Diaz', patientMrn: 'MRN-2026-218', doctorId: 'usr-2', doctorName: 'Dr. Juan Miguel Santos, MD', department: 'Cardiology', date: '2026-10-06', time: '11:00', durationMinutes: 45, reason: 'Atrial fibrillation monitoring, INR & Renal Panel check', status: 'Scheduled', type: 'Follow-up', queueNumber: 'B-201', room: 'Cardiology Suite 1', notes: 'Bring current medication list.', createdAt: '2026-09-20T08:15:00Z' },
  { id: 'apt-104', patientId: 'pat-5', patientName: 'Amara Patel Santos', patientMrn: 'MRN-2026-442', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-10-06', time: '11:45', durationMinutes: 30, reason: 'Recurrent severe migraines and persistent fatigue', status: 'Confirmed', type: 'In-Person', queueNumber: 'A-103', room: 'Room 304', notes: 'Patient arrived early.', createdAt: '2026-10-02T15:20:00Z' },
  { id: 'apt-105', patientId: 'pat-4', patientName: 'David Kevin Ocampo', patientMrn: 'MRN-2026-305', doctorId: 'usr-2', doctorName: 'Dr. Juan Miguel Santos, MD', department: 'Cardiology', date: '2026-10-06', time: '14:00', durationMinutes: 30, reason: 'Atypical chest tightness during stress, ECG evaluation', status: 'Scheduled', type: 'In-Person', queueNumber: 'B-202', room: 'Cardiology Suite 2', createdAt: '2026-10-03T09:40:00Z' },
  { id: 'apt-106', patientId: 'pat-1', patientName: 'Elena Vargas', patientMrn: 'MRN-2026-081', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-09-02', time: '10:00', durationMinutes: 30, reason: 'Routine quarterly checkup & fasting blood glucose', status: 'Completed', type: 'Consultation', room: 'Room 302', createdAt: '2026-08-15T12:00:00Z' },
  { id: 'apt-107', patientId: 'pat-1', patientName: 'Elena Vargas', patientMrn: 'MRN-2026-081', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-06-18', time: '08:30', durationMinutes: 30, reason: 'Baseline hypertension assessment & lifestyle counseling', status: 'Completed', type: 'Check-up', room: 'Room 302', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'apt-108', patientId: 'pat-1', patientName: 'Elena Vargas', patientMrn: 'MRN-2026-081', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-10-24', time: '14:30', durationMinutes: 30, reason: 'Post-CMP metabolic panel review & prescription refill', status: 'Scheduled', type: 'Follow-up', queueNumber: 'A-108', room: 'Room 302', createdAt: '2026-10-06T12:00:00Z' },
  // Active and upcoming bookings to ensure doctor slots reflect live availability:
  { id: 'apt-201', patientId: 'pat-2', patientName: 'Liam Gabriel Torres', patientMrn: 'MRN-2026-104', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-10-28', time: '09:30', durationMinutes: 30, reason: 'Routine follow-up', status: 'Confirmed', type: 'Follow-up', queueNumber: 'A-109', room: 'Room 302', createdAt: '2026-10-27T08:00:00Z' },
  { id: 'apt-202', patientId: 'pat-3', patientName: 'Sofia Ramirez-Diaz', patientMrn: 'MRN-2026-218', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-10-29', time: '09:30', durationMinutes: 30, reason: 'Endocrine consultation', status: 'Scheduled', type: 'Consultation', queueNumber: 'A-110', room: 'Room 302', createdAt: '2026-10-27T09:15:00Z' },
  { id: 'apt-203', patientId: 'pat-4', patientName: 'David Kevin Ocampo', patientMrn: 'MRN-2026-305', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', department: 'Internal Medicine', date: '2026-10-29', time: '11:00', durationMinutes: 30, reason: 'Hypertension evaluation', status: 'Confirmed', type: 'Consultation', queueNumber: 'A-111', room: 'Room 302', createdAt: '2026-10-27T10:30:00Z' },
  { id: 'apt-204', patientId: 'pat-5', patientName: 'Amara Patel Santos', patientMrn: 'MRN-2026-442', doctorId: 'usr-2', doctorName: 'Dr. Juan Miguel Santos, MD', department: 'Cardiology', date: '2026-10-29', time: '08:30', durationMinutes: 30, reason: 'ECG stress test follow-up', status: 'Confirmed', type: 'Follow-up', queueNumber: 'B-203', room: 'Cardiology Suite 1', createdAt: '2026-10-27T11:00:00Z' },
  { id: 'apt-205', patientId: 'pat-2', patientName: 'Liam Gabriel Torres', patientMrn: 'MRN-2026-104', doctorId: 'usr-2', doctorName: 'Dr. Juan Miguel Santos, MD', department: 'Cardiology', date: '2026-10-30', time: '14:00', durationMinutes: 30, reason: 'Cardiac clearance', status: 'Scheduled', type: 'Consultation', queueNumber: 'B-204', room: 'Cardiology Suite 1', createdAt: '2026-10-27T14:00:00Z' }
];

export const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-901', prescriptionNumber: 'RX-2026-0901', patientId: 'pat-1', patientName: 'Elena Vargas', patientMrn: 'MRN-2026-081', patientAge: 48, patientGender: 'Female',
    doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', doctorSpecialty: 'Internal Medicine', doctorLicense: 'MD-892410', date: '2026-10-06', status: 'Active',
    aiSafetyAudit: { checkedAt: '2026-10-06T09:25:00Z', warnings: ['Notice: Lisinopril requires ongoing potassium and renal monitoring alongside Metformin.'], safe: true },
    items: [
      { id: 'rx-item-1', medicationName: 'Metformin Hydrochloride', genericName: 'Metformin', dosage: '850mg', frequency: 'Twice daily with meals', route: 'Oral', duration: '90 days', quantity: 180, instructions: 'Take with food to minimize GI upset. Avoid excessive alcohol consumption.', dispensed: false },
      { id: 'rx-item-2', medicationName: 'Lisinopril Tablets', genericName: 'Lisinopril', dosage: '10mg', frequency: 'Once daily in the morning', route: 'Oral', duration: '90 days', quantity: 90, instructions: 'Monitor blood pressure weekly. Report dry cough or swelling immediately.', dispensed: false }
    ],
    notes: 'Refills authorized for 1 year.'
  },
  {
    id: 'rx-902', prescriptionNumber: 'RX-2026-0842', patientId: 'pat-2', patientName: 'Liam Gabriel Torres', patientMrn: 'MRN-2026-104', patientAge: 34, patientGender: 'Male',
    doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', doctorSpecialty: 'Internal Medicine', doctorLicense: 'MD-892410', date: '2026-09-18', status: 'Dispensed',
    items: [
      { id: 'rx-item-3', medicationName: 'Albuterol Sulfate Inhalation Aerosol', genericName: 'Albuterol', dosage: '90mcg per actuation', frequency: '1-2 puffs every 4-6 hours PRN', route: 'Inhalation', duration: '30 days', quantity: 1, instructions: 'Rinse mouth after use. Keep rescue inhaler accessible at all times.', dispensed: true }
    ]
  }
];

export const INITIAL_LAB_ORDERS: LabTestOrder[] = [
  {
    id: 'lab-401', orderNumber: 'LAB-2026-1041', patientId: 'pat-1', patientName: 'Elena Vargas', patientMrn: 'MRN-2026-081', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD',
    testName: 'Comprehensive Metabolic Panel (CMP) & HbA1c', category: 'Biochemistry', urgency: 'Routine', status: 'Result Available',
    requestedAt: '2026-10-06T08:30:00Z', collectedAt: '2026-10-06T08:50:00Z', completedAt: '2026-10-06T09:15:00Z',
    results: [
      { parameter: 'Hemoglobin A1c', value: '7.4', unit: '%', referenceRange: '4.0 - 5.6', flag: 'High' },
      { parameter: 'Fasting Blood Glucose', value: '142', unit: 'mg/dL', referenceRange: '70 - 99', flag: 'High' },
      { parameter: 'Estimated GFR (eGFR)', value: '78', unit: 'mL/min/1.73m²', referenceRange: '> 60', flag: 'Normal' },
      { parameter: 'Serum Creatinine', value: '0.98', unit: 'mg/dL', referenceRange: '0.59 - 1.04', flag: 'Normal' },
      { parameter: 'Blood Urea Nitrogen (BUN)', value: '18', unit: 'mg/dL', referenceRange: '7 - 20', flag: 'Normal' },
      { parameter: 'Serum Potassium', value: '4.4', unit: 'mEq/L', referenceRange: '3.5 - 5.0', flag: 'Normal' },
      { parameter: 'Serum Sodium', value: '139', unit: 'mEq/L', referenceRange: '135 - 145', flag: 'Normal' }
    ],
    interpretation: 'Elevated glycemic markers consistent with suboptimally controlled T2D. Renal function remains preserved.',
    aiSummary: 'HbA1c (7.4%) and fasting glucose (142 mg/dL) are elevated above target. Renal indices (eGFR 78, Creatinine 0.98) are within normal reference limits.'
  },
  { id: 'lab-402', orderNumber: 'LAB-2026-1042', patientId: 'pat-3', patientName: 'Sofia Ramirez-Diaz', patientMrn: 'MRN-2026-218', doctorId: 'usr-2', doctorName: 'Dr. Juan Miguel Santos, MD', testName: 'Coagulation Profile & Renal Function', category: 'Hematology', urgency: 'Urgent', status: 'Processing', requestedAt: '2026-10-06T09:00:00Z', collectedAt: '2026-10-06T09:20:00Z', notes: 'Monitor for DOAC safety.' },
  { id: 'lab-403', orderNumber: 'LAB-2026-1043', patientId: 'pat-5', patientName: 'Amara Patel Santos', patientMrn: 'MRN-2026-442', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', testName: 'Complete Blood Count (CBC) with Differential & Serum Ferritin', category: 'Hematology', urgency: 'Routine', status: 'Requested', requestedAt: '2026-10-06T10:00:00Z', notes: 'Check for microcytic hypochromic indices.' }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', sku: 'MED-MET-500', name: 'Metformin Hydrochloride 500mg', genericName: 'Metformin HCl', brand: 'Glucophage', category: 'Antidiabetic', batchNumber: 'MET-2026-B81', expirationDate: '2027-11-30', supplier: 'Unilab Pharma Supply', stockQuantity: 420, reorderLevel: 100, purchasePrice: 2.50, sellingPrice: 8.00, unit: 'Tablets', location: 'Shelf B-2', lastUpdated: '2026-10-05T08:00:00Z' },
  { id: 'inv-2', sku: 'MED-LIS-10', name: 'Lisinopril 10mg Tablets', genericName: 'Lisinopril', brand: 'Prinivil', category: 'Cardiovascular', batchNumber: 'LIS-2025-C12', expirationDate: '2026-11-15', supplier: 'Zuellig Pharma Logistics', stockQuantity: 45, reorderLevel: 50, purchasePrice: 4.20, sellingPrice: 12.50, unit: 'Tablets', location: 'Shelf A-1', lastUpdated: '2026-10-04T14:00:00Z' },
  { id: 'inv-3', sku: 'MED-ALB-90', name: 'Albuterol Sulfate Inhaler 90mcg', genericName: 'Albuterol', brand: 'Ventolin', category: 'Respiratory', batchNumber: 'ALB-2026-D05', expirationDate: '2027-06-30', supplier: 'GSK Philippines', stockQuantity: 28, reorderLevel: 15, purchasePrice: 180.00, sellingPrice: 320.00, unit: 'Inhalers', location: 'Shelf C-3', lastUpdated: '2026-10-03T11:20:00Z' },
  { id: 'inv-4', sku: 'MED-AMO-500', name: 'Amoxicillin 500mg Capsules', genericName: 'Amoxicillin', brand: 'Amoxil', category: 'Antibiotics', batchNumber: 'AMO-2026-A22', expirationDate: '2027-03-15', supplier: 'Pfizer PH', stockQuantity: 310, reorderLevel: 80, purchasePrice: 3.80, sellingPrice: 9.50, unit: 'Capsules', location: 'Shelf B-4', lastUpdated: '2026-10-05T09:30:00Z' },
  { id: 'inv-5', sku: 'SUP-SYR-10', name: 'Disposable Syringe 10mL', genericName: 'Syringe', brand: 'Terumo', category: 'Medical Supplies', batchNumber: 'SYR-2026-E11', expirationDate: '2029-12-31', supplier: 'Medical Depot PH', stockQuantity: 850, reorderLevel: 200, purchasePrice: 4.50, sellingPrice: 12.00, unit: 'Pieces', location: 'Cabinet D-1', lastUpdated: '2026-10-01T16:00:00Z' }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-501', invoiceNumber: 'INV-2026-0501', patientId: 'pat-1', patientName: 'Elena Vargas', patientMrn: 'MRN-2026-081', date: '2026-10-06', dueDate: '2026-10-20',
    items: [
      { id: 'ii-1', description: 'Physician Outpatient Consultation', category: 'Consultation', quantity: 1, unitPrice: 800.00, total: 800.00 },
      { id: 'ii-2', description: 'Comprehensive Metabolic Panel + HbA1c', category: 'Laboratory', quantity: 1, unitPrice: 1250.00, total: 1250.00 }
    ],
    subtotal: 2050.00, discountPercentage: 0, discountAmount: 0, taxAmount: 0, totalAmount: 2050.00, paidAmount: 2050.00, status: 'Paid', paymentMethod: 'GCash', insuranceClaimStatus: 'Approved', paidAt: '2026-10-06T10:15:00Z'
  },
  {
    id: 'inv-502', invoiceNumber: 'INV-2026-0502', patientId: 'pat-2', patientName: 'Liam Gabriel Torres', patientMrn: 'MRN-2026-104', date: '2026-10-06', dueDate: '2026-10-20',
    items: [
      { id: 'ii-3', description: 'Physician Outpatient Consultation', category: 'Consultation', quantity: 1, unitPrice: 800.00, total: 800.00 },
      { id: 'ii-4', description: 'Albuterol Inhaler (dispensed)', category: 'Pharmacy', quantity: 1, unitPrice: 320.00, total: 320.00 }
    ],
    subtotal: 1120.00, discountPercentage: 10, discountAmount: 112.00, taxAmount: 0, totalAmount: 1008.00, paidAmount: 500.00, status: 'Partially Paid', paymentMethod: 'Cash', insuranceClaimStatus: 'Pending'
  },
  {
    id: 'inv-503', invoiceNumber: 'INV-2026-0503', patientId: 'pat-3', patientName: 'Sofia Ramirez-Diaz', patientMrn: 'MRN-2026-218', date: '2026-10-05', dueDate: '2026-10-19',
    items: [
      { id: 'ii-5', description: 'Cardiology Consultation', category: 'Consultation', quantity: 1, unitPrice: 1200.00, total: 1200.00 },
      { id: 'ii-6', description: 'ECG 12-Lead', category: 'Procedure', quantity: 1, unitPrice: 450.00, total: 450.00 }
    ],
    subtotal: 1650.00, discountPercentage: 0, discountAmount: 0, taxAmount: 0, totalAmount: 1650.00, paidAmount: 0, status: 'Unpaid', insuranceClaimStatus: 'Pending'
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  // 1. Patrick Garcia Notifications (STRICTLY scoped to Patrick Garcia)
  {
    id: 'notif-pat-1',
    recipientId: '2d022a2d-89b6-4a78-8540-215cba501268',
    userId: '2d022a2d-89b6-4a78-8540-215cba501268',
    patientId: '2d022a2d-89b6-4a78-8540-215cba501268',
    recipientRole: 'patient',
    targetRole: 'patient',
    title: 'Appointment Confirmed',
    message: 'Your General Medicine consultation with Dr. Maria Cristina Reyes is confirmed for tomorrow at 09:30 AM.',
    content: 'Your appointment reservation has been confirmed by front desk staff. Please arrive 10 minutes before your scheduled slot at Room 302.',
    category: 'appointment',
    priority: 'normal',
    read: false,
    createdAt: '2026-10-06T08:30:00Z',
  },
  {
    id: 'notif-pat-2',
    recipientId: '2d022a2d-89b6-4a78-8540-215cba501268',
    userId: '2d022a2d-89b6-4a78-8540-215cba501268',
    patientId: '2d022a2d-89b6-4a78-8540-215cba501268',
    recipientRole: 'patient',
    targetRole: 'patient',
    title: 'Diagnostic Lab Results Ready',
    message: 'Your Complete Blood Count (CBC) and Lipid Profile results are certified and available in your portal.',
    content: 'Certified pathologist report has been completed. All routine hematology indices are within normal reference limits.',
    category: 'lab',
    priority: 'normal',
    read: false,
    createdAt: '2026-10-06T09:16:00Z',
  },

  // 2. Elena Vargas Notifications (STRICTLY scoped to Elena Vargas)
  {
    id: 'notif-p-1',
    recipientId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    userId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    patientId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    recipientRole: 'patient',
    targetRole: 'patient',
    title: 'Lab Result Ready',
    message: 'Your Comprehensive Metabolic Panel and HbA1c results are now available for review.',
    content: 'Dr. Maria Cristina Reyes has reviewed and certified your Comprehensive Metabolic Panel (CMP) and HbA1c laboratory report. Your results show optimal glycaemic stabilization.',
    category: 'lab',
    priority: 'normal',
    read: false,
    createdAt: '2026-10-06T09:16:00Z',
  },
  {
    id: 'notif-p-2',
    recipientId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    userId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    patientId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    recipientRole: 'patient',
    targetRole: 'patient',
    title: 'Appointment Confirmation',
    message: 'Your upcoming Follow-Up Consultation with Dr. Maria Cristina Reyes is confirmed for Oct 20 at 10:30 AM.',
    content: 'Your appointment reservation has been officially confirmed by clinic staff. Please arrive 10 minutes before your scheduled slot or check in via the Live Queue board.',
    category: 'appointment',
    priority: 'normal',
    read: false,
    createdAt: '2026-10-06T08:30:00Z',
  },
  {
    id: 'notif-p-3',
    recipientId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    userId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    patientId: '664e0862-fd97-40da-a3c3-75cfa278b57e',
    recipientRole: 'patient',
    targetRole: 'patient',
    title: 'Prescription Ready for Pickup',
    message: 'Electronic Prescription RX-2026-0901 has been approved and is ready at the dispensary.',
    content: 'Your prescribed medication Metformin 500mg and Lisinopril 10mg has been finalized and certified with digital doctor signature.',
    category: 'prescription',
    priority: 'normal',
    read: true,
    createdAt: '2026-10-05T14:20:00Z',
  },

  // 3. Dr. Maria Cristina Reyes Notifications (STRICTLY scoped to Dr. Reyes)
  {
    id: 'notif-pr-1',
    recipientId: 'usr-1',
    userId: 'usr-1',
    doctorId: 'usr-1',
    recipientRole: 'doctor',
    targetRole: 'provider',
    title: 'Patient Checked In: Waiting in Lobby',
    message: 'Liam Gabriel Torres checked in for Asthma exacerbation. Assigned to Ticket A-102 in Waiting Room B.',
    content: 'Nurse triage intake has logged vital signs for Liam Gabriel Torres (MRN-2026-104). Patient is seated in Waiting Room B ready for consultation.',
    category: 'triage',
    priority: 'normal',
    read: false,
    createdAt: '2026-10-06T10:15:00Z',
  },
  {
    id: 'notif-pr-2',
    recipientId: 'usr-1',
    userId: 'usr-1',
    doctorId: 'usr-1',
    recipientRole: 'doctor',
    targetRole: 'provider',
    title: 'New Consultation Booking',
    message: 'Patrick Garcia (MRN-2026-030) booked General Medicine consultation for tomorrow at 09:30 AM.',
    content: 'Routine executive health checkup and vitals review scheduled.',
    category: 'appointment',
    priority: 'normal',
    read: false,
    createdAt: '2026-10-06T08:50:00Z',
  },

  // 4. Dr. Juan Miguel Santos Notifications (STRICTLY scoped to Dr. Santos)
  {
    id: 'notif-pr-3',
    recipientId: 'usr-2',
    userId: 'usr-2',
    doctorId: 'usr-2',
    recipientRole: 'doctor',
    targetRole: 'provider',
    title: 'Diagnostic ECG Report Ready',
    message: 'Resting 12-lead ECG telemetry traces completed for outpatient cardiology clinic.',
    content: 'Review and electronic sign-off requested before patient discharge.',
    category: 'lab',
    priority: 'normal',
    read: false,
    createdAt: '2026-10-06T08:10:00Z',
  },

  // 5. Admin Notifications (STRICTLY scoped to Director Maria Lourdes Santos)
  {
    id: 'notif-ad-1',
    recipientId: 'usr-admin',
    userId: 'usr-admin',
    recipientRole: 'admin',
    targetRole: 'admin',
    title: 'Low Stock Alert: Lisinopril 10mg',
    message: 'Pharmacy inventory indicates Lisinopril 10mg is below reorder threshold (45 units remaining; min 50).',
    content: 'Automated formulary inventory audit detected critical stock depletion for SKU MED-LIS-10 (Lisinopril 10mg Tablets).',
    category: 'inventory',
    priority: 'high',
    read: false,
    createdAt: '2026-10-06T08:00:00Z',
  },
  {
    id: 'notif-ad-2',
    recipientId: 'usr-admin',
    userId: 'usr-admin',
    recipientRole: 'admin',
    targetRole: 'admin',
    title: 'Security System Integrity Verified',
    message: 'Automatic hourly audit trail hashing verified 100% tamper-evident integrity.',
    content: 'The cryptographic security engine checked all audit log records under Republic Act 10173.',
    category: 'security',
    priority: 'low',
    read: true,
    createdAt: '2026-10-05T12:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', timestamp: '2026-10-06T09:30:00Z', userId: 'usr-1', userName: 'Dr. Maria Cristina Reyes, MD', userRole: 'doctor', action: 'CONSULTATION_COMPLETE', resourceType: 'Consultation', resourceId: 'con-101', description: 'Completed consultation for Elena Vargas and ordered follow-up labs.' },
  { id: 'aud-2', timestamp: '2026-10-06T09:25:40Z', userId: 'usr-1', userName: 'Dr. Maria Cristina Reyes, MD', userRole: 'doctor', action: 'PRESCRIPTION_CREATE', resourceType: 'Prescription', resourceId: 'rx-901', description: 'Created electronic prescription RX-2026-0901 with AI drug safety verification.' },
  { id: 'aud-3', timestamp: '2026-10-06T09:15:22Z', userId: 'usr-6', userName: 'Amina Bautista, RMT', userRole: 'lab_technician', action: 'LAB_RESULT_ENTERED', resourceType: 'Laboratory', resourceId: 'lab-401', description: 'Entered and certified lab panel results for LAB-2026-1041.' },
  { id: 'aud-4', timestamp: '2026-10-06T08:50:00Z', userId: 'usr-4', userName: 'Claire Mendoza', userRole: 'receptionist', action: 'APPOINTMENT_CHECKIN', resourceType: 'Appointment', resourceId: 'apt-101', description: 'Checked in Elena Vargas for appointment apt-101 and assigned queue A-101.' },
  { id: 'aud-5', timestamp: '2026-10-06T07:45:00Z', userId: 'usr-admin', userName: 'Director Maria Lourdes Santos, MD', userRole: 'admin', action: 'SECURITY_LOGIN', resourceType: 'Security', resourceId: 'auth-session-882', description: 'Director Maria Lourdes Santos, MD authenticated successfully via secure session token.' }
];

export const INITIAL_CONSULTATIONS: Consultation[] = [
  {
    id: 'con-101', appointmentId: 'apt-106', patientId: 'pat-1', patientName: 'Elena Vargas', doctorId: 'usr-1', doctorName: 'Dr. Maria Cristina Reyes, MD', date: '2026-09-02',
    chiefComplaint: 'Quarterly review for diabetes and blood pressure maintenance. Mild morning fatigue.',
    historyOfPresentIllness: 'Patient is a 48-year-old female with long-standing Type 2 Diabetes and Hypertension, presenting for routine review. Adhering to current oral regimen. Reports occasional morning lethargy, denied polydipsia or polyuria.',
    reviewOfSystems: 'Cardiovascular: Denies chest pain or palpitations. Endocrine: Denies cold intolerance or heat intolerance. Renal: Denies dysuria or nocturia.',
    physicalExamination: 'Alert, oriented x3, well-nourished. Lungs clear to auscultation bilaterally. Cardiac: Regular rhythm, no murmurs. Extremities: No peripheral edema, intact distal pulses and sensation.',
    vitals: INITIAL_PATIENTS[0].vitalsHistory[1],
    diagnoses: [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', type: 'Primary' },
      { code: 'I10', description: 'Essential (primary) hypertension', type: 'Secondary' }
    ],
    treatmentPlan: '1. Continue Metformin 500mg BID.\n2. Titrate Lisinopril to 10mg daily.\n3. Ordered CMP and HbA1c for next visit in 4 weeks.\n4. Dietary counseling reinforced for low glycemic load.',
    prescriptionsCreated: ['rx-901'], labOrdersCreated: ['lab-401'], followUpDate: '2026-10-06',
    followUpInstructions: 'Return in 4 weeks for laboratory result review and blood pressure assessment.'
  }
];

export const PHILIPPINE_HMO_PARTNERS: HMOPartner[] = [
  {
    id: 'hmo-1',
    name: 'Maxicare Healthcare Corporation',
    code: 'MAXICARE',
    accreditationNumber: 'DOH-HMO-2026-001',
    coverageRate: 100,
    contactHotline: '(02) 8582-1900 / 0917-882-6294',
    portalUrl: 'https://maxicare.com.ph',
    status: 'Active Partner',
  },
  {
    id: 'hmo-2',
    name: 'Intellicare (Asalus Corporation)',
    code: 'INTELLICARE',
    accreditationNumber: 'DOH-HMO-2026-002',
    coverageRate: 100,
    contactHotline: '(02) 8789-4000',
    portalUrl: 'https://intellicare.com.ph',
    status: 'Active Partner',
  },
  {
    id: 'hmo-3',
    name: 'Medicard Philippines, Inc.',
    code: 'MEDICARD',
    accreditationNumber: 'DOH-HMO-2026-003',
    coverageRate: 90,
    contactHotline: '(02) 8841-8080',
    portalUrl: 'https://medicardphils.com',
    status: 'Active Partner',
  },
  {
    id: 'hmo-4',
    name: 'PhilCare (PhilhealthCare, Inc.)',
    code: 'PHILCARE',
    accreditationNumber: 'DOH-HMO-2026-004',
    coverageRate: 90,
    contactHotline: '(02) 8462-1800',
    portalUrl: 'https://philcare.com.ph',
    status: 'Active Partner',
  },
  {
    id: 'hmo-5',
    name: 'PhilHealth (Konsulta Accredited)',
    code: 'PHILHEALTH',
    accreditationNumber: 'GOV-PH-1995-001',
    coverageRate: 100,
    contactHotline: '(02) 8441-7442',
    portalUrl: 'https://philhealth.gov.ph',
    status: 'Active Partner',
  },
  {
    id: 'hmo-6',
    name: 'Cocolife Healthcare',
    code: 'COCOLIFE',
    accreditationNumber: 'DOH-HMO-2026-005',
    coverageRate: 85,
    contactHotline: '(02) 8810-7888',
    portalUrl: 'https://cocolife.com',
    status: 'Active Partner',
  },
  {
    id: 'hmo-7',
    name: 'Pacific Cross Insurance',
    code: 'PACIFIC_CROSS',
    accreditationNumber: 'DOH-HMO-2026-006',
    coverageRate: 85,
    contactHotline: '(02) 8230-8511',
    portalUrl: 'https://pacificcross.com.ph',
    status: 'Active Partner',
  },
  {
    id: 'hmo-8',
    name: 'Etiqa Life and General Insurance',
    code: 'ETIQA',
    accreditationNumber: 'DOH-HMO-2026-007',
    coverageRate: 85,
    contactHotline: '(02) 8890-1758',
    portalUrl: 'https://etiqa.com.ph',
    status: 'Active Partner',
  },
];

