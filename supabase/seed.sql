-- ==============================================================================
-- SMARTCLINIC V2 — SAFE SYNTHETIC DEMONSTRATION SEED DATA
-- ==============================================================================
-- NOTE:
-- - Contains 100% synthetic demonstration records for academic capstone testing.
-- - Non-destructive: Does NOT drop tables, alter schemas, weaken RLS policies,
--   or grant table privileges to anon/public roles.
-- - Run AFTER:
--     1) supabase/migrations/001_smartclinic_v2_schema_and_rls.sql
--     2) supabase/migrations/003_smartclinic_predictive_notifications_security.sql (optional order with 002)
-- - Identical to supabase/migrations/002_smartclinic_v2_synthetic_seed.sql so
--   Supabase CLI (`supabase db reset`) safely seeds data without overwriting RLS.
-- ==============================================================================

BEGIN;

-- 1. Seed Synthetic Clinic Staff & Role Accounts (public.users)
INSERT INTO public.users (id, email, full_name, role, sub_role, specialty, license_number, phone, department, is_active)
VALUES
    ('usr-admin', 'smartclinicrealacc@gmail.com', 'Director Maria Lourdes Santos, MD', 'admin', NULL, 'Healthcare Administration', 'PRC-0081294', '+63 917 800 1101', 'Executive Management', TRUE),
    ('usr-1', 'cristina.reyes@smartclinic.ph', 'Dr. Maria Cristina Reyes, MD', 'doctor', NULL, 'Internal Medicine', 'PRC-0104821', '+63 917 555 0101', 'General Medicine', TRUE),
    ('usr-2', 'rafael.santos@smartclinic.ph', 'Dr. Rafael Lorenzo Santos, MD', 'doctor', NULL, 'Cardiology', 'PRC-0098412', '+63 917 555 0102', 'Cardiology', TRUE),
    ('usr-3', 'camille.gomez@smartclinic.ph', 'Dr. Camille Andrea Gomez, MD', 'doctor', NULL, 'Pediatrics', 'PRC-0112940', '+63 917 555 0103', 'Pediatrics', TRUE),
    ('usr-nurse-1', 'angela.cruz@smartclinic.ph', 'Angela Marie Cruz, RN', 'nurse', 'nurse', 'Outpatient Triage Nursing', 'PRC-RN-448210', '+63 917 555 0201', 'Outpatient Triage', TRUE),
    ('usr-rec-1', 'marco.villanueva@smartclinic.ph', 'Marco Antonio Villanueva', 'receptionist', 'receptionist', 'Patient Access & Queue Desk', NULL, '+63 917 555 0301', 'Front Desk', TRUE),
    ('usr-pharm-1', 'patricia.lim@smartclinic.ph', 'Patricia Anne Lim, RPh', 'pharmacist', 'pharmacist', 'Clinical Pharmacy', 'PRC-RPH-332910', '+63 917 555 0401', 'Pharmacy', TRUE),
    ('usr-lab-1', 'amina.bautista@smartclinic.ph', 'Amina Bautista, RMT', 'lab_technician', 'lab_tech', 'Clinical Pathology', 'PRC-RMT-551920', '+63 917 555 0501', 'Laboratory', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Mirror clinical staff directory entries
INSERT INTO public.staff (id, email, full_name, role, specialty, department, license_number, phone, is_active)
VALUES
    ('usr-1', 'cristina.reyes@smartclinic.ph', 'Dr. Maria Cristina Reyes, MD', 'doctor', 'Internal Medicine', 'General Medicine', 'PRC-0104821', '+63 917 555 0101', TRUE),
    ('usr-2', 'rafael.santos@smartclinic.ph', 'Dr. Rafael Lorenzo Santos, MD', 'doctor', 'Cardiology', 'Cardiology', 'PRC-0098412', '+63 917 555 0102', TRUE),
    ('usr-3', 'camille.gomez@smartclinic.ph', 'Dr. Camille Andrea Gomez, MD', 'doctor', 'Pediatrics', 'Pediatrics', 'PRC-0112940', '+63 917 555 0103', TRUE),
    ('usr-nurse-1', 'angela.cruz@smartclinic.ph', 'Angela Marie Cruz, RN', 'nurse', 'Outpatient Triage Nursing', 'Outpatient Triage', 'PRC-RN-448210', '+63 917 555 0201', TRUE),
    ('usr-rec-1', 'marco.villanueva@smartclinic.ph', 'Marco Antonio Villanueva', 'receptionist', 'Patient Access & Queue Desk', 'Front Desk', NULL, '+63 917 555 0301', TRUE),
    ('usr-pharm-1', 'patricia.lim@smartclinic.ph', 'Patricia Anne Lim, RPh', 'pharmacist', 'Clinical Pharmacy', 'Pharmacy', 'PRC-RPH-332910', '+63 917 555 0401', TRUE),
    ('usr-lab-1', 'amina.bautista@smartclinic.ph', 'Amina Bautista, RMT', 'lab_technician', 'Clinical Pathology', 'Laboratory', 'PRC-RMT-551920', '+63 917 555 0501', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Synthetic Outpatient Records (public.patients)
INSERT INTO public.patients (
    id, mrn, full_name, dob, age, gender, blood_type, phone, email, address,
    emergency_contact, allergies, chronic_conditions, current_medications,
    primary_doctor_id, insurance_provider, insurance_policy_number
)
VALUES
    (
        'pat-1', 'MRN-2026-101', 'Elena Sofia Mendoza (Synthetic Demo)', '1988-05-14', 37, 'Female', 'O+',
        '+63 917 100 2001', 'elena.mendoza.demo@example.com', 'Quezon City, Metro Manila (Synthetic)',
        '{"name":"Carlos Mendoza","relationship":"Spouse","phone":"+63 917 100 2099"}'::jsonb,
        '[{"allergen":"Penicillin","severity":"Moderate","reaction":"Skin rash"}]'::jsonb,
        '["Stage 1 Essential Hypertension"]'::jsonb,
        '["Losartan 50mg OD"]'::jsonb,
        'usr-1', 'PhilHealth', 'PH-DEMO-100201'
    ),
    (
        'pat-2', 'MRN-2026-102', 'Gabriel Mateo Navarro (Synthetic Demo)', '1975-11-02', 50, 'Male', 'A+',
        '+63 917 100 2002', 'gabriel.navarro.demo@example.com', 'Pasig City, Metro Manila (Synthetic)',
        '{"name":"Lucia Navarro","relationship":"Spouse","phone":"+63 917 100 2098"}'::jsonb,
        '[]'::jsonb,
        '["Type 2 Diabetes Mellitus","Dyslipidemia"]'::jsonb,
        '["Metformin 500mg BID","Atorvastatin 20mg OD"]'::jsonb,
        'usr-2', 'Maxicare HMO (Synthetic)', 'MX-DEMO-200302'
    ),
    (
        'pat-3', 'MRN-2026-103', 'lucas.bautista.demo', '2019-08-21', 6, 'Male', 'B+',
        '+63 917 100 2003', 'parent.bautista.demo@example.com', 'Makati City, Metro Manila (Synthetic)',
        '{"name":"Clarissa Bautista","relationship":"Mother","phone":"+63 917 100 2003"}'::jsonb,
        '[]'::jsonb,
        '["Mild Intermittent Asthma"]'::jsonb,
        '["Salbutamol MDI PRN"]'::jsonb,
        'usr-3', 'PhilHealth', 'PH-DEMO-300403'
    )
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Synthetic Appointments
INSERT INTO public.appointments (
    id, booking_reference, patient_id, patient_name, patient_mrn, doctor_id, doctor_name,
    department, branch, appointment_date, appointment_time, duration_minutes, reason,
    status, type, is_walk_in, queue_number, room, is_synthetic
)
VALUES
    (
        'apt-demo-1', 'SC-20261030-1001', 'pat-1', 'Elena Sofia Mendoza (Synthetic Demo)', 'MRN-2026-101',
        'usr-1', 'Dr. Maria Cristina Reyes, MD', 'General Medicine', 'Main Outpatient Clinic',
        CURRENT_DATE, '09:00', 30, 'Routine blood pressure follow-up and prescription refill',
        'Confirmed', 'In-Person', FALSE, 'A-101', 'Room 101', TRUE
    ),
    (
        'apt-demo-2', 'SC-20261030-1002', 'pat-2', 'Gabriel Mateo Navarro (Synthetic Demo)', 'MRN-2026-102',
        'usr-2', 'Dr. Rafael Lorenzo Santos, MD', 'Cardiology', 'Main Outpatient Clinic',
        CURRENT_DATE, '10:30', 30, 'Fasting lipid panel and glycemic control review',
        'Checked In', 'In-Person', FALSE, 'B-102', 'Room 202', TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Synthetic Pharmacy Inventory
INSERT INTO public.inventory_items (
    id, sku, name, generic_name, brand, category, batch_number,
    expiration_date, expiry_date, supplier, stock_quantity, reorder_level,
    purchase_price, selling_price, unit_price, unit, location
)
VALUES
    ('inv-1', 'MED-LOS-050', 'Losartan Potassium 50mg', 'Losartan', 'Cozaar-Synth', 'Antihypertensive', 'BATCH-2026-A1', '2028-06-30', '2028-06-30', 'Metro Pharma Demo Supply', 320, 50, 8.50, 14.00, 14.00, 'Tablets', 'Shelf A-1'),
    ('inv-2', 'MED-MET-500', 'Metformin HCl 500mg', 'Metformin', 'Glucophage-Synth', 'Antidiabetic', 'BATCH-2026-B2', '2028-09-15', '2028-09-15', 'Metro Pharma Demo Supply', 480, 75, 4.25, 7.50, 7.50, 'Tablets', 'Shelf A-2'),
    ('inv-3', 'MED-PCM-500', 'Paracetamol 500mg', 'Paracetamol', 'Biogesic-Synth', 'Analgesic / Antipyretic', 'BATCH-2026-C3', '2028-12-31', '2028-12-31', 'HealthLine Demo Distributors', 600, 100, 2.00, 4.50, 4.50, 'Tablets', 'Shelf B-1')
ON CONFLICT (id) DO NOTHING;

COMMIT;
