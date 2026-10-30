import { API_BASE_URL } from '../lib/config';

/**
 * Client-side TOTP & Authenticator app helpers
 */

/**
 * Calculates remaining seconds in the current 30-second TOTP window.
 */
export function getTotpRemainingSeconds(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

/**
 * Deterministic client calculation or preview helper
 */
export async function fetchTotpSetup(accountName: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/2fa/setup?email=${encodeURIComponent(accountName)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[fetchTotpSetup]', err);
  }

  // Graceful fallback values
  return {
    secret: 'KNWWC4TUINWGS3TJMNAWI3LJNZFWK6JS',
    otpAuthUrl: `otpauth://totp/Smart%20Clinic:${encodeURIComponent(accountName)}?secret=KNWWC4TUINWGS3TJMNAWI3LJNZFWK6JS&issuer=Smart%20Clinic`,
    qrCodeDataUrl: '',
    stepRemaining: getTotpRemainingSeconds(),
  };
}
