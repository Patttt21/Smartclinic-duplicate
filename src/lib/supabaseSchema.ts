// Hardened Supabase PostgreSQL Schema Reference for SmartClinic V2
// Authoritative full migration: supabase/migrations/001_smartclinic_v2_schema_and_rls.sql
// Synthetic demonstration prototype only — no unverified legal compliance claims.

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SmartClinic V2 — Hardened Role-Based Schema & RLS Reference
-- Primary Migration File: supabase/migrations/001_smartclinic_v2_schema_and_rls.sql
-- ==============================================================================
-- IMPORTANT:
-- Apply the numbered migrations in supabase/migrations/ in order:
--   1. 001_smartclinic_v2_schema_and_rls.sql
--   2. 002_smartclinic_v2_synthetic_seed.sql
--   3. 003_smartclinic_predictive_notifications_security.sql
--
-- Key Security Guarantees:
-- - Zero USING (true) policies on clinical, patient, or credential tables.
-- - Supabase Auth (auth.users -> public.users.auth_user_id / public.patients.auth_user_id)
--   strict identity binding without email-only patient chart auto-claiming.
-- - SECURITY INVOKER mutation guard triggers (guard_user_profile_mutation,
--   guard_patient_profile_mutation, guard_patient_appointment_mutation,
--   guard_notification_mutation) eliminating SECURITY DEFINER current_user bypasses.
-- - Database-level Manila no-same-day patient booking & interval overlap guard
--   plus atomic FOR UPDATE pharmacy stock deduction on dispense.
-- - Private authentication tables (auth_credentials, auth_otps without plaintext OTPs)
--   locked with FORCE ROW LEVEL SECURITY to service_role only.
-- - Role views (doctors, nurses, receptionists, pharmacists, lab_technicians) configured
--   with security_invoker = true.
-- - Private medical-attachments storage bucket isolated by <patient_id>/<filename>.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Role-lookup helpers (bound to auth.uid(), never user_metadata)
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_sub_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT u.role, u.sub_role
      INTO v_role, v_sub_role
      FROM public.users u
     WHERE u.auth_user_id = auth.uid()
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

    IF EXISTS (SELECT 1 FROM public.patients p WHERE p.auth_user_id = auth.uid()) THEN
        RETURN 'patient';
    END IF;

    RETURN NULL;
END;
$$;

-- Security-invoker role views (respect caller RLS on public.users)
CREATE OR REPLACE VIEW public.doctors WITH (security_invoker = true) AS
    SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users WHERE role = 'doctor';

CREATE OR REPLACE VIEW public.nurses WITH (security_invoker = true) AS
    SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users WHERE role = 'nurse' OR (role = 'staff' AND sub_role = 'nurse');

CREATE OR REPLACE VIEW public.receptionists WITH (security_invoker = true) AS
    SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users WHERE role = 'receptionist' OR (role = 'staff' AND sub_role = 'receptionist');

CREATE OR REPLACE VIEW public.pharmacists WITH (security_invoker = true) AS
    SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users WHERE role = 'pharmacist' OR (role = 'staff' AND sub_role = 'pharmacist');

CREATE OR REPLACE VIEW public.lab_technicians WITH (security_invoker = true) AS
    SELECT id, email, full_name, role, sub_role, specialty, license_number, phone, department, avatar, is_active, created_at, updated_at
    FROM public.users WHERE role = 'lab_technician' OR (role = 'staff' AND sub_role IN ('lab_tech', 'lab_technician'));
`;

export const SUPABASE_GRANT_SQL = `-- Least-Privilege PostgREST Grants (Never grant table access to anon)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON
    public.users,
    public.patients,
    public.appointments,
    public.consultations,
    public.prescriptions,
    public.prescription_items,
    public.lab_orders,
    public.lab_results,
    public.inventory_items,
    public.invoices,
    public.invoice_items,
    public.notifications,
    public.push_subscriptions
TO authenticated;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.doctors, public.nurses, public.receptionists, public.pharmacists, public.lab_technicians TO authenticated;

-- Private credential stores: strictly service_role only
REVOKE ALL ON TABLE public.auth_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.auth_otps FROM PUBLIC, anon, authenticated;
`;
