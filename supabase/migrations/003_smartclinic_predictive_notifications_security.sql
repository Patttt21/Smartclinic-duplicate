-- =============================================================================
-- SmartClinic V2 — Additive Non-Destructive Supabase Migration (003)
-- Project: SmartClinic: A Role-Based Web Application Integrating Predictive
--          Analysis for Healthcare Management
--
-- IMPORTANT SAFETY RULES:
--   1. Prepared for review BEFORE execution on the NEW duplicate Supabase project.
--   2. Strictly additive (IF NOT EXISTS) — NEVER drops tables, columns, or existing
--      historical records (including legacy `triage_history` JSONB columns).
--   3. Never execute against the original SmartClinic production database.
-- =============================================================================

BEGIN;

-- 1. Extend `appointments` with outpatient lifecycle, walk-in, branch, and audit columns
ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS branch text DEFAULT 'Main Outpatient Clinic',
  ADD COLUMN IF NOT EXISTS is_walk_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS called_at timestamptz,
  ADD COLUMN IF NOT EXISTS called_by text,
  ADD COLUMN IF NOT EXISTS called_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescheduled_from_id text,
  ADD COLUMN IF NOT EXISTS staff_override_reason text;

-- Allow `'Called'` status and `'Walk-In'` visit type if CHECK constraints exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'appointments'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_status_check
      CHECK (status IN ('Scheduled', 'Confirmed', 'Checked In', 'Called', 'In Consultation', 'Completed', 'Cancelled', 'No Show'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_branch_date
  ON public.appointments (branch, date);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_status_date
  ON public.appointments (patient_id, status, date);

-- Prevent double-booking of non-walk-in active appointments on the same doctor + date + time slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_doctor_slot
  ON public.appointments (doctor_id, date, time)
  WHERE status IN ('Scheduled', 'Confirmed', 'Checked In', 'Called', 'In Consultation')
    AND COALESCE(is_walk_in, false) = false
    AND COALESCE(is_synthetic, false) = false;

-- 2. Extend `consultations` with branch & structured symptom categories for Monthly Health Consultation Trends
ALTER TABLE IF EXISTS public.consultations
  ADD COLUMN IF NOT EXISTS branch text DEFAULT 'Main Outpatient Clinic',
  ADD COLUMN IF NOT EXISTS symptom_categories text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_consultations_branch_date
  ON public.consultations (branch, date);

-- 3. Extend `notifications` for queue_call real-time acknowledgment tracking
ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS queue_number text,
  ADD COLUMN IF NOT EXISTS room text;

-- 4. Create `push_subscriptions` table for PWA Web Push (VAPID) notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  patient_id text,
  endpoint text NOT NULL UNIQUE,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_patient_active
  ON public.push_subscriptions (patient_id, active);

-- 5. Create `forecast_runs` audit log table for Administrator forecast refreshes
CREATE TABLE IF NOT EXISTS public.forecast_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text,
  branch_filter text NOT NULL DEFAULT 'ALL',
  horizon_months integer NOT NULL CHECK (horizon_months BETWEEN 3 AND 6),
  selected_model text NOT NULL,
  observation_months integer NOT NULL,
  backtest_mae numeric(10, 2),
  backtest_rmse numeric(10, 2),
  backtest_wape numeric(10, 2),
  is_synthetic_dataset boolean NOT NULL DEFAULT true
);

-- 6. Row Level Security (RLS) Policies — Strict Patient Isolation
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Patients manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Admins read and insert forecast runs" ON public.forecast_runs;
CREATE POLICY "Admins read and insert forecast runs"
  ON public.forecast_runs
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- =============================================================================
-- SUPABASE AUTH SESSION SECURITY & PLAN LIMITATIONS DOCUMENTATION (PART 8)
-- =============================================================================
-- 1. Application-Layer Role-Based Inactivity Enforcement (Active on ALL Plans):
--    - Patient Portal: 30 minutes (1800s) idle timeout; warning modal at 28m (120s left).
--    - Clinic Staff & Administrator: 15 minutes (900s) idle timeout; warning modal at 13m (120s left).
--    - Background polling requests (`x-background-poll: 1`) never reset user idle timers.
--    - Server-side `authService.ts` independently tracks `lastActivityAt` per bearer token
--      and revokes expired tokens with HTTP 401 (`SESSION_INACTIVITY_EXPIRED`).
-- 2. Supabase Auth JWT & Session Settings:
--    - On Supabase Free Tier: Configure JWT Expiry (`JWT_EXPIRY`) to `1800` seconds (30 min)
--      under Authentication -> Sessions in the duplicate Supabase dashboard.
--    - On Supabase Pro Plan+: Native server-side `Inactivity timeout` and `Time-box user sessions`
--      can additionally be enabled in Authentication -> Sessions to mirror the 15m/30m thresholds.
-- =============================================================================

COMMIT;
