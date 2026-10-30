/**
 * Smart Clinic — RFC 6238 Time-Based One-Time Password (TOTP) Service
 * Replaces SMS / phone number 2FA with Authenticator apps:
 * Google Authenticator, Microsoft Authenticator, Apple Keychain, Twilio Authy.
 *
 * Fully compliant with RFC 6238 and RFC 4226 standards.
 */
import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer into a Base32 string.
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a buffer.
 */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 secret key (16 or 32 chars).
 */
export function generateTotpSecret(length: number = 20): string {
  const randomBytes = crypto.randomBytes(length);
  return base32Encode(randomBytes).slice(0, 32);
}

/**
 * Computes the 6-digit TOTP code for a given time and secret.
 */
export function generateTotpCode(secret: string, timestampMs: number = Date.now(), stepSeconds: number = 30): string {
  const key = base32Decode(secret);
  const timeStep = Math.floor(timestampMs / 1000 / stepSeconds);

  const counterBuffer = Buffer.alloc(8);
  let temp = BigInt(timeStep);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = Number(temp & BigInt(0xff));
    temp >>= BigInt(8);
  }

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code with time drift window (default +/- 1 step = 90s total window).
 */
export function verifyTotpCode(
  secret: string,
  code: string,
  window: number = 1,
  timestampMs: number = Date.now()
): boolean {
  const cleanCode = String(code || '').trim();

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const stepSeconds = 30;
  for (let i = -window; i <= window; i++) {
    const checkTime = timestampMs + i * stepSeconds * 1000;
    const expected = generateTotpCode(secret, checkTime, stepSeconds);
    if (cleanCode === expected) {
      return true;
    }
  }

  return false;
}

/**
 * Constructs the standard otpauth:// URL recognized by Google Authenticator,
 * Microsoft Authenticator, Authy, Apple Keychain, 1Password, etc.
 */
export function buildOtpAuthUrl(params: {
  accountName: string;
  issuer?: string;
  secret: string;
}): string {
  const issuer = params.issuer || 'Smart Clinic';
  const label = encodeURIComponent(`${issuer}:${params.accountName}`);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${params.secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates an image data URL (PNG QR Code) for scanning directly on mobile devices.
 */
export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

// Dynamic RFC 3548 Base32 secrets (compatible with Google Authenticator & Microsoft Authenticator)
export const ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || generateTotpSecret(20);
export const PATIENT_DEFAULT_TOTP_SECRET = process.env.PATIENT_DEFAULT_TOTP_SECRET || generateTotpSecret(20);

// In-memory store for user-specific TOTP secrets
const userTotpSecrets = new Map<string, string>();
userTotpSecrets.set('smartclinicrealacc@gmail.com', ADMIN_TOTP_SECRET);

export function getUserTotpSecret(identifier: string): string {
  const key = identifier.trim().toLowerCase();
  if (userTotpSecrets.has(key)) {
    return userTotpSecrets.get(key)!;
  }
  // Dynamic Base32 secret derived from server secret and email.
  const serverSeed = process.env.JWT_SECRET || process.env.TOTP_SEED || crypto.randomBytes(32).toString('hex');
  const hmac = crypto.createHmac('sha256', serverSeed).update(key).digest();
  const derivedSecret = base32Encode(hmac).slice(0, 32);
  userTotpSecrets.set(key, derivedSecret);
  return derivedSecret;
}

export function setUserTotpSecret(identifier: string, secret: string) {
  userTotpSecrets.set(identifier.trim().toLowerCase(), secret.trim());
}

export function isDemoAccount(identifier?: string): boolean {
  if (!identifier) return false;
  const clean = identifier.trim().toLowerCase();
  const demoAccounts = [
    'admin@smartclinic.ph',
    'demo@smartclinic.ph',
    'demo@patient.com',
    'patient@smartclinic.ph',
    'elena.vargas@example.com',
    'maria.reyes@smartclinic.ph',
    'ana.villanueva@smartclinic.ph',
    'pharmacy@smartclinic.ph',
    'reception@smartclinic.ph',
  ];
  return demoAccounts.includes(clean) || clean.includes('demo') || clean.includes('test@');
}

/**
 * Gets setup package (secret, URL, QR Code)
 * CRITICAL SECURITY: Live currentCode is strictly restricted to demo accounts.
 * Production accounts must retrieve rolling TOTP codes from their mobile Authenticator app.
 */
export async function getTotpSetup(accountName: string, issuer: string = 'Smart Clinic') {
  const secret = getUserTotpSecret(accountName);
  const otpAuthUrl = buildOtpAuthUrl({ accountName, issuer, secret });
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl);
  const isDemo = isDemoAccount(accountName);
  const currentCode = isDemo ? generateTotpCode(secret) : undefined;
  const stepRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);

  return {
    secret,
    otpAuthUrl,
    qrCodeDataUrl,
    ...(isDemo ? { currentCode, isDemo: true } : { isDemo: false }),
    stepRemaining,
  };
}
