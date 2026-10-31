/**
 * Smart Clinic — Authentication, Token Signing, Inactivity Session Security & RBAC Tenancy Guard
 * Cryptographically signed HMAC-SHA256 tokens using Node.js crypto.
 * Enforces strict patient data isolation and configurable 10-minute (600s) inactivity expiration across all roles:
 * - Patient, Doctor, Clinic Staff (Nurse, Receptionist, Pharmacist, Lab Tech), Administrator: 10 minutes (600s)
 */
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours absolute token cap

export const DEFAULT_INACTIVITY_TIMEOUT_SECONDS = 10 * 60; // 10 minutes (600 seconds)

let configuredTimeoutSeconds =
  Number(process.env.SESSION_TIMEOUT_SECONDS) ||
  Number(process.env.SESSION_TIMEOUT_PATIENT_SEC) ||
  DEFAULT_INACTIVITY_TIMEOUT_SECONDS;

export const ROLE_INACTIVITY_TIMEOUT_SECONDS = {
  patient: configuredTimeoutSeconds,
  staff: configuredTimeoutSeconds,
  admin: configuredTimeoutSeconds,
};

export interface UserTokenPayload {
  userId: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'nurse' | 'pharmacist' | 'receptionist' | 'lab_technician' | 'admin';
  primaryRole: 'patient' | 'doctor' | 'staff' | 'admin';
  subRole?: 'nurse' | 'pharmacist' | 'receptionist' | 'lab_technician';
  linkedPatientId?: string | null;
  sid?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
  userId?: string;
  userRole?: string;
  linkedPatientId?: string | null;
  authToken?: string;
}

interface ActiveSessionEntry {
  sid: string;
  userId: string;
  role: UserTokenPayload['role'];
  lastActiveAt: number;
  timeoutMs: number;
  revoked: boolean;
}

const activeSessions = new Map<string, ActiveSessionEntry>();

export function setGlobalInactivityTimeoutSeconds(seconds: number): number {
  const clamped = Math.max(120, Math.min(3600, Math.round(Number(seconds) || DEFAULT_INACTIVITY_TIMEOUT_SECONDS)));
  configuredTimeoutSeconds = clamped;
  ROLE_INACTIVITY_TIMEOUT_SECONDS.patient = clamped;
  ROLE_INACTIVITY_TIMEOUT_SECONDS.staff = clamped;
  ROLE_INACTIVITY_TIMEOUT_SECONDS.admin = clamped;
  for (const entry of activeSessions.values()) {
    entry.timeoutMs = clamped * 1000;
  }
  return clamped;
}

export function getRoleTimeoutSeconds(_role?: string): number {
  return configuredTimeoutSeconds;
}

function getSessionKey(token: string, payload: UserTokenPayload): string {
  return payload.sid || crypto.createHash('sha256').update(token).digest('hex').slice(0, 24);
}

export function registerServerSession(token: string, payload: UserTokenPayload): ActiveSessionEntry {
  const key = getSessionKey(token, payload);
  const timeoutMs = getRoleTimeoutSeconds(payload.role) * 1000;
  const entry: ActiveSessionEntry = {
    sid: key,
    userId: payload.userId,
    role: payload.role,
    lastActiveAt: Date.now(),
    timeoutMs,
    revoked: false,
  };
  activeSessions.set(key, entry);
  return entry;
}

export function getSessionStatus(
  token: string,
  payload: UserTokenPayload
): { valid: boolean; remainingSeconds: number; timeoutSeconds: number; reason?: string } {
  const key = getSessionKey(token, payload);
  const timeoutSeconds = getRoleTimeoutSeconds(payload.role);
  const timeoutMs = timeoutSeconds * 1000;
  const now = Date.now();

  let entry = activeSessions.get(key);
  if (!entry) {
    // Hydrate session if server restarted while signed token is still within inactivity window from iat
    const baseline = payload.iat || now;
    if (now - baseline > timeoutMs) {
      return { valid: false, remainingSeconds: 0, timeoutSeconds, reason: 'inactive_expired' };
    }
    entry = {
      sid: key,
      userId: payload.userId,
      role: payload.role,
      lastActiveAt: now,
      timeoutMs,
      revoked: false,
    };
    activeSessions.set(key, entry);
  }

  if (entry.revoked) {
    return { valid: false, remainingSeconds: 0, timeoutSeconds, reason: 'revoked' };
  }

  const elapsedMs = now - entry.lastActiveAt;
  if (elapsedMs > entry.timeoutMs) {
    entry.revoked = true;
    return { valid: false, remainingSeconds: 0, timeoutSeconds, reason: 'inactive_expired' };
  }

  const remainingSeconds = Math.max(0, Math.ceil((entry.timeoutMs - elapsedMs) / 1000));
  return { valid: true, remainingSeconds, timeoutSeconds };
}

export function touchServerSession(
  token: string,
  payload: UserTokenPayload,
  isBackgroundPoll = false
): { valid: boolean; remainingSeconds: number; timeoutSeconds: number } {
  const status = getSessionStatus(token, payload);
  if (!status.valid) return status;

  if (!isBackgroundPoll) {
    const key = getSessionKey(token, payload);
    const entry = activeSessions.get(key);
    if (entry) {
      entry.lastActiveAt = Date.now();
      return {
        valid: true,
        remainingSeconds: status.timeoutSeconds,
        timeoutSeconds: status.timeoutSeconds,
      };
    }
  }

  return status;
}

export function revokeServerSession(token?: string, userId?: string): void {
  if (token) {
    const verified = verifyToken(token);
    if (verified) {
      const key = getSessionKey(token, verified);
      const entry = activeSessions.get(key);
      if (entry) entry.revoked = true;
    }
  }
  if (userId) {
    for (const entry of activeSessions.values()) {
      if (entry.userId === userId) {
        entry.revoked = true;
      }
    }
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

export function generateToken(payload: Omit<UserTokenPayload, 'iat' | 'exp' | 'sid'>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const sid = crypto.randomBytes(12).toString('hex');
  const fullPayload: UserTokenPayload = {
    ...payload,
    sid,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const signedToken = `${data}.${signature}`;
  registerServerSession(signedToken, fullPayload);
  return signedToken;
}

export function verifyToken(token: string): UserTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerEncoded, payloadEncoded, signature] = parts;
  const data = `${headerEncoded}.${payloadEncoded}`;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) return null;

  try {
    const payload: UserTokenPayload = JSON.parse(base64UrlDecode(payloadEncoded));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Express middleware to authenticate tokens and enforce server-side session inactivity.
 * Background polling requests (`x-background-poll: 1`) NEVER reset inactivity timers.
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  }

  const isBackgroundPoll = String(req.headers['x-background-poll'] || '') === '1';
  const isPublicAuthPath =
    req.path.startsWith('/auth/login') ||
    req.path.startsWith('/auth/logout') ||
    req.path.startsWith('/auth/register') ||
    req.path.startsWith('/auth/system-accounts') ||
    req.path.startsWith('/auth/otp') ||
    req.path.startsWith('/auth/totp') ||
    req.path.startsWith('/auth/forgot-password') ||
    req.path.startsWith('/auth/reset-password') ||
    req.path.startsWith('/cron') ||
    req.path === '/health' ||
    req.path === '/status';

  if (token) {
    const verified = verifyToken(token);
    if (verified) {
      const session = touchServerSession(token, verified, isBackgroundPoll);
      if (!session.valid && !isPublicAuthPath) {
        return res.status(401).json({
          error: 'Your session expired due to inactivity. Please sign in again.',
          code: 'SESSION_INACTIVE_EXPIRED',
        });
      }
      if (session.valid) {
        req.user = verified;
        req.userId = verified.userId;
        req.userRole = verified.role;
        req.linkedPatientId = verified.linkedPatientId || null;
        req.authToken = token;
        res.setHeader('X-Session-Remaining-Sec', String(session.remainingSeconds));
        return next();
      }
    } else if (!isPublicAuthPath) {
      return res.status(401).json({
        error: 'Invalid or expired authentication token. Please sign in again.',
        code: 'TOKEN_INVALID',
      });
    }
  }

  // Never trust unverified x-user-role, x-user-id, or x-linked-patient-id headers
  req.user = undefined;
  req.userId = undefined;
  req.userRole = undefined;
  req.linkedPatientId = null;
  req.authToken = undefined;
  next();
}

/**
 * Requires a cryptographically verified bearer session token on the request.
 */
export function requireVerifiedAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.authToken || !req.user.userId || !req.user.role) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in with a valid clinic account.',
      code: 'AUTH_REQUIRED',
    });
  }
  next();
}

/**
 * Requires a cryptographically verified session whose bound role is in allowedRoles.
 */
export function requireVerifiedRoles(...allowedRoles: string[]) {
  const normalizedAllowed = new Set(allowedRoles.map((r) => r.toLowerCase()));
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.authToken || !req.user.userId || !req.user.role) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in with an authorized account.',
        code: 'AUTH_REQUIRED',
      });
    }
    const verifiedRole = String(req.user.role).toLowerCase();
    if (!normalizedAllowed.has(verifiedRole)) {
      return res.status(403).json({
        error: `Forbidden: Role '${verifiedRole}' is not authorized for this operation.`,
        code: 'ROLE_FORBIDDEN',
      });
    }
    next();
  };
}

/**
 * Strict administrative authorization guard.
 * Requires a verified session with role === 'admin'.
 */
export const requireAdmin = requireVerifiedRoles('admin');

/**
 * Middleware ensuring patient tenancy isolation.
 * Patients can never access other patients' records via query or param.
 */
export function enforcePatientIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const role = req.user?.role;
  const isPatient = role === 'patient';
  const linkedId = req.user?.linkedPatientId || req.linkedPatientId;

  if (isPatient) {
    if (!linkedId) {
      return res.status(403).json({
        error: 'Forbidden: Patient account is not linked to a clinical profile.',
      });
    }

    const targetPatientId = req.params.patientId || req.params.id || req.query.patientId;
    if (targetPatientId && targetPatientId !== linkedId) {
      return res.status(403).json({
        error: 'Data Isolation Violation: You are not authorized to view or modify other patients’ medical records.',
      });
    }
  }

  next();
}
