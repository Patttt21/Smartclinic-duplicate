/**
 * SmartClinic V2 — Secure Non-PHI Appointment QR Token & Booking Reference Service
 *
 * Security Invariants:
 * 1. QR payloads NEVER contain patient full names, MRNs, blood types, allergies, or diagnoses.
 * 2. Encoded QR payload contains ONLY `{ v: 2, ref: bookingReference, token: signedToken }`.
 * 3. Tokens are unpredictable HMAC-SHA256 signatures bound to the appointment ID + booking reference.
 * 4. Only authenticated, authorized clinic staff can resolve a QR token to appointment details via the backend.
 */
import crypto from 'crypto';

const QR_HMAC_SECRET =
  process.env.QR_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  'smartclinic-v2-hmac-qr-verification-secret';

export interface NonPhiQrPayload {
  v: 2;
  ref: string;
  token: string;
}

export function generateBookingReference(dateStr?: string): string {
  const cleanYear = (dateStr || new Date().toISOString()).slice(0, 4).replace(/\D/g, '') || '2026';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BK-${cleanYear}-${rand}`;
}

export function generateAppointmentQrToken(appointmentId: string, bookingReference: string): string {
  const nonce = crypto.randomBytes(12).toString('hex');
  const sig = crypto
    .createHmac('sha256', QR_HMAC_SECRET)
    .update(`${appointmentId}::${bookingReference}::${nonce}`)
    .digest('hex')
    .slice(0, 24);
  return `scqr_${nonce}_${sig}`;
}

export function hashQrToken(token: string): string {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function verifyQrTokenBinding(
  appointmentId: string,
  bookingReference: string,
  candidateToken: string,
  storedToken?: string
): boolean {
  const cleanCandidate = String(candidateToken || '').trim();
  if (!cleanCandidate) return false;

  // If the appointment has an explicit stored token (e.g. seeded or previously generated), compare in constant time
  if (storedToken) {
    const bufA = Buffer.from(hashQrToken(cleanCandidate), 'utf8');
    const bufB = Buffer.from(hashQrToken(storedToken), 'utf8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  }

  // Otherwise verify HMAC structure scqr_<nonce>_<sig>
  const match = cleanCandidate.match(/^scqr_([a-f0-9]{24})_([a-f0-9]{24})$/);
  if (!match) return false;
  const [, nonce, sig] = match;
  const expected = crypto
    .createHmac('sha256', QR_HMAC_SECRET)
    .update(`${appointmentId}::${bookingReference}::${nonce}`)
    .digest('hex')
    .slice(0, 24);

  const bufA = Buffer.from(sig, 'utf8');
  const bufB = Buffer.from(expected, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Builds the privacy-safe QR string containing ZERO medical or personal health information.
 */
export function buildNonPhiQrPayloadString(bookingReference: string, qrToken: string): string {
  const payload: NonPhiQrPayload = {
    v: 2,
    ref: bookingReference,
    token: qrToken,
  };
  return JSON.stringify(payload);
}

/**
 * Parses either a scanned JSON QR payload (`{"v":2,"ref":"BK-...","token":"..."}`)
 * or a manual booking reference string (`BK-2026-...`).
 */
export function parseScannedQrInput(rawInput: string): {
  mode: 'qr_token' | 'manual_reference' | 'invalid';
  bookingReference?: string;
  token?: string;
  error?: string;
} {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) {
    return { mode: 'invalid', error: 'Provide a QR code scan or booking reference.' };
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.ref === 'string' && typeof parsed.token === 'string') {
        return {
          mode: 'qr_token',
          bookingReference: parsed.ref.trim().toUpperCase(),
          token: parsed.token.trim(),
        };
      }
      return { mode: 'invalid', error: 'Unrecognized QR code format. Use a valid SmartClinic Appointment QR Pass.' };
    } catch {
      return { mode: 'invalid', error: 'Malformed QR code payload.' };
    }
  }

  const normalizedRef = trimmed.toUpperCase();
  if (/^BK-\d{4}-[A-Z0-9]{3,12}$/.test(normalizedRef) || /^APT-[A-Z0-9-]+$/i.test(trimmed)) {
    return {
      mode: 'manual_reference',
      bookingReference: normalizedRef,
    };
  }

  return {
    mode: 'invalid',
    error: 'Invalid booking reference format (expected e.g. BK-2026-101).',
  };
}
