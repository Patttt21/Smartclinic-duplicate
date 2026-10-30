-- SmartClinic Synthetic Seed for Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables for clean initialization
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.lab_orders CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.consultations CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. Table Definitions
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    sub_role VARCHAR(32),
    specialty VARCHAR(128),
    license_number VARCHAR(64),
    phone VARCHAR(32) NOT NULL,
    department VARCHAR(128),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(32) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(16) NOT NULL,
    blood_type VARCHAR(8) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    emergency_contact JSONB DEFAULT '{}'::jsonb NOT NULL,
    allergies JSONB DEFAULT '[]'::jsonb NOT NULL,
    chronic_conditions JSONB DEFAULT '[]'::jsonb NOT NULL,
    current_medications JSONB DEFAULT '[]'::jsonb NOT NULL,
    primary_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    insurance_provider VARCHAR(128) DEFAULT 'PhilHealth',
    insurance_policy_number VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(32) NOT NULL,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    doctor_name VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(16) NOT NULL,
    duration_minutes INT DEFAULT 30 NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'Scheduled' NOT NULL,
    type VARCHAR(32) DEFAULT 'In-Person' NOT NULL,
    queue_number VARCHAR(16),
    room VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    consultation_date DATE NOT NULL,
    chief_complaint TEXT NOT NULL,
    history_of_present_illness TEXT,
    physical_examination TEXT,
    vitals JSONB DEFAULT '{}'::jsonb NOT NULL,
    diagnoses JSONB DEFAULT '[]'::jsonb NOT NULL,
    treatment_plan TEXT NOT NULL,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    prescription_number VARCHAR(32) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    prescription_date DATE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    status VARCHAR(32) DEFAULT 'Active' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    order_number VARCHAR(32) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    urgency VARCHAR(32) DEFAULT 'Routine' NOT NULL,
    status VARCHAR(32) DEFAULT 'Requested' NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    collected_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    results JSONB DEFAULT '[]'::jsonb,
    interpretation TEXT
);

CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    brand VARCHAR(128),
    category VARCHAR(64) NOT NULL,
    batch_number VARCHAR(64) NOT NULL,
    expiration_date DATE NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    stock_quantity INT DEFAULT 0 NOT NULL,
    reorder_level INT DEFAULT 50 NOT NULL,
    purchase_price NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    selling_price NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    unit VARCHAR(32) DEFAULT 'Tablets' NOT NULL,
    location VARCHAR(64) NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    invoice_number VARCHAR(32) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    subtotal NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    paid_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(32) DEFAULT 'Unpaid' NOT NULL,
    payment_method VARCHAR(64),
    payment_date TIMESTAMPTZ,
    insurance_claim_status VARCHAR(32) DEFAULT 'Not Filed' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1' NOT NULL
);

-- Indexes
CREATE INDEX idx_patients_mrn ON public.patients(mrn);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX idx_invoices_patient ON public.invoices(patient_id);

-- RLS & Permissions
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow All Patients" ON public.patients FOR ALL USING (true);
CREATE POLICY "Allow All Appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Allow All Consultations" ON public.consultations FOR ALL USING (true);
CREATE POLICY "Allow All Prescriptions" ON public.prescriptions FOR ALL USING (true);
CREATE POLICY "Allow All Lab Orders" ON public.lab_orders FOR ALL USING (true);
CREATE POLICY "Allow All Inventory" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Allow All Invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Allow All Audit Logs" ON public.audit_logs FOR ALL USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Dynamic Seed Execution (Zero Hardcoded Primary Keys or Dates)
DO $$
DECLARE
    -- Dynamic Staff Primary Keys
    v_admin_id UUID := gen_random_uuid();
    v_doc1 UUID := gen_random_uuid();
    v_doc2 UUID := gen_random_uuid();
    v_doc3 UUID := gen_random_uuid();
    v_doc4 UUID := gen_random_uuid();
    v_doc5 UUID := gen_random_uuid();
    v_nurse1 UUID := gen_random_uuid();
    v_nurse2 UUID := gen_random_uuid();
    v_nurse3 UUID := gen_random_uuid();
    v_nurse4 UUID := gen_random_uuid();
    v_rec1 UUID := gen_random_uuid();
    v_rec2 UUID := gen_random_uuid();
    v_pharm1 UUID := gen_random_uuid();
    v_pharm2 UUID := gen_random_uuid();
    v_lab1 UUID := gen_random_uuid();
    v_lab2 UUID := gen_random_uuid();

    -- 30 Dynamic Patient Primary Keys
    v_pat UUID[] := ARRAY[
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid()
    ];

    -- 50 Dynamic Appointment Primary Keys
    v_appt UUID[] := ARRAY[
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid()
    ];

    -- 28 Dynamic Consultation Primary Keys
    v_cons UUID[] := ARRAY[
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid()
    ];
BEGIN
    -- [A] Insert Staff Users
    INSERT INTO public.users (id, email, full_name, role, sub_role, specialty, license_number, phone, department) VALUES
    (v_admin_id, 'smartclinicrealacc@gmail.com', 'Director Maria Lourdes Santos, MD', 'admin', NULL, 'Healthcare Administration', 'PRC-0081294', '+63 917 800 1101', 'Executive Management'),
    (v_doc1, 'ramon.bautista@smartclinic.ph', 'Dr. Ramon Jose Bautista, MD, FPCP', 'doctor', NULL, 'Internal Medicine & Cardiology', 'PRC-0094182', '+63 917 554 2011', 'Cardiology & Internal Medicine'),
    (v_doc2, 'cristina.mendoza@smartclinic.ph', 'Dr. Maria Cristina Mendoza, MD, FPPS', 'doctor', NULL, 'Pediatrics & Neonatology', 'PRC-0105423', '+63 918 221 4088', 'Pediatrics'),
    (v_doc3, 'paolo.reyes@smartclinic.ph', 'Dr. Jose Paolo Reyes, MD, FPAFP', 'doctor', NULL, 'Family Medicine & Primary Care', 'PRC-0088921', '+63 920 334 9120', 'Family Medicine'),
    (v_doc4, 'beatrice.dizon@smartclinic.ph', 'Dr. Beatrice Angela Dizon, MD, FPOGS', 'doctor', NULL, 'Obstetrics & Gynecology', 'PRC-0112450', '+63 917 441 8890', 'Women''s Health'),
    (v_doc5, 'antonio.villanueva@smartclinic.ph', 'Dr. Antonio Miguel Villanueva, MD, FPOA', 'doctor', NULL, 'Orthopedic Surgery & Sports Medicine', 'PRC-0097652', '+63 919 772 1354', 'Orthopedics'),
    (v_nurse1, 'katrina.soriano@smartclinic.ph', 'Katrina Mae Soriano, RN', 'staff', 'nurse', 'Triage & Adult Care', 'PRC-RN-0214891', '+63 927 114 5502', 'Outpatient Nursing'),
    (v_nurse2, 'mark.delrosario@smartclinic.ph', 'Mark Christian Del Rosario, RN', 'staff', 'nurse', 'Pediatric Nursing & Vaccines', 'PRC-RN-0231904', '+63 915 667 8910', 'Pediatric Clinic'),
    (v_nurse3, 'kristine.alcantara@smartclinic.ph', 'Kristine Joy Alcantara, RN', 'staff', 'nurse', 'Clinical Procedures & Wound Care', 'PRC-RN-0245012', '+63 908 332 9941', 'Minor Surgery & Treatment'),
    (v_nurse4, 'angelo.cruz@smartclinic.ph', 'Angelo Gabriel Cruz, RN', 'staff', 'nurse', 'Vital Signs & Tele-triage', 'PRC-RN-0251187', '+63 922 450 7812', 'Triage & Diagnostics'),
    (v_rec1, 'patricia.mercado@smartclinic.ph', 'Patricia Anne Mercado', 'staff', 'receptionist', 'Patient Registration & Front Desk', NULL, '+63 916 889 0214', 'Front Office'),
    (v_rec2, 'dominic.ocampo@smartclinic.ph', 'Dominic Francis Ocampo', 'staff', 'receptionist', 'Queue Management & PhilHealth Helpdesk', NULL, '+63 920 119 7743', 'Front Office'),
    (v_pharm1, 'rochelle.garcia@smartclinic.ph', 'Rochelle Ann Garcia, RPh', 'staff', 'pharmacist', 'Dispensing & Medication Therapy', 'PRC-PH-0044192', '+63 917 338 4920', 'Pharmacy Department'),
    (v_pharm2, 'justin.aquino@smartclinic.ph', 'Justin Benedict Aquino, RPh', 'staff', 'pharmacist', 'Inventory & Drug Safety', 'PRC-PH-0048105', '+63 918 662 3189', 'Pharmacy Department'),
    (v_lab1, 'marygrace.castillo@smartclinic.ph', 'Mary Grace Castillo, RMT', 'staff', 'lab_tech', 'Clinical Chemistry & Hematology', 'PRC-MT-0061203', '+63 927 990 4156', 'Clinical Laboratory'),
    (v_lab2, 'jonathan.flores@smartclinic.ph', 'Jonathan David Flores, RMT', 'staff', 'lab_tech', 'Microbiology & Serology', 'PRC-MT-0064981', '+63 905 441 8723', 'Clinical Laboratory');

    -- [B] Insert Patients (Dynamic DOB & IDs)
    INSERT INTO public.patients (id, mrn, full_name, dob, age, gender, blood_type, phone, email, address, emergency_contact, allergies, chronic_conditions, current_medications, primary_doctor_id, insurance_provider, insurance_policy_number) VALUES
    (v_pat[1], 'MRN-2026-001', 'Elena Maria Vargas', CURRENT_DATE - INTERVAL '48 years 0 days', 48, 'Female', 'A+', '+63 917 234 5678', 'elena.vargas@smartclinic.ph', '742 Mabini St, Brgy San Antonio, Pasig City', '{"name":"Roberto Vargas","phone":"+63 917 234 9988","relationship":"Spouse"}'::jsonb, '[{"allergen":"Penicillin","severity":"severe"}]'::jsonb, '["Type 2 Diabetes Mellitus","Hypertension"]'::jsonb, '["Metformin 500mg PO BID","Lisinopril 10mg PO OD"]'::jsonb, v_doc1, 'PhilHealth', 'PH-12-889104-01'),
    (v_pat[2], 'MRN-2026-002', 'Liam Gabriel Torres', CURRENT_DATE - INTERVAL '33 years 7 days', 33, 'Male', 'O+', '+63 918 871 3342', 'liam.torres@smartclinic.ph', '1204 Pine St, Apt 3B, Makati City', '{"name":"Hannah Torres","phone":"+63 918 871 9921","relationship":"Sister"}'::jsonb, '[{"allergen":"Aspirin","severity":"moderate"}]'::jsonb, '["Bronchial Asthma"]'::jsonb, '["Salbutamol 100mcg MDI PRN"]'::jsonb, v_doc3, 'Maxicare', 'MX-8890123-01'),
    (v_pat[3], 'MRN-2026-003', 'Corazon Aquino De Castro', CURRENT_DATE - INTERVAL '61 years 14 days', 61, 'Female', 'B+', '+63 920 445 1290', 'corazon.decastro@smartclinic.ph', '58 Katipunan Ave, Quezon City', '{"name":"Manuel De Castro","phone":"+63 920 445 8811","relationship":"Son"}'::jsonb, '[]'::jsonb, '["Stage 2 Hypertension","Osteoarthritis"]'::jsonb, '["Amlodipine 10mg OD","Celecoxib 200mg PRN"]'::jsonb, v_doc1, 'PhilHealth', 'PH-01-332910-09'),
    (v_pat[4], 'MRN-2026-004', 'Mateo Rafael Hernandez', CURRENT_DATE - INTERVAL '6 years 21 days', 6, 'Male', 'O+', '+63 927 889 0041', 'mateo.hernandez@smartclinic.ph', '88 Emerald Ave, Ortigas Center, Pasig City', '{"name":"Carmela Hernandez","phone":"+63 927 889 0041","relationship":"Mother"}'::jsonb, '[]'::jsonb, '["Allergic Rhinitis"]'::jsonb, '["Cetirizine 5mg/5mL syrup OD"]'::jsonb, v_doc2, 'Medicard', 'MC-441290-00'),
    (v_pat[5], 'MRN-2026-005', 'Sofia Isabella Morales', CURRENT_DATE - INTERVAL '30 years 28 days', 30, 'Female', 'AB+', '+63 917 662 9013', 'sofia.morales@smartclinic.ph', '24 Bonifacio High St, Taguig City', '{"name":"Enrique Morales","phone":"+63 917 662 9014","relationship":"Spouse"}'::jsonb, '[{"allergen":"Sulfa Drugs","severity":"moderate"}]'::jsonb, '["Gestational Week 24 Routine"]'::jsonb, '["Prenatal Multivitamins","Ferrous Sulfate"]'::jsonb, v_doc4, 'Intellicare', 'IC-778102-11'),
    (v_pat[6], 'MRN-2026-006', 'Benjamin Andres Lim', CURRENT_DATE - INTERVAL '40 years 35 days', 40, 'Male', 'O-', '+63 919 441 7800', 'benjamin.lim@smartclinic.ph', '312 Taft Ave, Ermita, Manila', '{"name":"Grace Lim","phone":"+63 919 441 7801","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Lumbar Disc Herniation"]'::jsonb, '["Paracetamol 500mg TID PRN"]'::jsonb, v_doc5, 'PhilHealth', 'PH-14-990142-05'),
    (v_pat[7], 'MRN-2026-007', 'Carmen Beatriz Navarro', CURRENT_DATE - INTERVAL '54 years 42 days', 54, 'Female', 'A-', '+63 922 819 4430', 'carmen.navarro@smartclinic.ph', '15 West Ave, Quezon City', '{"name":"Ricardo Navarro","phone":"+63 922 819 4431","relationship":"Brother"}'::jsonb, '[{"allergen":"Ibuprofen","severity":"mild"}]'::jsonb, '["Hypercholesterolemia"]'::jsonb, '["Atorvastatin 20mg Tab QHS"]'::jsonb, v_doc1, 'PhilHealth', 'PH-18-440192-02'),
    (v_pat[8], 'MRN-2026-008', 'Danielle Joshua Pascual', CURRENT_DATE - INTERVAL '25 years 49 days', 25, 'Male', 'B-', '+63 908 771 9021', 'danielle.pascual@smartclinic.ph', '42 España Blvd, Sampaloc, Manila', '{"name":"Marites Pascual","phone":"+63 908 771 9022","relationship":"Mother"}'::jsonb, '[]'::jsonb, '["Right Knee Anterior Cruciate Ligament Sprain"]'::jsonb, '["Ibuprofen 400mg PO TID PC"]'::jsonb, v_doc5, 'PhilHealth', 'PH-22-110482-00'),
    (v_pat[9], 'MRN-2026-009', 'Teresa Maria Espino', CURRENT_DATE - INTERVAL '36 years 56 days', 36, 'Female', 'O+', '+63 917 334 1180', 'teresa.espino@smartclinic.ph', '77 Shaw Blvd, Mandaluyong City', '{"name":"Carlos Espino","phone":"+63 917 334 1181","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Polycystic Ovarian Syndrome (PCOS)"]'::jsonb, '["Metformin 500mg OD"]'::jsonb, v_doc4, 'CareHealth Plus', 'CH-551982-14'),
    (v_pat[10], 'MRN-2026-010', 'Gabriel Antonio Salazar', CURRENT_DATE - INTERVAL '46 years 63 days', 46, 'Male', 'A+', '+63 918 550 4912', 'gabriel.salazar@smartclinic.ph', '19 Rizal Ave, San Fernando, Pampanga', '{"name":"Lourdes Salazar","phone":"+63 918 550 4913","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Gastroesophageal Reflux Disease (GERD)"]'::jsonb, '["Omeprazole 20mg Tab AC"]'::jsonb, v_doc3, 'PhilHealth', 'PH-03-772910-08'),
    (v_pat[11], 'MRN-2026-011', 'Rosalina Trinidad Reyes', CURRENT_DATE - INTERVAL '66 years 70 days', 66, 'Female', 'O+', '+63 920 661 8834', 'rosalina.reyes@smartclinic.ph', '63 JP Laurel St, Davao City', '{"name":"Felipe Reyes","phone":"+63 920 661 8835","relationship":"Son"}'::jsonb, '[{"allergen":"Seafood","severity":"moderate"}]'::jsonb, '["Hypertension","Chronic Kidney Disease Stage 2"]'::jsonb, '["Losartan 50mg Tab OD"]'::jsonb, v_doc1, 'PhilHealth', 'PH-11-209481-01'),
    (v_pat[12], 'MRN-2026-012', 'Joaquin Lorenzo De Leon', CURRENT_DATE - INTERVAL '8 years 77 days', 8, 'Male', 'B+', '+63 915 220 9140', 'joaquin.deleon@smartclinic.ph', '110 Gorordo Ave, Cebu City', '{"name":"Rhea De Leon","phone":"+63 915 220 9140","relationship":"Mother"}'::jsonb, '[]'::jsonb, '["Pediatric Bronchitis"]'::jsonb, '["Amoxicillin/Clavulanate 250mg/5mL"]'::jsonb, v_doc2, 'Maxicare', 'MX-119280-44'),
    (v_pat[13], 'MRN-2026-013', 'Angelina Grace Tan', CURRENT_DATE - INTERVAL '31 years 84 days', 31, 'Female', 'AB-', '+63 927 441 0299', 'angelina.tan@smartclinic.ph', '801 Annapolis St, Greenhills, San Juan City', '{"name":"Albert Tan","phone":"+63 927 441 0298","relationship":"Father"}'::jsonb, '[]'::jsonb, '["Primary Dysmenorrhea"]'::jsonb, '["Mefenamic Acid 500mg TID PRN"]'::jsonb, v_doc4, 'PhilHealth', 'PH-07-662910-03'),
    (v_pat[14], 'MRN-2026-014', 'Fernando Emilio Ramos', CURRENT_DATE - INTERVAL '51 years 91 days', 51, 'Male', 'O+', '+63 917 882 3144', 'fernando.ramos@smartclinic.ph', '204 Alabang-Zapote Rd, Muntinlupa City', '{"name":"Cecilia Ramos","phone":"+63 917 882 3145","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Hyperuricemia & Gouty Arthritis"]'::jsonb, '["Allopurinol 100mg Tab OD"]'::jsonb, v_doc1, 'PhilHealth', 'PH-13-882019-11'),
    (v_pat[15], 'MRN-2026-015', 'Clarissa Joy Fernandez', CURRENT_DATE - INTERVAL '22 years 98 days', 22, 'Female', 'A+', '+63 916 550 1204', 'clarissa.fernandez@smartclinic.ph', '54 Aurora Blvd, Quezon City', '{"name":"Lilian Fernandez","phone":"+63 916 550 1205","relationship":"Mother"}'::jsonb, '[]'::jsonb, '["Acute Viral Upper Respiratory Infection"]'::jsonb, '["Paracetamol 500mg Q4H PRN"]'::jsonb, v_doc3, 'PhilHealth', 'PH-08-331902-04'),
    (v_pat[16], 'MRN-2026-016', 'Rodrigo Alfonso Gutierrez', CURRENT_DATE - INTERVAL '57 years 105 days', 57, 'Male', 'B+', '+63 920 771 4902', 'rodrigo.gutierrez@smartclinic.ph', '92 MacArthur Hwy, Valenzuela City', '{"name":"Nenita Gutierrez","phone":"+63 920 771 4903","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Type 2 Diabetes","Coronary Artery Disease"]'::jsonb, '["Glimepiride 2mg OD","Aspirin 80mg OD"]'::jsonb, v_doc1, 'PhilHealth', 'PH-05-992014-06'),
    (v_pat[17], 'MRN-2026-017', 'Victoria Alessandra Co', CURRENT_DATE - INTERVAL '26 years 112 days', 26, 'Female', 'O+', '+63 918 332 7701', 'victoria.co@smartclinic.ph', '180 Pioneer St, Mandaluyong City', '{"name":"Wilson Co","phone":"+63 918 332 7702","relationship":"Father"}'::jsonb, '[{"allergen":"Cephalosporins","severity":"severe"}]'::jsonb, '["Migraine without Aura"]'::jsonb, '["Sumatriptan 50mg PRN"]'::jsonb, v_doc3, 'Medicard', 'MC-992104-20'),
    (v_pat[18], 'MRN-2026-018', 'Nathaniel James Macaraeg', CURRENT_DATE - INTERVAL '14 years 119 days', 14, 'Male', 'A-', '+63 927 661 0399', 'nathaniel.macaraeg@smartclinic.ph', '34 Timog Ave, Quezon City', '{"name":"Arlene Macaraeg","phone":"+63 927 661 0399","relationship":"Mother"}'::jsonb, '[]'::jsonb, '["Pediatric Asthma Exacerbation"]'::jsonb, '["Budesonide/Formoterol Turbuhaler"]'::jsonb, v_doc2, 'PhilHealth', 'PH-09-440192-07'),
    (v_pat[19], 'MRN-2026-019', 'Maria Lourdes Villarama', CURRENT_DATE - INTERVAL '43 years 126 days', 43, 'Female', 'O+', '+63 917 990 4421', 'lourdes.villarama@smartclinic.ph', '140 C-5 Road, Pasig City', '{"name":"Jose Villarama","phone":"+63 917 990 4422","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Hypothyroidism"]'::jsonb, '["Levothyroxine 50mcg OD AC"]'::jsonb, v_doc3, 'PhilHealth', 'PH-14-220194-09'),
    (v_pat[20], 'MRN-2026-020', 'Dominic Emmanuel Sy', CURRENT_DATE - INTERVAL '37 years 133 days', 37, 'Male', 'B+', '+63 905 112 8840', 'dominic.sy@smartclinic.ph', '210 Binondo St, Manila', '{"name":"Sheryl Sy","phone":"+63 905 112 8841","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Fatty Liver Disease (NAFLD)"]'::jsonb, '["Vitamin E 400IU OD"]'::jsonb, v_doc1, 'PhilHealth', 'PH-01-550192-08'),
    (v_pat[21], 'MRN-2026-021', 'Patricia Nicole Manalo', CURRENT_DATE - INTERVAL '31 years 140 days', 31, 'Female', 'A+', '+63 922 334 0011', 'patricia.manalo@smartclinic.ph', '68 Chino Roces Ave, Makati City', '{"name":"Gerardo Manalo","phone":"+63 922 334 0012","relationship":"Father"}'::jsonb, '[]'::jsonb, '["Iron Deficiency Anemia"]'::jsonb, '["Ferrous Sulfate 325mg OD"]'::jsonb, v_doc4, 'Intellicare', 'IC-331092-77'),
    (v_pat[22], 'MRN-2026-022', 'Emilio Jose Villanueva', CURRENT_DATE - INTERVAL '64 years 147 days', 64, 'Male', 'O-', '+63 918 440 2933', 'emilio.villanueva@smartclinic.ph', '19 Quezon Ave, Lucena City, Quezon', '{"name":"Corina Villanueva","phone":"+63 918 440 2934","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Benign Prostatic Hyperplasia (BPH)"]'::jsonb, '["Tamsulosin 0.4mg Tab QHS"]'::jsonb, v_doc3, 'PhilHealth', 'PH-04-881920-00'),
    (v_pat[23], 'MRN-2026-023', 'Aurora Celina Dizon', CURRENT_DATE - INTERVAL '49 years 154 days', 49, 'Female', 'AB+', '+63 917 119 4488', 'aurora.dizon@smartclinic.ph', '302 Northpoint, Bajada, Davao City', '{"name":"Manuel Dizon","phone":"+63 917 119 4489","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Tension Headache"]'::jsonb, '["Paracetamol 500mg PRN"]'::jsonb, v_doc3, 'PhilHealth', 'PH-11-990142-02'),
    (v_pat[24], 'MRN-2026-024', 'Kenneth Paul Valenzuela', CURRENT_DATE - INTERVAL '35 years 161 days', 35, 'Male', 'B-', '+63 908 661 2290', 'kenneth.valenzuela@smartclinic.ph', '75 Commonwealth Ave, Quezon City', '{"name":"Monina Valenzuela","phone":"+63 908 661 2291","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Right Ankle Grade 1 Inversion Sprain"]'::jsonb, '["Mefenamic Acid 500mg TID PC"]'::jsonb, v_doc5, 'PhilHealth', 'PH-09-551094-14'),
    (v_pat[25], 'MRN-2026-025', 'Maribel Luz Legaspi', CURRENT_DATE - INTERVAL '43 years 168 days', 43, 'Female', 'O+', '+63 920 889 1102', 'maribel.legaspi@smartclinic.ph', '118 San Pedro St, Davao City', '{"name":"Ramon Legaspi","phone":"+63 920 889 1103","relationship":"Brother"}'::jsonb, '[]'::jsonb, '["Acute Bronchitis"]'::jsonb, '["Co-Amoxiclav 625mg PO BID"]'::jsonb, v_doc3, 'PhilHealth', 'PH-11-330192-05'),
    (v_pat[26], 'MRN-2026-026', 'Jaime Miguel Tolentino', CURRENT_DATE - INTERVAL '20 years 175 days', 20, 'Male', 'A+', '+63 915 771 9044', 'jaime.tolentino@smartclinic.ph', '82 Katipunan Rd, Loyola Heights, Quezon City', '{"name":"Maricel Tolentino","phone":"+63 915 771 9045","relationship":"Mother"}'::jsonb, '[]'::jsonb, '["Viral Pharyngitis"]'::jsonb, '["Lozenges PRN","Paracetamol 500mg PRN"]'::jsonb, v_doc3, 'PhilHealth', 'PH-06-771920-01'),
    (v_pat[27], 'MRN-2026-027', 'Jacqueline Andrea Roxas', CURRENT_DATE - INTERVAL '27 years 182 days', 27, 'Female', 'O+', '+63 927 330 1988', 'jacqueline.roxas@smartclinic.ph', '14 Jupiter St, Bel-Air, Makati City', '{"name":"Danilo Roxas","phone":"+63 927 330 1989","relationship":"Father"}'::jsonb, '[]'::jsonb, '["Uncomplicated Urinary Tract Infection"]'::jsonb, '["Ciprofloxacin 500mg PO BID x 7d"]'::jsonb, v_doc4, 'Maxicare', 'MX-661094-08'),
    (v_pat[28], 'MRN-2026-028', 'Gregorio Salvador Cruz', CURRENT_DATE - INTERVAL '73 years 189 days', 73, 'Male', 'B+', '+63 917 440 9182', 'gregorio.cruz@smartclinic.ph', '201 Quirino Ave, Parañaque City', '{"name":"Lourdes Cruz","phone":"+63 917 440 9183","relationship":"Daughter"}'::jsonb, '[]'::jsonb, '["Essential Hypertension","Bilateral Knee Osteoarthritis"]'::jsonb, '["Losartan 50mg Tab OD","Paracetamol 500mg PRN"]'::jsonb, v_doc1, 'PhilHealth', 'PH-16-440192-09'),
    (v_pat[29], 'MRN-2026-029', 'Stephanie Anne Panganiban', CURRENT_DATE - INTERVAL '32 years 196 days', 32, 'Female', 'A-', '+63 919 220 8411', 'stephanie.panganiban@smartclinic.ph', '49 Ortigas Ave, Greenhills, San Juan City', '{"name":"Mark Panganiban","phone":"+63 919 220 8412","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Chronic Allergic Rhinitis"]'::jsonb, '["Fluticasone Propionate Nasal Spray OD"]'::jsonb, v_doc3, 'PhilHealth', 'PH-07-881920-14'),
    (v_pat[30], 'MRN-2026-030', 'Cesar Augusto Montelibano', CURRENT_DATE - INTERVAL '46 years 203 days', 46, 'Male', 'O+', '+63 908 991 3302', 'cesar.montelibano@smartclinic.ph', '37 Real St, Bacolod City, Negros Occidental', '{"name":"Rowena Montelibano","phone":"+63 908 991 3303","relationship":"Spouse"}'::jsonb, '[]'::jsonb, '["Chronic Low Back Pain"]'::jsonb, '["Tramadol/Paracetamol 37.5mg/325mg PRN"]'::jsonb, v_doc5, 'PhilHealth', 'PH-17-220194-03');

    -- [C] Insert 50 Appointments (28 Completed, 22 Scheduled/Confirmed - Dynamic Dates)
    INSERT INTO public.appointments (id, patient_id, patient_name, patient_mrn, doctor_id, doctor_name, department, appointment_date, appointment_time, reason, status, type, queue_number, room) VALUES
    (v_appt[1], v_pat[1], 'Elena Maria Vargas', 'MRN-2026-001', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '28 days', '09:00 AM', 'Diabetes Mellitus & Hypertension Routine Review', 'Completed', 'In-Person', 'A-01', 'Room 201'),
    (v_appt[2], v_pat[2], 'Liam Gabriel Torres', 'MRN-2026-002', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '27 days', '09:30 AM', 'Asthma Follow-up & Medication Refill', 'Completed', 'In-Person', 'A-02', 'Room 105'),
    (v_appt[3], v_pat[3], 'Corazon Aquino De Castro', 'MRN-2026-003', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '26 days', '10:00 AM', 'Hypertension Blood Pressure Assessment', 'Completed', 'In-Person', 'A-03', 'Room 201'),
    (v_appt[4], v_pat[4], 'Mateo Rafael Hernandez', 'MRN-2026-004', v_doc2, 'Dr. Maria Cristina Mendoza', 'Pediatrics', CURRENT_DATE - INTERVAL '25 days', '08:30 AM', 'Pediatric Allergic Rhinitis & Growth Assessment', 'Completed', 'In-Person', 'B-01', 'Room 102'),
    (v_appt[5], v_pat[5], 'Sofia Isabella Morales', 'MRN-2026-005', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE - INTERVAL '24 days', '09:00 AM', '2nd Trimester Prenatal Ultrasound Review', 'Completed', 'In-Person', 'B-02', 'Room 304'),
    (v_appt[6], v_pat[6], 'Benjamin Andres Lim', 'MRN-2026-006', v_doc5, 'Dr. Antonio Miguel Villanueva', 'Orthopedics', CURRENT_DATE - INTERVAL '23 days', '10:00 AM', 'Lower Back Pain Evaluation & Physical Therapy Plan', 'Completed', 'In-Person', 'B-03', 'Room 210'),
    (v_appt[7], v_pat[7], 'Carmen Beatriz Navarro', 'MRN-2026-007', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '22 days', '09:00 AM', 'Lipid Panel Follow-up & Statin Titration', 'Completed', 'In-Person', 'C-01', 'Room 201'),
    (v_appt[8], v_pat[8], 'Danielle Joshua Pascual', 'MRN-2026-008', v_doc5, 'Dr. Antonio Miguel Villanueva', 'Orthopedics', CURRENT_DATE - INTERVAL '21 days', '10:30 AM', 'Right Knee Basketball Injury Examination', 'Completed', 'In-Person', 'C-02', 'Room 210'),
    (v_appt[9], v_pat[9], 'Teresa Maria Espino', 'MRN-2026-009', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE - INTERVAL '20 days', '11:00 AM', 'PCOS Management & Hormonal Follow-up', 'Completed', 'In-Person', 'D-01', 'Room 304'),
    (v_appt[10], v_pat[10], 'Gabriel Antonio Salazar', 'MRN-2026-010', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '19 days', '01:30 PM', 'Epigastric Pain & Heartburn Evaluation', 'Completed', 'In-Person', 'D-02', 'Room 105'),
    (v_appt[11], v_pat[11], 'Rosalina Trinidad Reyes', 'MRN-2026-011', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '18 days', '09:00 AM', 'Renal Function & Blood Pressure Monitoring', 'Completed', 'In-Person', 'E-01', 'Room 201'),
    (v_appt[12], v_pat[12], 'Joaquin Lorenzo De Leon', 'MRN-2026-012', v_doc2, 'Dr. Maria Cristina Mendoza', 'Pediatrics', CURRENT_DATE - INTERVAL '17 days', '10:00 AM', 'Pediatric Productive Cough & Low-grade Fever', 'Completed', 'In-Person', 'E-02', 'Room 102'),
    (v_appt[13], v_pat[13], 'Angelina Grace Tan', 'MRN-2026-013', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE - INTERVAL '16 days', '09:30 AM', 'Severe Menstrual Cramping & Pelvic Exam', 'Completed', 'In-Person', 'F-01', 'Room 304'),
    (v_appt[14], v_pat[14], 'Fernando Emilio Ramos', 'MRN-2026-014', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '15 days', '11:00 AM', 'Right Big Toe Pain & Uric Acid Check', 'Completed', 'In-Person', 'F-02', 'Room 201'),
    (v_appt[15], v_pat[15], 'Clarissa Joy Fernandez', 'MRN-2026-015', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '14 days', '08:30 AM', 'Sore Throat, Nasal Congestion & Headache', 'Completed', 'In-Person', 'G-01', 'Room 105'),
    (v_appt[16], v_pat[16], 'Rodrigo Alfonso Gutierrez', 'MRN-2026-016', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '13 days', '10:00 AM', 'Cardiac Follow-up & Fasting Blood Sugar', 'Completed', 'In-Person', 'G-02', 'Room 201'),
    (v_appt[17], v_pat[17], 'Victoria Alessandra Co', 'MRN-2026-017', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '12 days', '09:00 AM', 'Unilateral Throbbing Headache with Photophobia', 'Completed', 'In-Person', 'H-01', 'Room 105'),
    (v_appt[18], v_pat[18], 'Nathaniel James Macaraeg', 'MRN-2026-018', v_doc2, 'Dr. Maria Cristina Mendoza', 'Pediatrics', CURRENT_DATE - INTERVAL '11 days', '10:30 AM', 'Nocturnal Cough & Wheezing Assessment', 'Completed', 'In-Person', 'H-02', 'Room 102'),
    (v_appt[19], v_pat[19], 'Maria Lourdes Villarama', 'MRN-2026-019', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '10 days', '09:00 AM', 'Thyroid Function TSH Check & Fatigue Review', 'Completed', 'In-Person', 'I-01', 'Room 105'),
    (v_appt[20], v_pat[20], 'Dominic Emmanuel Sy', 'MRN-2026-020', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '9 days', '10:30 AM', 'Liver Ultrasound Results & Dietary Counseling', 'Completed', 'In-Person', 'I-02', 'Room 201'),
    (v_appt[21], v_pat[21], 'Patricia Nicole Manalo', 'MRN-2026-021', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE - INTERVAL '8 days', '08:30 AM', 'General Dizziness, Pallor & CBC Evaluation', 'Completed', 'In-Person', 'J-01', 'Room 304'),
    (v_appt[22], v_pat[22], 'Emilio Jose Villanueva', 'MRN-2026-022', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '7 days', '10:00 AM', 'Nocturia & Urinary Flow Difficulty', 'Completed', 'In-Person', 'J-02', 'Room 105'),
    (v_appt[23], v_pat[23], 'Aurora Celina Dizon', 'MRN-2026-023', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '6 days', '09:00 AM', 'Occipital Neck Tension & Stress Headache', 'Completed', 'In-Person', 'K-01', 'Room 105'),
    (v_appt[24], v_pat[24], 'Kenneth Paul Valenzuela', 'MRN-2026-024', v_doc5, 'Dr. Antonio Miguel Villanueva', 'Orthopedics', CURRENT_DATE - INTERVAL '5 days', '10:00 AM', 'Right Lateral Malleolus Edema & Weightbearing', 'Completed', 'In-Person', 'K-02', 'Room 210'),
    (v_appt[25], v_pat[25], 'Maribel Luz Legaspi', 'MRN-2026-025', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '4 days', '09:00 AM', 'Persistent Productive Cough x 10 Days', 'Completed', 'In-Person', 'L-01', 'Room 105'),
    (v_appt[26], v_pat[26], 'Jaime Miguel Tolentino', 'MRN-2026-026', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE - INTERVAL '3 days', '10:30 AM', 'Odynophagia & Tonsillar Erythema', 'Completed', 'In-Person', 'L-02', 'Room 105'),
    (v_appt[27], v_pat[27], 'Jacqueline Andrea Roxas', 'MRN-2026-027', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE - INTERVAL '2 days', '09:00 AM', 'Dysuria, Urinary Urgency & Frequency', 'Completed', 'In-Person', 'M-01', 'Room 304'),
    (v_appt[28], v_pat[28], 'Gregorio Salvador Cruz', 'MRN-2026-028', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE - INTERVAL '1 days', '11:00 AM', 'Senior Cardiovascular & Joint Health Check', 'Completed', 'In-Person', 'M-02', 'Room 201'),
    (v_appt[29], v_pat[29], 'Stephanie Anne Panganiban', 'MRN-2026-029', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE + INTERVAL '1 days', '09:00 AM', 'Allergy Skin Flare-up & Rhinitis Follow-up', 'Confirmed', 'In-Person', 'N-01', 'Room 105'),
    (v_appt[30], v_pat[30], 'Cesar Augusto Montelibano', 'MRN-2026-030', v_doc5, 'Dr. Antonio Miguel Villanueva', 'Orthopedics', CURRENT_DATE + INTERVAL '2 days', '10:00 AM', 'Lumbar MRI Review & Physical Therapy Renewal', 'Confirmed', 'In-Person', 'N-02', 'Room 210'),
    (v_appt[31], v_pat[1], 'Elena Maria Vargas', 'MRN-2026-001', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE + INTERVAL '3 days', '09:00 AM', 'HbA1c & Fasting Glucose 3-Month Follow-up', 'Scheduled', 'In-Person', 'O-01', 'Room 201'),
    (v_appt[32], v_pat[5], 'Sofia Isabella Morales', 'MRN-2026-005', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE + INTERVAL '4 days', '10:30 AM', 'Gestational Diabetes OGTT Screening', 'Confirmed', 'In-Person', 'O-02', 'Room 304'),
    (v_appt[33], v_pat[4], 'Mateo Rafael Hernandez', 'MRN-2026-004', v_doc2, 'Dr. Maria Cristina Mendoza', 'Pediatrics', CURRENT_DATE + INTERVAL '5 days', '09:00 AM', 'Routine Booster Vaccine Administration', 'Scheduled', 'In-Person', 'P-01', 'Room 102'),
    (v_appt[34], v_pat[8], 'Danielle Joshua Pascual', 'MRN-2026-008', v_doc5, 'Dr. Antonio Miguel Villanueva', 'Orthopedics', CURRENT_DATE + INTERVAL '6 days', '11:00 AM', 'Knee Functional Rehab Clearance', 'Confirmed', 'In-Person', 'P-02', 'Room 210'),
    (v_appt[35], v_pat[11], 'Rosalina Trinidad Reyes', 'MRN-2026-011', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE + INTERVAL '7 days', '09:00 AM', 'Routine Senior Hypertension BP Evaluation', 'Scheduled', 'In-Person', 'Q-01', 'Room 201'),
    (v_appt[36], v_pat[13], 'Angelina Grace Tan', 'MRN-2026-013', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE + INTERVAL '8 days', '10:00 AM', 'Pelvic Ultrasound Result Consultation', 'Confirmed', 'In-Person', 'Q-02', 'Room 304'),
    (v_appt[37], v_pat[14], 'Fernando Emilio Ramos', 'MRN-2026-014', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE + INTERVAL '9 days', '09:30 AM', 'Serum Uric Acid Control Evaluation', 'Scheduled', 'In-Person', 'R-01', 'Room 201'),
    (v_appt[38], v_pat[16], 'Rodrigo Alfonso Gutierrez', 'MRN-2026-016', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE + INTERVAL '10 days', '11:00 AM', '12-Lead ECG & Blood Pressure Re-check', 'Confirmed', 'In-Person', 'R-02', 'Room 201'),
    (v_appt[39], v_pat[18], 'Nathaniel James Macaraeg', 'MRN-2026-018', v_doc2, 'Dr. Maria Cristina Mendoza', 'Pediatrics', CURRENT_DATE + INTERVAL '11 days', '09:00 AM', 'Pediatric Pulmonary Peak Flow Meter Review', 'Scheduled', 'In-Person', 'S-01', 'Room 102'),
    (v_appt[40], v_pat[20], 'Dominic Emmanuel Sy', 'MRN-2026-020', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE + INTERVAL '12 days', '10:30 AM', 'Liver Enzymes SGPT/ALT Re-evaluation', 'Confirmed', 'In-Person', 'S-02', 'Room 201'),
    (v_appt[41], v_pat[21], 'Patricia Nicole Manalo', 'MRN-2026-021', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE + INTERVAL '13 days', '09:00 AM', 'Iron Therapy Repeat Hemoglobin Check', 'Confirmed', 'In-Person', 'T-01', 'Room 304'),
    (v_appt[42], v_pat[24], 'Kenneth Paul Valenzuela', 'MRN-2026-024', v_doc5, 'Dr. Antonio Miguel Villanueva', 'Orthopedics', CURRENT_DATE + INTERVAL '14 days', '10:00 AM', 'Ankle Splint Removal & Mobility Test', 'Confirmed', 'In-Person', 'T-02', 'Room 210'),
    (v_appt[43], v_pat[27], 'Jacqueline Andrea Roxas', 'MRN-2026-027', v_doc4, 'Dr. Beatrice Angela Dizon', 'Women''s Health', CURRENT_DATE + INTERVAL '15 days', '09:00 AM', 'Post-Antibiotic Repeat Urinalysis Follow-up', 'Scheduled', 'In-Person', 'U-01', 'Room 304'),
    (v_appt[44], v_pat[2], 'Liam Gabriel Torres', 'MRN-2026-002', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE + INTERVAL '16 days', '11:00 AM', 'Spring Asthma Trigger Check', 'Cancelled', 'In-Person', NULL, NULL),
    (v_appt[45], v_pat[6], 'Benjamin Andres Lim', 'MRN-2026-006', v_doc5, 'Dr. Antonio Miguel Villanueva', 'Orthopedics', CURRENT_DATE + INTERVAL '17 days', '09:00 AM', 'Lumbar Traction Session Follow-up', 'Scheduled', 'In-Person', 'V-01', 'Room 210'),
    (v_appt[46], v_pat[10], 'Gabriel Antonio Salazar', 'MRN-2026-010', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE + INTERVAL '18 days', '10:30 AM', 'GERD Dietary Symptom Log Review', 'Confirmed', 'In-Person', 'V-02', 'Room 105'),
    (v_appt[47], v_pat[15], 'Clarissa Joy Fernandez', 'MRN-2026-015', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE + INTERVAL '19 days', '08:30 AM', 'Work Medical Clearance Follow-up', 'Confirmed', 'In-Person', 'W-01', 'Room 105'),
    (v_appt[48], v_pat[22], 'Emilio Jose Villanueva', 'MRN-2026-022', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE + INTERVAL '20 days', '10:00 AM', 'Prostate Specific Antigen (PSA) Review', 'Scheduled', 'In-Person', 'W-02', 'Room 105'),
    (v_appt[49], v_pat[25], 'Maribel Luz Legaspi', 'MRN-2026-025', v_doc3, 'Dr. Jose Paolo Reyes', 'Family Medicine', CURRENT_DATE + INTERVAL '21 days', '09:00 AM', 'Chest X-Ray Resolution Check', 'Confirmed', 'In-Person', 'X-01', 'Room 105'),
    (v_appt[50], v_pat[28], 'Gregorio Salvador Cruz', 'MRN-2026-028', v_doc1, 'Dr. Ramon Jose Bautista', 'Cardiology & Internal Medicine', CURRENT_DATE + INTERVAL '22 days', '11:00 AM', 'Biannual Senior Wellness Physical', 'Scheduled', 'In-Person', 'X-02', 'Room 201');

    -- [D] Insert 28 Consultations (Dynamic Dates & Linked to Completed Appointments)
    INSERT INTO public.consultations (id, appointment_id, patient_id, doctor_id, consultation_date, chief_complaint, history_of_present_illness, physical_examination, vitals, diagnoses, treatment_plan, follow_up_date) VALUES
    (v_cons[1], v_appt[1], v_pat[1], v_doc1, CURRENT_DATE - INTERVAL '28 days', 'Routine check-up for elevated morning blood sugars and mild pedal heaviness.', 'Patient reports morning fasting glucometer readings between 140-165 mg/dL. Compliant with Metformin.', 'Anicteric sclerae, clear breath sounds, normal S1/S2 heart sounds, trace bilateral pretibial edema.', '{"bp":"134/84","hr":76,"rr":18,"temp":36.6,"weightKg":68.5,"bmi":27.2}'::jsonb, '[{"code":"E11.9","description":"Type 2 Diabetes Mellitus without complications"},{"code":"I10","description":"Essential Hypertension"}]'::jsonb, 'Titrate Metformin to 850mg PO BID with meals. Continue Lisinopril 10mg OD. Order HbA1c and Lipid Panel.', CURRENT_DATE + INTERVAL '7 days'),
    (v_cons[2], v_appt[2], v_pat[2], v_doc3, CURRENT_DATE - INTERVAL '27 days', 'Cough and nocturnal tightness triggered by air conditioning.', 'Episodes of wheezing occurring 2-3 nights per week. Uses Ventolin MDI with partial temporary relief.', 'Bilateral scattered expiratory wheezes over upper lung fields. No intercostal retractions.', '{"bp":"118/76","hr":72,"rr":16,"temp":36.7,"weightKg":71.0,"bmi":23.8}'::jsonb, '[{"code":"J45.909","description":"Bronchial Asthma, mild persistent"}]'::jsonb, 'Prescribe Budesonide/Formoterol 160/4.5mcg 1 puff BID. Continue Salbutamol PRN for acute attacks.', CURRENT_DATE + INTERVAL '8 days'),
    (v_cons[3], v_appt[3], v_pat[3], v_doc1, CURRENT_DATE - INTERVAL '26 days', 'Occipital throbbing and bilateral knee stiffness upon standing.', 'History of hypertension x 12 years. Morning blood pressures ranging 145-155/90 mmHg.', 'Cardiovascular: Regular rate, no murmurs. Musculoskeletal: Crepitus on right patellofemoral joint.', '{"bp":"148/92","hr":80,"rr":18,"temp":36.5,"weightKg":64.0,"bmi":26.1}'::jsonb, '[{"code":"I10","description":"Essential Hypertension, uncontrolled"},{"code":"M17.9","description":"Osteoarthritis of knee, unspecified"}]'::jsonb, 'Shift Amlodipine to 10mg OD. Add Losartan 50mg OD. Order 12-lead ECG and Serum Creatinine.', CURRENT_DATE + INTERVAL '9 days'),
    (v_cons[4], v_appt[4], v_pat[4], v_doc2, CURRENT_DATE - INTERVAL '25 days', 'Frequent sneezing, clear rhinorrhea, and itchy eyes.', 'Symptoms worsen during morning hours and dust exposure. No fever or shortness of breath.', 'Pale, boggy nasal turbinates with clear mucoid discharge. Allergic shiners present.', '{"bp":"96/62","hr":94,"rr":20,"temp":36.8,"weightKg":21.5,"bmi":16.2}'::jsonb, '[{"code":"J30.1","description":"Allergic Rhinitis due to pollen/dust"}]'::jsonb, 'Prescribe Cetirizine 5mg/5mL syrup 5mL once daily at bedtime x 14 days. Saline nasal wash BID.', CURRENT_DATE + INTERVAL '10 days'),
    (v_cons[5], v_appt[5], v_pat[5], v_doc4, CURRENT_DATE - INTERVAL '24 days', 'Routine prenatal checkup at 24 weeks gestation.', 'Reports good fetal movements. Occasional mild round ligament discomfort. No vaginal bleeding or leaking.', 'Fundic height 24 cm. Fetal heart tones distinct at 144 bpm. No pretibial edema.', '{"bp":"112/70","hr":78,"rr":16,"temp":36.5,"weightKg":59.0,"bmi":23.1}'::jsonb, '[{"code":"Z34.82","description":"Supervision of other normal pregnancy, second trimester"}]'::jsonb, 'Continue Prenatal Multivitamins with Iron & Folic Acid. Request 75g Oral Glucose Tolerance Test (OGTT).', CURRENT_DATE + INTERVAL '11 days'),
    (v_cons[6], v_appt[6], v_pat[6], v_doc5, CURRENT_DATE - INTERVAL '23 days', 'Aching low back pain radiating to the right gluteal region after lifting boxes.', 'Pain aggravated by prolonged sitting. Denies urinary incontinence or lower extremity numbness.', 'Paraspinal muscle spasm at L4-L5 level. Straight leg raise positive on right at 60 degrees.', '{"bp":"124/80","hr":74,"rr":16,"temp":36.6,"weightKg":76.0,"bmi":25.4}'::jsonb, '[{"code":"M54.5","description":"Low Back Pain / Lumbar Radiculopathy"}]'::jsonb, 'Prescribe Celecoxib 200mg BID with meals x 7 days and Paracetamol. Recommend physical therapy evaluation.', CURRENT_DATE + INTERVAL '12 days'),
    (v_cons[7], v_appt[7], v_pat[7], v_doc1, CURRENT_DATE - INTERVAL '22 days', 'Asymptomatic follow-up for high cholesterol panel results.', 'Previous total cholesterol was 248 mg/dL with LDL of 165 mg/dL. Adhering to Mediterranean-style diet.', 'Clear breath sounds, normal heart sounds, carotid bruits absent, peripheral pulses full.', '{"bp":"126/82","hr":70,"rr":16,"temp":36.5,"weightKg":62.5,"bmi":24.6}'::jsonb, '[{"code":"E78.0","description":"Pure Hypercholesterolemia"}]'::jsonb, 'Initiate Atorvastatin 20mg Tab 1 tablet at bedtime. Re-check fasting lipid panel in 8 weeks.', CURRENT_DATE + INTERVAL '13 days'),
    (v_cons[8], v_appt[8], v_pat[8], v_doc5, CURRENT_DATE - INTERVAL '21 days', 'Right knee pain and swelling following awkward landing during basketball tournament.', 'Immediate pain with popping sensation. Managed with ice and elastic bandage.', 'Moderate effusion right knee joint. Tenderness along lateral joint line. Anterior drawer test mildly lax.', '{"bp":"120/78","hr":82,"rr":18,"temp":36.7,"weightKg":78.0,"bmi":24.2}'::jsonb, '[{"code":"S83.511A","description":"Sprain of anterior cruciate ligament of right knee"}]'::jsonb, 'Order Right Knee 2-View X-Ray and MRI. Apply compressive knee brace. Prescribe Ibuprofen 400mg TID PC.', CURRENT_DATE + INTERVAL '14 days'),
    (v_cons[9], v_appt[9], v_pat[9], v_doc4, CURRENT_DATE - INTERVAL '20 days', 'Irregular menstrual cycles (45-60 days interval) and acne breakouts.', 'Menarche at age 13. Weight gain of 5 kg over past 8 months despite baseline gym sessions.', 'Mild facial hirsutism and inflammatory papules over mandibular region. Abdomen soft, non-tender.', '{"bp":"116/74","hr":72,"rr":16,"temp":36.6,"weightKg":65.0,"bmi":26.0}'::jsonb, '[{"code":"E28.2","description":"Polycystic Ovarian Syndrome (PCOS)"}]'::jsonb, 'Start Metformin 500mg OD with evening meal. Request Transvaginal Ultrasound and Hormonal Panel.', CURRENT_DATE + INTERVAL '15 days'),
    (v_cons[10], v_appt[10], v_pat[10], v_doc3, CURRENT_DATE - INTERVAL '19 days', 'Burning retrosternal chest discomfort and sour taste in mouth after dinner.', 'Symptoms triggered by coffee, fried meals, and lying flat within 2 hours of eating.', 'Mild epigastric tenderness to deep palpation. No guarding, no rebound tenderness.', '{"bp":"122/80","hr":76,"rr":16,"temp":36.7,"weightKg":81.0,"bmi":28.0}'::jsonb, '[{"code":"K21.9","description":"Gastroesophageal Reflux Disease without esophagitis"}]'::jsonb, 'Prescribe Omeprazole 20mg Tab once daily 30 minutes before breakfast x 28 days. Elevate head of bed.', CURRENT_DATE + INTERVAL '16 days'),
    (v_cons[11], v_appt[11], v_pat[11], v_doc1, CURRENT_DATE - INTERVAL '18 days', 'Biannual chronic disease review for hypertension and mild proteinuria.', 'No shortness of breath or chest pain. Compliant with low-sodium diet and Losartan 50mg.', 'BP 132/80 mmHg seated. Fundoscopy shows Grade 1 hypertensive changes. Extremities clear.', '{"bp":"132/80","hr":68,"rr":16,"temp":36.5,"weightKg":58.0,"bmi":24.5}'::jsonb, '[{"code":"I12.9","description":"Hypertensive Chronic Kidney Disease, Stage 2"}]'::jsonb, 'Maintain Losartan 50mg OD. Order Serum Creatinine, eGFR, and Routine Urinalysis.', CURRENT_DATE + INTERVAL '17 days'),
    (v_cons[12], v_appt[12], v_pat[12], v_doc2, CURRENT_DATE - INTERVAL '17 days', 'Productive barking cough, low grade fever (38.1 C), and decreased appetite x 4 days.', 'Pediatric patient with no prior hospitalizations. No cyanosis, alert and interactive.', 'Pharynx mildly injected without exudates. Coarse rhonchi over bilateral basal fields which clear with cough.', '{"bp":"100/64","hr":102,"rr":24,"temp":38.0,"weightKg":26.0,"bmi":16.8}'::jsonb, '[{"code":"J20.9","description":"Acute Bronchitis, unspecified"}]'::jsonb, 'Prescribe Co-Amoxiclav 250mg/5mL 5mL PO TID x 7 days. Paracetamol 250mg/5mL PRN for temp >= 37.8 C.', CURRENT_DATE + INTERVAL '18 days'),
    (v_cons[13], v_appt[13], v_pat[13], v_doc4, CURRENT_DATE - INTERVAL '16 days', 'Severe cramping lower abdominal pain on Day 1 of menses.', 'Pain rating 8/10, causing absence from university classes. Accompanied by mild nausea.', 'Abdomen soft, tender over suprapubic region without peritoneal signs. Normal external genitalia.', '{"bp":"110/72","hr":76,"rr":16,"temp":36.7,"weightKg":52.0,"bmi":20.8}'::jsonb, '[{"code":"N94.4","description":"Primary Dysmenorrhea"}]'::jsonb, 'Prescribe Mefenamic Acid 500mg PO TID PC at the earliest onset of menses. Request Pelvic Ultrasound.', CURRENT_DATE + INTERVAL '19 days'),
    (v_cons[14], v_appt[14], v_pat[14], v_doc1, CURRENT_DATE - INTERVAL '15 days', 'Acute right first metatarsophalangeal joint throbbing, redness, and heat.', 'Pain awoke patient at 3:00 AM following a seafood buffet dinner. Unable to wear enclosed shoe.', 'Right 1st MTP joint markedly erythematous, warm, exquisitely tender with severe pain on active flexion.', '{"bp":"136/86","hr":84,"rr":18,"temp":37.2,"weightKg":84.0,"bmi":29.1}'::jsonb, '[{"code":"M10.071","description":"Idiopathic Gout, right ankle and foot"}]'::jsonb, 'Prescribe Colchicine 500mcg TID x 3 days, Celecoxib 200mg BID. Order Serum Uric Acid and Fasting Blood Sugar.', CURRENT_DATE + INTERVAL '20 days'),
    (v_cons[15], v_appt[15], v_pat[15], v_doc3, CURRENT_DATE - INTERVAL '14 days', 'Sore throat, watery nasal discharge, dry cough, and malaise x 2 days.', 'No dyspnea, no high fever. Colleagues in office had similar viral illnesses.', 'Erythematous posterior pharynx, no tonsillar enlargement or exudates. Submandibular nodes soft.', '{"bp":"114/74","hr":78,"rr":16,"temp":37.4,"weightKg":50.0,"bmi":20.3}'::jsonb, '[{"code":"J06.9","description":"Acute Upper Respiratory Infection, viral"}]'::jsonb, 'Supportive care: Adequate hydration, warm saline gargles, Paracetamol 500mg Q6H PRN. Issued 3-day rest cert.', CURRENT_DATE + INTERVAL '21 days'),
    (v_cons[16], v_appt[16], v_pat[16], v_doc1, CURRENT_DATE - INTERVAL '13 days', 'Cardiovascular follow-up for ischemic heart disease and glycemic control.', 'Denies exertional angina, orthopnea, or paroxysmal nocturnal dyspnea. Adheres to Glimepiride.', 'Heart sounds distinct S1/S2, regular rhythm, no rubs or gallops. Lungs clear. Peripheral pulses +2.', '{"bp":"130/82","hr":70,"rr":16,"temp":36.6,"weightKg":72.0,"bmi":25.6}'::jsonb, '[{"code":"I25.10","description":"Atherosclerotic Heart Disease of native coronary artery"},{"code":"E11.9","description":"Type 2 Diabetes Mellitus"}]'::jsonb, 'Continue Aspirin 80mg OD, Atorvastatin 40mg QHS, Glimepiride 2mg OD. Order 12-lead ECG and Fasting Glucose.', CURRENT_DATE + INTERVAL '22 days'),
    (v_cons[17], v_appt[17], v_pat[17], v_doc3, CURRENT_DATE - INTERVAL '12 days', 'Severe pulsating right-sided headache with nausea and light sensitivity x 8 hours.', 'Triggered by sleep deprivation and prolonged screen work. Dark room provides mild solace.', 'Neurological exam intact: Cranial nerves II-XII normal, no motor/sensory deficits, neck supple.', '{"bp":"118/76","hr":80,"rr":18,"temp":36.6,"weightKg":54.0,"bmi":21.1}'::jsonb, '[{"code":"G43.009","description":"Migraine without aura, not intractable"}]'::jsonb, 'Prescribe Sumatriptan 50mg Tab at onset of severe attacks. Paracetamol 500mg + Caffeine for mild prodromes.', CURRENT_DATE + INTERVAL '23 days'),
    (v_cons[18], v_appt[18], v_pat[18], v_doc2, CURRENT_DATE - INTERVAL '11 days', 'Adolescent asthma exacerbation following sports festival.', 'Dry hacking cough during sleep and exercise intolerance. Salbutamol inhaler used 4 times yesterday.', 'Chest: Symmetric expansion, bilateral musical expiratory wheezes throughout lung zones. SpO2 97% on room air.', '{"bp":"108/68","hr":86,"rr":20,"temp":36.6,"weightKg":48.0,"bmi":19.2}'::jsonb, '[{"code":"J45.41","description":"Moderate Persistent Asthma with acute exacerbation"}]'::jsonb, 'Prescribe Budesonide/Formoterol 160/4.5mcg 1 puff BID. Salbutamol MDI via spacer Q4H PRN. Peak flow logging.', CURRENT_DATE + INTERVAL '24 days'),
    (v_cons[19], v_appt[19], v_pat[19], v_doc3, CURRENT_DATE - INTERVAL '10 days', 'General fatigue, sluggishness, cold intolerance, and brittle nails.', 'Taking Levothyroxine 50mcg daily. Inquires if current dose requires adjustment.', 'Thyroid gland non-tender, non-palpable. Skin dry. Deep tendon reflexes delayed relaxation phase.', '{"bp":"122/78","hr":64,"rr":16,"temp":36.4,"weightKg":63.0,"bmi":25.2}'::jsonb, '[{"code":"E03.9","description":"Hypothyroidism, unspecified"}]'::jsonb, 'Order Serum TSH and Free T4. Maintain Levothyroxine 50mcg 30 minutes before breakfast. Re-evaluate results.', CURRENT_DATE + INTERVAL '25 days'),
    (v_cons[20], v_appt[20], v_pat[20], v_doc1, CURRENT_DATE - INTERVAL '9 days', 'Non-alcoholic fatty liver disease (NAFLD) follow-up and dietary plan.', 'Reports losing 2 kg over last 2 months with reduced carbohydrate and alcohol consumption.', 'Abdomen soft, liver edge smooth and non-tender 1 cm below right costal margin. Spleen not palpable.', '{"bp":"128/84","hr":72,"rr":16,"temp":36.6,"weightKg":83.5,"bmi":28.5}'::jsonb, '[{"code":"K76.0","description":"Fatty (change of) liver, not elsewhere classified"}]'::jsonb, 'Continue lifestyle modifications and aerobic exercise 150 mins/week. Request SGPT/ALT, SGOT/AST panel.', CURRENT_DATE + INTERVAL '26 days'),
    (v_cons[21], v_appt[21], v_pat[21], v_doc4, CURRENT_DATE - INTERVAL '8 days', 'Lightheadedness, postural dizziness, and pale palpebral conjunctiva.', 'Heavy menstrual flow past 4 cycles. No melena or hematochezia.', 'Conjunctivae pale. Systolic flow murmur Grade 1/6 over left sternal border. Pulse bounding.', '{"bp":"104/66","hr":88,"rr":18,"temp":36.6,"weightKg":49.0,"bmi":19.6}'::jsonb, '[{"code":"D50.9","description":"Iron Deficiency Anemia, unspecified"}]'::jsonb, 'Order Complete Blood Count (CBC) with Platelets and Serum Ferritin. Prescribe Ferrous Sulfate 325mg OD with Vit C.', CURRENT_DATE + INTERVAL '27 days'),
    (v_cons[22], v_appt[22], v_pat[22], v_doc3, CURRENT_DATE - INTERVAL '7 days', 'Hesitancy, weak urinary stream, and awakening 3-4 times nightly to urinate.', 'Symptoms gradually progressing over 6 months. No gross hematuria or dysuria.', 'Abdomen soft, bladder not distended. Digital rectal exam: Smooth, symmetrically enlarged prostate without nodules.', '{"bp":"134/82","hr":70,"rr":16,"temp":36.5,"weightKg":67.0,"bmi":24.9}'::jsonb, '[{"code":"N40.1","description":"Benign Prostatic Hyperplasia with lower urinary tract symptoms"}]'::jsonb, 'Prescribe Tamsulosin HCl 0.4mg Tab once daily after dinner. Order PSA (Prostate Specific Antigen) and Urinalysis.', CURRENT_DATE + INTERVAL '28 days'),
    (v_cons[23], v_appt[23], v_pat[23], v_doc3, CURRENT_DATE - INTERVAL '6 days', 'Bilateral band-like pressure headache around forehead and nape.', 'Work-related ergonomic strain and anxiety. Normal visual fields.', 'Tenderness in trapezius and sternocleidomastoid muscles. Fundoscopy unremarkable.', '{"bp":"124/78","hr":76,"rr":16,"temp":36.6,"weightKg":57.0,"bmi":22.8}'::jsonb, '[{"code":"G44.209","description":"Tension-type Headache, unspecified"}]'::jsonb, 'Prescribe Paracetamol 500mg Tab Q6H PRN. Recommend workplace desk ergonomics and muscle relaxation.', CURRENT_DATE + INTERVAL '29 days'),
    (v_cons[24], v_appt[24], v_pat[24], v_doc5, CURRENT_DATE - INTERVAL '5 days', 'Right ankle inversion injury sustained stepping off pavement edge.', 'Able to bear weight with limp. Moderate lateral swelling over anterior talofibular ligament.', 'Point tenderness over anterior talofibular ligament (ATFL). No bony tenderness over posterior lateral malleolus.', '{"bp":"126/80","hr":78,"rr":16,"temp":36.7,"weightKg":75.0,"bmi":24.5}'::jsonb, '[{"code":"S93.401A","description":"Sprain of unspecified ligament of right ankle"}]'::jsonb, 'RICE protocol (Rest, Ice, Compression, Elevation). Prescribe Mefenamic Acid 500mg TID PC x 5 days.', CURRENT_DATE + INTERVAL '30 days'),
    (v_cons[25], v_appt[25], v_pat[25], v_doc3, CURRENT_DATE - INTERVAL '4 days', 'Persistent cough producing yellowish sputum x 10 days with pleuritic chest discomfort.', 'Started as common cold, evolved into deep chest rattling. Non-smoker.', 'Lungs: Coarse crackles and expiratory rhonchi over right middle/lower zone. SpO2 96% on room air.', '{"bp":"128/82","hr":84,"rr":20,"temp":37.8,"weightKg":61.0,"bmi":25.4}'::jsonb, '[{"code":"J20.8","description":"Acute Bronchitis due to other specified organisms"}]'::jsonb, 'Prescribe Co-Amoxiclav 625mg PO BID x 7 days. Request Chest X-Ray PA View and Complete Blood Count.', CURRENT_DATE + INTERVAL '31 days'),
    (v_cons[26], v_appt[26], v_pat[26], v_doc3, CURRENT_DATE - INTERVAL '3 days', 'Painful swallowing, feverishness, and swollen neck glands x 2 days.', 'No cough or runny nose. Unable to consume solid foods comfortably.', 'Tonsils enlarged Grade 3 with follicular whitish exudates. Tender anterior cervical lymphadenopathy.', '{"bp":"116/76","hr":90,"rr":18,"temp":38.4,"weightKg":66.0,"bmi":22.3}'::jsonb, '[{"code":"J03.00","description":"Acute Streptococcal Tonsillitis"}]'::jsonb, 'Prescribe Amoxicillin 500mg PO TID x 7 days. Paracetamol 500mg Q4H PRN. Antiseptic gargle TID.', CURRENT_DATE + INTERVAL '32 days'),
    (v_cons[27], v_appt[27], v_pat[27], v_doc4, CURRENT_DATE - INTERVAL '2 days', 'Burning sensation on urination, frequent urge, and cloudy urine x 3 days.', 'Denies flank pain, high chills, or vaginal discharge. Sexually active, uses barrier methods.', 'Abdomen soft, suprapubic tenderness present on palpation. Costovertebral angle (CVA) tenderness negative.', '{"bp":"112/70","hr":76,"rr":16,"temp":37.1,"weightKg":53.0,"bmi":20.7}'::jsonb, '[{"code":"N39.0","description":"Urinary Tract Infection, site not specified"}]'::jsonb, 'Prescribe Ciprofloxacin 500mg PO BID x 7 days. Order Routine Urinalysis and Urine Culture. Push oral fluids >= 2.5L/day.', CURRENT_DATE + INTERVAL '33 days'),
    (v_cons[28], v_appt[28], v_pat[28], v_doc1, CURRENT_DATE - INTERVAL '1 days', 'Senior health screening for high blood pressure and chronic bilateral knee pain.', 'Compliant with Losartan 50mg. Ambulates with cane due to knee stiffness.', 'Cardiac: Regular rhythm, no murmurs. Joints: Bilateral knee bony enlargement with limited active flexion.', '{"bp":"138/84","hr":72,"rr":16,"temp":36.5,"weightKg":69.0,"bmi":25.3}'::jsonb, '[{"code":"I10","description":"Essential Hypertension"},{"code":"M17.0","description":"Bilateral Primary Osteoarthritis of knee"}]'::jsonb, 'Continue Losartan 50mg Tab OD. Prescribe Paracetamol 500mg PO TID PRN for knee ache. Order Routine Blood Chemistry.', CURRENT_DATE + INTERVAL '34 days');

    -- [E] Insert 28 Prescriptions (Dynamic gen_random_uuid() & Dynamic Dates)
    INSERT INTO public.prescriptions (id, consultation_id, prescription_number, patient_id, doctor_id, prescription_date, items, status, notes) VALUES
    (gen_random_uuid(), v_cons[1], 'RX-2026-0001', v_pat[1], v_doc1, CURRENT_DATE - INTERVAL '28 days', '[{"medicationName":"Metformin Hydrochloride","dosage":"850mg","frequency":"Twice Daily (BID)","duration":"30 days","quantity":60,"instructions":"Take with morning and evening meals"},{"medicationName":"Lisinopril","dosage":"10mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take in the morning"}]'::jsonb, 'Dispensed', 'Take medications consistently with food.'),
    (gen_random_uuid(), v_cons[2], 'RX-2026-0002', v_pat[2], v_doc3, CURRENT_DATE - INTERVAL '27 days', '[{"medicationName":"Budesonide/Formoterol Turbuhaler","dosage":"160/4.5mcg","frequency":"1 puff BID","duration":"30 days","quantity":1,"instructions":"Rinse mouth with water after inhalation"},{"medicationName":"Salbutamol Inhaler","dosage":"100mcg","frequency":"2 puffs PRN","duration":"30 days","quantity":1,"instructions":"Use for acute shortness of breath"}]'::jsonb, 'Dispensed', 'Rinse mouth after steroid inhaler to prevent oral thrush.'),
    (gen_random_uuid(), v_cons[3], 'RX-2026-0003', v_pat[3], v_doc1, CURRENT_DATE - INTERVAL '26 days', '[{"medicationName":"Amlodipine Besylate","dosage":"10mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take once daily in the morning"},{"medicationName":"Losartan Potassium","dosage":"50mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take once daily"}]'::jsonb, 'Dispensed', 'Monitor BP twice weekly in morning.'),
    (gen_random_uuid(), v_cons[4], 'RX-2026-0004', v_pat[4], v_doc2, CURRENT_DATE - INTERVAL '25 days', '[{"medicationName":"Cetirizine Dihydrochloride Syrup","dosage":"5mg/5mL","frequency":"5mL Once Daily at bedtime","duration":"14 days","quantity":1,"instructions":"Take at bedtime to avoid daytime sleepiness"}]'::jsonb, 'Dispensed', 'Shake syrup bottle well before pouring.'),
    (gen_random_uuid(), v_cons[5], 'RX-2026-0005', v_pat[5], v_doc4, CURRENT_DATE - INTERVAL '24 days', '[{"medicationName":"Prenatal Vitamins + Iron + Folic Acid","dosage":"1 capsule","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take after lunch with water"}]'::jsonb, 'Dispensed', 'Routine prenatal micronutrient replenishment.'),
    (gen_random_uuid(), v_cons[6], 'RX-2026-0006', v_pat[6], v_doc5, CURRENT_DATE - INTERVAL '23 days', '[{"medicationName":"Celecoxib","dosage":"200mg","frequency":"Twice Daily (BID)","duration":"7 days","quantity":14,"instructions":"Take after meals. Discontinue if gastrointestinal upset occurs"}]'::jsonb, 'Dispensed', 'Take strictly after meals.'),
    (gen_random_uuid(), v_cons[7], 'RX-2026-0007', v_pat[7], v_doc1, CURRENT_DATE - INTERVAL '22 days', '[{"medicationName":"Atorvastatin Calcium","dosage":"20mg","frequency":"Once Daily at bedtime (QHS)","duration":"30 days","quantity":30,"instructions":"Take at bedtime"}]'::jsonb, 'Dispensed', 'Maintain low-fat diet alongside statin.'),
    (gen_random_uuid(), v_cons[8], 'RX-2026-0008', v_pat[8], v_doc5, CURRENT_DATE - INTERVAL '21 days', '[{"medicationName":"Ibuprofen","dosage":"400mg","frequency":"Three Times Daily (TID)","duration":"5 days","quantity":15,"instructions":"Take immediately after meals with plenty of water"}]'::jsonb, 'Dispensed', 'Avoid high impact exercises on injured knee.'),
    (gen_random_uuid(), v_cons[9], 'RX-2026-0009', v_pat[9], v_doc4, CURRENT_DATE - INTERVAL '20 days', '[{"medicationName":"Metformin Hydrochloride","dosage":"500mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take with evening meal"}]'::jsonb, 'Dispensed', 'Assists with insulin sensitivity in PCOS.'),
    (gen_random_uuid(), v_cons[10], 'RX-2026-0010', v_pat[10], v_doc3, CURRENT_DATE - INTERVAL '19 days', '[{"medicationName":"Omeprazole","dosage":"20mg","frequency":"Once Daily (OD)","duration":"28 days","quantity":28,"instructions":"Take 30 minutes before breakfast"}]'::jsonb, 'Dispensed', 'Swallow capsule whole. Do not crush.'),
    (gen_random_uuid(), v_cons[11], 'RX-2026-0011', v_pat[11], v_doc1, CURRENT_DATE - INTERVAL '18 days', '[{"medicationName":"Losartan Potassium","dosage":"50mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take every morning"}]'::jsonb, 'Dispensed', 'Provides renal protection in hypertensive nephrosclerosis.'),
    (gen_random_uuid(), v_cons[12], 'RX-2026-0012', v_pat[12], v_doc2, CURRENT_DATE - INTERVAL '17 days', '[{"medicationName":"Co-Amoxiclav Suspension","dosage":"250mg/5mL","frequency":"5mL TID","duration":"7 days","quantity":1,"instructions":"Refrigerate after reconstitution. Finish all 7 days"},{"medicationName":"Paracetamol Syrup","dosage":"250mg/5mL","frequency":"5mL Q4H PRN","duration":"5 days","quantity":1,"instructions":"Give for fever >= 37.8 C"}]'::jsonb, 'Dispensed', 'Finish entire antibiotic course.'),
    (gen_random_uuid(), v_cons[13], 'RX-2026-0013', v_pat[13], v_doc4, CURRENT_DATE - INTERVAL '16 days', '[{"medicationName":"Mefenamic Acid","dosage":"500mg","frequency":"Three Times Daily (TID)","duration":"3 days","quantity":9,"instructions":"Take strictly after food during painful menstruation"}]'::jsonb, 'Dispensed', 'Take with food or milk to prevent gastric irritation.'),
    (gen_random_uuid(), v_cons[14], 'RX-2026-0014', v_pat[14], v_doc1, CURRENT_DATE - INTERVAL '15 days', '[{"medicationName":"Colchicine","dosage":"500mcg","frequency":"TID on Day 1, BID on Day 2-3","duration":"3 days","quantity":7,"instructions":"Take as instructed for acute flare"},{"medicationName":"Celecoxib","dosage":"200mg","frequency":"Once Daily (OD)","duration":"5 days","quantity":5,"instructions":"Take after food"}]'::jsonb, 'Dispensed', 'Avoid purine-rich organs and alcoholic drinks.'),
    (gen_random_uuid(), v_cons[15], 'RX-2026-0015', v_pat[15], v_doc3, CURRENT_DATE - INTERVAL '14 days', '[{"medicationName":"Paracetamol","dosage":"500mg","frequency":"Every 6 hours PRN","duration":"5 days","quantity":15,"instructions":"Take for headache or fever >= 37.8 C"}]'::jsonb, 'Dispensed', 'Rest and hydration.'),
    (gen_random_uuid(), v_cons[16], 'RX-2026-0016', v_pat[16], v_doc1, CURRENT_DATE - INTERVAL '13 days', '[{"medicationName":"Aspirin Low-Dose","dosage":"80mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take after breakfast"},{"medicationName":"Atorvastatin","dosage":"40mg","frequency":"Once Daily at bedtime (QHS)","duration":"30 days","quantity":30,"instructions":"Take at bedtime"}]'::jsonb, 'Dispensed', 'Cardiovascular secondary prevention regimen.'),
    (gen_random_uuid(), v_cons[17], 'RX-2026-0017', v_pat[17], v_doc3, CURRENT_DATE - INTERVAL '12 days', '[{"medicationName":"Sumatriptan Succinate","dosage":"50mg","frequency":"1 tablet at onset of migraine","duration":"10 days","quantity":4,"instructions":"May repeat once after 2 hours if headache recurs. Maximum 100mg in 24 hours"}]'::jsonb, 'Active', 'Do not exceed maximum daily limits.'),
    (gen_random_uuid(), v_cons[18], 'RX-2026-0018', v_pat[18], v_doc2, CURRENT_DATE - INTERVAL '11 days', '[{"medicationName":"Budesonide/Formoterol Turbuhaler","dosage":"160/4.5mcg","frequency":"1 puff Twice Daily (BID)","duration":"30 days","quantity":1,"instructions":"Inhale morning and evening. Rinse mouth"}]'::jsonb, 'Active', 'Spacer device recommended for optimal airway delivery.'),
    (gen_random_uuid(), v_cons[19], 'RX-2026-0019', v_pat[19], v_doc3, CURRENT_DATE - INTERVAL '10 days', '[{"medicationName":"Levothyroxine Sodium","dosage":"50mcg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take with plain water 30-60 mins before breakfast"}]'::jsonb, 'Dispensed', 'Do not take with calcium or iron supplements.'),
    (gen_random_uuid(), v_cons[20], 'RX-2026-0020', v_pat[20], v_doc1, CURRENT_DATE - INTERVAL '9 days', '[{"medicationName":"Vitamin E (d-alpha tocopherol)","dosage":"400IU","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take with lunch"}]'::jsonb, 'Dispensed', 'Adjunct antioxidant therapy in hepatic steatosis.'),
    (gen_random_uuid(), v_cons[21], 'RX-2026-0021', v_pat[21], v_doc4, CURRENT_DATE - INTERVAL '8 days', '[{"medicationName":"Ferrous Sulfate + Folic Acid","dosage":"325mg/0.5mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take on empty stomach or with citrus juice"}]'::jsonb, 'Dispensed', 'May cause dark stools (normal reaction).'),
    (gen_random_uuid(), v_cons[22], 'RX-2026-0022', v_pat[22], v_doc3, CURRENT_DATE - INTERVAL '7 days', '[{"medicationName":"Tamsulosin Hydrochloride","dosage":"0.4mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take approximately 30 minutes after dinner"}]'::jsonb, 'Dispensed', 'Alleviates dynamic urinary outflow resistance.'),
    (gen_random_uuid(), v_cons[23], 'RX-2026-0023', v_pat[23], v_doc3, CURRENT_DATE - INTERVAL '6 days', '[{"medicationName":"Paracetamol","dosage":"500mg","frequency":"Every 6 hours PRN","duration":"5 days","quantity":15,"instructions":"Take for headache"}]'::jsonb, 'Active', 'Do not exceed 4000mg Paracetamol in 24 hours.'),
    (gen_random_uuid(), v_cons[24], 'RX-2026-0024', v_pat[24], v_doc5, CURRENT_DATE - INTERVAL '5 days', '[{"medicationName":"Mefenamic Acid","dosage":"500mg","frequency":"Three Times Daily (TID)","duration":"5 days","quantity":15,"instructions":"Take after meals"}]'::jsonb, 'Dispensed', 'Wear support brace when ambulating.'),
    (gen_random_uuid(), v_cons[25], 'RX-2026-0025', v_pat[25], v_doc3, CURRENT_DATE - INTERVAL '4 days', '[{"medicationName":"Co-Amoxiclav","dosage":"625mg","frequency":"Twice Daily (BID)","duration":"7 days","quantity":14,"instructions":"Take at the start of meals"}]'::jsonb, 'Active', 'Complete full 7-day antibiotic course.'),
    (gen_random_uuid(), v_cons[26], 'RX-2026-0026', v_pat[26], v_doc3, CURRENT_DATE - INTERVAL '3 days', '[{"medicationName":"Amoxicillin Trihydrate","dosage":"500mg","frequency":"Three Times Daily (TID)","duration":"7 days","quantity":21,"instructions":"Take every 8 hours x 7 days"}]'::jsonb, 'Active', 'Complete all capsules.'),
    (gen_random_uuid(), v_cons[27], 'RX-2026-0027', v_pat[27], v_doc4, CURRENT_DATE - INTERVAL '2 days', '[{"medicationName":"Ciprofloxacin","dosage":"500mg","frequency":"Twice Daily (BID)","duration":"7 days","quantity":14,"instructions":"Drink plenty of fluids. Avoid dairy within 2 hours"}]'::jsonb, 'Active', 'Drink at least 8-10 glasses of water daily.'),
    (gen_random_uuid(), v_cons[28], 'RX-2026-0028', v_pat[28], v_doc1, CURRENT_DATE - INTERVAL '1 days', '[{"medicationName":"Losartan Potassium","dosage":"50mg","frequency":"Once Daily (OD)","duration":"30 days","quantity":30,"instructions":"Take once daily in the morning"},{"medicationName":"Paracetamol","dosage":"500mg","frequency":"TID PRN","duration":"10 days","quantity":20,"instructions":"Take for joint ache"}]'::jsonb, 'Active', 'Regular blood pressure monitoring.');

    -- [F] Insert 16 Lab Orders (Dynamic gen_random_uuid() & Relative Timestamps)
    INSERT INTO public.lab_orders (id, consultation_id, order_number, patient_id, doctor_id, test_name, category, urgency, status, requested_at, collected_at, completed_at, results, interpretation) VALUES
    (gen_random_uuid(), v_cons[1], 'LAB-2026-0001', v_pat[1], v_doc1, 'Glycated Hemoglobin (HbA1c)', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '28 days 6 hours', now() - INTERVAL '28 days 5 hours 45 mins', now() - INTERVAL '28 days 2 hours', '[{"parameter":"HbA1c","value":7.4,"unit":"%","referenceRange":"4.0 - 5.6","flag":"High"}]'::jsonb, 'HbA1c 7.4% indicates suboptimal glycemic control over past 90 days.'),
    (gen_random_uuid(), v_cons[1], 'LAB-2026-0002', v_pat[1], v_doc1, 'Lipid Profile Panel', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '27 days 6 hours', now() - INTERVAL '27 days 5 hours 45 mins', now() - INTERVAL '27 days 2 hours', '[{"parameter":"Total Cholesterol","value":218,"unit":"mg/dL","referenceRange":"< 200","flag":"High"},{"parameter":"Triglycerides","value":182,"unit":"mg/dL","referenceRange":"< 150","flag":"High"},{"parameter":"HDL Cholesterol","value":44,"unit":"mg/dL","referenceRange":"> 50","flag":"Low"},{"parameter":"LDL Cholesterol","value":138,"unit":"mg/dL","referenceRange":"< 100","flag":"High"}]'::jsonb, 'Mixed dyslipidemia with elevated LDL and triglycerides.'),
    (gen_random_uuid(), v_cons[3], 'LAB-2026-0003', v_pat[3], v_doc1, 'Serum Creatinine & eGFR', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '26 days 6 hours', now() - INTERVAL '26 days 5 hours 45 mins', now() - INTERVAL '26 days 2 hours', '[{"parameter":"Creatinine","value":1.05,"unit":"mg/dL","referenceRange":"0.50 - 1.10","flag":"Normal"},{"parameter":"eGFR (CKD-EPI)","value":68,"unit":"mL/min/1.73m2","referenceRange":"> 90","flag":"Low"}]'::jsonb, 'Mildly reduced filtration rate consistent with Stage 2 CKD.'),
    (gen_random_uuid(), v_cons[3], 'LAB-2026-0004', v_pat[3], v_doc1, '12-Lead Electrocardiogram (ECG)', 'Cardiovascular Diagnostics', 'Routine', 'Result Available', now() - INTERVAL '25 days 6 hours', now() - INTERVAL '25 days 5 hours 45 mins', now() - INTERVAL '25 days 2 hours', '[{"parameter":"Heart Rate","value":78,"unit":"bpm","referenceRange":"60 - 100","flag":"Normal"},{"parameter":"Rhythm","value":"Normal Sinus Rhythm","unit":"","referenceRange":"","flag":"Normal"},{"parameter":"Axis","value":"Left Axis Deviation","unit":"","referenceRange":"","flag":"Borderline"}]'::jsonb, 'Normal sinus rhythm with early left ventricular voltage elevation.'),
    (gen_random_uuid(), v_cons[5], 'LAB-2026-0005', v_pat[5], v_doc4, '75g Oral Glucose Tolerance Test (OGTT)', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '24 days 6 hours', now() - INTERVAL '24 days 5 hours 45 mins', now() - INTERVAL '24 days 2 hours', '[{"parameter":"Fasting Glucose","value":82,"unit":"mg/dL","referenceRange":"< 92","flag":"Normal"},{"parameter":"1-Hour Post-Load","value":134,"unit":"mg/dL","referenceRange":"< 180","flag":"Normal"},{"parameter":"2-Hour Post-Load","value":118,"unit":"mg/dL","referenceRange":"< 153","flag":"Normal"}]'::jsonb, 'Normal 75g OGTT gestational screen. GDM ruled out.'),
    (gen_random_uuid(), v_cons[7], 'LAB-2026-0006', v_pat[7], v_doc1, 'Fasting Lipid Profile', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '23 days 6 hours', now() - INTERVAL '23 days 5 hours 45 mins', now() - INTERVAL '23 days 2 hours', '[{"parameter":"Total Cholesterol","value":242,"unit":"mg/dL","referenceRange":"< 200","flag":"High"},{"parameter":"Triglycerides","value":155,"unit":"mg/dL","referenceRange":"< 150","flag":"Borderline"},{"parameter":"HDL","value":52,"unit":"mg/dL","referenceRange":"> 50","flag":"Normal"},{"parameter":"LDL","value":159,"unit":"mg/dL","referenceRange":"< 100","flag":"High"}]'::jsonb, 'Primary hypercholesterolemia. Statin therapy indicated.'),
    (gen_random_uuid(), v_cons[8], 'LAB-2026-0007', v_pat[8], v_doc5, 'Right Knee X-Ray (AP & Lateral)', 'Radiology & Imaging', 'Routine', 'Result Available', now() - INTERVAL '22 days 6 hours', now() - INTERVAL '22 days 5 hours 45 mins', now() - INTERVAL '22 days 2 hours', '[{"parameter":"Bone Architecture","value":"Intact","unit":"","referenceRange":"","flag":"Normal"},{"parameter":"Joint Space","value":"Preserved","unit":"","referenceRange":"","flag":"Normal"},{"parameter":"Effusion","value":"Moderate suprapatellar fluid","unit":"","referenceRange":"","flag":"Abnormal"}]'::jsonb, 'No cortical fracture or avulsion. Moderate joint effusion noted.'),
    (gen_random_uuid(), v_cons[11], 'LAB-2026-0008', v_pat[11], v_doc1, 'Routine Urinalysis with Microscopy', 'Clinical Microscopy', 'Routine', 'Result Available', now() - INTERVAL '21 days 6 hours', now() - INTERVAL '21 days 5 hours 45 mins', now() - INTERVAL '21 days 2 hours', '[{"parameter":"Color","value":"Yellow","unit":"","referenceRange":"","flag":"Normal"},{"parameter":"Protein","value":"Trace","unit":"","referenceRange":"Negative","flag":"Borderline"},{"parameter":"Glucose","value":"Negative","unit":"mg/dL","referenceRange":"Negative","flag":"Normal"},{"parameter":"WBC","value":"1-3","unit":"/hpf","referenceRange":"0 - 5","flag":"Normal"}]'::jsonb, 'Trace proteinuria. Renal follow-up maintained.'),
    (gen_random_uuid(), v_cons[14], 'LAB-2026-0009', v_pat[14], v_doc1, 'Serum Uric Acid', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '20 days 6 hours', now() - INTERVAL '20 days 5 hours 45 mins', now() - INTERVAL '20 days 2 hours', '[{"parameter":"Uric Acid","value":8.9,"unit":"mg/dL","referenceRange":"3.5 - 7.2","flag":"High"}]'::jsonb, 'Marked hyperuricemia correlating with acute podagra.'),
    (gen_random_uuid(), v_cons[16], 'LAB-2026-0010', v_pat[16], v_doc1, 'Fasting Blood Sugar (FBS)', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '19 days 6 hours', now() - INTERVAL '19 days 5 hours 45 mins', now() - INTERVAL '19 days 2 hours', '[{"parameter":"Glucose (Fasting)","value":132,"unit":"mg/dL","referenceRange":"70 - 99","flag":"High"}]'::jsonb, 'Elevated fasting glucose. Continue current antidiabetic therapy.'),
    (gen_random_uuid(), v_cons[19], 'LAB-2026-0011', v_pat[19], v_doc3, 'Thyroid Stimulating Hormone (TSH)', 'Clinical Chemistry & Immunology', 'Routine', 'Result Available', now() - INTERVAL '18 days 6 hours', now() - INTERVAL '18 days 5 hours 45 mins', now() - INTERVAL '18 days 2 hours', '[{"parameter":"TSH (3rd Gen)","value":2.84,"unit":"uIU/mL","referenceRange":"0.40 - 4.50","flag":"Normal"},{"parameter":"Free T4","value":1.22,"unit":"ng/dL","referenceRange":"0.80 - 1.80","flag":"Normal"}]'::jsonb, 'Euthyroid state achieved on Levothyroxine 50mcg replacement.'),
    (gen_random_uuid(), v_cons[20], 'LAB-2026-0012', v_pat[20], v_doc1, 'Liver Function Panel (ALT/SGPT & AST/SGOT)', 'Clinical Chemistry', 'Routine', 'Result Available', now() - INTERVAL '17 days 6 hours', now() - INTERVAL '17 days 5 hours 45 mins', now() - INTERVAL '17 days 2 hours', '[{"parameter":"SGPT (ALT)","value":54,"unit":"U/L","referenceRange":"< 45","flag":"High"},{"parameter":"SGOT (AST)","value":41,"unit":"U/L","referenceRange":"< 35","flag":"High"}]'::jsonb, 'Mild transaminitis consistent with non-alcoholic hepatic steatosis.'),
    (gen_random_uuid(), v_cons[21], 'LAB-2026-0013', v_pat[21], v_doc4, 'Complete Blood Count (CBC) with Platelets', 'Hematology', 'Routine', 'Result Available', now() - INTERVAL '16 days 6 hours', now() - INTERVAL '16 days 5 hours 45 mins', now() - INTERVAL '16 days 2 hours', '[{"parameter":"Hemoglobin","value":9.8,"unit":"g/dL","referenceRange":"12.0 - 15.5","flag":"Low"},{"parameter":"Hematocrit","value":30.2,"unit":"%","referenceRange":"37.0 - 48.0","flag":"Low"},{"parameter":"MCV","value":74.5,"unit":"fL","referenceRange":"80.0 - 100.0","flag":"Low"},{"parameter":"MCH","value":24.0,"unit":"pg","referenceRange":"27.0 - 33.0","flag":"Low"},{"parameter":"Platelets","value":340000,"unit":"/uL","referenceRange":"150000 - 450000","flag":"Normal"}]'::jsonb, 'Microcytic hypochromic anemia consistent with iron deficiency.'),
    (gen_random_uuid(), v_cons[22], 'LAB-2026-0014', v_pat[22], v_doc3, 'Total Prostate Specific Antigen (PSA)', 'Clinical Chemistry & Immunology', 'Routine', 'Result Available', now() - INTERVAL '15 days 6 hours', now() - INTERVAL '15 days 5 hours 45 mins', now() - INTERVAL '15 days 2 hours', '[{"parameter":"Total PSA","value":2.45,"unit":"ng/mL","referenceRange":"< 4.0","flag":"Normal"}]'::jsonb, 'PSA within expected age-adjusted normal range. Reassuring for BPH.'),
    (gen_random_uuid(), v_cons[25], 'LAB-2026-0015', v_pat[25], v_doc3, 'Chest X-Ray (PA View)', 'Radiology & Imaging', 'Routine', 'Result Available', now() - INTERVAL '14 days 6 hours', now() - INTERVAL '14 days 5 hours 45 mins', now() - INTERVAL '14 days 2 hours', '[{"parameter":"Heart Size","value":"Normal","unit":"","referenceRange":"","flag":"Normal"},{"parameter":"Lungs","value":"Bilateral bronchovascular markings","unit":"","referenceRange":"","flag":"Abnormal"}]'::jsonb, 'Bronchitic lung changes without dense focal consolidation.'),
    (gen_random_uuid(), v_cons[27], 'LAB-2026-0016', v_pat[27], v_doc4, 'Routine Urinalysis with Microscopy', 'Clinical Microscopy', 'Routine', 'Result Available', now() - INTERVAL '13 days 6 hours', now() - INTERVAL '13 days 5 hours 45 mins', now() - INTERVAL '13 days 2 hours', '[{"parameter":"Color","value":"Turbid Yellow","unit":"","referenceRange":"Straw to Yellow","flag":"Abnormal"},{"parameter":"Leukocyte Esterase","value":"Positive (2+)","unit":"","referenceRange":"Negative","flag":"High"},{"parameter":"Nitrite","value":"Positive","unit":"","referenceRange":"Negative","flag":"Abnormal"},{"parameter":"WBC","value":"25-35","unit":"/hpf","referenceRange":"0 - 5","flag":"High"},{"parameter":"Bacteria","value":"Many","unit":"","referenceRange":"None","flag":"Abnormal"}]'::jsonb, 'Active acute bacterial urinary tract infection.');

    -- [G] Insert 35 Pharmacy Inventory Items (Dynamic gen_random_uuid() & Expiration Offsets)
    INSERT INTO public.inventory_items (id, sku, name, generic_name, brand, category, batch_number, expiration_date, supplier, stock_quantity, reorder_level, purchase_price, selling_price, unit, location, last_updated) VALUES
    (gen_random_uuid(), 'MED-AMOX-500', 'Amoxicillin 500mg Capsule', 'Amoxicillin Trihydrate', 'Himox', 'Antibiotic', 'AMX-26A-01', CURRENT_DATE + INTERVAL '365 days', 'Unilab Philippines', 850, 150, 2.80, 8.50, 'Capsules', 'Shelf A-01', now() - INTERVAL '0 hours'),
    (gen_random_uuid(), 'MED-COAMOX-625', 'Co-Amoxiclav 625mg Tablet', 'Amoxicillin + Clavulanic Acid', 'Augmentin', 'Antibiotic', 'CAM-26B-02', CURRENT_DATE + INTERVAL '385 days', 'GlaxoSmithKline Phils', 420, 100, 18.50, 38.00, 'Tablets', 'Shelf A-02', now() - INTERVAL '3 hours'),
    (gen_random_uuid(), 'MED-AZITH-500', 'Azithromycin 500mg Tablet', 'Azithromycin Dihydrate', 'Zithromax', 'Antibiotic', 'AZI-26A-11', CURRENT_DATE + INTERVAL '405 days', 'Pfizer Philippines', 260, 50, 42.00, 85.00, 'Tablets', 'Shelf A-03', now() - INTERVAL '6 hours'),
    (gen_random_uuid(), 'MED-CIPRO-500', 'Ciprofloxacin 500mg Tablet', 'Ciprofloxacin HCl', 'Ciprobay', 'Antibiotic', 'CIP-26C-04', CURRENT_DATE + INTERVAL '425 days', 'Bayer Philippines', 380, 80, 12.00, 26.50, 'Tablets', 'Shelf A-04', now() - INTERVAL '9 hours'),
    (gen_random_uuid(), 'MED-MET-500', 'Metformin 500mg Tablet', 'Metformin Hydrochloride', 'Glucophage', 'Antidiabetic', 'MET-26A-22', CURRENT_DATE + INTERVAL '445 days', 'Merck Inc Philippines', 1200, 250, 1.80, 5.50, 'Tablets', 'Shelf B-01', now() - INTERVAL '12 hours'),
    (gen_random_uuid(), 'MED-MET-850', 'Metformin 850mg Tablet', 'Metformin Hydrochloride', 'Formet', 'Antidiabetic', 'MET-26B-09', CURRENT_DATE + INTERVAL '465 days', 'Unilab Philippines', 680, 120, 2.90, 8.00, 'Tablets', 'Shelf B-02', now() - INTERVAL '15 hours'),
    (gen_random_uuid(), 'MED-GLIM-2', 'Glimepiride 2mg Tablet', 'Glimepiride', 'Amaryl', 'Antidiabetic', 'GLI-26A-03', CURRENT_DATE + INTERVAL '485 days', 'Sanofi-Aventis Phils', 450, 100, 9.50, 22.00, 'Tablets', 'Shelf B-03', now() - INTERVAL '18 hours'),
    (gen_random_uuid(), 'MED-EMPA-10', 'Empagliflozin 10mg Tablet', 'Empagliflozin', 'Jardiance', 'Antidiabetic', 'EMP-26C-15', CURRENT_DATE + INTERVAL '505 days', 'Boehringer Ingelheim', 210, 50, 38.00, 68.00, 'Tablets', 'Shelf B-04', now() - INTERVAL '21 hours'),
    (gen_random_uuid(), 'MED-LIS-10', 'Lisinopril 10mg Tablet', 'Lisinopril Dihydrate', 'Zestril', 'Antihypertensive', 'LIS-26A-08', CURRENT_DATE + INTERVAL '525 days', 'AstraZeneca Phils', 540, 100, 4.20, 12.00, 'Tablets', 'Shelf C-01', now() - INTERVAL '24 hours'),
    (gen_random_uuid(), 'MED-LIS-20', 'Lisinopril 20mg Tablet', 'Lisinopril Dihydrate', 'Prinivil', 'Antihypertensive', 'LIS-26B-14', CURRENT_DATE + INTERVAL '545 days', 'Zuellig Pharma Logistics', 320, 60, 7.80, 19.50, 'Tablets', 'Shelf C-02', now() - INTERVAL '27 hours'),
    (gen_random_uuid(), 'MED-LOS-50', 'Losartan Potassium 50mg', 'Losartan Potassium', 'Cozaar', 'Antihypertensive', 'LOS-26A-01', CURRENT_DATE + INTERVAL '565 days', 'Organon Philippines', 940, 200, 4.50, 14.00, 'Tablets', 'Shelf C-03', now() - INTERVAL '30 hours'),
    (gen_random_uuid(), 'MED-LOS-100', 'Losartan Potassium 100mg', 'Losartan Potassium', 'Lifezar', 'Antihypertensive', 'LOS-26C-12', CURRENT_DATE + INTERVAL '585 days', 'Unilab Philippines', 490, 100, 8.20, 24.00, 'Tablets', 'Shelf C-04', now() - INTERVAL '33 hours'),
    (gen_random_uuid(), 'MED-AMLO-5', 'Amlodipine 5mg Tablet', 'Amlodipine Besylate', 'Norvasc', 'Antihypertensive', 'AML-26A-19', CURRENT_DATE + INTERVAL '605 days', 'Viatris Philippines', 1100, 250, 3.20, 11.50, 'Tablets', 'Shelf C-05', now() - INTERVAL '36 hours'),
    (gen_random_uuid(), 'MED-AMLO-10', 'Amlodipine 10mg Tablet', 'Amlodipine Besylate', 'Vasalat', 'Antihypertensive', 'AML-26B-25', CURRENT_DATE + INTERVAL '625 days', 'Unilab Philippines', 680, 150, 5.40, 18.00, 'Tablets', 'Shelf C-06', now() - INTERVAL '39 hours'),
    (gen_random_uuid(), 'MED-ATOR-20', 'Atorvastatin 20mg Tablet', 'Atorvastatin Calcium', 'Lipitor', 'Cardiovascular', 'ATO-26A-06', CURRENT_DATE + INTERVAL '645 days', 'Viatris Philippines', 720, 150, 8.50, 26.00, 'Tablets', 'Shelf D-01', now() - INTERVAL '42 hours'),
    (gen_random_uuid(), 'MED-ATOR-40', 'Atorvastatin 40mg Tablet', 'Atorvastatin Calcium', 'Torvast', 'Cardiovascular', 'ATO-26B-18', CURRENT_DATE + INTERVAL '665 days', 'Unilab Philippines', 380, 80, 14.00, 39.50, 'Tablets', 'Shelf D-02', now() - INTERVAL '45 hours'),
    (gen_random_uuid(), 'MED-ROSU-10', 'Rosuvastatin 10mg Tablet', 'Rosuvastatin Calcium', 'Crestor', 'Cardiovascular', 'ROS-26A-10', CURRENT_DATE + INTERVAL '685 days', 'AstraZeneca Phils', 420, 90, 16.50, 42.00, 'Tablets', 'Shelf D-03', now() - INTERVAL '48 hours'),
    (gen_random_uuid(), 'MED-ALB-90', 'Salbutamol Inhaler 100mcg', 'Salbutamol Sulfate', 'Ventolin Evohaler', 'Respiratory', 'SAL-26C-02', CURRENT_DATE + INTERVAL '705 days', 'GlaxoSmithKline Phils', 145, 30, 185.00, 345.00, 'Inhalers', 'Shelf E-01', now() - INTERVAL '51 hours'),
    (gen_random_uuid(), 'MED-BUD-160', 'Budesonide/Formoterol 160/4.5', 'Budesonide + Formoterol', 'Symbicort Turbuhaler', 'Respiratory', 'SYM-26A-05', CURRENT_DATE + INTERVAL '725 days', 'AstraZeneca Phils', 95, 20, 780.00, 1250.00, 'Inhalers', 'Shelf E-02', now() - INTERVAL '54 hours'),
    (gen_random_uuid(), 'MED-SALM-50', 'Fluticasone/Salmeterol Accuhaler', 'Fluticasone + Salmeterol', 'Seretide', 'Respiratory', 'SER-26B-11', CURRENT_DATE + INTERVAL '745 days', 'GlaxoSmithKline Phils', 80, 20, 690.00, 1120.00, 'Inhalers', 'Shelf E-03', now() - INTERVAL '57 hours'),
    (gen_random_uuid(), 'MED-OMEP-20', 'Omeprazole 20mg Capsule', 'Omeprazole', 'Losec', 'Gastrointestinal', 'OME-26A-07', CURRENT_DATE + INTERVAL '765 days', 'AstraZeneca Phils', 850, 180, 4.50, 15.00, 'Capsules', 'Shelf F-01', now() - INTERVAL '60 hours'),
    (gen_random_uuid(), 'MED-ESOM-40', 'Esomeprazole 40mg Tablet', 'Esomeprazole Magnesium', 'Nexium', 'Gastrointestinal', 'NEX-26C-14', CURRENT_DATE + INTERVAL '785 days', 'AstraZeneca Phils', 340, 70, 32.00, 65.00, 'Tablets', 'Shelf F-02', now() - INTERVAL '63 hours'),
    (gen_random_uuid(), 'MED-PANT-40', 'Pantoprazole 40mg Tablet', 'Pantoprazole Sodium', 'Pantiloc', 'Gastrointestinal', 'PAN-26B-04', CURRENT_DATE + INTERVAL '805 days', 'Takeda Healthcare Phils', 290, 60, 28.00, 58.00, 'Tablets', 'Shelf F-03', now() - INTERVAL '66 hours'),
    (gen_random_uuid(), 'MED-PARA-500', 'Paracetamol 500mg Tablet', 'Paracetamol', 'Biogesic', 'Analgesic', 'BIO-26A-99', CURRENT_DATE + INTERVAL '825 days', 'Unilab Philippines', 3500, 500, 1.20, 4.50, 'Tablets', 'Shelf G-01', now() - INTERVAL '69 hours'),
    (gen_random_uuid(), 'MED-MEFE-500', 'Mefenamic Acid 500mg', 'Mefenamic Acid', 'Ponstan', 'Analgesic & NSAID', 'PON-26B-12', CURRENT_DATE + INTERVAL '845 days', 'Pfizer Philippines', 1150, 200, 6.20, 18.50, 'Tablets', 'Shelf G-02', now() - INTERVAL '72 hours'),
    (gen_random_uuid(), 'MED-IBUP-400', 'Ibuprofen 400mg Softgel', 'Ibuprofen', 'Medicol Advance', 'Analgesic & NSAID', 'MED-26A-04', CURRENT_DATE + INTERVAL '865 days', 'Unilab Philippines', 820, 150, 4.80, 14.00, 'Capsules', 'Shelf G-03', now() - INTERVAL '75 hours'),
    (gen_random_uuid(), 'MED-CELE-200', 'Celecoxib 200mg Capsule', 'Celecoxib', 'Celebrex', 'Analgesic & NSAID', 'CEL-26C-10', CURRENT_DATE + INTERVAL '885 days', 'Pfizer Philippines', 620, 100, 16.00, 36.00, 'Capsules', 'Shelf G-04', now() - INTERVAL '78 hours'),
    (gen_random_uuid(), 'MED-TRAM-50', 'Tramadol/Paracetamol 37.5/325', 'Tramadol + Paracetamol', 'Zaldiar', 'Analgesic', 'ZAL-26B-06', CURRENT_DATE + INTERVAL '905 days', 'Stada Philippines', 340, 70, 19.50, 42.00, 'Tablets', 'Safe Cabinet S-1', now() - INTERVAL '81 hours'),
    (gen_random_uuid(), 'MED-CETI-10', 'Cetirizine 10mg Tablet', 'Cetirizine Dihydrochloride', 'Alnix', 'Antihistamine', 'ALN-26A-08', CURRENT_DATE + INTERVAL '925 days', 'Unilab Philippines', 1400, 250, 3.10, 12.00, 'Tablets', 'Shelf H-01', now() - INTERVAL '84 hours'),
    (gen_random_uuid(), 'MED-LORA-10', 'Loratadine 10mg Tablet', 'Loratadine', 'Claritin', 'Antihistamine', 'CLA-26A-15', CURRENT_DATE + INTERVAL '945 days', 'Bayer Philippines', 580, 100, 12.50, 28.00, 'Tablets', 'Shelf H-02', now() - INTERVAL '87 hours'),
    (gen_random_uuid(), 'MED-MONT-10', 'Montelukast 10mg Tablet', 'Montelukast Sodium', 'Singulair', 'Antiasthmatic', 'SIN-26B-02', CURRENT_DATE + INTERVAL '965 days', 'Organon Philippines', 420, 80, 22.00, 48.00, 'Tablets', 'Shelf H-03', now() - INTERVAL '90 hours'),
    (gen_random_uuid(), 'MED-PRED-20', 'Prednisone 20mg Tablet', 'Prednisone', 'Deltasone', 'Corticosteroid', 'PRE-26A-01', CURRENT_DATE + INTERVAL '985 days', 'Unilab Philippines', 480, 80, 4.20, 12.50, 'Tablets', 'Shelf I-01', now() - INTERVAL '93 hours'),
    (gen_random_uuid(), 'MED-DEXA-4', 'Dexamethasone 4mg Tablet', 'Dexamethasone', 'Decadron', 'Corticosteroid', 'DEX-26C-11', CURRENT_DATE + INTERVAL '1005 days', 'Zuellig Pharma Logistics', 310, 60, 6.50, 16.00, 'Tablets', 'Shelf I-02', now() - INTERVAL '96 hours'),
    (gen_random_uuid(), 'MED-ORAL-SALT', 'Oral Rehydration Salts Sachet', 'Oral Rehydration Salts (WHO)', 'Hydrite', 'Electrolyte', 'HYD-26A-50', CURRENT_DATE + INTERVAL '1025 days', 'Unilab Philippines', 650, 150, 5.00, 14.50, 'Sachets', 'Shelf J-01', now() - INTERVAL '99 hours'),
    (gen_random_uuid(), 'MED-MULTIVIT-TAB', 'Multivitamins + Minerals Capsule', 'Multivitamins with Iron & Zinc', 'Enervon-Z', 'Nutritional Supplement', 'ENE-26B-44', CURRENT_DATE + INTERVAL '1045 days', 'Unilab Philippines', 1800, 300, 2.50, 8.00, 'Capsules', 'Shelf J-02', now() - INTERVAL '102 hours');

    -- [H] Insert 20 Invoices (Dynamic gen_random_uuid() & Dynamic Billing Dates)
    INSERT INTO public.invoices (id, appointment_id, consultation_id, invoice_number, patient_id, invoice_date, due_date, items, subtotal, discount_amount, total_amount, paid_amount, status, payment_method, payment_date, insurance_claim_status) VALUES
    (gen_random_uuid(), v_appt[1], v_cons[1], 'INV-2026-0001', v_pat[1], CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days', '[{"description":"Internal Medicine Consultation","amount":800.00},{"description":"HbA1c Diagnostic Test","amount":750.00},{"description":"Lipid Profile Panel","amount":650.00}]'::jsonb, 2200.00, 440.00, 1760.00, 1760.00, 'Paid', 'GCash', now() - INTERVAL '28 days 4 hours', 'Filed - PhilHealth'),
    (gen_random_uuid(), v_appt[2], v_cons[2], 'INV-2026-0002', v_pat[2], CURRENT_DATE - INTERVAL '27 days', CURRENT_DATE - INTERVAL '27 days', '[{"description":"Family Medicine Consultation","amount":600.00},{"description":"Budesonide/Formoterol Inhaler","amount":1250.00}]'::jsonb, 1850.00, 0.00, 1850.00, 1850.00, 'Paid', 'Maya', now() - INTERVAL '27 days 4 hours', 'HMO Direct - Maxicare'),
    (gen_random_uuid(), v_appt[3], v_cons[3], 'INV-2026-0003', v_pat[3], CURRENT_DATE - INTERVAL '26 days', CURRENT_DATE - INTERVAL '26 days', '[{"description":"Specialist Consultation (Senior)","amount":800.00},{"description":"12-Lead ECG","amount":500.00},{"description":"Serum Creatinine","amount":350.00}]'::jsonb, 1650.00, 330.00, 1320.00, 1320.00, 'Paid', 'Cash', now() - INTERVAL '26 days 4 hours', 'Senior Citizen 20% Discount'),
    (gen_random_uuid(), v_appt[4], v_cons[4], 'INV-2026-0004', v_pat[4], CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '25 days', '[{"description":"Pediatric Consultation","amount":700.00},{"description":"Cetirizine Syrup Dispensing","amount":185.00}]'::jsonb, 885.00, 0.00, 885.00, 885.00, 'Paid', 'Credit Card', now() - INTERVAL '25 days 4 hours', 'HMO Direct - Medicard'),
    (gen_random_uuid(), v_appt[5], v_cons[5], 'INV-2026-0005', v_pat[5], CURRENT_DATE - INTERVAL '24 days', CURRENT_DATE - INTERVAL '24 days', '[{"description":"OB-GYN Prenatal Consultation","amount":900.00},{"description":"75g OGTT Diabetes Screen","amount":650.00}]'::jsonb, 1550.00, 0.00, 1550.00, 1550.00, 'Paid', 'GCash', now() - INTERVAL '24 days 4 hours', 'HMO Direct - Intellicare'),
    (gen_random_uuid(), v_appt[6], v_cons[6], 'INV-2026-0006', v_pat[6], CURRENT_DATE - INTERVAL '23 days', CURRENT_DATE - INTERVAL '23 days', '[{"description":"Orthopedic Specialist Evaluation","amount":900.00},{"description":"Celecoxib 200mg (14 tabs)","amount":504.00}]'::jsonb, 1404.00, 0.00, 1404.00, 1404.00, 'Paid', 'Cash', now() - INTERVAL '23 days 4 hours', 'Not Filed'),
    (gen_random_uuid(), v_appt[7], v_cons[7], 'INV-2026-0007', v_pat[7], CURRENT_DATE - INTERVAL '22 days', CURRENT_DATE - INTERVAL '22 days', '[{"description":"Internal Medicine Consultation","amount":800.00},{"description":"Fasting Lipid Profile","amount":650.00},{"description":"Atorvastatin 20mg (30 tabs)","amount":780.00}]'::jsonb, 2230.00, 0.00, 2230.00, 2230.00, 'Paid', 'GCash', now() - INTERVAL '22 days 4 hours', 'Filed - PhilHealth'),
    (gen_random_uuid(), v_appt[8], v_cons[8], 'INV-2026-0008', v_pat[8], CURRENT_DATE - INTERVAL '21 days', CURRENT_DATE - INTERVAL '21 days', '[{"description":"Orthopedic Consultation","amount":900.00},{"description":"Right Knee X-Ray (2 Views)","amount":750.00},{"description":"Knee Support Brace","amount":650.00}]'::jsonb, 2300.00, 0.00, 2300.00, 2300.00, 'Paid', 'Maya', now() - INTERVAL '21 days 4 hours', 'Not Filed'),
    (gen_random_uuid(), v_appt[9], v_cons[9], 'INV-2026-0009', v_pat[9], CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '20 days', '[{"description":"Gynecological Consultation","amount":850.00},{"description":"Metformin 500mg (30 tabs)","amount":165.00}]'::jsonb, 1015.00, 0.00, 1015.00, 1015.00, 'Paid', 'Credit Card', now() - INTERVAL '20 days 4 hours', 'HMO Direct - CareHealth'),
    (gen_random_uuid(), v_appt[10], v_cons[10], 'INV-2026-0010', v_pat[10], CURRENT_DATE - INTERVAL '19 days', CURRENT_DATE - INTERVAL '19 days', '[{"description":"General Outpatient Consultation","amount":600.00},{"description":"Omeprazole 20mg (28 caps)","amount":420.00}]'::jsonb, 1020.00, 0.00, 1020.00, 1020.00, 'Paid', 'Cash', now() - INTERVAL '19 days 4 hours', 'Not Filed'),
    (gen_random_uuid(), v_appt[11], v_cons[11], 'INV-2026-0011', v_pat[11], CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE - INTERVAL '18 days', '[{"description":"Internal Medicine Senior Care","amount":800.00},{"description":"Urinalysis Microscopy","amount":250.00},{"description":"Losartan 50mg (30 tabs)","amount":420.00}]'::jsonb, 1470.00, 294.00, 1176.00, 1176.00, 'Paid', 'Cash', now() - INTERVAL '18 days 4 hours', 'Senior Citizen 20% Discount'),
    (gen_random_uuid(), v_appt[12], v_cons[12], 'INV-2026-0012', v_pat[12], CURRENT_DATE - INTERVAL '17 days', CURRENT_DATE - INTERVAL '17 days', '[{"description":"Pediatric Consultation","amount":700.00},{"description":"Co-Amoxiclav Suspension","amount":320.00},{"description":"Paracetamol Syrup","amount":120.00}]'::jsonb, 1140.00, 0.00, 1140.00, 1140.00, 'Paid', 'GCash', now() - INTERVAL '17 days 4 hours', 'HMO Direct - Maxicare'),
    (gen_random_uuid(), v_appt[13], v_cons[13], 'INV-2026-0013', v_pat[13], CURRENT_DATE - INTERVAL '16 days', CURRENT_DATE - INTERVAL '16 days', '[{"description":"OB-GYN Clinical Consultation","amount":850.00},{"description":"Mefenamic Acid 500mg","amount":166.50}]'::jsonb, 1016.50, 0.00, 1016.50, 1016.50, 'Paid', 'Maya', now() - INTERVAL '16 days 4 hours', 'Not Filed'),
    (gen_random_uuid(), v_appt[14], v_cons[14], 'INV-2026-0014', v_pat[14], CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', '[{"description":"Internal Medicine Consultation","amount":800.00},{"description":"Serum Uric Acid Test","amount":350.00},{"description":"Colchicine + Celecoxib","amount":380.00}]'::jsonb, 1530.00, 0.00, 1530.00, 1530.00, 'Paid', 'GCash', now() - INTERVAL '15 days 4 hours', 'Filed - PhilHealth'),
    (gen_random_uuid(), v_appt[15], v_cons[15], 'INV-2026-0015', v_pat[15], CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', '[{"description":"Family Medicine Consultation","amount":600.00},{"description":"Medical Certificate Issuance","amount":200.00},{"description":"Paracetamol 500mg (15 tabs)","amount":67.50}]'::jsonb, 867.50, 0.00, 867.50, 867.50, 'Paid', 'Cash', now() - INTERVAL '14 days 4 hours', 'Not Filed'),
    (gen_random_uuid(), v_appt[16], v_cons[16], 'INV-2026-0016', v_pat[16], CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE - INTERVAL '13 days', '[{"description":"Cardiology Routine Follow-up","amount":800.00},{"description":"Fasting Blood Sugar","amount":250.00},{"description":"Aspirin 80mg + Atorvastatin 40mg","amount":1300.00}]'::jsonb, 2350.00, 0.00, 2350.00, 2350.00, 'Paid', 'Credit Card', now() - INTERVAL '13 days 4 hours', 'Filed - PhilHealth'),
    (gen_random_uuid(), v_appt[17], v_cons[17], 'INV-2026-0017', v_pat[17], CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '12 days', '[{"description":"Family Medicine Consultation","amount":600.00},{"description":"Sumatriptan 50mg (4 tabs)","amount":480.00}]'::jsonb, 1080.00, 0.00, 1080.00, 1080.00, 'Paid', 'Maya', now() - INTERVAL '12 days 4 hours', 'HMO Direct - Medicard'),
    (gen_random_uuid(), v_appt[18], v_cons[18], 'INV-2026-0018', v_pat[18], CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE - INTERVAL '11 days', '[{"description":"Pediatric Pulmonary Follow-up","amount":700.00},{"description":"Symbicort 160/4.5 Turbuhaler","amount":1250.00}]'::jsonb, 1950.00, 0.00, 1950.00, 1950.00, 'Paid', 'GCash', now() - INTERVAL '11 days 4 hours', 'Filed - PhilHealth'),
    (gen_random_uuid(), v_appt[19], v_cons[19], 'INV-2026-0019', v_pat[19], CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', '[{"description":"Outpatient Consultation","amount":600.00},{"description":"Serum TSH 3rd Gen Test","amount":850.00},{"description":"Levothyroxine 50mcg (30 tabs)","amount":360.00}]'::jsonb, 1810.00, 0.00, 1810.00, 1810.00, 'Paid', 'GCash', now() - INTERVAL '10 days 4 hours', 'Filed - PhilHealth'),
    (gen_random_uuid(), v_appt[20], v_cons[20], 'INV-2026-0020', v_pat[20], CURRENT_DATE - INTERVAL '9 days', CURRENT_DATE - INTERVAL '9 days', '[{"description":"Internal Medicine Consultation","amount":800.00},{"description":"Liver Panel SGPT / SGOT","amount":700.00},{"description":"Vitamin E 400IU (30 caps)","amount":420.00}]'::jsonb, 1920.00, 0.00, 1920.00, 1920.00, 'Paid', 'Cash', now() - INTERVAL '9 days 4 hours', 'Filed - PhilHealth');

    -- [I] Insert 13 Audit Logs (Dynamic gen_random_uuid() & Relative Timestamps)
    INSERT INTO public.audit_logs (id, timestamp, user_id, user_name, user_role, action, resource_type, resource_id, description, ip_address) VALUES
    (gen_random_uuid(), now() - INTERVAL '14 days 0 mins', v_admin_id::text, 'Director Maria Lourdes Santos', 'admin', 'SYSTEM_LOGIN', 'AUTH_SESSION', v_admin_id::text, 'Administrator successfully logged into executive dashboard with TOTP 2FA verification.', '192.168.1.10'),
    (gen_random_uuid(), now() - INTERVAL '13 days 45 mins', v_rec1::text, 'Patricia Anne Mercado', 'receptionist', 'PATIENT_CHECKIN', 'APPOINTMENT', v_appt[1]::text, 'Checked in patient Elena Maria Vargas (MRN-2026-001) for Dr. Ramon Bautista.', '192.168.1.25'),
    (gen_random_uuid(), now() - INTERVAL '12 days 90 mins', v_nurse1::text, 'Katrina Mae Soriano, RN', 'nurse', 'VITALS_RECORDED', 'PATIENT_EMR', v_pat[1]::text, 'Documented triage vitals for patient Elena Vargas: BP 134/84, HR 76, Temp 36.6 C.', '192.168.1.30'),
    (gen_random_uuid(), now() - INTERVAL '11 days 135 mins', v_doc1::text, 'Dr. Ramon Jose Bautista', 'doctor', 'CONSULTATION_COMPLETED', 'CONSULTATION', v_cons[1]::text, 'Completed clinical consultation and updated EMR diagnosis for Elena Maria Vargas.', '192.168.1.42'),
    (gen_random_uuid(), now() - INTERVAL '10 days 180 mins', v_doc1::text, 'Dr. Ramon Jose Bautista', 'doctor', 'PRESCRIPTION_ISSUED', 'PRESCRIPTION', 'RX-2026-0001', 'Digitally signed e-prescription RX-2026-0001 for Metformin 850mg & Lisinopril 10mg.', '192.168.1.42'),
    (gen_random_uuid(), now() - INTERVAL '9 days 225 mins', v_doc1::text, 'Dr. Ramon Jose Bautista', 'doctor', 'LAB_ORDER_CREATED', 'LAB_ORDER', 'LAB-2026-0001', 'Requested routine HbA1c and Fasting Lipid Panel for diabetic monitoring.', '192.168.1.42'),
    (gen_random_uuid(), now() - INTERVAL '8 days 270 mins', v_pharm1::text, 'Rochelle Ann Garcia, RPh', 'pharmacist', 'PRESCRIPTION_DISPENSED', 'PHARMACY', 'RX-2026-0001', 'Dispensed 60 tablets of Metformin 850mg and 30 tablets of Lisinopril 10mg.', '192.168.1.55'),
    (gen_random_uuid(), now() - INTERVAL '7 days 315 mins', v_lab1::text, 'Mary Grace Castillo, RMT', 'lab_tech', 'LAB_RESULT_UPLOADED', 'LAB_RESULT', 'LAB-2026-0001', 'Verified and posted automated biochemistry analyzer result: HbA1c 7.4%.', '192.168.1.60'),
    (gen_random_uuid(), now() - INTERVAL '6 days 360 mins', v_rec2::text, 'Dominic Francis Ocampo', 'receptionist', 'INVOICE_SETTLED', 'BILLING', 'INV-2026-0001', 'Collected payment of PHP 1,760.00 via GCash for Invoice INV-2026-0001.', '192.168.1.26'),
    (gen_random_uuid(), now() - INTERVAL '5 days 405 mins', v_doc4::text, 'Dr. Beatrice Angela Dizon', 'doctor', 'PRENATAL_VISIT_LOGGED', 'CONSULTATION', v_cons[5]::text, 'Logged 24-week ultrasound biometric measurements for Sofia Isabella Morales.', '192.168.1.45'),
    (gen_random_uuid(), now() - INTERVAL '4 days 450 mins', v_pharm2::text, 'Justin Benedict Aquino, RPh', 'pharmacist', 'INVENTORY_REORDER_TRIGGERED', 'INVENTORY', 'MED-BUD-160', 'Triggered stock replenishment for Symbicort Turbuhaler (Threshold <= 20).', '192.168.1.56'),
    (gen_random_uuid(), now() - INTERVAL '3 days 495 mins', v_lab2::text, 'Jonathan David Flores, RMT', 'lab_tech', 'RADIOLOGY_POSTED', 'LAB_RESULT', 'LAB-2026-0007', 'Uploaded radiologist report for Right Knee 2-View X-Ray (Danielle Joshua Pascual).', '192.168.1.61'),
    (gen_random_uuid(), now() - INTERVAL '2 days 540 mins', v_admin_id::text, 'Director Maria Lourdes Santos', 'admin', 'DATA_AUDIT_VERIFIED', 'COMPLIANCE', 'AUDIT-LOGS-WEEK-09', 'Reviewed system access logs and confirmed full RA 10173 data privacy isolation compliance.', '192.168.1.10');

    -- [J] Insert Normalized Prescription Items
    INSERT INTO public.prescription_items (id, prescription_id, prescription_number, medication_name, generic_name, dosage, form, frequency, duration, instructions, quantity)
    SELECT 
        gen_random_uuid()::text,
        p.id::text,
        p.prescription_number,
        COALESCE(item->>'medicationName', 'Unknown Medication'),
        item->>'genericName',
        COALESCE(item->>'dosage', 'Standard'),
        COALESCE(item->>'form', 'Tablet'),
        COALESCE(item->>'frequency', 'As directed'),
        COALESCE(item->>'duration', '7 days'),
        item->>'instructions',
        COALESCE((item->>'quantity')::int, 1)
    FROM public.prescriptions p,
    jsonb_array_elements(p.items) AS item;

    -- [K] Insert Normalized Lab Results
    INSERT INTO public.lab_results (id, order_id, order_number, parameter_name, measured_value, unit, reference_range, status_flag, notes)
    SELECT 
        gen_random_uuid()::text,
        o.id::text,
        o.order_number,
        COALESCE(res->>'parameter', 'Parameter'),
        COALESCE(res->>'value', 'N/A'),
        res->>'unit',
        res->>'referenceRange',
        COALESCE(res->>'flag', 'Normal'),
        res->>'notes'
    FROM public.lab_orders o,
    jsonb_array_elements(o.results) AS res;

    -- [L] Insert Normalized Invoice Line Items
    INSERT INTO public.invoice_items (id, invoice_id, invoice_number, item_description, category, quantity, unit_price, total_price)
    SELECT 
        gen_random_uuid()::text,
        inv.id::text,
        inv.invoice_number,
        COALESCE(it->>'description', 'Clinical Service'),
        COALESCE(it->>'category', 'Consultation'),
        COALESCE((it->>'quantity')::int, 1),
        COALESCE((it->>'amount')::decimal, (it->>'unitPrice')::decimal, 0.00),
        COALESCE((it->>'amount')::decimal, (it->>'totalPrice')::decimal, 0.00)
    FROM public.invoices inv,
    jsonb_array_elements(inv.items) AS it;

    -- [M] Seed PBKDF2 Password Credentials for Single Admin & Staff
    INSERT INTO public.auth_credentials (email, hash, salt, role, failed_attempts, locked_until, updated_at) VALUES
    ('smartclinicrealacc@gmail.com', 'a47e7feb2c6940843665417a8545d6db87ae662452e4dd247b04f601c63a8448d033dd4f71ac784037329dea67d4af9aee95226a524b9fd9a01c9ca332f3e3b6', 'b1275ab960f1e2103535ddff9d56d226', 'admin', 0, NULL, now())
    ON CONFLICT (email) DO NOTHING;

END $$;

