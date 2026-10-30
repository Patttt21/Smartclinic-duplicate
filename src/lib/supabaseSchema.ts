// Supabase PostgreSQL Schema String for Smart Clinic Outpatient Management
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- Smart Clinic Outpatient Management System
-- Production Database Schema for Supabase (PostgreSQL)
-- Aligned with Philippine Health Data Security Standards (RA 10173)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Staff Directory Table
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL, -- admin, doctor, nurse, receptionist, pharmacist, lab_technician, staff, patient
    sub_role VARCHAR(32),      -- nurse, receptionist, pharmacist, lab_tech
    specialty VARCHAR(128),
    license_number VARCHAR(64),
    phone VARCHAR(32),
    department VARCHAR(128),
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Core Role Views for Unified PostgREST Querying
CREATE OR REPLACE VIEW public.doctors AS
    SELECT * FROM public.users WHERE role = 'doctor';

CREATE OR REPLACE VIEW public.nurses AS
    SELECT * FROM public.users WHERE role = 'nurse' OR (role = 'staff' AND sub_role = 'nurse');

CREATE OR REPLACE VIEW public.receptionists AS
    SELECT * FROM public.users WHERE role = 'receptionist' OR (role = 'staff' AND sub_role = 'receptionist');

CREATE OR REPLACE VIEW public.pharmacists AS
    SELECT * FROM public.users WHERE role = 'pharmacist' OR (role = 'staff' AND sub_role = 'pharmacist');

CREATE OR REPLACE VIEW public.lab_technicians AS
    SELECT * FROM public.users WHERE role = 'lab_technician' OR (role = 'staff' AND sub_role = 'lab_tech');

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id VARCHAR(64) PRIMARY KEY,
    mrn VARCHAR(32) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(16) NOT NULL,
    blood_type VARCHAR(8) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    chronic_conditions JSONB DEFAULT '[]'::jsonb,
    current_medications JSONB DEFAULT '[]'::jsonb,
    primary_doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    insurance_provider VARCHAR(128),
    insurance_policy_number VARCHAR(64),
    vitals_history JSONB DEFAULT '[]'::jsonb,
    triage_history JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(32) NOT NULL,
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(16) NOT NULL,
    duration_minutes INT DEFAULT 30,
    reason TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'Scheduled' NOT NULL,
    type VARCHAR(32) DEFAULT 'In-Person',
    queue_number VARCHAR(16),
    room VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Consultations Table
CREATE TABLE IF NOT EXISTS public.consultations (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255) NOT NULL,
    consultation_date DATE NOT NULL,
    chief_complaint TEXT NOT NULL,
    history_of_present_illness TEXT,
    review_of_systems TEXT,
    physical_examination TEXT,
    vitals JSONB DEFAULT '{}'::jsonb,
    diagnoses JSONB DEFAULT '[]'::jsonb,
    treatment_plan TEXT NOT NULL,
    prescriptions_created JSONB DEFAULT '[]'::jsonb,
    lab_orders_created JSONB DEFAULT '[]'::jsonb,
    follow_up_date DATE,
    follow_up_instructions TEXT,
    medical_certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Prescriptions Table
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id VARCHAR(64) PRIMARY KEY,
    prescription_number VARCHAR(32) UNIQUE NOT NULL,
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(32) NOT NULL,
    patient_age INT,
    patient_gender VARCHAR(16),
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_specialty VARCHAR(128),
    doctor_license VARCHAR(64),
    prescription_date DATE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(32) DEFAULT 'Active' NOT NULL,
    ai_safety_audit JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Normalized Prescription Items Table
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    prescription_number VARCHAR(32),
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    dosage VARCHAR(64) NOT NULL,
    form VARCHAR(64) DEFAULT 'Tablet',
    frequency VARCHAR(64) NOT NULL,
    duration VARCHAR(64) NOT NULL,
    instructions TEXT,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Diagnostic Lab Orders Table
CREATE TABLE IF NOT EXISTS public.lab_orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(32) UNIQUE NOT NULL,
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(32) NOT NULL,
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    urgency VARCHAR(32) DEFAULT 'Routine',
    status VARCHAR(32) DEFAULT 'Requested' NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    results JSONB DEFAULT '[]'::jsonb,
    interpretation TEXT,
    ai_summary TEXT
);

-- 8. Normalized Lab Results Table
CREATE TABLE IF NOT EXISTS public.lab_results (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    order_number VARCHAR(32),
    parameter_name VARCHAR(255) NOT NULL,
    measured_value VARCHAR(64) NOT NULL,
    unit VARCHAR(32),
    reference_range VARCHAR(64),
    status_flag VARCHAR(32) DEFAULT 'Normal',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Pharmacy & Inventory Items Table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    brand VARCHAR(128),
    category VARCHAR(64) NOT NULL,
    batch_number VARCHAR(64) NOT NULL,
    expiration_date DATE NOT NULL,
    supplier VARCHAR(255),
    stock_quantity INT DEFAULT 0,
    reorder_level INT DEFAULT 50,
    purchase_price DECIMAL(10,2) DEFAULT 0.00,
    selling_price DECIMAL(10,2) DEFAULT 0.00,
    unit VARCHAR(32) DEFAULT 'Tablets',
    location VARCHAR(64),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(32) UNIQUE NOT NULL,
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(32) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(32) DEFAULT 'Unpaid' NOT NULL,
    payment_method VARCHAR(64),
    payment_date TIMESTAMP WITH TIME ZONE,
    insurance_claim_status VARCHAR(32) DEFAULT 'Not Filed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Normalized Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) REFERENCES public.invoices(id) ON DELETE CASCADE,
    invoice_number VARCHAR(32),
    item_description VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    quantity INT DEFAULT 1 NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Audit & Compliance Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1'
);

-- 13. Auth Credentials Table (PBKDF2 SHA-512 Security Store)
CREATE TABLE IF NOT EXISTS public.auth_credentials (
    email VARCHAR(255) PRIMARY KEY,
    hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'patient',
    failed_attempts INT DEFAULT 0,
    locked_until BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Auth OTP Store Table
CREATE TABLE IF NOT EXISTS public.auth_otps (
    key VARCHAR(255) PRIMARY KEY,
    code_hash VARCHAR(255) NOT NULL,
    code_plain VARCHAR(16),
    channel VARCHAR(32) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    expires_at BIGINT NOT NULL,
    attempts INT DEFAULT 0,
    last_sent_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;

-- Anonymous / Authenticated PostgREST Policies
CREATE POLICY "Users All Access" ON public.users FOR ALL USING (true);
CREATE POLICY "Public Read Access" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON public.patients FOR UPDATE USING (true);
CREATE POLICY "Appointments All Access" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Consultations All Access" ON public.consultations FOR ALL USING (true);
CREATE POLICY "Prescriptions All Access" ON public.prescriptions FOR ALL USING (true);
CREATE POLICY "Prescription Items All Access" ON public.prescription_items FOR ALL USING (true);
CREATE POLICY "Lab Orders All Access" ON public.lab_orders FOR ALL USING (true);
CREATE POLICY "Lab Results All Access" ON public.lab_results FOR ALL USING (true);
CREATE POLICY "Inventory All Access" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Invoices All Access" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Invoice Items All Access" ON public.invoice_items FOR ALL USING (true);
CREATE POLICY "Audit Logs All Access" ON public.audit_logs FOR ALL USING (true);
CREATE POLICY "Auth Credentials All Access" ON public.auth_credentials FOR ALL USING (true);
CREATE POLICY "Auth OTPs All Access" ON public.auth_otps FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients(mrn);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_order ON public.lab_results(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- PostgREST Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
`;

export const SUPABASE_GRANT_SQL = `-- Run this in your Supabase SQL Editor if you encounter "permission denied" errors:
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
`;
