-- ==============================================================================
-- SmartClinic V2 — Isolated Supabase Migration 002: Fictional Synthetic Seed Data
-- Target: NEW Independent Supabase Project ONLY
-- Privacy Guarantee: 100% synthetic fictional accounts and medical records.
-- Compatible with VARCHAR(64) primary keys in 001_smartclinic_v2_schema_and_rls.sql.
-- ==============================================================================

-- 1. Synthetic Clinic Staff & Portal Users
INSERT INTO public.users (id, email, full_name, role, sub_role, specialty, license_number, phone, department, is_active)
VALUES
  ('usr-admin-1', 'admin@smartclinic-v2.demo', 'Dir. Rafael Mendoza (Synthetic)', 'admin', NULL, 'Healthcare Operations', 'ADM-2026-001', '+639170000101', 'Executive Administration', TRUE),
  ('usr-doc-1', 'dr.santos@smartclinic-v2.demo', 'Dr. Maria Clara Santos, MD (Synthetic)', 'doctor', NULL, 'Internal Medicine & Cardiology', 'PRC-0114892', '+639170000102', 'Internal Medicine', TRUE),
  ('usr-doc-2', 'dr.reyes@smartclinic-v2.demo', 'Dr. Antonio Reyes, MD (Synthetic)', 'doctor', NULL, 'Family & Preventive Medicine', 'PRC-0119304', '+639170000103', 'Family Medicine', TRUE),
  ('usr-nurse-1', 'nurse.cruz@smartclinic-v2.demo', 'RN Angelica Cruz (Synthetic)', 'nurse', 'nurse', 'Outpatient Triage', 'PRC-RN-44810', '+639170000104', 'Triage & Nursing', TRUE),
  ('usr-rec-1', 'frontdesk@smartclinic-v2.demo', ' Marco Villanueva (Synthetic)', 'receptionist', 'receptionist', NULL, NULL, '+639170000105', 'Front Desk & Queue', TRUE),
  ('usr-pharm-1', 'pharmacy@smartclinic-v2.demo', 'RPh Camille Bautista (Synthetic)', 'pharmacist', 'pharmacist', 'Clinical Pharmacy', 'PRC-RPH-30912', '+639170000106', 'Dispensary', TRUE),
  ('usr-lab-1', 'lab@smartclinic-v2.demo', 'RMT Jerome Aquino (Synthetic)', 'lab_technician', 'lab_tech', 'Clinical Pathology', 'PRC-RMT-55201', '+639170000107', 'Diagnostics Lab', TRUE),
  ('usr-pat-1', 'patient.demo1@smartclinic-v2.demo', 'Juan Dela Cruz (Synthetic)', 'patient', NULL, NULL, NULL, '+639170000201', NULL, TRUE),
  ('usr-pat-2', 'patient.demo2@smartclinic-v2.demo', 'Elena Magtanggol (Synthetic)', 'patient', NULL, NULL, NULL, '+639170000202', NULL, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Fictional Synthetic Patients
INSERT INTO public.patients (
  id, mrn, full_name, dob, age, gender, blood_type, phone, email, address,
  emergency_contact, allergies, chronic_conditions, current_medications,
  primary_doctor_id, insurance_provider, insurance_policy_number
)
VALUES
  (
    'pat-v2-001',
    'MRN-V2-1001',
    'Juan Dela Cruz (Synthetic)',
    '1984-05-19',
    42,
    'Male',
    'O+',
    '+639170000201',
    'patient.demo1@smartclinic-v2.demo',
    '142 Sampaguita St., Quezon City (Synthetic)',
    '{"name": "Luisa Dela Cruz", "relationship": "Spouse", "phone": "+639170000299"}'::jsonb,
    '["Penicillin"]'::jsonb,
    '["Stage 1 Hypertension"]'::jsonb,
    '["Amlodipine 5mg OD"]'::jsonb,
    'usr-doc-1',
    'PhilHealth',
    'PH-SYNTH-900124'
  ),
  (
    'pat-v2-002',
    'MRN-V2-1002',
    'Elena Magtanggol (Synthetic)',
    '1991-11-08',
    34,
    'Female',
    'A+',
    '+639170000202',
    'patient.demo2@smartclinic-v2.demo',
    '88 Narra Ave., Makati City (Synthetic)',
    '{"name": "Roberto Magtanggol", "relationship": "Brother", "phone": "+639170000298"}'::jsonb,
    '[]'::jsonb,
    '["Type 2 Diabetes Mellitus"]'::jsonb,
    '["Metformin 500mg BID"]'::jsonb,
    'usr-doc-2',
    'Maxicare HMO',
    'MX-SYNTH-441092'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Synthetic Appointments
INSERT INTO public.appointments (
  id, patient_id, patient_name, patient_mrn, doctor_id, doctor_name,
  department, appointment_date, appointment_time, duration_minutes,
  reason, status, type, queue_number, room
)
VALUES
  (
    'apt-v2-001',
    'pat-v2-001',
    'Juan Dela Cruz (Synthetic)',
    'MRN-V2-1001',
    'usr-doc-1',
    'Dr. Maria Clara Santos, MD (Synthetic)',
    'Internal Medicine',
    CURRENT_DATE,
    '09:30 AM',
    30,
    'Routine blood pressure evaluation and home log review',
    'Checked In',
    'In-Person',
    'Q-101',
    'Room 101'
  ),
  (
    'apt-v2-002',
    'pat-v2-002',
    'Elena Magtanggol (Synthetic)',
    'MRN-V2-1002',
    'usr-doc-2',
    'Dr. Antonio Reyes, MD (Synthetic)',
    'Family Medicine',
    CURRENT_DATE,
    '10:30 AM',
    30,
    'Quarterly HbA1c lab follow-up',
    'Scheduled',
    'In-Person',
    'Q-102',
    'Room 102'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Synthetic Pharmacy Formulary Inventory
INSERT INTO public.inventory_items (
  id, sku, name, generic_name, category, form, strength,
  stock_quantity, reorder_level, unit, unit_price, expiry_date, batch_number, supplier, location
)
VALUES
  ('inv-v2-001', 'SKU-V2-AML5', 'Norvasc / Amlodipine', 'Amlodipine Besylate', 'Cardiovascular', 'Tablet', '5mg', 180, 40, 'tabs', 14.50, '2027-08-31', 'SYN-B101', 'MetroPharma Synthetic Corp', 'Shelf A-1'),
  ('inv-v2-002', 'SKU-V2-MET500', 'Glucophage / Metformin', 'Metformin HCl', 'Antidiabetic', 'Tablet', '500mg', 240, 50, 'tabs', 9.75, '2027-11-30', 'SYN-B102', 'MetroPharma Synthetic Corp', 'Shelf B-2')
ON CONFLICT (id) DO NOTHING;
