/**
 * Smart Clinic — Enterprise Password Security & Account Protection Service
 * Implements salted PBKDF2 password hashing, lockout controls, and timing-safe verification.
 *
 * Provides:
 * 1. Cryptographic Password Hashing: PBKDF2 (SHA-512, 10,000 iterations, 16-byte random salt)
 * 2. Brute-force & Credential-stuffing Protection: Max 5 consecutive failed attempts
 * 3. Time-based Account Lockout: 15-minute cooldown upon exceeding failed attempts
 * 4. Timing-safe password verification preventing timing-attack vulnerabilities
 */

import crypto from 'crypto';
import { authStore, type StoredCredential } from './authStoreService';

export interface UserCredentials extends StoredCredential {}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PBKDF2_ITERATIONS = 10000;
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

const SEEDED_DEMO_ACCOUNTS: ReadonlyArray<readonly [string, string, string]> = [
  ['smartclinicrealacc@gmail.com', 'SmartClinic@Admin2026', 'admin'],
  ['maria.reyes@smartclinic.ph', 'doctor123', 'doctor'],
  ['juan.santos@smartclinic.ph', 'doctor123', 'doctor'],
  ['patricia.gomez@smartclinic.ph', 'doctor123', 'doctor'],
  ['anthony.lee@smartclinic.ph', 'doctor123', 'doctor'],
  ['roberto.tan@smartclinic.ph', 'doctor123', 'doctor'],
  ['sofia.ramos@smartclinic.ph', 'doctor123', 'doctor'],
  ['gabriel.castro@smartclinic.ph', 'doctor123', 'doctor'],
  ['elena.torres@smartclinic.ph', 'doctor123', 'doctor'],
  ['ana.villanueva@smartclinic.ph', 'nurse123', 'staff'],
  ['claire.mendoza@smartclinic.ph', 'reception123', 'staff'],
  ['julian.delacruz@smartclinic.ph', 'pharm123', 'staff'],
  ['amina.bautista@smartclinic.ph', 'lab123', 'staff'],
  ['elena.vargas@smartclinic.ph', 'patient123', 'patient'],
  ['liam.torres@example.com', 'patient123', 'patient'],
  ['sofia.rd@example.com', 'patient123', 'patient'],
  ['david.ocampo@example.com', 'patient123', 'patient'],
  ['amara.santos@example.com', 'patient123', 'patient'],
  ['patrick.garcia@email.com', 'patient123', 'patient'],
];

const SEEDED_DEMO_MAP = new Map<string, { password: string; role: string }>(
  SEEDED_DEMO_ACCOUNTS.map(([em, pw, ro]) => [em.toLowerCase(), { password: pw, role: ro }])
);

export function isCredentialRegistered(email: string): boolean {
  return authStore.hasCredentialSync(email.trim().toLowerCase());
}

export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

export function registerUserCredentials(email: string, rawPassword: string, role: string = 'patient'): UserCredentials {
  const cleanEmail = email.trim().toLowerCase();
  const { hash, salt } = hashPassword(rawPassword);
  const cred: UserCredentials = {
    email: cleanEmail,
    hash,
    salt,
    role,
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: new Date().toISOString(),
  };
  authStore.setCredential(cred);
  return cred;
}

function initializeDefaultCredentials() {
  for (const [em, pw, ro] of SEEDED_DEMO_ACCOUNTS) {
    if (!authStore.hasCredentialSync(em.toLowerCase())) {
      registerUserCredentials(em, pw, ro);
    }
  }
}

initializeDefaultCredentials();

export function checkAccountLockout(email: string): { isLocked: boolean; minutesRemaining: number } {
  const cleanEmail = email.trim().toLowerCase();
  const cred = authStore.getCredentialSync(cleanEmail);
  if (!cred || !cred.lockedUntil) {
    return { isLocked: false, minutesRemaining: 0 };
  }
  const now = Date.now();
  if (now < cred.lockedUntil) {
    const minutesRemaining = Math.max(1, Math.ceil((cred.lockedUntil - now) / 60000));
    return { isLocked: true, minutesRemaining };
  }
  cred.lockedUntil = null;
  cred.failedAttempts = 0;
  authStore.setCredential(cred);
  return { isLocked: false, minutesRemaining: 0 };
}

export function recordFailedLoginAttempt(email: string): {
  isLocked: boolean;
  remainingAttempts: number;
  minutesRemaining?: number;
} {
  const cleanEmail = email.trim().toLowerCase();
  let cred = authStore.getCredentialSync(cleanEmail);

  if (!cred) {
    cred = {
      email: cleanEmail,
      hash: '',
      salt: '',
      role: 'unknown',
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    };
  }

  cred.failedAttempts += 1;

  if (cred.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    cred.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    authStore.setCredential(cred);
    return {
      isLocked: true,
      remainingAttempts: 0,
      minutesRemaining: Math.ceil(LOCKOUT_DURATION_MS / 60000),
    };
  }

  authStore.setCredential(cred);
  return {
    isLocked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - cred.failedAttempts,
  };
}

export function recordSuccessfulLogin(email: string): void {
  const cleanEmail = email.trim().toLowerCase();
  const cred = authStore.getCredentialSync(cleanEmail);
  if (cred) {
    cred.failedAttempts = 0;
    cred.lockedUntil = null;
    cred.lastLoginAt = new Date().toISOString();
    authStore.setCredential(cred);
  }
}

export async function verifyUserPassword(
  email: string,
  rawPassword: string
): Promise<{ success: boolean; error?: string; isLocked?: boolean; remainingAttempts?: number }> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !rawPassword) {
    return {
      success: false,
      error: 'Email and password are required.',
    };
  }

  const lockout = checkAccountLockout(cleanEmail);
  if (lockout.isLocked) {
    return {
      success: false,
      isLocked: true,
      error: `Account temporarily locked for security due to multiple failed login attempts. Please try again in ${lockout.minutesRemaining} minute(s), or use "Forgot password?" to reset via 2FA.`,
    };
  }

  const cred = await authStore.getCredential(cleanEmail);

  if (!cred || !cred.hash) {
    const exactSeeded = SEEDED_DEMO_MAP.get(cleanEmail);
    if (exactSeeded && rawPassword === exactSeeded.password) {
      registerUserCredentials(cleanEmail, rawPassword, exactSeeded.role);
      recordSuccessfulLogin(cleanEmail);
      return { success: true };
    }

    const failure = recordFailedLoginAttempt(cleanEmail);
    if (failure.isLocked) {
      return {
        success: false,
        isLocked: true,
        error: `Account temporarily locked for security due to ${MAX_FAILED_ATTEMPTS} failed attempts. Please wait 15 minutes before retrying.`,
      };
    }
    return {
      success: false,
      remainingAttempts: failure.remainingAttempts,
      error: `Invalid credentials. ${failure.remainingAttempts} attempt(s) remaining before security lockout.`,
    };
  }

  const isValid = verifyPassword(rawPassword, cred.hash, cred.salt);
  if (!isValid) {
    const failure = recordFailedLoginAttempt(cleanEmail);
    if (failure.isLocked) {
      return {
        success: false,
        isLocked: true,
        error: `Security Alert: Account locked for 15 minutes due to ${MAX_FAILED_ATTEMPTS} consecutive failed attempts.`,
      };
    }
    return {
      success: false,
      remainingAttempts: failure.remainingAttempts,
      error: `Invalid password. ${failure.remainingAttempts} attempt(s) remaining before temporary account lockout.`,
    };
  }

  recordSuccessfulLogin(cleanEmail);
  return { success: true };
}

/**
 * Resets user password (Forgot Password flow) and clears any lockout.
 * Preserves existing role when known.
 * Synchronized across Vercel serverless instances via authStore.
 */
export async function resetUserPassword(email: string, newPassword: string, role?: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await authStore.getCredential(cleanEmail);
  const resolvedRole = role || existing?.role || 'patient';
  const cred = registerUserCredentials(cleanEmail, newPassword, resolvedRole);
  cred.failedAttempts = 0;
  cred.lockedUntil = null;
  await authStore.setCredential(cred);
}
