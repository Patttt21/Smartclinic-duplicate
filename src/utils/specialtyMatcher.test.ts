import test from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '../types/clinic';
import {
  CLINIC_BRANCHES,
  NON_DIAGNOSTIC_MATCHER_DISCLAIMER,
  isDoctorOfferedAtBranch,
  matchSpecialtiesForReason,
} from './specialtyMatcher';

const sampleDoctors: User[] = [
  {
    id: 'doc-1',
    name: 'Dr. Maria Santos',
    email: 'msantos@smartclinic.ph',
    role: 'doctor',
    department: 'Internal Medicine',
    specialty: 'Internal Medicine',
    branches: ['Main Outpatient Clinic', 'Annex Satellite Clinic'],
    consultationModes: ['In-Person', 'Online Consultation'],
    status: 'Active',
  },
  {
    id: 'doc-2',
    name: 'Dr. Carlo Reyes',
    email: 'creyes@smartclinic.ph',
    role: 'doctor',
    department: 'Dermatology',
    specialty: 'Dermatology',
    branches: ['Main Outpatient Clinic'],
    consultationModes: ['In-Person'],
    status: 'Active',
  },
  {
    id: 'doc-inactive',
    name: 'Dr. Inactive',
    email: 'inactive@smartclinic.ph',
    role: 'doctor',
    department: 'Cardiology',
    specialty: 'Cardiology',
    branches: ['Main Outpatient Clinic', 'Annex Satellite Clinic'],
    status: 'Inactive',
  },
  {
    id: 'nurse-1',
    name: 'Nurse Joy',
    email: 'njoy@smartclinic.ph',
    role: 'nurse',
    department: 'Outpatient Nursing',
    status: 'Active',
  },
];

test('CLINIC_BRANCHES exports both SmartClinic outpatient branches', () => {
  assert.deepEqual(CLINIC_BRANCHES, [
    'Main Outpatient Clinic',
    'Annex Satellite Clinic',
  ]);
});

test('isDoctorOfferedAtBranch filters by role, active status, branch, and consultation mode', () => {
  assert.equal(isDoctorOfferedAtBranch(sampleDoctors[0], 'Main Outpatient Clinic'), true);
  assert.equal(isDoctorOfferedAtBranch(sampleDoctors[0], 'Annex Satellite Clinic'), true);
  assert.equal(
    isDoctorOfferedAtBranch(sampleDoctors[0], 'Main Outpatient Clinic', 'Online Consultation'),
    true
  );

  assert.equal(isDoctorOfferedAtBranch(sampleDoctors[1], 'Main Outpatient Clinic'), true);
  assert.equal(isDoctorOfferedAtBranch(sampleDoctors[1], 'Annex Satellite Clinic'), false);
  assert.equal(
    isDoctorOfferedAtBranch(sampleDoctors[1], 'Main Outpatient Clinic', 'Online Consultation'),
    false
  );

  assert.equal(isDoctorOfferedAtBranch(sampleDoctors[2], 'Main Outpatient Clinic'), false);
  assert.equal(isDoctorOfferedAtBranch(sampleDoctors[3], 'Main Outpatient Clinic'), false);
});

test('matchSpecialtiesForReason matches branch-available specialties and populates guidanceNote', () => {
  const mainResult = matchSpecialtiesForReason({
    reason: 'Itchy skin rash for 3 days',
    branch: 'Main Outpatient Clinic',
    doctors: sampleDoctors,
  });

  assert.equal(mainResult.branch, 'Main Outpatient Clinic');
  assert.equal(mainResult.disclaimer, NON_DIAGNOSTIC_MATCHER_DISCLAIMER);
  assert.ok(mainResult.suggestions.some((s) => s.specialty === 'Dermatology'));
  assert.ok(mainResult.suggestions.every((s) => s.guidanceNote.length > 0));

  // Annex does not offer Dermatology, so it routes to available Internal Medicine at Annex
  const annexResult = matchSpecialtiesForReason({
    reason: 'Itchy skin rash for 3 days',
    branch: 'Annex Satellite Clinic',
    users: sampleDoctors,
  });

  assert.equal(annexResult.branch, 'Annex Satellite Clinic');
  assert.equal(
    annexResult.suggestions.some((s) => s.specialty === 'Dermatology'),
    false
  );
  assert.ok(annexResult.suggestions.some((s) => s.specialty === 'Internal Medicine'));
});

test('matchSpecialtiesForReason supports string input and general fallback', () => {
  const keywordOnly = matchSpecialtiesForReason('high fever and chills');
  assert.ok(keywordOnly.suggestions.some((s) => s.specialty === 'Internal Medicine'));

  const fallback = matchSpecialtiesForReason('');
  assert.equal(fallback.suggestions.length, 1);
  assert.equal(fallback.suggestions[0].isFallbackGeneral, true);
});
