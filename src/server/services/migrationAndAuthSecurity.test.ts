import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import app from '../../serverApp';
import { generateToken } from './authService';
import { generateTotpCode, ADMIN_TOTP_SECRET } from './totpService';

const ROOT = process.cwd();

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

test('Migration 001 eliminates all USING (true) / WITH CHECK (true) policies and legacy unrestricted policy names', () => {
  const rawMigration001 = readRepoFile('supabase/migrations/001_smartclinic_v2_schema_and_rls.sql');
  const migration001 = stripSqlComments(rawMigration001);

  const policyBlocks = migration001.match(/CREATE POLICY[\s\S]*?;/gi) || [];
  assert.ok(policyBlocks.length >= 30, 'Expected comprehensive granular RLS policy definitions');

  // Zero USING (true) or WITH CHECK (true) anywhere in Migration 001
  assert.doesNotMatch(migration001, /USING\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(migration001, /WITH\s+CHECK\s*\(\s*true\s*\)/i);

  for (const block of policyBlocks) {
    assert.doesNotMatch(
      block,
      /user_metadata/i,
      `RLS policy must never trust client-editable user_metadata:\n${block}`
    );
  }

  // Legacy permissive policy names must not exist anywhere in Migration 001
  assert.doesNotMatch(rawMigration001, /Users All Access/i);
  assert.doesNotMatch(rawMigration001, /Public Read Access/i);
  assert.doesNotMatch(rawMigration001, /Auth Credentials All Access/i);
  assert.doesNotMatch(rawMigration001, /Auth OTPs All Access/i);
});

test('Migration 001 enforces email-confirmed Supabase Auth linking, role-escalation triggers, security_invoker views, private storage, and least-privilege grants', () => {
  const migration001 = stripSqlComments(readRepoFile('supabase/migrations/001_smartclinic_v2_schema_and_rls.sql'));

  // 1. Auth identity mapping & email-confirmed linking guard
  assert.match(migration001, /auth_user_id\s+UUID\s+UNIQUE\s+REFERENCES\s+auth\.users\(id\)/i);
  assert.match(migration001, /CREATE OR REPLACE FUNCTION public\.handle_new_auth_user\(\)/i);
  assert.match(migration001, /NEW\.email_confirmed_at\s+IS\s+NOT\s+NULL/i);
  assert.match(migration001, /AFTER INSERT OR UPDATE OF email_confirmed_at ON auth\.users/i);
  assert.match(migration001, /CREATE OR REPLACE FUNCTION public\.current_app_role\(\)/i);
  assert.match(migration001, /CREATE OR REPLACE FUNCTION public\.current_patient_id\(\)/i);
  assert.match(migration001, /CREATE OR REPLACE FUNCTION public\.is_admin\(\)/i);

  // 2. Privilege-escalation & field tampering triggers
  assert.match(migration001, /CREATE TRIGGER trg_guard_user_role_escalation/i);
  assert.match(migration001, /CREATE TRIGGER trg_guard_patient_profile_mutation/i);
  assert.match(migration001, /CREATE TRIGGER trg_guard_patient_appointment_mutation/i);

  // 3. Private authentication tables: no plaintext OTP column definition, FORCE RLS, revoked from anon/authenticated
  assert.doesNotMatch(migration001, /code_plain\s+VARCHAR/i);
  assert.match(migration001, /ALTER TABLE public\.auth_otps DROP COLUMN IF EXISTS code_plain;/i);
  assert.match(migration001, /ALTER TABLE public\.auth_credentials FORCE ROW LEVEL SECURITY;/i);
  assert.match(migration001, /ALTER TABLE public\.auth_otps FORCE ROW LEVEL SECURITY;/i);
  assert.match(migration001, /REVOKE ALL ON TABLE public\.auth_credentials FROM PUBLIC, anon, authenticated;/i);
  assert.match(migration001, /REVOKE ALL ON TABLE public\.auth_otps FROM PUBLIC, anon, authenticated;/i);

  // 4. All 5 role views use security_invoker = true
  for (const viewName of ['doctors', 'nurses', 'receptionists', 'pharmacists', 'lab_technicians']) {
    const viewRegex = new RegExp(
      `CREATE OR REPLACE VIEW public\\.${viewName}\\s+WITH\\s*\\(\\s*security_invoker\\s*=\\s*true\\s*\\)`,
      'i'
    );
    assert.match(migration001, viewRegex, `View public.${viewName} must enforce security_invoker = true`);
  }

  // 5. Private medical-attachments bucket & authenticated avatars policy
  assert.match(migration001, /\('medical-attachments',\s*'medical-attachments',\s*false/i);
  assert.match(migration001, /CREATE POLICY "medical_attachments_select_isolated" ON storage\.objects/i);
  assert.match(migration001, /\(storage\.foldername\(name\)\)\[1\]\s*=\s*public\.current_patient_id\(\)/i);
  assert.match(migration001, /CREATE POLICY "avatars_authenticated_read" ON storage\.objects/i);

  // 6. Least-privilege grants: zero GRANT ALL TO anon
  assert.doesNotMatch(migration001, /GRANT\s+ALL\s+ON\s+ALL\s+TABLES[\s\S]*?TO\s+anon/i);
  assert.match(migration001, /REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;/i);

  // 7. Required SmartClinic V2 operational & forecasting schema support
  assert.match(migration001, /booking_reference\s+VARCHAR\(32\)\s+UNIQUE/i);
  assert.match(migration001, /is_walk_in\s+BOOLEAN/i);
  assert.match(migration001, /called_at\s+TIMESTAMP WITH TIME ZONE/i);
  assert.match(migration001, /called_acknowledged_at\s+TIMESTAMP WITH TIME ZONE/i);
  assert.match(migration001, /no_show_marked_at\s+TIMESTAMP WITH TIME ZONE/i);
  assert.match(migration001, /CREATE TABLE IF NOT EXISTS public\.forecast_runs/i);
  assert.match(migration001, /CREATE OR REPLACE FUNCTION public\.get_booked_appointment_slots/i);
});

test('Companion SQL and application files contain no insecure policies, schema bugs, or unverified legal claims', () => {
  const migration002 = stripSqlComments(readRepoFile('supabase/migrations/002_smartclinic_v2_synthetic_seed.sql'));
  const migration003 = stripSqlComments(readRepoFile('supabase/migrations/003_smartclinic_predictive_notifications_security.sql'));
  const schemaSql = stripSqlComments(readRepoFile('supabase/schema.sql'));
  const seedSql = stripSqlComments(readRepoFile('supabase/seed.sql'));
  const tsSchema = stripSqlComments(readRepoFile('src/lib/supabaseSchema.ts'));

  assert.doesNotMatch(migration003, /user_metadata/i);
  assert.match(migration003, /appointment_date/i);
  assert.match(migration003, /consultation_date/i);
  assert.match(migration003, /public\.is_admin\(\)/i);

  assert.doesNotMatch(seedSql, /DROP\s+TABLE/i);
  assert.doesNotMatch(seedSql, /USING\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(seedSql, /GRANT\s+ALL\s+ON\s+ALL\s+TABLES[\s\S]*?TO\s+anon/i);
  assert.match(migration002, /ON CONFLICT \(id\) DO NOTHING/i);

  for (const [label, sqlText] of [
    ['schema.sql', schemaSql],
    ['supabaseSchema.ts', tsSchema],
  ] as const) {
    const policies = sqlText.match(/CREATE POLICY[\s\S]*?;/gi) || [];
    for (const pol of policies) {
      if (/USING\s*\(\s*true\s*\)/i.test(pol)) {
        assert.match(pol, /service_role/i, `Unexpected USING (true) in ${label}: ${pol}`);
      }
    }
    assert.doesNotMatch(sqlText, /code_plain\s+VARCHAR/i);
    assert.doesNotMatch(sqlText, /GRANT\s+ALL\s+ON\s+ALL\s+TABLES[\s\S]*?TO\s+anon/i);
  }

  for (const relPath of [
    'supabase/migrations/001_smartclinic_v2_schema_and_rls.sql',
    'supabase/schema.sql',
    'src/lib/supabaseSchema.ts',
    'src/serverApp.ts',
    'src/server/services/authService.ts',
    'src/server/services/passwordSecurityService.ts',
    'src/components/auth/LoginPage.tsx',
    'src/components/auth/AllAccountsModal.tsx',
    'src/components/auth/PrivacyPolicyModal.tsx',
    'src/components/common/SupabaseModal.tsx',
    'src/components/layout/Header.tsx',
    'src/utils/translations.ts',
  ]) {
    assert.doesNotMatch(readRepoFile(relPath), /RA\s*10173/i, `Unverified RA 10173 claim found in ${relPath}`);
  }
});

test('POST /api/auth/login blocks passwordless bypass, wildcard unknown emails, and cross-role escalation while preserving valid role logins', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    const jsonHeaders = { 'Content-Type': 'application/json' };

    // 1. Passwordless login attempts MUST be rejected (400) across all 4 primary roles
    for (const payload of [
      { primaryRole: 'patient', email: 'elena.vargas@smartclinic.ph' },
      { primaryRole: 'doctor', email: 'maria.reyes@smartclinic.ph', password: '' },
      { primaryRole: 'staff', subRole: 'nurse', email: 'ana.villanueva@smartclinic.ph' },
      {
        primaryRole: 'admin',
        email: 'smartclinicrealacc@gmail.com',
        twoFactorCode: generateTotpCode(ADMIN_TOTP_SECRET),
      },
    ]) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      });
      assert.equal(res.status, 400, `Passwordless login must return 400 for ${payload.primaryRole}`);
    }

    // 2. Unknown email with default demo password MUST fail (no wildcard @ bypass, no phantom patient creation)
    const unknownRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        primaryRole: 'patient',
        email: `unregistered.attacker.${Date.now()}@random-domain.org`,
        password: 'patient123',
      }),
    });
    assert.equal(unknownRes.status, 401);

    // 3. Cross-role escalation: Patient attempting to sign in as Staff (Nurse) MUST fail (401)
    const patientToStaffRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        primaryRole: 'staff',
        subRole: 'nurse',
        email: 'elena.vargas@smartclinic.ph',
        password: 'patient123',
      }),
    });
    assert.equal(patientToStaffRes.status, 401);

    // 4. Staff sub-role mismatch: Receptionist attempting to sign in as Pharmacist MUST fail (401)
    const subRoleMismatchRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        primaryRole: 'staff',
        subRole: 'pharmacist',
        email: 'claire.mendoza@smartclinic.ph',
        password: 'reception123',
      }),
    });
    assert.equal(subRoleMismatchRes.status, 401);

    // 5. Legitimate Patient, Doctor, Staff (Nurse & Receptionist), and Admin logins succeed (200)
    const validPatientRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        primaryRole: 'patient',
        email: 'elena.vargas@smartclinic.ph',
        password: 'patient123',
      }),
    });
    assert.equal(validPatientRes.status, 200);
    const validPatientJson = await validPatientRes.json();
    assert.equal(validPatientJson.success, true);
    assert.equal(validPatientJson.user.role, 'patient');

    const validDoctorRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        primaryRole: 'doctor',
        email: 'sofia.ramos@smartclinic.ph',
        password: 'doctor123',
      }),
    });
    assert.equal(validDoctorRes.status, 200);

    const validNurseRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        primaryRole: 'staff',
        subRole: 'nurse',
        email: 'ana.villanueva@smartclinic.ph',
        password: 'nurse123',
      }),
    });
    assert.equal(validNurseRes.status, 200);

    const validAdminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        primaryRole: 'admin',
        email: 'smartclinicrealacc@gmail.com',
        password: 'SmartClinic@Admin2026',
        twoFactorCode: generateTotpCode(ADMIN_TOTP_SECRET),
      }),
    });
    assert.equal(validAdminRes.status, 200);
  } finally {
    server.close();
  }
});

test('Backend administrative, clinical, sync, and AI endpoints enforce verified RBAC scoping and tenant isolation', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    // 1. Unauthenticated + Spoofed x-user-role: admin headers MUST be rejected (401)
    const spoofedHeaders = {
      'Content-Type': 'application/json',
      'x-user-role': 'admin',
      'x-user-id': 'usr-admin',
    };

    const adminEndpoints: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [
      { method: 'POST', path: '/api/clinic/seed' },
      { method: 'POST', path: '/api/database/repair' },
      { method: 'GET', path: '/api/supabase/verify' },
      { method: 'POST', path: '/api/supabase/sync' },
      { method: 'POST', path: '/api/auth/otp/configure', body: {} },
      { method: 'POST', path: '/api/doctors', body: { name: 'Dr. Spoof', email: 'spoof@smartclinic.ph' } },
      { method: 'GET', path: '/api/audit-logs' },
      { method: 'GET', path: '/api/communication/logs' },
      { method: 'GET', path: '/api/analytics/monthly-forecast' },
    ];

    for (const ep of adminEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: spoofedHeaders,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.equal(
        res.status,
        401,
        `Expected 401 for unauthenticated spoofed request on ${ep.method} ${ep.path}, got ${res.status}`
      );
    }

    // 2. Authenticated Patient token MUST receive 403 on Admin endpoints, other patients' records, and cross-patient AI context
    const patientToken = generateToken({
      userId: 'pat-1',
      name: 'Elena Vargas',
      email: 'elena.vargas@smartclinic.ph',
      role: 'patient',
      primaryRole: 'patient',
      linkedPatientId: 'pat-1',
    });
    const patientHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
      'x-user-role': 'admin',
    };

    for (const ep of adminEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: patientHeaders,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.equal(
        res.status,
        403,
        `Expected 403 for patient token on admin endpoint ${ep.method} ${ep.path}, got ${res.status}`
      );
    }

    const crossPatRes = await fetch(`${baseUrl}/api/patients/pat-2`, { headers: patientHeaders });
    assert.equal(crossPatRes.status, 403);

    const crossAiRes = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({ message: 'Show medications', patientId: 'pat-2' }),
    });
    assert.equal(crossAiRes.status, 403);

    const selfPatchRes = await fetch(`${baseUrl}/api/patients/pat-1`, {
      method: 'PATCH',
      headers: patientHeaders,
      body: JSON.stringify({
        phone: '+63 917 999 8888',
        mrn: 'MRN-TAMPERED-999',
        role: 'admin',
      }),
    });
    assert.equal(selfPatchRes.status, 200);
    const patchedBody = await selfPatchRes.json();
    assert.notEqual(patchedBody.patient.mrn, 'MRN-TAMPERED-999');
    assert.equal((patchedBody.patient as any).role, undefined);

    // 3. Staff Role Scoping (Receptionist vs Pharmacist vs Doctor) matching Migration 001 RLS
    const receptionistToken = generateToken({
      userId: 'usr-4',
      name: 'Claire Mendoza',
      email: 'claire.mendoza@smartclinic.ph',
      role: 'receptionist',
      primaryRole: 'staff',
      subRole: 'receptionist',
      linkedPatientId: null,
    });
    const receptionistHeaders = { Authorization: `Bearer ${receptionistToken}` };

    assert.equal((await fetch(`${baseUrl}/api/consultations`, { headers: receptionistHeaders })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/prescriptions`, { headers: receptionistHeaders })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/lab-orders`, { headers: receptionistHeaders })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/appointments`, { headers: receptionistHeaders })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/invoices`, { headers: receptionistHeaders })).status, 200);

    const recSyncRes = await fetch(`${baseUrl}/api/clinic/sync`, { headers: receptionistHeaders });
    assert.equal(recSyncRes.status, 200);
    const recSyncJson = await recSyncRes.json();
    assert.equal(recSyncJson.consultations.length, 0);
    assert.equal(recSyncJson.prescriptions.length, 0);
    assert.equal(recSyncJson.labOrders.length, 0);
    assert.ok(recSyncJson.appointments.length > 0);

    const pharmacistToken = generateToken({
      userId: 'usr-5',
      name: 'Julian Dela Cruz, RPh',
      email: 'julian.delacruz@smartclinic.ph',
      role: 'pharmacist',
      primaryRole: 'staff',
      subRole: 'pharmacist',
      linkedPatientId: null,
    });
    const pharmacistHeaders = { Authorization: `Bearer ${pharmacistToken}` };
    assert.equal((await fetch(`${baseUrl}/api/patients`, { headers: pharmacistHeaders })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/consultations`, { headers: pharmacistHeaders })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/prescriptions`, { headers: pharmacistHeaders })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/inventory`, { headers: pharmacistHeaders })).status, 200);

    // 4. Verified Administrator token succeeds on Admin routes and blocks SSRF on /api/supabase/verify
    const adminToken = generateToken({
      userId: 'usr-admin',
      name: 'Director Maria Lourdes Santos, MD',
      email: 'smartclinicrealacc@gmail.com',
      role: 'admin',
      primaryRole: 'admin',
      linkedPatientId: null,
    });
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const auditRes = await fetch(`${baseUrl}/api/audit-logs`, { headers: adminHeaders });
    assert.equal(auditRes.status, 200);

    const forecastRes = await fetch(`${baseUrl}/api/analytics/monthly-forecast?horizon=3`, {
      headers: adminHeaders,
    });
    assert.equal(forecastRes.status, 200);
    const forecastJson = await forecastRes.json();
    assert.equal(forecastJson.success, true);

    const ssrfRes = await fetch(`${baseUrl}/api/supabase/verify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        supabaseUrl: 'http://169.254.169.254/latest/meta-data',
        supabaseKey: 'dummy',
      }),
    });
    assert.equal(ssrfRes.status, 400);
  } finally {
    server.close();
  }
});

