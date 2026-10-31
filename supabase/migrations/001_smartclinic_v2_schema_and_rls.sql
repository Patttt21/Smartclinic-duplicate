-- ==============================================================================
-- SmartClinic V2 — Secure Supabase Migration 001:
-- Schema, Identity Mapping, Views, Triggers, Least-Privilege Grants, RLS & Storage
--
-- Target: NEW Independent SmartClinic V2 Supabase Project ONLY
--         (NEVER execute on the original SmartClinic database)
-- Data Notice: Designed for synthetic academic demonstration records only.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 0. CORE UTILITY & TRIGGER FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Generates a unique human-readable booking reference (e.g. BK-20261030-A1B2C3)
CREATE OR REPLACE FUNCTION public.ensure_appointment_booking_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_reference IS NULL OR btrim(NEW.booking_reference) = '' THEN
    NEW.booking_reference := 'BK-' || to_char(COALESCE(NEW.appointment_date, CURRENT_DATE), 'YYYYMMDD') || '-' ||
      UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 6));
  END IF;

  -- Synchronize lifecycle timestamps when status transitions occur
  IF NEW.status = 'Confirmed' AND NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at := timezone('utc'::text, now());
  ELSIF NEW.status = 'Checked In' AND NEW.checked_in_at IS NULL THEN
    NEW.checked_in_at := timezone('utc'::text, now());
  ELSIF NEW.status = 'Called' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Called') THEN
    NEW.called_at := COALESCE(NEW.called_at, timezone('utc'::text, now()));
  ELSIF NEW.status = 'In Consultation' AND NEW.consultation_started_at IS NULL THEN
    NEW.consultation_started_at := timezone('utc'::text, now());
  ELSIF NEW.status = 'Completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := timezone('utc'::text, now());
  ELSIF NEW.status = 'No Show' AND NEW.no_show_marked_at IS NULL THEN
    NEW.no_show_marked_at := timezone('utc'::text, now());
  END IF;

  IF NEW.type = 'Walk-In' THEN
    NEW.is_walk_in := TRUE;
  END IF;

  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 1. APPLICATION TABLES (Preserving Existing Relations + Auth Identity Mapping)
-- ==============================================================================

-- 1.1 Users & Role Directory Table
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (
      role IN ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'staff', 'patient')
    ),
    sub_role VARCHAR(32) CHECK (
      sub_role IS NULL OR sub_role IN ('nurse', 'receptionist', 'pharmacist', 'lab_technician', 'lab_tech')
    ),
    specialty VARCHAR(128),
    license_number VARCHAR(64),
    phone VARCHAR(32),
    department VARCHAR(128),
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1.2 Staff Credentialing Directory Table (Used by serverApp.ts doctor/staff sync)
CREATE TABLE IF NOT EXISTS public.staff (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (
      role IN ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'lab_tech')
    ),
    department VARCHAR(128),
    specialty VARCHAR(128),
    license_number VARCHAR(64),
    phone VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_staff_updated_at ON public.staff;
CREATE TRIGGER trg_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1.3 Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id VARCHAR(64) PRIMARY KEY,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    mrn VARCHAR(32) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    age INT NOT NULL CHECK (age >= 0 AND age <= 130),
    gender VARCHAR(16) NOT NULL,
    blood_type VARCHAR(8) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    avatar TEXT,
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

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar TEXT;

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1.4 Appointments Table (Booking, Unique Ref, Confirmation, Check-In, Walk-In, Queue, Call Patient, No-Show & Forecasting)
CREATE TABLE IF NOT EXISTS public.appointments (
    id VARCHAR(64) PRIMARY KEY,
    booking_reference VARCHAR(32) UNIQUE NOT NULL DEFAULT (
      'BK-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8))
    ),
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(32) NOT NULL,
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    branch TEXT DEFAULT 'Main Outpatient Clinic' NOT NULL,
    service_category VARCHAR(128),
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(16) NOT NULL,
    duration_minutes INT DEFAULT 30,
    reason TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'Scheduled' NOT NULL CHECK (
      status IN ('Scheduled', 'Confirmed', 'Checked In', 'Called', 'In Consultation', 'Completed', 'Cancelled', 'No Show')
    ),
    type VARCHAR(32) DEFAULT 'In-Person' NOT NULL,
    is_walk_in BOOLEAN DEFAULT FALSE NOT NULL,
    is_synthetic BOOLEAN DEFAULT FALSE NOT NULL,
    queue_number VARCHAR(16),
    room VARCHAR(64),
    notes TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by VARCHAR(64),
    checked_in_at TIMESTAMP WITH TIME ZONE,
    called_at TIMESTAMP WITH TIME ZONE,
    called_by TEXT,
    called_acknowledged_at TIMESTAMP WITH TIME ZONE,
    consultation_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    no_show_marked_at TIMESTAMP WITH TIME ZONE,
    rescheduled_from_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
    staff_override_by TEXT,
    staff_override_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(32) UNIQUE DEFAULT (
    'BK-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8))
  ),
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Outpatient Clinic',
  ADD COLUMN IF NOT EXISTS specialty VARCHAR(128),
  ADD COLUMN IF NOT EXISTS consultation_mode VARCHAR(32) DEFAULT 'In-Person',
  ADD COLUMN IF NOT EXISTS qr_token_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS service_category VARCHAR(128),
  ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS checked_in_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS called_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS called_by TEXT,
  ADD COLUMN IF NOT EXISTS called_acknowledged_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS no_show_marked_by TEXT,
  ADD COLUMN IF NOT EXISTS nurse_vitals_recorded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nurse_vitals_recorded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS nurse_vitals_recorded_by TEXT,
  ADD COLUMN IF NOT EXISTS teleconsult_room_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS teleconsult_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rescheduled_from_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS staff_override_by TEXT,
  ADD COLUMN IF NOT EXISTS staff_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

DROP TRIGGER IF EXISTS trg_appointments_booking_lifecycle ON public.appointments;
CREATE TRIGGER trg_appointments_booking_lifecycle
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.ensure_appointment_booking_reference();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1.5 Consultations Table (SOAP Notes & Monthly Symptom Category Forecasting)
CREATE TABLE IF NOT EXISTS public.consultations (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255) NOT NULL,
    branch TEXT DEFAULT 'Main Outpatient Clinic' NOT NULL,
    consultation_date DATE NOT NULL,
    chief_complaint TEXT NOT NULL,
    symptom_categories TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
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
    is_synthetic BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Outpatient Clinic',
  ADD COLUMN IF NOT EXISTS symptom_categories TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT FALSE;

-- 1.6 Prescriptions Table
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id VARCHAR(64) PRIMARY KEY,
    prescription_number VARCHAR(32) UNIQUE NOT NULL,
    consultation_id VARCHAR(64) REFERENCES public.consultations(id) ON DELETE SET NULL,
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

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Outpatient Clinic',
  ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS dispensed_by TEXT;

-- 1.7 Normalized Prescription Items Table
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    prescription_number VARCHAR(32),
    inventory_item_id VARCHAR(64),
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    dosage VARCHAR(64) NOT NULL,
    form VARCHAR(64) DEFAULT 'Tablet',
    frequency VARCHAR(64) NOT NULL,
    duration VARCHAR(64) NOT NULL,
    instructions TEXT,
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    dispensed_quantity INT DEFAULT 0 CHECK (dispensed_quantity >= 0),
    dispensed BOOLEAN DEFAULT FALSE,
    dispensed_at TIMESTAMP WITH TIME ZONE,
    dispensed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.prescription_items
  ADD COLUMN IF NOT EXISTS inventory_item_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS dispensed_quantity INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispensed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS dispensed_by TEXT;

-- 1.8 Diagnostic Lab Orders Table (Harmonized with 6-Step Lab Workflow)
CREATE TABLE IF NOT EXISTS public.lab_orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(32) UNIQUE NOT NULL,
    consultation_id VARCHAR(64) REFERENCES public.consultations(id) ON DELETE SET NULL,
    appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
    branch TEXT DEFAULT 'Main Outpatient Clinic',
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_mrn VARCHAR(32) NOT NULL,
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    urgency VARCHAR(32) DEFAULT 'Routine' NOT NULL,
    status VARCHAR(32) DEFAULT 'Requested' NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    patient_verified_at TIMESTAMP WITH TIME ZONE,
    patient_verified_by TEXT,
    specimen_id VARCHAR(64),
    specimen_type VARCHAR(128),
    collected_at TIMESTAMP WITH TIME ZONE,
    collected_by TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by TEXT,
    encoded_at TIMESTAMP WITH TIME ZONE,
    encoded_by TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT,
    released_at TIMESTAMP WITH TIME ZONE,
    released_by TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_preliminary BOOLEAN DEFAULT TRUE NOT NULL,
    results JSONB DEFAULT '[]'::jsonb,
    interpretation TEXT,
    ai_summary TEXT,
    amendment_history JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Outpatient Clinic',
  ADD COLUMN IF NOT EXISTS patient_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS patient_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS specimen_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS specimen_type VARCHAR(128),
  ADD COLUMN IF NOT EXISTS collected_by TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS processed_by TEXT,
  ADD COLUMN IF NOT EXISTS encoded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS encoded_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS released_by TEXT,
  ADD COLUMN IF NOT EXISTS is_preliminary BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS amendment_history JSONB DEFAULT '[]'::jsonb;

-- 1.9 Normalized Lab Results Table (Harmonized with serverApp.ts)
CREATE TABLE IF NOT EXISTS public.lab_results (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    order_number VARCHAR(32),
    parameter_name VARCHAR(255) NOT NULL,
    measured_value VARCHAR(128) NOT NULL,
    unit VARCHAR(64),
    reference_range VARCHAR(128),
    status_flag VARCHAR(32) DEFAULT 'Normal' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.10 Pharmacy & Supply Inventory Table (Non-Negative Stock Enforced)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand VARCHAR(128),
    category VARCHAR(128) NOT NULL,
    form VARCHAR(64),
    strength VARCHAR(64),
    batch_number VARCHAR(64) DEFAULT 'BATCH-STD' NOT NULL,
    expiration_date DATE DEFAULT (CURRENT_DATE + INTERVAL '365 days') NOT NULL,
    expiry_date DATE,
    supplier VARCHAR(255),
    stock_quantity INT DEFAULT 0 NOT NULL CHECK (stock_quantity >= 0),
    reorder_level INT DEFAULT 20 NOT NULL CHECK (reorder_level >= 0),
    purchase_price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    selling_price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    unit VARCHAR(32) DEFAULT 'Tablets' NOT NULL,
    location VARCHAR(64),
    branch TEXT DEFAULT 'Main Outpatient Clinic',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Outpatient Clinic';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_non_negative_stock'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_items_non_negative_stock CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- 1.10b Pharmacy Inventory Transactions Ledger (Dispensing, Restock, Adjustments)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('itx-' || gen_random_uuid()::text),
    inventory_item_id VARCHAR(64) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    sku VARCHAR(64) NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('DISPENSE', 'RESTOCK', 'ADJUSTMENT')),
    quantity_delta INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL CHECK (new_stock >= 0),
    prescription_id VARCHAR(64) REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    prescription_number VARCHAR(32),
    prescription_item_id VARCHAR(64),
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255),
    performed_by_id VARCHAR(64) NOT NULL,
    performed_by_name VARCHAR(255) NOT NULL,
    branch TEXT DEFAULT 'Main Outpatient Clinic',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.10c Pharmacy Restock Requests Table
CREATE TABLE IF NOT EXISTS public.restock_requests (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('rst-' || gen_random_uuid()::text),
    request_number VARCHAR(32) UNIQUE NOT NULL,
    inventory_item_id VARCHAR(64) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    sku VARCHAR(64) NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    current_stock INT NOT NULL,
    reorder_level INT NOT NULL,
    requested_quantity INT NOT NULL CHECK (requested_quantity > 0),
    unit VARCHAR(32) NOT NULL,
    supplier VARCHAR(255),
    branch TEXT DEFAULT 'Main Outpatient Clinic' NOT NULL,
    status VARCHAR(32) DEFAULT 'Pending Approval' NOT NULL CHECK (
      status IN ('Pending Approval', 'Approved', 'Received', 'Cancelled')
    ),
    requested_by_id VARCHAR(64) NOT NULL,
    requested_by_name VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    fulfilled_by_name VARCHAR(255),
    notes TEXT
);

-- 1.11 Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(32) UNIQUE NOT NULL,
    appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
    consultation_id VARCHAR(64) REFERENCES public.consultations(id) ON DELETE SET NULL,
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

-- 1.12 Normalized Invoice Line Items Table
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

-- 1.13 Scoped Notifications Table (Supports Call Patient Alerts & Realtime Queue Subscriptions)
CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('notif-' || gen_random_uuid()::text),
    user_id VARCHAR(64),
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    recipient_role VARCHAR(32) DEFAULT 'patient' NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    content TEXT,
    category VARCHAR(64) DEFAULT 'system' NOT NULL,
    priority VARCHAR(32) DEFAULT 'normal' NOT NULL,
    queue_number TEXT,
    room TEXT,
    appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.14 Audit Logs Table (Append-Only for Non-Service Roles)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('aud-' || gen_random_uuid()::text),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1'
);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- 1.15 PWA Web Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    patient_id TEXT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1.16 Predictive Analytics Forecast Runs Table
CREATE TABLE IF NOT EXISTS public.forecast_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    generated_by TEXT,
    branch_filter TEXT NOT NULL DEFAULT 'ALL',
    horizon_months INTEGER NOT NULL CHECK (horizon_months BETWEEN 3 AND 6),
    selected_model TEXT NOT NULL,
    observation_months INTEGER NOT NULL,
    backtest_mae NUMERIC(10, 2),
    backtest_rmse NUMERIC(10, 2),
    backtest_wape NUMERIC(10, 2),
    is_synthetic_dataset BOOLEAN NOT NULL DEFAULT TRUE
);

-- 1.17 Private Server-Only Auth Credentials Store (Strictly service_role ONLY)
CREATE TABLE IF NOT EXISTS public.auth_credentials (
    email VARCHAR(255) PRIMARY KEY,
    hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'patient',
    failed_attempts INT DEFAULT 0,
    locked_until BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_auth_credentials_updated_at ON public.auth_credentials;
CREATE TRIGGER trg_auth_credentials_updated_at
BEFORE UPDATE ON public.auth_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1.18 Private Server-Only Auth OTP Store (Strictly service_role ONLY — NO plaintext OTP column)
CREATE TABLE IF NOT EXISTS public.auth_otps (
    key VARCHAR(255) PRIMARY KEY,
    code_hash VARCHAR(255) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    expires_at BIGINT NOT NULL,
    attempts INT DEFAULT 0,
    last_sent_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.auth_otps DROP COLUMN IF EXISTS code_plain;

-- 1.19 Patient Notification Preferences & Reminder Consent
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    patient_id VARCHAR(64) PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    web_push_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    sms_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    reminder_24h_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    reminder_2h_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    consent_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.20 Scheduled Reminder Delivery Logs (Deduplication & Audit Trail)
CREATE TABLE IF NOT EXISTS public.reminder_delivery_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('rmd-' || gen_random_uuid()::text),
    appointment_id VARCHAR(64) REFERENCES public.appointments(id) ON DELETE CASCADE,
    booking_reference VARCHAR(32),
    patient_id VARCHAR(64) REFERENCES public.patients(id) ON DELETE CASCADE,
    reminder_type VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    status VARCHAR(64) NOT NULL,
    provider_note TEXT,
    scheduled_for_manila VARCHAR(64),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (appointment_id, reminder_type, channel, scheduled_for_manila)
);

-- 1.21 Clinic Operational Settings (Grace Period & 10-Minute Inactivity Timeout)
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    no_show_grace_minutes INT DEFAULT 30 NOT NULL CHECK (no_show_grace_minutes BETWEEN 5 AND 180),
    inactivity_timeout_seconds INT DEFAULT 600 NOT NULL CHECK (inactivity_timeout_seconds BETWEEN 120 AND 3600),
    inactivity_warning_seconds INT DEFAULT 60 NOT NULL CHECK (inactivity_warning_seconds BETWEEN 15 AND 300),
    allow_online_consultations BOOLEAN DEFAULT TRUE NOT NULL,
    default_reminder_24h BOOLEAN DEFAULT TRUE NOT NULL,
    default_reminder_2h BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by VARCHAR(64)
);

INSERT INTO public.clinic_settings (id, no_show_grace_minutes, inactivity_timeout_seconds, inactivity_warning_seconds)
VALUES ('default', 30, 600, 60)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. SUPABASE AUTH IDENTITY MAPPING & PRIVILEGE-ESCALATION GUARDS
-- ==============================================================================

-- Resolves the caller's verified application role from public.users mapped by auth.uid().
-- NEVER trusts client-editable `user_metadata`.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_sub_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT u.role, u.sub_role
    INTO v_role, v_sub_role
    FROM public.users u
   WHERE u.auth_user_id = v_uid
     AND u.is_active = TRUE
   LIMIT 1;

  IF v_role = 'staff' AND v_sub_role IS NOT NULL THEN
    IF v_sub_role = 'lab_tech' THEN
      RETURN 'lab_technician';
    END IF;
    RETURN v_sub_role;
  END IF;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Fallback strictly to server-controlled app_metadata (never user_metadata)
  v_role := auth.jwt() -> 'app_metadata' ->> 'role';
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  IF EXISTS (SELECT 1 FROM public.patients p WHERE p.auth_user_id = v_uid) THEN
    RETURN 'patient';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS VARCHAR(64)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
    FROM public.users u
   WHERE u.auth_user_id = auth.uid()
     AND u.is_active = TRUE
   LIMIT 1;
$$;

-- STRICT PATIENT IDENTITY MAPPING (Phase 1.2):
-- Resolves the caller's patient chart STRICTLY via verified `auth_user_id = auth.uid()`.
-- Email-only fallback matching has been removed to prevent cross-account record access.
CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS VARCHAR(64)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
    FROM public.patients p
   WHERE p.auth_user_id = (SELECT auth.uid())
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() = 'admin', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_clinical_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_app_role() IN ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() = ANY(allowed_roles), FALSE);
$$;

-- Verifies whether the current execution context is a trusted server `service_role` JWT
-- OR a genuine database superuser/Auth-trigger execution (WITHOUT an anon/authenticated PostgREST JWT).
-- Executed as SECURITY INVOKER so `current_user` reflects the actual caller, never a function owner!
CREATE OR REPLACE FUNCTION public.is_trusted_db_admin_or_service_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF (SELECT auth.role()) = 'service_role' OR v_jwt_role = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role')
     AND v_jwt_role NOT IN ('anon', 'authenticated') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Authorized administrative procedure to link an existing unlinked patient record to a verified Auth account
CREATE OR REPLACE FUNCTION public.admin_link_patient_auth_user(
  p_patient_id VARCHAR(64),
  p_auth_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_trusted_db_admin_or_service_role()) THEN
    RAISE EXCEPTION 'Forbidden: only verified administrators may link existing patient records to Auth identities.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.patients
     SET auth_user_id = p_auth_user_id,
         updated_at = timezone('utc'::text, now())
   WHERE id = p_patient_id;
END;
$$;

-- Automatically maps confirmed Supabase Auth accounts to public.users / public.patients.
-- Security guarantees:
-- 1. Pre-provisioned staff/admin `public.users` rows are ONLY bound once `NEW.email_confirmed_at IS NOT NULL`.
-- 2. NEVER auto-claims pre-existing `public.patients` charts by email alone (prevents medical chart hijacking).
-- 3. Self-signups NEVER trust client-supplied `raw_user_meta_data ->> 'role'` and ALWAYS receive `role = 'patient'`.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing_user_id VARCHAR(64);
  v_existing_role VARCHAR(32);
  v_full_name TEXT;
  v_new_pat_id VARCHAR(64);
  v_mrn VARCHAR(32);
  v_email_verified BOOLEAN := (NEW.email_confirmed_at IS NOT NULL);
BEGIN
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  SELECT u.id, u.role
    INTO v_existing_user_id, v_existing_role
    FROM public.users u
   WHERE u.auth_user_id = NEW.id
   LIMIT 1;

  IF v_existing_user_id IS NULL THEN
    SELECT u.id, u.role
      INTO v_existing_user_id, v_existing_role
      FROM public.users u
     WHERE LOWER(u.email) = LOWER(NEW.email)
       AND u.auth_user_id IS NULL
     LIMIT 1;

    IF v_existing_user_id IS NOT NULL THEN
      IF v_email_verified THEN
        UPDATE public.users
           SET auth_user_id = NEW.id,
               updated_at = timezone('utc'::text, now())
         WHERE id = v_existing_user_id
           AND auth_user_id IS NULL;
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      INSERT INTO public.users (id, auth_user_id, email, full_name, role, sub_role, is_active)
      VALUES (
        'usr-' || SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 16),
        NEW.id,
        LOWER(NEW.email),
        v_full_name,
        'patient',
        NULL,
        TRUE
      )
      ON CONFLICT (email) DO NOTHING;

      v_existing_role := 'patient';
    END IF;
  END IF;

  -- Provision an isolated auth_user_id-bound patient record for patient accounts if none is linked yet.
  -- Existing unlinked patient charts are NEVER auto-claimed by email; an administrator must link them explicitly.
  IF COALESCE(v_existing_role, 'patient') = 'patient' THEN
    IF NOT EXISTS (SELECT 1 FROM public.patients WHERE auth_user_id = NEW.id) THEN
      v_new_pat_id := 'pat-' || SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 16);
      v_mrn := 'MRN-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
               UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 6));

      INSERT INTO public.patients (
        id, auth_user_id, mrn, full_name, dob, age, gender, blood_type, phone, email, address
      )
      VALUES (
        v_new_pat_id,
        NEW.id,
        v_mrn,
        v_full_name,
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'dob', '')::DATE, DATE '1995-01-01'),
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'age', '')::INT, 30),
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'gender', ''), 'Other'),
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'blood_type', ''), 'O+'),
        COALESCE(NULLIF(NEW.phone, ''), NULLIF(NEW.raw_user_meta_data ->> 'phone', ''), '+63 900 000 0000'),
        LOWER(NEW.email),
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'address', ''), 'Metro Manila (Synthetic)')
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Phase 1.1 Fix: SECURITY INVOKER trigger preventing non-admin users from escalating their own role
-- or altering protected account attributes (no SECURITY DEFINER `current_user` bypass!).
CREATE OR REPLACE FUNCTION public.guard_user_profile_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_admin_or_service_role() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role <> 'patient' OR NEW.sub_role IS NOT NULL THEN
      RAISE EXCEPTION 'Privilege escalation blocked: self-registered accounts must have role = patient.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.auth_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Identity mismatch: auth_user_id must match authenticated user.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.sub_role IS DISTINCT FROM OLD.sub_role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
       OR LOWER(NEW.email) IS DISTINCT FROM LOWER(OLD.email)
       OR NEW.license_number IS DISTINCT FROM OLD.license_number
       OR NEW.department IS DISTINCT FROM OLD.department
       OR NEW.specialty IS DISTINCT FROM OLD.specialty THEN
      RAISE EXCEPTION 'Unauthorized profile modification: role, active status, credentials, and identity fields cannot be modified by non-administrators.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_role_escalation ON public.users;
CREATE TRIGGER trg_guard_user_role_escalation
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_user_profile_mutation();

-- Phase 1.1 Fix: SECURITY INVOKER trigger preventing patients from modifying clinical/MRN/provider fields
CREATE OR REPLACE FUNCTION public.guard_patient_profile_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_admin_or_service_role()
     OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist']) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.auth_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden: patients may only create a profile bound to their own authenticated identity.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.mrn IS DISTINCT FROM OLD.mrn
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.primary_doctor_id IS DISTINCT FROM OLD.primary_doctor_id
     OR NEW.vitals_history IS DISTINCT FROM OLD.vitals_history
     OR NEW.triage_history IS DISTINCT FROM OLD.triage_history
     OR NEW.current_medications IS DISTINCT FROM OLD.current_medications
     OR NEW.tags IS DISTINCT FROM OLD.tags THEN
    RAISE EXCEPTION 'Forbidden: clinical chart fields (MRN, vitals, triage, medications, assigned physician, identity binding) may only be modified by authorized clinical staff.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_patient_profile_mutation ON public.patients;
CREATE TRIGGER trg_guard_patient_profile_mutation
BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.guard_patient_profile_mutation();

-- Phase 1.1 Fix: SECURITY INVOKER trigger restricting patient-initiated appointment updates
CREATE OR REPLACE FUNCTION public.guard_patient_appointment_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_manila_today DATE := (timezone('Asia/Manila', now()))::DATE;
BEGIN
  IF public.is_trusted_db_admin_or_service_role()
     OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist']) THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('Completed', 'In Consultation', 'No Show') THEN
    RAISE EXCEPTION 'Forbidden: finalized or active clinical consultations cannot be altered by patients.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.patient_mrn IS DISTINCT FROM OLD.patient_mrn
     OR NEW.booking_reference IS DISTINCT FROM OLD.booking_reference
     OR NEW.qr_token_hash IS DISTINCT FROM OLD.qr_token_hash
     OR NEW.is_walk_in IS DISTINCT FROM OLD.is_walk_in
     OR NEW.is_synthetic IS DISTINCT FROM OLD.is_synthetic
     OR NEW.queue_number IS DISTINCT FROM OLD.queue_number
     OR NEW.room IS DISTINCT FROM OLD.room
     OR NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
     OR NEW.checked_in_by IS DISTINCT FROM OLD.checked_in_by
     OR NEW.called_at IS DISTINCT FROM OLD.called_at
     OR NEW.called_by IS DISTINCT FROM OLD.called_by
     OR NEW.consultation_started_at IS DISTINCT FROM OLD.consultation_started_at
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NEW.no_show_marked_at IS DISTINCT FROM OLD.no_show_marked_at
     OR NEW.no_show_marked_by IS DISTINCT FROM OLD.no_show_marked_by
     OR NEW.staff_override_by IS DISTINCT FROM OLD.staff_override_by
     OR NEW.staff_override_reason IS DISTINCT FROM OLD.staff_override_reason THEN
    RAISE EXCEPTION 'Forbidden: queue assignment, QR hash, room, walk-in flag, clinical timestamps, and staff override fields can only be modified by clinic staff.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.called_acknowledged_at IS DISTINCT FROM OLD.called_acknowledged_at
     AND OLD.status <> 'Called' THEN
    RAISE EXCEPTION 'Forbidden: call acknowledgment is only valid while appointment status is Called.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
     AND NEW.appointment_date <= v_manila_today THEN
    RAISE EXCEPTION 'Same-day online booking is unavailable. Please select an available date starting tomorrow.'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('Confirmed', 'Scheduled', 'Cancelled') THEN
    RAISE EXCEPTION 'Forbidden: patients may only reschedule (Confirmed) or cancel (Cancelled) their appointment.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_patient_appointment_mutation ON public.appointments;
CREATE TRIGGER trg_guard_patient_appointment_mutation
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.guard_patient_appointment_mutation();

-- Helper parsing 'HH:MM' or 'HH:MM AM/PM' into minutes since midnight for interval overlap checks
CREATE OR REPLACE FUNCTION public.parse_appointment_minutes(p_time TEXT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_clean TEXT := UPPER(btrim(COALESCE(p_time, '')));
  v_match TEXT[];
  v_hours INT;
  v_mins INT;
BEGIN
  v_match := regexp_match(v_clean, '^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$');
  IF v_match IS NULL THEN
    RETURN NULL;
  END IF;
  v_hours := v_match[1]::INT;
  v_mins := v_match[2]::INT;
  IF v_match[3] = 'PM' AND v_hours < 12 THEN
    v_hours := v_hours + 12;
  ELSIF v_match[3] = 'AM' AND v_hours = 12 THEN
    v_hours := 0;
  END IF;
  RETURN v_hours * 60 + v_mins;
END;
$$;

-- Phase 3.5 & 3.6 Database-Level Guard:
-- 1. Blocks patient same-day/past online bookings in `Asia/Manila` (preserves staff walk-in registration).
-- 2. Prevents overlapping appointments for the same doctor across both In-Person and Online Consultation.
CREATE OR REPLACE FUNCTION public.guard_appointment_booking_and_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_manila_today DATE := (timezone('Asia/Manila', now()))::DATE;
  v_new_start INT;
  v_new_end INT;
  v_conflict_ref TEXT;
BEGIN
  IF COALESCE(NEW.is_synthetic, FALSE) = TRUE OR NEW.status IN ('Cancelled', 'No Show') THEN
    RETURN NEW;
  END IF;

  -- Enforce No-Same-Day / No-Past Date for patient online bookings
  IF COALESCE(NEW.is_walk_in, FALSE) = FALSE
     AND NOT public.is_trusted_db_admin_or_service_role()
     AND NOT public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist']) THEN
    IF TG_OP = 'INSERT' OR NEW.appointment_date IS DISTINCT FROM OLD.appointment_date THEN
      IF NEW.appointment_date <= v_manila_today THEN
        RAISE EXCEPTION 'Same-day online booking is unavailable. Please select an available date starting tomorrow.'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  -- Interval overlap check across In-Person & Online Consultation for non-walk-in doctor slots
  IF COALESCE(NEW.is_walk_in, FALSE) = FALSE AND NEW.doctor_id IS NOT NULL THEN
    v_new_start := public.parse_appointment_minutes(NEW.appointment_time);
    IF v_new_start IS NOT NULL THEN
      v_new_end := v_new_start + GREATEST(COALESCE(NEW.duration_minutes, 30), 15);

      SELECT a.booking_reference
        INTO v_conflict_ref
        FROM public.appointments a
       WHERE a.doctor_id = NEW.doctor_id
         AND a.appointment_date = NEW.appointment_date
         AND a.id <> NEW.id
         AND COALESCE(a.is_walk_in, FALSE) = FALSE
         AND COALESCE(a.is_synthetic, FALSE) = FALSE
         AND a.status IN ('Scheduled', 'Confirmed', 'Checked In', 'Called', 'In Consultation')
         AND public.parse_appointment_minutes(a.appointment_time) IS NOT NULL
         AND v_new_start < (public.parse_appointment_minutes(a.appointment_time) + GREATEST(COALESCE(a.duration_minutes, 30), 15))
         AND public.parse_appointment_minutes(a.appointment_time) < v_new_end
       LIMIT 1;

      IF v_conflict_ref IS NOT NULL THEN
        RAISE EXCEPTION 'Selected doctor schedule overlaps with an existing reserved slot (%). Please select another time.', v_conflict_ref
          USING ERRCODE = '23505';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_appointment_booking_and_overlap ON public.appointments;
CREATE TRIGGER trg_guard_appointment_booking_and_overlap
BEFORE INSERT OR UPDATE OF doctor_id, appointment_date, appointment_time, duration_minutes, status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.guard_appointment_booking_and_overlap();

-- Phase 1.3 Notification Mutation Guard:
-- Ensures non-admin recipients can ONLY acknowledge/mark-read their own notifications without altering ownership or content.
CREATE OR REPLACE FUNCTION public.guard_notification_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_admin_or_service_role() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
     OR NEW.recipient_role IS DISTINCT FROM OLD.recipient_role
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.appointment_id IS DISTINCT FROM OLD.appointment_id THEN
    RAISE EXCEPTION 'Forbidden: notification recipients may only update read or acknowledged_at status.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_notification_mutation ON public.notifications;
CREATE TRIGGER trg_guard_notification_mutation
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.guard_notification_mutation();

-- Phase 9.3 Atomic Pharmacy Dispense Transaction RPC:
-- Deducts inventory stock ONLY on authorized pharmacist dispensing, locks inventory row FOR UPDATE,
-- blocks duplicate dispensing and negative quantities, and writes an audit ledger entry.
CREATE OR REPLACE FUNCTION public.dispense_prescription_item_atomic(
  p_prescription_id VARCHAR(64),
  p_prescription_item_id VARCHAR(64),
  p_inventory_item_id VARCHAR(64),
  p_dispense_qty INT,
  p_pharmacist_id VARCHAR(64),
  p_pharmacist_name VARCHAR(255),
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_rx RECORD;
  v_item RECORD;
  v_new_stock INT;
  v_new_dispensed INT;
  v_all_dispensed BOOLEAN;
  v_any_dispensed BOOLEAN;
  v_rx_status VARCHAR(32);
  v_tx_id VARCHAR(64) := 'itx-' || gen_random_uuid()::text;
BEGIN
  IF NOT (public.is_trusted_db_admin_or_service_role() OR public.has_any_role(ARRAY['admin', 'pharmacist'])) THEN
    RAISE EXCEPTION 'Forbidden: only authorized pharmacists or administrators may dispense medication.'
      USING ERRCODE = '42501';
  END IF;

  IF p_dispense_qty IS NULL OR p_dispense_qty <= 0 THEN
    RAISE EXCEPTION 'Invalid dispense quantity: must be greater than zero.'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_rx FROM public.prescriptions WHERE id = p_prescription_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_item
    FROM public.prescription_items
   WHERE id = p_prescription_item_id AND prescription_id = p_prescription_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription line item not found.' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_item.dispensed, FALSE) = TRUE OR COALESCE(v_item.dispensed_quantity, 0) >= v_item.quantity THEN
    RAISE EXCEPTION 'Duplicate dispensing blocked: this prescription item has already been fully dispensed.'
      USING ERRCODE = '23505';
  END IF;

  IF COALESCE(v_item.dispensed_quantity, 0) + p_dispense_qty > v_item.quantity THEN
    RAISE EXCEPTION 'Dispense quantity exceeds remaining prescribed quantity (% remaining).',
      (v_item.quantity - COALESCE(v_item.dispensed_quantity, 0))
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_inv FROM public.inventory_items WHERE id = p_inventory_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_inv.stock_quantity < p_dispense_qty THEN
    RAISE EXCEPTION 'Insufficient stock for %: % available, % requested.',
      v_inv.name, v_inv.stock_quantity, p_dispense_qty
      USING ERRCODE = '22023';
  END IF;

  v_new_stock := v_inv.stock_quantity - p_dispense_qty;
  v_new_dispensed := COALESCE(v_item.dispensed_quantity, 0) + p_dispense_qty;

  UPDATE public.inventory_items
     SET stock_quantity = v_new_stock,
         last_updated = timezone('utc'::text, now())
   WHERE id = p_inventory_item_id;

  UPDATE public.prescription_items
     SET inventory_item_id = p_inventory_item_id,
         dispensed_quantity = v_new_dispensed,
         dispensed = (v_new_dispensed >= quantity),
         dispensed_at = timezone('utc'::text, now()),
         dispensed_by = p_pharmacist_name
   WHERE id = p_prescription_item_id;

  SELECT BOOL_AND(COALESCE(dispensed, FALSE)), BOOL_OR(COALESCE(dispensed_quantity, 0) > 0)
    INTO v_all_dispensed, v_any_dispensed
    FROM public.prescription_items
   WHERE prescription_id = p_prescription_id;

  v_rx_status := CASE
    WHEN v_all_dispensed THEN 'Dispensed'
    WHEN v_any_dispensed THEN 'Partially Dispensed'
    ELSE v_rx.status
  END;

  UPDATE public.prescriptions
     SET status = v_rx_status,
         dispensed_at = timezone('utc'::text, now()),
         dispensed_by = p_pharmacist_name
   WHERE id = p_prescription_id;

  INSERT INTO public.inventory_transactions (
    id, inventory_item_id, sku, medication_name, transaction_type,
    quantity_delta, previous_stock, new_stock, prescription_id,
    prescription_number, prescription_item_id, patient_id, patient_name,
    performed_by_id, performed_by_name, branch, notes
  ) VALUES (
    v_tx_id, v_inv.id, v_inv.sku, v_inv.name, 'DISPENSE',
    -p_dispense_qty, v_inv.stock_quantity, v_new_stock, v_rx.id,
    v_rx.prescription_number, v_item.id, v_rx.patient_id, v_rx.patient_name,
    p_pharmacist_id, p_pharmacist_name, COALESCE(v_inv.branch, 'Main Outpatient Clinic'), p_notes
  );

  RETURN jsonb_build_object(
    'transactionId', v_tx_id,
    'inventoryItemId', v_inv.id,
    'previousStock', v_inv.stock_quantity,
    'newStock', v_new_stock,
    'prescriptionStatus', v_rx_status,
    'dispensedQuantity', v_new_dispensed
  );
END;
$$;

-- Privacy-safe RPC returning booked time slots WITHOUT exposing patient names, MRNs, or clinical reasons
CREATE OR REPLACE FUNCTION public.get_booked_appointment_slots(
  p_date DATE,
  p_doctor_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  doctor_id VARCHAR(64),
  appointment_date DATE,
  appointment_time VARCHAR(16),
  duration_minutes INT,
  status VARCHAR(32)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.doctor_id,
         a.appointment_date,
         a.appointment_time,
         COALESCE(a.duration_minutes, 30) AS duration_minutes,
         a.status
    FROM public.appointments a
   WHERE a.appointment_date = p_date
     AND (p_doctor_id IS NULL OR a.doctor_id = p_doctor_id)
     AND a.status NOT IN ('Cancelled', 'No Show')
     AND COALESCE(a.is_synthetic, FALSE) = FALSE;
$$;

-- ==============================================================================
-- 3. CORE ROLE VIEWS (Configured with security_invoker = true)
-- ==============================================================================

CREATE OR REPLACE VIEW public.doctors
WITH (security_invoker = true) AS
  SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users
   WHERE role = 'doctor';

CREATE OR REPLACE VIEW public.nurses
WITH (security_invoker = true) AS
  SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users
   WHERE role = 'nurse' OR (role = 'staff' AND sub_role = 'nurse');

CREATE OR REPLACE VIEW public.receptionists
WITH (security_invoker = true) AS
  SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users
   WHERE role = 'receptionist' OR (role = 'staff' AND sub_role = 'receptionist');

CREATE OR REPLACE VIEW public.pharmacists
WITH (security_invoker = true) AS
  SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users
   WHERE role = 'pharmacist' OR (role = 'staff' AND sub_role = 'pharmacist');

CREATE OR REPLACE VIEW public.lab_technicians
WITH (security_invoker = true) AS
  SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users
   WHERE role = 'lab_technician' OR (role = 'staff' AND sub_role IN ('lab_tech', 'lab_technician'));

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) — STRICT ROLE-BASED & PATIENT-ISOLATED POLICIES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;

-- Force RLS on private authentication tables so only service_role (which bypasses RLS in Supabase) or explicit policy can read
ALTER TABLE public.auth_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otps FORCE ROW LEVEL SECURITY;

-- Programmatically purge any pre-existing public schema policies so no legacy permissive rules survive
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- 4.1 public.users Policies
-- Patients may view their own user profile and active physicians (for booking/prescriptions);
-- clinical staff may view active staff directory; administrators have full directory visibility.
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_admin()
    OR (is_active = TRUE AND role = 'doctor')
    OR (public.is_clinical_staff() AND role <> 'patient')
    OR public.has_any_role(ARRAY['doctor', 'nurse', 'receptionist'])
  );

DROP POLICY IF EXISTS "users_insert_self_patient_or_admin" ON public.users;
CREATE POLICY "users_insert_self_patient_or_admin" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (auth_user_id = auth.uid() AND role = 'patient' AND sub_role IS NULL)
  );

DROP POLICY IF EXISTS "users_update_self_or_admin" ON public.users;
CREATE POLICY "users_update_self_or_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_delete_admin_only" ON public.users;
CREATE POLICY "users_delete_admin_only" ON public.users
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.2 public.staff Policies
DROP POLICY IF EXISTS "staff_select_authenticated" ON public.staff;
CREATE POLICY "staff_select_authenticated" ON public.staff
  FOR SELECT TO authenticated
  USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "staff_manage_admin_only" ON public.staff;
CREATE POLICY "staff_manage_admin_only" ON public.staff
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.3 public.patients Policies (Patients isolated to own row; authorized clinical roles only)
DROP POLICY IF EXISTS "patients_select_own_or_authorized_staff" ON public.patients;
CREATE POLICY "patients_select_own_or_authorized_staff" ON public.patients
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  );

DROP POLICY IF EXISTS "patients_insert_self_or_intake_staff" ON public.patients;
CREATE POLICY "patients_insert_self_or_intake_staff" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  );

DROP POLICY IF EXISTS "patients_update_own_or_clinical_staff" ON public.patients;
CREATE POLICY "patients_update_own_or_clinical_staff" ON public.patients
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  );

DROP POLICY IF EXISTS "patients_delete_admin_only" ON public.patients;
CREATE POLICY "patients_delete_admin_only" ON public.patients
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.4 public.appointments Policies
DROP POLICY IF EXISTS "appointments_select_own_or_staff" ON public.appointments;
CREATE POLICY "appointments_select_own_or_staff" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  );

DROP POLICY IF EXISTS "appointments_insert_own_booking_or_staff" ON public.appointments;
CREATE POLICY "appointments_insert_own_booking_or_staff" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      patient_id = public.current_patient_id()
      AND COALESCE(is_walk_in, FALSE) = FALSE
      AND queue_number IS NULL
      AND status IN ('Confirmed', 'Scheduled')
    )
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  );

DROP POLICY IF EXISTS "appointments_update_own_or_staff" ON public.appointments;
CREATE POLICY "appointments_update_own_or_staff" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist'])
  );

DROP POLICY IF EXISTS "appointments_delete_admin_only" ON public.appointments;
CREATE POLICY "appointments_delete_admin_only" ON public.appointments
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.5 public.consultations Policies (Restricted to patient owner, doctors, nurses, and admin)
DROP POLICY IF EXISTS "consultations_select_own_or_clinical" ON public.consultations;
CREATE POLICY "consultations_select_own_or_clinical" ON public.consultations
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse'])
  );

DROP POLICY IF EXISTS "consultations_insert_doctor_or_admin" ON public.consultations;
CREATE POLICY "consultations_insert_doctor_or_admin" ON public.consultations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor']));

DROP POLICY IF EXISTS "consultations_update_doctor_or_admin" ON public.consultations;
CREATE POLICY "consultations_update_doctor_or_admin" ON public.consultations
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'doctor']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor']));

DROP POLICY IF EXISTS "consultations_delete_admin_only" ON public.consultations;
CREATE POLICY "consultations_delete_admin_only" ON public.consultations
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.6 public.prescriptions & public.prescription_items Policies
DROP POLICY IF EXISTS "prescriptions_select_authorized" ON public.prescriptions;
CREATE POLICY "prescriptions_select_authorized" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'pharmacist', 'nurse'])
  );

DROP POLICY IF EXISTS "prescriptions_insert_prescriber" ON public.prescriptions;
CREATE POLICY "prescriptions_insert_prescriber" ON public.prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor']));

DROP POLICY IF EXISTS "prescriptions_update_prescriber_or_pharmacist" ON public.prescriptions;
CREATE POLICY "prescriptions_update_prescriber_or_pharmacist" ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'doctor', 'pharmacist']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor', 'pharmacist']));

DROP POLICY IF EXISTS "prescriptions_delete_admin_only" ON public.prescriptions;
CREATE POLICY "prescriptions_delete_admin_only" ON public.prescriptions
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "prescription_items_select_authorized" ON public.prescription_items;
CREATE POLICY "prescription_items_select_authorized" ON public.prescription_items
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(ARRAY['admin', 'doctor', 'pharmacist', 'nurse'])
    OR EXISTS (
      SELECT 1
        FROM public.prescriptions rx
       WHERE rx.id = prescription_items.prescription_id
         AND rx.patient_id = public.current_patient_id()
    )
  );

DROP POLICY IF EXISTS "prescription_items_write_prescriber_or_pharmacist" ON public.prescription_items;
CREATE POLICY "prescription_items_write_prescriber_or_pharmacist" ON public.prescription_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor']));

DROP POLICY IF EXISTS "prescription_items_update_prescriber_or_pharmacist" ON public.prescription_items;
CREATE POLICY "prescription_items_update_prescriber_or_pharmacist" ON public.prescription_items
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'doctor', 'pharmacist']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor', 'pharmacist']));

DROP POLICY IF EXISTS "prescription_items_delete_admin_only" ON public.prescription_items;
CREATE POLICY "prescription_items_delete_admin_only" ON public.prescription_items
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.7 public.lab_orders & public.lab_results Policies
DROP POLICY IF EXISTS "lab_orders_select_authorized" ON public.lab_orders;
CREATE POLICY "lab_orders_select_authorized" ON public.lab_orders
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'lab_technician'])
  );

DROP POLICY IF EXISTS "lab_orders_insert_clinical_or_lab" ON public.lab_orders;
CREATE POLICY "lab_orders_insert_clinical_or_lab" ON public.lab_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor', 'lab_technician']));

DROP POLICY IF EXISTS "lab_orders_update_clinical_or_lab" ON public.lab_orders;
CREATE POLICY "lab_orders_update_clinical_or_lab" ON public.lab_orders
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'doctor', 'lab_technician']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor', 'lab_technician']));

DROP POLICY IF EXISTS "lab_orders_delete_admin_only" ON public.lab_orders;
CREATE POLICY "lab_orders_delete_admin_only" ON public.lab_orders
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "lab_results_select_authorized" ON public.lab_results;
CREATE POLICY "lab_results_select_authorized" ON public.lab_results
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'lab_technician'])
    OR EXISTS (
      SELECT 1
        FROM public.lab_orders lo
       WHERE lo.id = lab_results.order_id
         AND lo.patient_id = public.current_patient_id()
         AND lo.status IN ('Released', 'Result Available', 'Reviewed', 'Completed')
         AND COALESCE(lo.is_preliminary, FALSE) = FALSE
    )
  );

DROP POLICY IF EXISTS "lab_results_insert_lab_or_doctor" ON public.lab_results;
CREATE POLICY "lab_results_insert_lab_or_doctor" ON public.lab_results
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor', 'lab_technician']));

DROP POLICY IF EXISTS "lab_results_update_lab_or_doctor" ON public.lab_results;
CREATE POLICY "lab_results_update_lab_or_doctor" ON public.lab_results
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'doctor', 'lab_technician']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor', 'lab_technician']));

DROP POLICY IF EXISTS "lab_results_delete_admin_only" ON public.lab_results;
CREATE POLICY "lab_results_delete_admin_only" ON public.lab_results
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.8 public.inventory_items Policies (No patient access)
DROP POLICY IF EXISTS "inventory_select_clinical_staff" ON public.inventory_items;
CREATE POLICY "inventory_select_clinical_staff" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'pharmacist', 'doctor', 'nurse']));

DROP POLICY IF EXISTS "inventory_insert_pharmacy_or_admin" ON public.inventory_items;
CREATE POLICY "inventory_insert_pharmacy_or_admin" ON public.inventory_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'pharmacist']));

DROP POLICY IF EXISTS "inventory_update_pharmacy_or_admin" ON public.inventory_items;
CREATE POLICY "inventory_update_pharmacy_or_admin" ON public.inventory_items
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'pharmacist']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'pharmacist']));

DROP POLICY IF EXISTS "inventory_delete_admin_only" ON public.inventory_items;
CREATE POLICY "inventory_delete_admin_only" ON public.inventory_items
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.8b public.inventory_transactions & public.restock_requests Policies
DROP POLICY IF EXISTS "inventory_transactions_select_pharmacy_or_admin" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_select_pharmacy_or_admin" ON public.inventory_transactions
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'pharmacist', 'doctor']));

DROP POLICY IF EXISTS "inventory_transactions_insert_pharmacy_or_admin" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_insert_pharmacy_or_admin" ON public.inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'pharmacist']));

DROP POLICY IF EXISTS "restock_requests_select_pharmacy_or_admin" ON public.restock_requests;
CREATE POLICY "restock_requests_select_pharmacy_or_admin" ON public.restock_requests
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'pharmacist']));

DROP POLICY IF EXISTS "restock_requests_write_pharmacy_or_admin" ON public.restock_requests;
CREATE POLICY "restock_requests_write_pharmacy_or_admin" ON public.restock_requests
  FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'pharmacist']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'pharmacist']));

-- 4.9 public.invoices & public.invoice_items Policies
DROP POLICY IF EXISTS "invoices_select_own_or_billing_staff" ON public.invoices;
CREATE POLICY "invoices_select_own_or_billing_staff" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'receptionist'])
  );

DROP POLICY IF EXISTS "invoices_insert_billing_staff" ON public.invoices;
CREATE POLICY "invoices_insert_billing_staff" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'receptionist']));

DROP POLICY IF EXISTS "invoices_update_billing_staff" ON public.invoices;
CREATE POLICY "invoices_update_billing_staff" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'receptionist']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'receptionist']));

DROP POLICY IF EXISTS "invoices_delete_admin_only" ON public.invoices;
CREATE POLICY "invoices_delete_admin_only" ON public.invoices
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "invoice_items_select_own_or_billing_staff" ON public.invoice_items;
CREATE POLICY "invoice_items_select_own_or_billing_staff" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(ARRAY['admin', 'receptionist'])
    OR EXISTS (
      SELECT 1
        FROM public.invoices inv
       WHERE inv.id = invoice_items.invoice_id
         AND inv.patient_id = public.current_patient_id()
    )
  );

DROP POLICY IF EXISTS "invoice_items_insert_billing_staff" ON public.invoice_items;
CREATE POLICY "invoice_items_insert_billing_staff" ON public.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'receptionist']));

DROP POLICY IF EXISTS "invoice_items_update_billing_staff" ON public.invoice_items;
CREATE POLICY "invoice_items_update_billing_staff" ON public.invoice_items
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'receptionist']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'receptionist']));

DROP POLICY IF EXISTS "invoice_items_delete_admin_only" ON public.invoice_items;
CREATE POLICY "invoice_items_delete_admin_only" ON public.invoice_items
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4.10 public.notifications Policies (Strictly recipient-scoped)
DROP POLICY IF EXISTS "notifications_select_recipient" ON public.notifications;
CREATE POLICY "notifications_select_recipient" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (patient_id IS NOT NULL AND patient_id = public.current_patient_id())
    OR (user_id IS NOT NULL AND (user_id = auth.uid()::text OR user_id = public.current_user_id() OR user_id = public.current_patient_id()))
    OR (doctor_id IS NOT NULL AND doctor_id = public.current_user_id())
    OR (
      public.is_clinical_staff()
      AND recipient_role IN ('provider', public.current_app_role())
      AND patient_id IS NULL
    )
  );

DROP POLICY IF EXISTS "notifications_insert_staff_or_own" ON public.notifications;
CREATE POLICY "notifications_insert_staff_or_own" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_clinical_staff()
    OR (patient_id IS NOT NULL AND patient_id = public.current_patient_id())
  );

DROP POLICY IF EXISTS "notifications_update_recipient_ack" ON public.notifications;
CREATE POLICY "notifications_update_recipient_ack" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (patient_id IS NOT NULL AND patient_id = public.current_patient_id())
    OR (user_id IS NOT NULL AND (user_id = auth.uid()::text OR user_id = public.current_user_id() OR user_id = public.current_patient_id()))
    OR (doctor_id IS NOT NULL AND doctor_id = public.current_user_id())
  )
  WITH CHECK (
    public.is_admin()
    OR (patient_id IS NOT NULL AND patient_id = public.current_patient_id())
    OR (user_id IS NOT NULL AND (user_id = auth.uid()::text OR user_id = public.current_user_id() OR user_id = public.current_patient_id()))
    OR (doctor_id IS NOT NULL AND doctor_id = public.current_user_id())
  );

-- 4.11 public.audit_logs Policies (Admin read-only; authenticated append-only for own actor ID)
DROP POLICY IF EXISTS "audit_logs_select_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin_only" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_authenticated_self" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated_self" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (
      auth.uid()::text,
      COALESCE(public.current_user_id(), ''),
      COALESCE(public.current_patient_id(), '')
    )
  );

-- 4.12 public.push_subscriptions Policies
DROP POLICY IF EXISTS "Patients manage own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_manage_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_manage_own" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()::text
    OR user_id = public.current_user_id()
    OR (patient_id IS NOT NULL AND patient_id = public.current_patient_id())
  )
  WITH CHECK (
    user_id = auth.uid()::text
    OR user_id = public.current_user_id()
    OR (patient_id IS NOT NULL AND patient_id = public.current_patient_id())
  );

-- 4.13 public.forecast_runs Policies (Phase 14.1: Readable by Admin, Doctor, and Authorized Clinic Staff/Nurse)
DROP POLICY IF EXISTS "Admins read and insert forecast runs" ON public.forecast_runs;
DROP POLICY IF EXISTS "forecast_runs_admin_only" ON public.forecast_runs;
DROP POLICY IF EXISTS "forecast_runs_select_authorized" ON public.forecast_runs;
CREATE POLICY "forecast_runs_select_authorized" ON public.forecast_runs
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist']));

DROP POLICY IF EXISTS "forecast_runs_insert_authorized" ON public.forecast_runs;
CREATE POLICY "forecast_runs_insert_authorized" ON public.forecast_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'receptionist']));

-- 4.13b public.notification_preferences, public.reminder_delivery_logs, public.clinic_settings Policies
DROP POLICY IF EXISTS "notification_preferences_own_or_staff" ON public.notification_preferences;
CREATE POLICY "notification_preferences_own_or_staff" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'receptionist', 'nurse'])
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'receptionist', 'nurse'])
  );

DROP POLICY IF EXISTS "reminder_delivery_logs_own_or_staff" ON public.reminder_delivery_logs;
CREATE POLICY "reminder_delivery_logs_own_or_staff" ON public.reminder_delivery_logs
  FOR SELECT TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.has_any_role(ARRAY['admin', 'receptionist', 'nurse', 'doctor'])
  );

DROP POLICY IF EXISTS "clinic_settings_select_authenticated" ON public.clinic_settings;
CREATE POLICY "clinic_settings_select_authenticated" ON public.clinic_settings
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "clinic_settings_write_admin_only" ON public.clinic_settings;
CREATE POLICY "clinic_settings_write_admin_only" ON public.clinic_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.14 Private Authentication Tables: Explicit verified service_role check (Zero anon/authenticated/admin client access)
DROP POLICY IF EXISTS "auth_credentials_service_role_only" ON public.auth_credentials;
CREATE POLICY "auth_credentials_service_role_only" ON public.auth_credentials
  FOR ALL TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "auth_otps_service_role_only" ON public.auth_otps;
CREATE POLICY "auth_otps_service_role_only" ON public.auth_otps
  FOR ALL TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ==============================================================================
-- 5. INDEXES & UNIQUENESS CONSTRAINTS FOR WORKFLOWS & PREDICTIVE ANALYTICS
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_auth_user_id ON public.patients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_email_lower ON public.patients(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_appointments_booking_ref ON public.appointments(booking_reference);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_branch_date ON public.appointments(branch, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status_date ON public.appointments(patient_id, status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);

-- Prevent double-booking of non-walk-in active appointments on the same doctor + date + time slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_doctor_slot
  ON public.appointments (doctor_id, appointment_date, appointment_time)
  WHERE status IN ('Scheduled', 'Confirmed', 'Checked In', 'Called', 'In Consultation')
    AND COALESCE(is_walk_in, FALSE) = FALSE
    AND COALESCE(is_synthetic, FALSE) = FALSE;

-- Prevent duplicate active queue numbers within the same branch and clinic date
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_daily_branch_queue
  ON public.appointments (branch, appointment_date, queue_number)
  WHERE queue_number IS NOT NULL
    AND status NOT IN ('Cancelled')
    AND COALESCE(is_synthetic, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_branch_date ON public.consultations(branch, consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultations_symptom_categories_gin ON public.consultations USING GIN (symptom_categories);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_order ON public.lab_results(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_created ON public.notifications(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_patient_active ON public.push_subscriptions(patient_id, active);

-- ==============================================================================
-- 6. STORAGE BUCKETS & OBJECT POLICIES (Avatars & Private Medical Attachments)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('medical-attachments', 'medical-attachments', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public Avatar Read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Avatar Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Medical Attachment Access" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "medical_attachments_select_isolated" ON storage.objects;
DROP POLICY IF EXISTS "medical_attachments_insert_isolated" ON storage.objects;
DROP POLICY IF EXISTS "medical_attachments_update_clinical" ON storage.objects;
DROP POLICY IF EXISTS "medical_attachments_delete_clinical" ON storage.objects;

-- Avatars: Authenticated metadata read (blocks anonymous user-folder enumeration);
-- authenticated users may only upload/modify inside `<auth.uid()>/<filename>`
DROP POLICY IF EXISTS "avatars_authenticated_read" ON storage.objects;
CREATE POLICY "avatars_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- Medical Attachments: Private bucket (`public = false`), path convention `<patient_id>/<filename>`
CREATE POLICY "medical_attachments_select_isolated" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-attachments'
    AND (
      (
        public.current_patient_id() IS NOT NULL
        AND (storage.foldername(name))[1] = public.current_patient_id()
      )
      OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'lab_technician'])
    )
  );

CREATE POLICY "medical_attachments_insert_isolated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical-attachments'
    AND (
      (
        public.current_patient_id() IS NOT NULL
        AND (storage.foldername(name))[1] = public.current_patient_id()
      )
      OR public.has_any_role(ARRAY['admin', 'doctor', 'nurse', 'lab_technician'])
    )
  );

CREATE POLICY "medical_attachments_update_clinical" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'medical-attachments'
    AND public.has_any_role(ARRAY['admin', 'doctor'])
  )
  WITH CHECK (
    bucket_id = 'medical-attachments'
    AND public.has_any_role(ARRAY['admin', 'doctor'])
  );

CREATE POLICY "medical_attachments_delete_clinical" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical-attachments'
    AND public.has_any_role(ARRAY['admin', 'doctor'])
  );

-- ==============================================================================
-- 7. LEAST-PRIVILEGE ROLE GRANTS (Replacing Blanket GRANT ALL TO anon/authenticated)
-- ==============================================================================

-- Revoke excessive legacy grants and default privileges from PUBLIC, anon, and authenticated
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM PUBLIC, anon, authenticated;

-- Schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Backend service_role receives full administrative privileges
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- Zero table grants for `anon` (all clinical, user, and auth tables require authentication)
REVOKE ALL ON TABLE public.auth_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.auth_otps FROM PUBLIC, anon, authenticated;

-- Scoped table & view grants for `authenticated` (further enforced row-by-row via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.users,
  public.staff,
  public.patients,
  public.appointments,
  public.consultations,
  public.prescriptions,
  public.prescription_items,
  public.lab_orders,
  public.lab_results,
  public.inventory_items,
  public.restock_requests,
  public.invoices,
  public.invoice_items,
  public.push_subscriptions,
  public.notification_preferences
TO authenticated;

GRANT SELECT, INSERT ON TABLE public.inventory_transactions TO authenticated;
GRANT SELECT ON TABLE public.reminder_delivery_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.clinic_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.forecast_runs TO authenticated;

GRANT SELECT ON TABLE
  public.doctors,
  public.nurses,
  public.receptionists,
  public.pharmacists,
  public.lab_technicians
TO authenticated;

-- Function execution grants
GRANT EXECUTE ON FUNCTION
  public.current_app_role(),
  public.current_user_id(),
  public.current_patient_id(),
  public.is_admin(),
  public.is_clinical_staff(),
  public.has_any_role(TEXT[]),
  public.is_trusted_db_admin_or_service_role(),
  public.admin_link_patient_auth_user(VARCHAR, UUID),
  public.parse_appointment_minutes(TEXT),
  public.dispense_prescription_item_atomic(VARCHAR, VARCHAR, VARCHAR, INT, VARCHAR, VARCHAR, TEXT),
  public.get_booked_appointment_slots(DATE, VARCHAR)
TO authenticated, service_role;

COMMIT;
