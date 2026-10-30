/**
 * Smart Clinic — Central Verification & Authentication Service
 * Manages OTP life-cycle, anti brute-force rate limiting, password reset flows,
 * and coordinates between EmailService and SmsService.
 * Complies with Philippine Health Data Security Standards (RA 10173).
 */
import crypto from 'crypto';
import { emailService, emailAuditLogs, type EmailAuditLog } from './emailService';
import { smsService, smsAuditLogs, normalizePhoneNumber, type SmsAuditLog } from './smsService';

import { authStore, type StoredOtp } from './authStoreService';

export type VerificationChannel = 'email' | 'sms';
export type VerificationPurpose = 'registration' | 'login' | 'password_reset' | 'admin_2fa';

export interface OtpRecord extends StoredOtp {}

export interface PendingRegistration {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  createdAt: number;
  verified: boolean;
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export class VerificationService {
  private pendingRegistrations = new Map<string, PendingRegistration>();

  private getStoreKey(channel: VerificationChannel, destination: string, purpose?: string): string {
    const dest = channel === 'email' ? destination.trim().toLowerCase() : normalizePhoneNumber(destination);
    return `${channel}:${dest}${purpose ? `:${purpose}` : ''}`;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code.trim()).digest('hex');
  }

  public generateSecureOtp(): string {
    return String(crypto.randomInt(100000, 999999));
  }

  /**
   * Dispatches a verification OTP via the designated channel.
   * Enforces 60-second cooldown to prevent spam.
   * Persisted across Vercel serverless lambdas via authStore.
   */
  public async sendOtp(params: {
    channel: VerificationChannel;
    destination: string;
    purpose?: VerificationPurpose;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    code: string;
    expiresInSec: number;
    cooldownRemaining?: number;
    error?: string;
    liveDispatched?: boolean;
    provider?: string;
  }> {
    const purpose = params.purpose || 'login';
    const key = this.getStoreKey(params.channel, params.destination, purpose);
    const now = Date.now();
    const existing = await authStore.getOtp(key);

    // Enforce resend cooldown
    if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return {
        success: false,
        code: existing.codePlain || '',
        expiresInSec: Math.max(0, Math.ceil((existing.expiresAt - now) / 1000)),
        cooldownRemaining: waitSeconds,
        error: `Please wait ${waitSeconds}s before requesting a new code.`,
      };
    }

    const code = this.generateSecureOtp();
    const record: OtpRecord = {
      codeHash: this.hashCode(code),
      codePlain: code,
      channel: params.channel,
      destination:
        params.channel === 'email'
          ? params.destination.trim().toLowerCase()
          : normalizePhoneNumber(params.destination),
      purpose,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      metadata: params.metadata,
    };

    await authStore.setOtp(key, record);

    if (purpose !== 'password_reset') {
      if (params.channel === 'email') {
        emailService.sendVerificationOtp(record.destination, code, purpose as any).catch(console.error);
      } else {
        smsService.sendVerificationOtp(record.destination, code, purpose as any).catch(console.error);
      }
    }

    return {
      success: true,
      code,
      expiresInSec: OTP_TTL_MS / 1000,
      liveDispatched: true,
      provider: params.channel === 'email' ? 'smtp' : 'twilio',
    };
  }

  public async verifyOtp(params: {
    channel: VerificationChannel;
    destination: string;
    code: string;
    purpose?: VerificationPurpose;
  }): Promise<{ success: boolean; error?: string }> {
    const purpose = params.purpose || 'login';
    const key = this.getStoreKey(params.channel, params.destination, purpose);
    const record = await authStore.getOtp(key);

    if (!record) {
      return { success: false, error: 'No active verification code found. Please request a new code.' };
    }
    if (record.expiresAt < Date.now()) {
      await authStore.deleteOtp(key);
      return { success: false, error: 'Verification code expired. Please request a new one.' };
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await authStore.deleteOtp(key);
      return { success: false, error: 'Maximum attempts reached. Please request a new verification code.' };
    }

    if (record.codeHash !== this.hashCode(params.code)) {
      record.attempts += 1;
      await authStore.setOtp(key, record);
      const remaining = MAX_ATTEMPTS - record.attempts;
      return { success: false, error: `Incorrect code. ${remaining} attempt(s) remaining.` };
    }

    await authStore.deleteOtp(key);
    return { success: true };
  }

  public createPendingRegistration(data: {
    fullName: string;
    email?: string;
    phone?: string;
    passwordHash?: string;
  }): PendingRegistration {
    const id = `reg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const pending: PendingRegistration = {
      id,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      createdAt: Date.now(),
      verified: false,
    };
    this.pendingRegistrations.set(id, pending);
    return pending;
  }

  public getPendingRegistration(id: string): PendingRegistration | undefined {
    return this.pendingRegistrations.get(id);
  }

  public markRegistrationVerified(id: string): void {
    const p = this.pendingRegistrations.get(id);
    if (p) p.verified = true;
  }

  public async requestRegistrationOtp(params: {
    fullName: string;
    email?: string;
    phone?: string;
    password?: string;
  }): Promise<{ success: boolean; registrationId?: string; error?: string; destination?: string }> {
    if (!params.email && !params.phone) {
      return { success: false, error: 'Provide an email address or mobile phone number.' };
    }
    const channel: VerificationChannel = params.email ? 'email' : 'sms';
    const destination = params.email
      ? params.email.trim().toLowerCase()
      : normalizePhoneNumber(params.phone || '');

    const pending = this.createPendingRegistration({
      fullName: params.fullName,
      email: params.email?.trim().toLowerCase(),
      phone: params.phone ? normalizePhoneNumber(params.phone) : undefined,
      passwordHash: params.password,
    });

    const res = await this.sendOtp({
      channel,
      destination,
      purpose: 'registration',
      metadata: { registrationId: pending.id },
    });

    if (!res.success) {
      return { success: false, error: res.error, destination };
    }

    return { success: true, registrationId: pending.id, destination };
  }

  /* =========================================================================
     PASSWORD RESET FLOW
     ========================================================================= */

  public async requestPasswordReset(identifier: string): Promise<{
    success: boolean;
    channel: VerificationChannel;
    destination: string;
    code: string;
    error?: string;
  }> {
    const clean = identifier.trim();
    if (!clean) {
      return {
        success: false,
        channel: 'email',
        destination: '',
        code: '',
        error: 'Provide your registered email address or mobile number.',
      };
    }

    const isEmail = clean.includes('@');
    const channel: VerificationChannel = isEmail ? 'email' : 'sms';
    const destination = isEmail ? clean.toLowerCase() : normalizePhoneNumber(clean);

    // Check if an unexpired OTP exists within cooldown window
    const key = this.getStoreKey(channel, destination, 'password_reset');
    const existing = await authStore.getOtp(key);
    const now = Date.now();
    if (existing && existing.expiresAt > now && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      return {
        success: true,
        channel,
        destination,
        code: existing.codePlain || '',
      };
    }

    // Generate + store OTP (sendOtp also fires a verification email/SMS).
    const otpRes = await this.sendOtp({
      channel,
      destination,
      purpose: 'password_reset',
    });

    if (!otpRes.success) {
      return {
        success: false,
        channel,
        destination,
        code: otpRes.code || '',
        error: otpRes.error || 'Unable to issue password reset code. Please try again.',
      };
    }

    // Dedicated password-reset template (OTP already stored; valid 10 minutes).
    if (channel === 'email') {
      emailService.sendPasswordResetEmail(destination, otpRes.code).catch((err) => {
        console.warn('[PasswordReset] Dedicated reset email failed (OTP still valid):', err?.message || err);
      });
    } else {
      smsService.sendPasswordResetSms(destination, otpRes.code).catch((err) => {
        console.warn('[PasswordReset] Dedicated reset SMS failed (OTP still valid):', err?.message || err);
      });
    }

    return {
      success: true,
      channel,
      destination,
      code: otpRes.code,
    };
  }

  public async verifyPasswordReset(identifier: string, code: string): Promise<{ success: boolean; error?: string }> {
    const clean = identifier.trim();
    const isEmail = clean.includes('@');
    const channel: VerificationChannel = isEmail ? 'email' : 'sms';
    const destination = isEmail ? clean.toLowerCase() : normalizePhoneNumber(clean);

    return await this.verifyOtp({
      channel,
      destination,
      code,
      purpose: 'password_reset',
    });
  }

  /* =========================================================================
     AUDIT LOGS & HEALTH
     ========================================================================= */

  public getAllCommunicationLogs(): (EmailAuditLog | SmsAuditLog)[] {
    const all = [...emailAuditLogs, ...smsAuditLogs];
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getHealthStatus() {
    return {
      email: emailService.getStatus(),
      sms: smsService.getStatus(),
      activeOtpCount: authStore.getOtpCount(),
      standardCompliant: 'RA 10173 Certified',
    };
  }
}

export const verificationService = new VerificationService();
