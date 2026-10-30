/**
 * Bridge helpers for Vercel-safe password reset.
 * Re-exported from verificationService for serverApp consumers.
 */
import crypto from 'crypto';
import { verificationService } from './services/verificationService';

const resetTokens = new Map<string, { email: string; expiresAt: number }>();

export function createPasswordResetToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  return token;
}

export function verifyPasswordResetToken(token: string): { valid: boolean; email?: string } {
  const record = resetTokens.get(token);
  if (!record) return { valid: false };
  if (record.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return { valid: false };
  }
  return { valid: true, email: record.email };
}

export { verificationService };
